// notes.js
//
// Shared pitch primitives for KeyMaster PRO.
//
// This is the lowest layer in the dependency graph: it depends on nothing,
// and both /js/keyboard/ and /js/scales/ depend down onto it. Keeping these
// pure functions here (rather than inside pianoEngine or scaleEngine) prevents
// a sideways dependency where the keyboard would have to import from scales
// just to do MIDI math.
//
// CONVENTIONS
//   - "MIDI number" is the standard 0–127 integer. Middle C = C4 = 60.
//   - A pitch class (pc) is 0–11, where 0 = C, 1 = C#/Db, ... 11 = B.
//   - The physical 88-key piano spans A0 (MIDI 21) to C8 (MIDI 108).
//   - Spelling matters: this module can name a pitch with sharps OR flats,
//     because Gb major and F# major are different scales to a reader even
//     though they sound identical. Callers pass the preferred accidental.

/** Lowest and highest MIDI numbers on a standard 88-key acoustic piano. */
export const PIANO_MIN_MIDI = 21;  // A0
export const PIANO_MAX_MIDI = 108; // C8

/** Pitch-class names, indexed 0–11. Two parallel tables for spelling. */
export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Pitch classes that sit on a black key (C#, D#, F#, G#, A#). */
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

/**
 * Is this MIDI number a black key?
 * @param {number} midi
 * @returns {boolean}
 */
export function isBlackKey(midi) {
  assertMidi(midi);
  return BLACK_PITCH_CLASSES.has(midi % 12);
}

/**
 * Pitch class (0–11) of a MIDI number.
 * @param {number} midi
 * @returns {number}
 */
export function pitchClass(midi) {
  assertMidi(midi);
  return ((midi % 12) + 12) % 12;
}

/**
 * Scientific-pitch octave number for a MIDI value (C4 = 60 → octave 4).
 * @param {number} midi
 * @returns {number}
 */
export function octaveOf(midi) {
  assertMidi(midi);
  return Math.floor(midi / 12) - 1;
}

/**
 * Human-readable note name, e.g. 60 → "C4".
 * @param {number} midi
 * @param {{ accidental?: 'sharp'|'flat' }} [opts]
 * @returns {string}
 */
export function noteName(midi, opts = {}) {
  assertMidi(midi);
  const table = opts.accidental === 'flat' ? FLAT_NAMES : SHARP_NAMES;
  return `${table[pitchClass(midi)]}${octaveOf(midi)}`;
}

/**
 * MIDI number from a letter + accidental + octave, e.g. ("C", 0, 4) → 60.
 * @param {string} letter  One of C D E F G A B (case-insensitive).
 * @param {number} accidental  Semitone offset: -1 flat, 0 natural, +1 sharp, +2 double-sharp, etc.
 * @param {number} octave  Scientific octave (C4 = middle C).
 * @returns {number}
 */
export function toMidi(letter, accidental, octave) {
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[String(letter).toUpperCase()];
  if (base === undefined) {
    throw new RangeError(`toMidi: unknown letter "${letter}"`);
  }
  if (!Number.isInteger(accidental)) {
    throw new TypeError(`toMidi: accidental must be an integer, got ${accidental}`);
  }
  return (octave + 1) * 12 + base + accidental;
}

/**
 * Clamp a MIDI value into the playable 88-key range.
 * @param {number} midi
 * @returns {number}
 */
export function clampToPiano(midi) {
  return Math.min(PIANO_MAX_MIDI, Math.max(PIANO_MIN_MIDI, Math.round(midi)));
}

/**
 * Every MIDI number on the 88-key piano, low to high. Useful for rendering.
 * @returns {number[]}
 */
export function allPianoKeys() {
  const keys = [];
  for (let m = PIANO_MIN_MIDI; m <= PIANO_MAX_MIDI; m++) keys.push(m);
  return keys;
}

/**
 * Defensive guard used throughout this module. We validate aggressively here
 * so that bad pitch data fails loudly at the source rather than silently
 * producing a wrong key three layers up in the harmony engine.
 * @param {number} midi
 */
function assertMidi(midi) {
  if (!Number.isInteger(midi)) {
    throw new TypeError(`Expected integer MIDI number, got ${typeof midi}: ${midi}`);
  }
  if (midi < 0 || midi > 127) {
    throw new RangeError(`MIDI number ${midi} out of 0–127 range`);
  }
}
