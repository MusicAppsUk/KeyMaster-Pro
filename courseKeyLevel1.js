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
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 1', title: 'The pulse beneath the music', id: 'kl1-pulse-feel',
    say: [
      { text: 'Every piece of music has a pulse \u2014 a steady beat underneath, like a calm, unhurried heartbeat. You can feel it before you play a single note.', pauseAfter: 640, tone: 'warm' },
      { text: 'A musician feels that pulse first, then places the notes onto it. We will not rush \u2014 we feel the beat, and let the music rest on top of it.', pauseAfter: 380, tone: 'instruct' },
    ],
    explain: ['Music sits on a steady pulse \u2014 an even beat underneath, like a calm, unhurried heartbeat.', 'Feel the pulse first; the notes rest on top of it. This is the difference between playing in time and merely playing the right notes.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 1', title: 'Play on the beat', id: 'kl1-pulse-play',
    say: [
      { text: 'Let us feel four steady beats together. Count with me \u2014 one, two, three, four \u2014 evenly, never hurried.', pauseAfter: 620, tone: 'warm' },
      { text: 'Then play any note once on each beat, landing exactly with the pulse. Listen first, then join in.', pauseAfter: 340, tone: 'instruct' },
    ],
    explain: ['Count four even beats \u2014 one, two, three, four \u2014 and play a note exactly on each one.', 'Listen to the pulse first, then place each note onto a beat. Steady matters far more than fast.'],
    show: { kind: 'pulse' },
    tryPrompt: 'Play a note on each beat \u2014 one, two, three, four \u2014 landing with the pulse.',
    mode: 'count', count: 4,
    okMsg: 'Beautifully steady \u2014 you placed each note onto the pulse. That is what playing in time feels like.',
    hint: 'Let the count lead you \u2014 wait for each beat, then play exactly on it, not before.',
    reteach: 'Listen to the steady beat once more, then play one note on each pulse \u2014 even, unhurried, one to a beat.',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 1', title: 'How long each note lasts', id: 'kl1-notes-values',
    say: [
      { text: 'Notes do not only tell you which key to play \u2014 they tell you how long to hold it. The shape of the note is its length.', pauseAfter: 640, tone: 'warm' },
      { text: 'A semibreve, the whole note, is held for four beats. A minim, the half note, lasts two. A crotchet, the quarter note, is one beat. The longer notes are hollow; the crotchet is filled in.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['A note\u2019s shape tells you its length. A semibreve (whole note) is held for four beats; a minim (half note) for two; a crotchet (quarter note) for one.', 'The longer notes are hollow; the crotchet is filled in, with a stem. Same pitch, different lengths \u2014 this is rhythm beginning.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false, notes: [ { midi: 67, value: 'whole' }, { midi: 67, value: 'half' }, { midi: 67, value: 'quarter' } ], caption: 'Semibreve (4 beats) \u00B7 minim (2 beats) \u00B7 crotchet (1 beat) \u2014 same note, different lengths.' },
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 1', title: 'Read the lengths and play', id: 'kl1-notes-read',
    say: [
      { text: 'Here is a short line in four-four time \u2014 four beats in the bar. Read the lengths as you play: two crotchets, then a minim held across two beats.', pauseAfter: 640, tone: 'warm' },
      { text: 'Listen to it first, then play the same notes, giving the long note its full length.', pauseAfter: 340, tone: 'instruct' },
    ],
    explain: ['A short line in four-four time. Read each note\u2019s length: two crotchets, one beat each, then a minim held for two \u2014 four beats in the bar.', 'Hear it, then play it, letting the minim breathe for its full two beats.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [ { midi: 60, value: 'quarter', finger: 1 }, { midi: 62, value: 'quarter', finger: 2 }, { midi: 64, value: 'half', finger: 3 } ], bars: [3], caption: 'Four-four time \u2014 crotchet, crotchet, minim. Four beats in the bar.' },
    demo: [60, 62, 64], demoGap: 0.5,
    tryPrompt: 'Play the line \u2014 two short notes, then the longer note held for two beats.',
    targets: [60, 62, 64], mode: 'sequence',
    okMsg: 'Yes \u2014 and you let the minim breathe for its full length. That is reading rhythm, not only notes.',
    hint: 'Read the lengths left to right: two short notes, then a longer one held twice as long.',
    reteach: 'Slowly now \u2014 play the two short notes, one beat each, then hold the last note for two full beats. The lit keys will guide your hand.',
    support: { highlight: [60, 62, 64], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 1', title: 'Morning Steps \u2014 listen first', id: 'kl1-piece-listen',
    say: [
      { text: 'Now your first real piece from manuscript \u2014 a little tune called Morning Steps. Look at it as a whole before you play.', pauseAfter: 640, tone: 'warm' },
      { text: 'The right hand rests over five notes, the thumb on C. It steps gently upward, then returns home and settles. Listen to how it sounds.', pauseAfter: 400, tone: 'instruct' },
    ],
    explain: ['Your first piece from manuscript: Morning Steps. The right hand sits over five notes \u2014 thumb on C \u2014 stepping gently upward, then home.', 'Read it as music: a rising line that turns and settles. Listen first, and let the shape sink in before you play.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [ { midi: 60, value: 'quarter', finger: 1 }, { midi: 62, value: 'quarter', finger: 2 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 65, value: 'quarter', finger: 4 }, { midi: 64, value: 'half', finger: 3 }, { midi: 60, value: 'half', finger: 1 } ], bars: [4], caption: 'Morning Steps \u2014 four-four time. It steps up, then returns home.' },
    demo: [60, 62, 64, 65, 64, 60], demoGap: 0.48,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 1', title: 'Morning Steps \u2014 now you play', id: 'kl1-piece-play',
    say: [
      { text: 'Now you play Morning Steps. Read the shape \u2014 four steps up, then home. Take your time; the notes matter more than the speed.', pauseAfter: 640, tone: 'warm' },
      { text: 'If you wander, I will help you find your way \u2014 a small hint first, and a closer look only if you need it.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['Play Morning Steps from the manuscript. Read the rising shape \u2014 four steps up, then a turn and home \u2014 and let your fingers follow it.', 'Unhurried and even. Reading the shape well comes before playing fast.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4], notes: [ { midi: 60, value: 'quarter', finger: 1 }, { midi: 62, value: 'quarter', finger: 2 }, { midi: 64, value: 'quarter', finger: 3 }, { midi: 65, value: 'quarter', finger: 4 }, { midi: 64, value: 'half', finger: 3 }, { midi: 60, value: 'half', finger: 1 } ], bars: [4], caption: 'Morning Steps \u2014 read the shape, and play it through.' },
    demo: [60, 62, 64, 65, 64, 60], demoGap: 0.48,
    tryPrompt: 'Play Morning Steps \u2014 up by step to the top, then turn and come home.',
    targets: [60, 62, 64, 65, 64, 60], mode: 'sequence',
    okMsg: 'That was real music \u2014 your first piece, read from the page and played with shape. Beautifully done.',
    hint: 'Follow the shape: it climbs four notes by step, then turns and comes home. Check where your hand sits against the next note.',
    reteach: 'Gently \u2014 the line rises one step at a time to the top, then steps down and rests on the note it began with. The lit keys will guide your hand.',
    support: { highlight: [60, 62, 64, 65, 64, 60], replay: true },
  },
];
