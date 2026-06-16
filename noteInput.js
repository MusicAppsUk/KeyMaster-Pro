// noteInput.js
//
// Input-agnostic note hub. Every way a note can be "played" — the on-screen
// keyboard, a Web MIDI keyboard, (later) playback or a tutor — is normalized
// into ONE event shape and delivered through this single stream:
//
//   { midiNote, velocity, timestamp, source }
//     midiNote  : integer MIDI number (60 = middle C)
//     velocity  : 1–127 (screen taps default to a fixed value)
//     timestamp : performance.now()-based ms, for latency/timing metrics
//     source    : 'screen' | 'midi' | 'playback' | …
//
// Scoring engines subscribe here and never need to know where input came from.
// app.js owns the wiring from concrete devices into emit().

export class NoteInput {
  constructor() {
    /** @type {Set<(ev: NoteEvent) => void>} */
    this._subs = new Set();
    /** @type {Set<(ev: NoteEvent) => void>} note-off / release subscribers */
    this._releaseSubs = new Set();
  }

  /**
   * Emit a normalized note event. Missing fields are filled with sane defaults
   * so callers can pass a partial object.
   * @param {{ midiNote: number, velocity?: number, timestamp?: number, source?: string }} ev
   */
  emit(ev) {
    if (ev == null || !Number.isInteger(ev.midiNote)) {
      throw new TypeError('NoteInput.emit requires an integer midiNote');
    }
    const normalized = {
      midiNote: ev.midiNote,
      velocity: clampVel(ev.velocity),
      timestamp: typeof ev.timestamp === 'number' ? ev.timestamp : now(),
      source: ev.source || 'screen',
    };
    for (const fn of this._subs) {
      try { fn(normalized); } catch (err) { console.error('NoteInput subscriber threw:', err); }
    }
  }

  /**
   * Emit a normalized note-OFF (release) event through the parallel stream.
   * @param {{ midiNote: number, timestamp?: number, source?: string }} ev
   */
  emitRelease(ev) {
    if (ev == null || !Number.isInteger(ev.midiNote)) {
      throw new TypeError('NoteInput.emitRelease requires an integer midiNote');
    }
    const normalized = {
      midiNote: ev.midiNote,
      timestamp: typeof ev.timestamp === 'number' ? ev.timestamp : now(),
      source: ev.source || 'screen',
    };
    for (const fn of this._releaseSubs) {
      try { fn(normalized); } catch (err) { console.error('NoteInput release subscriber threw:', err); }
    }
  }

  /**
   * Subscribe to the normalized note-ON stream.
   * @param {(ev: NoteEvent) => void} fn
   * @returns {() => void} unsubscribe
   */
  subscribe(fn) {
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }

  /**
   * Subscribe to the normalized note-OFF (release) stream.
   * @param {(ev: NoteEvent) => void} fn
   * @returns {() => void} unsubscribe
   */
  onRelease(fn) {
    this._releaseSubs.add(fn);
    return () => this._releaseSubs.delete(fn);
  }
}

function clampVel(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 100;
  return Math.min(127, Math.max(1, Math.round(v)));
}

function now() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

/**
 * @typedef {Object} NoteEvent
 * @property {number} midiNote
 * @property {number} velocity
 * @property {number} timestamp
 * @property {string} source
 */
