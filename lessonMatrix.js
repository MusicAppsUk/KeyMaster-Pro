// lessonMatrix.js
//
// THE SCALABLE 10× LESSON MATRIX ENGINE.
//
// A configuration-driven curriculum: a small set of TIER specs is expanded into
// a flat, sequential array of lesson objects (Lesson 1.1 … 10.8 → 80 modules).
// The structure is deliberately data-first so the curriculum can grow to any
// size by editing CURRICULUM alone — no UI or engine code needs to change.
//
// Each lesson object exposes the fields the spec calls for:
//   id            'T.S'      e.g. '1.1' … '10.8'
//   number        1-based global sequence number (1 … 80)
//   tier / sub    coordinates within the matrix
//   title         human-readable label for the menu
//   clef          'treble' | 'bass' | 'grand'        (Clef Focus)
//   range         { low, high }  note-name span      (Pitch Range / Note Span)
//   accidentals   'natural' | 'sharps' | 'flats'     (Key Signature State)
//   stage         1 | 2 | 3                           (Target Stage)
//   cfg           a generator config consumable by exerciseGenerator
//                 (pool, maxStep, maxDirChanges, length) — drives Stage 1.
//
// Stage 1 (Recognition) lessons are fully wired to the working engine via cfg.
// Stage 2 / 3 lessons carry the same data so their menus render today; their
// playback modes are placeholders for now.

import { whiteKeyPool } from './exerciseGenerator.js';

const SUBS_PER_TIER = 8;

// Progressive accidental order (reading-method convention).
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G'];

// Widening pitch-span ladders per clef. Eight inclusive [low, high] white-key
// ranges that grow from a five-note hand position to roughly two octaves.
// Treble ranges stay ≥ C4 (MIDI 60); bass ranges stay ≤ B3; grand crosses C4.
const RANGE_LADDER = {
  treble: [
    ['C4', 'G4'], ['C4', 'A4'], ['C4', 'C5'], ['C4', 'E5'],
    ['C4', 'G5'], ['C4', 'B5'], ['C4', 'C6'], ['A4', 'E6'],
  ],
  bass: [
    ['C3', 'G3'], ['C3', 'A3'], ['C3', 'B3'], ['A2', 'B3'],
    ['G2', 'B3'], ['F2', 'B3'], ['D2', 'B3'], ['C2', 'B3'],
  ],
  grand: [
    ['G3', 'D4'], ['F3', 'E4'], ['E3', 'F4'], ['C3', 'G4'],
    ['C3', 'C5'], ['A2', 'E5'], ['F2', 'G5'], ['C2', 'C6'],
  ],
};

// The curriculum. Ten tiers, three difficulty stages. Editing this array is the
// ONLY thing required to reshape or extend the entire progression.
const CURRICULUM = [
  { tier: 1,  clef: 'treble', accidentals: 'natural', stage: 1, title: 'Treble Foundations' },
  { tier: 2,  clef: 'bass',   accidentals: 'natural', stage: 1, title: 'Bass Foundations' },
  { tier: 3,  clef: 'grand',  accidentals: 'natural', stage: 1, title: 'Grand Staff Crossings' },
  { tier: 4,  clef: 'treble', accidentals: 'sharps',  stage: 2, title: 'Treble — Sharps' },
  { tier: 5,  clef: 'bass',   accidentals: 'sharps',  stage: 2, title: 'Bass — Sharps' },
  { tier: 6,  clef: 'grand',  accidentals: 'sharps',  stage: 2, title: 'Grand Staff — Sharps' },
  { tier: 7,  clef: 'treble', accidentals: 'flats',   stage: 2, title: 'Treble — Flats' },
  { tier: 8,  clef: 'bass',   accidentals: 'flats',   stage: 3, title: 'Bass — Flats' },
  { tier: 9,  clef: 'grand',  accidentals: 'flats',   stage: 3, title: 'Grand Staff — Flats' },
  { tier: 10, clef: 'grand',  accidentals: 'flats',   stage: 3, title: 'Full-Range Mastery' },
];

const CLEF_LABEL = { treble: 'Treble', bass: 'Bass', grand: 'Grand Staff' };

/** Swap the given letters to a sharp/flat across every octave of a pool. */
function applyAccidentals(pool, letters, acc) {
  if (!letters.length) return pool;
  return pool.map((n) => (letters.includes(n[0]) ? `${n[0]}${acc}${n.slice(1)}` : n));
}

/** How many accidentals are active at a given sub-lesson (progressive intro). */
function accidentalsAt(kind, sub) {
  if (kind === 'sharps') return SHARP_ORDER.slice(0, Math.min(sub, SHARP_ORDER.length));
  if (kind === 'flats') return FLAT_ORDER.slice(0, Math.min(sub, FLAT_ORDER.length));
  return [];
}

function describeSpan(lo, hi, count) {
  return `${lo}–${hi} · ${count} notes`;
}

// Governance_Tag — the primary learning outcome each lesson serves. Tagging every
// entry keeps the curriculum mapped to the four core outcomes and prevents drift.
//   Keyboard Geography     — spatial mapping within a fixed hand position
//   Reading Fluency        — recognising notes across a widening natural span
//   Harmonic Understanding — sharps / flats / key-signature awareness
//   Performance Continuity — grand-staff coordination across both hands
function governanceFor(spec, sub) {
  if (spec.accidentals !== 'natural') return 'Harmonic Understanding';
  if (spec.clef === 'grand') return 'Performance Continuity';
  return sub <= 3 ? 'Keyboard Geography' : 'Reading Fluency';
}

/** Build one lesson object (with its generator cfg) for a tier + sub-lesson. */
function buildLesson(spec, sub, number) {
  const [low, high] = RANGE_LADDER[spec.clef][sub - 1];
  const white = whiteKeyPool(low, high);
  const sharps = spec.accidentals === 'sharps' ? accidentalsAt('sharps', sub) : [];
  const flats = spec.accidentals === 'flats' ? accidentalsAt('flats', sub) : [];
  let pool = white;
  pool = applyAccidentals(pool, sharps, '#');
  pool = applyAccidentals(pool, flats, 'b');

  // Difficulty knobs scale gently with the sub-lesson index.
  const length = Math.min(4 + sub, 10);
  const maxStep = sub <= 3 ? 2 : 3;
  const maxDirChanges = sub <= 2 ? 1 : sub <= 5 ? 2 : 3;

  const accLabel =
    spec.accidentals === 'natural'
      ? 'naturals'
      : `${(sharps.length || flats.length)} ${spec.accidentals === 'sharps' ? '♯' : '♭'}`;

  const title = `${CLEF_LABEL[spec.clef]} · ${describeSpan(low, high, length)}${
    spec.accidentals === 'natural' ? '' : ` · ${accLabel}`
  }`;

  return {
    id: `${spec.tier}.${sub}`,
    number,
    tier: spec.tier,
    sub,
    title,
    tierTitle: spec.title,
    clef: spec.clef,
    range: { low, high },
    accidentals: spec.accidentals,
    stage: spec.stage,
    governance: governanceFor(spec, sub),
    cfg: { level: number, name: title, pool, maxStep, maxDirChanges, length },
  };
}

/**
 * Build (and memoise) the full flat lesson matrix.
 * @returns {Array<object>} 80 sequential lesson objects.
 */
let _matrix = null;
export function buildLessonMatrix() {
  if (_matrix) return _matrix;
  const out = [];
  let number = 0;
  for (const spec of CURRICULUM) {
    for (let sub = 1; sub <= SUBS_PER_TIER; sub++) {
      number += 1;
      out.push(buildLesson(spec, sub, number));
    }
  }
  _matrix = out;
  return out;
}

/** All lessons whose Target Stage is `stage`, in curriculum order. */
export function lessonsForStage(stage) {
  return buildLessonMatrix().filter((l) => l.stage === stage);
}

/** Lessons for a stage grouped by tier → [{ tier, title, lessons[] }]. */
export function tiersForStage(stage) {
  const groups = new Map();
  for (const l of lessonsForStage(stage)) {
    if (!groups.has(l.tier)) groups.set(l.tier, { tier: l.tier, title: l.tierTitle, lessons: [] });
    groups.get(l.tier).lessons.push(l);
  }
  return [...groups.values()];
}

export function lessonById(id) {
  return buildLessonMatrix().find((l) => l.id === id) || null;
}

export const STAGE_COUNT = 3;
export const TOTAL_LESSONS = SUBS_PER_TIER * CURRICULUM.length;
