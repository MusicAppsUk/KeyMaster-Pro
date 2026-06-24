// courseKeyLevel1.js
// KeyMaster Course · Key Level 1 — First Musicianship.
//
// The first level of the proper KeyMaster Course, beginning AFTER the Foundation
// Course (Foundation Stages 1–4). Appended to LEARN_STEPS after STAGE3_TWOHANDS_STEPS,
// so no Foundation step, title, chapter index, or resume position shifts.
//
// This module ships the OPENING ON-RAMP only — the "Reading Shapes into Music"
// chapter — and uses the existing educational-diagram renderer (whole noteheads,
// no manuscript). Proper manuscript (barlines, measures, time signature, note
// values, rests) is a separate gated track delivered before the first true piece.
//
// Original KeyMaster material. The Grade 1 practical + theory level is an INTERNAL
// seriousness benchmark only — no exam-board wording, repertoire, descriptors, or
// published exercises are used or reproduced anywhere.
//
// Voice: each step carries NEW `say` lines (id.say), spoken by TTS until recorded —
// no existing/recorded Jack line is touched. Jack-Coach scaffold (hint → reteach →
// gentle support reveal) follows the same data shape proven in Foundation.

export const KEY_LEVEL1_STEPS = [
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 1', title: 'The KeyMaster Course begins', id: 'kl1-welcome',
    say: [
      { text: 'You have completed the Foundation Course. The whole map is yours now \u2014 the keyboard, the staff, the note names, and a steady pulse.', pauseAfter: 640, tone: 'warm' },
      { text: 'From here, the KeyMaster Course begins. This is Key Level 1 \u2014 First Musicianship.', pauseAfter: 520, tone: 'instruct' },
      { text: 'Everything you have learned now starts to become music: reading, rhythm, your hands, harmony, and your first real pieces \u2014 with me beside you the whole way.', pauseAfter: 380, tone: 'warm' },
    ],
    explain: ['You have completed the Foundation Course. Now the KeyMaster Course begins \u2014 Key Level 1, First Musicianship.', 'From here, reading, rhythm, technique, harmony, and pieces grow together. This is where you begin to play and think as a musician.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 1', title: 'Shapes are the building blocks', id: 'kl1-shapes-recap',
    say: [
      { text: 'In the Foundation you learned how notes move \u2014 by step, by skip, or by repeat. Those small moves are the building blocks of every melody.', pauseAfter: 600, tone: 'warm' },
      { text: 'Now we use them to make music. Read the shape, hear it, and play it \u2014 a little more each time.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['Notes move by step, by skip, or by repeat \u2014 the building blocks of melody you met in the Foundation.', 'In Key Level 1 we turn those shapes into phrases, then into pieces \u2014 read, heard, and played.'],
    show: { kind: 'staff', clef: 'treble', notes: [ { midi: 67, value: 'whole' }, { midi: 69, value: 'whole' }, { midi: 71, value: 'whole' } ], caption: 'Step, skip, repeat \u2014 the building blocks of melody.' },
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 1', title: 'Your first phrase', id: 'kl1-first-phrase',
    say: [
      { text: 'Here is a short phrase. Read it as one shape \u2014 it rises by step, then returns home.', pauseAfter: 600, tone: 'warm' },
      { text: 'Listen to it first, then play it back.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A five-note phrase that rises by step and returns \u2014 read it as one shape, not five separate notes.', 'Hear it, then play it in order.'],
    show: { kind: 'staff', clef: 'treble', notes: [ { midi: 67, value: 'whole' }, { midi: 69, value: 'whole' }, { midi: 71, value: 'whole' }, { midi: 69, value: 'whole' }, { midi: 67, value: 'whole' } ], caption: 'A little phrase \u2014 it rises by step, then returns home.' },
    demo: [67, 69, 71, 69, 67], demoGap: 0.46,
    tryPrompt: 'Play the phrase you see \u2014 up by step, then back home.',
    targets: [67, 69, 71, 69, 67], mode: 'sequence',
    okMsg: 'That sounded like music \u2014 a phrase with a shape, rising and returning. Beautifully read.',
    hint: 'Read it as a shape: step up, step up, then step back down the same way.',
    reteach: 'Take it gently \u2014 the phrase climbs three notes by step, then comes back down to where it started.',
    support: { highlight: [67, 69, 71], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 1', title: 'Echo the phrase', id: 'kl1-phrase-echo',
    say: [
      { text: 'Now an echo. I will play a short phrase \u2014 listen to its shape, then play it back to me.', pauseAfter: 600, tone: 'warm' },
      { text: 'This one steps gently down, coming home.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Listen to the phrase, then echo it back \u2014 the same shape, in your own time.', 'It steps downward and settles, like a line coming home.'],
    show: { kind: 'staff', clef: 'treble', notes: [ { midi: 72, value: 'whole' }, { midi: 71, value: 'whole' }, { midi: 69, value: 'whole' }, { midi: 67, value: 'whole' } ], caption: 'Listen, then echo \u2014 it steps down, coming home.' },
    demo: [72, 71, 69, 67], demoGap: 0.46,
    tryPrompt: 'Echo the phrase \u2014 stepping down, coming home.',
    targets: [72, 71, 69, 67], mode: 'sequence',
    okMsg: 'Yes \u2014 you heard the shape and echoed it. That is real musical listening.',
    hint: 'Listen again to the shape \u2014 it steps down, one note at a time, and settles at the bottom.',
    reteach: 'Hear it as a falling line: each note is one step lower than the last, until it comes to rest.',
    support: { highlight: [72, 71, 69, 67], replay: true },
  },
];
