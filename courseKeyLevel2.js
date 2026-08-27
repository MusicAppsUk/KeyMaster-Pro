// courseKeyLevel2.js
// KeyMaster Course · Key Level 2 — Real Repertoire.
//
// KL2A (Chapters 1–4) — first batch of a four-batch arc (KL2A–D, 13 chapters
// total). Appended to LEARN_STEPS after KEY_LEVEL1_STEPS. Schema identical to
// courseKeyLevel1.js — same card shape, same rendering pipeline, same voice
// scaffold (hint → reteach → support reveal).
//
// KL2A teaching spine — single new burden per chapter:
//   Ch1  The Road Ahead        — none (orientation, listening only)
//   Ch2  The Waltz Pulse       — metre only: 3/4 time + the dotted minim
//                                 (value 'dotted-half', already supported by
//                                 staffViz.js since rc2-212)
//   Ch3  Slate & Homeward      — dynamics only, via show.marks (p/f);
//                                 heard in Slate FIRST, consolidated in
//                                 Homeward (which also carries the dotted
//                                 minim from Ch2, in 3/4)
//   Ch4  Still Water           — none new; the classical doorway — a
//                                 question-and-answer piece in C major that
//                                 consolidates everything above. Its final
//                                 card (kl2-still-perform) is also the future
//                                 Concert Partner gate: passing it solo is
//                                 what unlocks Play-with-ensemble later. That
//                                 gating logic is Concert Partner's own build,
//                                 not this one — this card just exists, framed
//                                 as a performance rather than a drill.
//
// Composition rules honoured (verified against the live courseKeyLevel1.js
// and staffViz.js in this repo, not assumed from memory):
//   • White keys only. No accidentals — staffViz.js has no accidental glyph
//     yet, so F# and the move to G major are correctly deferred to a later
//     batch, once that rendering capability exists.
//   • No quavers — staffViz.js's noteHeadGeom() only distinguishes whole /
//     half / dotted-half; anything else (including 'eighth') silently
//     renders as a crotchet with no flag. Quavers are deferred to the same
//     later batch, alongside the accidental work.
//   • Note values used here: 'quarter', 'half', 'dotted-half', 'whole' — all
//     already supported.
//   • Time signatures: 3/4 and 4/4 — both already supported via timeSig.
//   • Dynamics: p / f via show.marks (rc2-212, already supported). Taught as
//     a reading-and-listening concept — there is no engine hook that varies
//     playback volume, and this file makes no claim that there is.
//   • All three pieces are original KeyMaster material, composed for this
//     build. No third-party, method-book, or competitor content.
//   • Pitch range stays in the five-finger positions already established in
//     KL1 (thumb-on-tonic hand shape), so no new hand position is asked of
//     the learner in the same breath as dynamics or metre.

export const KEY_LEVEL2_STEPS = [

  // ===== Chapter 1 — The Road Ahead (orientation, listening only) =========
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Key Level 2 begins', id: 'kl2-welcome',
    say: [
      { text: 'Key Level 1 is complete \u2014 real reading, real rhythm, and real pieces are in your hands now. Welcome to Key Level 2: Real Repertoire.', pauseAfter: 640, tone: 'warm' },
      { text: 'From here the pieces grow \u2014 a waltz feel, light and shade in the sound, and before long, real music from the great composers. Still one careful step at a time.', pauseAfter: 400, tone: 'instruct' },
    ],
    explain: ['Key Level 1 complete \u2014 Key Level 2 begins: Real Repertoire.', 'From here: a waltz feel, dynamics, and eventually real historical pieces \u2014 built the same careful way as everything so far.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'What lies ahead', id: 'kl2-arc',
    say: [
      { text: 'Three pieces are waiting in this first stretch \u2014 Slate, Homeward, and Still Water. Each one uses only what you already know, with one new idea added at a time.', pauseAfter: 620, tone: 'warm' },
      { text: 'Further ahead lie pieces from real music history. You are not there yet \u2014 but every step here is building toward playing them properly, not just getting through them.', pauseAfter: 400, tone: 'instruct' },
    ],
    explain: ['Three new pieces ahead: Slate, Homeward, Still Water \u2014 each built from what you already know, one new idea at a time.', 'Beyond them: real historical repertoire. Every step here is preparation for playing it properly.'],
    mode: 'none',
  },

  // ===== Chapter 2 — The Waltz Pulse (3/4 time + the dotted minim) ========
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'A new pulse \u2014 three in a bar', id: 'kl2-waltz-intro',
    say: [
      { text: 'Until now every piece has counted in fours. Here is a new feel \u2014 three beats in a bar. ONE-two-three, ONE-two-three \u2014 the waltz pulse.', pauseAfter: 620, tone: 'warm' },
      { text: 'The first beat leans a little heavier than the other two. Say it with me: ONE-two-three.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['A new metre: three beats in a bar \u2014 ONE-two-three \u2014 the waltz pulse, instead of the four-beat bars you have read so far.', 'The first beat of each bar leans slightly heavier. That gentle lean is what gives a waltz its swing.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4], notes: [ { midi: 60, value: 'quarter', finger: 1 }, { midi: 60, value: 'quarter', finger: 1 }, { midi: 60, value: 'quarter', finger: 1 } ], caption: 'Three beats in a bar \u2014 ONE-two-three.' },
    demo: [60, 60, 60], demoGap: 0.42,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Play in three', id: 'kl2-waltz-count',
    say: [
      { text: 'Now play in three. A little rising shape \u2014 home, up a skip, up a skip again \u2014 one note per beat.', pauseAfter: 600, tone: 'warm' },
      { text: 'Feel the lean on the first note of the bar as you play it.', pauseAfter: 340, tone: 'instruct' },
    ],
    explain: ['Play a rising three-note shape, one note per beat, in a bar of three.', 'Let the first note of the bar carry a touch more weight than the two that follow \u2014 that is the waltz lean.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4], notes: [ { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 } ], caption: 'One note per beat \u2014 three beats in the bar.' },
    demo: [60, 64, 67], demoGap: 0.42,
    tryPrompt: 'Play the three notes \u2014 one per beat, three beats in the bar.',
    targets: [60, 64, 67], mode: 'sequence',
    okMsg: 'That is the waltz pulse \u2014 three even beats, felt as one bar. Well counted.',
    hint: 'Three notes, skipping upward \u2014 home, then a skip, then a skip again. One per beat.',
    reteach: 'Gently \u2014 thumb on home, skip up to the middle finger, skip up again to the little finger. The lit keys will guide you.',
    support: { highlight: [60, 64, 67], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'A note that fills the whole bar', id: 'kl2-dotted-minim',
    say: [
      { text: 'In three-time, one note can fill an entire bar on its own \u2014 held for all three beats. It is called a dotted minim: a minim, held half as long again.', pauseAfter: 660, tone: 'warm' },
      { text: 'The little dot beside the note is what adds the extra half \u2014 two beats becomes three.', pauseAfter: 380, tone: 'instruct' },
    ],
    explain: ['A dotted minim fills a whole bar of three-time on its own \u2014 held for three full beats.', 'The dot adds half the note\u2019s value again: a minim (two beats) plus its dot (one more beat) equals three.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4], notes: [ { midi: 60, value: 'dotted-half', finger: 1 } ], caption: 'One note, held for the whole bar \u2014 three beats.' },
    demo: [60], demoGap: 0.9,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Hold the dotted minim', id: 'kl2-dotted-play',
    say: [
      { text: 'Now play it. Press the note once, and let it ring for the full three beats \u2014 count it in your head as it holds.', pauseAfter: 600, tone: 'warm' },
      { text: 'Resist the urge to play it again \u2014 one press, held the whole bar.', pauseAfter: 340, tone: 'instruct' },
    ],
    explain: ['Play the note once and let it hold for the full three-beat bar \u2014 count silently as it rings.', 'One press only. The length is in the holding, not in repeating the note.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4], notes: [ { midi: 64, value: 'dotted-half', finger: 3 } ], caption: 'One press \u2014 hold it for three full beats.' },
    demo: [64], demoGap: 0.9,
    tryPrompt: 'Play the note once and hold it for the full three beats.',
    targets: [64], mode: 'sequence',
    okMsg: 'Held true for the full bar \u2014 you can feel the dot doing its work. Well counted.',
    hint: 'One note only \u2014 press it once, then let it ring for three beats. Do not press again.',
    reteach: 'Gently \u2014 the lit key is the note to press once. After that, just count three beats and let it hold.',
    support: { highlight: [64], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'A little waltz phrase', id: 'kl2-waltz-phrase',
    say: [
      { text: 'Now put them together \u2014 a bar that moves, then a bar that holds. Two bars, six beats, the waltz pulse throughout.', pauseAfter: 620, tone: 'warm' },
      { text: 'Read it as one shape: three steps up, then a long held note.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['A two-bar waltz phrase: three steps upward, then a dotted minim held for the second bar.', 'This is the exact shape that opens both Slate and Homeward \u2014 you are about to meet it again as real music.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4], notes: [ { midi: 60, value: 'quarter', finger: 1 }, { midi: 62, value: 'quarter', finger: 2 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'dotted-half', finger: 2 } ], bars: [3], caption: 'A moving bar, then a held bar \u2014 the waltz pulse in two bars.' },
    demo: [60, 62, 64, 62], demoGap: 0.44,
    tryPrompt: 'Play the phrase \u2014 three steps up, then hold the last note for the whole bar.',
    targets: [60, 62, 64, 62], mode: 'sequence',
    okMsg: 'A real waltz phrase, played true \u2014 movement, then a held cadence. This is exactly what is coming next.',
    hint: 'Three notes stepping upward, one per beat \u2014 then the fourth note holds for a whole bar on its own.',
    reteach: 'Gently \u2014 step up three notes, one per beat, then hold the last note for three beats. The lit keys will guide you.',
    support: { highlight: [60, 62, 64, 62], replay: true },
  },

  // ===== Chapter 3 — Slate & Homeward (dynamics: p / f) ===================
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Light and shade \u2014 p and f', id: 'kl2-dynamics-name',
    say: [
      { text: 'Music is not just notes and rhythm \u2014 it has light and shade too. A small letter p under the staff means piano: play quietly.', pauseAfter: 640, tone: 'warm' },
      { text: 'A small letter f means forte: play with strength. Watch for these marks \u2014 they tell you how the music should feel, not just what to play.', pauseAfter: 400, tone: 'instruct' },
    ],
    explain: ['Two new marks under the staff: p (piano) means play quietly; f (forte) means play with strength.', 'These are Italian words musicians have used for centuries \u2014 dynamics. They shape the character of a piece, not just its notes.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false, notes: [ { midi: 60, value: 'quarter', finger: 1 }, { midi: 67, value: 'quarter', finger: 5 } ], marks: [ { at: 1, text: 'p' }, { at: 2, text: 'f' } ], caption: 'p means quiet \u2014 f means strong. Watch for these under the staff.' },
    demo: [60, 67], demoGap: 0.6,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Slate \u2014 listen first', id: 'kl2-slate-listen',
    say: [
      { text: 'Here is Slate \u2014 your first piece with dynamics built in. It opens quiet, rises into something stronger in the middle, then returns home just as quiet as it began.', pauseAfter: 680, tone: 'warm' },
      { text: 'Listen for the change from quiet to strong and back again. That shape \u2014 quiet, strong, quiet \u2014 is called ABA form.', pauseAfter: 400, tone: 'instruct' },
    ],
    explain: ['Slate: a piece in three sections \u2014 quiet, strong, then quiet again. That shape is called ABA form.', 'Listen for the dynamics doing real work \u2014 the middle section should feel like a different mood, not just louder notes.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 69, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 2 }, { midi: 72, value: 'quarter', finger: 3 }, { midi: 71, value: 'quarter', finger: 2 },
      { midi: 72, value: 'quarter', finger: 3 }, { midi: 71, value: 'quarter', finger: 2 }, { midi: 69, value: 'half', finger: 1 },
      { midi: 76, value: 'quarter', finger: 5 }, { midi: 74, value: 'quarter', finger: 4 }, { midi: 72, value: 'quarter', finger: 3 }, { midi: 74, value: 'quarter', finger: 4 },
      { midi: 76, value: 'half', finger: 5 }, { midi: 72, value: 'half', finger: 3 },
      { midi: 69, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 2 }, { midi: 72, value: 'quarter', finger: 3 }, { midi: 71, value: 'quarter', finger: 2 },
      { midi: 69, value: 'whole', finger: 1 },
    ], bars: [4, 7, 11, 13, 17], marks: [ { at: 1, text: 'p' }, { at: 8, text: 'f' }, { at: 14, text: 'p' } ],
      caption: 'Slate \u2014 quiet, then strong, then quiet again. ABA form.' },
    demo: [69, 71, 72, 71, 72, 71, 69, 76, 74, 72, 74, 76, 72, 69, 71, 72, 71, 69], demoGap: 0.4,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Slate \u2014 now you play', id: 'kl2-slate-play',
    say: [
      { text: 'Now you play Slate. Keep your hand in one place \u2014 thumb on A \u2014 and let the dynamics carry the shape: quiet, strong, quiet.', pauseAfter: 660, tone: 'warm' },
      { text: 'Do not rush the middle section just because it is louder. Strong does not mean fast.', pauseAfter: 380, tone: 'instruct' },
    ],
    explain: ['Play Slate from the manuscript. Thumb stays on A throughout \u2014 no hand shifts, just the dynamics changing the character.', 'Strong is not the same as fast. Keep the pulse steady through the louder middle section.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 69, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 2 }, { midi: 72, value: 'quarter', finger: 3 }, { midi: 71, value: 'quarter', finger: 2 },
      { midi: 72, value: 'quarter', finger: 3 }, { midi: 71, value: 'quarter', finger: 2 }, { midi: 69, value: 'half', finger: 1 },
      { midi: 76, value: 'quarter', finger: 5 }, { midi: 74, value: 'quarter', finger: 4 }, { midi: 72, value: 'quarter', finger: 3 }, { midi: 74, value: 'quarter', finger: 4 },
      { midi: 76, value: 'half', finger: 5 }, { midi: 72, value: 'half', finger: 3 },
      { midi: 69, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 2 }, { midi: 72, value: 'quarter', finger: 3 }, { midi: 71, value: 'quarter', finger: 2 },
      { midi: 69, value: 'whole', finger: 1 },
    ], bars: [4, 7, 11, 13, 17], marks: [ { at: 1, text: 'p' }, { at: 8, text: 'f' }, { at: 14, text: 'p' } ],
      caption: 'Slate \u2014 read the shape, and let the dynamics guide the feel.' },
    demo: [69, 71, 72, 71, 72, 71, 69, 76, 74, 72, 74, 76, 72, 69, 71, 72, 71, 69], demoGap: 0.4,
    tryPrompt: 'Play Slate \u2014 quiet at first, strong in the middle, quiet again at the end.',
    targets: [69, 71, 72, 71, 72, 71, 69, 76, 74, 72, 74, 76, 72, 69, 71, 72, 71, 69], mode: 'sequence',
    okMsg: 'That was Slate, played with real shape \u2014 quiet, strong, quiet, and every note true. Your first piece with dynamics.',
    hint: 'Your first section rises and settles \u2014 quiet. The middle section leaps higher \u2014 strong. Then the opening returns \u2014 quiet again.',
    reteach: 'Gently \u2014 the piece has three parts: a quiet opening, a stronger middle that climbs higher, then the quiet opening returns. The lit keys will carry you through.',
    support: { highlight: [69, 71, 72, 76, 74], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Homeward \u2014 listen first', id: 'kl2-homeward-listen',
    say: [
      { text: 'Homeward brings the waltz pulse and the dynamics together \u2014 three beats in a bar, quiet and strong, just like Slate but in three-time.', pauseAfter: 660, tone: 'warm' },
      { text: 'Listen for the dotted minim at the end of each phrase, holding the sound as it settles.', pauseAfter: 380, tone: 'instruct' },
    ],
    explain: ['Homeward: the waltz pulse from three-time, combined with the dynamics you just met in Slate.', 'Each phrase ends on a dotted minim \u2014 a held note that lets the phrase breathe before the next one begins.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4], notes: [
      { midi: 69, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 2 }, { midi: 72, value: 'quarter', finger: 3 },
      { midi: 71, value: 'dotted-half', finger: 2 },
      { midi: 76, value: 'quarter', finger: 5 }, { midi: 74, value: 'quarter', finger: 4 }, { midi: 72, value: 'quarter', finger: 3 },
      { midi: 74, value: 'dotted-half', finger: 4 },
      { midi: 69, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 2 }, { midi: 72, value: 'quarter', finger: 3 },
      { midi: 69, value: 'dotted-half', finger: 1 },
    ], bars: [3, 4, 7, 8, 11], marks: [ { at: 1, text: 'p' }, { at: 5, text: 'f' }, { at: 9, text: 'p' } ],
      caption: 'Homeward \u2014 the waltz pulse, with quiet and strong.' },
    demo: [69, 71, 72, 71, 76, 74, 72, 74, 69, 71, 72, 69], demoGap: 0.42,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Homeward \u2014 now you play', id: 'kl2-homeward-play',
    say: [
      { text: 'Now you play Homeward. Keep the waltz lean on the first beat of every bar, and let each dotted minim hold its full three beats.', pauseAfter: 660, tone: 'warm' },
      { text: 'Quiet to begin, strong in the middle, quiet again to close \u2014 the same shape as Slate, now in three-time.', pauseAfter: 380, tone: 'instruct' },
    ],
    explain: ['Play Homeward from the manuscript \u2014 the waltz pulse throughout, with the same quiet-strong-quiet shape as Slate.', 'Give every dotted minim its full three beats before moving on. Let the phrase settle before the next begins.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4], notes: [
      { midi: 69, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 2 }, { midi: 72, value: 'quarter', finger: 3 },
      { midi: 71, value: 'dotted-half', finger: 2 },
      { midi: 76, value: 'quarter', finger: 5 }, { midi: 74, value: 'quarter', finger: 4 }, { midi: 72, value: 'quarter', finger: 3 },
      { midi: 74, value: 'dotted-half', finger: 4 },
      { midi: 69, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 2 }, { midi: 72, value: 'quarter', finger: 3 },
      { midi: 69, value: 'dotted-half', finger: 1 },
    ], bars: [3, 4, 7, 8, 11], marks: [ { at: 1, text: 'p' }, { at: 5, text: 'f' }, { at: 9, text: 'p' } ],
      caption: 'Homeward \u2014 read the waltz shape, and let it breathe.' },
    demo: [69, 71, 72, 71, 76, 74, 72, 74, 69, 71, 72, 69], demoGap: 0.42,
    tryPrompt: 'Play Homeward \u2014 the waltz pulse, quiet then strong then quiet, each phrase held to the end.',
    targets: [69, 71, 72, 71, 76, 74, 72, 74, 69, 71, 72, 69], mode: 'sequence',
    okMsg: 'Homeward, played with real shape \u2014 the waltz pulse held steady, and the dynamics giving it a story. Two pieces now in your hands.',
    hint: 'Three short phrases, each three steps up followed by a held note. The middle phrase is the strong one \u2014 it climbs higher.',
    reteach: 'Gently \u2014 step up three notes, then hold. That happens three times: quiet, then strong and higher, then quiet again. The lit keys will guide you.',
    support: { highlight: [69, 71, 72, 76, 74], replay: true },
  },

  // ===== Chapter 4 — Still Water (consolidation; the classical doorway) ===
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Still Water \u2014 listen first', id: 'kl2-still-listen',
    say: [
      { text: 'Still Water is calmer \u2014 a question, then an answer. The first half rises and leaves you waiting; the second half answers it and comes home.', pauseAfter: 680, tone: 'warm' },
      { text: 'This call-and-answer shape is at the heart of almost every piece of real music you will ever play. Listen for the question, then the answer.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['Still Water: a question-and-answer piece. The first phrase rises and leaves the ear waiting; the second phrase answers and resolves home.', 'This is the doorway into real repertoire \u2014 nearly all classical music is built from phrases that ask and answer each other.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 65, value: 'quarter', finger: 4 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'half', finger: 2 },
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 65, value: 'quarter', finger: 4 }, { midi: 62, value: 'quarter', finger: 2 }, { midi: 60, value: 'half', finger: 1 },
    ], bars: [4, 7, 11], caption: 'Still Water \u2014 a question, then an answer that comes home.' },
    demo: [60, 64, 67, 64, 65, 64, 62, 60, 64, 67, 64, 65, 62, 60], demoGap: 0.42,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Still Water \u2014 the question', id: 'kl2-still-play-question',
    say: [
      { text: 'Play just the question first \u2014 it rises, then settles on a note that does not feel finished. That unfinished feeling is the whole point.', pauseAfter: 620, tone: 'warm' },
      { text: 'Let the last note hang a little \u2014 as if you are waiting for a reply.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['The question phrase: it rises through the five-finger position, then settles on a note that feels unresolved \u2014 not home yet.', 'That open, waiting feeling is deliberate. It is what makes the answer feel satisfying when it comes.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 65, value: 'quarter', finger: 4 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'half', finger: 2 },
    ], bars: [4], caption: 'The question \u2014 it rises, and waits.' },
    demo: [60, 64, 67, 64, 65, 64, 62], demoGap: 0.42,
    tryPrompt: 'Play the question phrase \u2014 it rises, then settles on a note that waits.',
    targets: [60, 64, 67, 64, 65, 64, 62], mode: 'sequence',
    okMsg: 'That is a real question phrase \u2014 open and waiting, not resolved. Exactly right.',
    hint: 'The phrase climbs through the five-finger position, comes back down one step, then rests \u2014 not on home, one step above it.',
    reteach: 'Gently \u2014 the line rises to the top of your hand, comes back down, and pauses just above home. The lit keys will guide you.',
    support: { highlight: [60, 64, 67, 65, 62], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Still Water \u2014 the answer', id: 'kl2-still-play-answer',
    say: [
      { text: 'Now the answer \u2014 the same opening rise, but this time it resolves all the way home.', pauseAfter: 600, tone: 'warm' },
      { text: 'Feel the difference: the question stopped one step short; the answer goes all the way.', pauseAfter: 340, tone: 'instruct' },
    ],
    explain: ['The answer phrase: the same rising opening as the question, but this time it resolves fully home to C.', 'Compare it to the question \u2014 same start, different ending. That is what makes it feel like a genuine reply.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 65, value: 'quarter', finger: 4 }, { midi: 62, value: 'quarter', finger: 2 }, { midi: 60, value: 'half', finger: 1 },
    ], bars: [4], caption: 'The answer \u2014 the same rise, resolved home.' },
    demo: [60, 64, 67, 64, 65, 62, 60], demoGap: 0.42,
    tryPrompt: 'Play the answer phrase \u2014 the same rise, but resolved all the way home.',
    targets: [60, 64, 67, 64, 65, 62, 60], mode: 'sequence',
    okMsg: 'Resolved home, and it shows \u2014 that is a real answer, replying to the question. Beautifully judged.',
    hint: 'The same opening rise as the question \u2014 but this time step all the way down to home at the end.',
    reteach: 'Gently \u2014 climb the same shape as before, then this time keep stepping down until you reach home. The lit keys will guide you.',
    support: { highlight: [60, 64, 67, 65, 62, 60], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Still Water \u2014 perform it whole', id: 'kl2-still-perform',
    say: [
      { text: 'Now play Still Water whole \u2014 question and answer, start to finish. Not an exercise this time \u2014 a performance.', pauseAfter: 640, tone: 'warm' },
      { text: 'Take a breath before you begin, and let the question truly wait before you answer it.', pauseAfter: 380, tone: 'instruct' },
    ],
    explain: ['Play Still Water complete \u2014 question and answer, in one unbroken performance.', 'This is the first piece you are asked to perform rather than practise. Let the pause between question and answer breathe.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 65, value: 'quarter', finger: 4 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'half', finger: 2 },
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 65, value: 'quarter', finger: 4 }, { midi: 62, value: 'quarter', finger: 2 }, { midi: 60, value: 'half', finger: 1 },
    ], bars: [4, 7, 11], caption: 'Still Water \u2014 perform it whole, question and answer.' },
    demo: [60, 64, 67, 64, 65, 64, 62, 60, 64, 67, 64, 65, 62, 60], demoGap: 0.42,
    tryPrompt: 'Perform Still Water \u2014 question, then answer, start to finish.',
    targets: [60, 64, 67, 64, 65, 64, 62, 60, 64, 67, 64, 65, 62, 60], mode: 'sequence',
    okMsg: 'That was a performance, not a practice run \u2014 the question asked, and the answer given. Key Level 2\u2019s first batch is complete.',
    hint: 'It is the question phrase, then the answer phrase, one after the other \u2014 you already know both halves.',
    reteach: 'Gently \u2014 play the rising question first, let it wait, then play the same rise again and this time follow it all the way home. The lit keys will guide you.',
    support: { highlight: [60, 64, 67, 65, 62, 60], replay: true },
  },

  // ===== Chapter 5 — The Quaver (two notes to a beat) ====================
  // rc2-213 unlocked quaver rendering (flags + beams) in staffViz.js. This is
  // the first chapter in the whole course that can show notes faster than one
  // per beat, so it is taught by RECOGNITION first: hear the doubling, see the
  // beam, count it aloud, and only then play it.
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Two notes in one beat', id: 'kl2-quaver-hear',
    say: [
      { text: 'Every note you have played so far has taken a whole beat or more. Now listen \u2014 the same beat, but two notes inside it.', pauseAfter: 660, tone: 'warm' },
      { text: 'The pulse has not changed. Only the notes have got quicker. Listen once more and feel the beat staying exactly where it was.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['Two notes can share a single beat. The pulse does not speed up \u2014 the notes simply move twice as fast within it.', 'Listen for the beat staying steady underneath. That steadiness is what you must keep when you play it.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 60, value: 'quarter', finger: 1 },
      { midi: 60, value: 'eighth', finger: 1 }, { midi: 60, value: 'eighth', finger: 1 },
      { midi: 60, value: 'quarter', finger: 1 },
    ], beams: [[3, 4]], caption: 'Beat three holds two notes \u2014 the pulse never changes.' },
    demo: [60, 60, 60, 60, 60], demoGap: 0.4,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'The quaver, and its beam', id: 'kl2-quaver-see',
    say: [
      { text: 'A note worth half a beat is called a quaver. On its own it carries a little flag; in pairs, the flags join into a beam \u2014 the thick line across the top.', pauseAfter: 680, tone: 'warm' },
      { text: 'That beam is a gift to the reader. It shows you at a glance which notes belong to the same beat.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['A quaver lasts half a beat. Alone it has a flag; joined to its neighbour it shares a beam \u2014 the thick horizontal line.', 'Beams group notes by beat. Reading the beam tells you where the pulse falls without counting every note.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false, notes: [
      { midi: 64, value: 'eighth', finger: 3 },
      { midi: 67, value: 'eighth', finger: 5 }, { midi: 67, value: 'eighth', finger: 5 },
    ], beams: [[2, 3]], caption: 'Left: one quaver with a flag. Right: two quavers sharing a beam.' },
    demo: [64, 67, 67], demoGap: 0.42,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Count the quavers', id: 'kl2-quaver-count',
    say: [
      { text: 'Here is how musicians count them: one, two, three-and-four. The word "and" is the second quaver of the beat.', pauseAfter: 680, tone: 'warm' },
      { text: 'Say it before you play it \u2014 one, two, three-and-four. Recognition first, then your hands.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['Count quavers with "and": one, two, three-and-four. The "and" is the offbeat \u2014 the second half of the beat.', 'Saying the count aloud before playing is how expert readers keep a steady pulse under faster notes.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 62, value: 'quarter', finger: 2 },
      { midi: 64, value: 'eighth', finger: 3 }, { midi: 62, value: 'eighth', finger: 2 },
      { midi: 60, value: 'quarter', finger: 1 },
    ], beams: [[3, 4]], caption: 'One, two, three-and-four \u2014 the "and" is the quaver offbeat.' },
    demo: [60, 62, 64, 62, 60], demoGap: 0.4,
    tryPrompt: 'Play it \u2014 count one, two, three-and-four, keeping the pulse even.',
    targets: [60, 62, 64, 62, 60], mode: 'sequence',
    okMsg: 'Two notes inside one beat, and the pulse held steady. That is real rhythmic reading.',
    hint: 'Beats one and two are single notes. Beat three holds the two beamed notes \u2014 then a single note for beat four.',
    reteach: 'Gently \u2014 two steps up, then the beamed pair moves up and straight back down, then home. The lit keys will guide you.',
    support: { highlight: [60, 62, 64], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Quavers on the way down', id: 'kl2-quaver-descend',
    say: [
      { text: 'Now a longer line, with a beamed pair in the middle of it. Read the beam first \u2014 see where the quick notes sit before you begin.', pauseAfter: 660, tone: 'warm' },
      { text: 'That is the habit of an expert reader: look ahead, find the fast bit, and be ready for it.', pauseAfter: 400, tone: 'instruct' },
    ],
    explain: ['A longer phrase with one beamed quaver pair inside it. Find the beam before you play \u2014 know where the quick notes are coming.', 'Scanning ahead for the difficult moment is a reading skill, not a playing skill. It is what stops a piece from ambushing you.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 69, value: 'quarter', finger: 5 }, { midi: 67, value: 'quarter', finger: 4 },
      { midi: 65, value: 'eighth', finger: 3 }, { midi: 64, value: 'eighth', finger: 2 },
      { midi: 62, value: 'quarter', finger: 2 },
      { midi: 60, value: 'whole', finger: 1 },
    ], beams: [[3, 4]], bars: [5], caption: 'Read the beam before you play \u2014 know where the quick notes fall.' },
    demo: [69, 67, 65, 64, 62, 60], demoGap: 0.4,
    tryPrompt: 'Play the descending line \u2014 steady beats, then the quick pair, then the long note home.',
    targets: [69, 67, 65, 64, 62, 60], mode: 'sequence',
    okMsg: 'Read ahead, played through, and landed home. That is how a musician handles a change of pace.',
    hint: 'Start at the top and step down. The two beamed notes are the quick ones, then hold the last note for two beats.',
    reteach: 'Gently \u2014 from the little finger, step down one at a time. The middle two notes move faster, then hold at home.',
    support: { highlight: [69, 67, 65, 64, 62, 60], replay: true },
  },

  // ===== Chapter 6 — First Light (a piece with quavers) ==================
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'First Light \u2014 listen first', id: 'kl2-firstlight-listen',
    say: [
      { text: 'Here is First Light \u2014 the first piece you will play that moves at two speeds. Steady notes, and quicker ones woven through them.', pauseAfter: 680, tone: 'warm' },
      { text: 'Listen for where it quickens. It happens twice, and both times it settles again afterwards.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['First Light: a piece that moves at two speeds \u2014 crotchets and quavers together.', 'It quickens twice, and settles both times. Listen for that pattern of movement and rest before you read it.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 65, value: 'eighth', finger: 4 }, { midi: 64, value: 'eighth', finger: 3 },
      { midi: 62, value: 'quarter', finger: 2 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'quarter', finger: 2 },
      { midi: 60, value: 'half', finger: 1 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 },
      { midi: 65, value: 'eighth', finger: 4 }, { midi: 64, value: 'eighth', finger: 3 },
      { midi: 62, value: 'quarter', finger: 2 },
      { midi: 60, value: 'whole', finger: 1 },
    ], beams: [[3, 4], [11, 12]], bars: [5, 8, 13],
      marks: [{ at: 1, text: 'p' }, { at: 9, text: 'f' }],
      caption: 'First Light \u2014 steady notes with quicker ones woven through.' },
    demo: [60, 64, 65, 64, 62, 64, 62, 60, 64, 67, 65, 64, 62, 60], demoGap: 0.4,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'First Light \u2014 the opening phrase', id: 'kl2-firstlight-a',
    say: [
      { text: 'Take the opening phrase alone. Two steady notes, a quick pair, then a long note to settle on.', pauseAfter: 640, tone: 'warm' },
      { text: 'Quiet throughout \u2014 this is the piece waking up, not announcing itself.', pauseAfter: 400, tone: 'instruct' },
    ],
    explain: ['The opening phrase of First Light: two crotchets, a beamed quaver pair, then a minim.', 'Played quietly. The character here is gentle \u2014 the dynamics are part of the reading, not an afterthought.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 65, value: 'eighth', finger: 4 }, { midi: 64, value: 'eighth', finger: 3 },
      { midi: 62, value: 'quarter', finger: 2 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'quarter', finger: 2 },
      { midi: 60, value: 'half', finger: 1 },
    ], beams: [[3, 4]], bars: [5], marks: [{ at: 1, text: 'p' }],
      caption: 'The opening phrase \u2014 quiet, with one quick pair.' },
    demo: [60, 64, 65, 64, 62, 64, 62, 60], demoGap: 0.4,
    tryPrompt: 'Play the opening phrase \u2014 quietly, with the quick pair on beat three.',
    targets: [60, 64, 65, 64, 62, 64, 62, 60], mode: 'sequence',
    okMsg: 'Gently done \u2014 the quick pair sat inside the beat without disturbing it. Exactly the touch this piece wants.',
    hint: 'Thumb, then a skip up to the middle finger. The quick pair goes up one and back, then hold the note below.',
    reteach: 'Gently \u2014 home, skip up, then the two quick notes step up and back, then settle one step above home.',
    support: { highlight: [60, 64, 65, 62], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'First Light \u2014 perform it whole', id: 'kl2-firstlight-perform',
    say: [
      { text: 'Now the whole piece. The second half answers the first \u2014 it climbs higher and speaks more strongly before coming home.', pauseAfter: 680, tone: 'warm' },
      { text: 'Two speeds, two dynamics, one steady pulse holding it all together. Take a breath, and play it as music.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['Perform First Light complete. The second half climbs higher and plays stronger, then resolves home.', 'Everything Key Level 2 has taught so far is in this one piece: quavers, dynamics, phrase shape, and a pulse that never wavers.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [
      { midi: 60, value: 'quarter', finger: 1 }, { midi: 64, value: 'quarter', finger: 3 },
      { midi: 65, value: 'eighth', finger: 4 }, { midi: 64, value: 'eighth', finger: 3 },
      { midi: 62, value: 'quarter', finger: 2 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 62, value: 'quarter', finger: 2 },
      { midi: 60, value: 'half', finger: 1 },
      { midi: 64, value: 'quarter', finger: 3 }, { midi: 67, value: 'quarter', finger: 5 },
      { midi: 65, value: 'eighth', finger: 4 }, { midi: 64, value: 'eighth', finger: 3 },
      { midi: 62, value: 'quarter', finger: 2 },
      { midi: 60, value: 'whole', finger: 1 },
    ], beams: [[3, 4], [11, 12]], bars: [5, 8, 13],
      marks: [{ at: 1, text: 'p' }, { at: 9, text: 'f' }],
      caption: 'First Light \u2014 performed whole.' },
    demo: [60, 64, 65, 64, 62, 64, 62, 60, 64, 67, 65, 64, 62, 60], demoGap: 0.4,
    tryPrompt: 'Perform First Light \u2014 both phrases, quiet then strong, steady throughout.',
    targets: [60, 64, 65, 64, 62, 64, 62, 60, 64, 67, 65, 64, 62, 60], mode: 'sequence',
    okMsg: 'That is a real piece, performed \u2014 two speeds, two dynamics, and the pulse never lost. Genuinely well played.',
    hint: 'The first phrase you already know. The second starts a skip higher, climbs to the top, then steps all the way home.',
    reteach: 'Gently \u2014 play the opening phrase, then start again from the middle finger, reach the top, and step down home.',
    support: { highlight: [60, 64, 65, 67, 62], replay: true },
  },

  // ===== Chapter 7 — The Black Keys and F sharp =========================
  // The first departure from all-white-key playing in the entire course.
  // Taught by keyboard geography FIRST (where the black keys sit, how the
  // groups of two and three orient the hand), then by notation.
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'The black keys have a pattern', id: 'kl2-blackkeys-see',
    say: [
      { text: 'Look down at the keyboard. The black keys are not scattered \u2014 they run in groups of two, then three, two, then three, all the way up.', pauseAfter: 680, tone: 'warm' },
      { text: 'That pattern is how a pianist knows where they are without looking. Every white key can be named from it.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['The black keys run in alternating groups of two and three. This pattern repeats across the whole keyboard.', 'Pianists navigate by this shape, not by reading key names. It is the geography that makes playing without looking possible.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Meet F sharp', id: 'kl2-fsharp-meet',
    say: [
      { text: 'Find the group of three black keys, and take the first one. That note is F sharp \u2014 the black key immediately above F.', pauseAfter: 680, tone: 'warm' },
      { text: 'Sharp means raised: one step higher than the white key it sits beside. Listen to F, then F sharp \u2014 hear the lift.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['F sharp is the first black key in the group of three \u2014 immediately above the white key F.', 'Sharp means raised by the smallest step on the keyboard. Compare F and F sharp by ear: the sharp sounds a touch brighter, lifted.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false, notes: [
      { midi: 65, value: 'half', finger: 4 },
      { midi: 66, value: 'half', finger: 4, accidental: 'sharp' },
    ], caption: 'F, then F sharp \u2014 the sharp sign raises the note.' },
    demo: [65, 66], demoGap: 0.7,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'The sharp sign', id: 'kl2-fsharp-sign',
    say: [
      { text: 'The sharp sign sits just before the note it changes \u2014 never after it. Read it first, then read the note.', pauseAfter: 660, tone: 'warm' },
      { text: 'Notice the sharp does not move the note up the staff. F sharp sits on exactly the same line as F. Only the sign tells you it is the black key.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['A sharp sign is written immediately before its note. Read the sign first, then the note \u2014 that is the reading order.', 'Crucially, a sharpened note stays on its own line or space. F sharp sits on the F line; the sign alone tells you to play the black key.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false, notes: [
      { midi: 66, value: 'quarter', finger: 4, accidental: 'sharp' },
      { midi: 66, value: 'quarter', finger: 4, accidental: 'sharp' },
    ], caption: 'The sharp sits before the note \u2014 and the note stays on the F line.' },
    demo: [66, 66], demoGap: 0.5,
    tryPrompt: 'Play F sharp twice \u2014 the first black key of the group of three.',
    targets: [66, 66], mode: 'sequence',
    okMsg: 'That is your first black key, read from notation and found by feel. A real step forward.',
    hint: 'Find the group of three black keys and take the leftmost one \u2014 that is F sharp.',
    reteach: 'Gently \u2014 look for three black keys together. The first of those three is the note. The lit key will show you.',
    support: { highlight: [66], replay: true },
  },

  // ===== Chapter 8 — G Major, and the key signature ======================
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'A new home \u2014 G', id: 'kl2-gmajor-home',
    say: [
      { text: 'Until now, home has always been C. Now move your hand up: thumb on G, and let the fingers fall naturally across the next five keys.', pauseAfter: 680, tone: 'warm' },
      { text: 'Same five-finger shape you already know \u2014 just starting somewhere new. The hand does not change; only its position does.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['A new five-finger position: thumb on G, fingers falling across G, A, B, C and D.', 'The hand shape is identical to the one you learned on C. Only the starting note has moved \u2014 that transfer is the point.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false, notes: [
      { midi: 67, value: 'quarter', finger: 1 }, { midi: 69, value: 'quarter', finger: 2 },
      { midi: 71, value: 'quarter', finger: 3 }, { midi: 72, value: 'quarter', finger: 4 },
      { midi: 74, value: 'quarter', finger: 5 },
    ], caption: 'The five-finger position on G \u2014 the same shape, a new home.' },
    demo: [67, 69, 71, 72, 74], demoGap: 0.4,
    tryPrompt: 'Play the five notes upward from G \u2014 thumb to little finger.',
    targets: [67, 69, 71, 72, 74], mode: 'sequence',
    okMsg: 'The same hand shape, transplanted to a new home. That transfer is exactly what makes a pianist mobile.',
    hint: 'Thumb on G, then one finger per white key going up \u2014 five notes in all.',
    reteach: 'Gently \u2014 place the thumb on G and play each white key upward in turn, one finger each. The lit keys will guide you.',
    support: { highlight: [67, 69, 71, 72, 74], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Why G major needs F sharp', id: 'kl2-gmajor-why',
    say: [
      { text: 'Here is something worth hearing rather than being told. This is the scale of G \u2014 but with F natural instead of F sharp. Listen to the note just before the top.', pauseAfter: 700, tone: 'warm' },
      { text: 'It sags. It does not want to arrive. Now the same scale with F sharp \u2014 and hear how the last step pulls upward into G.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['Compare two versions of the same scale. With F natural, the step into G sounds slack \u2014 it does not lead anywhere.', 'With F sharp, the seventh note leans hard into the tonic. That pull is why G major has a sharp: the key needs it to sound like itself.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false, notes: [
      { midi: 76, value: 'quarter', finger: 3 }, { midi: 77, value: 'quarter', finger: 4 }, { midi: 79, value: 'half', finger: 5 },
      { midi: 76, value: 'quarter', finger: 3 }, { midi: 78, value: 'quarter', finger: 4, accidental: 'sharp' }, { midi: 79, value: 'half', finger: 5 },
    ], bars: [3], caption: 'First with F natural, then with F sharp \u2014 hear which one arrives.' },
    demo: [76, 77, 79, 76, 78, 79], demoGap: 0.5,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'The key signature', id: 'kl2-keysig-read',
    say: [
      { text: 'Because F sharp happens constantly in G major, composers stopped writing it every time. Instead one sharp is placed at the very start of the line \u2014 a key signature.', pauseAfter: 700, tone: 'warm' },
      { text: 'It sits on the F line, and it means: every F in this piece is sharp, unless told otherwise. Read it once, and remember it throughout.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['A key signature is placed after the clef, before the time signature. One sharp on the F line means G major.', 'It applies to every F in the piece, in every octave, until the music says otherwise. Reading it once saves reading it a hundred times.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [4, 4], notes: [
      { midi: 67, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 3 },
      { midi: 78, value: 'quarter', finger: 5 }, { midi: 79, value: 'quarter', finger: 5 },
    ], caption: 'One sharp at the start \u2014 every F in the piece is sharp.' },
    demo: [67, 71, 78, 79], demoGap: 0.45,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Read the key signature and play', id: 'kl2-keysig-play',
    say: [
      { text: 'Now read it properly. There is no sharp sign beside the F in this line \u2014 the key signature has already told you. Play it sharp.', pauseAfter: 680, tone: 'warm' },
      { text: 'This is the first time you must carry information from the start of the line into the middle of it. That is real reading.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['No sharp appears beside the F here \u2014 the key signature at the start has already declared it. Play F sharp anyway.', 'Carrying the key signature in your head through the whole line is a genuine reading skill, and one of the habits that separates readers from note-spellers.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [4, 4], notes: [
      { midi: 71, value: 'quarter', finger: 3 }, { midi: 74, value: 'quarter', finger: 5 },
      { midi: 78, value: 'quarter', finger: 4 }, { midi: 79, value: 'quarter', finger: 5 },
    ], caption: 'The F is sharp \u2014 the key signature said so.' },
    demo: [71, 74, 78, 79], demoGap: 0.45,
    tryPrompt: 'Play the line \u2014 remember the key signature makes every F sharp.',
    targets: [71, 74, 78, 79], mode: 'sequence',
    okMsg: 'You carried the key signature through the whole line and played the sharp without being reminded. That is genuine reading.',
    hint: 'The third note is written on the F line \u2014 but the key signature makes it F sharp, the black key.',
    reteach: 'Gently \u2014 the third note is the black key just above F. The lit keys will show you where each note sits.',
    support: { highlight: [71, 74, 78, 79], replay: true },
  },

  // ===== Chapter 9 — Meadow Song (a piece in G major) ====================
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Meadow Song \u2014 listen first', id: 'kl2-meadow-listen',
    say: [
      { text: 'Meadow Song lives in G major \u2014 a waltz, with one sharp in the key signature and quavers running through it.', pauseAfter: 680, tone: 'warm' },
      { text: 'Everything Key Level 2 has taught meets in this one piece. Listen to it whole before you read a single note.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['Meadow Song: G major, three-time, with quavers and dynamics \u2014 the first piece to combine everything in this level.', 'Hearing a piece whole before reading it is the Recognition Before Execution principle in practice. Know the sound first.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4], notes: [
      { midi: 67, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 3 }, { midi: 74, value: 'quarter', finger: 5 },
      { midi: 71, value: 'dotted-half', finger: 3 },
      { midi: 72, value: 'quarter', finger: 4 }, { midi: 71, value: 'eighth', finger: 3 }, { midi: 69, value: 'eighth', finger: 2 },
      { midi: 71, value: 'quarter', finger: 3 },
      { midi: 69, value: 'quarter', finger: 2 }, { midi: 78, value: 'quarter', finger: 4 }, { midi: 69, value: 'quarter', finger: 2 },
      { midi: 67, value: 'dotted-half', finger: 1 },
    ], beams: [[6, 7]], bars: [3, 4, 8, 11],
      marks: [{ at: 1, text: 'p' }, { at: 5, text: 'f' }, { at: 9, text: 'p' }],
      caption: 'Meadow Song \u2014 G major, three-time, with quavers.' },
    demo: [67, 71, 74, 71, 72, 71, 69, 71, 69, 78, 69, 67], demoGap: 0.42,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Meadow Song \u2014 the sharp bar', id: 'kl2-meadow-sharp',
    say: [
      { text: 'One bar deserves separate attention \u2014 the one containing the F sharp. Play just those three notes, slowly, until the black key feels natural under the finger.', pauseAfter: 700, tone: 'warm' },
      { text: 'Isolating the hard bar before playing the whole piece is what practising actually means.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['Take the bar containing the F sharp on its own: A, F sharp, A \u2014 the middle note is the black key.', 'Isolating the difficult bar and repeating it slowly, before attempting the whole piece, is the core of effective practice.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4], notes: [
      { midi: 69, value: 'quarter', finger: 2 }, { midi: 78, value: 'quarter', finger: 4 }, { midi: 69, value: 'quarter', finger: 2 },
    ], caption: 'The sharp bar \u2014 the middle note is the black key.' },
    demo: [69, 78, 69], demoGap: 0.5,
    tryPrompt: 'Play the sharp bar \u2014 A, F sharp, A. Slowly.',
    targets: [69, 78, 69], mode: 'sequence',
    okMsg: 'The black key found cleanly, and returned from. That bar will not trouble you in the full piece now.',
    hint: 'Outer notes are the same white key. The middle note is the black key just above F.',
    reteach: 'Gently \u2014 second finger, then reach to the black key with the fourth, then back. The lit keys will guide you.',
    support: { highlight: [69, 78], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Meadow Song \u2014 perform it whole', id: 'kl2-meadow-perform',
    say: [
      { text: 'Now play Meadow Song complete. The key signature in your head, the waltz pulse in your body, the quavers inside the beat.', pauseAfter: 700, tone: 'warm' },
      { text: 'This is the most complete piece you have played. Take your time at the start, and let it move.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['Perform Meadow Song whole: G major with its key signature, three-time, quavers, and quiet-strong-quiet shaping.', 'This piece asks for everything Key Level 2 has taught at the same time \u2014 which is what real repertoire always does.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4], notes: [
      { midi: 67, value: 'quarter', finger: 1 }, { midi: 71, value: 'quarter', finger: 3 }, { midi: 74, value: 'quarter', finger: 5 },
      { midi: 71, value: 'dotted-half', finger: 3 },
      { midi: 72, value: 'quarter', finger: 4 }, { midi: 71, value: 'eighth', finger: 3 }, { midi: 69, value: 'eighth', finger: 2 },
      { midi: 71, value: 'quarter', finger: 3 },
      { midi: 69, value: 'quarter', finger: 2 }, { midi: 78, value: 'quarter', finger: 4 }, { midi: 69, value: 'quarter', finger: 2 },
      { midi: 67, value: 'dotted-half', finger: 1 },
    ], beams: [[6, 7]], bars: [3, 4, 8, 11],
      marks: [{ at: 1, text: 'p' }, { at: 5, text: 'f' }, { at: 9, text: 'p' }],
      caption: 'Meadow Song \u2014 performed whole.' },
    demo: [67, 71, 74, 71, 72, 71, 69, 71, 69, 78, 69, 67], demoGap: 0.42,
    tryPrompt: 'Perform Meadow Song \u2014 G major, waltz pulse, quavers and all.',
    targets: [67, 71, 74, 71, 72, 71, 69, 71, 69, 78, 69, 67], mode: 'sequence',
    okMsg: 'A piece in a new key, in three-time, with quavers and a black key \u2014 performed whole. That is a genuine musician\u2019s achievement.',
    hint: 'Four phrases of three beats. The third phrase has the quick pair; the fourth has the F sharp.',
    reteach: 'Gently \u2014 take it phrase by phrase. Rise, hold, then the quicker bar, then the sharp bar, then home. The lit keys will guide you.',
    support: { highlight: [67, 71, 74, 72, 69, 78], replay: true },
  },

  // ===== Chapter 10 — Key Level 2 Review ================================
  // Consolidation, and an honest doorway to the repertoire chapters that
  // follow once verified source material is available (see the note at the
  // foot of this file).
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Reading check \u2014 all of it at once', id: 'kl2-review-read',
    say: [
      { text: 'One reading check before we close the level. Key signature, three-time, a beamed pair, and a dynamic mark \u2014 all in four bars.', pauseAfter: 680, tone: 'warm' },
      { text: 'I will not play it for you. Read it, hear it in your head, then play. That is sight-reading.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['A short sight-reading test combining everything: G major key signature, three-time, quavers, and dynamics.', 'No demonstration this time. Reading a phrase you have never heard, and hearing it internally before playing, is the skill this whole level has been building.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4], notes: [
      { midi: 71, value: 'quarter', finger: 3 }, { midi: 72, value: 'eighth', finger: 4 }, { midi: 71, value: 'eighth', finger: 3 },
      { midi: 69, value: 'quarter', finger: 2 },
      { midi: 78, value: 'quarter', finger: 4 }, { midi: 69, value: 'quarter', finger: 2 }, { midi: 67, value: 'quarter', finger: 1 },
    ], beams: [[2, 3]], bars: [4], marks: [{ at: 1, text: 'p' }],
      caption: 'Read it, hear it, then play it \u2014 no demonstration.' },
    tryPrompt: 'Sight-read the phrase \u2014 remember the key signature.',
    targets: [71, 72, 71, 69, 78, 69, 67], mode: 'sequence',
    okMsg: 'Sight-read cleanly, sharp and all, with no demonstration to lean on. That is the habit that opens every piece of music you will ever meet.',
    hint: 'Start on B. The quick pair goes up one and back, then step down. The second bar reaches the black key before coming home to G.',
    reteach: 'Gently \u2014 the lit keys will show you. Read the shape first, then let your hand follow it.',
    support: { highlight: [71, 72, 69, 78, 67], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 2', title: 'Key Level 2 \u2014 what you have gained', id: 'kl2-review',
    say: [
      { text: 'Look at what has changed. You read in three-time as easily as four. You read notes faster than the beat. You read a key signature and carry it in your head.', pauseAfter: 700, tone: 'warm' },
      { text: 'You have played a black key from notation, and shaped pieces with quiet and strong. Five pieces are now in your hands: Slate, Homeward, Still Water, First Light and Meadow Song.', pauseAfter: 620, tone: 'warm' },
      { text: 'That is real repertoire, honestly earned. Key Level 3 \u2014 Pattern Fluency \u2014 will take it further when you are ready.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['Key Level 2 complete. You now read three-time and four-time, quavers within the beat, dynamics, and a key signature carried across a whole piece.', 'You have played your first black key from notation, moved your hand to a new five-finger home on G, and performed five pieces: Slate, Homeward, Still Water, First Light and Meadow Song.', 'Key Level 3 \u2014 Pattern Fluency \u2014 builds directly on this: recognising shapes and patterns fast enough that reading becomes fluent rather than deliberate.'],
    mode: 'none',
  },
];

// ---------------------------------------------------------------------------
// REPERTOIRE NOTE — read before extending this file.
//
// The KL2 design calls for named historical repertoire as the level's crown:
// Beethoven's Ode to Joy, Mozart's Minuet K.2, and the Minuet in G, BWV Anh.114.
//
// PROVENANCE VERIFIED (rc2-213, via IMSLP and Wikipedia):
//   • BWV Anh.114/115 are by CHRISTIAN PETZOLD, not J. S. Bach. They are two
//     movements of a c.1720 harpsichord suite, and were long misattributed
//     because they appear in the 1725 Notebook for Anna Magdalena Bach. The
//     course must credit Petzold. Public domain.
//
// NOT YET VERIFIED — and therefore NOT TRANSCRIBED:
//   The available IMSLP sources are scanned or typeset PDFs. Text extraction
//   returns rhythm marks and layout only, with no recoverable pitch data. Per
//   standing instruction, named historical works must be checked against an
//   authoritative score and never reconstructed from memory. No transcription
//   of these works therefore appears in this file.
//
// TO UNBLOCK: supply machine-readable source for each work — MusicXML, MIDI,
// LilyPond or ABC from a reputable public-domain edition — and the repertoire
// chapters can be written against it directly. Everything the learner needs in
// order to PLAY them (three-time, dotted minims, quavers, G major, the key
// signature, the F sharp) is already taught above, so the preparation is done.
