// tutorAudio.js
//
// Premium-voice-first tutor audio layer for KeyMaster PRO. Resolves a spoken tutor
// line by a STABLE ID: (1) PREMIUM bundled MP3 if registered for that ID in the
// active pack; (2) DEV TTS fallback (off in production); (3) CAPTIONS always shown
// by the caller, so no lesson depends on audio.
//
// rc2-128 — SINGLE-ENGINE GUARANTEE (voice-stability fix):
//   All playback state (current audio element, beat sequence, last-id, pack) lives
//   in ONE shared object on window, so EVERY tutorAudio instance drives the SAME
//   single audio element. No matter how many Course instances exist (or which
//   foundations.js is live), there is only ever one active Jack voice: starting any
//   new line first stops the previous one. This makes overlapping Jack voices
//   structurally impossible at the engine level. pianoVoice / Scales / demo audio
//   are entirely separate modules and are NOT affected by this change.

const HAS_AUDIO = typeof window !== 'undefined' && typeof window.Audio !== 'undefined';
const TA_VERSION = 'rc2-131';
try { if (typeof window !== 'undefined') (window.__kmVer = window.__kmVer || {}).tutorAudio = TA_VERSION; } catch (_) { /* no-op */ }

// ONE shared engine-state for the whole app. Every createTutorAudio() instance
// reads and writes THIS object, so they cannot each hold their own audio element.
function engineState() {
  const w = (typeof window !== 'undefined') ? window : globalThis;
  if (!w.__kmTutorEngine) {
    w.__kmTutorEngine = {
      pack: {}, lang: 'en-GB',
      version: TA_VERSION,
      instances: 0,      // how many createTutorAudio() calls happened (all share THIS engine)
      recent: [],        // last voice requests, for the live diagnostic
      current: null,     // the one HTMLAudioElement in flight
      lastId: null,      // de-dupe: never repeat the same line back-to-back
      seqActive: false,  // a beat sequence is in progress
      seqTimer: null,    // inter-beat pause timer
      silentTimer: null, // captions-only pacing timer
      suppressUntil: 0,  // Back-quiet: ms timestamp; auto-narration before it stays silent
    };
  }
  return w.__kmTutorEngine;
}

// ---- Course Back-quiet -------------------------------------------------------
// Pressing Back through the Course used to make Jack re-speak each previous step
// (the Back handler re-renders, and a render auto-narrates). We can't change the
// Course file from here, so instead we catch the Back press at the capture phase
// — BEFORE the Course handler runs — stop any line already sounding, and arm a
// brief "suppress the next auto-narration" window on the shared engine. The very
// next auto say/sayBeats (the re-render) is silenced and the window consumed, so
// later key-feedback and an explicit "Hear it again" are unaffected. Course-only
// (checks data-view="learn"); installed exactly once.
function installBackQuiet() {
  const w = (typeof window !== 'undefined') ? window : null;
  if (!w || w.__kmBackQuietInstalled) return;
  if (typeof document === 'undefined' || !document.addEventListener || !document.documentElement) return;
  w.__kmBackQuietInstalled = true;
  const inCourse = () => {
    const d = document.documentElement;
    return !!(d && d.dataset && d.dataset.view === 'learn');
  };
  const isBackEl = (target) => {
    let n = target;
    for (let i = 0; n && n.nodeType === 1 && i < 4; i += 1, n = n.parentElement) {
      try {
        if (n.getAttribute && n.getAttribute('data-action') === 'back') return true;   // chrome Back (static)
        if (n.tagName === 'BUTTON') {
          const t = (n.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/^[^a-z]+/, '');
          if (t.startsWith('back') || t.startsWith('exit course')) return true;          // in-card Back / step-0 exit
        }
      } catch (_) { /* ignore one node */ }
    }
    return false;
  };
  document.addEventListener('click', (ev) => {
    if (!inCourse() || !isBackEl(ev.target)) return;
    const S = engineState();
    S.suppressUntil = Date.now() + 700;                 // silence only the immediate re-render narration
    if (S.current) { try { S.current.pause(); } catch (_) { /* no-op */ } }   // stop any line already sounding
    if (S.seqTimer) { clearTimeout(S.seqTimer); S.seqTimer = null; }
    S.seqActive = false;
    try { S.recent.push({ t: Date.now(), fn: 'backQuiet', id: null, url: null, action: 'armed' }); if (S.recent.length > 8) S.recent.shift(); } catch (_) { /* no-op */ }
  }, true);   // capture phase: runs before the Course's own Back handler
}

export function createTutorAudio(options = {}) {
  const {
    voice = null,        // a tutorVoice instance (browser TTS) used as the fallback
    lang = 'en-GB',      // active language/accent pack key
    pack = null,         // { [lineId]: 'fileName.ext' } for the active lang, or null
    basePath = 'voice',  // premium files resolve to `${basePath}/${lang}/${file}`
    ttsFallback = false, // emergency/DEV ONLY: speak captions via browser TTS when no MP3 exists
  } = options;

  const S = engineState();
  S.instances += 1;
  installBackQuiet();   // Course Back navigates quietly (see below). Installed once.
  function note(fn, id, action) {
    try {
      const file = id != null ? S.pack[id] : null;
      S.recent.push({ t: Date.now(), fn, id: id == null ? null : id, url: file ? `${basePath}/${S.lang}/${file}` : null, action });
      if (S.recent.length > 8) S.recent.shift();
    } catch (_) { /* no-op */ }
  }
  // Seed the shared pack/lang. A non-empty pack from any instance becomes the shared
  // pack; lang is set so all instances resolve under the same accent folder.
  if (pack && typeof pack === 'object' && Object.keys(pack).length) S.pack = { ...pack };
  if (lang) S.lang = lang;

  const readTimeMs = (t) => { const n = t ? String(t).length : 0; return Math.max(900, Math.min(9000, n * 48)); };
  function clearSilent() { if (S.silentTimer) { clearTimeout(S.silentTimer); S.silentTimer = null; } }
  function silentHold(text, cb) { clearSilent(); S.silentTimer = setTimeout(() => { S.silentTimer = null; if (cb) cb(); }, readTimeMs(text)); }

  function urlFor(lineId) {
    const file = S.pack[lineId];
    return file ? `${basePath}/${S.lang}/${file}` : null;
  }
  function hasPremium(lineId) { return !!S.pack[lineId]; }
  function isPremiumActive() { return Object.keys(S.pack).length > 0; }

  function stopAudio() {
    clearSilent();
    if (S.current) {
      try { S.current.pause(); S.current.src = ''; } catch (_) { /* no-op */ }
      S.current = null;
    }
  }
  function cancelSeq() {
    S.seqActive = false;
    if (S.seqTimer) { clearTimeout(S.seqTimer); S.seqTimer = null; }
    stopAudio();
  }
  function cancel() {
    note('cancel', S.lastId, 'cancelled');
    S.lastId = null;
    cancelSeq();
    voice?.cancel?.();
  }

  function say(lineId, text, opts = {}) {
    const done = (typeof opts.onDone === 'function') ? opts.onDone : null;
    // Back-quiet: a Back navigation arms a brief window so the automatic re-render
    // does NOT re-speak. Consumed on the first call; an explicit "Hear it again"
    // (opts.explicit) bypasses it and clears the window. Key feedback, which fires
    // only seconds later on a keypress, is never caught (window is consumed/expired).
    if (S.suppressUntil && Date.now() < S.suppressUntil && !opts.explicit) {
      S.suppressUntil = 0; note('say', lineId, 'suppressed-back'); if (done) done(); return;
    }
    if (opts.explicit) S.suppressUntil = 0;
    if (S.seqActive) cancelSeq();   // a single line interrupts a beat sequence
    const dedupe = opts.dedupe !== false;
    if (dedupe && lineId != null && lineId === S.lastId) { note('say', lineId, 'suppressed-duplicate'); if (done) done(); return; }
    const _hadPrev = !!S.current || S.seqActive;
    S.lastId = (lineId != null) ? lineId : null;
    note('say', lineId, _hadPrev ? 'play-after-cancel' : 'play');

    const url = HAS_AUDIO ? urlFor(lineId) : null;
    if (url) {
      try {
        stopAudio();
        const a = new window.Audio(url);
        a.volume = (opts.volume != null) ? opts.volume : 0.9;
        S.current = a;
        const fallback = () => { S.current = null; if (ttsFallback && voice) voice.speak(text, lineId, done); else silentHold(text, done); };
        a.addEventListener('error', fallback, { once: true });
        if (done) a.addEventListener('ended', () => { if (S.current === a) S.current = null; done(); }, { once: true });
        const p = a.play?.();
        if (p && typeof p.catch === 'function') p.catch(fallback);
        return;
      } catch (_) {
        S.current = null;   // fall through to TTS
      }
    }
    if (ttsFallback && voice) voice.speak(text, lineId, done);  // DEV fallback only — never under Jack
    else silentHold(text, done);                                // captions remain; no robot voice
  }

  function sayBeats(baseId, beats, opts = {}) {
    const done = (typeof opts.onDone === 'function') ? opts.onDone : null;
    // Back-quiet (see say()): the automatic re-render after Back is a sayBeats call;
    // suppress it once. Explicit replay bypasses.
    if (S.suppressUntil && Date.now() < S.suppressUntil && !opts.explicit) {
      S.suppressUntil = 0; note('sayBeats', baseId, 'suppressed-back'); if (done) done(); return;
    }
    if (opts.explicit) S.suppressUntil = 0;
    // If THIS exact sequence is already in progress, ignore the duplicate entirely —
    // no cancel, no restart. This stops a second instance from cutting off or
    // layering over a welcome that is already playing.
    if (opts.dedupe !== false && baseId != null && baseId === S.lastId && S.seqActive) { note('sayBeats', baseId, 'ignored-already-active'); if (done) done(); return; }
    const _hadPrev = !!S.current || S.seqActive;
    cancelSeq();
    if (!Array.isArray(beats) || !beats.length) { if (done) done(); return; }
    if (opts.dedupe !== false && baseId != null && baseId === S.lastId) { note('sayBeats', baseId, 'suppressed-duplicate'); if (done) done(); return; }
    S.lastId = (baseId != null) ? baseId : null;
    note('sayBeats', baseId, _hadPrev ? 'play-after-cancel' : 'play');
    S.seqActive = true;
    let i = 0;
    const run = () => {
      if (!S.seqActive) return;
      if (i >= beats.length) { S.seqActive = false; if (done) done(); return; }
      const beat = beats[i] || {};
      const bid = `${baseId}.${i}`;
      i += 1;
      const after = (typeof beat.pauseAfter === 'number') ? beat.pauseAfter : 360;
      const next = () => { if (S.seqActive) S.seqTimer = setTimeout(run, after); };
      const url = HAS_AUDIO ? urlFor(bid) : null;
      if (url) playFile(url, beat.text, bid, next);
      else if (ttsFallback && voice) voice.speak(beat.text, bid, next);  // DEV fallback only
      else { S.seqTimer = setTimeout(next, readTimeMs(beat.text)); }       // captions-only pacing
    };
    run();
  }
  function playFile(url, fallbackText, bid, onDone) {
    const fb = () => { S.current = null; if (ttsFallback && voice) voice.speak(fallbackText, bid, onDone); else { S.seqTimer = setTimeout(onDone, readTimeMs(fallbackText)); } };
    try {
      stopAudio();
      const a = new window.Audio(url);
      a.volume = 0.9;
      S.current = a;
      a.addEventListener('ended', () => { if (S.current === a) S.current = null; if (onDone) onDone(); }, { once: true });
      a.addEventListener('error', fb, { once: true });
      const p = a.play?.();
      if (p && typeof p.catch === 'function') p.catch(fb);
    } catch (_) { fb(); }
  }

  function setPack(map, forLang) {
    S.pack = (map && typeof map === 'object') ? { ...map } : {};
    if (forLang) S.lang = forLang;
    S.lastId = null;
  }

  return {
    say,
    sayBeats,
    cancel,
    hasPremium,
    isPremiumActive,
    setPack,
    lang: () => S.lang,
  };
}
