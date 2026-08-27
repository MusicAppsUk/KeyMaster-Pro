// courseKeyLevel3.js
// KeyMaster Course · Key Level 3 — Pattern Fluency.
//
// THE PREMISE. By the end of KL2 the learner reads accurately but slowly, one
// note at a time. Fluency is not finger speed — it is CHUNKING: seeing "third,
// then step down" instead of five separate note-heads. This level trains the
// eye and the ear to group, so that reading becomes recognition rather than
// decoding. That is Recognition Before Execution applied to reading itself.
//
// KL3 teaching spine:
//   Ch1  Reading by Distance   — 2nds and 3rds named by SHAPE on the page
//   Ch2  Wider Steps           — 4ths and 5ths; the look of a leap
//   Ch3  The Thumb Passes Under — first real technical mechanism; unlocks
//                                 passages wider than five notes
//   Ch4  The C Major Scale     — one octave, one hand, as a single gesture
//   Ch5  Patterns That Repeat  — sequence; the first WRAPPED notation
//   Ch6  Riverlight            — a longer piece, read across two systems
//   Ch7  Reading Ahead         — scan-before-play as an explicit habit
//   Ch8  Key Level 3 Review    — undemonstrated sight-reading
//
// INFRASTRUCTURE. This level is the first consumer of multi-system wrapping
// (staffViz.js rc2-215, `systems: [n, …]`). Passages here exceed what one line
// can hold legibly, and faking that by cramming would teach bad reading.
//
// CONSTRAINTS HONOURED (verified against staffViz.js in this repo):
//   • Note values: whole / half / dotted-half / quarter / dotted-quarter /
//     eighth / dotted-eighth — all supported.
//   • Accidentals and key signatures supported since rc2-213.
//   • NO simultaneous notes anywhere. The renderer lays notes out sequentially
//     along the x-axis and cannot draw two pitches sounding together. Chords
//     are therefore deferred to KL4, where they are taught properly once the
//     renderer supports them. Nothing here pretends otherwise.

export const KEY_LEVEL3_STEPS = [

  // ===== Chapter 1 — Reading by Distance =================================
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Key Level 3 begins', id: 'kl3-welcome',
    say: [
      { text: 'Key Level 2 gave you real pieces. You can read them \u2014 but you read them one note at a time, and that is slow.', pauseAfter: 660, tone: 'warm' },
      { text: 'Key Level 3 changes how you look at the page. Fluent readers do not see notes. They see distances, shapes and patterns \u2014 and they see them in groups.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['Key Level 3 \u2014 Pattern Fluency. The goal is not faster fingers; it is faster reading.', 'Fluent readers group what they see: a distance, a shape, a repeated figure. This level trains that grouping directly.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'A step, seen not counted', id: 'kl3-step-see',
    say: [
      { text: 'Two notes side by side on the page \u2014 line to the space just above, or space to the next line. That is a step, and it is always the very next key.', pauseAfter: 680, tone: 'warm' },
      { text: 'Do not count it. Recognise it. A step has a look, and you already know it.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['A step (a second) moves from a line to the adjacent space, or a space to the adjacent line. On the keyboard it is always the very next key.', 'The aim is recognition, not arithmetic. A step has a distinctive appearance \u2014 learn the look and stop counting.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false, notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 62, value: 'quarter', finger: 2 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'quarter', finger: 2 },
    ], caption: 'Line to space, space to line \u2014 every one of these is a step.' },
    demo: [60, 62, 64, 62], demoGap: 0.45,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'A skip, seen not counted', id: 'kl3-skip-see',
    say: [
      { text: 'Now a skip \u2014 a third. Line to the next line, or space to the next space. The two note-heads sit stacked with a gap between them.', pauseAfter: 680, tone: 'warm' },
      { text: 'Line-to-line, space-to-space. Once you see that, you never count a third again.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['A skip (a third) moves line-to-line or space-to-space, leaving one key untouched between them.', 'This is the single most useful shape in reading. Recognising line-to-line instantly removes most counting from most music.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false, notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 62, value: 'quarter', finger: 2 }, { midi: 65, value: 'quarter', finger: 4 },
    ], caption: 'Line to line, space to space \u2014 every one of these is a skip.' },
    demo: [60, 64, 62, 65], demoGap: 0.45,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Steps and skips together', id: 'kl3-mixed-play',
    say: [
      { text: 'Here they are mixed. Before you play, read the line as a sequence of distances \u2014 step, skip, step, skip \u2014 rather than as five separate notes.', pauseAfter: 700, tone: 'warm' },
      { text: 'Name the distances to yourself first. Then play.', pauseAfter: 400, tone: 'instruct' },
    ],
    explain: ['Read this as a chain of distances, not a list of notes: step up, skip up, step down, skip down.', 'Naming distances before playing is the habit that converts decoding into reading.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 62, value: 'quarter', finger: 2 },
      { midi: 65, value: 'quarter', finger: 4 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 60, value: 'whole', finger: 1 },
    ], bars: [4], caption: 'Step up, skip up, step down, skip down \u2014 then home.' },
    demo: [60, 62, 65, 64, 60], demoGap: 0.42,
    tryPrompt: 'Read the distances, then play \u2014 step, skip, step, skip, home.',
    targets: [60, 62, 65, 64, 60], mode: 'sequence',
    okMsg: 'Read as distances rather than notes \u2014 that is the whole of this level in one line. Excellent.',
    hint: 'From the thumb: one key up, then jump past one, then one key back down, then jump back down to home.',
    reteach: 'Gently \u2014 the lit keys will show the path. Watch how far each note moves from the one before it.',
    support: { highlight: [60, 62, 65, 64], replay: true },
  },

  // ===== Chapter 2 — Wider Steps ========================================
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Fourths and fifths', id: 'kl3-wide-see',
    say: [
      { text: 'Wider distances have their own look too. A fourth reaches from a line to the space beyond the next line \u2014 a fifth spans line to line with a whole line between them.', pauseAfter: 700, tone: 'warm' },
      { text: 'A fifth is the reach from your thumb to your little finger without moving the hand. You have felt that shape since Key Level 1.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['A fourth spans line-to-space (or space-to-line) with one line skipped. A fifth spans line-to-line with a full line between.', 'A fifth is exactly your five-finger hand span \u2014 thumb to little finger. You already know it physically; now learn its look.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false, notes: [
      { midi: 60, value: 'half', finger: 1 }, { midi: 65, value: 'half', finger: 4 },
      { midi: 60, value: 'half', finger: 1 }, { midi: 67, value: 'half', finger: 5 },
    ], bars: [2], caption: 'First a fourth, then a fifth \u2014 the fifth is your whole hand span.' },
    demo: [60, 65, 60, 67], demoGap: 0.55,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Name the leap, then play it', id: 'kl3-wide-play',
    say: [
      { text: 'Four distances, each one different. Look at each pair and name the leap before your hand moves.', pauseAfter: 660, tone: 'warm' },
      { text: 'The eye should always be one step ahead of the fingers. Always.', pauseAfter: 400, tone: 'instruct' },
    ],
    explain: ['Each pair here is a different distance. Name it before you play it \u2014 that is the drill.', 'The eye leads the hand. If your fingers reach the note before your eyes have read it, the reading has failed.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 67, value: 'quarter', finger: 5 },
      { midi: 62, value: 'quarter', finger: 2 }, { midi: 65, value: 'quarter', finger: 4 },
      { midi: 64, value: 'half', finger: 3 }, { midi: 60, value: 'half', finger: 1 },
    ], bars: [4], caption: 'A fifth, then a fourth, then a step down \u2014 name each before you play.' },
    demo: [60, 67, 62, 65, 64, 60], demoGap: 0.42,
    tryPrompt: 'Name each distance, then play the line.',
    targets: [60, 67, 62, 65, 64, 60], mode: 'sequence',
    okMsg: 'Every leap read before it was played. That is the eye leading the hand \u2014 exactly right.',
    hint: 'Thumb, then the little finger. Then second finger, then fourth. Then the middle, then home.',
    reteach: 'Gently \u2014 the lit keys will guide you. Notice the wide jumps happen between the first pairs.',
    support: { highlight: [60, 67, 62, 65, 64], replay: true },
  },

  // ===== Chapter 3 — The Thumb Passes Under =============================
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Beyond five notes', id: 'kl3-thumb-why',
    say: [
      { text: 'Every piece so far has fitted inside five keys, because you have five fingers. Real music does not stop at five.', pauseAfter: 660, tone: 'warm' },
      { text: 'Pianists solve this with one quiet movement \u2014 the thumb passes underneath the hand and lands further along, so the hand can keep travelling.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['Music regularly moves beyond a five-note hand span. The hand must be able to travel without a jump or a gap in the sound.', 'The solution is the thumb passing under the fingers to land further along the keyboard. It is the single most important technical mechanism in piano playing.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'The movement itself', id: 'kl3-thumb-move',
    say: [
      { text: 'Play C, D, E with fingers one, two, three. As the third finger sounds E, quietly tuck the thumb underneath and let it wait beneath the third finger.', pauseAfter: 700, tone: 'warm' },
      { text: 'The wrist stays level. No lurch, no twist. The thumb travels under a calm hand \u2014 that is the whole secret.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['Play C, D, E with fingers 1, 2, 3. While the third finger holds E, move the thumb under the hand so it waits beneath finger 3.', 'Keep the wrist level and quiet. The elbow does not swing out. A calm hand is what makes the join inaudible.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false, notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 62, value: 'quarter', finger: 2 },
      { midi: 64, value: 'quarter', finger: 3 },
    ], caption: 'One, two, three \u2014 and the thumb quietly travels under.' },
    demo: [60, 62, 64], demoGap: 0.5,
    tryPrompt: 'Play C, D, E with fingers one, two, three \u2014 and tuck the thumb under as you hold E.',
    targets: [60, 62, 64], mode: 'sequence',
    okMsg: 'Three notes, and a thumb quietly waiting where it needs to be. That small movement opens the whole keyboard.',
    hint: 'Thumb, second finger, third finger \u2014 stepping upward from home.',
    reteach: 'Gently \u2014 three white keys in a row going up, one finger each. The lit keys will show you.',
    support: { highlight: [60, 62, 64], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'The join, made smooth', id: 'kl3-thumb-join',
    say: [
      { text: 'Now use it. Play C, D, E with one, two, three \u2014 then the thumb takes F, and the hand simply continues from there with two and three.', pauseAfter: 700, tone: 'warm' },
      { text: 'Listen for the join. If you can hear where the thumb came under, it was not smooth enough. Try it again more quietly.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['Fingering: 1-2-3 on C, D, E, then the thumb takes F, then 2 and 3 continue on G and A.', 'The test is aural, not visual: a listener should not be able to hear where the thumb passed under. Smoothness is the whole point.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 62, value: 'quarter', finger: 2 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 65, value: 'quarter', finger: 1 }, { midi: 67, value: 'quarter', finger: 2 }, { midi: 69, value: 'quarter', finger: 3 },
    ], bars: [3], caption: 'The thumb takes F \u2014 and the hand keeps travelling.' },
    demo: [60, 62, 64, 65, 67, 69], demoGap: 0.42,
    tryPrompt: 'Play the six notes \u2014 thumb under at F, and keep the sound joined.',
    targets: [60, 62, 64, 65, 67, 69], mode: 'sequence',
    okMsg: 'Six notes on a hand built for five, and the join did not show. That is real piano technique.',
    hint: 'Six white keys stepping upward from home. Watch the fingering \u2014 the thumb returns on the fourth note.',
    reteach: 'Gently \u2014 six steps up the white keys. The lit keys show the path; the numbers show which finger takes each one.',
    support: { highlight: [60, 62, 64, 65, 67, 69], replay: true },
  },

  // ===== Chapter 4 — The C Major Scale ==================================
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'The scale, as one gesture', id: 'kl3-scale-up',
    say: [
      { text: 'Now the whole octave. Eight notes, C to C, with the thumb passing under exactly once \u2014 and it is the same movement you have just learned.', pauseAfter: 700, tone: 'warm' },
      { text: 'Do not think of eight notes. Think of one rising gesture, with a join in the middle.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['The C major scale, one octave: fingers 1-2-3, thumb under, then 1-2-3-4-5. One thumb-under, eight notes.', 'Read and feel it as a single gesture rather than eight decisions. That reframing is what makes scales fluent instead of laborious.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 62, value: 'quarter', finger: 2 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 65, value: 'quarter', finger: 1 },
      { midi: 67, value: 'quarter', finger: 2 }, { midi: 69, value: 'quarter', finger: 3 },
      { midi: 71, value: 'quarter', finger: 4 }, { midi: 72, value: 'quarter', finger: 5 },
    ], bars: [4], caption: 'C major, one octave \u2014 one thumb-under, one gesture.' },
    demo: [60, 62, 64, 65, 67, 69, 71, 72], demoGap: 0.36,
    tryPrompt: 'Play the C major scale upward \u2014 one octave, smooth throughout.',
    targets: [60, 62, 64, 65, 67, 69, 71, 72], mode: 'sequence',
    okMsg: 'A full octave, evenly played, with the join invisible. The C major scale is genuinely yours now.',
    hint: 'Eight white keys in a row upward from home. The thumb comes under on the fourth note.',
    reteach: 'Gently \u2014 climb the white keys one at a time from home to the next home. The lit keys will guide you.',
    support: { highlight: [60, 62, 64, 65, 67, 69, 71, 72], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Coming down', id: 'kl3-scale-down',
    say: [
      { text: 'Descending, the mechanism reverses \u2014 the third finger crosses OVER the thumb instead of the thumb passing under.', pauseAfter: 680, tone: 'warm' },
      { text: 'Same calm wrist, same quiet join. Five, four, three, two, one \u2014 then three crosses over, and two, one bring you home.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['Descending: 5-4-3-2-1, then finger 3 crosses over the thumb, then 2 and 1 finish. The mirror of the ascent.', 'The wrist stays as calm coming down as going up. The crossing should be as inaudible as the thumb-under was.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 72, value: 'quarter', finger: 5 }, { midi: 71, value: 'quarter', finger: 4 },
      { midi: 69, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 2 },
      { midi: 65, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 62, value: 'quarter', finger: 2 }, { midi: 60, value: 'quarter', finger: 1 },
    ], bars: [4], caption: 'Descending \u2014 the third finger crosses over the thumb.' },
    demo: [72, 71, 69, 67, 65, 64, 62, 60], demoGap: 0.36,
    tryPrompt: 'Play the C major scale downward \u2014 one octave, smooth throughout.',
    targets: [72, 71, 69, 67, 65, 64, 62, 60], mode: 'sequence',
    okMsg: 'Down as cleanly as up. The scale now works in both directions \u2014 that is a genuine technical milestone.',
    hint: 'Eight white keys stepping down from the upper home to the lower one.',
    reteach: 'Gently \u2014 start high and step down each white key in turn. The lit keys will show the way.',
    support: { highlight: [72, 71, 69, 67, 65, 64, 62, 60], replay: true },
  },

  // ===== Chapter 5 — Patterns That Repeat (first WRAPPED notation) ======
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'The same shape, moved', id: 'kl3-sequence-see',
    say: [
      { text: 'Here is the most useful discovery in all of reading. Look at these four bars \u2014 and notice that bars three and four are bars one and two, simply moved higher.', pauseAfter: 720, tone: 'warm' },
      { text: 'That is called a sequence. Once you spot it, you have only half as much to read.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['A sequence is the same melodic shape repeated at a different pitch. Bars 3-4 here are bars 1-2 moved up a step.', 'Spotting a sequence halves the reading. Fluent readers hunt for repetition first and read only what is genuinely new.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 62, value: 'quarter', finger: 2 }, { midi: 60, value: 'quarter', finger: 1 },
      { midi: 62, value: 'quarter', finger: 2 }, { midi: 65, value: 'quarter', finger: 4 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'quarter', finger: 2 },
    ], bars: [4], systems: [5],
      caption: 'The second line is the first line, moved up one step. Read it once, play it twice.' },
    demo: [60, 64, 62, 60, 62, 65, 64, 62], demoGap: 0.4,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Play the sequence', id: 'kl3-sequence-play',
    say: [
      { text: 'Now play it. You are not reading eight notes \u2014 you are reading four, and then playing them again one step higher.', pauseAfter: 680, tone: 'warm' },
      { text: 'Let that change how it feels. The second half should arrive already familiar.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['Play the sequence. Read the first line properly, then recognise the second as the same shape moved up a step.', 'The second line should feel like recall rather than reading. That feeling is fluency arriving.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 62, value: 'quarter', finger: 2 }, { midi: 60, value: 'quarter', finger: 1 },
      { midi: 62, value: 'quarter', finger: 2 }, { midi: 65, value: 'quarter', finger: 4 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'quarter', finger: 2 },
    ], bars: [4], systems: [5],
      caption: 'Read the first line. Recognise the second.' },
    demo: [60, 64, 62, 60, 62, 65, 64, 62], demoGap: 0.4,
    tryPrompt: 'Play the sequence \u2014 the second line is the first, moved up a step.',
    targets: [60, 64, 62, 60, 62, 65, 64, 62], mode: 'sequence',
    okMsg: 'Read once, played twice. That is what pattern recognition buys you \u2014 and it works on real music too.',
    hint: 'Home, skip up, step down, home. Then the same shape again, starting one key higher.',
    reteach: 'Gently \u2014 play the first four notes, then play the same shape again beginning one key higher. The lit keys will guide you.',
    support: { highlight: [60, 64, 62, 65], replay: true },
  },

  // ===== Chapter 6 — Riverlight (read across two systems) ===============
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Riverlight \u2014 listen first', id: 'kl3-riverlight-listen',
    say: [
      { text: 'Riverlight is the longest piece you have met \u2014 too long for a single line, so it is written across two, exactly as real sheet music is.', pauseAfter: 700, tone: 'warm' },
      { text: 'Listen for the sequence inside it. The shape that opens the piece comes back, moved.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['Riverlight: seven bars, written across two systems \u2014 the first piece in the course that wraps onto a second line.', 'It contains a sequence. Find it by ear on this first hearing, before you read a note.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 },
      { midi: 65, value: 'dotted-half', finger: 4 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'eighth', finger: 2 }, { midi: 64, value: 'eighth', finger: 3 },
      { midi: 65, value: 'quarter', finger: 4 },
      { midi: 62, value: 'quarter', finger: 2 }, { midi: 65, value: 'quarter', finger: 4 }, { midi: 69, value: 'quarter', finger: 5 },
      { midi: 67, value: 'dotted-half', finger: 4 },
      { midi: 65, value: 'quarter', finger: 4 }, { midi: 64, value: 'eighth', finger: 3 }, { midi: 62, value: 'eighth', finger: 2 },
      { midi: 64, value: 'quarter', finger: 3 },
      { midi: 60, value: 'dotted-half', finger: 1 },
    ], beams: [[6, 7], [14, 15]], bars: [3, 4, 8, 11, 12, 16], systems: [9],
      marks: [{ at: 1, text: 'p' }, { at: 9, text: 'f' }, { at: 13, text: 'p' }],
      caption: 'Riverlight \u2014 seven bars across two lines.' },
    demo: [60, 64, 67, 65, 64, 62, 64, 65, 62, 65, 69, 67, 65, 64, 62, 64, 60], demoGap: 0.4,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Riverlight \u2014 the first line', id: 'kl3-riverlight-a',
    say: [
      { text: 'Take the first line alone \u2014 four bars, rising then settling, with one quick pair inside it.', pauseAfter: 660, tone: 'warm' },
      { text: 'Learn it properly before you look at the second line. Half a piece played well beats a whole piece played badly.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['The first line of Riverlight: four bars in three-time, rising to a held note, then a quicker figure settling.', 'Master one line before moving on. Fluency is built from secure sections, not from repeated struggling run-throughs.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 },
      { midi: 65, value: 'dotted-half', finger: 4 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'eighth', finger: 2 }, { midi: 64, value: 'eighth', finger: 3 },
      { midi: 65, value: 'quarter', finger: 4 },
    ], beams: [[6, 7]], bars: [3, 4], marks: [{ at: 1, text: 'p' }],
      caption: 'Riverlight, first line \u2014 learn this before going on.' },
    demo: [60, 64, 67, 65, 64, 62, 64, 65], demoGap: 0.4,
    tryPrompt: 'Play the first line of Riverlight \u2014 quietly, in three-time.',
    targets: [60, 64, 67, 65, 64, 62, 64, 65], mode: 'sequence',
    okMsg: 'The first line, secure. Now the second will come far more easily than you expect.',
    hint: 'Rise home-skip-skip, hold. Then step down, a quick pair, and settle.',
    reteach: 'Gently \u2014 climb three notes, hold the fourth for a whole bar, then a stepping figure with two quick notes. The lit keys will guide you.',
    support: { highlight: [60, 64, 67, 65, 62], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Riverlight \u2014 perform it whole', id: 'kl3-riverlight-perform',
    say: [
      { text: 'Now both lines. When your eye reaches the end of the first line, it must already know where the second begins \u2014 that jump back is a reading skill in itself.', pauseAfter: 720, tone: 'warm' },
      { text: 'Do not stop at the line break. The music does not stop there; neither should you.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['Perform Riverlight complete, across both systems. The eye must travel back to the start of the second line without the music pausing.', 'Line breaks are where inexperienced readers stumble. Practising the join deliberately is what removes the stumble.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 },
      { midi: 65, value: 'dotted-half', finger: 4 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'eighth', finger: 2 }, { midi: 64, value: 'eighth', finger: 3 },
      { midi: 65, value: 'quarter', finger: 4 },
      { midi: 62, value: 'quarter', finger: 2 }, { midi: 65, value: 'quarter', finger: 4 }, { midi: 69, value: 'quarter', finger: 5 },
      { midi: 67, value: 'dotted-half', finger: 4 },
      { midi: 65, value: 'quarter', finger: 4 }, { midi: 64, value: 'eighth', finger: 3 }, { midi: 62, value: 'eighth', finger: 2 },
      { midi: 64, value: 'quarter', finger: 3 },
      { midi: 60, value: 'dotted-half', finger: 1 },
    ], beams: [[6, 7], [14, 15]], bars: [3, 4, 8, 11, 12, 16], systems: [9],
      marks: [{ at: 1, text: 'p' }, { at: 9, text: 'f' }, { at: 13, text: 'p' }],
      caption: 'Riverlight \u2014 performed whole, across both lines.' },
    demo: [60, 64, 67, 65, 64, 62, 64, 65, 62, 65, 69, 67, 65, 64, 62, 64, 60], demoGap: 0.4,
    tryPrompt: 'Perform Riverlight \u2014 both lines, without stopping at the break.',
    targets: [60, 64, 67, 65, 64, 62, 64, 65, 62, 65, 69, 67, 65, 64, 62, 64, 60], mode: 'sequence',
    okMsg: 'Seventeen notes across two systems, with the line break crossed without a stumble. That is genuine reading fluency.',
    hint: 'The second line begins like the first but one step higher, and climbs further before coming home.',
    reteach: 'Gently \u2014 play the first line, then begin the second a step higher. It ends by stepping all the way home. The lit keys will guide you.',
    support: { highlight: [60, 64, 67, 65, 62, 69], replay: true },
  },

  // ===== Chapter 7 — Reading Ahead ======================================
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'The eye goes first', id: 'kl3-scan-teach',
    say: [
      { text: 'One habit separates fluent readers from everyone else, and it is not talent. They look ahead.', pauseAfter: 640, tone: 'warm' },
      { text: 'Before playing a single note, spend ten seconds scanning: what key, what time, where are the leaps, where does it repeat, and where is the hardest bar. Then begin.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['Fluent reading is a scanning habit, not a gift. Before playing, look for: the key, the time signature, the widest leap, any repetition, and the hardest bar.', 'Ten seconds of scanning prevents most of the stumbles that ten minutes of repetition would be needed to fix.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Scan, then play', id: 'kl3-scan-play',
    say: [
      { text: 'Scan this one before you touch a key. Find the widest leap, and find the bar that repeats. Take your time \u2014 there is no hurry.', pauseAfter: 700, tone: 'warm' },
      { text: 'When you have found both, and only then, play it through without stopping.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['Scan first: locate the widest leap and the repeated bar before playing anything.', 'Then play through without stopping. Continuity matters more than perfection \u2014 a musician who stops has lost more than one who plays on.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 67, value: 'quarter', finger: 5 },
      { midi: 65, value: 'eighth', finger: 4 }, { midi: 64, value: 'eighth', finger: 3 },
      { midi: 62, value: 'quarter', finger: 2 },
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 67, value: 'quarter', finger: 5 },
      { midi: 65, value: 'eighth', finger: 4 }, { midi: 64, value: 'eighth', finger: 3 },
      { midi: 62, value: 'quarter', finger: 2 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'quarter', finger: 2 },
      { midi: 60, value: 'half', finger: 1 },
    ], beams: [[3, 4], [8, 9]], bars: [5, 10], systems: [6],
      caption: 'Scan for the leap and the repeat \u2014 then play through without stopping.' },
    tryPrompt: 'Scan it, then play it through without stopping.',
    targets: [60, 67, 65, 64, 62, 60, 67, 65, 64, 62, 64, 62, 60], mode: 'sequence',
    okMsg: 'Scanned, then played through unbroken. That is exactly how an experienced reader approaches an unfamiliar page.',
    hint: 'The first bar and the second bar are identical. The last bar steps quietly home.',
    reteach: 'Gently \u2014 the same bar happens twice, then a short descent home. The lit keys will guide you.',
    support: { highlight: [60, 67, 65, 64, 62], replay: true },
  },

  // ===== Chapter 8 — Key Level 3 Review =================================
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Sight-reading check', id: 'kl3-review-read',
    say: [
      { text: 'A phrase you have never heard, and I will not play it for you. Scan it, hear it in your head, then play.', pauseAfter: 680, tone: 'warm' },
      { text: 'Everything this level has taught is in those three actions.', pauseAfter: 400, tone: 'instruct' },
    ],
    explain: ['Sight-read this with no demonstration: scan it, hear it internally, then play it through.', 'Scan, hear, play \u2014 in that order. That sequence is the whole of Key Level 3 in three words.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4], notes: [
      { midi: 67, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 3 }, { midi: 74, value: 'quarter', finger: 5 },
      { midi: 72, value: 'dotted-half', finger: 4 },
      { midi: 71, value: 'quarter', finger: 3 }, { midi: 69, value: 'eighth', finger: 2 }, { midi: 71, value: 'eighth', finger: 3 },
      { midi: 72, value: 'quarter', finger: 4 },
      { midi: 78, value: 'quarter', finger: 4 }, { midi: 69, value: 'quarter', finger: 2 }, { midi: 67, value: 'quarter', finger: 1 },
    ], beams: [[6, 7]], bars: [3, 4, 8], systems: [9],
      marks: [{ at: 1, text: 'p' }],
      caption: 'Scan, hear, play \u2014 no demonstration.' },
    tryPrompt: 'Sight-read the phrase \u2014 scan it first, and remember the key signature.',
    targets: [67, 71, 74, 72, 71, 69, 71, 72, 78, 69, 67], mode: 'sequence',
    okMsg: 'Sight-read across two lines, in a sharp key, with no demonstration to lean on. That is a fluent reader at work.',
    hint: 'It begins on G and rises by skips. The last line reaches the black key before stepping home.',
    reteach: 'Gently \u2014 the lit keys will show the path. Read the distances first, then let your hand follow.',
    support: { highlight: [67, 71, 74, 72, 78], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 3', title: 'Key Level 3 \u2014 what you have gained', id: 'kl3-review',
    say: [
      { text: 'You no longer read note by note. You read distances \u2014 steps, skips, fourths, fifths \u2014 and you spot repetition and read it once.', pauseAfter: 700, tone: 'warm' },
      { text: 'Your thumb passes under, so the keyboard is no longer five keys wide. You play the C major scale in both directions, and you read across more than one line.', pauseAfter: 620, tone: 'warm' },
      { text: 'Key Level 4 \u2014 Musical Independence \u2014 asks the hardest question yet: can your two hands do genuinely different things at the same time?', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['Key Level 3 complete. You read by distance rather than by note, recognise sequences, and scan before playing.', 'Technically, the thumb-under has opened the keyboard beyond a five-finger span, and the C major scale is secure in both directions across a full octave.', 'Key Level 4 \u2014 Musical Independence \u2014 is the largest step in the course: two hands doing genuinely different things at once.'],
    mode: 'none',
  },
];
