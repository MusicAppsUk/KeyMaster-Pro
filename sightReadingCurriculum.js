// sightReadingCurriculum.js
//
// ► THIS IS THE ONLY FILE YOU EDIT TO CHANGE EXERCISES. ◄
//
// The sight-reading engine (sightReading.js) reads this list and renders
// whatever it finds — it has no exercises baked in. To add, remove, or reorder
// exercises, just edit the array below. Nothing in the engine needs to change.
//
// Each exercise is a plain object:
//   {
//     level: 1,                      // shown to the player; keep them in order
//     name: 'First three notes',     // short label (optional)
//     notes: ['C4', 'D4', 'E4'],     // note names, in playing order
//   }
//
// Note-name format: a letter A–G, an optional accidental (# ## b bb), then the
// octave number (middle C = C4). Examples: 'C4', 'F#5', 'Bb3', 'A2'.
// Notes at or above middle C land on the treble staff; below it, the bass staff.

export const CURRICULUM = [
  { level: 1, name: 'First three notes',     notes: ['C4', 'D4', 'E4'] },
  { level: 2, name: 'Five-finger position',  notes: ['C4', 'D4', 'E4', 'F4', 'G4'] },
  { level: 3, name: 'Up and back',           notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'F4', 'E4', 'D4', 'C4'] },
  { level: 4, name: 'C major scale',         notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'] },
  { level: 5, name: 'Crossing the staves',   notes: ['C3', 'G3', 'C4', 'E4', 'G4', 'C5'] },
  { level: 6, name: 'First sharp',           notes: ['G4', 'A4', 'B4', 'C5', 'D5', 'F#5', 'G5'] },
  { level: 7, name: 'Bass clef steps',       notes: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'] },
];

export default CURRICULUM;
