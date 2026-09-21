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
  // rc2-222. The chromatic scale breaks the one-note-per-letter rule that every
  // other formula here relies on: twelve degrees cannot take seven letters, so
  // letters repeat (C, C#, D, D#...) and the spelling is chosen per semitone
  // from a table rather than by walking the letter cycle. buildScale branches on
  // the formula's length to handle this; see chromaticDegrees() below.
  chromatic:        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
});

/**
 * Semitone spellings for the chromatic scale, indexed by pitch class.
 *
 * A chromatic scale is conventionally written with sharps and, when the
 * starting note is itself a flat, with flats — so an E flat chromatic begins on
 * E flat rather than D sharp. Both tables spell each pitch as an alteration of
 * a neighbouring natural, never as a double accidental.
 */
const CHROMATIC_SHARP = Object.freeze([
  ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
  ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
]);
const CHROMATIC_FLAT = Object.freeze([
  ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
  ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
]);

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

  // ---------------------------------------------------------------------
  // CHROMATIC — a different spelling model, not a different formula.
  //
  // Every other scale here assigns one letter per degree and derives the
  // accidental from the gap. A chromatic scale has twelve degrees and seven
  // letters, so that walk does not terminate sensibly. Instead each semitone is
  // spelled from a table, and the MIDI is simply the tonic plus the semitone
  // count — which makes the ascent correct by construction rather than by
  // inference, and sidesteps the octave question entirely.
  // ---------------------------------------------------------------------
  if (formula.length === 12) {
    const table = tonicAcc < 0 ? CHROMATIC_FLAT : CHROMATIC_SHARP;
    const chromDegrees = formula.map((semitones, i) => {
      const pc = (tonicPc + semitones) % 12;
      // The tonic keeps its own spelling even where the table would differ.
      const [letter, accidental] = i === 0
        ? [tonicLetter, tonicAcc]
        : table[pc];
      return {
        degree: i + 1,
        letter,
        accidental,
        name: spell(letter, accidental),
        pc,
      };
    });
    return {
      tonic: spell(tonicLetter, tonicAcc),
      type,
      degrees: chromDegrees,
      midiAt: (octave) => {
        const base = toMidi(tonicLetter, tonicAcc, octave);
        return formula.map((s) => base + s);
      },
    };
  }

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
    midiAt: (octave) => degrees.map((d, i) => toMidi(d.letter, d.accidental, octaveForDegree(startLetterIdx, i, octave))),
  };
}

/**
 * Resolve which scientific octave a degree lands in so the scale ascends
 * monotonically from the tonic.
 *
 * This is decided by the LETTER, not the pitch class. Scientific octave numbers
 * increment at C, so a degree belongs one octave higher once its letter has
 * wrapped past B — regardless of what its accidental does to the sounding pitch.
 *
 * The earlier pitch-class test ("is this degree's pc below the tonic's?") agreed
 * with the letter rule for every scale whose spelling stays inside one letter
 * cycle, but broke on the two that cross the C boundary against their accidental:
 *
 *   • C flat  (G flat major, E flat minor) — pc 11 reads as "above" the tonic,
 *     so it stayed in the low octave and sounded a seventh DOWN instead of a
 *     semitone up. E flat harmonic minor came out 63 65 66 68 70 [59] 74 75.
 *   • B sharp (C sharp major, C sharp minor) — pc 0 reads as "below" the tonic,
 *     so it was pushed an octave UP and the leading note overshot the tonic.
 *
 * Both now resolve from the letter index and are correct.
 */
function octaveForDegree(startLetterIdx, degreeIndex, baseOctave) {
  return baseOctave + Math.floor((startLetterIdx + degreeIndex) / 7);
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
