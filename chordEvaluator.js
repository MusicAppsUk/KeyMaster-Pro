// chordEvaluator.js
//
// Block-chord detector for the Chord Masterclass. It subscribes to the SAME
// normalized note hub (NoteInput) that every other input path feeds, tracks the
// currently-held set of notes, and rules a chord correct ONLY when every required
// tone is held and NO extra tone is. It owns keyboard match/mismatch colour and
// (optionally) staff correctness marks, and emits progress/wrong/complete.
//
// It deliberately does NOT touch the single-note midiEvaluator used by Scales /
// Sight-Reading — chords need a set-membership decision, not a sequential cursor,
// so this is a separate, self-contained controller. RC2 stays exactly as it was.

export function createChordEvaluator({ input, keyboard }) {
  const FLASH_MS = 700;

  let expected = new Set();        // required MIDI notes for the current chord
  let staff = null;                // optional staffView for notehead marks
  let midiToIndex = new Map();     // midi → staff note index
  const held = new Set();          // notes physically down right now
  let done = false;                // true during the post-completion flash
  let flashTimer = null;

  const listeners = { progress: new Set(), wrong: new Set(), complete: new Set() };
  const emit = (type, payload) => {
    for (const fn of listeners[type] || []) {
      try { fn(payload); } catch (e) { console.error('chordEvaluator listener threw:', e); }
    }
  };

  function paintCorrect(midi) {
    keyboard.clearHighlight('mismatch', [midi]);
    keyboard.highlight([midi], 'match');
    if (staff && midiToIndex.has(midi)) staff.mark(midiToIndex.get(midi), 'correct');
  }
  function paintWrong(midi) {
    keyboard.highlight([midi], 'mismatch');
  }
  function unpaint(midi) {
    keyboard.clearHighlight('match', [midi]);
    keyboard.clearHighlight('mismatch', [midi]);
    if (staff && midiToIndex.has(midi)) staff.unmark(midiToIndex.get(midi), 'correct');
  }

  function clearAllPaint() {
    for (const m of expected) {
      keyboard.clearHighlight('match', [m]);
      keyboard.clearHighlight('mismatch', [m]);
    }
    for (const m of held) keyboard.clearHighlight('mismatch', [m]);
    if (staff) for (const i of midiToIndex.values()) staff.unmark(i, 'correct');
  }

  function resetAttempt() {
    if (flashTimer) { clearTimeout(flashTimer); flashTimer = null; }
    clearAllPaint();
    held.clear();
    done = false;
  }

  function isComplete() {
    if (!expected.size) return false;
    for (const e of expected) if (!held.has(e)) return false; // all required present
    for (const h of held) if (!expected.has(h)) return false; // and nothing extra
    return true;
  }

  function onNoteOn(ev) {
    const midi = ev.midiNote;
    if (done) return;                       // inside a completion flash — ignore until reset
    held.add(midi);
    if (expected.has(midi)) paintCorrect(midi);
    else { paintWrong(midi); emit('wrong', { midi }); }

    emit('progress', { held: held.size, total: expected.size });
    if (isComplete()) {
      done = true;
      emit('complete', { midis: [...expected] });
      flashTimer = setTimeout(resetAttempt, FLASH_MS);
    }
  }

  function onRelease(ev) {
    const midi = ev.midiNote;
    if (done) return;                       // let the green flash finish; reset clears it
    held.delete(midi);
    unpaint(midi);
  }

  const offOn = input.subscribe(onNoteOn);
  const offRel = input.onRelease(onRelease);

  return {
    /** Arm a new chord (array of MIDI notes). Clears any prior attempt paint. */
    setExpected(midis) { resetAttempt(); expected = new Set(midis); },
    /** Optional: drive notehead correctness marks. map = midi → staff index. */
    attachStaff(s, map) { staff = s; midiToIndex = map || new Map(); },
    detachStaff() { staff = null; midiToIndex = new Map(); },
    on(type, fn) { listeners[type]?.add(fn); return () => listeners[type]?.delete(fn); },
    /** Clear paint + held + flash, keep the armed chord. */
    clear() { resetAttempt(); },
    /** Clear everything and disarm. */
    reset() { resetAttempt(); expected = new Set(); },
    destroy() {
      resetAttempt();
      offOn?.(); offRel?.();
      listeners.progress.clear(); listeners.wrong.clear(); listeners.complete.clear();
    },
    get held() { return new Set(held); },
    get isComplete() { return done; },
    FLASH_MS,
  };
}
