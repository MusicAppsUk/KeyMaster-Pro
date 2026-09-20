// courseKeyLevel6.js
// KeyMaster Course · Key Level 6 — Expressive Repertoire.
//
// THE PREMISE. Until now the question has always been WHICH note. From here it
// becomes HOW — and, crucially, the answer stops being supplied. A learner who
// only ever plays what they are told to play has not become a musician; they
// have become a very accurate machine. So this level teaches the vocabulary of
// expression, and then deliberately hands the decisions over.
//
// The hand-holding reduction begins here. Cards in this level increasingly
// offer alternatives rather than instructions, and the review card asks the
// learner to make and defend a choice rather than reproduce one.
//
// KL6 teaching spine:
//   Ch1  Two Touches            — legato and staccato, heard before named
//   Ch2  Slurs and Phrasing     — where music breathes
//   Ch3  The Dynamic Range      — pp to ff, and gradual change
//   Ch4  Tempo and Rubato       — the words, and the freedom
//   Ch5  The Pedal              — the sustaining pedal as a musical tool
//   Ch6  Completing the Minuet  — bars 9-16, and a whole 16-bar section
//   Ch7  Interpretive Choice    — one phrase, three defensible readings
//   Ch8  Key Level 6 Review
//
// INFRASTRUCTURE (staffViz.js rc2-217): per-note articulation (staccato,
// accent, tenuto), slur and phrase arcs, crescendo/diminuendo hairpins, and
// sustain-pedal lines.
//
// AN HONEST LIMIT. KeyMaster cannot detect the sustain pedal. Whether a
// connected instrument reports pedal state is unknown and untested, so no card
// claims to check pedalling. The pedal is taught, notated and demonstrated;
// judging it is left to the learner's ears, and the cards say so rather than
// pretending to a feedback loop that does not exist.
//
// SOURCE. Minuet in G, BWV Anh.114, Christian Petzold — bars 9-16 completing
// the section begun in KL4. Transcribed from the same CC0-1.0 LilyPond source,
// parsed programmatically, never from memory. Ornaments are still omitted and
// arrive at KL7. Bars 9-14 are note-for-note identical to bars 1-6, which is
// itself the lesson of Chapter 6.

const q = (midi, finger) => ({ midi, value: 'quarter', finger });
const e8 = (midi, finger) => ({ midi, value: 'eighth', finger });
const h2 = (midi, finger) => ({ midi, value: 'half', finger });
const dh = (midi, finger) => ({ midi, value: 'dotted-half', finger });

// ---- Minuet bars 9-16, verified against the CC0 source --------------------
// Bars 9-14 duplicate bars 1-6 exactly. Only bars 15-16 are new material.
const MINUET_RH_B = [
  /*  9 */ q(74, 5), e8(67, 1), e8(69, 2), e8(71, 3), e8(72, 4),
  /* 10 */ q(74, 5), q(67, 1), q(67, 1),
  /* 11 */ q(76, 3), e8(72, 1), e8(74, 2), e8(76, 3), e8(78, 4),
  /* 12 */ q(79, 5), q(67, 1), q(67, 1),
  /* 13 */ q(72, 4), e8(74, 5), e8(72, 4), e8(71, 3), e8(69, 2),
  /* 14 */ q(71, 3), e8(72, 4), e8(71, 3), e8(69, 2), e8(67, 1),
  /* 15 */ q(69, 3), e8(71, 4), e8(69, 3), e8(67, 2), e8(66, 1),
  /* 16 */ dh(67, 2),
];
const MINUET_RH_B_BEAMS = [[2, 3], [4, 5], [10, 11], [12, 13], [18, 19], [20, 21], [23, 24], [25, 26], [28, 29], [30, 31]];
const MINUET_RH_B_PITCHES = MINUET_RH_B.map((n) => n.midi);

const MINUET_LH_B = [
  /*  9 */ h2(59, 3), q(57, 4),
  /* 10 */ q(55, 5), q(59, 3), q(55, 5),
  /* 11 */ dh(60, 2),
  /* 12 */ q(59, 3), e8(60, 2), e8(59, 3), e8(57, 4), e8(55, 5),
  /* 13 */ h2(57, 4), q(54, 5),
  /* 14 */ h2(55, 5), q(59, 3),
  /* 15 */ q(60, 2), q(62, 1), q(50, 5),
  /* 16 */ h2(55, 5), q(43, 5),
];
// The quaver run sits in bar 12, at entries 8-11 of this array.
const MINUET_LH_B_BEAMS = [[8, 9], [10, 11]];
const MINUET_LH_B_PITCHES = MINUET_LH_B.map((n) => n.midi);

export const KEY_LEVEL6_STEPS = [

  // ===== Chapter 1 — Two Touches =========================================
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'Key Level 6 begins', id: 'kl6-welcome',
    say: [
      { text: 'Every level so far has answered the same question: which note. From here the question changes to how — and the answer starts becoming yours rather than mine.', pauseAfter: 720, tone: 'warm' },
      { text: 'Two players can play identical notes and sound completely different. What differs is touch, shaping, timing and weight. That is what this level is about.', pauseAfter: 560, tone: 'instruct' },
    ],
    explain: ['Key Level 6 — Expressive Repertoire. The question shifts from which note to how it is played.', 'Two players can produce identical notes and sound entirely unlike each other. Touch, phrasing, dynamics and timing are the difference — and increasingly, the choices become yours.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'Joined, or separated', id: 'kl6-touch-hear',
    say: [
      { text: 'The same four notes, played two ways. First joined — each note held until the next one arrives, so the line never breaks.', pauseAfter: 660, tone: 'warm' },
      { text: 'Then separated — each note released early, leaving a little silence after it. Same notes. Completely different character.', pauseAfter: 520, tone: 'instruct' },
      { text: 'Musicians call them legato and staccato. Hear the difference first; the words matter less than the sound.', pauseAfter: 420, tone: 'warm' },
    ],
    explain: ['Legato joins notes: each is held until the next begins, so the line is unbroken. Staccato separates them, releasing each early.', 'These are the two basic touches, and they change the character of a phrase far more than dynamics do. Recognise the sound before learning the names.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [4, 4],
      notes: [q(67, 1), q(69, 2), q(71, 3), q(72, 4),
              { midi: 67, value: 'quarter', finger: 1, artic: 'staccato' },
              { midi: 69, value: 'quarter', finger: 2, artic: 'staccato' },
              { midi: 71, value: 'quarter', finger: 3, artic: 'staccato' },
              { midi: 72, value: 'quarter', finger: 4, artic: 'staccato' }],
      slurs: [[1, 4]], bars: [4],
      caption: 'Joined under a slur, then separated with staccato dots.' },
    demo: [67, 69, 71, 72, 67, 69, 71, 72], demoGap: 0.4,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'Play them separated', id: 'kl6-staccato-play',
    say: [
      { text: 'Play these four with a staccato touch — each note released the moment after it sounds, so a small silence follows it.', pauseAfter: 680, tone: 'warm' },
      { text: 'Staccato is not sharp or aggressive. It is simply short. Keep the hand relaxed and let the key come back up.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['Play four notes staccato — each released immediately, leaving silence before the next.', 'A common misunderstanding: staccato means short, not hard. The hand stays relaxed; the note simply ends early.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [4, 4],
      notes: [{ midi: 67, value: 'quarter', finger: 1, artic: 'staccato' },
              { midi: 69, value: 'quarter', finger: 2, artic: 'staccato' },
              { midi: 71, value: 'quarter', finger: 3, artic: 'staccato' },
              { midi: 72, value: 'quarter', finger: 4, artic: 'staccato' }],
      caption: 'Staccato — short, not hard.' },
    demo: [67, 69, 71, 72], demoGap: 0.4,
    tryPrompt: 'Play the four notes with a light, short touch.',
    targets: [67, 69, 71, 72], mode: 'sequence',
    okMsg: 'Short and light, with air between the notes. That is staccato properly understood.',
    hint: 'Four notes rising by step from G. Release each one as soon as it has sounded.',
    reteach: 'Gently — the four lit keys in turn. Let each key return before the next.',
    support: { highlight: [67, 69, 71, 72], replay: true },
  },

  // ===== Chapter 2 — Slurs and Phrasing ==================================
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'Where the music breathes', id: 'kl6-slur-see',
    say: [
      { text: 'That curved line over the notes is a slur. It means play them as one joined gesture — and, just as importantly, it shows where the phrase ends.', pauseAfter: 700, tone: 'warm' },
      { text: 'Think of it as a breath mark. A singer would take a breath where the slur stops. A pianist lifts, very slightly, in the same place.', pauseAfter: 560, tone: 'instruct' },
      { text: 'Playing to the end of a slur, then lifting, is what makes a line sound like a sentence rather than a list.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['A slur joins notes into one gesture and marks where the phrase ends.', 'It functions as a breath mark: a singer breathes where the slur stops, and a pianist lifts very slightly there.', 'Playing to the end of a slur and then lifting is what turns a sequence of notes into a musical sentence.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: [q(67, 1), q(69, 2), q(71, 3), q(72, 4), q(71, 3), q(69, 2), dh(67, 1)],
      slurs: [[1, 3], [4, 7]], bars: [3, 6],
      caption: 'Two phrases. Lift, just slightly, where the first slur ends.' },
    demo: [67, 69, 71, 72, 71, 69, 67], demoGap: 0.44,
    tryPrompt: 'Play the line — joined within each slur, with a small lift between them.',
    targets: [67, 69, 71, 72, 71, 69, 67], mode: 'sequence',
    okMsg: 'Two phrases rather than six notes. That small lift is what a listener hears as musical sense.',
    hint: 'The first three notes belong together; then lift and play the last three as a second group.',
    reteach: 'Gently — play the first three joined, pause a moment, then the last three joined.',
    support: { highlight: [67, 69, 71, 72], replay: true },
  },

  // ===== Chapter 3 — The Dynamic Range ===================================
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'More than quiet and loud', id: 'kl6-dynamics-range',
    say: [
      { text: 'You know p and f. There is a whole range either side: pp very quiet, mp moderately quiet, mf moderately strong, ff very strong.', pauseAfter: 700, tone: 'warm' },
      { text: 'But the more useful idea is not the levels. It is the CHANGE between them — growing and fading — and that is what those long wedges mean.', pauseAfter: 560, tone: 'instruct' },
    ],
    explain: ['The dynamic levels run pp, p, mp, mf, f, ff — very quiet through to very strong.', 'More musically useful than the levels themselves is gradual change: a crescendo grows, a diminuendo fades. The wedge signs show exactly where.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [4, 4],
      notes: [q(67, 1), q(69, 2), q(71, 3), q(72, 4), q(74, 5), q(72, 4), q(71, 3), q(67, 1)],
      hairpins: [{ from: 1, to: 5, dir: 'cresc' }, { from: 5, to: 8, dir: 'dim' }],
      marks: [{ at: 1, text: 'p' }, { at: 5, text: 'f' }],
      bars: [4], caption: 'Growing to the top, then fading home.' },
    demo: [67, 69, 71, 72, 74, 72, 71, 67], demoGap: 0.4,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'Shape the line', id: 'kl6-dynamics-play',
    say: [
      { text: 'Play it, and let the sound grow as the line climbs and fade as it falls. The shape of the sound follows the shape of the notes.', pauseAfter: 700, tone: 'warm' },
      { text: 'This is the single most reliable piece of interpretive advice there is: when a line rises, let it grow a little. It almost always sounds right.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['Play the phrase growing as it rises and fading as it falls.', 'Matching dynamic shape to melodic shape is the most dependable interpretive instinct in music. It is not a rule, but it is rarely wrong.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [4, 4],
      notes: [q(67, 1), q(69, 2), q(71, 3), q(72, 4), q(74, 5), q(72, 4), q(71, 3), q(67, 1)],
      hairpins: [{ from: 1, to: 5, dir: 'cresc' }, { from: 5, to: 8, dir: 'dim' }],
      marks: [{ at: 1, text: 'p' }, { at: 5, text: 'f' }],
      bars: [4], caption: 'Let the sound follow the shape of the line.' },
    demo: [67, 69, 71, 72, 74, 72, 71, 67], demoGap: 0.4,
    tryPrompt: 'Play the line, growing as it rises and fading as it falls.',
    targets: [67, 69, 71, 72, 74, 72, 71, 67], mode: 'sequence',
    okMsg: 'The line had a shape, not just a set of notes. That is the beginning of interpretation.',
    hint: 'Five notes rising, then back down. Let the loudest point be the top.',
    reteach: 'Gently — the lit keys rise then fall. Play them evenly first; add the shaping once the notes are secure.',
    support: { highlight: [67, 69, 71, 72, 74], replay: true },
  },

  // ===== Chapter 4 — Tempo and Rubato ====================================
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'The words for speed', id: 'kl6-tempo-words',
    say: [
      { text: 'Composers write tempo in Italian, and the words describe character as much as speed. Andante is a walking pace. Allegro is bright and quick. Adagio is slow and spacious.', pauseAfter: 720, tone: 'warm' },
      { text: 'Two more you will meet constantly: ritardando, gradually slowing — usually at an ending. And a tempo, meaning return to the original speed.', pauseAfter: 560, tone: 'instruct' },
    ],
    explain: ['Tempo terms describe character as well as speed: adagio slow and spacious, andante at a walking pace, allegro bright and quick.', 'Ritardando means gradually slowing, and appears most often at an ending. A tempo means return to the original speed.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'Slowing into an ending', id: 'kl6-rit-play',
    say: [
      { text: 'Here is a closing phrase. Play it evenly until the last bar, then let the final three notes broaden — slightly slower, slightly heavier.', pauseAfter: 700, tone: 'warm' },
      { text: 'A very small amount is enough. A ritardando that draws attention to itself has gone too far.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['Play evenly, then broaden the final bar — a little slower and a little weightier into the last note.', 'Restraint matters: a ritardando should feel inevitable rather than dramatic. If a listener notices the device rather than the ending, it was too much.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: [q(74, 5), q(72, 4), q(71, 3), q(69, 2), h2(67, 1)],
      slurs: [[4, 5]], hairpins: [{ from: 4, to: 5, dir: 'dim' }],
      marks: [{ at: 1, text: 'mf' }], bars: [3],
      caption: 'Even, then broadening into the close.' },
    demo: [74, 72, 71, 69, 67], demoGap: 0.44,
    tryPrompt: 'Play the phrase, broadening slightly into the last note.',
    targets: [74, 72, 71, 69, 67], mode: 'sequence',
    okMsg: 'It arrived rather than just stopping. That broadening is what makes an ending feel intended.',
    hint: 'Step down from D, then lift to B and settle on G. Slow only in the final bar.',
    reteach: 'Gently — play the six lit keys in order. Worry about the notes first; add the slowing once they are easy.',
    support: { highlight: [74, 72, 71, 69, 67], replay: true },
  },

  // ===== Chapter 5 — The Pedal ===========================================
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'The pedal on the right', id: 'kl6-pedal-teach',
    say: [
      { text: 'The right-hand pedal lifts the dampers off the strings, so notes go on sounding after your fingers leave the keys.', pauseAfter: 700, tone: 'warm' },
      { text: 'It is not a way of joining badly played notes. Used carelessly it blurs everything into mud. Used well it lets a harmony ring while the hand moves.', pauseAfter: 580, tone: 'instruct' },
      { text: 'The rule that prevents mud: change the pedal WHEN THE HARMONY CHANGES. Down as the new chord sounds, up just before it.', pauseAfter: 480, tone: 'warm' },
    ],
    explain: ['The sustaining pedal lifts the dampers so notes continue sounding after the fingers release them.', 'Its purpose is to let a harmony ring while the hand moves — not to disguise poor legato. Careless pedalling blurs separate harmonies together.', 'The governing rule: change the pedal when the harmony changes. Lift just before the new chord and press again as it sounds.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: [q(67, 1), q(71, 3), q(74, 5), q(67, 1), q(72, 4), q(76, 5)],
      pedal: [{ from: 1, to: 3 }, { from: 4, to: 6 }],
      bars: [3], caption: 'One pedal for each harmony — lift where the chord changes.' },
    demo: [67, 71, 74, 67, 72, 76], demoGap: 0.44,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'Judging it by ear', id: 'kl6-pedal-listen',
    say: [
      { text: 'Now an honest word. KeyMaster cannot hear your pedal. There is no way for the app to check it, and I will not pretend otherwise.', pauseAfter: 700, tone: 'warm' },
      { text: 'So this one is genuinely yours to judge. Play the line with pedal, and listen for whether the two harmonies stay separate or run together.', pauseAfter: 580, tone: 'instruct' },
      { text: 'If it sounds muddy, you changed too late. That is the entire feedback loop, and your ears are perfectly capable of it.', pauseAfter: 460, tone: 'warm' },
    ],
    explain: ['KeyMaster cannot detect the sustaining pedal, so this cannot be checked automatically — and no card will claim to.', 'Judge it by ear: if the two harmonies blur into each other, the pedal changed too late. That is a complete and reliable test.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: [q(67, 1), q(71, 3), q(74, 5), q(67, 1), q(72, 4), q(76, 5)],
      pedal: [{ from: 1, to: 3 }, { from: 4, to: 6 }],
      bars: [3], caption: 'Listen for whether the harmonies stay clear of each other.' },
    demo: [67, 71, 74, 67, 72, 76], demoGap: 0.44,
    tryPrompt: 'Play the two bars, changing the pedal where the harmony changes.',
    targets: [67, 71, 74, 67, 72, 76], mode: 'sequence',
    okMsg: 'Notes correct. Whether the pedalling was clean is for your ears — and if it sounded clear, it was.',
    hint: 'Two arpeggios, one per bar. Lift the pedal as you begin the second.',
    reteach: 'Gently — the six lit keys in order. Try it without pedal first, then add it.',
    support: { highlight: [67, 71, 74, 72, 76], replay: true },
  },

  // ===== Chapter 6 — Completing the Minuet ===============================
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'The Minuet — what is already yours', id: 'kl6-minuet-repeat',
    say: [
      { text: 'Back to Petzold. The section you learned was only half of it — and here is the good news about the other half.', pauseAfter: 660, tone: 'warm' },
      { text: 'Bars nine to fourteen are note for note the same as bars one to six. You already know them. Only the last two bars are new.', pauseAfter: 560, tone: 'instruct' },
      { text: 'This is why Key Level 3 spent a chapter on spotting repetition. Six bars of reading, saved, in one real piece.', pauseAfter: 460, tone: 'warm' },
    ],
    explain: ['Bars 9-14 of the Minuet are identical to bars 1-6. Only bars 15-16 are new material.', 'Recognising that repetition — the skill taught in Key Level 3 — reduces eight bars of new reading to two.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: MINUET_RH_B, beams: MINUET_RH_B_BEAMS, systems: [14, 27],
      caption: 'Bars 9-16. Everything up to bar 15 you have already played.' },
    demo: MINUET_RH_B_PITCHES, demoGap: 0.34,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'The Minuet — the two new bars', id: 'kl6-minuet-new',
    say: [
      { text: 'Just bars fifteen and sixteen. The line falls to F sharp and then finally closes on G — the ending the first half refused to give you.', pauseAfter: 700, tone: 'warm' },
      { text: 'Bring the thumb down to F sharp for this bar, as you did in bar seven. Then let the last note settle, with a little broadening.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['Bars 15-16: the melody falls through A, B, A, G to F sharp, then closes on G.', 'This is the resolution the first section withheld. Broaden very slightly into the final note — it is the end of a complete musical sentence.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: MINUET_RH_B.slice(26), beams: [[2, 3], [4, 5]],
      slurs: [[1, 5]], hairpins: [{ from: 1, to: 6, dir: 'dim' }],
      caption: 'The two new bars — and the close the piece has been waiting for.' },
    demo: MINUET_RH_B_PITCHES.slice(26), demoGap: 0.4,
    tryPrompt: 'Play the closing two bars — down to F sharp, then home to G.',
    targets: MINUET_RH_B_PITCHES.slice(26), mode: 'sequence',
    okMsg: 'Closed at last. You have now played the whole of Petzold’s first section — and only two bars of it were new.',
    hint: 'From A, the line dips and falls to the black key F sharp, then rises one step to G and holds.',
    reteach: 'Gently — the lit keys fall step by step to the black key, then settle on G. Take it slowly.',
    support: { highlight: [69, 71, 67, 66], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'The Minuet — the left hand completes', id: 'kl6-minuet-lh-b',
    say: [
      { text: 'The left hand for these eight bars moves more than it did before — there is a real walking bass here, not just held notes.', pauseAfter: 680, tone: 'warm' },
      { text: 'Watch for the F sharp in bar thirteen, and the two big leaps down at the very end. Those three moments are the whole difficulty.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['The left hand in bars 9-16 walks rather than holds, with a quaver run in bar 12 and leaps down at the close.', 'Three moments carry the difficulty: the F sharp in bar 13, and the octave drops in bars 15 and 16. Practise those alone.'],
    show: { kind: 'staff', clef: 'bass', keySig: 'G', timeSig: [3, 4],
      // Break at entry 12, which is the start of bar 13 — a bar line, and
      // clear of the quaver run so no beam is split across two lines.
      notes: MINUET_LH_B, beams: MINUET_LH_B_BEAMS, systems: [12],
      caption: 'Bars 9-16, left hand — a walking bass to the close.' },
    demo: MINUET_LH_B_PITCHES, demoGap: 0.4,
    tryPrompt: 'Play the left hand for bars nine to sixteen.',
    targets: MINUET_LH_B_PITCHES, mode: 'sequence',
    okMsg: 'A walking bass, played through to a proper cadence. Both hands now know the whole section.',
    hint: 'It steps down and back up, with a quick run in bar four of this line, then two leaps down at the end.',
    reteach: 'Gently — take the quaver run and the final two bars on their own before joining the rest.',
    support: { highlight: [59, 57, 55, 60, 54, 50, 43], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'The Minuet — the second half, both hands', id: 'kl6-minuet-both-b',
    say: [
      { text: 'Both hands, bars nine to sixteen, with the expression marks in place. Quiet where it repeats, growing into the close.', pauseAfter: 700, tone: 'warm' },
      { text: 'You are no longer learning notes here. You are deciding how they should sound — which is a different and better kind of work.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['Bars 9-16 with both hands and expression: quiet through the repeated material, growing into the final cadence.', 'The notes are already known. The work now is shaping them — the transition from learning a piece to interpreting it.'],
    show: { kind: 'staff', clef: 'grand', keySig: 'G', timeSig: [3, 4], barsPerSystem: 2,
      voices: { treble: MINUET_RH_B, bass: MINUET_LH_B },
      beams: { treble: MINUET_RH_B_BEAMS, bass: MINUET_LH_B_BEAMS },
      marks: [{ beat: 0, text: 'p' }, { beat: 12, text: 'mf' }],
    },
    demo: MINUET_RH_B_PITCHES, demoGap: 0.34,
    mode: 'none',
  },

  // ===== Chapter 7 — Interpretive Choice =================================
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'Three defensible readings', id: 'kl6-interpret-teach',
    say: [
      { text: 'Here is a phrase, and three different ways of playing it. All three are defensible. None of them is the right answer, because there is not one.', pauseAfter: 720, tone: 'warm' },
      { text: 'You could shape it towards the top note. You could keep it even and let the harmony speak. Or you could lean on the first beat of each bar and make it dance.', pauseAfter: 600, tone: 'instruct' },
      { text: 'Choose one. Then be able to say why. That ability — having a reason — is what separates interpretation from accident.', pauseAfter: 480, tone: 'warm' },
    ],
    explain: ['One phrase, three defensible readings: shaped towards the high point, kept deliberately even, or leaning on each downbeat to emphasise the dance.', 'None is correct. What matters is choosing deliberately and being able to say why — that reasoning is the difference between interpretation and accident.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: [q(67, 1), e8(69, 2), e8(71, 3), q(72, 4), q(74, 5), q(71, 3), q(69, 2), dh(67, 1)],
      beams: [[2, 3]], slurs: [[1, 4]], bars: [4, 7],
      caption: 'One phrase. Three ways to mean it.' },
    demo: [67, 69, 71, 72, 74, 71, 69, 67], demoGap: 0.4,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'Play it your way', id: 'kl6-interpret-play',
    say: [
      { text: 'Now play it the way you chose. I am not going to tell you which way, and I am not going to mark you on it.', pauseAfter: 660, tone: 'warm' },
      { text: 'I will check the notes. The music is yours.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['Play the phrase according to the reading you chose. The notes are checked; the interpretation is not.', 'This is deliberate. From Key Level 6 onward the expressive decisions belong to you, and an app marking them would be teaching obedience rather than musicianship.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: [q(67, 1), e8(69, 2), e8(71, 3), q(72, 4), q(74, 5), q(71, 3), q(69, 2), dh(67, 1)],
      beams: [[2, 3]], slurs: [[1, 4]], bars: [4, 7],
      caption: 'Your reading, your reasons.' },
    demo: [67, 69, 71, 72, 74, 71, 69, 67], demoGap: 0.4,
    tryPrompt: 'Play the phrase the way you have decided it should go.',
    targets: [67, 69, 71, 72, 74, 71, 69, 67], mode: 'sequence',
    okMsg: 'Played as you intended it. Whether I would have chosen the same reading is beside the point — you had one.',
    hint: 'Rising from G through a quick pair to the top, then down to close on G.',
    reteach: 'Gently — the lit keys in order. Secure the notes first; the shaping is yours afterwards.',
    support: { highlight: [67, 69, 71, 72, 74], replay: true },
  },

  // ===== Chapter 8 — Key Level 6 Review ==================================
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'Expression check', id: 'kl6-review-read',
    say: [
      { text: 'A phrase you have not seen, carrying every expressive mark this level has taught. Read them all before you play, and no demonstration this time.', pauseAfter: 700, tone: 'warm' },
      { text: 'Slur, staccato, dynamics, a fade at the end. Decide how it should sound before your hands move.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['Sight-read a phrase carrying slurs, staccato, dynamics and a diminuendo, with no demonstration.', 'Reading the expressive marks before playing — and deciding on the sound in advance — is the whole habit of this level.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'F', timeSig: [4, 4],
      notes: [q(65, 1), q(67, 2), q(69, 3), q(72, 5),
              { midi: 69, value: 'quarter', finger: 3, artic: 'staccato' },
              { midi: 67, value: 'quarter', finger: 2, artic: 'staccato' },
              h2(65, 1)],
      slurs: [[1, 4]], hairpins: [{ from: 1, to: 4, dir: 'cresc' }, { from: 5, to: 7, dir: 'dim' }],
      marks: [{ at: 1, text: 'mp' }], bars: [4],
      caption: 'Read every mark before you play a note.' },
    tryPrompt: 'Sight-read the phrase — joined, then separated, growing then fading.',
    targets: [65, 67, 69, 72, 69, 67, 65], mode: 'sequence',
    okMsg: 'Read cold, with every expressive mark observed. That is a musician reading, not a beginner decoding.',
    hint: 'Four joined notes rising in F major, then two short ones, then a held note home.',
    reteach: 'Gently — the lit keys in order. Get the notes secure, then add the slur and the staccato.',
    support: { highlight: [65, 67, 69, 72], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 6', title: 'Key Level 6 — what you have gained', id: 'kl6-review',
    say: [
      { text: 'You play legato and staccato, you read slurs as phrases and breathe where they end, and you shape a line with dynamics that follow its contour.', pauseAfter: 700, tone: 'warm' },
      { text: 'You know the tempo words, you can broaden an ending without overdoing it, and you understand what the pedal is actually for.', pauseAfter: 600, tone: 'warm' },
      { text: 'And you have finished Petzold’s first section — a complete piece of real music. Key Level 7 pulls back further: form, modulation, compound time, ornaments, and reading music above your own playing level.', pauseAfter: 500, tone: 'instruct' },
    ],
    explain: ['Key Level 6 complete. Legato and staccato, slurs as phrase marks, the full dynamic range and gradual change, tempo language, and the pedal’s real purpose.', 'You have completed the first section of Petzold’s Minuet in G — sixteen bars of genuine repertoire, played with expression rather than merely accurately.', 'Key Level 7, Advanced Musicianship, turns to structure: form, modulation, compound time, ornaments, and score reading beyond your own playing level.'],
    mode: 'none',
  },
];
