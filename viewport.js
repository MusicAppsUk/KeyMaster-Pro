// viewport.js
//
// The viewport solves the spec's "4-octave sweet spot" problem: 88 keys on a
// phone makes every touch target unusably thin, while 2 octaves loses register
// context. We render the full 88-key engine once, then show a sliding 4-octave
// window over it — wide enough to keep spatial/register awareness, narrow
// enough that keys stay tappable.
//
// Mechanism: rather than destroy/rebuild DOM when the window moves, we mark keys
// outside the window with `is-offscreen` and translate the keyboard track so the
// active window fills the container. Higher layers ask the viewport to "frame"
// a set of notes (e.g. the notes of the current exercise) and it picks the best
// 4-octave window that contains them, shifting only when it has to.

import { PianoEngine } from './pianoEngine.js';
import { clampToPiano, octaveOf, PIANO_MAX_MIDI, PIANO_MIN_MIDI } from './notes.js';

const SEMITONES_PER_OCTAVE = 12;

export class Viewport {
  /**
   * @param {PianoEngine} engine
   * @param {Object} [options]
   * @param {number} [options.octaves=4]      Visible span in octaves.
   * @param {number} [options.startMidi=48]   Lowest visible note (C3 by default).
   */
  constructor(engine, options = {}) {
    if (!(engine instanceof PianoEngine)) {
      throw new TypeError('Viewport requires a PianoEngine instance');
    }
    this.engine = engine;
    this.octaves = Number.isInteger(options.octaves) ? options.octaves : 4;
    this.span = this.octaves * SEMITONES_PER_OCTAVE; // semitones visible

    /** Lowest MIDI currently in the window. */
    this.startMidi = this._normalizeStart(options.startMidi ?? 48);

    this._apply();

    // Course orientation: when the learner enters the Course (data-view="learn"),
    // frame the keyboard around Middle C even before the first note is shown, so
    // it always opens centred. Course-only — switching to any other view does not
    // trigger it, and it touches the viewport window only, never note mapping.
    this._installCourseCentering();
  }

  /* ----------------------------------------------------------------- *
   * Public API
   * ----------------------------------------------------------------- */

  /** @returns {{ low: number, high: number }} inclusive MIDI bounds of window. */
  get window() {
    return { low: this.startMidi, high: this.startMidi + this.span - 1 };
  }

  /**
   * Slide the window by a number of whole octaves (negative = down).
   * Clamped so the window never runs off either end of the keyboard.
   * @param {number} octaves
   */
  shiftOctaves(octaves) {
    this.startMidi = this._normalizeStart(this.startMidi + octaves * SEMITONES_PER_OCTAVE);
    this._apply();
  }

  /**
   * Set the lowest visible note directly (snapped to a C for clean framing).
   * @param {number} midi
   */
  setStart(midi) {
    this.startMidi = this._normalizeStart(midi);
    this._apply();
  }

  /**
   * Choose the smallest shift so that every note in `midis` is visible. If the
   * notes already fit, nothing moves (avoids distracting jumps mid-exercise).
   * If the notes span more than the window, we centre on their mean and report
   * an overflow so the caller can decide how to cope.
   * @param {Iterable<number>} midis
   * @returns {{ moved: boolean, overflow: boolean }}
   */
  frame(midis) {
    const list = [...midis].filter((m) => Number.isInteger(m));
    if (list.length === 0) return { moved: false, overflow: false };

    // Course (learn) view: actively CENTRE the framed notes so the learner stays
    // oriented — Middle C lands in the middle of the keyboard, not off to one
    // side. Every other view keeps the gentle minimal-nudge framing below, so
    // Chord / Scales / Sight-Reading / free-play behave exactly as before. This
    // changes the viewport window only; note identities and mapping are untouched.
    if (isCourseView()) return this.center(list);

    const lo = Math.min(...list);
    const hi = Math.max(...list);
    const { low, high } = this.window;

    // Already fully visible — leave it alone.
    if (lo >= low && hi <= high) return { moved: false, overflow: false };

    const needed = hi - lo + 1;
    if (needed > this.span) {
      // Can't fit; centre as best we can and flag overflow.
      const mid = Math.round((lo + hi) / 2);
      this.setStart(mid - Math.floor(this.span / 2));
      return { moved: true, overflow: true };
    }

    // Nudge the window the minimum distance to bring the notes inside.
    let newStart = this.startMidi;
    if (lo < low) newStart = lo;
    else if (hi > high) newStart = hi - this.span + 1;

    this.startMidi = this._normalizeStart(newStart);
    this._apply();
    return { moved: true, overflow: false };
  }

  /**
   * Centre the given notes within the window — used by the Course so Middle C and
   * a step's notes sit in the MIDDLE of the keyboard rather than off to one side.
   * Prefers an octave-aligned C start when one keeps every note visible; if none
   * does, picks the closest start that keeps them visible (visibility always wins
   * over octave-alignment, so wide low/high steps still show both extremes).
   * Viewport/scroll only: keys are not reordered and MIDI mapping is unchanged.
   * @param {Iterable<number>} [midis=[60]]  notes to centre (default Middle C)
   * @returns {{ moved: boolean, overflow: boolean }}
   */
  center(midis = [60]) {
    const list = [...midis].filter((m) => Number.isInteger(m));
    if (list.length === 0) list.push(60);
    const lo = Math.min(...list);
    const hi = Math.max(...list);
    if (hi - lo + 1 > this.span) {
      // Wider than the window — centre on the mean and flag overflow.
      const mid = Math.round((lo + hi) / 2);
      this.setStart(mid - Math.floor(this.span / 2));
      return { moved: true, overflow: true };
    }
    const ideal = Math.round((lo + hi) / 2 - this.span / 2);   // continuous centred start
    const minStart = hi - this.span + 1;                       // keep the highest note visible
    const maxStart = lo;                                       // keep the lowest note visible
    let start = cAlignedStart(ideal, minStart, maxStart);
    start = clampToPiano(start);
    const maxBoardStart = PIANO_MAX_MIDI - this.span + 1;
    if (start > maxBoardStart) start = maxBoardStart;
    if (start < PIANO_MIN_MIDI) start = PIANO_MIN_MIDI;
    this.startMidi = start;
    this._apply();
    return { moved: true, overflow: false };
  }

  /* ----------------------------------------------------------------- *
   * Internals
   * ----------------------------------------------------------------- */

  /**
   * Snap a desired start note to the nearest C at or below it, then clamp so a
   * full window still fits on the 88-key board. Snapping to C keeps the window
   * aligned to octave boundaries, which reads more naturally to a learner.
   * @param {number} midi
   * @returns {number}
   */
  _normalizeStart(midi) {
    let start = clampToPiano(midi);
    // Snap down to the C of this octave (pitch class 0).
    start -= start % SEMITONES_PER_OCTAVE;
    // Clamp the high edge.
    const maxStart = PIANO_MAX_MIDI - this.span + 1;
    if (start > maxStart) start = maxStart - (maxStart % SEMITONES_PER_OCTAVE);
    if (start < PIANO_MIN_MIDI) {
      // A0/A#0/B0 sit below the first C; allow starting at the very bottom.
      start = PIANO_MIN_MIDI;
    }
    return start;
  }

  /**
   * Apply the current window to the DOM: tag offscreen keys and expose the
   * window bounds as custom properties for keyboard.css to translate/scale the
   * track. We deliberately keep the visual transform in CSS.
   */
  _apply() {
    const { low, high } = this.window;

    // White-key geometry for the renderer. keyboard.css sizes every key as a
    // fraction of the total white-key count and slides the track left by the
    // window's first white index — so we publish both here rather than make CSS
    // re-derive keyboard layout from MIDI numbers.
    let whiteStart = null;
    let whiteEnd = null;

    for (const [midi, key] of this.engine.keys) {
      const offscreen = midi < low || midi > high;
      key.el.classList.toggle('is-offscreen', offscreen);
      key.el.tabIndex = offscreen ? -1 : 0; // keep focus order inside the window
      if (!offscreen && !key.isBlack) {
        if (whiteStart === null) whiteStart = key.whiteIndex;
        whiteEnd = key.whiteIndex;
      }
    }

    const whiteSpan = whiteStart === null ? this.octaves * 7 : whiteEnd - whiteStart + 1;

    const root = this.engine.mountEl;
    root.style.setProperty('--window-low', String(low));
    root.style.setProperty('--window-high', String(high));
    root.style.setProperty('--window-octaves', String(this.octaves));
    root.style.setProperty('--window-white-start', String(whiteStart ?? 0));
    root.style.setProperty('--white-span', String(whiteSpan));
    root.dataset.windowLabel = `${noteShort(low)}–${noteShort(high)}`;
  }

  /**
   * Watch for the Course (learn) view becoming active and centre the keyboard on
   * Middle C when it does — so the Course always OPENS with Middle C in the middle,
   * even on a step that frames no notes. Course-only; a no-op outside the browser.
   */
  _installCourseCentering() {
    if (typeof document === 'undefined' || !document.documentElement) return;
    const el = document.documentElement;
    const centreIfCourse = () => {
      if (el.dataset && el.dataset.view === 'learn') {
        try { this.center([60]); } catch (_) { /* framing still centres per step */ }
      }
    };
    if (typeof MutationObserver !== 'undefined') {
      try {
        new MutationObserver(centreIfCourse).observe(el, { attributes: true, attributeFilter: ['data-view'] });
      } catch (_) { /* observer is a nicety, not required */ }
    }
    centreIfCourse();   // already in the Course at boot? centre now.
  }
}

/** True only while the Course (learn) view is the active one. */
function isCourseView() {
  return typeof document !== 'undefined'
    && !!document.documentElement
    && !!document.documentElement.dataset
    && document.documentElement.dataset.view === 'learn';
}

/**
 * Pick an octave-aligned C nearest `ideal` that still sits within [minStart,
 * maxStart] (so every framed note stays visible). If no C fits the range, fall
 * back to the closest in-range start so visibility always wins over alignment.
 */
function cAlignedStart(ideal, minStart, maxStart) {
  const below = ideal - (((ideal % 12) + 12) % 12);   // C at or below ideal
  const candidates = [below, below + 12].filter((c) => c >= minStart && c <= maxStart);
  if (candidates.length) {
    candidates.sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal));
    return candidates[0];
  }
  return Math.max(minStart, Math.min(maxStart, ideal));
}

/** Compact label like "C3" for the window readout (sharp spelling). */
function noteShort(midi) {
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${NAMES[midi % 12]}${octaveOf(midi)}`;
}
