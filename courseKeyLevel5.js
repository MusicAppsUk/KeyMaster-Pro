// courseKeyLevel5.js
// KeyMaster Course · Key Level 5 — Harmonic Fluency.
//
// THE PREMISE. The learner has met the tonic triad and can play chords. What
// they cannot yet do is HEAR WHERE MUSIC IS GOING. Harmony is not decoration
// added under a melody; it is the grammar that makes a melody make sense, and
// a musician who knows that grammar can predict the next chord before reading
// it. That prediction is Recognition Before Execution at its purest, and it is
// what this level is for.
//
// KL5 teaching spine:
//   Ch1  Chords Are Built in Thirds   — what a triad IS, seen and heard
//   Ch2  Major and Minor              — one note changes everything
//   Ch3  The Three Chords             — I, IV and V, and why they are enough
//   Ch4  Cadences                     — how a phrase closes, or refuses to
//   Ch5  Inversions                   — why chords change shape: voice-leading
//   Ch6  New Keys                     — D major and F major; the circle
//   Ch7  Predicting Harmony           — hear the next chord before you read it
//   Ch8  Harmony in Real Music        — Petzold in the minor, analysed
//   Ch9  Key Level 5 Review
//
// INFRASTRUCTURE USED (all delivered in staffViz.js rc2-216):
//   • chords with shared stems and displaced seconds;
//   • Roman-numeral `analysis` labels on their own line under the staff;
//   • flat-key spelling, so E flat is drawn on the E space and not as D sharp;
//   • two-voice time-aligned notation for harmonised writing.
//
// SOURCING. The G minor Minuet, BWV Anh.115 — also by Christian Petzold, the
// companion movement to the G major one learned in KL4 — was transcribed from
// the same CC0-1.0 LilyPond source, parsed programmatically, never from memory:
//   https://github.com/jeandeaual/lilypond-piano-bwvanh114-115
// Having the same composer's same dance in both modes is an unusually honest
// way to teach major against minor: nothing else about the music changes.
//
// Triads, cadences and inversions are taught from first principles. They are
// facts about how scales work, not anybody's composition, so no source
// attribution arises.

const q = (midi, finger) => ({ midi, value: 'quarter', finger });
const e8 = (midi, finger) => ({ midi, value: 'eighth', finger });
const h2 = (midi, finger) => ({ midi, value: 'half', finger });
const dh = (midi, finger) => ({ midi, value: 'dotted-half', finger });
const ch = (midis, value) => ({ chord: midis, value });

// Petzold, Minuet in G minor BWV Anh.115, right hand bars 1-4.
// Parsed from the CC0 source; ornaments and staccato marks omitted (they
// describe how to play a note, not which note), every pitch unaltered.
const GMINOR_RH = [
  /* 1 */ q(82), q(81), q(79),
  /* 2 */ q(81), q(74), q(74),
  /* 3 */ q(79), e8(67), e8(69), e8(70), e8(72),
  /* 4 */ dh(74),
];
const GMINOR_PITCHES = [82, 81, 79, 81, 74, 74, 79, 67, 69, 70, 72, 74];

export const KEY_LEVEL5_STEPS = [

  // ===== Chapter 1 — Chords Are Built in Thirds =========================
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Key Level 5 begins', id: 'kl5-welcome',
    say: [
      { text: 'You can play chords. What you cannot do yet — and what this level is for — is hear where music is going before you get there.', pauseAfter: 700, tone: 'warm' },
      { text: 'Harmony is not decoration underneath a tune. It is the grammar that makes the tune make sense. Learn the grammar and music stops surprising you.', pauseAfter: 540, tone: 'instruct' },
    ],
    explain: ['Key Level 5 — Harmonic Fluency. The aim is prediction: hearing where a passage is going before you read it.', 'Harmony is the grammar underneath melody, not an accompaniment added to it. Knowing that grammar is what lets a musician anticipate.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Every chord is a stack of thirds', id: 'kl5-triad-build',
    say: [
      { text: 'Here is the whole construction, and it is simpler than it sounds. Take a note. Skip one. Take the next. Skip one. Take the next.', pauseAfter: 680, tone: 'warm' },
      { text: 'C, skip D, E, skip F, G. Three notes, each a third above the last. That is a triad — and every chord you will ever play begins this way.', pauseAfter: 560, tone: 'instruct' },
    ],
    explain: ['A triad is built by stacking thirds: take a note, skip one, take the next, skip one, take the next — C, E, G.', 'On the page this is unmistakable: three note-heads all on lines, or all in spaces. Learning to see that shape is learning to read chords at a glance.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false,
      notes: [q(60, 1), q(64, 3), q(67, 5), ch([60, 64, 67], 'whole')],
      caption: 'C, E, G — skipping thirds, then sounded together as a triad.' },
    demo: [60, 64, 67, 60, 64, 67], demoGap: 0.4,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Play the triad', id: 'kl5-triad-play',
    say: [
      { text: 'Play all three together — thumb, middle finger, little finger. One sound, not three.', pauseAfter: 660, tone: 'warm' },
      { text: 'Press evenly, so no note sticks out. A chord that speaks as one is the first goal of chord playing.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['Play C, E and G together with fingers 1, 3 and 5. Aim for a single blended sound, not three separate notes.', 'Evenness matters: if one finger presses harder the chord splits. Listening for blend is the skill here.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false,
      notes: [ch([{ midi: 60, finger: 1 }, { midi: 64, finger: 3 }, { midi: 67, finger: 5 }], 'whole')],
      caption: 'The C major triad — played as one sound.' },
    demo: [60, 64, 67], demoGap: 0.08,
    tryPrompt: 'Play C, E and G together.',
    targets: [60, 64, 67], mode: 'set',
    okMsg: 'One sound from three notes — evenly balanced. That is a chord properly played.',
    hint: 'Thumb on C, middle finger on E, little finger on G — all pressed at the same moment.',
    reteach: 'Gently — the three lit keys are played together, not one after another. Let the hand fall on all three at once.',
    support: { highlight: [60, 64, 67], replay: true },
  },

  // ===== Chapter 2 — Major and Minor =====================================
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'One note changes everything', id: 'kl5-minor-hear',
    say: [
      { text: 'Now listen carefully. The same chord, twice — and only the middle note moves, by one key.', pauseAfter: 660, tone: 'warm' },
      { text: 'That single semitone is the difference between major and minor. Between bright and shadowed. Nothing else changes at all.', pauseAfter: 560, tone: 'instruct' },
      { text: 'If you can hear that one difference, you can hear the emotional colour of almost all Western music.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['C-E-G is major. Lower the middle note one semitone to E flat and it becomes C minor. Only one note moves.', 'This single semitone carries almost all of the emotional contrast in Western music — bright against shadowed.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false,
      notes: [ch([60, 64, 67], 'half'), ch([60, { midi: 63, accidental: 'flat' }, 67], 'half')],
      caption: 'C major, then C minor — only the middle note has moved.' },
    demo: [60, 64, 67, 60, 63, 67], demoGap: 0.1,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Play major, then minor', id: 'kl5-minor-play',
    say: [
      { text: 'Play the major chord. Then move only your middle finger down one key — onto the black key — and play again.', pauseAfter: 680, tone: 'warm' },
      { text: 'Two chords, one small movement between them. Listen to what that movement does.', pauseAfter: 440, tone: 'instruct' },
    ],
    explain: ['Play C-E-G, then move the middle finger down one semitone to E flat and play C-E flat-G.', 'The hand barely moves. The change in character is out of all proportion to the physical movement — which is exactly what makes it worth knowing.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false,
      notes: [ch([{ midi: 60, finger: 1 }, { midi: 63, accidental: 'flat', finger: 3 }, { midi: 67, finger: 5 }], 'whole')],
      caption: 'C minor — the middle note is now the black key, E flat.' },
    demo: [60, 63, 67], demoGap: 0.08,
    tryPrompt: 'Play the C minor chord — C, E flat and G together.',
    targets: [60, 63, 67], mode: 'set',
    okMsg: 'C minor — the same hand shape, one key lower in the middle, and a completely different colour.',
    hint: 'Thumb on C and little finger on G stay where they were. Only the middle finger moves, onto the black key just below E.',
    reteach: 'Gently — the three lit keys, played together. The middle one is a black key this time.',
    support: { highlight: [60, 63, 67], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Minor in real music', id: 'kl5-minor-real',
    say: [
      { text: 'Petzold wrote a companion to the Minuet you learned — the same dance, the same key centre, but in the minor.', pauseAfter: 680, tone: 'warm' },
      { text: 'Listen to how different it feels, and remember that the difference began with one note moving by one semitone.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['The Minuet in G minor, BWV Anh.115 — Petzold’s companion to the G major minuet learned in Key Level 4.', 'Same composer, same dance, same tonic. Only the mode differs — which makes it an unusually clean demonstration of what minor does.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'Gm', timeSig: [3, 4],
      notes: GMINOR_RH, beams: [[8, 9], [10, 11]], systems: [7],
      caption: 'Minuet in G minor, BWV Anh.115 — Christian Petzold. Opening bars.' },
    demo: GMINOR_PITCHES, demoGap: 0.4,
    mode: 'none',
  },

  // ===== Chapter 3 — The Three Chords ====================================
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Three chords hold up a key', id: 'kl5-three-see',
    say: [
      { text: 'A key has seven notes, so it has seven possible triads. But three of them do nearly all the work.', pauseAfter: 660, tone: 'warm' },
      { text: 'The chord on the first note — home. The chord on the fourth. The chord on the fifth. Musicians call them one, four and five, and write them in Roman numerals.', pauseAfter: 580, tone: 'instruct' },
      { text: 'Learn to hear those three and you can follow the harmony of an enormous amount of music.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['Of the seven triads in a key, three carry most of the weight: those built on the first, fourth and fifth degrees — I, IV and V.', 'Roman numerals name a chord by its position in the key rather than by its letter, so the same analysis works in every key.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false,
      notes: [ch([60, 64, 67], 'half'), ch([65, 69, 72], 'half'), ch([67, 71, 74], 'half')],
      analysis: [{ at: 1, text: 'I' }, { at: 2, text: 'IV' }, { at: 3, text: 'V' }],
      caption: 'The three main chords of C major — I, IV and V.' },
    demo: [60, 64, 67, 65, 69, 72, 67, 71, 74], demoGap: 0.1,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Play one, four, five, one', id: 'kl5-three-play',
    say: [
      { text: 'Now play them in the order almost all music uses: home, away, further away, home again. One, four, five, one.', pauseAfter: 680, tone: 'warm' },
      { text: 'Listen to the pull of the last one. After the fifth chord, home is not just pleasant — it feels necessary.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['Play I, IV, V, I in C major. This progression — home, away, further, home — underlies an enormous amount of Western music.', 'Notice that after V, the return to I feels inevitable rather than merely pleasant. That sense of necessity is what harmony does.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4],
      notes: [ch([60, 64, 67], 'whole'), ch([65, 69, 72], 'whole'), ch([67, 71, 74], 'whole'), ch([60, 64, 67], 'whole')],
      analysis: [{ at: 1, text: 'I' }, { at: 2, text: 'IV' }, { at: 3, text: 'V' }, { at: 4, text: 'I' }],
      bars: [1, 2, 3], caption: 'I – IV – V – I. Home, away, further away, home.' },
    demo: [60, 64, 67, 65, 69, 72, 67, 71, 74, 60, 64, 67], demoGap: 0.1,
    tryPrompt: 'Play the first chord of the progression — C, E and G together.',
    targets: [60, 64, 67], mode: 'set',
    okMsg: 'Home established. Now you have somewhere to travel away from — which is what the other two chords are for.',
    hint: 'The first chord is the home chord of C major: C, E and G.',
    reteach: 'Gently — the three lit keys together. This is the chord the whole progression returns to.',
    support: { highlight: [60, 64, 67], replay: true },
  },

  // ===== Chapter 4 — Cadences ============================================
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'How a phrase closes', id: 'kl5-cadence-hear',
    say: [
      { text: 'The last two chords of a phrase decide whether it sounds finished. Musicians call that pair a cadence.', pauseAfter: 660, tone: 'warm' },
      { text: 'Five to one sounds closed — a full stop. One to five sounds open — a comma, waiting for more.', pauseAfter: 540, tone: 'instruct' },
      { text: 'Listen to each. You have met this before without the name: Still Water asked a question and answered it. This is why that worked.', pauseAfter: 460, tone: 'warm' },
    ],
    explain: ['A cadence is the pair of chords that ends a phrase, and it decides whether the phrase sounds finished.', 'V-I closes like a full stop. I-V leaves the phrase open, like a comma — which is exactly the question-and-answer shape met in Still Water and again in the Minuet.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4],
      notes: [ch([67, 71, 74], 'whole'), ch([60, 64, 67], 'whole'), ch([60, 64, 67], 'whole'), ch([67, 71, 74], 'whole')],
      analysis: [{ at: 1, text: 'V' }, { at: 2, text: 'I' }, { at: 3, text: 'I' }, { at: 4, text: 'V' }],
      bars: [1, 2, 3], caption: 'Closed, then open — a full stop, then a comma.' },
    demo: [67, 71, 74, 60, 64, 67, 60, 64, 67, 67, 71, 74], demoGap: 0.1,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Name the ending', id: 'kl5-cadence-play',
    say: [
      { text: 'Play the closing chord of a full stop — the home chord arriving after the fifth. Feel how it settles.', pauseAfter: 660, tone: 'warm' },
      { text: 'From now on, when a piece ends, ask yourself whether it closed or merely paused. You will nearly always be able to tell.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['Play the home chord that closes a V-I cadence. Listen to how completely it settles.', 'Asking whether a phrase closed or merely paused is a listening habit worth keeping. It is usually audible immediately once you know to listen for it.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false,
      notes: [ch([{ midi: 60, finger: 1 }, { midi: 64, finger: 3 }, { midi: 67, finger: 5 }], 'whole')],
      analysis: [{ at: 1, text: 'I' }],
      caption: 'The chord that closes the phrase.' },
    demo: [60, 64, 67], demoGap: 0.08,
    tryPrompt: 'Play the home chord that closes the cadence.',
    targets: [60, 64, 67], mode: 'set',
    okMsg: 'Closed and settled. That is what a full stop sounds like in music.',
    hint: 'The home chord of C major — C, E and G together.',
    reteach: 'Gently — the three lit keys, pressed at the same moment.',
    support: { highlight: [60, 64, 67], replay: true },
  },

  // ===== Chapter 5 — Inversions ==========================================
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Why chords change shape', id: 'kl5-inversion-why',
    say: [
      { text: 'Playing I, then IV, then V meant leaping the whole hand about. Composers solved that centuries ago, and the solution is called inversion.', pauseAfter: 700, tone: 'warm' },
      { text: 'Take the bottom note of a chord and move it to the top. Same three notes, same chord, different shape — and suddenly the hand barely has to move.', pauseAfter: 580, tone: 'instruct' },
      { text: 'Inversions are not theory for its own sake. They exist so that hands, and voices, can move smoothly.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['An inversion moves the lowest note of a chord up an octave. The notes and the chord are unchanged; only the arrangement differs.', 'Their purpose is practical: inversions let one chord move to the next with the smallest possible movement, for hands and for voices alike.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false,
      notes: [ch([60, 64, 67], 'half'), ch([64, 67, 72], 'half'), ch([67, 72, 76], 'half')],
      analysis: [{ at: 1, text: 'I' }, { at: 2, text: 'I6' }, { at: 3, text: 'I64' }],
      caption: 'One chord, three shapes — root position and its two inversions.' },
    demo: [60, 64, 67, 64, 67, 72, 67, 72, 76], demoGap: 0.1,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Smooth movement', id: 'kl5-inversion-play',
    say: [
      { text: 'Here is the point of it. The home chord, then the fifth chord in an inversion that sits right beside it. Two notes stay exactly where they are.', pauseAfter: 700, tone: 'warm' },
      { text: 'Play the second chord. Notice how little your hand has to travel compared with the leaping version.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['From C-E-G, the V chord in second inversion is B-D-G — and G is common to both, with B and D a step from C and E.', 'That is voice-leading: choosing the shape that moves least. It is why inversions are worth learning as shapes rather than as theory.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4],
      notes: [ch([60, 64, 67], 'whole'), ch([{ midi: 59, finger: 1 }, { midi: 62, finger: 2 }, { midi: 67, finger: 5 }], 'whole')],
      analysis: [{ at: 1, text: 'I' }, { at: 2, text: 'V' }],
      bars: [1], caption: 'The G stays put; the other two move by a step.' },
    demo: [60, 64, 67, 59, 62, 67], demoGap: 0.1,
    tryPrompt: 'Play the second chord — B, D and G together.',
    targets: [59, 62, 67], mode: 'set',
    okMsg: 'Barely any movement, and the harmony still changed completely. That is what inversions are for.',
    hint: 'Keep the little finger on G. The thumb drops to B and the second finger takes D.',
    reteach: 'Gently — the three lit keys together. The top note is the same G you already had.',
    support: { highlight: [59, 62, 67], replay: true },
  },

  // ===== Chapter 6 — New Keys ============================================
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Two sharps — D major', id: 'kl5-dmajor',
    say: [
      { text: 'G major needed one sharp. D major needs two — F sharp and C sharp — and the pattern behind that is worth knowing.', pauseAfter: 680, tone: 'warm' },
      { text: 'Each time you move up a fifth from one key to the next, you add exactly one sharp. C has none, G has one, D has two. The keys are in a chain.', pauseAfter: 580, tone: 'instruct' },
    ],
    explain: ['D major has two sharps, F sharp and C sharp. Its home chord is D-F sharp-A.', 'Moving up a fifth adds a sharp each time: C (none), G (one), D (two), A (three). That chain is the circle of fifths, and it makes key signatures predictable rather than arbitrary.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'D', timeSig: false,
      notes: [ch([{ midi: 62, finger: 1 }, { midi: 66, finger: 2 }, { midi: 69, finger: 4 }], 'whole')],
      analysis: [{ at: 1, text: 'I' }],
      caption: 'D major — two sharps, and the home chord D, F sharp, A.' },
    demo: [62, 66, 69], demoGap: 0.08,
    tryPrompt: 'Play the home chord of D major — D, F sharp and A together.',
    targets: [62, 66, 69], mode: 'set',
    okMsg: 'D major, with its black key inside the chord. A new key, opened with what you already knew.',
    hint: 'D with the thumb, then the black key F sharp, then A. All three together.',
    reteach: 'Gently — the three lit keys at once. The middle one is a black key.',
    support: { highlight: [62, 66, 69], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'One flat — F major', id: 'kl5-fmajor',
    say: [
      { text: 'Now the other direction. Move DOWN a fifth from C and you reach F — and instead of gaining a sharp you gain a flat.', pauseAfter: 680, tone: 'warm' },
      { text: 'B flat: the black key just below B. Your first flat key, and the chain runs both ways from here.', pauseAfter: 500, tone: 'instruct' },
    ],
    explain: ['F major has one flat, B flat. Its home chord is F-A-C.', 'Moving down a fifth adds a flat, just as moving up adds a sharp. The same chain of keys runs in both directions from C.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'F', timeSig: false,
      notes: [ch([{ midi: 65, finger: 1 }, { midi: 69, finger: 3 }, { midi: 72, finger: 5 }], 'whole')],
      analysis: [{ at: 1, text: 'I' }],
      caption: 'F major — one flat, and the home chord F, A, C.' },
    demo: [65, 69, 72], demoGap: 0.08,
    tryPrompt: 'Play the home chord of F major — F, A and C together.',
    targets: [65, 69, 72], mode: 'set',
    okMsg: 'F major. You now know keys on both sides of C — sharps one way, flats the other.',
    hint: 'Thumb on F, middle finger on A, little finger on C — all white keys, all together.',
    reteach: 'Gently — the three lit keys, pressed at the same moment.',
    support: { highlight: [65, 69, 72], replay: true },
  },

  // ===== Chapter 7 — Predicting Harmony ==================================
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Hear it before you read it', id: 'kl5-predict-teach',
    say: [
      { text: 'This is the exercise this whole level was built for, and it is the one that will change how you listen.', pauseAfter: 660, tone: 'warm' },
      { text: 'I will play three chords of a four-chord phrase and then stop. Before you look at anything, sing or play what you think comes next.', pauseAfter: 560, tone: 'instruct' },
      { text: 'You will usually be right. Not because you guessed — because the grammar only allows a few sensible answers, and you have just learned it.', pauseAfter: 460, tone: 'warm' },
    ],
    explain: ['Listen to three chords of a four-chord phrase, then predict the fourth before seeing or hearing it.', 'Correct predictions are not guesswork: harmonic grammar narrows the plausible answers to very few. Recognising that is what harmonic fluency means.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [4, 4],
      notes: [ch([60, 64, 67], 'whole'), ch([65, 69, 72], 'whole'), ch([67, 71, 74], 'whole')],
      analysis: [{ at: 1, text: 'I' }, { at: 2, text: 'IV' }, { at: 3, text: 'V' }],
      bars: [1, 2], caption: 'Three chords. What must come next?' },
    demo: [60, 64, 67, 65, 69, 72, 67, 71, 74], demoGap: 0.1,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Play what must come next', id: 'kl5-predict-play',
    say: [
      { text: 'You heard one, four, five. Play the chord that has to follow — the one your ear is already expecting.', pauseAfter: 660, tone: 'warm' },
      { text: 'Trust it. If it sounds right, it very probably is.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['After I-IV-V, the chord the ear expects is I — the return home.', 'Playing what you predicted, and finding it correct, is the moment harmony stops being theory and becomes hearing.'],
    show: { kind: 'staff', clef: 'treble', timeSig: false,
      notes: [ch([{ midi: 60, finger: 1 }, { midi: 64, finger: 3 }, { midi: 67, finger: 5 }], 'whole')],
      analysis: [{ at: 1, text: 'I' }],
      caption: 'Home — the chord the phrase was always heading for.' },
    demo: [60, 64, 67], demoGap: 0.08,
    tryPrompt: 'Play the chord that completes the phrase.',
    targets: [60, 64, 67], mode: 'set',
    okMsg: 'You predicted the harmony and you were right. That is a genuinely different way of listening from where you started.',
    hint: 'After one, four and five, music goes home. Play the home chord of C major.',
    reteach: 'Gently — the three lit keys together: C, E and G, the chord the phrase has been heading for.',
    support: { highlight: [60, 64, 67], replay: true },
  },

  // ===== Chapter 8 — Harmony in Real Music ===============================
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Harmony under a melody', id: 'kl5-real-analysis',
    say: [
      { text: 'Here is a melody with its harmony written underneath, and the Roman numerals showing what each chord is doing.', pauseAfter: 660, tone: 'warm' },
      { text: 'Read the numerals as a sentence: home, away, tension, home. The melody sits on top of that structure — it does not create it.', pauseAfter: 560, tone: 'instruct' },
    ],
    explain: ['A four-bar phrase with its harmony analysed underneath: I, IV, V, I.', 'The melody is supported by the harmony, not the other way round. Reading the numerals tells you the shape of the phrase before you read a single melodic note.'],
    show: { kind: 'staff', clef: 'grand', timeSig: [4, 4], barsPerSystem: 2,
      voices: {
        treble: [q(72, 5), q(71, 4), h2(67, 1), q(69, 2), q(72, 5), h2(71, 4), q(74, 5), q(71, 3), h2(67, 1), h2(64, 3), h2(60, 1)],
        bass: [ch([48, 52, 55], 'whole'), ch([53, 57, 60], 'whole'), ch([55, 59, 62], 'whole'), ch([48, 52, 55], 'whole')],
      },
      analysis: [],
      marks: [{ beat: 0, text: 'p' }],
    },
    demo: [72, 71, 67, 69, 72, 71, 74, 71, 67, 64, 60], demoGap: 0.4,
    mode: 'none',
  },

  // ===== Chapter 9 — Key Level 5 Review ==================================
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Harmony check', id: 'kl5-review-play',
    say: [
      { text: 'One last chord, with no demonstration. The key signature has one flat — so which key are you in, and what is its home chord?', pauseAfter: 700, tone: 'warm' },
      { text: 'Work it out rather than guessing. You have everything you need.', pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ['One flat in the key signature means F major. Its home chord is F-A-C.', 'Reading a key signature and deducing the home chord from it, without being told, is the practical test of harmonic understanding.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'F', timeSig: false,
      notes: [ch([{ midi: 65, finger: 1 }, { midi: 69, finger: 3 }, { midi: 72, finger: 5 }], 'whole')],
      analysis: [{ at: 1, text: 'I' }],
      caption: 'One flat. Which key, and which chord?' },
    tryPrompt: 'Play the home chord of this key.',
    targets: [65, 69, 72], mode: 'set',
    okMsg: 'One flat, F major, F-A-C — deduced from the key signature alone. That is harmonic understanding, not memory.',
    hint: 'One flat means F major. Build the triad from F: F, A, C.',
    reteach: 'Gently — the three lit keys together. The lowest is F, the home note of this key.',
    support: { highlight: [65, 69, 72], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 5', title: 'Key Level 5 — what you have gained', id: 'kl5-review',
    say: [
      { text: 'You build triads by stacking thirds, and you hear the single semitone that turns major into minor.', pauseAfter: 660, tone: 'warm' },
      { text: 'You know I, IV and V, and what a cadence does. You know why inversions exist. You read key signatures in sharps and flats, and you can predict a chord before you read it.', pauseAfter: 640, tone: 'warm' },
      { text: 'Key Level 6 changes the question entirely. Until now the answer has been what to play. From here it becomes how — and the answer starts being yours rather than mine.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['Key Level 5 complete. You build triads, hear major against minor, know I-IV-V and cadences, and understand inversions as voice-leading rather than theory.', 'You read sharp and flat key signatures and can deduce a home chord from them — and you can predict harmony before reading it.', 'Key Level 6, Expressive Repertoire, shifts the question from what to play to how to play it — and begins handing the interpretive decisions to you.'],
    mode: 'none',
  },
];
