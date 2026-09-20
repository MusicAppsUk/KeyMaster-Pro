// courseKeyLevel4.js
// KeyMaster Course · Key Level 4 — Musical Independence.
//
// THE PREMISE. Until now the hands have taken turns, or moved as one. Real
// piano music asks them to do genuinely different things at the same moment.
// This is the largest cognitive step in the whole course, and it is the point
// at which a learner stops sounding like someone operating a keyboard and
// starts sounding like a pianist.
//
// It is also where real repertoire takes over. KL4 is built around the
// MINUET IN G, BWV Anh.114 — by CHRISTIAN PETZOLD, not Bach (see the
// attribution note below). Its opening eight bars are, by happy accident of
// history, an almost perfect teaching piece for this exact moment: a right-hand
// melody in G major over a left hand that mostly just holds one note per bar.
// Every prerequisite it needs was taught earlier —
//     G major and its key signature ....... KL2 ch.8
//     F sharp .............................. KL2 ch.7
//     three-time and the dotted minim ...... KL2 ch.2
//     quavers and beams .................... KL2 ch.5
//     reading by distance, thumb-under ..... KL3 ch.1-4
// so nothing here is a leap. The only new burden is independence itself.
//
// SOURCE AND ATTRIBUTION.
// The notation below was transcribed from a machine-readable LilyPond source
// (CC0-1.0 public domain), NOT reconstructed from memory:
//   https://github.com/jeandeaual/lilypond-piano-bwvanh114-115
// Its own stated source is the Wikipedia article on the Minuets in G major and
// G minor. Every pitch, duration and octave was parsed programmatically from
// that file and checked bar by bar against the metre.
//
// The work is by Christian Petzold (c.1720), a movement of a harpsichord suite.
// It was attributed to J. S. Bach for two centuries because it appears in the
// 1725 Notebook for Anna Magdalena Bach. KeyMaster credits Petzold, and teaches
// the story — a learner who knows why the name changed understands something
// real about how music history works.
//
// WHAT IS OMITTED, AND WHY.
// The original carries ornaments: mordents in bars 3 and 5, an appoggiatura in
// bar 8, a prall later in the piece. Ornament glyphs are not yet rendered, and
// drawing a note without its ornament is honest where inventing one would not
// be. The cards say so plainly, and ornaments arrive properly at KL7, where the
// curriculum places them. No pitch has been altered, simplified or removed.
//
// INFRASTRUCTURE THIS LEVEL REQUIRED (staffViz.js rc2-216):
//   • chords — two or more notes sounding together, with shared stems,
//     displaced seconds and stacked accidentals;
//   • `hand: 'L'|'R'` to put a note on the correct staff regardless of pitch;
//   • two-voice TIME-ALIGNED notation, so notes that sound together are drawn
//     together — without which a learner cannot see what independence means;
//   • system wrapping for scores, measured in bars.

// ---- The Minuet, bars 1-8, as parsed from the CC0 source. -----------------
// Fingering is KeyMaster's own editorial suggestion, chosen for a small hand
// and for exactly two position shifts, both at the same structural place.
const q = (midi, finger) => ({ midi, value: 'quarter', finger });
const e8 = (midi, finger) => ({ midi, value: 'eighth', finger });
const dh = (midi, finger) => ({ midi, value: 'dotted-half', finger });

// Right hand. Hand sits over G4-D5 (thumb on G) except bars 3-4, which shift
// up so the thumb takes C5, then shift back.
const MINUET_RH = [
  /* 1 */ q(74, 5), e8(67, 1), e8(69, 2), e8(71, 3), e8(72, 4),
  /* 2 */ q(74, 5), q(67, 1), q(67, 1),
  /* 3 */ q(76, 3), e8(72, 1), e8(74, 2), e8(76, 3), e8(78, 4),
  /* 4 */ q(79, 5), q(67, 1), q(67, 1),
  /* 5 */ q(72, 4), e8(74, 5), e8(72, 4), e8(71, 3), e8(69, 2),
  /* 6 */ q(71, 3), e8(72, 4), e8(71, 3), e8(69, 2), e8(67, 1),
  /* 7 */ q(66, 1), e8(67, 2), e8(69, 3), e8(71, 4), e8(67, 2),
  /* 8 */ dh(69, 3),
];
const MINUET_RH_BEAMS = [[2, 3], [4, 5], [10, 11], [12, 13], [18, 19], [20, 21], [23, 24], [25, 26], [28, 29], [30, 31]];

// Left hand. Bars 2-6 are a single held note each — which is precisely why
// this piece is the right one for a first lesson in independence.
const MINUET_LH = [
  /* 1 */ { chord: [{ midi: 55, finger: 5 }, { midi: 59, finger: 3 }, { midi: 62, finger: 1 }], value: 'half' }, q(57, 4),
  /* 2 */ dh(59, 3),
  /* 3 */ dh(60, 2),
  /* 4 */ dh(59, 3),
  /* 5 */ dh(57, 4),
  /* 6 */ dh(55, 5),
  /* 7 */ q(62, 1), q(59, 3), q(55, 5),
  /* 8 */ q(62, 1), e8(50, 5), e8(60, 2), e8(59, 3), e8(57, 4),
];
const MINUET_LH_BEAMS = [[12, 13], [14, 15]];

// Flat pitch lists for demo / targets, in sounding order.
const RH_PITCHES = MINUET_RH.map((n) => n.midi);
const LH_PITCHES = [55, 59, 62, 57, 59, 60, 59, 57, 55, 62, 59, 55, 62, 50, 60, 59, 57];

export const KEY_LEVEL4_STEPS = [

  // ===== Chapter 1 — Two Hands, One Music ================================
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'Key Level 4 begins', id: 'kl4-welcome',
    say: [
      { text: 'Everything so far has been one thing at a time. One hand, or two hands doing the same thing, or taking turns.', pauseAfter: 660, tone: 'warm' },
      { text: 'Key Level 4 asks the hardest question in piano playing: can your two hands do genuinely different things at the same moment?', pauseAfter: 480, tone: 'instruct' },
      { text: 'They can. It is learned, not inherited. And we begin with the gentlest possible version of it.', pauseAfter: 400, tone: 'warm' },
    ],
    explain: ['Key Level 4 — Musical Independence. Until now the hands have moved together or taken turns; now they do different things at once.', 'This is the largest cognitive step in the course, and it is learned gradually. We start with the gentlest form: one hand holding while the other moves.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'Why it feels hard', id: 'kl4-why-hard',
    say: [
      { text: 'Here is the honest reason it feels difficult. Your attention is one thing, and it wants to follow one line. When both hands move, it is pulled in two directions.', pauseAfter: 700, tone: 'warm' },
      { text: 'The solution is not to concentrate twice as hard. It is to make one hand automatic, so your attention is free for the other.', pauseAfter: 520, tone: 'instruct' },
      { text: 'That is why we practise hands separately first — not out of caution, but to buy back your attention.', pauseAfter: 400, tone: 'warm' },
    ],
    explain: ['Independence is hard because attention is single. When both hands move, attention is pulled two ways and neither line is heard properly.', 'The answer is not more effort but automation: learn one hand until it needs no attention, which frees your attention for the other.', 'That is the real reason for practising hands separately — it is a strategy, not a precaution.'],
    mode: 'none',
  },

  // ===== Chapter 2 — The Held Bass ======================================
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'One hand holds, one hand moves', id: 'kl4-held-listen',
    say: [
      { text: 'The gentlest independence there is. The left hand plays one note and simply holds it. The right hand moves above it.', pauseAfter: 680, tone: 'warm' },
      { text: 'Listen. The left hand has almost nothing to do — and that is the point. It asks for one press and then stillness.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['The left hand plays a single note and holds it for the whole bar. The right hand moves above it.', 'This is independence at its most forgiving: one hand has a single job, done once, leaving your attention almost entirely free for the other.'],
    show: { kind: 'staff', clef: 'grand', keySig: 'G', timeSig: [3, 4],
      voices: {
        treble: [q(67, 1), q(69, 2), q(71, 3)],
        bass: [dh(43, 5)],
      },
      marks: [{ beat: 0, text: 'p' }],
    },
    demo: [67, 69, 71], demoGap: 0.5,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'Play the held bass', id: 'kl4-held-play',
    say: [
      { text: 'Now you. Left thumb— no, little finger — on the low G. Press it once, and leave it down. Then let the right hand walk up: G, A, B.', pauseAfter: 720, tone: 'warm' },
      { text: 'If the bass note stops early, nothing is broken. Just notice it, and hold a little longer next time.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['Left little finger on the low G: press once and hold for all three beats. Right hand then walks up G, A, B — one note per beat.', 'Listen for the bass still sounding underneath as the third right-hand note arrives. That overlap is the sound of two independent parts.'],
    show: { kind: 'staff', clef: 'grand', keySig: 'G', timeSig: [3, 4],
      voices: {
        treble: [q(67, 1), q(69, 2), q(71, 3)],
        bass: [dh(43, 5)],
      },
      marks: [{ beat: 0, text: 'p' }],
    },
    demo: [67, 69, 71], demoGap: 0.5,
    tryPrompt: 'Hold the low G with the left hand, and walk up G, A, B with the right.',
    targets: [67, 69, 71], mode: 'sequence',
    okMsg: 'Two parts at once — one still, one moving. That is genuine independence, and you have just done it.',
    hint: 'The left hand presses once and stays down. Only the right hand moves — three steps up from G.',
    reteach: 'Gently — put the left little finger on the low G and leave it there. Then play the three lit keys with the right hand, one at a time.',
    support: { highlight: [67, 69, 71], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'The bass changes too', id: 'kl4-held-change',
    say: [
      { text: 'Now the left hand gets one job per bar instead of one job in total. A new held note each bar, while the right hand keeps moving.', pauseAfter: 700, tone: 'warm' },
      { text: 'Listen for the moment the bass changes. It is on the first beat of each bar — always the easiest place to put something.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['The left hand now changes note at the start of each bar, still holding through the bar; the right hand keeps moving above it.', 'Bass changes land on the first beat of the bar, which is the easiest moment to coordinate — both hands move together there, then separate again.'],
    show: { kind: 'staff', clef: 'grand', keySig: 'G', timeSig: [3, 4], barsPerSystem: 2,
      voices: {
        treble: [q(67, 1), q(69, 2), q(71, 3), q(72, 4), q(71, 3), q(69, 2)],
        bass: [dh(43, 5), dh(48, 2)],
      },
      marks: [{ beat: 0, text: 'p' }],
    },
    demo: [67, 69, 71, 72, 71, 69], demoGap: 0.46,
    tryPrompt: 'Play both bars — the bass changes on the first beat of bar two.',
    targets: [67, 69, 71, 72, 71, 69], mode: 'sequence',
    okMsg: 'The bass moved without disturbing the melody above it. That is the coordination this whole level is built on.',
    hint: 'Right hand: up three, then up one more and back down two. Left hand changes only at the start of the second bar.',
    reteach: 'Gently — take it a bar at a time. Play bar one until it is easy, then bar two, then join them.',
    support: { highlight: [67, 69, 71, 72], replay: true },
  },

  // ===== Chapter 3 — Contrary Motion =====================================
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'Hands moving apart', id: 'kl4-contrary-see',
    say: [
      { text: 'Here is a curious thing. Hands doing OPPOSITE things are often easier than hands doing slightly different things.', pauseAfter: 680, tone: 'warm' },
      { text: 'When the right hand goes up and the left goes down by the same amount, your hands mirror each other — and mirroring is something the body already knows how to do.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['Contrary motion: the hands move in opposite directions by the same distance, mirroring each other.', 'This is often easier than it looks, because mirrored movement is natural to the body — far more natural than two hands moving differently but in the same direction.'],
    show: { kind: 'staff', clef: 'grand', timeSig: [3, 4],
      voices: {
        treble: [q(60, 1), q(62, 2), q(64, 3)],
        bass: [q(48, 1), q(47, 2), q(45, 3)],
      },
    },
    demo: [60, 62, 64], demoGap: 0.5,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'Play in contrary motion', id: 'kl4-contrary-play',
    say: [
      { text: 'Both thumbs on a C — the right hand on middle C, the left hand an octave below. Now move outward: the right hand up, the left hand down, one step each.', pauseAfter: 720, tone: 'warm' },
      { text: 'Both hands use the same fingers at the same time: one, two, three. Let that symmetry do the work for you.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['Right thumb on middle C, left thumb on the C an octave below. Both hands move outward by step, using fingers 1, 2, 3 together.', 'The fingering is identical in both hands at every moment. That shared pattern is what makes contrary motion approachable.'],
    show: { kind: 'staff', clef: 'grand', timeSig: [3, 4],
      voices: {
        treble: [q(60, 1), q(62, 2), q(64, 3)],
        bass: [q(48, 1), q(47, 2), q(45, 3)],
      },
    },
    demo: [60, 62, 64], demoGap: 0.5,
    tryPrompt: 'Play outward — right hand up, left hand down, the same fingers together.',
    targets: [60, 62, 64], mode: 'sequence',
    okMsg: 'Mirrored and even. Your hands did different things and it felt natural — because the shape was shared.',
    hint: 'Same finger in both hands at the same time: thumbs, then second fingers, then third.',
    reteach: 'Gently — start with both thumbs on a C. Then move both second fingers, then both third fingers. The lit keys show the right hand.',
    support: { highlight: [60, 62, 64], replay: true },
  },

  // ===== Chapter 4 — Different Rhythms ===================================
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'Two speeds at once', id: 'kl4-rhythm-listen',
    say: [
      { text: 'Now the real thing. The left hand plays one note per beat. The right hand plays two. They only meet on the beat.', pauseAfter: 700, tone: 'warm' },
      { text: 'Listen for where they coincide, and where they do not. Between the beats, the right hand is alone.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['The left hand plays crotchets, the right hand quavers — two notes to the left hand’s one. They land together only on the beat.', 'Hear where the hands coincide and where the right hand sounds alone. Knowing where they MEET is what makes this playable.'],
    show: { kind: 'staff', clef: 'grand', keySig: 'G', timeSig: [3, 4],
      voices: {
        treble: [e8(67, 1), e8(69, 2), e8(71, 3), e8(69, 2), e8(67, 1), e8(69, 2)],
        bass: [q(55, 5), q(55, 5), q(55, 5)],
      },
      beams: { treble: [[1, 2], [3, 4], [5, 6]] },
    },
    demo: [67, 69, 71, 69, 67, 69], demoGap: 0.3,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'Together on the beat', id: 'kl4-rhythm-play',
    say: [
      { text: 'Play it, and think only about the beats. On each beat, both hands move. Between the beats, only the right hand does.', pauseAfter: 700, tone: 'warm' },
      { text: 'Count aloud if it helps: one-and, two-and, three-and. The left hand plays on the numbers, never on the ands.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['Count one-and, two-and, three-and. The left hand plays only on the numbers; the right hand plays on numbers and ands alike.', 'Thinking in terms of where the hands MEET, rather than two separate lines, is the trick that makes different rhythms manageable.'],
    show: { kind: 'staff', clef: 'grand', keySig: 'G', timeSig: [3, 4],
      voices: {
        treble: [e8(67, 1), e8(69, 2), e8(71, 3), e8(69, 2), e8(67, 1), e8(69, 2)],
        bass: [q(55, 5), q(55, 5), q(55, 5)],
      },
      beams: { treble: [[1, 2], [3, 4], [5, 6]] },
    },
    demo: [67, 69, 71, 69, 67, 69], demoGap: 0.3,
    tryPrompt: 'Play it — left hand on the beats, right hand twice as fast.',
    targets: [67, 69, 71, 69, 67, 69], mode: 'sequence',
    okMsg: 'Two speeds, held together by one pulse. That is the coordination real piano music asks for constantly.',
    hint: 'The left hand repeats the same low note on every beat. The right hand moves up and back down in quavers.',
    reteach: 'Gently — play the right hand alone first until it flows, then add the left hand on the beats only.',
    support: { highlight: [67, 69, 71], replay: true },
  },

  // ===== Chapter 5 — The Minuet: the melody ==============================
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'A famous piece, and a correction', id: 'kl4-minuet-story',
    say: [
      { text: 'You are about to learn a piece almost everyone recognises — the Minuet in G. For two hundred years it was published as Bach’s.', pauseAfter: 720, tone: 'warm' },
      { text: 'It is not. It was written by Christian Petzold, around 1720, as part of a harpsichord suite. It ended up in a notebook belonging to Bach’s wife, and the world drew the obvious conclusion.', pauseAfter: 620, tone: 'instruct' },
      { text: 'Scholars corrected it in the twentieth century. We credit Petzold — because knowing who wrote something is part of taking music seriously.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['The Minuet in G, BWV Anh.114, is by Christian Petzold (c.1720), not J. S. Bach. It survives in the 1725 Notebook for Anna Magdalena Bach, which is why it was long attributed to him.', 'Twentieth-century scholarship established Petzold as the composer. KeyMaster credits him — accuracy about who wrote a piece is part of musical seriousness.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'The Minuet — hear the melody', id: 'kl4-minuet-rh-listen',
    say: [
      { text: 'Here is the melody alone — the first eight bars. G major, three beats to the bar, and nothing in it you have not already met.', pauseAfter: 700, tone: 'warm' },
      { text: 'Listen for the shape. It rises, settles twice on a repeated G, climbs higher, and then walks down and comes to rest without quite finishing.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['The Minuet’s melody, bars 1-8: G major, three-time, quavers and crotchets — every element already taught.', 'Listen for the arch: a rise, two settling points on repeated G, a higher climb, then a descent that pauses without closing. That open ending is deliberate.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: MINUET_RH, beams: MINUET_RH_BEAMS, systems: [14, 27],
      caption: 'Minuet in G, BWV Anh.114 — Christian Petzold. Melody, bars 1-8.' },
    demo: RH_PITCHES, demoGap: 0.34,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'The Minuet — the opening phrase', id: 'kl4-minuet-rh-a',
    say: [
      { text: 'Take the first four bars. Your hand sits over G to D — thumb on G, as it did in Key Level 2 — for bars one and two.', pauseAfter: 700, tone: 'warm' },
      { text: 'Bars three and four move the hand up, so the thumb takes C. Then it comes straight back. Two shifts, in the same place each time.', pauseAfter: 520, tone: 'instruct' },
      { text: 'One honest note: the original has small ornaments here that we have left out. They arrive properly at Key Level 7. Every pitch is Petzold’s own.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['Bars 1-4. Hand over G-D with the thumb on G for bars 1-2; bars 3-4 shift up so the thumb takes C, then shift back.', 'The original carries mordents in bar 3 which are not shown — ornament notation arrives at Key Level 7. No pitch has been altered.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: MINUET_RH.slice(0, 16), beams: [[2, 3], [4, 5], [10, 11], [12, 13]], systems: [9],
      caption: 'Minuet, bars 1-4 — two hand positions, thumb on G then on C.' },
    demo: RH_PITCHES.slice(0, 16), demoGap: 0.36,
    tryPrompt: 'Play bars one to four of the melody — watch for the hand shift at bar three.',
    targets: RH_PITCHES.slice(0, 16), mode: 'sequence',
    okMsg: 'Petzold’s melody, played from the page with two clean position changes. That is real repertoire in your hands.',
    hint: 'Bars 1 and 2 sit with the thumb on G. At bar 3 the whole hand moves up so the thumb reaches C, then it moves back for bar 4.',
    reteach: 'Gently — learn bars one and two until they are easy. Then learn bar three on its own, in the new hand position. Then join them.',
    support: { highlight: [74, 67, 69, 71, 72, 76, 78, 79], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'The Minuet — the answering phrase', id: 'kl4-minuet-rh-b',
    say: [
      { text: 'Bars five to eight answer the opening. The hand stays over G to D the whole way — no shifts at all.', pauseAfter: 680, tone: 'warm' },
      { text: 'It walks steadily downward and comes to rest on A. Notice it does not finish on G. The phrase is asking a question, exactly as Still Water did.', pauseAfter: 540, tone: 'instruct' },
    ],
    explain: ['Bars 5-8. One hand position throughout — thumb on G — with the thumb dropping to F sharp in bar 7.', 'The phrase ends on A, not G: an open, unfinished ending. It is the same question-and-answer shape you met in Still Water, now in real repertoire.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      // Break at entry 11, which is the start of bar 7 — a bar line, so the
      // second line begins where the music does.
      notes: MINUET_RH.slice(16), beams: [[2, 3], [4, 5], [7, 8], [9, 10], [12, 13], [14, 15]], systems: [11],
      caption: 'Minuet, bars 5-8 — one hand position, and an open ending on A.' },
    demo: RH_PITCHES.slice(16), demoGap: 0.36,
    tryPrompt: 'Play bars five to eight — downward, and resting on A.',
    targets: RH_PITCHES.slice(16), mode: 'sequence',
    okMsg: 'Walked down and settled on an open ending — unresolved on purpose. You can hear it wanting to continue.',
    hint: 'It steps down in waves. In bar 7 the thumb moves down one key to F sharp, then the phrase climbs and rests on A.',
    reteach: 'Gently — the line falls in small waves from C down towards G, then lifts and holds on A. The lit keys will guide you.',
    support: { highlight: [72, 74, 71, 69, 67, 66], replay: true },
  },

  // ===== Chapter 6 — The Minuet: the bass ================================
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'The Minuet — the left hand alone', id: 'kl4-minuet-lh',
    say: [
      { text: 'Now the left hand, on its own. And here is the gift this piece gives you: for five bars in a row, it plays one note and holds it.', pauseAfter: 720, tone: 'warm' },
      { text: 'Bars two to six are a single note each. Only bars one, seven and eight ask for more. Learn those three, and the left hand is yours.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['The left hand, bars 1-8. Bars 2-6 are a single held note each — B, C, B, A, G — a slow descending line.', 'Only bars 1, 7 and 8 have more movement. Practising those three bars alone is nearly the whole job.'],
    show: { kind: 'staff', clef: 'bass', keySig: 'G', timeSig: [3, 4],
      notes: MINUET_LH, beams: MINUET_LH_BEAMS, systems: [8],
      caption: 'Minuet, bars 1-8 — the left hand. Five bars hold a single note.' },
    demo: LH_PITCHES, demoGap: 0.4,
    tryPrompt: 'Play the left-hand part — mostly one held note per bar.',
    targets: LH_PITCHES, mode: 'sequence',
    okMsg: 'The bass line, learned. Notice how little it asks of you — which is exactly why this piece is the right one to start with.',
    hint: 'Bar one is a chord then a single note. Bars two to six are one note each, stepping slowly down. Bars seven and eight move more.',
    reteach: 'Gently — play the five single held notes first: B, C, B, A, G. Then add bar one, then bar seven, then bar eight.',
    support: { highlight: [55, 59, 62, 57, 60], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'The Minuet — the difficult bars', id: 'kl4-minuet-lh-hard',
    say: [
      { text: 'Bars seven and eight are the only demanding ones. Take them on their own, slowly, until they stop being the hard part.', pauseAfter: 700, tone: 'warm' },
      { text: 'This is what practising actually is — finding the two bars that are difficult and giving them the time, instead of playing the easy six again.', pauseAfter: 540, tone: 'instruct' },
    ],
    explain: ['Bars 7-8 of the left hand: three descending crotchets, then a leap down and a quaver run back up.', 'Isolating the genuinely difficult bars, rather than replaying the easy ones, is the single most valuable practice habit there is.'],
    show: { kind: 'staff', clef: 'bass', keySig: 'G', timeSig: [3, 4],
      notes: MINUET_LH.slice(7), beams: [[5, 6], [7, 8]],
      caption: 'The left hand’s only demanding bars — practise these alone.' },
    demo: LH_PITCHES.slice(9), demoGap: 0.42,
    tryPrompt: 'Play bars seven and eight of the left hand, slowly.',
    targets: LH_PITCHES.slice(9), mode: 'sequence',
    okMsg: 'The hard bars, taken alone and solved. The rest of the piece was never the problem.',
    hint: 'Three notes stepping down, then a leap down to a low D and a run back up the way you came.',
    reteach: 'Gently — play the three descending notes first. Then the low D on its own. Then join the run that climbs back up.',
    support: { highlight: [62, 59, 55, 50, 60], replay: true },
  },

  // ===== Chapter 7 — The Minuet: both hands ==============================
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'The Minuet — see both hands', id: 'kl4-minuet-both-see',
    say: [
      { text: 'Here is the whole thing written properly, both hands on the grand staff. Look at where the notes line up vertically.', pauseAfter: 700, tone: 'warm' },
      { text: 'Notes drawn one above the other sound together. That is all a score is telling you — and once you read it that way, two hands stop being a mystery.', pauseAfter: 540, tone: 'instruct' },
      { text: 'Find bar two. One left-hand note, three right-hand notes, and they meet only at the start of the bar.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['The full eight bars on the grand staff. Notes drawn vertically aligned are notes that sound together.', 'Reading a score this way — looking for what lines up — turns two independent parts into one readable picture.', 'In bar 2 the hands meet only on the first beat; for the rest of the bar the left hand simply holds.'],
    show: { kind: 'staff', clef: 'grand', keySig: 'G', timeSig: [3, 4], barsPerSystem: 2,
      voices: { treble: MINUET_RH, bass: MINUET_LH },
      beams: { treble: MINUET_RH_BEAMS, bass: MINUET_LH_BEAMS },
      marks: [{ beat: 0, text: 'p' }],
    },
    demo: RH_PITCHES, demoGap: 0.34,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'The Minuet — bars one to four together', id: 'kl4-minuet-both-a',
    say: [
      { text: 'Both hands now, but only four bars. Play slowly enough that nothing is a scramble — slow is not a compromise here, it is the method.', pauseAfter: 700, tone: 'warm' },
      { text: 'Your left hand has four things to do in four bars. Your right hand has the tune. Let the left hand be automatic and give the tune your attention.', pauseAfter: 540, tone: 'instruct' },
    ],
    explain: ['Bars 1-4, both hands, slowly. The left hand has one event per bar after the opening; the right hand carries the melody.', 'Play slowly enough to stay in control. Speed is a consequence of security, never a route to it.'],
    show: { kind: 'staff', clef: 'grand', keySig: 'G', timeSig: [3, 4], barsPerSystem: 2,
      voices: { treble: MINUET_RH.slice(0, 16), bass: MINUET_LH.slice(0, 5) },
      beams: { treble: [[2, 3], [4, 5], [10, 11], [12, 13]] },
      marks: [{ beat: 0, text: 'p' }],
    },
    demo: RH_PITCHES.slice(0, 16), demoGap: 0.36,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'The Minuet — play it whole', id: 'kl4-minuet-perform',
    say: [
      { text: 'All eight bars, both hands, start to finish. Not an exercise — a performance of a real piece by a real composer.', pauseAfter: 700, tone: 'warm' },
      { text: 'If something slips, keep the pulse and carry on. Stopping to correct a note is the one habit that makes a performance fall apart.', pauseAfter: 540, tone: 'instruct' },
      { text: 'Take a breath before you begin. This is the piece Key Level 4 was built for.', pauseAfter: 420, tone: 'warm' },
    ],
    explain: ['Perform bars 1-8 of Petzold’s Minuet in G, both hands, without stopping.', 'If a note slips, keep the pulse and continue. Playing on through a mistake is a performance skill, and the next chapter teaches it directly.'],
    show: { kind: 'staff', clef: 'grand', keySig: 'G', timeSig: [3, 4], barsPerSystem: 2,
      voices: { treble: MINUET_RH, bass: MINUET_LH },
      beams: { treble: MINUET_RH_BEAMS, bass: MINUET_LH_BEAMS },
      marks: [{ beat: 0, text: 'p' }],
    },
    demo: RH_PITCHES, demoGap: 0.34,
    mode: 'none',
  },

  // ===== Chapter 8 — Mistake Recovery ====================================
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'What to do when it goes wrong', id: 'kl4-recovery-teach',
    say: [
      { text: 'Every pianist plays wrong notes. Every one, at every level, for their whole life. The difference is what happens next.', pauseAfter: 700, tone: 'warm' },
      { text: 'A beginner stops, goes back, and fixes it. A musician keeps the pulse and rejoins. The pulse is the thing the listener is actually following.', pauseAfter: 580, tone: 'instruct' },
      { text: 'So when you slip: do not stop, do not go back, do not apologise with your hands. Find the next beat and be there for it.', pauseAfter: 460, tone: 'warm' },
    ],
    explain: ['Wrong notes are universal and permanent. What separates a musician from a beginner is the response to them, not their absence.', 'Stopping and going back destroys the pulse — which is what a listener is actually tracking. A missed note is far less noticeable than a broken pulse.', 'The recovery habit: keep counting, find the next beat, and rejoin there. Never restart.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'Practise rejoining', id: 'kl4-recovery-play',
    say: [
      { text: 'A strange exercise, but a useful one. Play this line, and deliberately leave out the third note — skip it, keep counting, and come in correctly on the fourth.', pauseAfter: 720, tone: 'warm' },
      { text: 'Rehearsing the recovery is what makes it available to you when a real slip happens.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['Play the line but deliberately omit the third note, keeping the pulse and rejoining accurately on the fourth.', 'Practising recovery deliberately is what makes it automatic. A skill you have never rehearsed will not appear under pressure.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: [q(67, 1), q(69, 2), q(71, 3), q(72, 4), q(71, 3), q(67, 1)],
      caption: 'Leave out the third note on purpose — keep counting, rejoin on the fourth.' },
    demo: [67, 69, 71, 72, 71, 67], demoGap: 0.44,
    mode: 'none',
  },

  // ===== Chapter 9 — Key Level 4 Review ==================================
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'Independence check', id: 'kl4-review-read',
    say: [
      { text: 'One last piece of two-hand reading, and no demonstration. Scan it first: where do the hands meet, and where do they go their own way?', pauseAfter: 720, tone: 'warm' },
      { text: 'Answer that before you play a note, and the playing becomes much easier.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['Sight-read this two-hand phrase with no demonstration. Before playing, identify where the hands coincide and where they move independently.', 'Reading a score for its points of coincidence is the specific skill Key Level 4 has been building.'],
    show: { kind: 'staff', clef: 'grand', keySig: 'G', timeSig: [3, 4], barsPerSystem: 2,
      voices: {
        treble: [q(71, 3), e8(72, 4), e8(71, 3), q(69, 2), q(67, 1), q(69, 2), q(71, 3)],
        bass: [dh(55, 5), dh(52, 1)],
      },
      beams: { treble: [[2, 3]] },
      marks: [{ beat: 0, text: 'p' }],
    },
    tryPrompt: 'Sight-read the right-hand line, holding the bass underneath.',
    targets: [71, 72, 71, 69, 67, 69, 71], mode: 'sequence',
    okMsg: 'Read cold, both hands, with no demonstration to lean on. Independence is genuinely yours now.',
    hint: 'The hands meet on the first beat of each bar. In between, only the right hand moves.',
    reteach: 'Gently — play the right hand alone first, then add the held bass note at the start of each bar.',
    support: { highlight: [71, 72, 69, 67], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 4', title: 'Key Level 4 — what you have gained', id: 'kl4-review',
    say: [
      { text: 'Your hands can now do different things at the same time. That sentence is worth stopping on, because a few weeks ago it was not true.', pauseAfter: 720, tone: 'warm' },
      { text: 'You hold a bass while a melody moves. You play contrary motion, and two speeds at once. You read a grand staff for where the parts coincide. And you know what to do when it goes wrong.', pauseAfter: 640, tone: 'warm' },
      { text: 'And you play real repertoire — Petzold’s Minuet in G, properly attributed and properly learned. Key Level 5 turns to harmony: not chords as decoration, but as something you can hear coming.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['Key Level 4 complete. The hands now work independently: held bass under a moving melody, contrary motion, and two different rhythms at once.', 'You read the grand staff for points of coincidence, practise hands separately as a strategy, and recover from mistakes without breaking the pulse.', 'You have learned real repertoire — the opening of Petzold’s Minuet in G. Key Level 5, Harmonic Fluency, makes harmony something you can predict rather than merely play.'],
    mode: 'none',
  },
];
