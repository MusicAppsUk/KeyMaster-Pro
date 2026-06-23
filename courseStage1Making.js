// courseStage1Making.js
// KeyMaster Stage 1 — Making Music (Stage 2 in rc2-127 numbering), incl. the original studies.
// Extracted verbatim from foundations.js (the rc2-127 monolith) by the rc2-136
// thin-engine split. Identity-preserving: the SAME step objects, in the SAME
// order, with the SAME ids and fields — only their physical file location moved,
// so the Course renders identically. Original KeyMaster material; no third-party, method-book, or competitor content.

export const STAGE1_MAKING_STEPS = [
  // ===========================================================================
  // STAGE 2 \u2014 Making Music. Applied music built on the Stage 1 foundations:
  // short phrases, pulse inside music, scale shape, harmony, pattern recognition,
  // a first melody. Same gating / captions-first / demo-sweep engine; no timing
  // is scored. Masterclasses remain optional deeper practice, never the Course.
  // ===========================================================================
  {
    eyebrow: 'Foundation Course \u00B7 Stage 2 \u00B7 Making music', title: 'Welcome to Stage 2', id: 'stage2-welcome',
    say: [
      { text: 'Welcome to Stage 2. In Stage 1 you learned the keyboard; now we start to shape those notes into music.', pauseAfter: 620, tone: 'warm' },
      { text: 'Short phrases, a little harmony, and a steady pulse underneath \u2014 one small step at a time.', pauseAfter: 360 },
    ],
    explain: ['Welcome to Stage 2. You\u2019ll begin connecting notes into short phrases, a little harmony, and pulse \u2014 the start of shaping sound into music.', 'Nothing here is graded for timing. We\u2019re building musicianship, one small step at a time.'],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'From notes to music.', label: 'Stage 2' },
    mode: 'none',
  },
  {
    eyebrow: 'Foundation Course \u00B7 Stage 2', title: 'Why B major fits the hand', id: 'bmaj-shape',
    say: [
      { text: 'Here\u2019s something pianists know: B major sits beautifully under the hand.', pauseAfter: 580, tone: 'warm' },
      { text: 'Your long fingers \u2014 two, three and four \u2014 fall naturally onto the raised black keys, while the thumb and little finger rest on the white keys. C major actually asks more of a beginner\u2019s flat hand.', pauseAfter: 720 },
      { text: 'C major stays our reference for naming and reading. But B major is the KeyMaster hand-shape pathway \u2014 the shape your hand wants to make.', pauseAfter: 360, tone: 'warm' },
    ],
    explain: ['B major fits the hand: the long fingers (2, 3, 4) fall onto the raised black keys, while the thumb (1) and little finger (5) take the white keys.', 'Fr\u00E9d\u00E9ric Chopin (1810\u20131849), one of the greatest pianist-composers in history, placed great importance on the natural shape of the hand \u2014 and is said to have started pupils not from C major but from a position where the long fingers rest on the black keys. He understood something the keyboard hides at first glance: the easiest notes to read are not always the easiest notes for the hand.', 'So C major stays our landmark for reading and naming; B major is the KeyMaster hand-shape pathway, introduced early not to be difficult but to let the hand feel organised and supported. Watch the long fingers light \u2014 those are the ones that reach the black keys.'],
    show: { kind: 'hand', hand: 'right', sweep: [2, 3, 4], caption: 'Long fingers 2, 3, 4 reach the black keys; 1 and 5 stay on white.' },
    mode: 'none',
  },
  {
    eyebrow: 'The B-major pathway', title: 'Right hand: B, C\u266F, D\u266F', id: 'bmaj-rh',
    say: [
      { text: 'Let\u2019s play the first three notes of B major with the right hand.', pauseAfter: 560, tone: 'warm' },
      { text: 'Thumb on B \u2014 finger one. Then finger two on C sharp, the black key. Then finger three on D sharp, the next black key.', pauseAfter: 700, emphasis: 'three' },
      { text: 'Play them in order: B, C sharp, D sharp \u2014 fingers one, two, three.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Right-hand B major begins: finger 1 (thumb) on B, finger 2 on C\u266F, finger 3 on D\u266F.', 'The white key first, then your long fingers step up onto the two black keys. Play B, C\u266F, D\u266F in order.'],
    show: { kind: 'keys', midis: [71, 73, 75], caption: '1 on B, 2 on C\u266F, 3 on D\u266F.', label: 'B  C\u266F  D\u266F' },
    staffHint: { clef: 'treble', notes: [71, 73, 75] },
    handHint: { hand: 'right', highlight: [1, 2, 3] },
    demo: [71, 73, 75], demoGap: 0.5,
    tryPrompt: 'Right hand: play B, then C\u266F, then D\u266F (fingers 1, 2, 3).', targets: [71, 73, 75], mode: 'sequence',
    okMsg: 'That\u2019s the B-major hand shape, right hand \u2014 thumb on white, long fingers reaching the black keys. It already feels natural.',
    hint: 'Start on B (white), then the black key just above (C\u266F), then the next black key (D\u266F): fingers 1, 2, 3.',
  },
  {
    eyebrow: 'The B-major pathway', title: 'Left hand: the 4th-finger anchor', id: 'bmaj-lh',
    say: [
      { text: 'The left hand has its own rule in the B family: it begins on the fourth finger.', pauseAfter: 620, tone: 'warm' },
      { text: 'Finger four on B, finger three on C sharp, finger two on D sharp. The fourth finger is your anchor for the B-major shape.', pauseAfter: 700 },
      { text: 'Play them in order: B, C sharp, D sharp \u2014 left-hand fingers four, three, two.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Left-hand B major has its own anchor: finger 4 on B, finger 3 on C\u266F, finger 2 on D\u266F.', 'The 4th finger is reserved for the B family \u2014 it steadies the whole shape. Play B, C\u266F, D\u266F with fingers 4, 3, 2.'],
    show: { kind: 'keys', midis: [59, 61, 63], caption: '4 on B, 3 on C\u266F, 2 on D\u266F.', label: 'B  C\u266F  D\u266F' },
    staffHint: { clef: 'bass', notes: [59, 61, 63] },
    handHint: { hand: 'left', highlight: [4, 3, 2] },
    demo: [59, 61, 63], demoGap: 0.5,
    tryPrompt: 'Left hand: play B, then C\u266F, then D\u266F (fingers 4, 3, 2).', targets: [59, 61, 63], mode: 'sequence',
    okMsg: 'That\u2019s the left-hand B anchor \u2014 fourth finger on B. Hand by hand first; both hands together comes later, once each is sure.',
    hint: 'Lower on the keyboard: B (white), then C\u266F, then D\u266F \u2014 left-hand fingers 4, 3, 2.',
  },
  {
    eyebrow: 'Making music', title: 'A phrase, going up', id: 'phrase-up',
    say: [
      { text: 'A phrase is a few notes that belong together \u2014 a small musical idea.', pauseAfter: 540, tone: 'warm' },
      { text: 'Play C, then D, then E \u2014 three steps up.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['A phrase is a few notes that belong together \u2014 a small musical idea.', 'Play three steps up: C, D, E.'],
    show: { kind: 'keys', midis: [60, 62, 64], caption: 'Up: C, D, E.', label: 'C D E' },
    cues: { arrow: { from: 60, to: 64 } },
    staffHint: { clef: 'treble', notes: [60, 62, 64] },
    handHint: { hand: 'right', highlight: [1, 2, 3] },
    demo: [60, 62, 64], demoGap: 0.5,
    tryPrompt: 'Play C, then D, then E \u2014 in order.', targets: [60, 62, 64], mode: 'sequence',
    okMsg: 'That\u2019s it \u2014 three notes rising, cleanly in order. That ordered shape is the start of a musical line.',
    hint: 'Start on C, then the next white key, then the next: C, D, E.',
  },
  {
    eyebrow: 'Making music', title: 'A phrase, coming down', id: 'phrase-down',
    say: [
      { text: 'Now the same idea, coming back down.', pauseAfter: 520, tone: 'warm' },
      { text: 'Play E, then D, then C.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Now reverse it \u2014 a phrase coming down.', 'Play E, then D, then C.'],
    show: { kind: 'keys', midis: [64, 62, 60], caption: 'Down: E, D, C.', label: 'E D C' },
    cues: { arrow: { from: 64, to: 60 } },
    staffHint: { clef: 'treble', notes: [64, 62, 60] },
    handHint: { hand: 'right', highlight: [3, 2, 1] },
    demo: [64, 62, 60], demoGap: 0.5,
    tryPrompt: 'Play E, then D, then C \u2014 in order.', targets: [64, 62, 60], mode: 'sequence',
    okMsg: 'Good \u2014 you kept the notes in order, both directions. Up and back down: a phrase has shape.',
    hint: 'Start on E, then the next white key down, then the next: E, D, C.',
  },
  {
    eyebrow: 'Reading a pattern', title: 'Four notes in order', id: 'read-pattern',
    say: [
      { text: 'Reading music is naming notes, then playing them in order \u2014 a few at a time to start.', pauseAfter: 560, tone: 'warm' },
      { text: 'Here is a short pattern: C, then E, then D, then C again. Look at each, then play them in order.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Reading music is naming notes, then playing them in order. We grow it a few notes at a time.', 'The pattern is C, E, D, C. Look at each note, then play them in turn.'],
    show: { kind: 'keys', midis: [60, 64, 62, 60], caption: 'C, E, D, C.', label: 'C E D C' },
    staffHint: { clef: 'treble', notes: [60, 64, 62, 60] },
    demo: [60, 64, 62, 60], demoGap: 0.5,
    tryPrompt: 'Play the pattern in order: C, E, D, then C.', targets: [60, 64, 62, 60], mode: 'sequence',
    okMsg: 'Good \u2014 you held the order: C, E, D, C. Reading is this, growing a little longer over time.',
    hint: 'C, then E, then D, then C again.',
  },
  {
    eyebrow: 'Rhythm in music', title: 'Play on the pulse', id: 'play-on-pulse',
    say: [
      { text: 'Now let\u2019s put notes on the pulse.', pauseAfter: 520, tone: 'warm' },
      { text: 'Listen to the count of four, then play a note on each beat \u2014 four notes, steady.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Music is notes over a steady pulse. Let\u2019s feel that together.', 'Listen to the count: 1, 2, 3, 4. Then play a note on each beat \u2014 any notes, kept steady.'],
    show: { kind: 'pulse', caption: 'A note on each beat: 1 2 3 4.' },
    tryPrompt: 'After the count, play a note on each of the four beats.', mode: 'count', count: 4,
    okMsg: 'That\u2019s music on a pulse \u2014 notes riding a steady beat. No rush, nothing scored \u2014 just the feel of it.',
    hint: 'Wait for the count to finish, then play four notes, evenly spaced.',
  },
  {
    eyebrow: 'Rhythm in music', title: 'A pattern, in time', id: 'pattern-pulse',
    say: [
      { text: 'Now a small pattern, kept in time.', pauseAfter: 520, tone: 'warm' },
      { text: 'Listen to the count of four. Then play four notes, one on each beat \u2014 try C, D, E, then C again, kept even.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A pattern over a pulse is where notes and time meet \u2014 the start of real rhythm.', 'Listen to the count: 1, 2, 3, 4. Then play four notes, one per beat \u2014 C, D, E, C works well, kept even.'],
    show: { kind: 'pulse', caption: 'A note on each beat: 1 2 3 4.' },
    tryPrompt: 'After the count, play four notes \u2014 one on each beat.', mode: 'count', count: 4,
    okMsg: 'Good \u2014 a pattern sitting on a steady pulse. Notes and time together: that connection is the heart of rhythm.',
    hint: 'Wait for the count, then four even notes, one per beat \u2014 C, D, E, C is a good choice.',
  },
  {
    eyebrow: 'Scale shape', title: 'The scale as a shape', id: 'scale-shape-up',
    say: [
      { text: 'A scale isn\u2019t just notes \u2014 it\u2019s a shape your hand learns.', pauseAfter: 560, tone: 'warm' },
      { text: 'Climb the C scale all the way up to the next C: C, D, E, F, G, A, B, C.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A scale is a shape \u2014 the same pattern of steps your hand can learn to feel. We use C here because it names and reads easily.', 'Climb from C up to the next C: C, D, E, F, G, A, B, C.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67, 69, 71, 72], caption: 'C up to the next C.', label: 'C \u2192 C' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 65, 67, 69, 71, 72] },
    demo: [60, 62, 64, 65, 67, 69, 71, 72], demoGap: 0.34,
    tryPrompt: 'Climb the white keys from C up to the next C.', targets: [60, 62, 64, 65, 67, 69, 71, 72], mode: 'sequence',
    okMsg: 'That\u2019s the scale shape \u2014 a full octave. The Scales Masterclass takes this much further whenever you want it.',
    hint: 'Start on Middle C and play each white key in turn, up to the next C.',
  },
  {
    eyebrow: 'Pattern, with fingering', title: 'Three notes, three fingers', id: 'pattern-fingered',
    say: [
      { text: 'A pattern becomes easy when each note has a finger ready for it.', pauseAfter: 560, tone: 'warm' },
      { text: 'Right hand: thumb on C \u2014 one. Finger two on D. Finger three on E. Then play them in order.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['Patterns flow when fingers are assigned. Right hand: finger 1 on C, finger 2 on D, finger 3 on E.', 'Play C, D, E in order \u2014 each note already has its finger. This is how scales and pieces stay smooth.'],
    show: { kind: 'keys', midis: [60, 62, 64], caption: '1 on C, 2 on D, 3 on E.', label: 'C  D  E' },
    staffHint: { clef: 'treble', notes: [60, 62, 64] },
    handHint: { hand: 'right', highlight: [1, 2, 3] },
    demo: [60, 62, 64], demoGap: 0.5,
    tryPrompt: 'Right hand: play C, D, E in order (fingers 1, 2, 3).', targets: [60, 62, 64], mode: 'sequence',
    okMsg: 'Smooth \u2014 each finger ready for its note. That readiness is what fingering gives you.',
    hint: 'Thumb (1) on C, finger 2 on D, finger 3 on E \u2014 then play them in turn.',
  },
  {
    eyebrow: 'Harmony in music', title: 'Chord, then arpeggio', id: 'arpeggio-c',
    say: [
      { text: 'You\u2019ve played C, E and G together \u2014 a chord.', pauseAfter: 520, tone: 'warm' },
      { text: 'Now play the same three notes one at a time: C, then E, then G. That\u2019s an arpeggio.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A chord is notes sounded together; the same notes one at a time make an arpeggio.', 'Play C, then E, then G \u2014 one after another.'],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'One at a time: C, E, G.', label: 'C \u2192 E \u2192 G' },
    staffHint: { clef: 'treble', notes: [60, 64, 67] },
    demo: [60, 64, 67], demoGap: 0.5,
    tryPrompt: 'Play C, then E, then G \u2014 one at a time.', targets: [60, 64, 67], mode: 'sequence',
    okMsg: 'That\u2019s an arpeggio \u2014 a chord spread out in time. Same notes, different feel.',
    hint: 'Play the three chord notes one after another: C, E, G.',
  },
  {
    eyebrow: 'Pattern recognition', title: 'Hear it, play it back', id: 'motif-echo',
    say: [
      { text: 'Music is full of small patterns you start to recognise.', pauseAfter: 540, tone: 'warm' },
      { text: 'Listen to this little shape, then play it back: G, E, C.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Recognising small patterns is the heart of fluency \u2014 hear the shape, then play it.', 'The shape is G, E, C \u2014 coming down. Play it back.'],
    show: { kind: 'keys', midis: [67, 64, 60], caption: 'G, E, C.', label: 'G E C' },
    staffHint: { clef: 'treble', notes: [67, 64, 60] },
    demo: [67, 64, 60], demoGap: 0.5,
    tryPrompt: 'Play the shape back: G, then E, then C.', targets: [67, 64, 60], mode: 'sequence',
    okMsg: 'You heard the pattern and played it back \u2014 that\u2019s musical recognition at work.',
    hint: 'Start high on G, then E, then C: G, E, C.',
  },
  {
    eyebrow: 'Your first phrase', title: 'A little melody', id: 'first-phrase',
    say: [
      { text: 'Let\u2019s put it together into a small melody.', pauseAfter: 540, tone: 'warm' },
      { text: 'Play C, E, G, then the C above \u2014 a rising phrase that lands home.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A melody is a phrase with shape and a sense of arrival.', 'Play C, E, G, then the C above \u2014 rising, then landing home.'],
    show: { kind: 'keys', midis: [60, 64, 67, 72], caption: 'C, E, G, C.', label: 'C E G C' },
    staffHint: { clef: 'treble', notes: [60, 64, 67, 72] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 5] },
    demo: [60, 64, 67, 72], demoGap: 0.46,
    tryPrompt: 'Play C, E, G, then the C above \u2014 in order.', targets: [60, 64, 67, 72], mode: 'sequence',
    okMsg: 'Good \u2014 C, E, G, and home. Rising, then settling: that shape is the beginning of a musical phrase.',
    hint: 'C, then E, then G, then the next C higher up.',
  },

  // ===========================================================================
  // MAKING MUSIC \u2014 STUDIES. The first real feel of making music: a call-and-
  // response echo, then two short ORIGINAL KeyMaster studies (a stepwise line;
  // question & answer). Ear-led and listen-first, NOT reading-heavy. Spoken lines
  // are queued for voice generation \u2014 captions carry them until then (no browser
  // TTS); the musical demo uses the stabilised pianoVoice path. Provenance and
  // note data: STAGE1_STUDIES.md.
  // ===========================================================================
  {
    eyebrow: 'Call and response', title: 'Listen, then echo', id: 'play-echo',
    say: [
      { text: 'Here is a small idea. Listen first \u2014 then echo it back.', pauseAfter: 540, tone: 'warm' },
      { text: 'I play two notes: a low one, then a higher one. You answer with the same two.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Call and response is how musicians learn by ear: listen to a short idea, then answer it.', 'Listen to the two notes \u2014 a low C, then a higher G \u2014 then play them back in the same order.'],
    show: { kind: 'keys', midis: [60, 67], caption: 'A low note, then a higher note.', label: 'low \u2192 high' },
    demo: [60, 67], demoGap: 0.55,
    tryPrompt: 'Echo it back: the low note first, then the higher note.', targets: [60, 67], mode: 'sequence',
    okMsg: 'That is the sound we were looking for \u2014 you heard the idea and answered it.',
    hint: 'The low note first (C), then the higher note (G).',
    cues: { range: { from: 60, to: 67, lowLabel: 'low', highLabel: 'high' } },
  },
  {
    eyebrow: 'A short study', title: 'Morning Steps', id: 'study-steps',
    say: [
      { text: 'Now a short study \u2014 a calm line that climbs, then settles home.', pauseAfter: 540, tone: 'warm' },
      { text: 'Listen first. Then play it evenly, one step at a time: C, D, E, F, G.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A study is a short, musical exercise. This one moves by single steps \u2014 a smooth line climbing from C up to G.', 'Listen to the whole line first \u2014 up, then back home \u2014 then play the climb evenly, with a relaxed hand. There is no rush.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67], caption: 'Stepwise: C D E F G (the study returns home).', label: 'C D E F G' },
    handHint: { hand: 'right', highlight: [1, 2, 3, 4, 5] },
    demo: [60, 62, 64, 65, 67, 65, 64, 62, 60], demoGap: 0.4,
    tryPrompt: 'Play the climb evenly: C, D, E, F, G.', targets: [60, 62, 64, 65, 67], mode: 'sequence',
    okMsg: 'A clean line, played evenly. Let it settle under the hand \u2014 that is a study doing its work.',
    hint: 'Step up one white key at a time, starting on C: C, D, E, F, G.',
    cues: { arrow: { from: 60, to: 67 } },
  },
  {
    eyebrow: 'A short study', title: 'Question and Answer', id: 'study-qa',
    say: [
      { text: 'Music often asks a question, then answers it.', pauseAfter: 540, tone: 'warm' },
      { text: 'The line rises like a question, then falls home like its answer. Listen, then play it through.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A phrase can feel like a question \u2014 rising and left open \u2014 answered by a phrase that falls and comes to rest.', 'Listen to the whole idea, then play it through: up to G, then stepping home to C.'],
    show: { kind: 'keys', midis: [60, 62, 64, 67, 65, 64, 62, 60], caption: 'Rises to G (question), falls home to C (answer).', label: 'C D E G \u00B7 F E D C' },
    demo: [60, 62, 64, 67, 65, 64, 62, 60], demoGap: 0.42,
    tryPrompt: 'Play it through: C, D, E, G, then F, E, D, C.', targets: [60, 62, 64, 67, 65, 64, 62, 60], mode: 'sequence',
    okMsg: 'A question and its answer \u2014 rising, then resting home. That is a complete musical idea.',
    hint: 'Climb C, D, E, G; then step home F, E, D, C.',
  },
  {
    eyebrow: 'Call and response', title: 'Answer the phrase', id: 'call-response',
    say: [
      { text: 'In call and response, I play a phrase \u2014 and you answer it.', pauseAfter: 540, tone: 'warm' },
      { text: 'My call rises: C, D, E. Your answer comes back down: E, D, C.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Call and response is a conversation in music: one phrase is offered, another replies.', 'Listen to the rising call \u2014 C, D, E \u2014 then answer by coming back down: E, D, C.'],
    show: { kind: 'keys', midis: [64, 62, 60], caption: 'Your answer, coming down: E, D, C.', label: 'E D C' },
    demo: [60, 62, 64, 64, 62, 60], demoGap: 0.42,
    tryPrompt: 'Answer the call: play E, then D, then C \u2014 coming down.', targets: [64, 62, 60], mode: 'sequence',
    okMsg: 'A clear answer \u2014 the call rose, and you brought it home. That is a musical conversation.',
    hint: 'Start on E (just right of the two black keys), then D, then C.',
    cues: { arrow: { from: 64, to: 60 } },
  },
  {
    eyebrow: 'Chords as colour', title: 'A warm chord', id: 'chord-warm',
    say: [
      { text: 'A chord is several notes sounding together \u2014 a single, fuller colour.', pauseAfter: 540, tone: 'warm' },
      { text: 'Press C, E and G together, and let the sound ring. Hear how it settles.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Where a melody is one note at a time, a chord is several notes heard together \u2014 a warm, fuller sound that can sit beneath a tune.', 'Press C, E and G together and let them ring. Keep the hand relaxed.'],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'C, E and G together \u2014 one warm sound.', label: 'C + E + G' },
    demo: [60, 64, 67], demoGap: 0.06,
    tryPrompt: 'Press C, E and G together \u2014 and let them ring.', targets: [60, 64, 67], mode: 'set',
    okMsg: 'A warm chord \u2014 three notes becoming one colour. This is the sound that will sit under your melodies later.',
    hint: 'Press the three highlighted keys at the same time: C, E and G.',
  },
  {
    eyebrow: 'A short study', title: 'A Little Tune', id: 'study-tune',
    say: [
      { text: 'One more study \u2014 this time a small tune you can almost sing.', pauseAfter: 540, tone: 'warm' },
      { text: 'Listen, then play it gently: E, D, C, D, E, and up to G.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Not every study is a scale or a chord \u2014 some are simply a small, singable tune. This one dips down, returns, and lifts to a brighter note.', 'Listen first, then play it gently and evenly: E, D, C, D, E, G.'],
    show: { kind: 'keys', midis: [64, 62, 60, 62, 64, 67], caption: 'A little tune: E D C D E G.', label: 'E D C D E G' },
    handHint: { hand: 'right', highlight: [3, 2, 1, 2, 3, 5] },
    demo: [64, 62, 60, 62, 64, 67], demoGap: 0.42,
    tryPrompt: 'Play the tune gently: E, D, C, D, E, then G.', targets: [64, 62, 60, 62, 64, 67], mode: 'sequence',
    okMsg: 'A small tune, shaped and played whole \u2014 that is real music-making, not just notes.',
    hint: 'E down to C, back up to E, then a lift to G.',
  },

  // ===========================================================================
  // BECOMING A MUSICIAN \u2014 the habits, not just the notes: practise slowly with
  // intention, and listen to the sound you make. Developing-musician thinking,
  // started early and kept calm and adult.
  // ===========================================================================
  {
    eyebrow: 'Becoming a musician', title: 'How musicians practise', id: 'practise-slow',
    say: [
      { text: 'A quick word on practising \u2014 because how you practise matters more than how much.', pauseAfter: 600, tone: 'warm' },
      { text: 'Musicians practise slowly, on purpose. Slow and even builds control; control is what later becomes speed. Rushing only teaches rushing.', pauseAfter: 700 },
      { text: 'Play your melody once more \u2014 slower than feels natural, every note even and unhurried.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['How you practise matters more than how much. Musicians practise slowly and evenly \u2014 control first, speed later. Rushing only teaches rushing.', 'Play the melody C, E, G, C again, slower than feels natural, every note even.'],
    show: { kind: 'keys', midis: [60, 64, 67, 72], caption: 'Slow and even: C, E, G, C.', label: 'C E G C' },
    demo: [60, 64, 67, 72], demoGap: 0.62,
    tryPrompt: 'Play C, E, G, C again \u2014 slowly and evenly, in no hurry.', targets: [60, 64, 67, 72], mode: 'sequence',
    okMsg: 'That\u2019s real practice \u2014 slow, even, intentional. This habit will carry you further than any shortcut.',
    hint: 'Same notes as before \u2014 C, E, G, then the C above \u2014 just slower and more even.',
  },
  {
    eyebrow: 'Becoming a musician', title: 'Listen to the tone', id: 'listen-tone',
    say: [
      { text: 'One more musician\u2019s habit: listening.', pauseAfter: 520, tone: 'warm' },
      { text: 'Play a single note and really listen \u2014 hear it begin, then slowly fade. The sound you make is something you shape and notice, not just trigger.', pauseAfter: 680 },
      { text: 'Play any one note, and listen to it all the way until it fades.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Musicians listen as much as they play. Play a single note and follow it \u2014 its start, and its slow fade.', 'Tone is something you notice and shape. Play any one note, and listen to it until it disappears.'],
    show: { kind: 'keys', midis: [67], caption: 'Play one note \u2014 and listen.', label: 'Listen' },
    demo: [67], demoGap: 0.5,
    tryPrompt: 'Play any single note \u2014 then listen to it fade.', mode: 'any',
    okMsg: 'That\u2019s listening \u2014 the habit behind good tone. You\u2019re starting to connect sound, movement and attention, which is what musicianship is built on.',
    hint: 'Any single note \u2014 the point is to play it, then truly listen to the sound.',
  },
  // ===========================================================================
  // BRING IT BACK \u2014 a gentle review that trains RETRIEVAL. Help is deliberately
  // removed: no marker, no demo (except the echo), no directional cue \u2014 so the
  // learner recalls register, the Middle C landmark, and a heard pattern FROM
  // MEMORY. Calm, never punitive. Spoken lines queued for generation (captions
  // carry them; no browser TTS). Cognitive targets noted per step.
  // ===========================================================================
  {
    // Trains: register recall + listening discrimination (no audio model given).
    eyebrow: 'Bring it back', title: 'Low and high, from memory', id: 'recall-register',
    say: [
      { text: 'Let\u2019s bring something back \u2014 no markers this time.', pauseAfter: 540, tone: 'warm' },
      { text: 'Play a low note, then a higher one. Listen to the difference between them.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['From memory: lower sounds live to the left, higher sounds to the right.', 'Play a low note, then a higher one \u2014 and hear the distance between them. Nothing is marked; trust your ear. Take your time \u2014 if you need it, the cue will appear.'],
    show: { kind: 'keys', midis: [], caption: 'From memory: a low note, then a higher note.' },
    tryPrompt: 'From memory: play a low note, then a higher note.', mode: 'lowhigh',
    okMsg: 'You found low and high without help \u2014 your ear is leading your hand now.',
    hint: 'Anywhere low on the left, then anywhere higher to the right.',
    reteach: 'No need to rush \u2014 here is the low-to-high cue again. Take a moment, then play a low note and a higher one.',
    support: { highlight: [48, 88], cue: { range: { from: 48, to: 88, lowLabel: 'low', highLabel: 'high' } } },
  },
  {
    // Trains: landmark retrieval \u2014 locate Middle C from the black-key pattern, unaided.
    eyebrow: 'Bring it back', title: 'Find Middle C, unaided', id: 'recall-middlec',
    say: [
      { text: 'Now find Middle C \u2014 this time without the marker.', pauseAfter: 540, tone: 'warm' },
      { text: 'Let the two black keys near the centre guide you, and play the C just to their left.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['From memory: Middle C is the white key just left of the group of two black keys, near the centre of the keyboard.', 'No marker this time \u2014 read the pattern, then play Middle C. If you need help, the marker will return.'],
    show: { kind: 'keys', midis: [], caption: 'Find Middle C from the pattern \u2014 no marker.' },
    tryPrompt: 'Find and play Middle C, without help.', targets: [60], exact: true, mode: 'one',
    okMsg: 'Found from the pattern alone \u2014 that is the landmark becoming truly yours.',
    hint: 'Look for a group of two black keys near the centre; Middle C is the white key just to their left.',
    reteach: 'Here is the Middle C marker again. Take your time, then play it once more.',
    support: { highlight: [60], cue: { labels: [{ midi: 60, text: 'C', place: 'below', badge: true }] } },
  },
  {
    // Trains: auditory working memory \u2014 hold a heard pattern, then reproduce it unaided.
    eyebrow: 'Bring it back', title: 'Echo from memory', id: 'recall-echo',
    say: [
      { text: 'One short pattern to hold in your ear.', pauseAfter: 540, tone: 'warm' },
      { text: 'Listen first. Then echo it back from memory \u2014 there are three notes.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Listen to the three-note pattern and hold it in your ear, then play it back \u2014 the keys are not marked.', 'This trains your musical memory: hear it, keep it, reproduce it. If you need it, the pattern will play again.'],
    show: { kind: 'keys', midis: [], caption: 'Listen, then echo the three notes \u2014 from memory.' },
    demo: [60, 64, 62], demoGap: 0.5,
    tryPrompt: 'Listen, then echo the three notes back from memory.', targets: [60, 64, 62], mode: 'sequence',
    okMsg: 'Heard, held, and played back \u2014 that is your musical memory at work.',
    hint: 'The pattern was C, then E, then D. Listen again, then echo it.',
    reteach: 'Let\u2019s hear the pattern once more \u2014 then echo it back, in your own time.',
    support: { replay: true },
  },
  {
    eyebrow: 'Stage 2 review', title: 'Checkpoint: your phrase', id: 'review-phrase',
    say: [
      { text: 'A calm checkpoint \u2014 a chance to bring it together.', pauseAfter: 520, tone: 'warm' },
      { text: 'Play your melody once more, from memory: C, E, G, C.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['From memory \u2014 the melody you just learned.', 'Play C, E, G, then the C above.'],
    show: { kind: 'keys', midis: [60, 64, 67, 72], caption: 'C, E, G, C.', label: 'C E G C' },
    staffHint: { clef: 'treble', notes: [60, 64, 67, 72] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 5] },
    demo: [60, 64, 67, 72], demoGap: 0.46,
    tryPrompt: 'Play the melody: C, E, G, then the C above.', targets: [60, 64, 67, 72], mode: 'sequence',
    okMsg: 'Held together from memory \u2014 a phrase that\u2019s yours now.',
    hint: 'C, E, G, then the next C higher up.',
  },
  {
    eyebrow: 'Stage 2 complete', title: 'On to reading and playing', id: 'stage2-onward',
    say: [
      { text: 'That\u2019s Stage 2 \u2014 you\u2019re connecting notes, fingers, pattern and pulse, not just finding keys.', pauseAfter: 600, tone: 'warm' },
      { text: 'Stage 3 brings it together: reading from the staff while your right hand plays. The Course continues \u2014 the masterclasses stay here too, any time, for deeper practice.', pauseAfter: 360, tone: 'warm' },
    ],
    explain: ['Stage 2 complete \u2014 you\u2019ve connected notes into short phrases, with a little harmony, pattern and pulse.', 'Stage 3 brings the staff and your hand together: reading and playing as one thing. Continue the Course below.'],
    bridge: { label: 'Optional \u2014 open a practice room for deeper practice', hash: '#/scales' },
    mode: 'none',
  },

];
