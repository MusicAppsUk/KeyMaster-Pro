// chordVoice.js
//
// Chord Masterclass tutor voice — Phase 1 (Chord-only).
//
// A minimal, isolated wrapper over the browser's on-device SpeechSynthesis. It
// speaks short tutor phrases that PARALLEL the on-screen captions; it never
// replaces them. Design rules (Warm Precision doctrine):
//   • Optional + muteable (session preference; persistence arrives with progress/resume).
//   • Always safe: a silent no-op when SpeechSynthesis is unavailable — the
//     lesson never depends on audio and never blocks.
//   • Never overlaps or piles up: every utterance cancels the previous one, and a
//     last-id guard means the SAME cue is never spoken twice in a row.
//   • No network, no assets — purely on-device voices.
//
// Imported ONLY by chordMasterclass.js. Touches nothing else.

const AVAILABLE =
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  typeof window.SpeechSynthesisUtterance !== 'undefined';

export function createChordVoice() {
  let enabled = true;     // tutor voice on by default; muteable
  let unlocked = false;   // set once speech has run inside a user gesture
  let lastId = null;      // de-dupe: never repeat the same cue back-to-back

  function pickVoice() {
    try {
      const vs = window.speechSynthesis.getVoices() || [];
      // Prefer a calm English voice; fall back to any English, then default.
      return (
        vs.find((v) => /en[-_]GB/i.test(v.lang)) ||
        vs.find((v) => /^en/i.test(v.lang)) ||
        null
      );
    } catch (_) { return null; }
  }

  function speak(text, id) {
    if (!AVAILABLE || !enabled || !text) return;
    if (id != null && id === lastId) return;   // already said this — no chatter
    lastId = id != null ? id : null;
    try {
      window.speechSynthesis.cancel();         // never overlap / pile up
      const u = new window.SpeechSynthesisUtterance(text);
      u.rate = 0.96;                            // calm, unhurried
      u.pitch = 1.0;
      u.volume = 1.0;
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

  return {
    available: () => AVAILABLE,
    isEnabled: () => enabled,
    setEnabled(on) { enabled = !!on; if (!enabled) cancel(); },
    speak,
    cancel,
    unlock,
  };
}
