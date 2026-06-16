// midiEvaluator.js
//
// CENTRALIZED MIDI EVALUATION CONTROLLER — the single source of truth for note
// correctness across KeyMaster PRO.
//
// It sits above every page module (Scales, Recognition, Sight-Reading). Modules
// declare WHAT is expected for the current lesson step via setExpected(); they do
// NOT evaluate correctness and do NOT colour notes. This controller:
//
//   • subscribes once to the normalized NoteInput streams (on + release);
//   • on Note_On, runs a purely deterministic, synchronous check against the
//     active Expected_Notes array → MATCH (green) or MISMATCH (red);
//   • emits ONE state update that paints BOTH visual targets in the same tick:
//        – the Virtual Keyboard key  (hl-match / hl-mismatch)
//        – the Grand Staff notehead  (is-correct / is-missed, per voice)
//   • on Note_Off, instantly clears that note's active colour on both targets,
//     leaving no trailing artefacts.
//
// Modules consume the broadcast via on(); they may advance their own cursor /
// lesson state from it, but the colour/correctness decision is made here and
// only here (immutability constraint).

export function createMidiEvaluator({ input, keyboard }) {
  let staff = null;                 // active grand-staff target (swapped per view)
  let expected = [];                // [{ midi, staffIndex, voice }]
  const matched = new Set();        // indices of `expected` already satisfied
  const active = new Map();         // held midi → { state, staffIndex, voice }
  const listeners = new Set();

  const offOn = input.subscribe(onNoteOn);
  const offOff = input.onRelease ? input.onRelease(onNoteOff) : null;

  /* -------- lesson configuration (modules set this; they don't evaluate) -------- */

  /** @param {Array<{midi:number, staffIndex?:number, voice?:'primary'|'lower'}>} targets */
  function setExpected(targets) {
    expected = (targets || []).map((t) => ({
      midi: t.midi,
      staffIndex: t.staffIndex ?? null,
      voice: t.voice ?? 'primary',
    }));
    matched.clear();
  }
  function clearExpected() { expected = []; matched.clear(); }

  function attachStaff(s) { staff = s || null; }
  function detachStaff() { if (staff) reset(); staff = null; }

  /* -------------------- synchronized dual-target painting -------------------- */
  // One synchronous call mutates BOTH targets, so keyboard + staff change state
  // on the same frame.

  function paint(midi, staffIndex, voice, state) {
    const staffState = state === 'match' ? 'correct' : 'missed';
    keyboard?.highlight([midi], state);                 // hl-match | hl-mismatch
    if (staff && staffIndex != null) staff.markVoice(staffIndex, voice, staffState);
  }
  function unpaint(midi, staffIndex, voice, state) {
    const staffState = state === 'match' ? 'correct' : 'missed';
    keyboard?.clearHighlight(state, [midi]);
    if (staff && staffIndex != null) staff.unmarkVoice(staffIndex, voice, staffState);
  }

  /* ------------------------- deterministic evaluation ------------------------ */

  function onNoteOn(ev) {
    const midi = ev.midiNote;
    if (!expected.length) return;                       // nothing armed → ignore

    // Deterministic, synchronous: is this an unmatched expected note?
    const idx = expected.findIndex((t, i) => t.midi === midi && !matched.has(i));

    if (idx >= 0) {
      const t = expected[idx];
      matched.add(idx);
      paint(midi, t.staffIndex, t.voice, 'match');
      active.set(midi, { state: 'match', staffIndex: t.staffIndex, voice: t.voice });
      emit({ state: 'match', midiNote: midi, target: t,
             remaining: expected.length - matched.size, source: ev.source, timestamp: ev.timestamp });
      if (matched.size >= expected.length) {
        emit({ state: 'complete', midiNote: midi, source: ev.source, timestamp: ev.timestamp });
      }
    } else {
      // MISMATCH: red on the pressed key; mirror red on the first still-expected
      // notehead so the staff shows the same state.
      const t = expected.find((_, i) => !matched.has(i)) || null;
      keyboard?.highlight([midi], 'mismatch');
      if (staff && t && t.staffIndex != null) staff.markVoice(t.staffIndex, t.voice, 'missed');
      active.set(midi, { state: 'mismatch', staffIndex: t ? t.staffIndex : null, voice: t ? t.voice : 'primary' });
      emit({ state: 'mismatch', midiNote: midi, expected: t, source: ev.source, timestamp: ev.timestamp });
    }
  }

  function onNoteOff(ev) {
    const midi = ev.midiNote;
    const rec = active.get(midi);
    if (!rec) {
      // Defensive: clear any stray colour on this key regardless.
      keyboard?.clearHighlight('match', [midi]);
      keyboard?.clearHighlight('mismatch', [midi]);
      return;
    }
    unpaint(midi, rec.staffIndex, rec.voice, rec.state);
    active.delete(midi);
  }

  /* --------------------------------- control --------------------------------- */

  // Clear ALL active colour + matched state (used on stop / step change). Leaves
  // no trailing artefacts on either target.
  function reset() {
    for (const [midi, rec] of active) unpaint(midi, rec.staffIndex, rec.voice, rec.state);
    active.clear();
    matched.clear();
    keyboard?.clearHighlight('match');
    keyboard?.clearHighlight('mismatch');
  }

  function on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit(payload) {
    for (const fn of listeners) {
      try { fn(payload); } catch (e) { console.error('MidiEvaluator listener threw:', e); }
    }
  }

  function destroy() { offOn?.(); offOff?.(); reset(); listeners.clear(); staff = null; }

  return {
    setExpected, clearExpected, attachStaff, detachStaff,
    on, reset, destroy,
    get expected() { return expected.slice(); },
  };
}
