// chordEngine.js
//
// Pure chord theory for the Chord Masterclass. No DOM, no audio, no input — it
// maps a (root, quality, inversion, hand) request to concrete MIDI notes in a
// comfortable register, plus LIGHT "recommended" outer-finger anchors.
//
// Philosophy (per spec): chords are physical keyboard SHAPES, not spelling
// drills. Fingering is "Recommended", never "Correct" — we surface only the
// outer thumb/pinky anchors and leave the inner notes free.
//
// Stage-1 scope uses major/minor only; dim/aug are defined here for later stages
// but the controller's selector limits what the user can pick.

export const QUALITIES = {
  major: { intervals: [0, 4, 7], suffix: '' },
  minor: { intervals: [0, 3, 7], suffix: 'm' },
  dim:   { intervals: [0, 3, 6], suffix: 'dim' },
  aug:   { intervals: [0, 4, 8], suffix: 'aug' },
};

export const INVERSIONS = [
  ['root',   'Root position'],
  ['first',  '1st inversion'],
  ['second', '2nd inversion'],
];

// Comfortable lowest-note floor per hand; the chord's BASS note sits at/above it.
// LH floor is B2 (47), the bottom line of the bass staff: this keeps left-hand
// root-position chords reading inside the bass clef rather than poking above
// middle C. (rc2-42: was C3/48, which placed LH B-major root on B3 with D#4/F#4
// spilling above middle C — and left root position sitting higher than its own
// inversions. B2 floor moves only B's LH root: B3·D#4·F#4 -> B2·D#3·F#3, matching
// the Scales LH B register; every other root and all of RH are unchanged.)
const HAND_FLOOR = { RH: 60, LH: 47 }; // C4 / B2

/**
 * Rotate a root-position triad to an inversion, keeping the stack ascending by
 * lifting any wrapped tone an octave. Returns ascending semitone offsets from
 * the chord root (offsets[0] is the bass of the chosen inversion).
 */
function invertOffsets(intervals, inversion) {
  const start = inversion === 'first' ? 1 : inversion === 'second' ? 2 : 0;
  const out = [];
  for (let k = 0; k < intervals.length; k++) {
    let v = intervals[(start + k) % intervals.length];
    while (out.length && v <= out[out.length - 1]) v += 12; // keep strictly ascending
    out.push(v);
  }
  return out;
}

/**
 * Build a chord voicing.
 * @param {{rootPc:number, quality?:string, inversion?:string, hand?:string}} req
 * @returns {{midis:number[], rootMidi:number, bassPc:number, rootPc:number,
 *            quality:string, inversion:string, hand:string}}
 *   midis are ascending (low→high). rootMidi is the sounding root within the voicing.
 */
export function buildChord({ rootPc, quality = 'major', inversion = 'root', hand = 'RH' }) {
  const q = QUALITIES[quality] || QUALITIES.major;
  const offs = invertOffsets(q.intervals, inversion);
  const pc = ((rootPc % 12) + 12) % 12;
  const bassPc = (pc + offs[0]) % 12;
  const floor = HAND_FLOOR[hand] ?? 60;
  const bass = floor + (((bassPc - (floor % 12)) % 12) + 12) % 12; // lowest midi ≥ floor with bassPc
  const base = offs[0];
  const midis = offs.map((o) => bass + (o - base));
  // The sounding root is the chord tone whose pitch-class equals the root pc.
  const rootMidi = midis.find((m) => ((m % 12) + 12) % 12 === pc) ?? midis[0];
  return { midis, rootMidi, bassPc, rootPc: pc, quality, inversion, hand };
}

/**
 * Light outer-anchor fingering only (philosophy: "Recommended", not "Correct").
 *   RH: thumb (1) on the lowest tone, 5 on the highest, inner notes blank.
 *   LH: 5 on the lowest tone, 1 on the highest, inner notes blank.
 * @returns {(number|null)[]} same length as midis
 */
export function recommendedFingering(midis, hand) {
  const f = midis.map(() => null);
  if (!f.length) return f;
  if (hand === 'LH') { f[0] = 5; f[f.length - 1] = 1; }
  else { f[0] = 1; f[f.length - 1] = 5; }
  return f;
}

/** Lead-sheet symbol, e.g. ("C","major") → "C", ("C","minor") → "Cm". */
export function chordSymbol(rootName, quality) {
  return `${rootName}${(QUALITIES[quality] || QUALITIES.major).suffix}`;
}
