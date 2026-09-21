// chordDictionary.js
//
// ============================================================================
// THE CHORD DICTIONARY — rc2-224
// ============================================================================
//
// A reference model of chords, built to be BROWSED rather than drilled: every
// root, every quality, correctly spelled, with its notes ready to sound.
//
// WHY THIS IS A NEW MODULE AND NOT AN EXTENSION OF chordEngine.js
// chordEngine.js works in pitch classes. That is the right model for the thing
// it does — deciding whether the keys you pressed match the chord asked for,
// where B flat and A sharp genuinely ARE the same answer. It is also why it
// cannot back a dictionary: a dictionary has to tell you that A flat major and
// G sharp major are different entries, spelled A flat C E flat and G sharp B
// sharp D sharp, even though your hand does the same thing. Rather than push
// two incompatible jobs into one module and risk the evaluator, this sits
// alongside it and chordEngine.js is left exactly as it was.
//
// HOW SPELLING WORKS
// A chord is a set of SCALE DEGREES over a root, each with a semitone offset.
// The degree picks the letter — a third above C is some kind of E, whatever
// accidental it needs — and the offset then decides that accidental. This is
// the same principle scaleEngine uses, and it is what makes the awkward cases
// come out right without being special-cased:
//
//   C# major   degree 3 -> letter E, wants pitch class 5  -> E#   (not F)
//   Ab major   degree 3 -> letter C, wants pitch class 0  -> C
//   C dim7     degree 7 -> letter B, wants pitch class 9  -> Bbb  (not A)
//   Gb7        degree 7 -> letter F, wants pitch class 4  -> Fb   (not E)
//
// A double flat on the seventh of a diminished seventh looks odd to a beginner
// and is nonetheless correct: the chord is a stack of minor thirds, so every
// degree must be a third above the last, and calling it A would make two
// degrees share the letter A.

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const BLACK_PC = new Set([1, 3, 6, 8, 10]);

/**
 * Every quality the dictionary knows, as [degree, semitones] pairs.
 *
 * `degree` is the scale degree the note occupies, which decides its letter: 1
 * is the root, 3 a third above it, 7 a seventh, 9 a ninth (a second, an octave
 * up). `semitones` is the actual distance from the root, which decides the
 * accidental. Adding a quality is one line here and needs no other change.
 *
 * Grouped the way a chord book lays a page out, and in that order.
 */
export const CHORD_QUALITIES = Object.freeze([
  // --- Triads ---------------------------------------------------------------
  { id: 'major',   label: 'Major',            suffix: '',      group: 'Triads',
    degrees: [[1, 0], [3, 4], [5, 7]] },
  { id: 'minor',   label: 'Minor',            suffix: 'm',     group: 'Triads',
    degrees: [[1, 0], [3, 3], [5, 7]] },
  { id: 'dim',     label: 'Diminished',       suffix: 'dim',   group: 'Triads',
    degrees: [[1, 0], [3, 3], [5, 6]] },
  { id: 'aug',     label: 'Augmented',        suffix: 'aug',   group: 'Triads',
    degrees: [[1, 0], [3, 4], [5, 8]] },

  // --- Suspended ------------------------------------------------------------
  { id: 'sus4',    label: 'Suspended 4th',    suffix: 'sus4',  group: 'Suspended',
    degrees: [[1, 0], [4, 5], [5, 7]] },
  { id: 'sus2',    label: 'Suspended 2nd',    suffix: 'sus2',  group: 'Suspended',
    degrees: [[1, 0], [2, 2], [5, 7]] },

  // --- Sixths ---------------------------------------------------------------
  { id: 'six',     label: 'Major 6th',        suffix: '6',     group: 'Sixths',
    degrees: [[1, 0], [3, 4], [5, 7], [6, 9]] },
  { id: 'minor6',  label: 'Minor 6th',        suffix: 'm6',    group: 'Sixths',
    degrees: [[1, 0], [3, 3], [5, 7], [6, 9]] },

  // --- Sevenths -------------------------------------------------------------
  { id: 'dom7',    label: 'Dominant 7th',     suffix: '7',     group: 'Sevenths',
    degrees: [[1, 0], [3, 4], [5, 7], [7, 10]] },
  { id: 'maj7',    label: 'Major 7th',        suffix: 'maj7',  group: 'Sevenths',
    degrees: [[1, 0], [3, 4], [5, 7], [7, 11]] },
  { id: 'min7',    label: 'Minor 7th',        suffix: 'm7',    group: 'Sevenths',
    degrees: [[1, 0], [3, 3], [5, 7], [7, 10]] },
  { id: 'minmaj7', label: 'Minor–major 7th',  suffix: 'm(maj7)', group: 'Sevenths',
    degrees: [[1, 0], [3, 3], [5, 7], [7, 11]] },
  { id: 'halfdim', label: 'Half-diminished',  suffix: 'm7♭5', group: 'Sevenths',
    degrees: [[1, 0], [3, 3], [5, 6], [7, 10]] },
  { id: 'dim7',    label: 'Diminished 7th',   suffix: 'dim7',  group: 'Sevenths',
    degrees: [[1, 0], [3, 3], [5, 6], [7, 9]] },
  { id: 'aug7',    label: 'Augmented 7th',    suffix: 'aug7',  group: 'Sevenths',
    degrees: [[1, 0], [3, 4], [5, 8], [7, 10]] },
  { id: 'dom7sus4', label: '7th suspended 4th', suffix: '7sus4', group: 'Sevenths',
    degrees: [[1, 0], [4, 5], [5, 7], [7, 10]] },

  // --- Added notes and extensions -------------------------------------------
  { id: 'add9',    label: 'Added 9th',        suffix: 'add9',  group: 'Extensions',
    degrees: [[1, 0], [3, 4], [5, 7], [9, 14]] },
  { id: 'madd9',   label: 'Minor added 9th',  suffix: 'm(add9)', group: 'Extensions',
    degrees: [[1, 0], [3, 3], [5, 7], [9, 14]] },
  { id: 'dom9',    label: 'Dominant 9th',     suffix: '9',     group: 'Extensions',
    degrees: [[1, 0], [3, 4], [5, 7], [7, 10], [9, 14]] },
  { id: 'maj9',    label: 'Major 9th',        suffix: 'maj9',  group: 'Extensions',
    degrees: [[1, 0], [3, 4], [5, 7], [7, 11], [9, 14]] },
  { id: 'min9',    label: 'Minor 9th',        suffix: 'm9',    group: 'Extensions',
    degrees: [[1, 0], [3, 3], [5, 7], [7, 10], [9, 14]] },
  { id: 'dom11',   label: 'Dominant 11th',    suffix: '11',    group: 'Extensions',
    degrees: [[1, 0], [5, 7], [7, 10], [9, 14], [11, 17]] },
  { id: 'dom13',   label: 'Dominant 13th',    suffix: '13',    group: 'Extensions',
    degrees: [[1, 0], [3, 4], [5, 7], [7, 10], [9, 14], [13, 21]] },
]);

/**
 * The roots a dictionary offers. Both spellings of each black key appear,
 * because that is the whole point of a dictionary: A flat major and G sharp
 * major sound identical and are written differently, and a player who meets
 * G sharp major on a page needs to find it under G sharp.
 */
export const CHORD_ROOTS = Object.freeze([
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
]);

/* -------------------------------------------------------------------------- *
 * Building
 * -------------------------------------------------------------------------- */

/** Parse a root name into its letter and accidental. */
export function parseRoot(name) {
  const n = String(name).trim().replace('♯', '#').replace('♭', 'b');
  const letter = n[0].toUpperCase();
  if (!(letter in LETTER_PC)) throw new RangeError(`chordDictionary: bad root "${name}"`);
  const acc = n.slice(1);
  const accidental = acc === '#' ? 1 : acc === '##' || acc === 'x' ? 2
    : acc === 'b' ? -1 : acc === 'bb' ? -2 : 0;
  return { letter, accidental };
}

/** Render a letter + accidental as a display name, using real music signs. */
export function spell(letter, accidental) {
  if (accidental === 0) return letter;
  if (accidental > 0) return letter + '♯'.repeat(accidental);
  return letter + '♭'.repeat(-accidental);
}

/** The quality record for an id, or undefined. */
export function quality(id) {
  return CHORD_QUALITIES.find((q) => q.id === id);
}

/**
 * Build one chord, correctly spelled.
 *
 * @param {string} rootName        e.g. "C", "F#", "Ab".
 * @param {string} qualityId       an id from CHORD_QUALITIES.
 * @param {Object} [opts]
 * @param {number} [opts.octave=4] scientific octave of the root.
 * @param {number} [opts.inversion=0] how many notes to lift an octave.
 * @returns {{
 *   symbol: string, rootName: string, quality: object, inversion: number,
 *   notes: { degree:number, letter:string, accidental:number, name:string,
 *            pc:number, midi:number, black:boolean }[]
 * }}
 */
export function buildChord(rootName, qualityId, opts = {}) {
  const q = quality(qualityId);
  if (!q) throw new RangeError(`chordDictionary: unknown quality "${qualityId}"`);

  const { letter: rootLetter, accidental: rootAcc } = parseRoot(rootName);
  const octave = opts.octave ?? 4;
  const inversion = Math.max(0, Math.min(opts.inversion ?? 0, q.degrees.length - 1));

  const rootIdx = LETTERS.indexOf(rootLetter);
  const rootPc = (((LETTER_PC[rootLetter] + rootAcc) % 12) + 12) % 12;
  const rootMidi = LETTER_PC[rootLetter] + rootAcc + 12 * (octave + 1);

  let notes = q.degrees.map(([degree, semitones]) => {
    // The DEGREE picks the letter: a 3rd above C is an E of some kind, a 9th is
    // a D of some kind. Degrees above 7 wrap to the same letter an octave up.
    const letterOffset = degree - 1;
    const letter = LETTERS[(rootIdx + letterOffset) % 7];
    const pc = (((rootPc + semitones) % 12) + 12) % 12;
    // The OFFSET then decides the accidental: the signed distance from that
    // letter's natural pitch to the pitch the chord actually wants.
    let accidental = pc - LETTER_PC[letter];
    if (accidental > 6) accidental -= 12;
    if (accidental < -6) accidental += 12;
    return {
      degree,
      letter,
      accidental,
      name: spell(letter, accidental),
      pc,
      midi: rootMidi + semitones,
      black: BLACK_PC.has(pc),
    };
  });

  // An inversion lifts the lowest notes an octave, one at a time, so the chord
  // keeps its identity and changes only which note is in the bass.
  for (let i = 0; i < inversion; i++) notes[i] = { ...notes[i], midi: notes[i].midi + 12 };
  notes = notes.slice().sort((a, b) => a.midi - b.midi);

  return {
    symbol: spell(rootLetter, rootAcc) + q.suffix,
    rootName: spell(rootLetter, rootAcc),
    quality: q,
    inversion,
    notes,
  };
}

/** How many inversions a quality has (root position counts as one). */
export function inversionCount(qualityId) {
  const q = quality(qualityId);
  return q ? q.degrees.length : 1;
}

/** Display name for an inversion index. */
export function inversionLabel(i) {
  return ['Root position', '1st inversion', '2nd inversion', '3rd inversion',
    '4th inversion', '5th inversion'][i] ?? `Inversion ${i}`;
}

/** The qualities grouped in book order, for laying out a page. */
export function qualityGroups() {
  const out = [];
  for (const q of CHORD_QUALITIES) {
    let g = out.find((x) => x.group === q.group);
    if (!g) { g = { group: q.group, items: [] }; out.push(g); }
    g.items.push(q);
  }
  return out;
}

export const _internal = { LETTERS, LETTER_PC, BLACK_PC };
