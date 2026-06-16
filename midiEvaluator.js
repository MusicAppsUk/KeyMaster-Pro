// midiEvaluator.js
//
// CENTRALIZED MIDI EVALUATION CONTROLLER — the single source of truth for note
// correctness across KeyMaster PRO (Scales, Recognition, Sight-Reading).
//
// Modules declare WHAT is expected for the current step via setExpected(); they
// do NOT evaluate correctness and do NOT colour notes. This controller:
//
//   • subscribes once to the normalized NoteInput stream;
//   • on Note_On, runs a deterministic, synchronous check against the active
//     Expected_Notes array → MATCH (green) or MISMATCH (red);
//   • paints BOTH targets in the same tick — the keyboard key (hl-match /
//     hl-mismatch) and the grand-staff notehead (is-correct / is-missed);
//   • the colour is a TIMED FLASH: it auto-clears after FLASH_MS regardless of
//     when (or whether) the MIDI note-off arrives. This makes feedback visible
//     for a guaranteed minimum even on hardware that drops or delays note-offs.
//
// A per-event debug snapshot (lastEval) records, post-paint, whether the DOM
// target was found and whether the CSS class is actually present — consumed by
// the temporary DEV readout so the full chain can be verified on-device.

export function createMidiEvaluator({ input, keyboard }) {
  const FLASH_MS = 600;             // visible flash duration before auto-clear

  let staff = null;                 // active grand-staff target (swapped per view)
  let expected = [];                // [{ midi, staffIndex, voice }]
  const matched = new Set();        // indices of `expected` already satisfied
  const flashes = new Set();        // active flash handles → { timer, clear }
  const listeners = new Set();
  let lastEval = null;              // DEV snapshot of the most recent evaluation

  const offOn = input.subscribe(onNoteOn);
  const offOff = input.onRelease ? input.onRelease(onNoteOff) : null;

  /* -------- lesson configuration (modules set this; they don't evaluate) -------- */

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

  /* -------------------- synchronized dual-target timed flash -------------------- */
  // Paint both targets now; schedule a single auto-clear after FLASH_MS. Returns
  // the staff state class used (for the debug snapshot).

  function flash(parts, state) {
    const staffState = state === 'match' ? 'correct' : 'missed';
    const clears = [];
    for (const p of parts) {
      if (p.kind === 'key') {
        keyboard?.highlight([p.midi], state);                  // hl-match | hl-mismatch
        clears.push(() => keyboard?.clearHighlight(state, [p.midi]));
      } else if (p.kind === 'staff' && staff && p.i != null) {
        staff.markVoice(p.i, p.voice, staffState);             // is-correct | is-missed
        clears.push(() => staff && staff.unmarkVoice(p.i, p.voice, staffState));
      }
    }
    const handle = { timer: null };
    handle.clear = () => {
      if (handle.timer != null) { clearTimeout(handle.timer); handle.timer = null; }
      clears.forEach((c) => c());
      flashes.delete(handle);
    };
    handle.timer = setTimeout(handle.clear, FLASH_MS);
    flashes.add(handle);
    return staffState;
  }

  // Post-paint verification — proves the visual state is attached to the correct
  // DOM element and the CSS class is actually present.
  function snapshot(midi, expectedMidi, accuracy, state, staffIndex, voice, staffState) {
    const keyEl = keyboard?.keys?.get?.(midi)?.el || null;
    const keyTargetFound = !!keyEl;
    const keyClassApplied = keyTargetFound && keyEl.classList.contains(`hl-${state}`);
    let staffTargetFound = null;
    let staffClassApplied = null;
    if (staff && staffIndex != null && typeof staff.voiceHasState === 'function') {
      staffClassApplied = staff.voiceHasState(staffIndex, voice, staffState);
      staffTargetFound = staffClassApplied !== null;     // null ⇒ node not found
    }
    lastEval = {
      midiNote: midi,
      expectedNote: expectedMidi,
      accuracy,
      state,
      keyTargetFound,
      keyClassApplied,
      staffTargetFound,
      staffClassApplied,
      at: nowMs(),
    };
    return lastEval;
  }

  /* ------------------------- deterministic evaluation ------------------------ */

  function onNoteOn(ev) {
    const midi = ev.midiNote;

    if (!expected.length) {
      // Nothing armed: still record a snapshot so the DEV readout shows activity.
      lastEval = {
        midiNote: midi, expectedNote: null, accuracy: false, state: 'idle',
        keyTargetFound: !!(keyboard?.keys?.get?.(midi)), keyClassApplied: false,
        staffTargetFound: null, staffClassApplied: null, at: nowMs(),
      };
      return;
    }

    const idx = expected.findIndex((t, i) => t.midi === midi && !matched.has(i));

    if (idx >= 0) {
      const t = expected[idx];
      matched.add(idx);
      const ss = flash(
        [{ kind: 'key', midi }, { kind: 'staff', i: t.staffIndex, voice: t.voice }],
        'match',
      );
      const dbg = snapshot(midi, t.midi, true, 'match', t.staffIndex, t.voice, ss);
      emit({ state: 'match', midiNote: midi, target: t,
             remaining: expected.length - matched.size, source: ev.source,
             timestamp: ev.timestamp, debug: dbg });
      if (matched.size >= expected.length) {
        emit({ state: 'complete', midiNote: midi, source: ev.source, timestamp: ev.timestamp });
      }
    } else {
      // MISMATCH: red on the pressed key + red on the first still-expected
      // notehead so the staff target flashes red too.
      const t = expected.find((_, i) => !matched.has(i)) || null;
      const parts = [{ kind: 'key', midi }];
      if (t && t.staffIndex != null) parts.push({ kind: 'staff', i: t.staffIndex, voice: t.voice });
      const ss = flash(parts, 'mismatch');
      const dbg = snapshot(midi, t ? t.midi : null, false, 'mismatch',
                           t ? t.staffIndex : null, t ? t.voice : 'primary', ss);
      emit({ state: 'mismatch', midiNote: midi, expected: t, source: ev.source,
             timestamp: ev.timestamp, debug: dbg });
    }
  }

  // The correctness colour is a timed flash, so a key release does NOT clear it
  // (the FLASH_MS timer owns the clear). Kept as a hook for symmetry.
  function onNoteOff(_ev) { /* intentionally no-op for colour */ }

  /* --------------------------------- control --------------------------------- */

  // Flush all pending flashes + matched state. Used on stop / step change.
  function reset() {
    for (const h of [...flashes]) h.clear();
    flashes.clear();
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

  function nowMs() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  return {
    setExpected, clearExpected, attachStaff, detachStaff,
    on, reset, destroy,
    get expected() { return expected.slice(); },
    get lastEval() { return lastEval; },
    FLASH_MS,
  };
}
