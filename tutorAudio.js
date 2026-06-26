// tutorAudio.js
//
// Premium-voice-first tutor audio layer for KeyMaster PRO. Resolves a spoken tutor
// line by a STABLE ID: (1) PREMIUM bundled MP3 if registered for that ID in the
// active pack; (2) DEV TTS fallback (off in production); (3) CAPTIONS always shown
// by the caller, so no lesson depends on audio.
//
// rc2-128 — SINGLE-ENGINE GUARANTEE: all playback state lives in ONE shared object
//   on window, so every tutorAudio instance drives the SAME single audio element.
//
// rc2-132 — HARDENED SINGLE-VOICE ARBITER (navigation-overlap fix):
//   The shared engine serialised the audio element, but a stopped element's late
//   error/ended handler could revive a stale caption/sequence timeline (nulling the
//   NEW current and leaving a second voice playing untracked). Now:
//     • Every narration owns an EPOCH token. Starting or cancelling any line bumps
//       the epoch; every async continuation (play promise, ended, error, inter-beat
//       timer, caption hold) checks its epoch and aborts SILENTLY if superseded.
//     • A single cancelCurrent() fully tears down the previous line: it DETACHES the
//       old element's listeners (so a late error can't run), pauses + resets it,
//       clears every timer, and cancels browser TTS.
//     • A capture-phase NAV ARBITER stops the current line the instant the learner
//       taps any Course transition (Next/Back/Continue/Map/Review/Resume/Start) and
//       whenever the Course is left — BEFORE the next render speaks. Piano keys and
//       pure UI toggles are excluded so they never cut Jack off. Back additionally
//       arms a "don't auto-speak the restored card" window (rc2-131 behaviour).
//   Result: only one Jack voice can ever sound, and old Jack can't carry into the
//   next page. pianoVoice / Scales / demo audio are separate modules, untouched.

const HAS_AUDIO = typeof window !== 'undefined' && typeof window.Audio !== 'undefined';
const TA_VERSION = 'rc2-132';
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
      epoch: 0,          // narration token; bumped on every start AND cancel
      cancelCurrent: null, // the active instance registers its teardown here (for the nav arbiter)
    };
  }
  return w.__kmTutorEngine;
}

// ---- Course navigation arbiter ----------------------------------------------
// One capture-phase click listener: the moment the learner taps a Course
// transition, stop the current Jack line BEFORE the next render speaks. Piano
// keys and pure UI toggles are excluded so they never cut Jack off mid-sentence.
// Back also arms the Back-quiet window. A data-view observer stops Jack whenever
// the Course is left. Installed exactly once.
function installNavArbiter() {
  const w = (typeof window !== 'undefined') ? window : null;
  if (!w || w.__kmNavArbiterInstalled) return;
  if (typeof document === 'undefined' || !document.addEventListener || !document.documentElement) return;
  w.__kmNavArbiterInstalled = true;
  const docEl = document.documentElement;
  const inCourse = () => !!(docEl && docEl.dataset && docEl.dataset.view === 'learn');
  const TOGGLE_ACTIONS = new Set(['toggle-keyboard', 'toggle-fingering', 'fullscreen', 'exit', 'octave-up', 'octave-down', 'connect-midi']);

  function classify(target) {
    let n = target;
    for (let i = 0; n && n.nodeType === 1 && i < 6; i += 1, n = n.parentElement) {
      try {
        const cl = n.classList;
        if (cl && (cl.contains('key') || cl.contains('key--white') || cl.contains('key--black'))) return 'key'; // piano key — leave Jack alone
        const action = n.getAttribute && n.getAttribute('data-action');
        if (action === 'back') return 'back';
        if (action && TOGGLE_ACTIONS.has(action)) return 'toggle';
        const txt = (n.tagName === 'BUTTON' && n.textContent)
          ? n.textContent.replace(/\s+/g, ' ').trim().toLowerCase().replace(/^[^a-z]+/, '') : '';
        if (txt.startsWith('back') || txt.startsWith('exit course')) return 'back';
        if (n.tagName === 'BUTTON' || n.tagName === 'A'
            || (n.getAttribute && (n.getAttribute('data-menu') || n.getAttribute('role') === 'button'))
            || (cl && cl.contains('mf__dot'))) return 'nav';
      } catch (_) { /* ignore one node */ }
    }
    return 'none';
  }

  function arbitratedCancel(reason) {
    const S = engineState();
    try {
      if (typeof S.cancelCurrent === 'function') S.cancelCurrent(reason);
      else { S.epoch = (S.epoch || 0) + 1; S.seqActive = false; if (S.current) { try { S.current.pause(); } catch (_) { /* no-op */ } } }
    } catch (_) { /* no-op */ }
    try { S.recent.push({ t: Date.now(), fn: 'nav', id: null, url: null, action: reason }); if (S.recent.length > 8) S.recent.shift(); } catch (_) { /* no-op */ }
  }

  document.addEventListener('click', (ev) => {
    if (!inCourse()) return;
    const kind = classify(ev.target);
    if (kind === 'key' || kind === 'toggle' || kind === 'none') return;   // never interrupt Jack for these
    if (kind === 'back') { arbitratedCancel('nav-back'); engineState().suppressUntil = Date.now() + 700; }
    else arbitratedCancel('nav');   // forward / map / review / resume / start: stop old, let the new card speak
  }, true);   // capture phase: runs before the Course's own handlers

  // Leaving the Course (data-view changes away from "learn") also stops Jack.
  try {
    const mo = new MutationObserver(() => { if (!inCourse()) arbitratedCancel('left-course'); });
    mo.observe(docEl, { attributes: true, attributeFilter: ['data-view'] });
  } catch (_) { /* observer optional */ }
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

  function note(fn, id, action) {
    try {
      const file = id != null ? S.pack[id] : null;
      S.recent.push({ t: Date.now(), fn, id: id == null ? null : id, url: file ? `${basePath}/${S.lang}/${file}` : null, action });
      if (S.recent.length > 8) S.recent.shift();
    } catch (_) { /* no-op */ }
  }
  if (pack && typeof pack === 'object' && Object.keys(pack).length) S.pack = { ...pack };
  if (lang) S.lang = lang;

  const readTimeMs = (t) => { const n = t ? String(t).length : 0; return Math.max(900, Math.min(9000, n * 48)); };

  function clearTimers() {
    if (S.seqTimer) { clearTimeout(S.seqTimer); S.seqTimer = null; }
    if (S.silentTimer) { clearTimeout(S.silentTimer); S.silentTimer = null; }
  }
  // Detach listeners FIRST, then pause + reset, so a stopped element can NEVER fire
  // a late error/ended that revives a stale timeline or nulls the newer current.
  function detachAndStop(a) {
    if (!a) return;
    try { if (a._kmProbe) { a._kmProbe.cancelledByEngine = true; if (typeof a._kmPub === 'function') a._kmPub(); } } catch (_) { /* no-op */ }
    try { if (a._onended) a.removeEventListener('ended', a._onended); } catch (_) { /* no-op */ }
    try { if (a._onerror) a.removeEventListener('error', a._onerror); } catch (_) { /* no-op */ }
    try { a._onended = null; a._onerror = null; } catch (_) { /* no-op */ }
    try { a.pause(); } catch (_) { /* no-op */ }
    try { a.removeAttribute('src'); if (typeof a.load === 'function') a.load(); } catch (_) { /* no-op */ }
  }
  // The ONE teardown. Invalidate in-flight continuations (epoch bump), clear timers,
  // stop + detach the audio element, cancel browser TTS. Everything stale dies here.
  function cancelCurrent(reason) {
    S.epoch = (S.epoch || 0) + 1;
    S.seqActive = false;
    clearTimers();
    detachAndStop(S.current);
    S.current = null;
    try { voice?.cancel?.(); } catch (_) { /* no-op */ }
    if (reason) note('cancel', S.lastId, reason);
  }
  S.cancelCurrent = cancelCurrent;   // expose to the nav arbiter
  installNavArbiter();

  function urlFor(lineId) {
    const file = S.pack[lineId];
    return file ? `${basePath}/${S.lang}/${file}` : null;
  }
  function hasPremium(lineId) { return !!S.pack[lineId]; }
  function isPremiumActive() { return Object.keys(S.pack).length > 0; }

  // Caption-only pacing, epoch-guarded so a superseded line never fires its cb.
  function silentHold(text, cb, myEpoch) {
    if (S.silentTimer) { clearTimeout(S.silentTimer); S.silentTimer = null; }
    S.silentTimer = setTimeout(() => {
      S.silentTimer = null;
      if (S.epoch !== myEpoch) return;   // a newer line took over
      if (cb) cb();
    }, readTimeMs(text));
  }

  function cancel() { S.lastId = null; cancelCurrent('cancelled'); }

  function say(lineId, text, opts = {}) {
    const done = (typeof opts.onDone === 'function') ? opts.onDone : null;
    // Back-quiet: a Back navigation arms a brief window so the automatic re-render
    // does NOT re-speak. Consumed on first call; explicit "Hear it again" bypasses.
    if (S.suppressUntil && Date.now() < S.suppressUntil && !opts.explicit) {
      S.suppressUntil = 0; note('say', lineId, 'suppressed-back'); if (done) done(); return;
    }
    if (opts.explicit) S.suppressUntil = 0;
    const dedupe = opts.dedupe !== false;
    if (dedupe && lineId != null && lineId === S.lastId && !opts.explicit) {
      note('say', lineId, 'suppressed-duplicate'); if (done) done(); return;
    }
    cancelCurrent('new-say');                 // full teardown of any previous line
    const myEpoch = S.epoch;
    S.lastId = (lineId != null) ? lineId : null;
    note('say', lineId, 'play');

    const url = HAS_AUDIO ? urlFor(lineId) : null;
    if (url) {
      try {
        const a = new window.Audio(url);
        a.volume = (opts.volume != null) ? opts.volume : 0.9;
        S.current = a;
        // rc2-194 audio probe: capture the element's REAL state on the device so a silent
        // playback is never ambiguous — autoplay-block vs cancelled vs decoded-but-muted vs
        // error vs detached-element webview quirk. Updated live by the element's own events.
        const probe = {
          lineId: lineId || null, url: a.src || url, requestedAt: Date.now(),
          muted: a.muted, volume: a.volume, readyState: a.readyState, networkState: a.networkState,
          duration: null, paused: a.paused, playing: false, timeupdates: 0, lastCurrentTime: 0,
          ended: false, error: null, playPromise: 'pending', cancelledByEngine: false, epoch: myEpoch,
        };
        const pub = () => { try { if (typeof window !== 'undefined') window.__kmJackAudioProbe = { ...probe, at: Date.now() }; } catch (_) { /* no-op */ } };
        a._kmProbe = probe; a._kmPub = pub; pub();
        const onended = () => { if (S.epoch !== myEpoch) return; probe.ended = true; probe.paused = a.paused; pub(); if (S.current === a) S.current = null; if (done) done(); };
        const onerror = () => {
          if (S.epoch !== myEpoch) return;
          probe.error = (a.error && (a.error.message || ('media error code ' + a.error.code))) || 'playback failed'; pub();
          // rc2-193 truth-status: a real recorded file was requested but playback failed.
          try { window.__kmJackVoiceLive = { kind: 'mp3-error', file: S.pack[lineId] || url, reason: probe.error, at: Date.now() }; } catch (_) { /* no-op */ }
          if (S.current === a) S.current = null; silentHold(text, done, myEpoch);
        };
        a.addEventListener('loadedmetadata', () => { probe.duration = a.duration; probe.readyState = a.readyState; pub(); }, { once: true });
        // rc2-193 truth-status: 'playing' means the recorded MP3 actually began sounding.
        a.addEventListener('playing', () => { if (S.epoch !== myEpoch) return; probe.playing = true; probe.paused = a.paused; probe.muted = a.muted; probe.volume = a.volume; probe.readyState = a.readyState; pub(); try { window.__kmJackVoiceLive = { kind: 'mp3-playing', file: S.pack[lineId] || url, at: Date.now() }; } catch (_) { /* no-op */ } }, { once: true });
        a.addEventListener('timeupdate', () => { probe.timeupdates += 1; probe.lastCurrentTime = a.currentTime; if (probe.timeupdates <= 6) pub(); });
        a._onended = onended; a._onerror = onerror;
        a.addEventListener('ended', onended, { once: true });
        a.addEventListener('error', onerror, { once: true });
        const p = a.play?.();
        if (p && typeof p.then === 'function') {
          p.then(() => { probe.playPromise = 'resolved'; probe.paused = a.paused; pub(); })
           .catch((err) => {
             // The decisive autoplay signal: a NotAllowedError here means the browser refused
             // playback for lack of a user gesture (the element is fine, the call site isn't).
             probe.playPromise = 'rejected: ' + ((err && err.name) || 'error'); pub();
             if (S.epoch !== myEpoch) return;
             try { window.__kmJackVoiceLive = { kind: 'mp3-error', file: S.pack[lineId] || url, reason: probe.playPromise, at: Date.now() }; } catch (_) { /* no-op */ }
             onerror();
           });
        }
        return;
      } catch (_) { if (S.current) S.current = null; }   // fall through to captions
    }
    if (ttsFallback && voice && !isPremiumActive()) voice.speak(text, lineId, done);   // DEV fallback only — never under Jack
    else {
      // rc2-193 truth-status: no recorded pack loaded and no TTS fallback -> captions only.
      try { window.__kmJackVoiceLive = { kind: 'silent-no-pack', at: Date.now() }; } catch (_) { /* no-op */ }
      silentHold(text, done, myEpoch);                          // captions remain; no robot voice
    }
  }

  function sayBeats(baseId, beats, opts = {}) {
    const done = (typeof opts.onDone === 'function') ? opts.onDone : null;
    if (S.suppressUntil && Date.now() < S.suppressUntil && !opts.explicit) {
      S.suppressUntil = 0; note('sayBeats', baseId, 'suppressed-back'); if (done) done(); return;
    }
    if (opts.explicit) S.suppressUntil = 0;
    // If THIS exact sequence is already in progress (and not an explicit replay),
    // ignore the duplicate entirely — no cancel, no restart (welcome-safe).
    if (opts.dedupe !== false && !opts.explicit && baseId != null && baseId === S.lastId && S.seqActive) {
      note('sayBeats', baseId, 'ignored-already-active'); if (done) done(); return;
    }
    if (!Array.isArray(beats) || !beats.length) { cancelCurrent('empty-beats'); if (done) done(); return; }
    if (opts.dedupe !== false && !opts.explicit && baseId != null && baseId === S.lastId) {
      note('sayBeats', baseId, 'suppressed-duplicate'); if (done) done(); return;
    }
    cancelCurrent('new-beats');               // full teardown of any previous line
    const myEpoch = S.epoch;
    S.lastId = (baseId != null) ? baseId : null;
    note('sayBeats', baseId, 'play');
    S.seqActive = true;
    let i = 0;
    const run = () => {
      if (S.epoch !== myEpoch || !S.seqActive) return;     // a newer line took over
      if (i >= beats.length) { S.seqActive = false; if (done) done(); return; }
      const beat = beats[i] || {};
      const bid = `${baseId}.${i}`;
      i += 1;
      const after = (typeof beat.pauseAfter === 'number') ? beat.pauseAfter : 360;
      const next = () => { if (S.epoch === myEpoch && S.seqActive) S.seqTimer = setTimeout(run, after); };
      const url = HAS_AUDIO ? urlFor(bid) : null;
      if (url) playFile(url, beat.text, bid, next, myEpoch);
      else if (ttsFallback && voice && !isPremiumActive()) voice.speak(beat.text, bid, next);   // DEV fallback only
      else { S.seqTimer = setTimeout(() => { if (S.epoch === myEpoch) next(); }, readTimeMs(beat.text)); } // captions-only
    };
    run();
  }

  function playFile(url, fallbackText, bid, onDone, myEpoch) {
    const fb = () => {
      if (S.epoch !== myEpoch) return;
      if (S.current && S.current._bid === bid) S.current = null;
      if (ttsFallback && voice && !isPremiumActive()) voice.speak(fallbackText, bid, onDone);
      else { S.seqTimer = setTimeout(() => { if (S.epoch === myEpoch) onDone(); }, readTimeMs(fallbackText)); }
    };
    try {
      detachAndStop(S.current); S.current = null;   // tear down the previous beat's element cleanly
      const a = new window.Audio(url);
      a.volume = 0.9;
      a._bid = bid;
      S.current = a;
      const onended = () => { if (S.epoch !== myEpoch) return; if (S.current === a) S.current = null; if (onDone) onDone(); };
      const onerror = () => { if (S.epoch !== myEpoch) return; fb(); };
      a._onended = onended; a._onerror = onerror;
      a.addEventListener('ended', onended, { once: true });
      a.addEventListener('error', onerror, { once: true });
      const p = a.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => { if (S.epoch !== myEpoch) return; onerror(); });
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
