// tutorAudio.js
//
// Premium-voice-first tutor audio layer for KeyMaster PRO. It resolves a spoken
// tutor line by a STABLE ID, in this order:
//
//   1. PREMIUM — if a high-quality audio file is registered for that ID in the
//      active voice pack, play that file. This is the intended KeyMaster PRO
//      experience: a warm, human, bundled (offline-capable) tutor voice.
//   2. PROTOTYPE/FALLBACK — otherwise speak the caption text through the browser's
//      on-device SpeechSynthesis (via the tutorVoice wrapper). This is explicitly a
//      development prototype, NOT the final voice, and is labelled as such in the UI.
//   3. CAPTIONS — always rendered by the caller from the same text, so no lesson
//      ever depends on audio being present or working.
//
// Doctrine (Tim, rc2-53): browser TTS is a temporary prototype/fallback; the premium
// tutor voice is a core product requirement; captions are always present but the
// intended experience is spoken, warm, and tutor-led.
//
// No audio assets are bundled yet — the pack starts EMPTY, so every line falls back
// to TTS today. Dropping one approved, licensed file in and registering its ID under
// the active language is all that's needed to make the premium path play for that line
// (Option C: proves the mechanism with zero further code change). Packs are keyed by
// language/accent (e.g. 'en-GB', 'en-US', 'es-ES') so they can be lazy-loaded later
// for accents and localisation. Dynamic lines that interpolate a name or a lesson
// title (e.g. the greeting) cannot be a single pre-recorded file; those stay on TTS
// until a templated/segmented audio approach is chosen.

const HAS_AUDIO = typeof window !== 'undefined' && typeof window.Audio !== 'undefined';

export function createTutorAudio(options = {}) {
  const {
    voice = null,        // a tutorVoice instance (browser TTS) used as the fallback
    lang = 'en-GB',      // active language/accent pack key
    pack = null,         // { [lineId]: 'fileName.ext' } for the active lang, or null
    basePath = 'voice',  // premium files resolve to `${basePath}/${lang}/${file}`
  } = options;

  let activePack = (pack && typeof pack === 'object') ? { ...pack } : {};
  let activeLang = lang;
  let current = null;    // current HTMLAudioElement (for cancel)
  let lastId = null;     // de-dupe: never repeat the same line back-to-back
  let seqActive = false; // a beat sequence is in progress
  let seqTimer = null;   // inter-beat pause timer (held so we can cancel)

  function urlFor(lineId) {
    const file = activePack[lineId];
    return file ? `${basePath}/${activeLang}/${file}` : null;
  }
  function hasPremium(lineId) { return !!activePack[lineId]; }
  function isPremiumActive() { return Object.keys(activePack).length > 0; }

  function stopAudio() {
    if (current) {
      try { current.pause(); current.src = ''; } catch (_) { /* no-op */ }
      current = null;
    }
  }
  function cancelSeq() {
    seqActive = false;
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
    stopAudio();
  }
  function cancel() {
    lastId = null;
    cancelSeq();
    voice?.cancel?.();
  }

  // Speak a line by stable ID. `text` is the caption text, used verbatim for the TTS
  // fallback (and shown by the caller). `opts.dedupe` defaults true; opts.volume sets
  // the premium-file volume.
  function say(lineId, text, opts = {}) {
    if (seqActive) cancelSeq();   // a single line interrupts a beat sequence
    const dedupe = opts.dedupe !== false;
    if (dedupe && lineId != null && lineId === lastId) return;
    lastId = (lineId != null) ? lineId : null;

    const url = HAS_AUDIO ? urlFor(lineId) : null;
    if (url) {
      try {
        stopAudio();
        const a = new window.Audio(url);
        a.volume = (opts.volume != null) ? opts.volume : 0.9;
        current = a;
        // If the premium file is missing or fails, fall back to TTS so we are never silent.
        const fallback = () => { current = null; voice?.speak?.(text, lineId); };
        a.addEventListener('error', fallback, { once: true });
        const p = a.play?.();
        if (p && typeof p.catch === 'function') p.catch(fallback);
        return;
      } catch (_) {
        current = null;   // fall through to TTS
      }
    }
    voice?.speak?.(text, lineId);   // prototype / fallback
  }

  // Speak a line as a SEQUENCE of short beats with real pauses between them, so the
  // prototype voice "breathes" instead of reading one flat block — and so the script
  // is already shaped for premium performance. Each beat:
  //   { text, pauseAfter?, tone?, emphasis?, voiceDirection? }
  // `text` + `pauseAfter` drive timing now; `tone` / `emphasis` / `voiceDirection` are
  // CARRIED for the premium recording / AI-generation phase (browser TTS cannot perform
  // them). A premium file per beat resolves at `${baseId}.${i}`; otherwise the beat is
  // spoken by the TTS prototype and the next beat is chained on its completion.
  function sayBeats(baseId, beats, opts = {}) {
    cancelSeq();
    if (!Array.isArray(beats) || !beats.length) return;
    if (opts.dedupe !== false && baseId != null && baseId === lastId) return;
    lastId = (baseId != null) ? baseId : null;
    seqActive = true;
    let i = 0;
    const run = () => {
      if (!seqActive) return;
      if (i >= beats.length) { seqActive = false; return; }
      const beat = beats[i] || {};
      const bid = `${baseId}.${i}`;
      i += 1;
      const after = (typeof beat.pauseAfter === 'number') ? beat.pauseAfter : 360;
      const next = () => { if (seqActive) seqTimer = setTimeout(run, after); };
      const url = HAS_AUDIO ? urlFor(bid) : null;
      if (url) playFile(url, beat.text, bid, next);
      else if (voice) voice.speak(beat.text, bid, next);   // onEnd chains to `next`
      else next();
    };
    run();
  }
  function playFile(url, fallbackText, bid, onDone) {
    const fb = () => { current = null; if (voice) voice.speak(fallbackText, bid, onDone); else if (onDone) onDone(); };
    try {
      stopAudio();
      const a = new window.Audio(url);
      a.volume = 0.9;
      current = a;
      a.addEventListener('ended', () => { if (onDone) onDone(); }, { once: true });
      a.addEventListener('error', fb, { once: true });
      const p = a.play?.();
      if (p && typeof p.catch === 'function') p.catch(fb);
    } catch (_) { fb(); }
  }

  // Lazy-load hook for future language/accent packs. No network today; a caller can
  // later fetch a manifest and hand it in here, optionally switching language.
  function setPack(map, forLang) {
    activePack = (map && typeof map === 'object') ? { ...map } : {};
    if (forLang) activeLang = forLang;
    lastId = null;
  }

  return {
    say,
    sayBeats,
    cancel,
    hasPremium,
    isPremiumActive,
    setPack,
    lang: () => activeLang,
  };
}
