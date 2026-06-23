// courseStage2Reading.js
// KeyMaster Stage 2 — Reading & Playing (Stage 3 in rc2-127 numbering).
// Extracted verbatim from foundations.js (the rc2-127 monolith) by the rc2-136
// thin-engine split. Identity-preserving: the SAME step objects, in the SAME
// order, with the SAME ids and fields — only their physical file location moved,
// so the Course renders identically. Original KeyMaster material; no third-party, method-book, or competitor content.

export const STAGE2_READING_STEPS = [
  // ===========================================================================
  // STAGE 3 \u2014 Reading & Playing. The eye-to-hand loop: read a note on the treble
  // staff, find it on the keyboard, play it with the right finger, hear it. Staff,
  // keyboard and fingering shown together throughout. No timing scored.
  // ===========================================================================
  {
    eyebrow: 'Stage 3 \u00B7 Reading & playing', title: 'Reading while you play', id: 's3-welcome',
    say: [
      { text: 'Welcome to Stage 3. Here we join two things you already have: reading the staff, and playing with your hand.', pauseAfter: 640, tone: 'warm' },
      { text: 'From now on, when you play, you\u2019ll often see the note on the staff, the key on the keyboard, and the finger to use \u2014 all at once. Eye, staff, finger, key, sound.', pauseAfter: 360 },
    ],
    explain: ['Stage 3 joins reading and playing into one loop: see the note on the staff, find the key, play it with the right finger, hear it.', 'The staff, the keyboard and the fingering appear together \u2014 so what you see and what your hand does become the same thing.'],
    show: { kind: 'staff', clef: 'treble', notes: [64], caption: 'See it, find it, play it.' },
    mode: 'none',
  },
  {
    eyebrow: 'Treble landmarks', title: 'G on the second line', id: 's3-landmark-g',
    say: [
      { text: 'A landmark to anchor your reading: the note G sits on the second line of the treble staff \u2014 the line the treble clef curls around.', pauseAfter: 660, tone: 'warm' },
      { text: 'That G is the G just above Middle C. Find it and play it with finger two.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The treble clef curls around the second line \u2014 the line for G, just above Middle C. It\u2019s a reading landmark.', 'Find that G and play it with finger 2.'],
    show: { kind: 'keys', midis: [67], caption: 'G \u2014 second line of the treble staff.', label: 'G' },
    staffHint: { clef: 'treble', notes: [67] },
    handHint: { hand: 'right', highlight: [2] },
    demo: [67], demoGap: 0.45,
    tryPrompt: 'Play the G shown on the staff \u2014 just above Middle C, with finger 2.', targets: [67], mode: 'one',
    okMsg: 'Yes \u2014 G on the second line. Landmarks like this let you read by sight, without counting every line.',
    hint: 'G is the white key just above the two-black-key group, near the middle.',
  },
  {
    eyebrow: 'Reading on the staff', title: 'Three notes, going up', id: 's3-read-up',
    say: [
      { text: 'Now follow a short rise: C, D, E, climbing from Middle C \u2014 each note a step higher on the staff.', pauseAfter: 620, tone: 'warm' },
      { text: 'Higher on the staff means higher in sound. Play them in order, fingers one, two, three.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Notes climbing the staff climb in pitch. Read C, D, E rising from Middle C.', 'Play them in order with fingers 1, 2, 3 \u2014 watching the notes rise as your hand moves.'],
    show: { kind: 'keys', midis: [60, 62, 64], caption: 'C, D, E \u2014 rising on the staff.', label: 'C D E' },
    staffHint: { clef: 'treble', notes: [{ midi: 60, finger: 1 }, { midi: 62, finger: 2 }, { midi: 64, finger: 3 }] },
    handHint: { hand: 'right', highlight: [1, 2, 3] },
    demo: [60, 62, 64], demoGap: 0.46,
    tryPrompt: 'Play the rise you see: C, D, E (fingers 1, 2, 3).', targets: [60, 62, 64], mode: 'sequence',
    okMsg: 'There \u2014 the notes rose on the staff and your hand rose with them. That match is reading.',
    hint: 'From Middle C: C, then D, then E \u2014 fingers 1, 2, 3.',
  },
  {
    eyebrow: 'Reading on the staff', title: 'Which note is higher?', id: 's3-direction',
    say: [
      { text: 'A quick test of direction. Two notes are on the staff \u2014 one sits higher than the other.', pauseAfter: 560, tone: 'warm' },
      { text: 'The higher note on the staff is the higher sound. Play the higher one.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Staff height shows pitch: the note placed higher sounds higher. Here, G sits well above Middle C.', 'Play the higher note \u2014 the G.'],
    show: { kind: 'keys', midis: [67], caption: 'Play the higher note.', label: 'higher = G' },
    staffHint: { clef: 'treble', notes: [60, 67] },
    demo: [67], demoGap: 0.45,
    tryPrompt: 'Play the higher of the two notes on the staff.', targets: [67], mode: 'one',
    okMsg: 'Yes \u2014 higher on the staff, higher in sound, further right on the keyboard. Direction connects all three.',
    hint: 'The higher note on the staff is G, above Middle C.',
  },
  {
    eyebrow: 'Fingering while reading', title: 'A pattern with fingers', id: 's3-read-fingered',
    say: [
      { text: 'Now follow a small pattern with a finger ready for each note: C, D, E, then back to D.', pauseAfter: 600, tone: 'warm' },
      { text: 'Fingers one, two, three, two. Let your eye lead and your hand follow.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Follow the pattern C, D, E, D \u2014 a small there-and-back. Fingers 1, 2, 3, 2.', 'A finger ready for each note is what keeps reading smooth.'],
    show: { kind: 'keys', midis: [60, 62, 64, 62], caption: 'C, D, E, D.', label: 'C D E D' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 62] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 2] },
    demo: [60, 62, 64, 62], demoGap: 0.44,
    tryPrompt: 'Play the pattern: C, D, E, D (fingers 1, 2, 3, 2).', targets: [60, 62, 64, 62], mode: 'sequence',
    okMsg: 'Good \u2014 read, fingered, played. The eye-to-hand loop is getting smoother.',
    hint: 'C, D, E, then back to D \u2014 fingers 1, 2, 3, 2.',
  },
  {
    eyebrow: 'Right-hand patterns', title: 'Up to F and back', id: 's3-rh-pattern',
    say: [
      { text: 'A longer line now, still all steps: C, D, E, F, E.', pauseAfter: 580, tone: 'warm' },
      { text: 'Fingers one, two, three, four, three. Keep the hand quiet \u2014 only the fingers move.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Follow a five-note line: C, D, E, F, E \u2014 up to F and back a step. Fingers 1, 2, 3, 4, 3.', 'Keep the hand settled; let the fingers do the moving.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 64], caption: 'C, D, E, F, E.', label: 'C D E F E' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 65, 64] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 4, 3] },
    demo: [60, 62, 64, 65, 64], demoGap: 0.4,
    tryPrompt: 'Play C, D, E, F, E in order (fingers 1, 2, 3, 4, 3).', targets: [60, 62, 64, 65, 64], mode: 'sequence',
    okMsg: 'That\u2019s it \u2014 a five-note line, played in order. Your hand is learning to stay home while the fingers travel.',
    hint: 'C up to F, then one step back to E \u2014 fingers 1, 2, 3, 4, 3.',
  },
  {
    eyebrow: 'Right-hand patterns', title: 'Five notes, coming down', id: 's3-rh-down',
    say: [
      { text: 'Now from the top down: G, F, E, D, C \u2014 the five-finger position, descending.', pauseAfter: 580, tone: 'warm' },
      { text: 'Fingers five, four, three, two, one. Even and unhurried.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Descend the five-finger position: G, F, E, D, C. Fingers 5, 4, 3, 2, 1.', 'This is the right hand\u2019s home position \u2014 a thumb-to-little-finger span you\u2019ll use constantly.'],
    show: { kind: 'keys', midis: [67, 65, 64, 62, 60], caption: 'G, F, E, D, C \u2014 coming down.', label: 'G F E D C' },
    staffHint: { clef: 'treble', notes: [67, 65, 64, 62, 60] },
    handHint: { hand: 'right', highlight: [5, 4, 3, 2, 1] },
    demo: [67, 65, 64, 62, 60], demoGap: 0.4,
    tryPrompt: 'Play G, F, E, D, C coming down (fingers 5, 4, 3, 2, 1).', targets: [67, 65, 64, 62, 60], mode: 'sequence',
    okMsg: 'Good \u2014 the five-finger position, top to bottom. This shape underlies the C scale and much more.',
    hint: 'Start on G with finger 5, then step down to Middle C with the thumb.',
  },
  {
    eyebrow: 'Reading with pulse', title: 'Playing in time', id: 's3-read-pulse',
    say: [
      { text: 'Let\u2019s add the pulse back. Listen to the count of four, then play four steady notes \u2014 C, D, E, F, one on each beat.', pauseAfter: 640, tone: 'warm' },
      { text: 'Reading, fingering and pulse together now \u2014 unhurried.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Reading and playing in time: after the count, play C, D, E, F \u2014 one note per beat, even and calm.', 'Music groups beats in different ways; we keep to a steady four here. Nothing is scored \u2014 the count is support.'],
    show: { kind: 'pulse', caption: 'A note on each beat: 1 2 3 4.' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 65] },
    tryPrompt: 'After the count, play four notes \u2014 one on each beat.', mode: 'count', count: 4,
    okMsg: 'Yes \u2014 reading and playing carried on a steady pulse. That\u2019s how written music actually moves.',
    hint: 'Wait for the count to finish, then four even notes \u2014 C, D, E, F is a good choice.',
  },
  {
    eyebrow: 'B major, with the staff', title: 'B, C\u266F, D\u266F from the staff', id: 's3-bmaj-staff',
    say: [
      { text: 'Bring the B-major shape into your reading. These three notes are B, C sharp, D sharp \u2014 the start of B major, right hand.', pauseAfter: 680, tone: 'warm' },
      { text: 'Thumb on B, finger two on C sharp, finger three on D sharp. The long fingers reach the black keys, just as your hand wants to.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The B-major shape, now read from the staff: B, C\u266F, D\u266F with fingers 1, 2, 3.', 'White key under the thumb, long fingers up onto the black keys \u2014 the ergonomic shape, connected to what you see.'],
    show: { kind: 'keys', midis: [71, 73, 75], caption: '1 on B, 2 on C\u266F, 3 on D\u266F.', label: 'B C\u266F D\u266F' },
    staffHint: { clef: 'treble', notes: [71, 73, 75] },
    handHint: { hand: 'right', highlight: [1, 2, 3] },
    demo: [71, 73, 75], demoGap: 0.5,
    tryPrompt: 'Right hand: play B, C\u266F, D\u266F (fingers 1, 2, 3).', targets: [71, 73, 75], mode: 'sequence',
    okMsg: 'Good \u2014 the B-major hand shape, played from the staff. This is the pathway the Scales Masterclass develops in full.',
    hint: 'B (white) under the thumb, then up onto the two black keys C\u266F and D\u266F.',
  },
  {
    eyebrow: 'Building a phrase', title: 'A rising-and-falling line', id: 's3-phrase',
    say: [
      { text: 'Let\u2019s shape a longer line: C, E, G, E, C \u2014 up through a chord shape and back home.', pauseAfter: 620, tone: 'warm' },
      { text: 'Fingers one, two, three, two, one. Let it sound like one idea, not five separate notes.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Shape a phrase: C, E, G, E, C \u2014 rising through a chord shape, then settling home. Fingers 1, 2, 3, 2, 1.', 'Aim for one connected line, not five separate notes.'],
    show: { kind: 'keys', midis: [60, 64, 67, 64, 60], caption: 'C, E, G, E, C.', label: 'C E G E C' },
    staffHint: { clef: 'treble', notes: [60, 64, 67, 64, 60] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 2, 1] },
    demo: [60, 64, 67, 64, 60], demoGap: 0.42,
    tryPrompt: 'Play the line: C, E, G, E, C (fingers 1, 2, 3, 2, 1).', targets: [60, 64, 67, 64, 60], mode: 'sequence',
    okMsg: 'Good \u2014 up and home again. Read, fingered, shaped: that is a phrase, and you played it whole.',
    hint: 'C, E, G, then back E, C \u2014 fingers 1, 2, 3, 2, 1.',
  },
  {
    eyebrow: 'Stage 3 review', title: 'Checkpoint: see and play', id: 's3-review',
    say: [
      { text: 'A calm checkpoint \u2014 let\u2019s bring this together. Play this short rise once more: C, D, E, F, G.', pauseAfter: 620, tone: 'warm' },
      { text: 'The whole five-finger position, going up. Fingers one to five.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['From memory and from the staff: C, D, E, F, G \u2014 the five-finger position rising. Fingers 1, 2, 3, 4, 5.', 'Just reading and playing what you\u2019ve built \u2014 take it steadily.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67], caption: 'C, D, E, F, G.', label: 'C D E F G' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 65, 67] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 4, 5] },
    demo: [60, 62, 64, 65, 67], demoGap: 0.4,
    tryPrompt: 'Play C, D, E, F, G rising (fingers 1, 2, 3, 4, 5).', targets: [60, 62, 64, 65, 67], mode: 'sequence',
    okMsg: 'Good \u2014 the five-finger position, played from the staff, top to bottom. Stage 3 is yours.',
    hint: 'From Middle C up five white keys: C, D, E, F, G \u2014 fingers 1 to 5.',
  },
  {
    eyebrow: 'Stage 3 complete', title: 'On to two hands', id: 's3-onward',
    say: [
      { text: 'That\u2019s Stage 3 \u2014 you\u2019re reading from the staff and playing in one motion, right hand leading.', pauseAfter: 620, tone: 'warm' },
      { text: 'Stage 4 brings in the left hand and the bass clef, and joins them on the grand staff. The Course keeps going.', pauseAfter: 360, tone: 'warm' },
    ],
    explain: ['Stage 3 complete \u2014 eye, staff, finger, key and sound are working as one, right hand leading.', 'Stage 4 adds the left hand, the bass clef, and the grand staff that joins them. Continue below.'],
    bridge: { label: 'Optional \u2014 open a practice room for deeper practice', hash: '#/scales' },
    mode: 'none',
  },

];
