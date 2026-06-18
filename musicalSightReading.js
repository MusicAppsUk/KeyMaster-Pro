// musicalSightReading.js
//
// RESERVED PILLAR — Musical Sight Reading / Repertoire (FROZEN, UNWIRED STUB).
//
// This module is imported by NOTHING. It defines a candidate data model for a
// future "Musical Sight Reading" layer and carries a few hand-authored ORIGINAL
// micro-studies plus pure, headlessly-testable validators. It deliberately does
// NOT import or touch the stable Cognitive Sight-Reading engine (sightReading.js,
// exerciseGenerator.js, lessonMatrix.js, staffView.js). Building an actual route
// is a separate, approved phase.
//
// Governing ideas (see MUSICAL_SIGHT_READING_PILLAR.md / ROADMAP.md):
//   • Cognitive Sight Reading trains the EYE; Musical Sight Reading APPLIES that
//     skill to material that sounds like music — motif, phrase, cadence, shape.
//   • A music generator, not a random-note generator. Every study has a
//     beginning, a middle, an ending, and a satisfying close.
//   • LEGAL SAFETY IS NON-NEGOTIABLE. Phase-1 studies are all ORIGINAL
//     (genre-inspired, never derived from a protected song). Public-domain works
//     are allowed later ONLY with verified composition AND edition/engraving
//     rights — "inspired by genre, not derived from a protected song."
//
// Format choice (canonical authoring/runtime): a simplified internal sequence —
// note-name events ('C4' | ['C4','E4'] chord | null rest) with a `beats`
// duration — chosen because the existing staff renderer already consumes
// note-name sequences (and a parallel `lower` voice for two hands). MusicXML is
// intended only as a future IMPORT source, converted to this internal form.

/* ---- vocabulary ----------------------------------------------------------- */
export const PATHS = Object.freeze(['classical', 'popular', 'folk', 'mixed']);
export const SOURCES = Object.freeze(['original', 'public-domain']);

// The questions every study must pass before it earns a place (authoring gate).
export const MUSICALITY_CHECKLIST = Object.freeze([
  'Does it sound like music?',
  'Is it pianistic?',
  'Is it pleasant enough to replay?',
  'Does it teach the target reading skill?',
  'Does it have phrase direction?',
  'Does it have a satisfying ending?',
  'Is it appropriate for the learner\u2019s level?',
  'Is it legally safe?',
]);

// Future Practice-Review dimensions (surface only once genuinely tracked).
export const REVIEW_DIMENSIONS = Object.freeze([
  'Note Recognition', 'Rhythm Recognition', 'Continuity', 'Pattern Recognition',
  'Phrase Awareness', 'Reading Ahead', 'Style Familiarity', 'Musical Flow',
]);

// Level outline — anchored to the existing Cognitive Sight-Reading frames so the
// musical layer can begin exactly where the eye-training leaves off.
export const LEVEL_OUTLINE = Object.freeze([
  { level: 1, frame: 'C4\u2013G4', idea: 'tiny two-bar stepwise phrases' },
  { level: 2, frame: 'C4\u2013G4 (five-finger)', idea: 'repeated motif, simple cadence' },
  { level: 3, frame: 'skips & contour', idea: 'question\u2013answer phrases' },
  { level: 4, frame: 'full C major', idea: 'simple left-hand drone / tonic' },
  { level: 5, frame: 'two hands', idea: 'gentle cross-staff reading' },
]);

/* ---- the Phase-1 micro-library (all ORIGINAL, legally safe) --------------- */
// Each study is a small *piece*: motif -> shape -> cadence. Durations are in
// quarter-note beats; `den` of the time signature is 4 throughout Phase 1.
export const LIBRARY = Object.freeze([
  {
    id: 'msr-cl-001', title: 'Morning Step', path: 'classical', level: 1,
    key: 'C major', timeSignature: [4, 4], clef: 'treble', hands: 'RH',
    objective: 'Stepwise reading in the C4\u2013G4 frame.',
    shape: 'A gentle rise to F, then a step-wise fall home to C.',
    cadence: 'Settles on the tonic (C).',
    source: 'original', licence: 'KeyMaster PRO original study', provenance: null,
    rh: [
      { note: 'C4', beats: 1 }, { note: 'D4', beats: 1 }, { note: 'E4', beats: 1 }, { note: 'F4', beats: 1 },
      { note: 'E4', beats: 1 }, { note: 'D4', beats: 1 }, { note: 'C4', beats: 2 },
    ],
    lh: null,
  },
  {
    id: 'msr-cl-002', title: 'Question and Answer', path: 'classical', level: 2,
    key: 'C major', timeSignature: [4, 4], clef: 'treble', hands: 'RH',
    objective: 'Two balanced phrases in the five-finger position.',
    shape: 'A question rising to the dominant (G); an answer settling home to C.',
    cadence: 'V\u2013I: the answer resolves the dominant to the tonic.',
    source: 'original', licence: 'KeyMaster PRO original study', provenance: null,
    rh: [
      { note: 'C4', beats: 1 }, { note: 'E4', beats: 1 }, { note: 'G4', beats: 1 }, { note: 'G4', beats: 1 },
      { note: 'G4', beats: 1 }, { note: 'E4', beats: 1 }, { note: 'D4', beats: 1 }, { note: 'C4', beats: 1 },
    ],
    lh: null,
  },
  {
    id: 'msr-fk-003', title: 'Folk Lilt', path: 'folk', level: 3,
    key: 'C major (pentatonic)', timeSignature: [3, 4], clef: 'treble', hands: 'RH',
    objective: 'A lilting waltz line using the C-pentatonic shape (skips & contour).',
    shape: 'Up through the chord tones, gently down, and a fall to the tonic.',
    cadence: 'Falls to the tonic (C) to close.',
    source: 'original', licence: 'KeyMaster PRO original study', provenance: null,
    rh: [
      { note: 'C4', beats: 1 }, { note: 'E4', beats: 1 }, { note: 'G4', beats: 1 },
      { note: 'A4', beats: 1 }, { note: 'G4', beats: 1 }, { note: 'E4', beats: 1 },
      { note: 'D4', beats: 1 }, { note: 'C4', beats: 2 },
    ],
    lh: null,
  },
  {
    id: 'msr-fk-004', title: 'Quiet Drone', path: 'folk', level: 4,
    key: 'C major', timeSignature: [4, 4], clef: 'grand', hands: 'both',
    objective: 'Reading a right-hand melody over a held left-hand tonic drone.',
    shape: 'A calm melody floats above a still left-hand C.',
    cadence: 'Melody closes on C above the tonic drone.',
    source: 'original', licence: 'KeyMaster PRO original study', provenance: null,
    rh: [
      { note: 'E4', beats: 1 }, { note: 'G4', beats: 1 }, { note: 'E4', beats: 1 }, { note: 'D4', beats: 1 },
      { note: 'C4', beats: 1 }, { note: 'D4', beats: 1 }, { note: 'E4', beats: 1 }, { note: 'C4', beats: 1 },
    ],
    lh: [
      { note: 'C3', beats: 4 },
      { note: 'C3', beats: 4 },
    ],
  },
  {
    id: 'msr-cl-005', title: 'Evening Close', path: 'classical', level: 5,
    key: 'C major', timeSignature: [4, 4], clef: 'grand', hands: 'both',
    objective: 'A lyrical line with a clear V\u2013I cadence shared between the hands.',
    shape: 'A singing right-hand phrase; the left hand steps from dominant to tonic to close.',
    cadence: 'V\u2013I: left hand moves G\u2013C under the final bar.',
    source: 'original', licence: 'KeyMaster PRO original study', provenance: null,
    rh: [
      { note: 'E4', beats: 1 }, { note: 'D4', beats: 1 }, { note: 'C4', beats: 1 }, { note: 'D4', beats: 1 },
      { note: 'E4', beats: 1 }, { note: 'D4', beats: 1 }, { note: 'C4', beats: 2 },
    ],
    lh: [
      { note: 'C3', beats: 4 },
      { note: 'G2', beats: 2 }, { note: 'C3', beats: 2 },
    ],
  },
]);

/* ---- pure validators (headlessly testable; no DOM, no engine) ------------- */
const NOTE_RE = /^[A-Ga-g](##|bb|[#b]|x)?-?\d+$/;

export function isNoteName(n) { return typeof n === 'string' && NOTE_RE.test(n.trim()); }

// A voice event: { note: name | [names] | null (rest), beats: > 0 }.
function eventErrors(ev, where) {
  const errs = [];
  if (!ev || typeof ev !== 'object') return [`${where}: not an event object`];
  if (!(typeof ev.beats === 'number' && ev.beats > 0)) errs.push(`${where}: beats must be > 0`);
  if (ev.note === null) return errs;                                  // rest is valid
  if (Array.isArray(ev.note)) {
    if (!ev.note.length) errs.push(`${where}: empty chord`);
    ev.note.forEach((n, i) => { if (!isNoteName(n)) errs.push(`${where}[${i}]: bad note "${n}"`); });
  } else if (!isNoteName(ev.note)) {
    errs.push(`${where}: bad note "${ev.note}"`);
  }
  return errs;
}

export function voiceBeats(voice) { return (voice || []).reduce((a, ev) => a + (ev.beats || 0), 0); }

// Validate a single study against the data model + musical/legal invariants.
export function validateStudy(study) {
  const errors = [];
  const need = ['id', 'title', 'path', 'level', 'key', 'timeSignature', 'clef', 'hands', 'objective', 'source'];
  for (const k of need) if (study[k] === undefined || study[k] === null) errors.push(`missing field: ${k}`);

  if (study.path && !PATHS.includes(study.path)) errors.push(`path not in ${PATHS.join('|')}`);
  if (study.source && !SOURCES.includes(study.source)) errors.push(`source not in ${SOURCES.join('|')}`);

  // Legal-safety gate: public-domain entries MUST carry verified provenance.
  if (study.source === 'public-domain') {
    const p = study.provenance;
    if (!p || typeof p !== 'object') errors.push('public-domain study requires a provenance object');
    else for (const k of ['composer', 'died', 'jurisdiction', 'edition', 'sourceLicence'])
      if (!p[k]) errors.push(`provenance.${k} required for public-domain study`);
  } else if (study.source === 'original' && !study.licence) {
    errors.push('original study requires a licence string');
  }

  // Time signature [num, den]; Phase 1 keeps den = 4 (beats are quarter-notes).
  const ts = study.timeSignature;
  if (!Array.isArray(ts) || ts.length !== 2 || !ts.every((x) => Number.isInteger(x) && x > 0)) {
    errors.push('timeSignature must be [num, den] of positive integers');
  }

  // Voices.
  if (!Array.isArray(study.rh) || study.rh.length === 0) errors.push('rh voice must be a non-empty array');
  else study.rh.forEach((ev, i) => errors.push(...eventErrors(ev, `rh[${i}]`)));
  if (study.hands === 'both') {
    if (!Array.isArray(study.lh) || study.lh.length === 0) errors.push('hands "both" requires an lh voice');
    else study.lh.forEach((ev, i) => errors.push(...eventErrors(ev, `lh[${i}]`)));
  }

  // Bar math: each voice must fill whole bars; two-hand voices must align in time.
  if (Array.isArray(ts) && ts.length === 2) {
    const perBar = ts[0];
    const rhB = voiceBeats(study.rh);
    if (rhB % perBar !== 0) errors.push(`rh total ${rhB} beats is not whole bars of ${perBar}`);
    if (study.hands === 'both' && Array.isArray(study.lh)) {
      const lhB = voiceBeats(study.lh);
      if (lhB % perBar !== 0) errors.push(`lh total ${lhB} beats is not whole bars of ${perBar}`);
      if (rhB !== lhB) errors.push(`rh (${rhB}) and lh (${lhB}) beat totals differ`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function validateLibrary(lib = LIBRARY) {
  return lib.map((s) => ({ id: s.id, ...validateStudy(s) }));
}
