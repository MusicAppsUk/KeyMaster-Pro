// fingeringEngine.js
//
// ============================================================================
// FINGERING CURRICULUM ENGINE
// ============================================================================
//
// Maps a built scale to a sequence of { midi, degree, finger } records for each
// hand, across one or more octaves, ascending or descending.
//
// WHY A TABLE, NOT A FORMULA
// Standard scale fingerings are conventions refined over centuries, not values
// you can derive from a parallel rule. An earlier draft of the KeyMaster spec
// tried to derive them and produced an inverted rule (see note below). This
// engine instead encodes the established method-book fingerings as explicit,
// reviewable data. Each entry is one octave, tonic-to-tonic (8 fingers).
//
// ----------------------------------------------------------------------------
// LEFT-HAND 4TH-FINGER PEDAGOGY  (corrected from the original spec)
// ----------------------------------------------------------------------------
// The original spec stated the LH 4th finger is "reserved for the B scale
// family and must never be used in other sharp major scales." That is the
// reverse of standard practice, and implementing it literally would teach wrong
// fingerings for the five most foundational scales. The correct picture:
//
//   • C, G, D, A, E, F major (LH): fingering 5 4 3 2 1 3 2 1. The 4th finger
//     plays the 2ND scale degree — i.e. it is used in EVERY one of these scales,
//     routinely. It is not reserved or avoided.
//
//   • Db, Ab, Eb, Bb major (LH): fingering 3 2 1 4 3 2 1 3. Here the 4th finger
//     plays the 4TH scale degree, which lands on the black-key anchor of each
//     scale (Gb / Db / Ab / Eb respectively). This is the real "topography
//     anchor" the spec was reaching for — but it lives in the FLAT keys.
//
//   • B major (LH): one-octave fingering 4 3 2 1 4 3 2 1 — the 4th finger anchors
//     the bottom tonic and the 4th degree (B and F#); the octave tonic is the thumb
//     (1). For multi-octave the bottom 4 is played ONCE and interior octave tonics
//     take the thumb, like every other LH major: e.g. two octaves chain as
//     4 3 2 1 4 3 2 1 3 2 1 4 3 2 1 (the interior B is 1, not a re-anchor on 4).
//     B is a special case, but not in the way the original spec described, and
//     it does not change how the other scales are fingered.
//
// In short: the LH 4th finger is used in essentially every major scale; what
// varies is which degree it lands on. The data below reflects that.
// ----------------------------------------------------------------------------

import { buildScale } from './scaleEngine.js';

/**
 * One-octave fingerings (ascending, tonic→octave, 8 entries) for all 12 major
 * keys, both hands. Keyed by the canonical tonic display name.
 *
 * `chainable` indicates whether the multi-octave join rule reproduces the
 * canonical method-book fingering for that hand. When false, multi-octave
 * requests are capped to one octave and flagged, so the engine never emits a
 * confidently-wrong fingering. (All 12 majors are currently chainable in both
 * hands; the flag remains as a guard for any future scale whose join isn't yet
 * verified.)
 */
const MAJOR_FINGERINGS = Object.freeze({
  //          RH ascending            LH ascending            RH chain  LH chain
  C:  entry([1, 2, 3, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 3, 2, 1], true,  true),
  G:  entry([1, 2, 3, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 3, 2, 1], true,  true),
  D:  entry([1, 2, 3, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 3, 2, 1], true,  true),
  A:  entry([1, 2, 3, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 3, 2, 1], true,  true),
  E:  entry([1, 2, 3, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 3, 2, 1], true,  true),
  F:  entry([1, 2, 3, 4, 1, 2, 3, 4], [5, 4, 3, 2, 1, 3, 2, 1], true,  true),
  B:  entry([1, 2, 3, 1, 2, 3, 4, 5], [4, 3, 2, 1, 4, 3, 2, 1], true,  true), // LH: 4 anchors the bottom tonic once; interior octave tonics are the thumb (1)
  'F#': entry([2, 3, 4, 1, 2, 3, 1, 2], [4, 3, 2, 1, 3, 2, 1, 4], true, true),
  Db: entry([2, 3, 1, 2, 3, 4, 1, 2], [3, 2, 1, 4, 3, 2, 1, 3], true,  true),
  Ab: entry([3, 4, 1, 2, 3, 1, 2, 3], [3, 2, 1, 4, 3, 2, 1, 3], true,  true),
  Eb: entry([3, 1, 2, 3, 4, 1, 2, 3], [3, 2, 1, 4, 3, 2, 1, 3], true,  true),
  Bb: entry([4, 1, 2, 3, 1, 2, 3, 4], [3, 2, 1, 4, 3, 2, 1, 3], true,  true),
  // Enharmonic spellings share the physical fingering of their twin.
  Gb: entry([2, 3, 4, 1, 2, 3, 1, 2], [4, 3, 2, 1, 3, 2, 1, 4], true,  true),
});

/**
 * HARMONIC MINOR FINGERINGS — rc2-221.
 *
 * Harmonic minor is the minor form the standard scale manuals teach, so this
 * table covers all twelve keys in their conventional minor spellings (D sharp
 * minor is written as E flat minor, as the books do).
 *
 * HOW THESE WERE PRODUCED — this matters, so it is recorded here rather than in
 * a commit message. They were NOT written from memory. An earlier hand-written
 * draft got the left hand wrong, which is exactly the sort of error that teaches
 * a habit a learner then has to unlearn. Instead `tools/derive-fingering.mjs`
 * derives them from four rules:
 *
 *   R1  the thumb plays only white keys;
 *   R2  thumbs fall twice per octave, splitting the seven degrees 3 + 4;
 *   R3  of the legal splits, the right hand takes the earliest and the left hand
 *       the one anchored on the tonic (or the latest, if the tonic is black);
 *   R4  the thumb is each hand's inner edge, so the outermost note of the scale
 *       — the top for the right hand, the bottom for the left — is never a thumb.
 *
 * That tool then PROVES the rules by regenerating all 13 major keys x 2 hands
 * already verified above. It reproduces 26 of 26 exactly, and its multi-octave
 * join agrees with a first-principles derivation at 2, 3 and 4 octaves. If a
 * single pattern failed, the tool exits non-zero and no minor fingering ships.
 *
 * STATUS, AND WHAT THE LEARNER SEES
 *   'verified'  checked against a method book. Shown with no caveat.
 *   'derived'   rule-engine output, gate-passed. Shown WITH a one-line note
 *               saying it has not been book-checked yet.
 *   'none'      no candidate at all. Notes only, no finger numbers.
 *
 * Promoting a key to 'verified' is a one-word edit once it has been checked.
 * The two keys worth checking first are E flat and B flat minor: the no-thumb-
 * on-black-key rule leaves them exactly one legal split, where some editions
 * relax the rule instead.
 *
 * TABLE BELOW IS MACHINE-GENERATED — regenerate with:
 *   node tools/derive-fingering.mjs --js
 */
const HARMONIC_MINOR_FINGERINGS = Object.freeze({
  //          RH ascending                LH ascending             chain  status
  A:    minorEntry([1, 2, 3, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 3, 2, 1], true, 'derived'), // A B C D E F G#
  E:    minorEntry([1, 2, 3, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 3, 2, 1], true, 'derived'), // E F# G A B C D#
  B:    minorEntry([1, 2, 3, 1, 2, 3, 4, 5], [4, 3, 2, 1, 4, 3, 2, 1], true, 'derived'), // B C# D E F# G A#
  'F#': minorEntry([3, 4, 1, 2, 3, 1, 2, 3], [4, 3, 2, 1, 3, 2, 1, 4], true, 'derived'), // F# G# A B C# D E#
  'C#': minorEntry([3, 4, 1, 2, 3, 1, 2, 3], [3, 2, 1, 4, 3, 2, 1, 3], true, 'derived'), // C# D# E F# G# A B#
  'G#': minorEntry([3, 4, 1, 2, 3, 1, 2, 3], [3, 2, 1, 4, 3, 2, 1, 3], true, 'derived'), // G# A# B C# D# E Fx
  'Eb': minorEntry([3, 1, 2, 3, 4, 1, 2, 3], [2, 1, 4, 3, 2, 1, 3, 2], true, 'derived'), // Eb F Gb Ab Bb Cb D
  'Bb': minorEntry([4, 1, 2, 3, 1, 2, 3, 4], [2, 1, 3, 2, 1, 4, 3, 2], true, 'derived'), // Bb C Db Eb F Gb A
  F:    minorEntry([1, 2, 3, 4, 1, 2, 3, 4], [5, 4, 3, 2, 1, 3, 2, 1], true, 'derived'), // F G Ab Bb C Db E
  C:    minorEntry([1, 2, 3, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 3, 2, 1], true, 'derived'), // C D Eb F G Ab B
  G:    minorEntry([1, 2, 3, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 3, 2, 1], true, 'derived'), // G A Bb C D Eb F#
  D:    minorEntry([1, 2, 3, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 3, 2, 1], true, 'derived'), // D E F G A Bb C#
});

/** The twelve minor keys in the spellings the scale manuals use, book order. */
export const MINOR_KEY_ORDER = Object.freeze(
  ['A', 'E', 'B', 'F#', 'C#', 'G#', 'Eb', 'Bb', 'F', 'C', 'G', 'D'],
);

/** Normalised entry for a minor-scale fingering, carrying its own status. */
function minorEntry(rh, lh, chainable, status) {
  return Object.freeze({
    RH: rh ? Object.freeze(rh.slice()) : null,
    LH: lh ? Object.freeze(lh.slice()) : null,
    chainable: Object.freeze({ RH: chainable, LH: chainable }),
    status: status || 'none',
  });
}

/** Normalised entry shape. */
function entry(rh, lh, rhChainable, lhChainable) {
  return Object.freeze({
    RH: Object.freeze(rh.slice()),
    LH: Object.freeze(lh.slice()),
    chainable: Object.freeze({ RH: rhChainable, LH: lhChainable }),
  });
}

/**
 * @typedef {Object} FingeredNote
 * @property {number} midi
 * @property {number} degree   1-based scale degree (octave tonic repeats as 1).
 * @property {number} finger   1–5.
 */

/**
 * @typedef {Object} FingeringResult
 * @property {'RH'|'LH'} hand
 * @property {FingeredNote[]} notes
 * @property {boolean} reviewed   false if capped/uncertain (see `note`).
 * @property {string} [note]      Human-readable caveat when not fully reviewed.
 */

/**
 * Produce fingering for a major scale.
 * @param {string} tonicName   Canonical tonic, e.g. "Eb", "F#".
 * @param {'RH'|'LH'} hand
 * @param {Object} [opts]
 * @param {number} [opts.octaves=1]
 * @param {number} [opts.startOctave=4]   Scientific octave of the low tonic.
 * @param {boolean} [opts.descending=false]
 * @returns {FingeringResult}
 */
export function majorFingering(tonicName, hand, opts = {}) {
  const key = canonicalTonic(tonicName);
  const record = MAJOR_FINGERINGS[key];
  if (!record) {
    throw new RangeError(`majorFingering: no fingering table for "${tonicName}"`);
  }
  if (hand !== 'RH' && hand !== 'LH') {
    throw new RangeError(`majorFingering: hand must be 'RH' or 'LH', got "${hand}"`);
  }

  const octaves = Math.max(1, opts.octaves ?? 1);
  const startOctave = opts.startOctave ?? 4;
  const pattern = record[hand]; // 8 fingers, tonic→octave

  // MIDI for each scale degree across the requested octave span.
  const scale = buildScale(parseTonic(key), 'major');
  const midis = [];
  for (let o = 0; o < octaves; o++) {
    const octaveMidis = scale.midiAt(startOctave + o);
    midis.push(...octaveMidis); // 7 notes (degrees 1–7) per octave
  }
  // Append the final top tonic.
  midis.push(scale.midiAt(startOctave + octaves)[0]);

  // Build fingers to match midis length.
  let fingers;
  let reviewed = true;
  let note;

  if (octaves === 1) {
    fingers = pattern.slice(); // exact, authoritative
  } else if (record.chainable[hand]) {
    fingers = chainFingers(pattern, hand, octaves);
  } else {
    // Don't emit a guessed multi-octave fingering for an irregular key.
    fingers = pattern.slice();
    midis.length = pattern.length; // cap to one octave
    reviewed = false;
    note =
      `${key} major (${hand}) has an irregular multi-octave fingering not yet ` +
      `in the reviewed table; returning a single octave. Verify against a method ` +
      `book before extending.`;
  }

  const notes = midis.map((midi, i) => ({
    midi,
    degree: (i % 7) + 1,
    finger: fingers[i],
  }));

  const result = { hand, notes, reviewed };
  if (note) result.note = note;

  if (opts.descending) result.notes.reverse();
  return result;
}

/**
 * Multi-octave join.
 *
 * RIGHT HAND: cell-restart — the single-octave cell minus its shared top tonic
 * repeats once per octave, then the final top note caps the sequence. RH boundary
 * tonics are the thumb by construction.
 *
 * LEFT HAND (all majors): the bottom note plays the leading finger ONCE; every
 * octave above reuses the inner run p[1..7], whose last value is the internal-tonic
 * finger. So interior octave-boundary tonics are the thumb-side finger — e.g.
 * B major LH chains as 4 3 2 1 4 3 2 · 1 · 3 2 1 4 3 2 1 (the octave B is the thumb,
 * 1, not a re-anchor on 4); C/G/D/A/E/F LH likewise play their bottom 5 only once.
 *
 * @param {readonly number[]} p  8-finger single-octave pattern.
 * @param {'RH'|'LH'} hand
 * @param {number} octaves
 * @returns {number[]}
 */
function chainFingers(p, hand, octaves) {
  const out = [];
  if (hand === 'LH') {
    // LEFT HAND: the bottom note plays the leading finger ONCE; every octave above
    // reuses the inner run p[1..7], whose final value is the internal-tonic finger.
    // So an interior octave-boundary tonic takes the THUMB-side finger (e.g. B major
    // LH boundary = 1), never a spurious re-anchor on the bottom finger. This applies
    // to ALL LH majors: the pinky-start scales (C/G/D/A/E/F) already worked this way;
    // B major LH (which starts on 4, not 5) needs the same rule — its earlier
    // cell-restart wrongly re-anchored the octave tonic on 4 instead of the thumb.
    out.push(p[0]);
    for (let o = 0; o < octaves; o++) out.push(...p.slice(1, 8));
  } else {
    // RIGHT HAND: cell-restart — repeat the octave cell (minus its shared top tonic)
    // then cap with the top note. RH boundary tonics are the thumb by construction,
    // so this is correct for every RH major.
    for (let o = 0; o < octaves; o++) out.push(...p.slice(0, 7));
    out.push(p[7]);
  }
  return out;
}

/* --------------------------------------------------------------------------- *
 * Tonic name handling
 * --------------------------------------------------------------------------- */

/** Map assorted inputs to the canonical table key. */
function canonicalTonic(name) {
  const n = String(name).trim();
  const norm = n.charAt(0).toUpperCase() + n.slice(1);
  // Accept unicode accidentals and ASCII.
  return norm.replace('♯', '#').replace('♭', 'b');
}

/** Turn a canonical tonic string into a {letter, accidental} for scaleEngine. */
function parseTonic(name) {
  const letter = name[0].toUpperCase();
  const acc = name.slice(1);
  const accidental = acc === '#' ? 1 : acc === 'b' ? -1 : acc === 'x' ? 2 : acc === 'bb' ? -2 : 0;
  return { letter, accidental };
}

/** Exposed for tests / tooling. */
/**
 * Produce fingering for a HARMONIC MINOR scale.
 *
 * Contract difference from majorFingering: the result carries a `status` of
 * 'verified', 'derived' or 'none'.
 *
 *   'verified' — book-checked. `reviewed: true`, no note.
 *   'derived'  — produced by the gate-passing rule engine. Fingers ARE returned,
 *                `reviewed: false`, and `note` says plainly that it has not been
 *                book-checked. Callers should show the fingering AND the note.
 *   'none'     — no candidate. `finger: null` throughout, notes only.
 *
 * @param {string} tonicName   Canonical tonic, e.g. "A", "F#".
 * @param {'RH'|'LH'} hand
 * @param {Object} [opts]      Same options as majorFingering.
 * @returns {FingeringResult & { status: 'verified'|'derived'|'none' }}
 */
export function harmonicMinorFingering(tonicName, hand, opts = {}) {
  const key = canonicalTonic(tonicName);
  const record = HARMONIC_MINOR_FINGERINGS[key];
  if (hand !== 'RH' && hand !== 'LH') {
    throw new RangeError(`harmonicMinorFingering: hand must be 'RH' or 'LH', got "${hand}"`);
  }

  const octaves = Math.max(1, opts.octaves ?? 1);
  const startOctave = opts.startOctave ?? 4;
  const scale = buildScale(parseTonic(key), 'harmonic_minor');

  const midis = [];
  for (let o = 0; o < octaves; o++) midis.push(...scale.midiAt(startOctave + o));
  midis.push(scale.midiAt(startOctave + octaves)[0]);

  const withoutFingers = (why) => {
    const notes = midis.map((midi, i) => ({ midi, degree: (i % 7) + 1, finger: null }));
    if (opts.descending) notes.reverse();
    return { hand, notes, reviewed: false, status: 'none', note: why };
  };

  if (!record || !record[hand] || record.status === 'none') {
    return withoutFingers(
      `${key} harmonic minor (${hand}) has no fingering on file yet — practising ` +
      `on notes only. The pitches are correct.`,
    );
  }

  const pattern = record[hand];
  let fingers;
  if (octaves === 1) {
    fingers = pattern.slice();
  } else if (record.chainable[hand]) {
    fingers = chainFingers(pattern, hand, octaves);
  } else {
    return withoutFingers(
      `${key} harmonic minor (${hand}) has no checked multi-octave join — ` +
      `practising on notes only.`,
    );
  }

  const notes = midis.map((midi, i) => ({ midi, degree: (i % 7) + 1, finger: fingers[i] }));
  if (opts.descending) notes.reverse();

  if (record.status === 'verified') {
    return { hand, notes, reviewed: true, status: 'verified' };
  }
  return {
    hand,
    notes,
    reviewed: false,
    status: 'derived',
    note: 'Fingering derived from the standard scale rules — not yet checked against a method book.',
  };
}

/* --------------------------------------------------------------------------- *
 * CHROMATIC — rc2-222
 * --------------------------------------------------------------------------- */

const BLACK_PC = Object.freeze(new Set([1, 3, 6, 8, 10]));
const isBlackKey = (midi) => BLACK_PC.has((((midi % 12) + 12) % 12));

/**
 * Chromatic fingering, as a rule rather than a table.
 *
 * Unlike the diatonic scales, the chromatic fingering is a property of the
 * KEYBOARD, not of the key: the finger a note takes depends only on whether it
 * and its neighbour are black or white, so it is identical from all twelve
 * starting notes. Storing twelve tables of thirteen numbers would be twelve
 * chances to mistype the same fact.
 *
 * The rules:
 *   R1  every black key takes the 3rd finger;
 *   R2  every white key takes the thumb — except where two white keys are
 *       adjacent, which in a chromatic scale happens only at E-F and B-C. That
 *       pair cannot take the thumb twice running, so one of them takes the 2nd;
 *   R3  which one is decided by the hand. The thumb is each hand's inner edge,
 *       so the RIGHT hand gives the 2nd finger to the UPPER note of the pair and
 *       the LEFT hand to the LOWER one;
 *   R4  the first note of the scale has nothing before it and the last has
 *       nothing after it, so a white note at either end simply takes the thumb.
 *
 * Starting on C this produces the familiar
 *   RH  1 3 1 3 1 2 3 1 3 1 3 1 2
 *   LH  1 3 1 3 2 1 3 1 3 1 3 2 1
 * and the same shape, rotated, from every other note.
 *
 * @param {string} tonicName   Starting note, e.g. "C", "Eb", "F#".
 * @param {'RH'|'LH'} hand
 * @param {Object} [opts]      { octaves, startOctave, descending }
 * @returns {FingeringResult & { status: 'derived' }}
 */
export function chromaticFingering(tonicName, hand, opts = {}) {
  const key = canonicalTonic(tonicName);
  if (hand !== 'RH' && hand !== 'LH') {
    throw new RangeError(`chromaticFingering: hand must be 'RH' or 'LH', got "${hand}"`);
  }
  const octaves = Math.max(1, opts.octaves ?? 1);
  const startOctave = opts.startOctave ?? 4;
  const scale = buildScale(parseTonic(key), 'chromatic');

  const midis = [];
  for (let o = 0; o < octaves; o++) midis.push(...scale.midiAt(startOctave + o));
  midis.push(scale.midiAt(startOctave + octaves)[0]);

  const fingers = chromaticFingers(midis, hand);
  const notes = midis.map((midi, i) => ({ midi, degree: (i % 12) + 1, finger: fingers[i] }));
  if (opts.descending) notes.reverse();

  return {
    hand,
    notes,
    reviewed: false,
    status: 'derived',
    note: 'Fingering derived from the standard scale rules — not yet checked against a method book.',
  };
}

/**
 * The rule itself, split out so tooling can exercise it directly.
 * @param {number[]} midis  Consecutive semitones, ascending.
 * @param {'RH'|'LH'} hand
 * @returns {number[]}
 */
function chromaticFingers(midis, hand) {
  return midis.map((m, i) => {
    if (isBlackKey(m)) return 3;                                  // R1
    if (hand === 'RH') {
      const prev = midis[i - 1];                                  // R3 / R4
      return (prev != null && !isBlackKey(prev)) ? 2 : 1;
    }
    const next = midis[i + 1];
    return (next != null && !isBlackKey(next)) ? 2 : 1;
  });
}

/** Review state of every harmonic-minor key, for tooling and check sheets. */
export function harmonicMinorStatus() {
  const out = {};
  for (const [k, r] of Object.entries(HARMONIC_MINOR_FINGERINGS)) out[k] = r.status;
  return out;
}

/** Which harmonic-minor keys have been checked against a method book. */
export function verifiedHarmonicMinorKeys() {
  return Object.entries(HARMONIC_MINOR_FINGERINGS)
    .filter(([, r]) => r.status === 'verified' && r.RH && r.LH)
    .map(([k]) => k);
}

export const _internal = { MAJOR_FINGERINGS, HARMONIC_MINOR_FINGERINGS, chainFingers, chromaticFingers, isBlackKey };
