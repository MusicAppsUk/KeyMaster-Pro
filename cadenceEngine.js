// cadenceEngine.js
//
// ============================================================================
// CADENCES — rc2-225
// ============================================================================
//
// The fourth strand of a scale manual, after scales, chords and arpeggios. A
// cadence is a short chord sequence that establishes a key: the two or three
// bars a pianist plays to settle the ear before starting a piece.
//
// WHICH CHORDS — this part is not a matter of taste
//   Perfect (authentic)   I  V7  I          in minor: i  V7  i
//   Plagal                I  IV  I          in minor: i  iv  i
//   Full (the book's)     I  IV  I  V7  I   in minor: i  iv  i  V7  i
//
// The minor forms take a MAJOR dominant with a minor tonic, which is why the
// harmonic minor scale raises its seventh: the V7 of A minor is E7, built on
// E G# B D, and the G# is the raised leading note. The cadence and the scale
// are the same fact seen twice, which is exactly why a book prints them on
// facing pages.
//
// HOW THEY ARE VOICED — this part IS a convention, and it is derived
// Played in root position throughout, a cadence leaps around the keyboard and
// teaches nothing about voice-leading. Every method book therefore inverts the
// middle chords so the hand barely moves and the common tones stay put. That
// choice is not arbitrary and it is not remembered here: each chord after the
// first takes whichever inversion moves the hand LEAST from the chord before
// it, measured as the total semitone distance between the two voicings. The
// tonic that opens and closes stays in root position, because that is what
// makes it sound like home.
//
// For C major that produces the voicing every book prints:
//   I   C  E  G        root position
//   IV  C  F  A        second inversion — C stays put, E and G step up
//   I   C  E  G        back
//   V7  B  D  F  G     third inversion — B, D, F sit right under the hand
//   I   C  E  G        home
//
// Nothing here is read off a page. The chords come from chordDictionary.js,
// correctly spelled, and the inversions fall out of the movement rule — which
// tools/check-cadences.mjs then holds to account.

import { buildChord, inversionCount, parseRoot } from './chordDictionary.js';

const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** The cadence forms, as scale degrees with the quality built on each. */
export const CADENCE_FORMS = Object.freeze({
  perfect: {
    id: 'perfect',
    label: 'Perfect cadence',
    blurb: 'The dominant seventh resolving home. The strongest ending in tonal music.',
    steps: [
      { degree: 1, roman: 'I',   quality: 'major' },
      { degree: 5, roman: 'V7',  quality: 'dom7' },
      { degree: 1, roman: 'I',   quality: 'major' },
    ],
    minorSteps: [
      { degree: 1, roman: 'i',   quality: 'minor' },
      { degree: 5, roman: 'V7',  quality: 'dom7' },
      { degree: 1, roman: 'i',   quality: 'minor' },
    ],
  },
  plagal: {
    id: 'plagal',
    label: 'Plagal cadence',
    blurb: 'The subdominant falling home — the "Amen" ending.',
    steps: [
      { degree: 1, roman: 'I',   quality: 'major' },
      { degree: 4, roman: 'IV',  quality: 'major' },
      { degree: 1, roman: 'I',   quality: 'major' },
    ],
    minorSteps: [
      { degree: 1, roman: 'i',   quality: 'minor' },
      { degree: 4, roman: 'iv',  quality: 'minor' },
      { degree: 1, roman: 'i',   quality: 'minor' },
    ],
  },
  full: {
    id: 'full',
    label: 'Full cadence',
    blurb: 'Tonic, subdominant, tonic, dominant seventh, tonic — the sequence the '
      + 'scale books print beside each key.',
    steps: [
      { degree: 1, roman: 'I',   quality: 'major' },
      { degree: 4, roman: 'IV',  quality: 'major' },
      { degree: 1, roman: 'I',   quality: 'major' },
      { degree: 5, roman: 'V7',  quality: 'dom7' },
      { degree: 1, roman: 'I',   quality: 'major' },
    ],
    minorSteps: [
      { degree: 1, roman: 'i',   quality: 'minor' },
      { degree: 4, roman: 'iv',  quality: 'minor' },
      { degree: 1, roman: 'i',   quality: 'minor' },
      { degree: 5, roman: 'V7',  quality: 'dom7' },
      { degree: 1, roman: 'i',   quality: 'minor' },
    ],
  },
});

/** Semitones above the tonic for each scale degree, major and minor alike. */
const DEGREE_SEMITONES = { 1: 0, 4: 5, 5: 7 };
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * The correctly-spelled root of a scale degree in a key.
 * The fourth of E flat is A flat, not G sharp; the fifth of G flat is D flat.
 */
function degreeRoot(tonicName, degree) {
  const { letter, accidental } = parseRoot(tonicName);
  const idx = LETTERS.indexOf(letter);
  const rootPc = (((LETTER_PC[letter] + accidental) % 12) + 12) % 12;
  const wantPc = (rootPc + DEGREE_SEMITONES[degree]) % 12;
  const newLetter = LETTERS[(idx + (degree - 1)) % 7];
  let acc = wantPc - LETTER_PC[newLetter];
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  const marks = { '-2': 'bb', '-1': 'b', 0: '', 1: '#', 2: 'x' };
  return newLetter + (marks[String(acc)] ?? '');
}

/** Total semitone distance between two voicings, note for note where possible. */
function movement(prev, next) {
  if (!prev || !prev.length) return 0;
  // Each note of the new chord answers to its nearest neighbour in the old one.
  // Summing those distances is a fair measure of how far the hand travels.
  let total = 0;
  for (const n of next) {
    let best = Infinity;
    for (const p of prev) best = Math.min(best, Math.abs(n - p));
    total += best;
  }
  return total;
}

/**
 * Build a cadence.
 *
 * @param {string} tonicName        e.g. "C", "Eb", "F#".
 * @param {Object} [opts]
 * @param {'perfect'|'plagal'|'full'} [opts.form='full']
 * @param {'major'|'minor'} [opts.mode='major']
 * @param {number} [opts.octave=4]  scientific octave of the opening tonic.
 * @returns {{ form: object, mode: string, tonic: string, chords: Array }}
 */
export function buildCadence(tonicName, opts = {}) {
  const form = CADENCE_FORMS[opts.form] || CADENCE_FORMS.full;
  const mode = opts.mode === 'minor' ? 'minor' : 'major';
  const octave = opts.octave ?? 4;
  const steps = mode === 'minor' ? form.minorSteps : form.steps;

  const chords = [];
  let prev = null;

  steps.forEach((step, i) => {
    const root = degreeRoot(tonicName, step.degree);

    // The tonic opens and closes in root position: that is what makes it sound
    // like the home the cadence is establishing. Everything between it takes
    // whichever inversion moves the hand least.
    const isOuterTonic = step.degree === 1 && (i === 0 || i === steps.length - 1);
    const isInnerTonic = step.degree === 1 && !isOuterTonic;

    let chosen = null;
    if (isOuterTonic || isInnerTonic) {
      chosen = buildChord(root, step.quality, { octave, inversion: 0 });
    } else {
      let bestCost = Infinity;
      for (let inv = 0; inv < inversionCount(step.quality); inv++) {
        // Try the inversion in the octave below, at, and above the tonic, so a
        // chord can sit under the hand rather than being forced up or down.
        for (const oct of [octave - 1, octave, octave + 1]) {
          const cand = buildChord(root, step.quality, { octave: oct, inversion: inv });
          const midis = cand.notes.map((n) => n.midi);
          // Stay inside a comfortable span around the tonic: a cadence is played
          // by one hand without moving, not spread across the keyboard.
          const lo = Math.min(...midis), hi = Math.max(...midis);
          const tonicMidi = LETTER_PC[parseRoot(tonicName).letter]
            + parseRoot(tonicName).accidental + 12 * (octave + 1);
          if (lo < tonicMidi - 3 || hi > tonicMidi + 15) continue;
          const cost = movement(prev, midis);
          if (cost < bestCost) { bestCost = cost; chosen = cand; }
        }
      }
      // If nothing fitted the span, fall back to root position rather than
      // silently dropping a chord out of the cadence.
      if (!chosen) chosen = buildChord(root, step.quality, { octave, inversion: 0 });
    }

    prev = chosen.notes.map((n) => n.midi);
    chords.push({
      roman: step.roman,
      degree: step.degree,
      symbol: chosen.symbol,
      inversion: chosen.inversion,
      notes: chosen.notes,
      midis: prev.slice(),
    });
  });

  return { form, mode, tonic: tonicName, chords };
}

/** The forms, in the order a book prints them. */
export function cadenceForms() {
  return [CADENCE_FORMS.perfect, CADENCE_FORMS.plagal, CADENCE_FORMS.full];
}

export const _internal = { degreeRoot, movement, DEGREE_SEMITONES };
