// pianoEngine.js
//
// The piano engine owns the *physical* model of an 88-key keyboard: which keys
// exist, where they sit, and how to paint them into the DOM. It knows nothing
// about scales, chords, or sight-reading — higher layers light keys up by
// calling highlight()/clear(), and listen for press/release events.
//
// Rendering model: white keys are laid out in a CSS flex/grid row; black keys
// are positioned absolutely, straddling the gap between their white neighbours.
// We don't hardcode pixel positions here — we attach data attributes and a
// `--white-index` custom property, and let keyboard.css do the visual math.
// That keeps layout in the stylesheet where a designer can iterate on it.

import {
  allPianoKeys,
  isBlackKey,
  noteName,
  pitchClass,
  PIANO_MIN_MIDI,
  PIANO_MAX_MIDI,
} from './notes.js';

/**
 * @typedef {Object} PianoKey
 * @property {number}  midi        MIDI number (21–108).
 * @property {boolean} isBlack     Black vs white key.
 * @property {number}  whiteIndex  Index among white keys only (blacks reuse the
 *                                  preceding white index for positioning).
 * @property {HTMLButtonElement} el  The rendered DOM node.
 */

export class PianoEngine {
  /**
   * @param {HTMLElement} mountEl  Container the keyboard is rendered into.
   * @param {Object} [options]
   * @param {'sharp'|'flat'} [options.accidental='sharp']  How to label keys.
   * @param {boolean} [options.showLabels=false]  Print note names on keys.
   */
  constructor(mountEl, options = {}) {
    if (!(mountEl instanceof HTMLElement)) {
      throw new TypeError('PianoEngine requires a DOM element to mount into');
    }
    this.mountEl = mountEl;
    this.accidental = options.accidental === 'flat' ? 'flat' : 'sharp';
    this.showLabels = Boolean(options.showLabels);

    /** @type {Map<number, PianoKey>} midi → key record. Defensive lookup. */
    this.keys = new Map();

    /** @type {Set<number>} currently-sounding midi numbers. */
    this.activeNotes = new Set();

    /** @type {Map<string, Set<Function>>} event name → listener set. */
    this._listeners = new Map();

    this._render();
  }

  /* ----------------------------------------------------------------- *
   * Public API
   * ----------------------------------------------------------------- */

  /**
   * Subscribe to 'press' or 'release'. Handler receives the midi number and
   * a small detail object { source: 'pointer' | 'midi' | 'api' }.
   * Returns an unsubscribe function.
   * @param {'press'|'release'} event
   * @param {(midi: number, detail: object) => void} handler
   * @returns {() => void}
   */
  on(event, handler) {
    if (event !== 'press' && event !== 'release') {
      throw new RangeError(`PianoEngine.on: unknown event "${event}"`);
    }
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return () => this._listeners.get(event)?.delete(handler);
  }

  /**
   * Programmatically press a key (e.g. from MIDI input or playback).
   * Idempotent: pressing an already-active note is a no-op.
   * @param {number} midi
   * @param {{ source?: string }} [detail]
   */
  press(midi, detail = {}) {
    const key = this.keys.get(midi);
    if (!key || this.activeNotes.has(midi)) return;
    this.activeNotes.add(midi);
    key.el.classList.add('is-active');
    key.el.setAttribute('aria-pressed', 'true');
    this._emit('press', midi, { source: detail.source ?? 'api' });
  }

  /**
   * Programmatically release a key. Idempotent.
   * @param {number} midi
   * @param {{ source?: string }} [detail]
   */
  release(midi, detail = {}) {
    const key = this.keys.get(midi);
    if (!key || !this.activeNotes.has(midi)) return;
    this.activeNotes.delete(midi);
    key.el.classList.remove('is-active');
    key.el.setAttribute('aria-pressed', 'false');
    this._emit('release', midi, { source: detail.source ?? 'api' });
  }

  /**
   * Decorative highlight independent of "pressed" state — used by the scale
   * and harmony engines to mark target notes, fingering, root vs colour tones,
   * etc. The `variant` becomes a CSS class `hl-<variant>`.
   * @param {Iterable<number>} midis
   * @param {string} [variant='target']
   */
  highlight(midis, variant = 'target') {
    for (const midi of midis) {
      this.keys.get(midi)?.el.classList.add(`hl-${variant}`);
    }
  }

  /**
   * Remove a highlight variant from all keys (or from a specific set).
   * @param {string} [variant='target']
   * @param {Iterable<number>} [midis]  Limit to these keys; default = all.
   */
  clearHighlight(variant = 'target', midis) {
    const targets = midis ?? this.keys.keys();
    for (const midi of targets) {
      this.keys.get(midi)?.el.classList.remove(`hl-${variant}`);
    }
  }

  /** Release every active note. */
  allNotesOff() {
    for (const midi of [...this.activeNotes]) this.release(midi, { source: 'api' });
  }

  /**
   * Annotate a key with a finger number (1–5) for the fingering curriculum.
   * Pass `null` to remove. Stored as a data attribute so CSS can render it.
   * @param {number} midi
   * @param {number|null} finger
   */
  setFinger(midi, finger) {
    const key = this.keys.get(midi);
    if (!key) return;
    if (finger == null) {
      key.el.removeAttribute('data-finger');
    } else {
      if (!Number.isInteger(finger) || finger < 1 || finger > 5) {
        throw new RangeError(`setFinger: finger must be 1–5, got ${finger}`);
      }
      key.el.setAttribute('data-finger', String(finger));
    }
  }

  /** Remove all finger annotations. */
  clearFingers() {
    for (const key of this.keys.values()) key.el.removeAttribute('data-finger');
  }

  /* ----------------------------------------------------------------- *
   * Rendering
   * ----------------------------------------------------------------- */

  _render() {
    const frag = document.createDocumentFragment();
    let whiteIndex = -1;

    for (const midi of allPianoKeys()) {
      const black = isBlackKey(midi);
      if (!black) whiteIndex += 1;

      const el = document.createElement('button');
      el.type = 'button';
      el.className = `key ${black ? 'key--black' : 'key--white'}`;
      el.dataset.midi = String(midi);
      el.dataset.pc = String(pitchClass(midi));
      // White index used by CSS to position both whites (in flow) and blacks
      // (absolutely, offset from the preceding white key).
      el.style.setProperty('--white-index', String(whiteIndex));
      el.setAttribute('role', 'button');
      el.setAttribute('aria-pressed', 'false');
      el.setAttribute('aria-label', noteName(midi, { accidental: this.accidental }));

      if (this.showLabels) {
        const label = document.createElement('span');
        label.className = 'key__label';
        label.textContent = noteName(midi, { accidental: this.accidental });
        el.appendChild(label);
      }

      this._wirePointer(el, midi);

      frag.appendChild(el);
      this.keys.set(midi, { midi, isBlack: black, whiteIndex, el });
    }

    // Expose the white-key count so CSS can size the keyboard width.
    const whiteCount = whiteIndex + 1;
    this.mountEl.style.setProperty('--white-count', String(whiteCount));
    this.mountEl.classList.add('piano');
    this.mountEl.replaceChildren(frag);
  }

  /**
   * Pointer (mouse + touch + pen) handling via Pointer Events, so one code
   * path covers all input. We capture the pointer so a press that drags off
   * the key still releases cleanly.
   * @param {HTMLButtonElement} el
   * @param {number} midi
   */
  _wirePointer(el, midi) {
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      el.setPointerCapture?.(ev.pointerId);
      this.press(midi, { source: 'pointer' });
    });
    const up = () => this.release(midi, { source: 'pointer' });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    // Keyboard accessibility: space/enter on a focused key.
    el.addEventListener('keydown', (ev) => {
      if (ev.repeat) return;
      if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        this.press(midi, { source: 'pointer' });
      }
    });
    el.addEventListener('keyup', (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter') this.release(midi, { source: 'pointer' });
    });
  }

  /* ----------------------------------------------------------------- *
   * Internal event dispatch
   * ----------------------------------------------------------------- */

  _emit(event, midi, detail) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(midi, detail);
      } catch (err) {
        // One bad listener shouldn't take down note dispatch.
        console.error(`PianoEngine "${event}" listener threw:`, err);
      }
    }
  }
}

export { PIANO_MIN_MIDI, PIANO_MAX_MIDI };
