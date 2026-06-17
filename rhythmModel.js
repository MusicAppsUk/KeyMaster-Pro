// rhythmModel.js — FORWARD-LOOKING DESIGN STUB (R1 "Time, Rhythm & Duration").
//
// ⚠️  NOT WIRED INTO ANYTHING. This module is intentionally isolated and unused:
//     nothing imports it, it imports nothing, and it has NO side effects. It
//     exists only to reserve the canonical rhythm vocabulary and the future
//     Practice-Review timing labels in code form, so later timing work has a
//     single source of truth. Importing or executing it changes no behaviour.
//
// Stability contract: this file must never be imported by a runtime module while
// the timing pillar is still design-only. It does not touch — and must never be
// made to touch — MIDI mapping, the Event Bridge, staff rendering, progression
// gating, the feedback system, transport controls, or any stable module. See
// ROADMAP.md (Canonical Pillar — Time, Rhythm & Musical Duration) and the design
// doc TIMING_RHYTHM_PILLAR.md for the full specification and staged plan.
//
// Governing principle (same as reading): Recognition before Execution. Timing is
// a recognition skill before a speed skill. Everything here is recognition-facing
// metadata; no durations are scheduled, detected, scored, or enforced.

/* ------------------------------------------------------------------------- *
 * Note values. `beats` is expressed in quarter-note (crotchet) beats purely as
 * descriptive metadata for future use — it drives no scheduler today.
 * ------------------------------------------------------------------------- */
export const NOTE_VALUES = Object.freeze([
  Object.freeze({ id: 'semibreve',  uk: 'semibreve',  us: 'whole note',     beats: 4,    glyph: '\uD834\uDD5D' }),
  Object.freeze({ id: 'minim',      uk: 'minim',      us: 'half note',      beats: 2,    glyph: '\uD834\uDD5E' }),
  Object.freeze({ id: 'crotchet',   uk: 'crotchet',   us: 'quarter note',   beats: 1,    glyph: '\uD834\uDD5F' }),
  Object.freeze({ id: 'quaver',     uk: 'quaver',     us: 'eighth note',    beats: 0.5,  glyph: '\uD834\uDD60' }),
  Object.freeze({ id: 'semiquaver', uk: 'semiquaver', us: 'sixteenth note', beats: 0.25, glyph: '\uD834\uDD61' }),
]);

/* Rests of every value (display-only crotchet rest already ships in staffView). */
export const REST_VALUES = Object.freeze([
  Object.freeze({ id: 'semibreve-rest',  beats: 4,    glyph: '\uD834\uDD3B' }),
  Object.freeze({ id: 'minim-rest',      beats: 2,    glyph: '\uD834\uDD3C' }),
  Object.freeze({ id: 'crotchet-rest',   beats: 1,    glyph: '\uD834\uDD3D' }),  // ← the one shown today
  Object.freeze({ id: 'quaver-rest',     beats: 0.5,  glyph: '\uD834\uDD3E' }),
  Object.freeze({ id: 'semiquaver-rest', beats: 0.25, glyph: '\uD834\uDD3F' }),
]);

/* Duration modifiers and groupings — names reserved, no behaviour. */
export const DURATION_MODIFIERS = Object.freeze(['dotted', 'double-dotted', 'tied']);
export const TUPLETS = Object.freeze(['triplet', 'duplet', 'quintuplet', 'sextuplet']);

/* Meter. `kind` distinguishes simple vs compound for future curriculum gating. */
export const METERS = Object.freeze([
  Object.freeze({ id: '4/4', beatsPerBar: 4, beatUnit: 'crotchet', kind: 'simple' }),
  Object.freeze({ id: '3/4', beatsPerBar: 3, beatUnit: 'crotchet', kind: 'simple' }),
  Object.freeze({ id: '2/4', beatsPerBar: 2, beatUnit: 'crotchet', kind: 'simple' }),
  Object.freeze({ id: '6/8', beatsPerBar: 2, beatUnit: 'dotted-crotchet', kind: 'compound' }),
]);

/* Rhythmic concepts, introduced progressively (recognition first). Order is the
 * intended teaching order, not an implemented sequence. */
export const RHYTHM_CONCEPTS = Object.freeze([
  'pulse', 'beat', 'counting', 'long-vs-short', 'note-values', 'rests', 'silence',
  'bar-lines', 'time-signatures', 'simple-meter', 'compound-meter',
  'dotted-notes', 'tied-notes', 'held-notes', 'repeated-notes',
  'anacrusis', 'off-beat-entries', 'syncopation', 'triplets', 'tuplets',
  'rhythmic-patterns', 'phrase-endings', 'continuity', 'musical-flow',
]);

/* ------------------------------------------------------------------------- *
 * Practice-Review timing dimensions — FUTURE, educational wording only.
 * These mirror the calm, teacher-style voice of the existing Sight-Reading and
 * Scales reviews. They are NOT rendered anywhere yet; reserved so future review
 * lines stay on-voice and never read as game statistics. `levels` runs low→high.
 * ------------------------------------------------------------------------- */
export const REVIEW_TIMING_DIMENSIONS = Object.freeze([
  Object.freeze({ id: 'pulseStability',   label: 'Pulse Stability' }),
  Object.freeze({ id: 'rhythmRecognition', label: 'Rhythm Recognition' }),
  Object.freeze({ id: 'noteDuration',     label: 'Note Duration' }),
  Object.freeze({ id: 'continuity',       label: 'Continuity' }),
  Object.freeze({ id: 'restAwareness',    label: 'Rest Awareness' }),
]);

/* Formative phrasing ladder (low→high). Educational, not scored. */
export const REVIEW_TIMING_LEVELS = Object.freeze([
  'Ready', 'Needs attention', 'Developing', 'Improving', 'Good', 'Secure',
]);
