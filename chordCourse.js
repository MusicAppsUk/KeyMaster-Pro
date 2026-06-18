// chordCourse.js
//
// Guided course DATA for Chord Masterclass (Phase 2). Pure data — no DOM, no
// engine, no audio. The controller (chordMasterclass.js) reads this to drive a
// Teach → Show → Shape → Try → Guide → Repeat → Review lesson flow. Chord MIDI
// and fingering still come from chordEngine; this file only sequences the lessons
// and supplies the patient teaching copy.
//
// Unit 1 is intentionally small and safe: the B major triad, all three
// inversions, both hands, a consolidation review, and a mixed assessment.
// Roots/qualities are fixed for the unit (B major); each lesson varies only the
// inversion and hand, or supplies its own sub-sequence for review/assessment.

const SH = '\u266F'; // ♯

export const UNIT1 = Object.freeze({
  id: 'unit1-bmajor',
  title: 'B Major Triad',
  rootName: 'B',
  rootPc: 11,
  quality: 'major',
  intro: 'Today we are learning B major.',
  lessons: Object.freeze([
    {
      id: 1, kind: 'lesson', inversion: 'root', hand: 'RH',
      teach: [
        `B major is built from three notes: B, D${SH} and F${SH}.`,
        `They are the 1st, 3rd and 5th of the chord — not three random notes, but one shape.`,
        `In root position the lowest note is B, the chord's own name.`,
        `We'll play it with the right hand first.`,
      ],
    },
    {
      id: 2, kind: 'lesson', inversion: 'root', hand: 'LH',
      teach: [
        `The same B major chord — now in the left hand.`,
        `Still B, D${SH}, F${SH}, with B at the bottom.`,
        `The shape feels the same; only the hand changes.`,
      ],
    },
    {
      id: 3, kind: 'lesson', inversion: 'first', hand: 'RH',
      teach: [
        `Same chord, new shape: B major in first inversion.`,
        `Now the lowest note is D${SH} (the 3rd), and B moves to the top.`,
        `It is still B major — a chord can move while keeping its identity.`,
      ],
    },
    {
      id: 4, kind: 'lesson', inversion: 'first', hand: 'LH',
      teach: [
        `First inversion again — left hand this time.`,
        `Lowest note D${SH}; the same shape sits a little higher under the hand.`,
      ],
    },
    {
      id: 5, kind: 'lesson', inversion: 'second', hand: 'RH',
      teach: [
        `Second inversion: the lowest note is now F${SH} (the 5th).`,
        `B and D${SH} sit above it. Same three notes, a third shape.`,
      ],
    },
    {
      id: 6, kind: 'lesson', inversion: 'second', hand: 'LH',
      teach: [
        `Second inversion, left hand.`,
        `Lowest note F${SH}. You have now met all three shapes in both hands.`,
      ],
    },
    {
      id: 7, kind: 'review', hand: 'RH',
      sequence: ['root', 'first', 'second'],
      teach: [
        `You have met all three shapes of B major.`,
        `Play each one in turn — same chord, new shape.`,
      ],
    },
    {
      id: 8, kind: 'assessment',
      sequence: [
        { inversion: 'root', hand: 'RH' },
        { inversion: 'first', hand: 'LH' },
        { inversion: 'second', hand: 'RH' },
      ],
      teach: [
        `A mixed check — no teaching hints this time.`,
        `Play each B major chord as it is named.`,
      ],
    },
  ]),
});
