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
    ...opts,
  };

  let enabled = true;     // tutor voice on by default; muteable
  let unlocked = false;   // set once speech has run inside a user gesture
  let lastId = null;      // de-dupe: never repeat the same cue back-to-back

  // Heuristic female-voice match by name (the Web Speech API exposes no reliable gender
  // flag). Best-effort only — if a device ships no matching voice we fall back gracefully.
  const FEMALE_RE = /(female|samantha|serena|kate|fiona|karen|moira|tessa|stephanie|amelie|am\u00e9lie|anna|ava|allison|susan|victoria|zira|hazel|sonia|libby|catherine|martha|emma|joana|google uk english female)/i;
  function langMatch(v, tag) {
    try { return new RegExp(tag.replace('-', '[-_]'), 'i').test(v.lang || ''); }
    catch (_) { return false; }
  }
  function pickVoice() {
    try {
      const vs = window.speechSynthesis.getVoices() || [];
      if (!vs.length) return null;
      const fem = (v) => !cfg.preferFemale || FEMALE_RE.test(v.name || '');
      // Preference order: accent+female → accent → any English+female → any English → default.
      const pools = [
        vs.filter((v) => langMatch(v, cfg.lang) && fem(v)),
        vs.filter((v) => langMatch(v, cfg.lang)),
        vs.filter((v) => /^en/i.test(v.lang || '') && fem(v)),
        vs.filter((v) => /^en/i.test(v.lang || '')),
      ];
      for (const pool of pools) if (pool.length) return pool[0];
      return null;   // let the device pick its own default voice
    } catch (_) { return null; }
  }

  function speak(text, id) {
    if (!AVAILABLE || !enabled || !text) return;
    if (id != null && id === lastId) return;   // already said this — no chatter
    lastId = id != null ? id : null;
    try {
      window.speechSynthesis.cancel();         // never overlap / pile up
      const u = new window.SpeechSynthesisUtterance(text);
      u.rate = cfg.rate;        // calmer, unhurried — beside the learner, not at them
      u.pitch = cfg.pitch;      // slight warmth
      u.volume = cfg.volume;    // softer, not in-your-face
      const v = pickVoice();
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
      unlocked = true;
    } catch (_) { /* no-op: stay silent, never throw into the lesson */ }
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
    isEnabled: () => enabled,
    isUnlocked: () => unlocked,
    setEnabled(on) { enabled = !!on; if (!enabled) cancel(); },
    speak,
    cancel,
    unlock,
  };
}
