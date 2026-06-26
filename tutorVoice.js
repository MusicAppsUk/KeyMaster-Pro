// tutorVoice.js
//
// Shared KeyMaster PRO tutor voice. A minimal, isolated wrapper over the browser's
// on-device SpeechSynthesis. It speaks short tutor phrases that PARALLEL the
// on-screen captions; it never replaces them. Design rules (Warm Precision doctrine):
//   • Optional + muteable. Persistence (voice on/off) is handled by the caller via
//     progressStore; this helper only holds the live session flag.
//   • Always safe: a silent no-op when SpeechSynthesis is unavailable — no lesson
//     ever depends on audio and nothing blocks.
//   • Never overlaps or piles up: every utterance cancels the previous one, and a
//     last-id guard means the SAME cue is never spoken twice in a row.
//   • No network, no assets — purely on-device voices.
//
// This is the single implementation used across the app. Chord Masterclass reaches
// it through chordVoice.js (a thin re-export), so rc2-46 Chord behaviour is
// unchanged; the Master Training / Learn path uses createTutorVoice directly.

const AVAILABLE =
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  typeof window.SpeechSynthesisUtterance !== 'undefined';

export function createTutorVoice(opts = {}) {
  // Delivery + voice-selection config. Defaults reproduce the ORIGINAL behaviour, so
  // Chord (which reaches this via createChordVoice() with no args) is unchanged. The
  // Master Training / Learn path passes a softer, warmer, female-preferring profile.
  // Structured this way so future accent options (UK / US / AU English) and
  // localisation can simply set `lang` here without touching call sites.
  const cfg = {
    rate: 0.96, pitch: 1.0, volume: 1.0,   // original delivery (Chord-preserving defaults)
    lang: 'en-GB',                          // preferred language / accent tag
    preferFemale: false,                    // prefer a female voice within that language
    preferMale: false,                      // prefer a MALE voice (Jack); never knowingly female
    ...opts,
  };

  let enabled = true;     // tutor voice on by default; muteable
  let unlocked = false;   // set once speech has run inside a user gesture
  let lastId = null;      // de-dupe: never repeat the same cue back-to-back

  // Heuristic female-voice match by name (the Web Speech API exposes no reliable gender
  // flag). Best-effort only — if a device ships no matching voice we fall back gracefully.
  const FEMALE_RE = /(female|samantha|serena|kate|fiona|karen|moira|tessa|stephanie|amelie|am\u00e9lie|anna|ava|allison|susan|victoria|zira|hazel|sonia|libby|catherine|martha|emma|joana|google uk english female)/i;
  // Heuristic male-voice match. NOTE: "male" is a substring of "female", so a voice is
  // treated as male ONLY if it is NOT female AND matches below. Best-effort by name.
  const MALE_RE = /(\bmale\b|uk english male|us english male|daniel|arthur|george|oliver|james|thomas|harry|fred|albert|gordon|rishi|jamie|ryan|guy|aaron|liam|brian|nathan|reed)/i;
  function langMatch(v, tag) {
    try { return new RegExp(tag.replace('-', '[-_]'), 'i').test(v.lang || ''); }
    catch (_) { return false; }
  }
  const isFemaleVoice = (v) => FEMALE_RE.test((v && v.name) || '');
  const isMaleVoice = (v) => !isFemaleVoice(v) && MALE_RE.test((v && v.name) || '');
  function pickVoice() {
    try {
      const vs = window.speechSynthesis.getVoices() || [];
      if (!vs.length) return null;
      let pools;
      if (cfg.preferMale) {
        // Jack is male. STRICT: only a POSITIVELY-identified male voice is acceptable.
        // rc2-191: the "merely not-recognised-female" fallbacks are removed. On
        // Android/Samsung a female voice whose name misses FEMALE_RE was slipping
        // through as "not female". Now, if no voice is positively male, pickVoice
        // returns null and the caller keeps Jack TEXT-ONLY — never a guess, never the
        // browser default voice, never an unknown-gender voice.
        pools = [
          vs.filter((v) => langMatch(v, cfg.lang) && isMaleVoice(v)),         // en-GB male (best)
          vs.filter((v) => /^en/i.test(v.lang || '') && isMaleVoice(v)),      // any-English male
        ];
      } else {
        const fem = (v) => !cfg.preferFemale || isFemaleVoice(v);
        pools = [
          vs.filter((v) => langMatch(v, cfg.lang) && fem(v)),
          vs.filter((v) => langMatch(v, cfg.lang)),
          vs.filter((v) => /^en/i.test(v.lang || '') && fem(v)),
          vs.filter((v) => /^en/i.test(v.lang || '')),
        ];
      }
      for (const pool of pools) {
        if (pool.length) {
          const picked = pool[0];
          try {
            if (typeof window !== 'undefined') {
              window.__kmVoicePick = { name: picked.name, lang: picked.lang, male: isMaleVoice(picked), female: isFemaleVoice(picked) };
            }
          } catch (_) { /* no-op */ }
          return picked;
        }
      }
      try { if (typeof window !== 'undefined') window.__kmVoicePick = null; } catch (_) { /* no-op */ }
      return null;   // preferMale: no acceptable (non-female) voice -> caller stays silent + shows text
    } catch (_) { return null; }
  }
  function hasUsableVoice() { return !!pickVoice(); }

  // Spoken-music normaliser: browsers read "C#" as "C hash" and "Bb" oddly.
  // Convert note+accidental to learner-friendly spoken words. Visual notation is
  // unaffected (this only touches what TTS pronounces).
  function speakableMusic(s) {
    if (typeof s !== 'string') return s;
    return s
      .replace(/([A-G])(#|\u266F)/g, '$1 sharp')
      .replace(/([A-G])(b|\u266D)(?=$|[\s.,;:!?)\]\u2014\u2013-])/g, '$1 flat');
  }

  function speak(text, id, onEnd) {
    const fin = (typeof onEnd === 'function') ? onEnd : null;
    if (!AVAILABLE || !enabled || !text) { if (fin) fin(); return; }
    if (id != null && id === lastId) { if (fin) fin(); return; }
    lastId = id != null ? id : null;
    try {
      window.speechSynthesis.cancel();         // never overlap / pile up
      const u = new window.SpeechSynthesisUtterance(speakableMusic(text));
      u.rate = cfg.rate;        // calmer, unhurried — beside the learner, not at them
      u.pitch = cfg.pitch;      // slight warmth
      u.volume = cfg.volume;    // softer, not in-your-face
      const v = pickVoice();
      if (cfg.preferMale && !v) {
        // rc2-193 truth-status: no positively-male voice exists, so Jack stays TEXT-ONLY.
        try { if (typeof window !== 'undefined') window.__kmJackVoiceLive = { kind: 'tts-silent-no-male', at: Date.now() }; } catch (_) { /* no-op */ }
        if (fin) fin(); return;   // never the browser default / unknown-gender voice; caller shows text
      }
      if (v) u.voice = v;
      // rc2-193 truth-status: report what the device voice ACTUALLY does — 'start' means
      // audible speech began; 'error' means it failed — so the diagnostic can tell a real
      // male voice playing apart from one that was selected but never produced sound.
      try {
        u.addEventListener?.('start', () => { try { window.__kmJackVoiceLive = { kind: 'tts-started', voice: v ? v.name : null, at: Date.now() }; } catch (_) { /* no-op */ } });
        u.addEventListener?.('error', (ev) => { try { window.__kmJackVoiceLive = { kind: 'tts-error', voice: v ? v.name : null, reason: (ev && ev.error) || 'speech-synthesis error', at: Date.now() }; } catch (_) { /* no-op */ } });
      } catch (_) { /* no-op */ }
      if (fin) {
        // Chain on completion; fire once whether it ends cleanly or errors, so a
        // beat sequence never stalls if the engine drops the 'end' event.
        let done = false; const once = () => { if (done) return; done = true; fin(); };
        u.onend = once; u.onerror = once;
      }
      window.speechSynthesis.speak(u);
      unlocked = true;
    } catch (_) { if (fin) fin(); }   // stay silent, never throw into the lesson
  }

  function cancel() {
    lastId = null;
    if (!AVAILABLE) return;
    try { window.speechSynthesis.cancel(); } catch (_) { /* no-op */ }
  }

  // Satisfy mobile autoplay rules: call from a real user gesture (button tap).
  function unlock() {
    if (!AVAILABLE || unlocked) return;
    try {
      const u = new window.SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(u);
      unlocked = true;
    } catch (_) { /* no-op */ }
  }

  // Warm up the (often async) voice list so pickVoice has options by first speak.
  if (AVAILABLE) {
    try {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => { /* list ready */ });
    } catch (_) { /* no-op */ }
  }

  return {
    available: () => AVAILABLE,
    hasUsableVoice,
    pickedVoiceName: () => { const v = pickVoice(); return v ? v.name : null; },
    isEnabled: () => enabled,
    isUnlocked: () => unlocked,
    setEnabled(on) { enabled = !!on; if (!enabled) cancel(); },
    speak,
    cancel,
    unlock,
  };
}
