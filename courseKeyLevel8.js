// courseKeyLevel8.js
// KeyMaster Course · Key Level 8 — Performance Mastery.
//
// THE PREMISE, AND IT IS UNLIKE EVERY OTHER LEVEL. Key Level 8 teaches no new
// notation. Its measure of success is that KeyMaster becomes unnecessary.
//
// The temptation here is to make the material harder. That is the wrong move.
// The correct move is to make it QUIETER — to withdraw, visibly, so that what
// remains is a musician working rather than a learner being led. So:
//
//   • Most cards are `mode: 'none'`. The app does not light the keys, does not
//     check the notes, and does not tell the learner when they are finished.
//     That is not a missing feature; it is the entire point of the level.
//   • Several cards ask a question and deliberately do not answer it.
//   • The final section of the Minuet is presented once, whole, with no
//     bar-by-bar breakdown. Working out how to learn it IS the exercise.
//   • Fingering is almost entirely absent.
//
// KL8 teaching spine:
//   Ch1  How to Practise        — diagnosing your own weak bar, unaided
//   Ch2  Learning Unaided       — a whole section, no breakdown offered
//   Ch3  Memorisation           — structural, not muscular
//   Ch4  Performing             — nerves, continuity, and what listeners hear
//   Ch5  Building a Programme   — choosing what to play, and in what order
//   Ch6  The Complete Minuet    — all thirty-two bars
//   Ch7  Where You Are Now      — and what comes after KeyMaster
//
// SOURCE. Minuet in G, BWV Anh.114, Christian Petzold — bars 25-32, completing
// the work. Transcribed from the same CC0-1.0 LilyPond source and parsed
// programmatically. Bar 32's right hand is a three-note G major chord, written
// in the original as two voices sounding together.

const q = (midi) => ({ midi, value: 'quarter' });
const e8 = (midi) => ({ midi, value: 'eighth' });
const dh = (midi) => ({ midi, value: 'dotted-half' });

// ---- Minuet bars 25-32, verified against the CC0 source -------------------
// No fingering is supplied. At this level, working it out is part of the task.
const MINUET_FINAL = [
  /* 25 */ q(86), e8(79), e8(78), q(79),
  /* 26 */ q(88), e8(79), e8(78), q(79),
  /* 27 */ q(86), q(84), q(83),
  /* 28 */ e8(81), e8(79), e8(78), e8(79), q(81),
  /* 29 */ e8(74), e8(76), e8(78), e8(79), e8(81), e8(83),
  /* 30 */ q(84), q(83), q(81),
  /* 31 */ e8(83), e8(86), q(79), q(78),
  /* 32 */ { chord: [71, 74, 79], value: 'dotted-half' },
];
// Bar 31's quaver pair sits at entries 26-27 of this array.
const MINUET_FINAL_BEAMS = [[2, 3], [6, 7], [12, 13], [14, 15], [17, 18], [19, 20], [21, 22], [26, 27]];
// Flattened for playback: the closing chord sounds as three notes together.
const MINUET_FINAL_PITCHES = [
  86, 79, 78, 79, 88, 79, 78, 79, 86, 84, 83,
  81, 79, 78, 79, 81, 74, 76, 78, 79, 81, 83,
  84, 83, 81, 83, 86, 79, 78, 71, 74, 79,
];

export const KEY_LEVEL8_STEPS = [

  // ===== Chapter 1 — How to Practise =====================================
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'Key Level 8 begins', id: 'kl8-welcome',
    say: [
      { text: 'This level is different from the seven before it. It teaches you no new notation, no new technique, and no new theory.', pauseAfter: 700, tone: 'warm' },
      { text: 'What it does is hand everything over. I will stop lighting the keys. I will stop telling you when you are finished. Several times I will ask you something and simply not answer it.', pauseAfter: 640, tone: 'instruct' },
      { text: 'That is not me giving up on you. It is what success looks like. This level has worked when you no longer need it.', pauseAfter: 500, tone: 'warm' },
    ],
    explain: ['Key Level 8 — Performance Mastery. No new notation, technique or theory is taught here.', 'Instead the responsibility transfers: the app stops checking, stops prompting, and stops answering. Some questions are left deliberately open.', 'The measure of this level is not what you learn from it but how little you need it by the end.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'Find your own weak bar', id: 'kl8-diagnose',
    say: [
      { text: 'Here is the most valuable habit in all of practising, and almost nobody does it. Play a piece through once, and then identify the single worst bar.', pauseAfter: 700, tone: 'warm' },
      { text: 'Not roughly where it went wrong. The exact bar. Then practise only that bar, slowly, until it is the easiest bar in the piece rather than the hardest.', pauseAfter: 620, tone: 'instruct' },
      { text: 'Most people play the whole piece again instead. That rehearses the nine bars they can already do and the one they cannot, in equal measure. It is a poor use of an hour — and of your energy.', pauseAfter: 520, tone: 'warm' },
    ],
    explain: ['Play a piece once, then name the single worst bar precisely — not the rough area, the exact bar.', 'Practise only that bar, slowly, until it becomes the easiest in the piece rather than the hardest.', 'Repeating a whole piece rehearses what is already secure alongside what is not. Isolating the weak bar is a far better use of limited time.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'Why slowly actually works', id: 'kl8-slow-practice',
    say: [
      { text: 'Everyone is told to practise slowly. Almost nobody is told why, so almost nobody believes it.', pauseAfter: 660, tone: 'warm' },
      { text: 'Here is the reason. Playing fast and wrong teaches your hands the wrong movement, and they learn it perfectly well. Speed does not correct errors; it records them.', pauseAfter: 620, tone: 'instruct' },
      { text: 'Slow practice is not a gentler version of fast practice. It is a different activity — the one where the learning actually happens.', pauseAfter: 480, tone: 'warm' },
    ],
    explain: ['Practising fast and inaccurately teaches the hands an incorrect movement, which they learn as readily as a correct one.', 'Speed does not fix errors; it embeds them. Slow practice is where the learning occurs — it is a different activity, not a milder one.'],
    mode: 'none',
  },

  // ===== Chapter 2 — Learning Unaided ====================================
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'The last section — on your own', id: 'kl8-unaided',
    say: [
      { text: 'Here are the final eight bars of the Minuet. I am going to show them to you once, and then I am going to stop helping.', pauseAfter: 700, tone: 'warm' },
      { text: 'No bar-by-bar breakdown. No fingering. No lit keys. You already know how to do this: scan it, find the pattern, find the hard bar, work slowly.', pauseAfter: 620, tone: 'instruct' },
      { text: 'Working out HOW to learn this is the exercise. The notes are almost incidental.', pauseAfter: 460, tone: 'warm' },
    ],
    explain: ['The Minuet’s final eight bars, presented once and complete, with no breakdown and no fingering.', 'Everything needed is already learned: scan for structure, find the repetition, isolate the hardest bar, work slowly.', 'The exercise is deciding how to learn it. That decision is the skill this level exists to transfer.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: MINUET_FINAL, beams: MINUET_FINAL_BEAMS, systems: [12, 23],
      caption: 'Minuet, bars 25-32. No fingering, no breakdown — work it out.' },
    demo: MINUET_FINAL_PITCHES, demoGap: 0.32,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'Two questions, unanswered', id: 'kl8-questions',
    say: [
      { text: 'Two questions about those eight bars, and I am not going to tell you the answers.', pauseAfter: 620, tone: 'warm' },
      { text: 'First: bars twenty-five and twenty-six are nearly identical. What exactly is the difference, and why does it matter?', pauseAfter: 640, tone: 'instruct' },
      { text: 'Second: which is the hardest bar for your hands, and what would you do about it? Answer both before you play a note.', pauseAfter: 520, tone: 'warm' },
    ],
    explain: ['Two questions on the final section, deliberately left unanswered: what precisely differs between bars 25 and 26, and why it matters.', 'And: which bar is hardest for your hands, and what specific practice would fix it.', 'Answering these before playing is the habit. Being given the answers would defeat it.'],
    mode: 'none',
  },

  // ===== Chapter 3 — Memorisation ========================================
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'Memory that does not fail', id: 'kl8-memory',
    say: [
      { text: 'Most people memorise music with their fingers, and their fingers betray them the moment they are nervous. The hands know the sequence but not the reason.', pauseAfter: 700, tone: 'warm' },
      { text: 'Musical memory is structural. You remember that the second section modulates to D, that bars nine to fourteen repeat bars one to six, that the piece closes with a G major chord.', pauseAfter: 640, tone: 'instruct' },
      { text: 'Structural memory survives nerves, because it is knowledge rather than reflex. And if you lose your place, it tells you where you are.', pauseAfter: 500, tone: 'warm' },
    ],
    explain: ['Finger memory fails under pressure: the hands know the sequence but not why it goes that way.', 'Structural memory is knowledge — the form, the key changes, the repetitions, the cadences. It survives nerves and, crucially, it can locate you again if you lose your place.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'Describe it without playing', id: 'kl8-memory-test',
    say: [
      { text: 'A test with no keyboard. Away from the piano, describe the Minuet aloud: how many sections, what each does, where the key changes, how it ends.', pauseAfter: 700, tone: 'warm' },
      { text: 'If you can do that, you know the piece. If you can only play it, you have memorised a sequence of movements — which is a far more fragile thing.', pauseAfter: 560, tone: 'instruct' },
    ],
    explain: ['Away from the instrument, describe the Minuet aloud: its sections, what each does, where it modulates, and how it closes.', 'Being able to describe a piece is knowing it. Being able only to play it is holding a sequence of movements, which is far more fragile.'],
    mode: 'none',
  },

  // ===== Chapter 4 — Performing ==========================================
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'What listeners actually hear', id: 'kl8-performing',
    say: [
      { text: 'Something worth knowing before you ever play for anybody. Listeners do not hear wrong notes nearly as much as you think they do.', pauseAfter: 680, tone: 'warm' },
      { text: 'What they hear is the pulse, the shape of the phrases, and whether you seemed to mean it. A wrong note inside a confident phrase very often goes unnoticed. A hesitation never does.', pauseAfter: 640, tone: 'instruct' },
      { text: 'So play on. Commit to the phrase. The recovery habit from Key Level 4 is the single most useful performance skill you own.', pauseAfter: 480, tone: 'warm' },
    ],
    explain: ['Listeners notice wrong notes far less than players imagine. What they hear is pulse, phrase shape, and conviction.', 'A wrong note inside a confident phrase often passes unnoticed; a hesitation never does. Continuity matters more than accuracy in performance.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'Nerves, honestly', id: 'kl8-nerves',
    say: [
      { text: 'Nerves are not a sign that something is wrong. Every performer has them, at every level, permanently. They are what caring about it feels like.', pauseAfter: 700, tone: 'warm' },
      { text: 'What helps is not calm. It is preparation specific enough that you do not have to think: knowing exactly how the piece starts, and exactly what you will do if it goes wrong.', pauseAfter: 640, tone: 'instruct' },
      { text: 'Decide those two things in advance, and nerves become something you play through rather than something that stops you.', pauseAfter: 480, tone: 'warm' },
    ],
    explain: ['Nerves are universal and permanent among performers. They are not evidence of inadequate preparation.', 'What helps is specific preparation: knowing precisely how the piece begins, and precisely what you will do if something goes wrong.', 'Deciding both in advance turns nerves into something playable rather than something disabling.'],
    mode: 'none',
  },

  // ===== Chapter 5 — Building a Programme ================================
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'Choosing what to play', id: 'kl8-programme',
    say: [
      { text: 'A last musicianly skill: putting pieces together. Three short pieces in a sensible order are worth far more than one long one played anxiously.', pauseAfter: 700, tone: 'warm' },
      { text: 'Vary the key, vary the mood, and put the piece you know best first — not last. Starting securely settles everything that follows.', pauseAfter: 600, tone: 'instruct' },
      { text: 'And finish with something you love rather than something difficult. The last piece is the one people remember.', pauseAfter: 460, tone: 'warm' },
    ],
    explain: ['Programme building: three short pieces in a considered order serve better than one long piece played anxiously.', 'Vary key and mood; place the most secure piece first, because a settled opening steadies everything after it.', 'End with something you love rather than something hard — the closing piece is the one an audience remembers.'],
    mode: 'none',
  },

  // ===== Chapter 6 — The Complete Minuet =================================
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'The Minuet — the closing bars', id: 'kl8-minuet-close',
    say: [
      { text: 'Play the final eight bars, and listen to how the piece comes home. It has been away in D major; bar twenty-nine walks it back, and the last chord settles on G.', pauseAfter: 700, tone: 'warm' },
      { text: 'That closing chord is three notes in the right hand — B, D and G together. Petzold ends with a full G major chord rather than a single note, and it is why the ending sounds so final.', pauseAfter: 600, tone: 'instruct' },
    ],
    explain: ['The final eight bars return from D major to G. Bar 29 is the passage that walks the music home.', 'The piece closes on a full G major chord in the right hand — B, D and G together — which is why the ending sounds conclusive rather than merely stopped.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: MINUET_FINAL, beams: MINUET_FINAL_BEAMS, systems: [12, 23],
      caption: 'Bars 25-32 — home to G, and a full chord to close.' },
    demo: MINUET_FINAL_PITCHES, demoGap: 0.32,
    tryPrompt: 'Play the closing eight bars.',
    targets: MINUET_FINAL_PITCHES, mode: 'sequence',
    okMsg: 'You have now played every bar of Petzold’s Minuet in G — a complete work, from its first note to its last chord.',
    hint: 'Bar 29 is the run that brings the music home. The last bar is a three-note chord, not a single note.',
    reteach: 'Gently — take bar 29 on its own first; it is the one that carries the return. Then join the bars either side of it.',
    support: { highlight: [79, 78, 83, 81, 74, 71], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'The Minuet — whole', id: 'kl8-minuet-whole',
    say: [
      { text: 'Now the entire piece. Thirty-two bars, two sections, both repeated. You have learned it across four levels and you now know every note of it.', pauseAfter: 720, tone: 'warm' },
      { text: 'I am not going to check this one. There is no lit key, no correct-notes message, no mark. Play it as a performance and judge it yourself — which is what you will do for every piece from now on.', pauseAfter: 660, tone: 'instruct' },
      { text: 'Take your time before you start. This one is worth playing properly.', pauseAfter: 480, tone: 'warm' },
    ],
    explain: ['The complete Minuet in G by Christian Petzold — thirty-two bars in binary form, both sections repeated.', 'This performance is not checked. There is no feedback, no marking, and no lit keys: you judge it yourself, as you will judge every piece you play from now on.'],
    mode: 'none',
  },

  // ===== Chapter 7 — Where You Are Now ===================================
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'What comes next', id: 'kl8-next',
    say: [
      { text: 'A practical question: what should you learn now? The answer is not another level of this course, because there is not one.', pauseAfter: 660, tone: 'warm' },
      { text: 'Find music you want to play. Choose something slightly beyond you, but only slightly. Use the public-domain collections — Bach’s little preludes, Schumann’s album for the young, Clementi’s sonatinas, Satie.', pauseAfter: 640, tone: 'instruct' },
      { text: 'And when a piece defeats you, you now know what to do: find the bar, slow it down, and give it the time it needs.', pauseAfter: 480, tone: 'warm' },
    ],
    explain: ['There is no ninth level. The next step is real repertoire chosen by you — something slightly beyond your current reach, but only slightly.', 'Public-domain collections are the natural next source: Bach’s little preludes, Schumann’s Album for the Young, Clementi’s sonatinas, Satie’s shorter pieces.', 'When a piece defeats you, the method is already yours: locate the bar, slow it down, and give it time.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 8', title: 'Key Level 8 — and the end of the course', id: 'kl8-review',
    say: [
      { text: 'Look at what is true now that was not true when you began. You read music — both clefs, sharps and flats, simple and compound time. Your hands work independently. You hear harmony coming before you read it.', pauseAfter: 760, tone: 'warm' },
      { text: 'You shape a phrase, choose an interpretation and defend it, recognise a modulation on the page, and diagnose your own weak bar without being told where it is.', pauseAfter: 680, tone: 'warm' },
      { text: 'And you can play a complete work by a composer who died three hundred years ago, properly attributed, learned from the page rather than copied from a screen.', pauseAfter: 620, tone: 'warm' },
      { text: 'That is a musician. Not a beginner who finished an app — a musician, who happens to have used one. Thank you for letting me sit beside you while you did it.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['The KeyMaster Course is complete. You read both clefs in sharp and flat keys, in simple and compound time; your hands work independently; you anticipate harmony rather than merely reading it.', 'You shape phrases, make and defend interpretive choices, recognise form and modulation at sight, and diagnose your own practice without being told what is wrong.', 'You can play a complete work by Christian Petzold, correctly attributed and learned from notation — which is what being a musician actually consists of.'],
    mode: 'none',
  },
];
