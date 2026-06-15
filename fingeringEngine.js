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
//   • B major (LH): fingering 4 3 2 1 4 3 2 1 — the 4th finger anchors the
//     tonic and the 4th degree (B and F#), and the cell restarts on 4 at each
//     octave. Verified for multi-octave: it chains as 4 3 2 1 4 3 2 (repeat) … 1.
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
  B:  entry([1, 2, 3, 1, 2, 3, 4, 5], [4, 3, 2, 1, 4, 3, 2, 1], true,  true), // LH cell restarts on 4 each octave
  'F#': entry([2, 3, 4, 1, 2, 3, 1, 2], [4, 3, 2, 1, 3, 2, 1, 4], true, true),
  Db: entry([2, 3, 1, 2, 3, 4, 1, 2], [3, 2, 1, 4, 3, 2, 1, 3], true,  true),
  Ab: entry([3, 4, 1, 2, 3, 1, 2, 3], [3, 2, 1, 4, 3, 2, 1, 3], true,  true),
  Eb: entry([3, 1, 2, 3, 4, 1, 2, 3], [3, 2, 1, 4, 3, 2, 1, 3], true,  true),
  Bb: entry([4, 1, 2, 3, 1, 2, 3, 4], [3, 2, 1, 4, 3, 2, 1, 3], true,  true),
  // Enharmonic spellings share the physical fingering of their twin.
  Gb: entry([2, 3, 4, 1, 2, 3, 1, 2], [4, 3, 2, 1, 3, 2, 1, 4], true,  true),
});

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
 * RIGHT HAND, and LEFT HAND scales whose first finger recurs each octave
 * (e.g. B major LH = 4 3 2 1 4 3 2 1): the single-octave cell minus its top
 * note repeats once per octave, then the final top note caps the sequence.
 * For B major LH that yields 4 3 2 1 4 3 2 · 4 3 2 1 4 3 2 · 1 (ends on 1).
 *
 * LEFT HAND scales that begin on the pinky (C/G/D/A/E/F LH start on 5): the 5
 * is a bottom-only finger used exactly once; every octave above reuses the
 * inner run, whose last value is the internal-tonic finger.
 *
 * @param {readonly number[]} p  8-finger single-octave pattern.
 * @param {'RH'|'LH'} hand
 * @param {number} octaves
 * @returns {number[]}
 */
function chainFingers(p, hand, octaves) {
  const out = [];
  const pinkyStart = hand === 'LH' && p[0] === 5;

  if (!pinkyStart) {
    // Cell-restart: repeat the octave cell (minus its shared top), then cap.
    // Used by every RH scale and by LH scales like B major that re-anchor the
    // first finger at each octave boundary.
    for (let o = 0; o < octaves; o++) out.push(...p.slice(0, 7));
    out.push(p[7]);
  } else {
    // Pinky-once: the bottom 5 is played a single time; octaves above reuse the
    // inner run p[1..7], ending each octave on the internal-tonic finger.
    out.push(p[0]);
    for (let o = 0; o < octaves; o++) out.push(...p.slice(1, 8));
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
export const _internal = { MAJOR_FINGERINGS, chainFingers };
