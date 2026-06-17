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

// ── Tier 1 Cognitive Sight-Reading — beginner-first recognition pathway ──────
// Sequenced for a genuine beginner under the canonical "Recognition before
// Execution" principle. The reading eye is built ENTIRELY inside the fixed
// C4–G4 five-note frame across Stages 1–5 (lessons 1–14): note position →
// steps → contour/shape → skips → intervals, growing only ONE cfg knob at a
// time (length, then direction changes, then interval reach). Register only
// widens in Stage 6 (lessons 15–17), and the FIRST ledger line is deliberately
// withheld until lesson 17; the register shift is the very last lesson (19).
// Pure curriculum data — no engine/generator change. Tiers 2–10 are UNCHANGED.
const TIER1_SEQUENCE = [
  // Stage 1 — Note Recognition (cement the five-note frame; no leaps yet)
  { low: 'C4', high: 'G4', length: 3, maxStep: 1, maxDirChanges: 0, concept: 'Note recognition — three notes' },
  { low: 'C4', high: 'G4', length: 5, maxStep: 1, maxDirChanges: 0, concept: 'The five-note frame — stepwise' },
  { low: 'C4', high: 'G4', length: 5, maxStep: 1, maxDirChanges: 2, concept: 'Knowing the frame — the five notes in varied order' },
  // Stage 2 — Step Recognition
  { low: 'C4', high: 'G4', length: 5, maxStep: 1, maxDirChanges: 1, concept: 'Reading by step — a single change of direction' },
  { low: 'C4', high: 'G4', length: 6, maxStep: 1, maxDirChanges: 2, concept: 'Mixed steps — longer stepwise lines' },
  // Stage 3 — Shape / Contour Recognition (still stepwise)
  { low: 'C4', high: 'G4', length: 3, maxStep: 1, maxDirChanges: 1, concept: 'Three-note contours' },
  { low: 'C4', high: 'G4', length: 4, maxStep: 1, maxDirChanges: 2, concept: 'Four-note contours' },
  { low: 'C4', high: 'G4', length: 5, maxStep: 1, maxDirChanges: 3, concept: 'Direction changes' },
  { low: 'C4', high: 'G4', length: 6, maxStep: 1, maxDirChanges: 2, concept: 'Simple melodic shapes' },
  // Stage 4 — Skip Recognition (introduce the 3rd)
  { low: 'C4', high: 'G4', length: 5, maxStep: 2, maxDirChanges: 1, concept: 'The skip — reading a 3rd' },
  { low: 'C4', high: 'G4', length: 5, maxStep: 2, maxDirChanges: 2, concept: 'Mixed steps and skips' },
  { low: 'C4', high: 'G4', length: 6, maxStep: 2, maxDirChanges: 2, concept: 'Simple patterns — steps and skips' },
  // Stage 5 — Interval Recognition (reach within the frame; up to a 5th)
  { low: 'C4', high: 'G4', length: 5, maxStep: 3, maxDirChanges: 2, concept: 'Reading up to a 4th' },
  { low: 'C4', high: 'G4', length: 5, maxStep: 4, maxDirChanges: 2, concept: 'Reading up to a 5th' },
  // Stage 6 — Register Expansion (leave the frame upward; first ledger line)
  { low: 'C4', high: 'A4', length: 5, maxStep: 3, maxDirChanges: 2, concept: 'One note above the frame' },
  { low: 'C4', high: 'C5', length: 6, maxStep: 3, maxDirChanges: 2, concept: 'Up to the octave' },
  { low: 'C4', high: 'A5', length: 5, maxStep: 3, maxDirChanges: 2, concept: 'First ledger line above the staff (A5)' },
  // Stage 7 — Register Shift (last)
  { low: 'C4', high: 'C6', length: 5, maxStep: 3, maxDirChanges: 2, concept: 'Further ledger lines (to C6)' },
  { low: 'A4', high: 'E6', length: 5, maxStep: 3, maxDirChanges: 2, concept: 'Register shift — the home leaves Middle C' },
];

/** Build one Tier-1 lesson from its explicit single-concept knob state. */
function buildTier1Lesson(spec, state, sub, number) {
  const pool = whiteKeyPool(state.low, state.high);
  const title = `${CLEF_LABEL[spec.clef]} · ${describeSpan(state.low, state.high, state.length)}`;
  return {
    id: `${spec.tier}.${sub}`,
    number,
    tier: spec.tier,
    sub,
    title,
    tierTitle: spec.title,
    clef: spec.clef,
    range: { low: state.low, high: state.high },
    accidentals: spec.accidentals,
    stage: spec.stage,
    governance: sub <= 5 ? 'Keyboard Geography' : 'Reading Fluency',
    concept: state.concept,
    cfg: { level: number, name: title, pool, maxStep: state.maxStep, maxDirChanges: state.maxDirChanges, length: state.length },
  };
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
    if (spec.tier === 1) {
      // Tier 1 uses the explicit single-concept sequence (11 lessons).
      TIER1_SEQUENCE.forEach((state, i) => {
        number += 1;
        out.push(buildTier1Lesson(spec, state, i + 1, number));
      });
    } else {
      for (let sub = 1; sub <= SUBS_PER_TIER; sub++) {
        number += 1;
        out.push(buildLesson(spec, sub, number));
      }
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
export const TOTAL_LESSONS = buildLessonMatrix().length;
