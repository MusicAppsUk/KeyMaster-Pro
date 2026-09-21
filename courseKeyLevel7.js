// courseKeyLevel7.js
// KeyMaster Course · Key Level 7 — Advanced Musicianship.
//
// THE PREMISE. An expert reader does not see notes. They see STRUCTURE — form,
// key, texture, where a passage is going and why — and the notes arrive inside
// that frame already half-understood. This level trains that top-down
// perception, which is the last thing separating a competent player from a
// musician.
//
// THE HAND-HOLDING DROPS SHARPLY HERE. Fingering is supplied only at genuinely
// awkward moments; elsewhere the learner is expected to work it out, and the
// cards say so. Several cards ask a question and do not answer it. This is
// deliberate: a learner who still needs every decision made for them at Key
// Level 7 has not been taught, only led.
//
// KL7 teaching spine:
//   Ch1  Reading for Structure   — binary form, and seeing it at sight
//   Ch2  Compound Time           — 6/8, and a beat that divides in three
//   Ch3  Chromaticism            — accidentals outside the key, and the natural
//   Ch4  Modulation              — the Minuet changes key, in real music
//   Ch5  Ornaments               — and the Minuet's mordents, finally restored
//   Ch6  Reading Above Your Level— following a score you cannot yet play
//   Ch7  Transposition           — the real test of pattern understanding
//   Ch8  Key Level 7 Review
//
// INFRASTRUCTURE (staffViz.js rc2-218): ornament signs (trill, mordent, lower
// mordent, turn), drawn as original SVG because the Unicode music block's
// ornament characters render unreliably on Android. Compound time signatures
// and three-quaver beam groups were already supported and are verified by test.
//
// SOURCE. Minuet in G, BWV Anh.114, Christian Petzold — the SECOND section,
// bars 17-24, from the same CC0-1.0 LilyPond source, parsed programmatically.
// This section is a genuine gift for teaching modulation: it keeps G major's
// key signature but introduces C sharp as an accidental four times and cadences
// on D. That is a textbook modulation to the dominant, occurring in music the
// learner already knows the first half of.

const q = (midi, finger) => ({ midi, value: 'quarter', finger });
const e8 = (midi, finger) => ({ midi, value: 'eighth', finger });
const dh = (midi, finger) => ({ midi, value: 'dotted-half', finger });
// A C sharp in G major is OUTSIDE the key signature, so it carries its own
// accidental — which is precisely the visual signal of a modulation.
const cis = (midi, finger) => ({ midi, value: 'quarter', finger, accidental: 'sharp' });
const cis8 = (midi, finger) => ({ midi, value: 'eighth', finger, accidental: 'sharp' });

// ---- Minuet bars 17-24, verified against the CC0 source -------------------
// Fingering is deliberately sparse from here: only the awkward moments.
const MINUET_S2 = [
  /* 17 */ q(83, 3), e8(79, 1), e8(81, 2), e8(83, 3), e8(79, 1),
  /* 18 */ q(81), e8(74), e8(76), e8(78), e8(74),
  /* 19 */ q(79), e8(76), e8(78), e8(79), e8(74),
  /* 20 */ cis(73), e8(71), cis8(73), q(69),
  /* 21 */ e8(69), e8(71), cis8(73), e8(74), e8(76), e8(78),
  /* 22 */ q(79), q(78), q(76),
  /* 23 */ q(78), q(69), cis(73),
  /* 24 */ dh(74),
];
const MINUET_S2_BEAMS = [[2, 3], [4, 5], [7, 8], [9, 10], [12, 13], [14, 15], [17, 18], [20, 21], [22, 23], [24, 25]];
const MINUET_S2_PITCHES = MINUET_S2.map((n) => n.midi);

export const KEY_LEVEL7_STEPS = [

  // ===== Chapter 1 — Reading for Structure ===============================
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'Key Level 7 begins', id: 'kl7-welcome',
    say: [
      { text: 'An expert reader does not read notes. They read structure — form, key, texture, direction — and the notes arrive already half understood.', pauseAfter: 720, tone: 'warm' },
      { text: 'That is what this level trains. You will also notice I stop telling you things. Fingering appears only where it is genuinely awkward, and some questions I will simply leave with you.', pauseAfter: 620, tone: 'instruct' },
      { text: 'That is not me withdrawing help. It is the help changing shape, because you no longer need to be led.', pauseAfter: 460, tone: 'warm' },
    ],
    explain: ['Key Level 7 — Advanced Musicianship. The skill is top-down perception: reading structure first, so the notes arrive inside a frame.', 'Instruction reduces sharply from here. Fingering is given only at awkward moments, and some questions are deliberately left unanswered — because you are ready to answer them.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'Two halves — binary form', id: 'kl7-form-binary',
    say: [
      { text: 'The Minuet you have been learning has a shape, and it is the commonest shape in all dance music. Two sections, each repeated. Musicians call it binary form.', pauseAfter: 700, tone: 'warm' },
      { text: 'The first section travels away from home and stops somewhere unresolved. The second section wanders further, then finds its way back and closes properly.', pauseAfter: 600, tone: 'instruct' },
      { text: 'Once you recognise that shape on a page, you know the story before you have read a note of it.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['Binary form: two sections, each repeated. The first moves away from home and ends unresolved; the second travels further before returning and closing.', 'Recognising the form at sight tells you the narrative of a piece before you read any of its notes — which is what makes reading fast.'],
    mode: 'none',
  },

  // ===== Chapter 2 — Compound Time =======================================
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'A beat that divides in three', id: 'kl7-compound-hear',
    say: [
      { text: 'Every metre so far has divided the beat in two. Six-eight divides it in three, and the feel is completely different — rolling rather than marching.', pauseAfter: 700, tone: 'warm' },
      { text: 'Count it as two big beats, each holding three quavers. One-two-three, four-five-six — but felt as ONE-two-three, TWO-two-three.', pauseAfter: 580, tone: 'instruct' },
      { text: 'The beams tell you at a glance: quavers group in threes, not in twos.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['In 6/8 the beat divides into three rather than two. Count two main beats, each containing three quavers.', 'The beaming shows it immediately: quavers group in threes. That visual grouping is how an experienced reader recognises compound time instantly.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [6, 8],
      notes: [e8(67, 1), e8(69, 2), e8(71, 3), e8(72, 4), e8(71, 3), e8(69, 2)],
      beams: [[1, 3], [4, 6]],
      caption: 'Six-eight — two beats, each divided in three.' },
    demo: [67, 69, 71, 72, 71, 69], demoGap: 0.28,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'Play in six-eight', id: 'kl7-compound-play',
    say: [
      { text: 'Play it with the lilt — a small emphasis on the first note of each group of three, and lighter on the other two.', pauseAfter: 660, tone: 'warm' },
      { text: 'Fingering is not marked. Work it out from the shape; you have everything you need to.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['Play the bar with a lilt: lean slightly on the first quaver of each group of three.', 'No fingering is given. Deciding your own fingering from the shape of a passage is an ordinary part of playing, and you are ready for it.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [6, 8],
      notes: [{ midi: 67, value: 'eighth' }, { midi: 69, value: 'eighth' }, { midi: 71, value: 'eighth' },
              { midi: 72, value: 'eighth' }, { midi: 74, value: 'eighth' }, { midi: 72, value: 'eighth' }],
      beams: [[1, 3], [4, 6]], marks: [{ at: 1, text: 'mp' }],
      caption: 'Lean on the first of each three. Fingering is yours to choose.' },
    demo: [67, 69, 71, 72, 74, 72], demoGap: 0.28,
    tryPrompt: 'Play the six quavers — two groups of three, with a lilt.',
    targets: [67, 69, 71, 72, 74, 72], mode: 'sequence',
    okMsg: 'That rolling feel is compound time. It is not faster than simple time — it is grouped differently.',
    hint: 'Six quavers rising, with a dip at the end. Two groups of three, marked by the beams.',
    reteach: 'Gently — the lit keys in order. Count one-two-three, two-two-three as you play.',
    support: { highlight: [67, 69, 71, 72, 74], replay: true },
  },

  // ===== Chapter 3 — Chromaticism ========================================
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'Notes from outside the key', id: 'kl7-chromatic-teach',
    say: [
      { text: 'A key signature tells you which notes belong. An accidental in the middle of a bar tells you a composer has deliberately stepped outside.', pauseAfter: 700, tone: 'warm' },
      { text: 'And there is a third sign you have met only briefly — the natural. It cancels a sharp or flat, restoring the plain white key.', pauseAfter: 560, tone: 'instruct' },
      { text: 'A natural in a sharp key is always worth noticing. It usually means something is changing.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['An accidental written inside a bar overrides the key signature for the rest of that bar. It signals a deliberate step outside the key.', 'The natural sign cancels a sharp or flat and restores the plain note. In a sharp key a natural is nearly always significant — it usually marks a change of direction or of key.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [4, 4],
      notes: [{ midi: 78 }, { midi: 77, accidental: 'natural' }, { midi: 76 }, { midi: 74 }],
      caption: 'F sharp from the key signature, then F natural cancelling it.' },
    demo: [78, 77, 76, 74], demoGap: 0.44,
    mode: 'none',
  },

  // ===== Chapter 4 — Modulation ==========================================
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'When a piece changes key', id: 'kl7-modulation-teach',
    say: [
      { text: 'A piece can leave its key entirely and settle somewhere else. That is called modulation, and it is how longer music stays interesting.', pauseAfter: 700, tone: 'warm' },
      { text: 'You can usually SEE it coming before you hear it. The same accidental starts appearing again and again — and an accidental that keeps returning is not decoration. It is a new key announcing itself.', pauseAfter: 620, tone: 'instruct' },
      { text: 'The commonest destination is the fifth note of the home key. From G, that is D.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['Modulation is a change of key within a piece — the device that lets longer music sustain interest.', 'It is visible before it is audible: one accidental begins recurring. A repeatedly-returning accidental signals a new key rather than mere colour.', 'The most common destination is the dominant — the fifth degree. From G major, that is D major.'],
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'The Minuet changes key', id: 'kl7-modulation-see',
    say: [
      { text: 'Here is Petzold’s second section, and it does exactly that. Count the C sharps — there are four, and there were none at all in the first half.', pauseAfter: 720, tone: 'warm' },
      { text: 'The key signature still says G major. But C sharp keeps arriving, and the section comes to rest on D. The music has moved to D major without changing its signature.', pauseAfter: 620, tone: 'instruct' },
      { text: 'That is modulation, in a real piece, by a real composer — and you can see it on the page.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['The Minuet’s second section introduces C sharp four times and cadences on D — a modulation to the dominant.', 'The key signature is unchanged; the accidentals do the work. Spotting recurring accidentals is how a reader detects a modulation before hearing it.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: MINUET_S2, beams: MINUET_S2_BEAMS, systems: [11, 20],
      caption: 'Minuet, bars 17-24 — four C sharps, and a close on D.' },
    demo: MINUET_S2_PITCHES, demoGap: 0.34,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'Play the modulating bars', id: 'kl7-modulation-play',
    say: [
      { text: 'Take the four bars where the new key takes hold. The C sharps are the whole point — play them and listen to how they pull the music towards D.', pauseAfter: 700, tone: 'warm' },
      { text: 'Only two fingerings are marked, at the awkward places. The rest is your decision.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['Bars 20-23, where the modulation takes hold. The C sharps pull the music towards D major.', 'Fingering is marked only at the two awkward moments; the rest is yours to decide, as it would be in any real score.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      // Bars 20-23 complete: entries 16-31 of the section, four whole bars.
      notes: MINUET_S2.slice(15, 31), beams: [[2, 3], [5, 6], [7, 8], [9, 10]], systems: [11],
      caption: 'The four bars where D major takes over.' },
    demo: MINUET_S2_PITCHES.slice(15, 31), demoGap: 0.36,
    tryPrompt: 'Play the modulating bars — listen to what the C sharps do.',
    targets: MINUET_S2_PITCHES.slice(15, 31), mode: 'sequence',
    okMsg: 'You heard the key shift under your hands. That pull towards D is what an accidental is for.',
    hint: 'The C sharps are the black key just below D. They appear three times in these bars.',
    reteach: 'Gently — the lit keys in order. Take the rising run slowly; it climbs through the new key.',
    support: { highlight: [73, 71, 69, 74, 76, 78], replay: true },
  },

  // ===== Chapter 5 — Ornaments ===========================================
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'The signs we left out', id: 'kl7-ornament-teach',
    say: [
      { text: 'When you learned the Minuet, I told you some ornaments had been left off the page and would come back later. This is later.', pauseAfter: 680, tone: 'warm' },
      { text: 'An ornament is a small decoration around a note. A mordent flicks quickly to the note next door and back. A trill alternates rapidly with the note above. A turn curls around it.', pauseAfter: 620, tone: 'instruct' },
      { text: 'They are not extra difficulty for its own sake. In this music they are how a harpsichord, which cannot play louder, gives a note emphasis.', pauseAfter: 480, tone: 'warm' },
    ],
    explain: ['Ornaments decorate a note: a mordent flicks to the neighbouring note and back, a trill alternates rapidly with the note above, a turn curls around it.', 'On a harpsichord — which cannot vary loudness by touch — an ornament is how a player gives a note emphasis. Knowing that explains why this music is full of them.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: [{ midi: 72, value: 'quarter', orn: 'mordent' },
              { midi: 74, value: 'quarter', orn: 'trill' },
              { midi: 71, value: 'quarter', orn: 'turn' }],
      caption: 'A mordent, a trill, and a turn.' },
    demo: [72, 74, 71], demoGap: 0.5,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'The Minuet, as Petzold wrote it', id: 'kl7-ornament-minuet',
    say: [
      { text: 'Here is bar three of the Minuet with its mordent restored — exactly as it stands in the source. You have played this bar many times without it.', pauseAfter: 700, tone: 'warm' },
      { text: 'Play the bar, and add the mordent if you can: a quick flick from C to B and back, at the start of the note.', pauseAfter: 560, tone: 'instruct' },
      { text: 'If it is not clean yet, play the bar without it. An ornament added badly is worse than an ornament left out — which is exactly why we waited.', pauseAfter: 460, tone: 'warm' },
    ],
    explain: ['Bar 3 of the Minuet with its mordent restored, as the source has it. The ornament flicks from C to B and back at the start of the note.', 'If the ornament is not yet clean, play the bar without it. A badly executed ornament damages a phrase more than its absence does.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: [{ midi: 76, value: 'quarter', finger: 3 },
              { midi: 72, value: 'eighth', finger: 1, orn: 'mordent' },
              { midi: 74, value: 'eighth', finger: 2 },
              { midi: 76, value: 'eighth', finger: 3 },
              { midi: 78, value: 'eighth', finger: 4 }],
      beams: [[2, 3], [4, 5]],
      caption: 'Bar 3 as Petzold wrote it — mordent and all.' },
    demo: [76, 72, 74, 76, 78], demoGap: 0.36,
    tryPrompt: 'Play bar three — with the mordent if it is comfortable, without it if not.',
    targets: [76, 72, 74, 76, 78], mode: 'sequence',
    okMsg: 'The bar as it was written, three hundred years ago. Ornament or no ornament, that is the real thing.',
    hint: 'The same bar you already know. The mordent sits on the first quaver.',
    reteach: 'Gently — the lit keys in order. Ignore the ornament entirely until the notes are effortless.',
    support: { highlight: [76, 72, 74, 78], replay: true },
  },

  // ===== Chapter 6 — Reading Above Your Level ============================
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'Follow what you cannot yet play', id: 'kl7-score-reading',
    say: [
      { text: 'Here is a skill nobody teaches beginners, and it is one of the most useful there is: following a score you are nowhere near able to play.', pauseAfter: 700, tone: 'warm' },
      { text: 'You do not need to play it to understand it. You can see the key, the metre, the shape of the lines, where the hands coincide, where it modulates.', pauseAfter: 600, tone: 'instruct' },
      { text: 'Reading above your playing level is how your understanding stays ahead of your fingers — which is exactly the right way round.', pauseAfter: 460, tone: 'warm' },
    ],
    explain: ['Following a score beyond your playing ability is a distinct and valuable skill: you can read key, metre, texture, phrase shape and modulation without being able to perform it.', 'Keeping understanding ahead of technique is the correct order. A musician who can only think about what they can already play stops growing.'],
    show: { kind: 'staff', clef: 'grand', keySig: 'G', timeSig: [3, 4], barsPerSystem: 2,
      voices: {
        treble: [q(83, 3), e8(79, 1), e8(81, 2), e8(83, 3), e8(79, 1), q(81), e8(74), e8(76), e8(78), e8(74)],
        bass: [dh(55), dh(50)],
      },
      beams: { treble: [[2, 3], [4, 5], [7, 8], [9, 10]] },
      marks: [{ beat: 0, text: 'f' }],
    },
    demo: [83, 79, 81, 83, 79, 81, 74, 76, 78, 74], demoGap: 0.32,
    mode: 'none',
  },

  // ===== Chapter 7 — Transposition =======================================
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'The same tune, somewhere else', id: 'kl7-transpose-teach',
    say: [
      { text: 'Here is the test of whether you truly understand a passage or merely memorised it: play it in a different key.', pauseAfter: 680, tone: 'warm' },
      { text: 'If you learned it as a set of finger movements, transposing is impossible. If you learned it as a pattern of distances, it is almost easy.', pauseAfter: 580, tone: 'instruct' },
      { text: 'That is why Key Level 3 spent so long on reading by distance. This is what it was for.', pauseAfter: 440, tone: 'warm' },
    ],
    explain: ['Transposition — playing a passage in a different key — is the definitive test of understanding over memorisation.', 'A passage learned as finger movements cannot be transposed. One learned as a pattern of intervals transposes readily. This is what reading by distance was building towards.'],
    show: { kind: 'staff', clef: 'treble', timeSig: [3, 4],
      notes: [q(60, 1), q(64, 3), q(67, 5), dh(64, 3)],
      analysis: [{ at: 1, text: 'C' }],
      caption: 'A simple shape in C — up a third, up a third, down a third.' },
    demo: [60, 64, 67, 64], demoGap: 0.46,
    mode: 'none',
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'Now play it in G', id: 'kl7-transpose-play',
    say: [
      { text: 'Same shape, starting on G instead of C. Do not work out the note names. Read the distances and let your hand copy the pattern.', pauseAfter: 700, tone: 'warm' },
      { text: 'Up a third, up a third, back down a third. The shape has not changed at all — only where it starts.', pauseAfter: 480, tone: 'instruct' },
    ],
    explain: ['The same pattern beginning on G: up a third, up a third, down a third.', 'Reading the distances rather than the names is what makes transposition possible. The shape is identical; only its starting point has moved.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'G', timeSig: [3, 4],
      notes: [q(67, 1), q(71, 3), q(74, 5), dh(71, 3)],
      analysis: [{ at: 1, text: 'G' }],
      caption: 'The identical shape, moved to G.' },
    demo: [67, 71, 74, 71], demoGap: 0.46,
    tryPrompt: 'Play the same shape, starting on G.',
    targets: [67, 71, 74, 71], mode: 'sequence',
    okMsg: 'Transposed by shape rather than by name. That proves you understood the pattern rather than memorised the keys.',
    hint: 'Start on G and skip upward twice, then skip back down once — the same distances as before.',
    reteach: 'Gently — the lit keys show the pattern. Notice each jump is the same size as it was in C.',
    support: { highlight: [67, 71, 74], replay: true },
  },

  // rc2-228 - THE AURAL STRAND. One card per Key Level: a phrase is sounded and
  // nothing is written down. Before this build there were 143 cards across
  // KL2-KL8 and not one of them asked the learner to use their ears, while 79%
  // of the course was notation. Each card trains a DIFFERENT listening skill,
  // in the key and the material its own level already works in.
  {
    eyebrow: 'KeyMaster Course \u00B7 Key Level 7', title: "By ear — hear the modulation", id: 'kl7-by-ear',
    say: [
      { text: "This Key Level showed you the Minuet stepping out of G major and into D major, and the sharp that carries it there.", pauseAfter: 680, tone: 'warm' },
      { text: "Now hear it. The line I play climbs through six notes, and one of them is the note that does not belong to G major. Find them all — including that one.", pauseAfter: 420, tone: 'instruct' },
    ],
    explain: ["A rising line from the Minuet’s second section, played with nothing written.", "One of its notes is foreign to G major — the sharp that carries the music into the new key. Hearing a modulation as it happens is an advanced ear, and it starts here."],
    demo: [69, 71, 73, 74, 76, 78], demoGap: 0.36,
    tryPrompt: "Play back the rising line — by ear, including the note that changes key.",
    targets: [69, 71, 73, 74, 76, 78], mode: 'sequence',
    okMsg: "You heard the key change as it happened. That is an ear doing analysis in real time.",
    hint: "Six notes, climbing all the way. The third one is a black key — that is the one carrying the music somewhere new.",
    reteach: "Listen again to the third note. It sits a semitone higher than the scale of G major would put it.",
    support: { highlight: [69, 71, 73, 74, 76, 78], replay: true },
  },
  // ===== Chapter 8 — Key Level 7 Review ==================================
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'Structural reading check', id: 'kl7-review-read',
    say: [
      { text: 'A passage you have not seen, and I will tell you nothing about it. Before you play, answer four questions for yourself: what key, what metre, where does it move, and what is the hardest bar.', pauseAfter: 740, tone: 'warm' },
      { text: 'No demonstration, no fingering, no hints beyond what is on the page. Read it as a musician would.', pauseAfter: 460, tone: 'instruct' },
    ],
    explain: ['Sight-read with no demonstration and no fingering. First answer four questions yourself: the key, the metre, where the harmony moves, and which bar is hardest.', 'This is how an experienced musician approaches an unfamiliar score — structure first, then notes.'],
    show: { kind: 'staff', clef: 'treble', keySig: 'D', timeSig: [6, 8],
      notes: [{ midi: 74, value: 'eighth' }, { midi: 76, value: 'eighth' }, { midi: 78, value: 'eighth' },
              { midi: 81, value: 'eighth' }, { midi: 78, value: 'eighth' }, { midi: 76, value: 'eighth' },
              { midi: 74, value: 'eighth' }, { midi: 73, value: 'eighth' }, { midi: 74, value: 'eighth' },
              { midi: 78, value: 'quarter' }, { midi: 74, value: 'eighth' }],
      beams: [[1, 3], [4, 6], [7, 9]], slurs: [[1, 6]],
      marks: [{ at: 1, text: 'mf' }], systems: [7],
      caption: 'Read it as a musician would: structure first, notes second.' },
    tryPrompt: 'Sight-read the passage.',
    targets: [74, 76, 78, 81, 78, 76, 74, 73, 74, 78, 74], mode: 'sequence',
    okMsg: 'Read cold, in a new key, in compound time, with no help at all. That is genuine musicianship.',
    hint: 'Two sharps means D major. Six-eight means two beats of three. The line rises, falls, and closes on D.',
    reteach: 'Gently — the lit keys in order. Take the groups of three one at a time.',
    support: { highlight: [74, 76, 78, 81, 73], replay: true },
  },
  {
    eyebrow: 'KeyMaster Course · Key Level 7', title: 'Key Level 7 — what you have gained', id: 'kl7-review',
    say: [
      { text: 'You recognise binary form and read structure before notes. You read compound time. You know what an accidental outside the key is telling you, and you can spot a modulation on the page.', pauseAfter: 720, tone: 'warm' },
      { text: 'You play ornaments, or sensibly leave them out. You follow scores beyond your own playing level, and you can transpose a shape into a new key.', pauseAfter: 620, tone: 'warm' },
      { text: 'One level remains, and it is different from all the others. Key Level 8 does not teach you more. It hands everything over — and its measure of success is that you stop needing me.', pauseAfter: 520, tone: 'instruct' },
    ],
    explain: ['Key Level 7 complete. You read structure before notes, handle compound time, interpret accidentals outside the key, and recognise modulation on the page.', 'You execute ornaments or omit them by judgement, follow scores above your playing level, and transpose by pattern rather than by name.', 'Key Level 8, Performance Mastery, teaches no new notation. It transfers responsibility — and succeeds when KeyMaster is no longer needed.'],
    mode: 'none',
  },
];
