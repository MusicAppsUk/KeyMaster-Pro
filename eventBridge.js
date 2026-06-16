// eventBridge.js
//
// The Event Bridge Data Layer (RC2 §1.2). EVERY note interaction produces and
// logs this exact payload — nothing more (no scoring, no analytics; those are
// explicitly out of scope for RC2):
//
//   { midiNote, expectedNote, timestamp, expectedTimestamp, deltaMs, accuracy }
//
// `timestamp` and `expectedTimestamp` are performance.now()-based ms. With free
// timing, `expectedTimestamp` is when the note became the expected target, so
// `deltaMs` is read/reaction latency (logged raw, not yet scored).

export class EventBridge {
  /** @param {{ sink?: (payload: object) => void }} [opts] optional custom sink */
  constructor({ sink } = {}) {
    this._log = [];
    this._sink = typeof sink === 'function' ? sink : null;
  }

  /**
   * Record one interaction. Returns the canonical payload.
   * @param {{ midiNote:number, expectedNote:number, timestamp:number, expectedTimestamp:number }} ev
   */
  record({ midiNote, expectedNote, timestamp, expectedTimestamp }) {
    const payload = {
      midiNote,
      expectedNote,
      timestamp: Math.round(timestamp),
      expectedTimestamp: Math.round(expectedTimestamp),
      deltaMs: Math.round(timestamp - expectedTimestamp),
      accuracy: midiNote === expectedNote,
    };
    this._log.push(payload);
    if (this._sink) {
      try { this._sink(payload); } catch (err) { console.error('EventBridge sink threw:', err); }
    } else if (typeof console !== 'undefined') {
      console.debug('[event-bridge]', payload);
    }
    return payload;
  }

  /** A shallow copy of every payload recorded this session. */
  get log() { return this._log.slice(); }

  clear() { this._log.length = 0; }
}
