// courseStage3TwoHands.js
// KeyMaster Stage 3 — Two Hands & Grand Staff (Stage 4 in rc2-127 numbering).
// Extracted verbatim from foundations.js (the rc2-127 monolith) by the rc2-136
// thin-engine split. Identity-preserving: the SAME step objects, in the SAME
// order, with the SAME ids and fields — only their physical file location moved,
// so the Course renders identically. Original KeyMaster material; no third-party, method-book, or competitor content.

export const STAGE3_TWOHANDS_STEPS = [
  // ===========================================================================
  // STAGE 4 \u2014 Two Hands & the Grand Staff. The left hand, the bass clef, and the
  // grand staff that joins both; left-hand patterns, a right-hand melody over a
  // left-hand anchor, scale fragments hand by hand, and a first little piece.
  // ===========================================================================
  {
    eyebrow: 'Stage 4 \u00B7 Two hands', title: 'The left hand joins in', id: 's4-welcome',
    say: [
      { text: 'Welcome to Stage 4. Until now the right hand has led. Now the left hand joins, and with it the bass clef.', pauseAfter: 640, tone: 'warm' },
      { text: 'We\u2019ll take it hand by hand first \u2014 the way good practice always begins \u2014 then let them meet on the grand staff.', pauseAfter: 360 },
    ],
    explain: ['Stage 4 brings in the left hand and the bass clef. Piano reading uses both staves at once \u2014 the grand staff.', 'We build hand by hand first, then join them. No rush.'],
    show: { kind: 'staff', clef: 'grand', middleC: true, caption: 'Two hands, two staves \u2014 joined by Middle C.' },
    mode: 'none',
  },
  {
    eyebrow: 'The bass clef', title: 'Lower notes, left hand', id: 's4-bass-clef',
    say: [
      { text: 'The bass clef carries the lower notes \u2014 usually the left hand at the piano.', pauseAfter: 580, tone: 'warm' },
      { text: 'Its landmark is F: the note F sits on the fourth line, between the two dots of the clef.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['The bass clef carries lower notes \u2014 usually the left hand. Same five lines and four spaces, lower in pitch.', 'Its landmark: F on the fourth line, marked by the clef\u2019s two dots.'],
    show: { kind: 'staff', clef: 'bass', notes: [53], caption: 'F \u2014 the bass-clef landmark, fourth line.' },
    mode: 'none',
  },
  {
    eyebrow: 'Left-hand fingers', title: 'The left hand, numbered', id: 's4-lh-fingers',
    say: [
      { text: 'A reminder of the left hand. Same numbers \u2014 thumb is one, little finger is five \u2014 mirrored, with the thumb toward the middle.', pauseAfter: 660, tone: 'warm' },
      { text: 'Watch them light: one, two, three, four, five.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The left hand uses the same numbers, mirrored: thumb (1) toward the centre, little finger (5) reaching low.', 'When the left hand climbs from a low note, the little finger often starts \u2014 5, 4, 3, 2, 1.'],
    show: { kind: 'hand', hand: 'left', sweep: [1, 2, 3, 4, 5], caption: 'Left hand: 1 (thumb) to 5 (little finger).' },
    mode: 'none',
  },
  {
    eyebrow: 'Reading the bass', title: 'Play a bass note', id: 's4-lh-note',
    say: [
      { text: 'A note sits in the bass clef for the left hand. This is C \u2014 the C below Middle C.', pauseAfter: 640, tone: 'warm' },
      { text: 'It sits in the second space of the bass staff. Play it with your left thumb, finger one.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['This bass-clef note is the C below Middle C, in the second space. Play it with the left hand, finger 1 (thumb).', 'Lower on the staff, lower on the keyboard, to the left of Middle C.'],
    show: { kind: 'keys', midis: [48], caption: 'C below Middle C \u2014 left hand.', label: 'low C' },
    staffHint: { clef: 'bass', notes: [48] },
    handHint: { hand: 'left', highlight: [1] },
    demo: [48], demoGap: 0.5,
    tryPrompt: 'Left hand: play the C below Middle C (finger 1).', targets: [48], exact: true, mode: 'one',
    okMsg: 'Good \u2014 a bass note, played from the staff with the left hand. The left hand reads its own clef.',
    hint: 'The C an octave below Middle C \u2014 left of centre, just left of a two-black-key group.',
  },
  {
    eyebrow: 'Left-hand pattern', title: 'Three notes, left hand', id: 's4-lh-pattern',
    say: [
      { text: 'Now a short left-hand rise: C, D, E, low on the keyboard.', pauseAfter: 580, tone: 'warm' },
      { text: 'The left hand climbs with fingers three, two, one \u2014 the thumb arriving on top.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A left-hand rise: C, D, E below Middle C. Ascending, the left hand uses fingers 3, 2, 1 \u2014 thumb on the highest.', 'Follow it in the bass clef as you play.'],
    show: { kind: 'keys', midis: [48, 50, 52], caption: 'Low C, D, E \u2014 left hand.', label: 'C D E' },
    staffHint: { clef: 'bass', notes: [48, 50, 52] },
    handHint: { hand: 'left', highlight: [3, 2, 1] },
    demo: [48, 50, 52], demoGap: 0.48,
    tryPrompt: 'Left hand: play low C, D, E rising (fingers 3, 2, 1).', targets: [48, 50, 52], mode: 'sequence',
    okMsg: 'Good \u2014 the left hand reads and plays too. Notice it climbs toward the thumb, mirroring the right.',
    hint: 'Low C, D, E to the left of Middle C \u2014 left-hand fingers 3, 2, 1.',
  },
  {
    eyebrow: 'The grand staff', title: 'Both hands, both clefs', id: 's4-grand',
    say: [
      { text: 'Here is the grand staff with a note for each hand: a low C for the left, a G for the right.', pauseAfter: 660, tone: 'warm' },
      { text: 'Play the low note first with the left hand, then the high note with the right. Two clefs, two hands, one keyboard.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The grand staff shows both hands at once. The bass note is the left hand\u2019s low C; the treble note is the right hand\u2019s G.', 'Play the low note, then the high note \u2014 left hand, then right.'],
    show: { kind: 'keys', midis: [48, 67], caption: 'Low C (left) and G (right).', label: 'C  \u2026  G' },
    staffHint: { clef: 'grand', notes: [48, 67] },
    demo: [48, 67], demoGap: 0.6,
    tryPrompt: 'Play a low note with the left hand, then a high note with the right.', mode: 'lowhigh',
    okMsg: 'There \u2014 left below, right above, joined on the grand staff. That division is how piano reading begins.',
    hint: 'A low key on the left for the left hand, then a higher key on the right for the right hand.',
  },
  {
    eyebrow: 'Melody over an anchor', title: 'Left anchor, right melody', id: 's4-anchor',
    say: [
      { text: 'A first taste of two hands with a job each: the left hand holds a low anchor note, and the right plays a little melody above it.', pauseAfter: 700, tone: 'warm' },
      { text: 'Play your low left-hand C, then a short right-hand line above. Left grounds, right sings.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The left hand often anchors a low note while the right plays the melody. Play a low note (left), then a higher note (right).', 'This left-grounds, right-sings shape is the heart of countless pieces.'],
    show: { kind: 'keys', midis: [48, 64], caption: 'Left anchor, right melody.', label: 'low + high' },
    staffHint: { clef: 'grand', notes: [48, 64] },
    demo: [48, 64], demoGap: 0.6,
    tryPrompt: 'Play a low left-hand note, then a higher right-hand note.', mode: 'lowhigh',
    okMsg: 'Yes \u2014 an anchor below and a voice above. You\u2019re hearing how the two hands share a single piece of music.',
    hint: 'Low key with the left hand first, then a higher key with the right.',
  },
  {
    eyebrow: 'Chord or arpeggio', title: 'Together, or one at a time', id: 's4-chord-arp',
    say: [
      { text: 'A reminder that pays off with two hands. Three notes together make a chord; the same three one at a time make an arpeggio.', pauseAfter: 680, tone: 'warm' },
      { text: 'Play C, E, G one at a time \u2014 an arpeggio \u2014 with the right hand, fingers one, two, three.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Chord = notes together; arpeggio = the same notes one at a time. Play C, E, G as an arpeggio, fingers 1, 2, 3.', 'Left hands often arpeggiate a chord while the right plays melody \u2014 worth knowing well.'],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'C, E, G \u2014 one at a time.', label: 'C \u2192 E \u2192 G' },
    staffHint: { clef: 'treble', notes: [60, 64, 67] },
    handHint: { hand: 'right', highlight: [1, 2, 3] },
    demo: [60, 64, 67], demoGap: 0.5,
    tryPrompt: 'Play C, E, G one at a time \u2014 an arpeggio (fingers 1, 2, 3).', targets: [60, 64, 67], mode: 'sequence',
    okMsg: 'Good \u2014 a clean arpeggio. Chords and arpeggios are the same harmony, shaped two ways.',
    hint: 'The three chord notes, one after another: C, E, G.',
  },
  {
    eyebrow: 'Scale fragment, right hand', title: 'Five notes up, right hand', id: 's4-scale-rh',
    say: [
      { text: 'Toward scales. The right hand\u2019s five-finger position is the front half of the C scale: C, D, E, F, G.', pauseAfter: 640, tone: 'warm' },
      { text: 'Play it up, fingers one to five \u2014 even and connected.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The five-finger position C-D-E-F-G is the first half of the C scale. Right hand, fingers 1, 2, 3, 4, 5.', 'The full scale joins two such shapes with the thumb passing under \u2014 the Scales Masterclass builds that in depth.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67], caption: 'C, D, E, F, G \u2014 right hand.', label: 'C D E F G' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 65, 67] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 4, 5] },
    demo: [60, 62, 64, 65, 67], demoGap: 0.38,
    tryPrompt: 'Right hand: play C, D, E, F, G up (fingers 1, 2, 3, 4, 5).', targets: [60, 62, 64, 65, 67], mode: 'sequence',
    okMsg: 'Good \u2014 half a scale, evenly fingered. This is the foundation the Scales Masterclass takes all the way.',
    hint: 'From Middle C up five white keys, fingers 1 to 5.',
  },
  {
    eyebrow: 'Scale fragment, left hand', title: 'Five notes up, left hand', id: 's4-scale-lh',
    say: [
      { text: 'The same shape, left hand, low on the keyboard: C, D, E, F, G.', pauseAfter: 580, tone: 'warm' },
      { text: 'Ascending, the left hand starts on the little finger: five, four, three, two, one.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The left-hand five-finger position, ascending: C, D, E, F, G with fingers 5, 4, 3, 2, 1 \u2014 little finger to thumb.', 'Follow it in the bass clef. Both hands now know the shape.'],
    show: { kind: 'keys', midis: [48, 50, 52, 53, 55], caption: 'Low C, D, E, F, G \u2014 left hand.', label: 'C D E F G' },
    staffHint: { clef: 'bass', notes: [48, 50, 52, 53, 55] },
    handHint: { hand: 'left', highlight: [5, 4, 3, 2, 1] },
    demo: [48, 50, 52, 53, 55], demoGap: 0.38,
    tryPrompt: 'Left hand: play low C, D, E, F, G up (fingers 5, 4, 3, 2, 1).', targets: [48, 50, 52, 53, 55], mode: 'sequence',
    okMsg: 'Good \u2014 the left hand has the shape too, mirrored. Now both hands are ready for scale work.',
    hint: 'Low C up five white keys \u2014 left-hand fingers 5, 4, 3, 2, 1.',
  },
  {
    eyebrow: 'Practising well', title: 'Hands separately, then together', id: 's4-practise',
    say: [
      { text: 'A word on practising two hands. Always learn each hand on its own first \u2014 sure and even \u2014 before joining them.', pauseAfter: 680, tone: 'warm' },
      { text: 'Joining too early just teaches confusion. Hands separately, slowly, then together: that is the whole secret.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['Two-hand playing is built one hand at a time. Learn each hand separately, slowly and evenly, then join them.', 'This patience is exactly what separates steady progress from frustration.'],
    show: { kind: 'hand', hand: 'both', sweep: [1], caption: 'Each hand on its own first \u2014 then together.' },
    mode: 'none',
  },
  {
    eyebrow: 'A little piece', title: 'Your first short piece', id: 's4-piece',
    say: [
      { text: 'Let\u2019s end with a short piece for the right hand \u2014 a real little line: C, D, E, F, E, D, C.', pauseAfter: 660, tone: 'warm' },
      { text: 'Up to F and all the way home. Fingers one, two, three, four, three, two, one. Slowly, evenly, listening.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A short piece: C, D, E, F, E, D, C \u2014 up to F and back home. Fingers 1, 2, 3, 4, 3, 2, 1.', 'Play it slowly and evenly, as one shape, listening to the sound.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 64, 62, 60], caption: 'C, D, E, F, E, D, C.', label: 'a little piece' },
    staffHint: { clef: 'treble', notes: [{ midi: 60, finger: 1 }, { midi: 62, finger: 2 }, { midi: 64, finger: 3 }, { midi: 65, finger: 4 }, { midi: 64, finger: 3 }, { midi: 62, finger: 2 }, { midi: 60, finger: 1 }] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 4, 3, 2, 1] },
    demo: [60, 62, 64, 65, 64, 62, 60], demoGap: 0.42,
    tryPrompt: 'Play the piece: C, D, E, F, E, D, C (fingers 1, 2, 3, 4, 3, 2, 1).', targets: [60, 62, 64, 65, 64, 62, 60], mode: 'sequence',
    okMsg: 'Good \u2014 you played a whole short line from the staff, up and home. That is a real piece of music, played from notation.',
    hint: 'C up to F, then back down to C \u2014 fingers 1, 2, 3, 4, 3, 2, 1.',
  },
  {
    eyebrow: 'Stage 4 review', title: 'Checkpoint: both hands, the shape', id: 's4-review',
    say: [
      { text: 'A calm checkpoint. Play the left-hand five-finger shape once more: low C, D, E, F, G.', pauseAfter: 620, tone: 'warm' },
      { text: 'Fingers five, four, three, two, one \u2014 from memory and from the bass clef.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['From memory: the left-hand five-finger shape, low C, D, E, F, G \u2014 fingers 5, 4, 3, 2, 1.', 'A chance to confirm the left hand knows its shape and its clef.'],
    show: { kind: 'keys', midis: [48, 50, 52, 53, 55], caption: 'Low C, D, E, F, G \u2014 left hand.', label: 'C D E F G' },
    staffHint: { clef: 'bass', notes: [48, 50, 52, 53, 55] },
    handHint: { hand: 'left', highlight: [5, 4, 3, 2, 1] },
    demo: [48, 50, 52, 53, 55], demoGap: 0.4,
    tryPrompt: 'Left hand: play low C, D, E, F, G (fingers 5, 4, 3, 2, 1).', targets: [48, 50, 52, 53, 55], mode: 'sequence',
    okMsg: 'Good \u2014 both hands now know their own clef and the five-finger shape. Stage 4 is yours.',
    hint: 'Low C up five white keys \u2014 left-hand fingers 5, 4, 3, 2, 1.',
  },
  {
    eyebrow: 'The road ahead', title: 'Where you are now', id: 's4-onward',
    say: [
      { text: 'Look how far this has come. You sit and shape your hands, you know the finger numbers, you read both clefs, you play patterns and a short piece, and you feel a steady pulse.', pauseAfter: 760, tone: 'warm' },
      { text: 'From here the path widens: full scales hand over hand, longer pieces, two hands together. The Scales Masterclass and Cognitive Sight-Reading are ready whenever you want to go deeper \u2014 and more Course is on the way.', pauseAfter: 360, tone: 'warm' },
    ],
    explain: ['You\u2019ve built real foundations: posture and hand shape, finger numbers, keyboard geography, both clefs and the grand staff, the B-major pathway, five-finger shapes in both hands, pulse, and a first short piece.', 'Ahead: full scales (thumb passing under), longer two-hand pieces, and deeper reading. The masterclasses are there for deeper practice any time, and the Course continues to grow.'],
    bridge: { label: 'Optional \u2014 open the Scales Masterclass for deeper practice', hash: '#/scales' },
    mode: 'none',
  },
];
