// scaleEngine.js
//
// Builds the note content of a scale from a tonic and a scale type. Two things
// this engine is careful about:
//
//  1. SPELLING. A scale has one note per letter name. D major is D E F# G A B C#
//     — never D E Gb. We assign consecutive letters (D, E, F, G, A, B, C) and
//     derive each accidental from the gap between that letter's natural pitch
//     and the pitch the scale formula demands. This is what lets the notation
//     and fingering engines reason about "the third degree" unambiguously.
//
//  2. ENHARMONIC TONICS. F# major and Gb major are the same keys but different
//     scales on paper. The caller picks the spelling by naming the tonic with
//     its accidental (e.g. {letter:'G', accidental:-1} for Gb).
//
// Output is a defensive, explicit data structure (see ScaleResult) rather than a
// bare array, because every downstream engine needs degree/letter/midi together.

import { toMidi, pitchClass } from './notes.js';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/** Natural pitch class of each letter. */
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Interval formulas as semitone offsets from the tonic (one octave).
 * Extend this table to add scale types; everything else is generic.
 */
export const SCALE_FORMULAS = Object.freeze({
  major:            [0, 2, 4, 5, 7, 9, 11],
  natural_minor:    [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor:   [0, 2, 3, 5, 7, 8, 11],
  melodic_minor:    [0, 2, 3, 5, 7, 9, 11], // ascending form
});

/**
 * @typedef {Object} ScaleDegree
 * @property {number} degree      1-based scale degree.
 * @property {string} letter      Letter name (C–B).
 * @property {number} accidental  Semitone offset: -2..+2 (bb, b, natural, #, x).
 * @property {string} name        Display name, e.g. "F#".
 * @property {number} pc          Pitch class 0–11.
 */

/**
 * @typedef {Object} ScaleResult
 * @property {string} tonic       Display tonic, e.g. "Gb".
 * @property {string} type        Scale type key.
 * @property {ScaleDegree[]} degrees  One entry per scale degree (no octave dup).
 * @property {(octave:number)=>number[]} midiAt  MIDI numbers for a given octave.
 */

/**
 * Build a scale.
 * @param {{ letter: string, accidental?: number }} tonic
 *        e.g. { letter: 'G', accidental: -1 } for Gb.
 * @param {keyof typeof SCALE_FORMULAS} type
 * @returns {ScaleResult}
 */
export function buildScale(tonic, type = 'major') {
  const formula = SCALE_FORMULAS[type];
  if (!formula) {
    throw new RangeError(`buildScale: unknown scale type "${type}"`);
  }
  const tonicLetter = String(tonic.letter).toUpperCase();
  const tonicAcc = Number.isInteger(tonic.accidental) ? tonic.accidental : 0;
  if (!(tonicLetter in LETTER_PC)) {
    throw new RangeError(`buildScale: bad tonic letter "${tonic.letter}"`);
  }

  const tonicPc = (LETTER_PC[tonicLetter] + tonicAcc + 120) % 12;
  const startLetterIdx = LETTERS.indexOf(tonicLetter);

  const degrees = formula.map((interval, i) => {
    // Each degree takes the next letter, wrapping after B.
    const letter = LETTERS[(startLetterIdx + i) % 7];
    const wantPc = (tonicPc + interval) % 12;
    // Accidental = signed distance from this letter's natural to the wanted pc.
    let accidental = wantPc - LETTER_PC[letter];
    // Normalise into the -6..+6 band, then trust it (scales never exceed ±2).
    if (accidental > 6) accidental -= 12;
    if (accidental < -6) accidental += 12;

    return {
      degree: i + 1,
      letter,
      accidental,
      name: spell(letter, accidental),
      pc: wantPc,
    };
  });

  return {
    tonic: spell(tonicLetter, tonicAcc),
    type,
    degrees,
    midiAt: (octave) => degrees.map((d) => toMidi(d.letter, d.accidental, octaveForDegree(d, octave, tonicPc))),
  };
}

/**
 * Resolve which scientific octave a degree lands in so the scale ascends
 * monotonically from the tonic. Degrees that wrap past B into the next letter
 * cycle belong to the next octave.
 */
function octaveForDegree(degree, baseOctave, tonicPc) {
  // If this degree's pitch class is below the tonic's, it has crossed the
  // octave boundary going up and belongs one octave higher.
  return degree.pc < tonicPc ? baseOctave + 1 : baseOctave;
}

/** Render a letter + accidental as a display string (b, #, double forms). */
function spell(letter, accidental) {
  const marks = { '-2': 'bb', '-1': 'b', '0': '', '1': '#', '2': 'x' };
  return letter + (marks[String(accidental)] ?? signFallback(accidental));
}

function signFallback(acc) {
  return acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc);
}

/**
 * Convenience: the set of pitch classes in a scale, for quick membership tests
 * (e.g. "is this played note in the current scale?").
 * @param {ScaleResult} scale
 * @returns {Set<number>}
 */
export function pitchClassSet(scale) {
  return new Set(scale.degrees.map((d) => d.pc));
}

/**
 * Is a MIDI note diatonic to a scale? Octave-agnostic.
 * @param {ScaleResult} scale
 * @param {number} midi
 * @returns {boolean}
 */
export function isInScale(scale, midi) {
  return pitchClassSet(scale).has(pitchClass(midi));
}
