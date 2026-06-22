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

// ONE shared engine-state for the whole app. Every createTutorAudio() instance
// reads and writes THIS object, so they cannot each hold their own audio element.
function engineState() {
  const w = (typeof window !== 'undefined') ? window : globalThis;
  if (!w.__kmTutorEngine) {
    w.__kmTutorEngine = {
      pack: {}, lang: 'en-GB',
      current: null,     // the one HTMLAudioElement in flight
      lastId: null,      // de-dupe: never repeat the same line back-to-back
      seqActive: false,  // a beat sequence is in progress
      seqTimer: null,    // inter-beat pause timer
      silentTimer: null, // captions-only pacing timer
    };
  }
  return w.__kmTutorEngine;
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
    S.lastId = null;
    cancelSeq();
    voice?.cancel?.();
  }

  function say(lineId, text, opts = {}) {
    const done = (typeof opts.onDone === 'function') ? opts.onDone : null;
    if (S.seqActive) cancelSeq();   // a single line interrupts a beat sequence
    const dedupe = opts.dedupe !== false;
    if (dedupe && lineId != null && lineId === S.lastId) { if (done) done(); return; }
    S.lastId = (lineId != null) ? lineId : null;

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
    // If THIS exact sequence is already in progress, ignore the duplicate entirely —
    // no cancel, no restart. This stops a second instance from cutting off or
    // layering over a welcome that is already playing.
    if (opts.dedupe !== false && baseId != null && baseId === S.lastId && S.seqActive) { if (done) done(); return; }
    cancelSeq();
    if (!Array.isArray(beats) || !beats.length) { if (done) done(); return; }
    if (opts.dedupe !== false && baseId != null && baseId === S.lastId) { if (done) done(); return; }
    S.lastId = (baseId != null) ? baseId : null;
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
