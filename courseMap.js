// courseMap.js
//
// The KeyMaster PRO Course — the canonical long-form stage map. The Course is the
// centre of the app: a tutor-led journey from first keys to developing musician. The
// masterclasses (Scales, Sight-Reading, Chords, …) are specialist practice rooms the
// tutor walks the learner into at the right time.
//
// This is DATA only — the backbone the long-form curriculum hangs on. Stage 1 is live
// today (the interactive keyboard-geography lessons in foundations.js / LEARN_STEPS).
// Stages 2–10 are scaffolded with real titles + summaries and status 'planned' so the
// course has shape and direction WITHOUT shipping weak filler cards. Each stage gains
// genuine interactive lessons only when its teaching (and any device-tuned visuals) is
// ready. progressStore tracks course position via plain keys ('courseStage',
// 'stagesCompleted') — no store redesign.

export const STAGES = [
  {
    id: 1, status: 'available', title: 'Foundations of the keyboard',
    summary: 'Keyboard geography — low and high, the black-key groups, the white-key landmarks, Middle C and the B just below it.',
    // The live Stage 1 units (these map to LEARN_STEPS ids in foundations.js):
    units: ['meet-keyboard', 'low-high', 'black-keys-two', 'black-keys-three', 'find-c', 'middle-c', 'b-below', 'direction', 'first-scale'],
  },
  { id: 2, status: 'planned', title: 'First reading',
    summary: 'The staff as a map — direction, lines and spaces, treble and bass, landmark notes. Recognition before speed.' },
  { id: 3, status: 'planned', title: 'First technique',
    summary: 'A natural, supported hand — relaxed wrist, calm thumb, black-key comfort. Natural, supported, flexible — never forced.' },
  { id: 4, status: 'planned', title: 'First scales',
    summary: 'What a scale is, ascending and descending, and the B-major pathway — one hand first, then both.' },
  { id: 5, status: 'planned', title: 'First chords and harmony',
    summary: 'Notes sounded together — the B-major triad, root position and inversions, hand by hand.' },
  { id: 6, status: 'planned', title: 'Rhythm and pulse',
    summary: 'A steady pulse, counting, note values and rests. Feel before judgement.' },
  { id: 7, status: 'planned', title: 'Sight-reading fluency',
    summary: 'Pattern and interval reading, hand-to-staff mapping. Continuity before perfection.' },
  { id: 8, status: 'planned', title: 'Arpeggios and patterns',
    summary: 'Broken chords and common shapes — recognised, then applied at the keyboard.' },
  { id: 9, status: 'planned', title: 'Applied music',
    summary: 'Original B-major micro-studies that bring reading, technique and rhythm together.' },
  { id: 10, status: 'planned', title: 'Developing musician',
    summary: 'Longer reading, chord progressions, more keys, left-hand accompaniment, and review cycles.' },
];

export const COURSE_NAME = 'The KeyMaster PRO Course';

// The stage the learner is on now: the first available stage they have not completed,
// else the first stage. Read-only; reflects progressStore truthfully (no fake state).
export function currentStage(progress) {
  let done = [];
  try { const v = progress && progress.get ? progress.get('stagesCompleted') : null; if (Array.isArray(v)) done = v; }
  catch (_) { /* no-op */ }
  return STAGES.find((s) => s.status === 'available' && !done.includes(s.id)) || STAGES[0];
}

export function stageById(id) {
  return STAGES.find((s) => s.id === id) || null;
}
