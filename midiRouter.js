// midiRouter.js
//
// Thin abstraction over the Web MIDI API. It connects physical MIDI keyboards
// to the PianoEngine so hardware presses light up the on-screen keys and feed
// the same event stream as touch input. Everything degrades gracefully: if the
// browser has no Web MIDI (Safari, some mobile), the app still works with touch.
//
// Responsibilities kept narrow on purpose:
//   - request access, enumerate inputs, (un)subscribe to messages
//   - decode raw status bytes into note-on / note-off + velocity
//   - forward into the engine and emit normalized events for the app layer
// It does NOT do scale logic, scoring, or latency timing — those belong to the
// pedagogy engines, which subscribe to these events.

import { PianoEngine } from './pianoEngine.js';

const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;

export class MidiRouter {
  /**
   * @param {PianoEngine} engine
   */
  constructor(engine) {
    if (!(engine instanceof PianoEngine)) {
      throw new TypeError('MidiRouter requires a PianoEngine instance');
    }
    this.engine = engine;
    /** @type {MIDIAccess|null} */
    this.access = null;
    /** @type {Map<string, MIDIInput>} id → input, currently subscribed. */
    this.inputs = new Map();
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    this._onMessage = this._onMessage.bind(this);
  }

  /** @returns {boolean} whether this browser exposes Web MIDI at all. */
  static isSupported() {
    return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';
  }

  /**
   * Request access and wire up all current inputs. Resolves to a status object
   * rather than throwing on the common "unsupported / denied" paths, so the
   * caller can show a calm fallback instead of an error.
   * @returns {Promise<{ ok: boolean, reason?: string, inputs: string[] }>}
   */
  async connect() {
    if (!MidiRouter.isSupported()) {
      return { ok: false, reason: 'unsupported', inputs: [] };
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch (err) {
      return { ok: false, reason: `denied:${err?.name ?? 'error'}`, inputs: [] };
    }

    this._subscribeAll();
    // Hot-plugging: re-subscribe when devices come and go.
    this.access.onstatechange = (ev) => {
      this._subscribeAll();
      this._emit('statechange', {
        port: ev.port?.name ?? 'unknown',
        state: ev.port?.state ?? 'unknown',
      });
    };

    return { ok: true, inputs: [...this.inputs.values()].map((i) => i.name ?? i.id) };
  }

  /** Stop listening and drop all handlers. */
  disconnect() {
    for (const input of this.inputs.values()) {
      input.removeEventListener?.('midimessage', this._onMessage);
      input.onmidimessage = null;
    }
    this.inputs.clear();
    if (this.access) this.access.onstatechange = null;
  }

  /**
   * Subscribe to router events: 'noteon', 'noteoff', 'statechange'.
   * noteon/noteoff handlers receive ({ midi, velocity, timeStamp }).
   * @param {'noteon'|'noteoff'|'statechange'} event
   * @param {Function} handler
   * @returns {() => void} unsubscribe
   */
  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return () => this._listeners.get(event)?.delete(handler);
  }

  /* ----------------------------------------------------------------- *
   * Internals
   * ----------------------------------------------------------------- */

  _subscribeAll() {
    if (!this.access) return;
    // Drop inputs that disappeared.
    for (const [id, input] of this.inputs) {
      if (!this.access.inputs.has(id)) {
        input.removeEventListener?.('midimessage', this._onMessage);
        this.inputs.delete(id);
      }
    }
    // Add inputs we aren't already listening to.
    for (const input of this.access.inputs.values()) {
      if (this.inputs.has(input.id)) continue;
      input.addEventListener('midimessage', this._onMessage);
      this.inputs.set(input.id, input);
    }
  }

  /**
   * Decode a raw MIDI message. Note-on with velocity 0 is, per spec, a note-off
   * — a classic gotcha we handle explicitly.
   * @param {MIDIMessageEvent} ev
   */
  _onMessage(ev) {
    const [status, data1, data2 = 0] = ev.data;
    const command = status & 0xf0;
    const midi = data1;

    if (command === NOTE_ON && data2 > 0) {
      this.engine.press(midi, { source: 'midi' });
      this._emit('noteon', { midi, velocity: data2, timeStamp: ev.timeStamp });
    } else if (command === NOTE_OFF || (command === NOTE_ON && data2 === 0)) {
      this.engine.release(midi, { source: 'midi' });
      this._emit('noteoff', { midi, velocity: data2, timeStamp: ev.timeStamp });
    }
    // Other messages (CC, pitch-bend, aftertouch) are intentionally ignored
    // here; a future controller layer can subscribe to raw input if needed.
  }

  _emit(event, detail) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(detail);
      } catch (err) {
        console.error(`MidiRouter "${event}" listener threw:`, err);
      }
    }
  }
}
