// chordCourse.js
//
// Guided course DATA for Chord Masterclass (Phase 2 / rc2-26). Pure data — no DOM,
// no engine, no audio. The controller (chordMasterclass.js) reads this to drive an
// ACTIVE training flow per shape:
//
//   Teach/Demonstrate  → explain + brief visual highlight, then "Let's try it"
//   Follow Me          → guide the hand note-by-note (uses evaluator progress)
//   Try Yourself       → play the whole chord with less support
//   ... then Inversion Review → Mixed Assessment → Unit Review
//
// Chord MIDI + fingering still come from chordEngine; this file only sequences the
// steps and supplies the patient teaching copy. Unit 1 is the B major triad, all
// three inversions, both hands. Each shape is taught as a 3-step action sequence,
// so the learner is always led into PLAYING, never just reading.

const SH = '\u266F'; // sharp

// One shape => three active steps (teach -> follow-me -> try).
function shape(idBase, inversion, hand, teach) {
  return [
    { id: idBase,     kind: 'teach',    inversion, hand, teach },
    { id: idBase + 1, kind: 'followme', inversion, hand },
    { id: idBase + 2, kind: 'try',      inversion, hand },
  ];
}

export const UNIT1 = Object.freeze({
  id: 'unit1-bmajor',
  title: 'B Major Triad',
  rootName: 'B',
  rootPc: 11,
  quality: 'major',
  intro: 'Today we are learning B major.',
  steps: Object.freeze([
    // 1-3  root, right hand
    ...shape(1, 'root', 'RH', [
      `B major is built from three notes: B, D${SH} and F${SH}.`,
      `They are the 1st, 3rd and 5th of the chord - not three loose notes, but one shape.`,
      `In root position the lowest note is B, the chord's own name. We'll start with the right hand.`,
    ]),
    // 4-6  root, left hand
    ...shape(4, 'root', 'LH', [
      `The same B major chord - now in the left hand.`,
      `Still B, D${SH}, F${SH}, with B at the bottom. The shape feels the same; only the hand changes.`,
    ]),
    // 7-9  first inversion, right hand
    ...shape(7, 'first', 'RH', [
      `Same chord, new shape: B major in first inversion.`,
      `The lowest note is now D${SH} (the 3rd), and B has moved to the top.`,
      `It is still B major - a chord can move while keeping its identity.`,
    ]),
    // 10-12  first inversion, left hand
    ...shape(10, 'first', 'LH', [
      `First inversion again - left hand this time.`,
      `Lowest note D${SH}; the same shape sits a little higher under the hand.`,
    ]),
    // 13-15  second inversion, right hand
    ...shape(13, 'second', 'RH', [
      `Second inversion: the lowest note is now F${SH} (the 5th).`,
      `B and D${SH} sit above it - the same three notes, a third shape.`,
    ]),
    // 16-18  second inversion, left hand
    ...shape(16, 'second', 'LH', [
      `Second inversion, left hand.`,
      `Lowest note F${SH}. You have now met all three shapes in both hands.`,
    ]),
    // 19  inversion review (right hand cycles the three shapes)
    {
      id: 19, kind: 'review', hand: 'RH', sequence: ['root', 'first', 'second'],
      teach: [
        `You have met all three shapes of B major.`,
        `Play each one in turn - same chord, new shape.`,
      ],
    },
    // 20  mixed assessment (reduced support)
    {
      id: 20, kind: 'assess',
      sequence: [
        { inversion: 'root', hand: 'RH' },
        { inversion: 'first', hand: 'LH' },
        { inversion: 'second', hand: 'RH' },
      ],
      teach: [
        `A mixed check - fewer hints this time.`,
        `Play each B major chord as it is named.`,
      ],
    },
    // 21  unit review (honest summary)
    { id: 21, kind: 'unitreview' },
  ]),
});
