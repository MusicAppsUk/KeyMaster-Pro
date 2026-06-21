// foundations.js
//
// Musical Foundations — a calm, tutor-led first lesson at the piano for true
// beginners, in the spirit of Recognition Before Execution and the wider
// "KeyMaster PRO is the tutor" doctrine: explain → demonstrate (with sound) →
// show the target → ask the learner to copy → wait → give ACCURATE feedback.
//
// Strictly additive and self-contained:
//   • Default-exports createView(ctx) and returns { enter, exit } like the other
//     views, so app.js routes to it with zero special-casing.
//   • Reuses the SHARED on-screen keyboard for "Show" highlights and detects the
//     "Try" press via ctx.input (the input-agnostic NoteInput hub) — read-only.
//   • Demonstrates with courseVoice (rc2-81) — a Course-only warm voice that
//     reuses the shared AudioContext but is SEPARATE from synth.js, so the Scales
//     Listen voice, the default learner-play voice, and the shared limiter are all
//     untouched. The metronome tick in pulse exercises uses the same voice. Each
//     demo note is released individually, so it can never cut the learner's notes.
//   • Never touches the evaluator, the Scales/Sight-Reading/Chord engines, MIDI
//     mapping, EventBridge, staff rendering, Practice Review, or progression
//     gates. It sets NO expected notes, so the evaluator stays idle throughout.
//
// Feedback is meaningful, never generic: targeted cards confirm the SPECIFIC note
// ("Exactly — that is Middle C"), wrong notes are named and gently guided, and
// only genuine free-exploration is acknowledged as exploration.

import { createTutorVoice } from './tutorVoice.js?v=rc2-74';
import { createTutorAudio } from './tutorAudio.js?v=rc2-105';
import { VOICE_PACK } from './voicePackData.js?v=rc2-101';
import { STAGES } from './courseMap.js?v=rc2-55';
import { createLearnOverlay } from './learnOverlay.js?v=rc2-56';
import { buildScale } from './scaleEngine.js';
import { buildHandSvg, setHandHighlight, FINGER_NAMES } from './handViz.js?v=rc2-81';
import { buildStaff } from './staffViz.js?v=rc2-86';
import { createCourseVoice } from './courseVoice.js?v=rc2-105';

const NOTE_NAMES = ['C', 'C\u266F', 'D', 'D\u266F', 'E', 'F', 'F\u266F', 'G', 'G\u266F', 'A', 'A\u266F', 'B'];
const pcOf = (m) => ((m % 12) + 12) % 12;

// Spoken/caption normaliser: show learner-friendly accidental names ("C sharp",
// "B flat") in tutor copy, captions, hints and feedback — never "C#"/"hash".
// (TTS gets the same treatment in tutorVoice.js. Visual notation keeps its symbols.)
const RX_SHARP = /([A-G])(#|\u266F)/g;
const RX_FLAT = /([A-G])(b|\u266D)(?=$|[\s.,;:!?)\]\u2014\u2013-])/g;
function speakable(s) {
  return (typeof s === 'string') ? s.replace(RX_SHARP, '$1 sharp').replace(RX_FLAT, '$1 flat') : s;
}

// Sharp keys that spell B major's key signature (F# C# G# D# A#), near the centre.
const B_MAJOR_SHARPS = [66, 61, 68, 63, 70];

// ---- Master Training / Learn-mode additions (active only when ctx.route === 'learn').
// Plain Musical Foundations (/foundations) never constructs any of the elements or
// runs any of the behaviour below, so its rc2-45 experience is unchanged. ---------

// Test-only personalisation. Hardcoded on purpose: progressStore holds musical-
// learning memory ONLY and must never carry personal data, so the name is NOT
// persisted. Production will read a preferred display name from a profile hook
// (welcomeExperience.getDisplayName is the natural future home).
export const LEARNER_NAME = 'Tim';

// Time-of-day greeting from local device time. Pure + exported for headless tests.
export function greetingFor(date, name) {
  const h = (date && typeof date.getHours === 'function') ? date.getHours() : 12;
  let part;
  if (h >= 5 && h < 12) part = 'Good morning';
  else if (h >= 12 && h < 18) part = 'Good afternoon';
  else part = 'Good evening';                       // 18:00–04:59
  return name ? `${part}, ${name}.` : `${part}.`;
}

// Master Training curriculum — the learner-facing guided course. Used ONLY in
// learn mode; /foundations keeps the original CARDS below, untouched. Each step
// teaches: explain → demonstrate (visual + sound) → ask → wait → confirm/correct.
// `label` is an on-screen pointer caption; `bridge` turns a step into a doorway
// into a specialist practice room; `reteach` is the calm second-miss re-teach line.
// `say` (optional) is the spoken explanation as an array of short BEATS performed with
// real pauses so the voice breathes: { text, pauseAfter, tone?, emphasis?, voiceDirection? }.
// `tone`/`emphasis`/`voiceDirection` are carried for the premium recording phase (browser
// TTS cannot perform them); captions still come from `explain`.
// RESERVED (scaffold for a later phase, no step uses these yet): an optional
// `videoCue` / `visualCue` may carry a short, captioned, same-voice demonstration
// clip or richer visual; rendering is intentionally deferred until that phase.
// rc2-60: the Course teaches a first scale fragment internally, sourced from the
// pure scaleEngine (no masterclass flow). B major from B3 = [59,61,63] = B, C#, D#.
const B_MAJOR_SCALE = buildScale({ letter: 'B' }, 'major');
const B_FRAGMENT = B_MAJOR_SCALE.midiAt(3).slice(0, 3);
const B_FRAGMENT_NAMES = B_MAJOR_SCALE.degrees.slice(0, 3).map((d) => d.name);

export const LEARN_STEPS = [
  {
    eyebrow: 'Welcome', title: 'Welcome to the Course', id: 'welcome',
    media: { kind: 'video', topic: 'posture', caption: 'Sitting well at the piano \u2014 guided demonstration' },
    say: [
      { text: 'Welcome to the KeyMaster PRO Course.', pauseAfter: 560, tone: 'warm' },
      { text: 'I\u2019m your tutor. We\u2019ll go step by step, and you\u2019ll always know what to do next.', pauseAfter: 620 },
      { text: 'Sit comfortably \u2014 both feet down, shoulders easy, hands relaxed over the keys. Natural, supported, never forced.', pauseAfter: 640, tone: 'warm' },
      { text: 'When you\u2019re ready, we\u2019ll begin by orienting the keyboard.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Welcome to the KeyMaster PRO Course. I\u2019m your tutor \u2014 we\u2019ll go step by step, and you\u2019ll always know what to do next.', 'Sit comfortably: both feet down, shoulders easy, hands relaxed over the keys. Natural, supported, never forced. When you\u2019re ready, we\u2019ll orient the keyboard.'],
    mode: 'none',
  },
  {
    eyebrow: 'The keyboard', title: 'Meet the keyboard', id: 'meet-keyboard',
    cues: { labels: [{ midi: 48, text: 'low', place: 'below' }, { midi: 88, text: 'high', place: 'below' }] },
    say: [
      { text: 'Let\u2019s orient the keyboard first.', pauseAfter: 520, tone: 'warm' },
      { text: 'Lower notes live to your left, higher notes to your right.', pauseAfter: 560 },
      { text: 'Play any key, and listen to where its sound sits.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Let\u2019s orient the keyboard first. Lower notes live to your left, higher notes to your right.', 'Play any key, and listen to where its sound sits.'],
    show: { kind: 'keys', midis: [48, 60, 72, 88], caption: 'One row \u2014 low on the left, high on the right.', label: 'Low \u2190                      \u2192 High' },
    demo: [48, 88], demoGap: 0.6,
    tryPrompt: 'Play any key, and listen to where its sound sits on the keyboard.', mode: 'any',
    okMsg: 'Good. That is your first landmark: sound moves across the keyboard, low to high.',
  },
  {
    eyebrow: 'Low and high', title: 'Low and high sounds', id: 'low-high',
    cues: { labels: [{ midi: 48, text: 'low', place: 'below' }, { midi: 88, text: 'high', place: 'below' }, { midi: 60, text: 'C', place: 'below' }] },
    say: [
      { text: 'The keyboard is laid out by pitch.', pauseAfter: 500, tone: 'warm' },
      { text: 'Keys to the left sound lower; keys to the right sound higher.', pauseAfter: 560 },
      { text: 'Play a low note on the left \u2014 then a high note on the right.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['The keyboard is laid out by pitch \u2014 keys to the left sound lower, keys to the right higher.', 'Play a low note on the left, then a high note on the right.'],
    show: { kind: 'keys', midis: [48, 88], caption: 'Left is low \u2014 right is high, across the whole keyboard.', label: 'low                          high' },
    demo: [48, 88], demoGap: 0.6,
    tryPrompt: 'Play a low note on the left, then a high note on the right.', mode: 'lowhigh',
    okMsg: 'Good \u2014 low on the left, high on the right. You\u2019re hearing the shape of the keyboard.',
  },

  // ===========================================================================
  // YOUR HANDS \u2014 the physical foundation, taught before any patterns. Posture,
  // a relaxed curved hand, the finger numbers (1 = thumb \u2026 5 = little finger),
  // right vs left, and the thumb's role. Uses original hand diagrams (handViz).
  // ===========================================================================
  {
    eyebrow: 'Your hands', title: 'Sitting at the keyboard', id: 'sit-approach',
    say: [
      { text: 'Before we play patterns, let\u2019s set up your hands. Good habits now make everything later easier.', pauseAfter: 620, tone: 'warm' },
      { text: 'Sit tall, a little back from the keys, roughly centred. Let your arms hang easily, elbows about level with the keyboard, shoulders down and relaxed.', pauseAfter: 700 },
      { text: 'Bring a hand toward the keys with the weight carried by your arm, not gripped in the fingers. The wrist stays level \u2014 never locked, never dropped.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['Sit tall, a little back and roughly centred, arms hanging easily \u2014 elbows about level with the keys, shoulders relaxed.', 'Bring the hand toward the keys with the arm carrying the weight, wrist level and loose. This relaxed, supported approach is the foundation of good tone.'],
    show: { kind: 'hand', hand: 'right', caption: 'Relaxed and supported \u2014 wrist level, arm carrying the weight.' },
    mode: 'none',
  },
  {
    eyebrow: 'Your hands', title: 'A natural hand shape', id: 'hand-shape',
    say: [
      { text: 'Now the shape of the hand itself. Let the fingers stay gently rounded, the knuckles slightly up \u2014 a soft dome, as if a small ball rested under your palm.', pauseAfter: 700, tone: 'warm' },
      { text: 'Notice the fingers are different lengths. The middle three \u2014 two, three and four \u2014 are longer, and reach a little further forward. That matters once we meet the black keys.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['Keep the hand\u2019s natural curve \u2014 fingers gently rounded, knuckles slightly up, a soft dome under the palm. Never flat, never tense.', 'The longer fingers (2, 3, 4) reach a little further forward than the thumb and little finger \u2014 which is exactly why the B-major shape will feel natural later.'],
    show: { kind: 'hand', hand: 'right', sweep: [2, 3, 4], caption: 'Gently curved, knuckles up \u2014 the long fingers (2, 3, 4) reach furthest.' },
    mode: 'none',
  },
  {
    eyebrow: 'Your hands', title: 'The numbered fingers', id: 'fingers-rh',
    say: [
      { text: 'Each finger has a number, the same in every method: the thumb is one, then two, three, four, and the little finger is five.', pauseAfter: 700, tone: 'warm' },
      { text: 'Watch your right hand: one, two, three, four, five.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Every finger has a number \u2014 the same the world over. Thumb is 1, then 2, 3, 4, and the little finger is 5.', 'These numbers tell you which finger to use. Watch them light in order on the right hand.'],
    show: { kind: 'hand', hand: 'right', sweep: [1, 2, 3, 4, 5], caption: 'Right hand: 1 (thumb) to 5 (little finger).' },
    mode: 'none',
  },
  {
    eyebrow: 'Your hands', title: 'The left hand mirrors', id: 'fingers-lh',
    say: [
      { text: 'The left hand uses the same numbers \u2014 mirrored. Its thumb is also one, sitting toward the middle of the keyboard.', pauseAfter: 680, tone: 'warm' },
      { text: 'Watch the left hand: one, two, three, four, five.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The left hand is numbered the same way \u2014 thumb is 1 \u2014 but mirrored, so its thumb points toward the middle of the keyboard.', 'Right thumb and left thumb both sit near the centre; the little fingers reach outward.'],
    show: { kind: 'hand', hand: 'left', sweep: [1, 2, 3, 4, 5], caption: 'Left hand: 1 (thumb) to 5 (little finger), mirrored.' },
    mode: 'none',
  },
  {
    eyebrow: 'Your hands', title: 'Two hands, mirrored', id: 'hands-mirror',
    say: [
      { text: 'Here are both hands together. They use the same numbers, one to five \u2014 but they mirror each other.', pauseAfter: 660, tone: 'warm' },
      { text: 'Both thumbs are finger one, and both sit toward the middle of the keyboard. The little fingers, finger five, reach outward to the ends.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['The two hands mirror each other. Both thumbs are finger 1 and sit toward the centre; both little fingers are finger 5 and reach outward.', 'Left hand on the left, right hand on the right \u2014 each numbered outward from its thumb.'],
    show: { kind: 'hand', hand: 'both', sweep: [1], caption: 'Left and right \u2014 both thumbs (1) toward the centre.' },
    mode: 'none',
  },
  {
    eyebrow: 'Your hands', title: 'Play with your thumb', id: 'thumb-play',
    say: [
      { text: 'Let\u2019s use a finger on purpose. Your thumb is finger one \u2014 strong and close to the keys.', pauseAfter: 600, tone: 'warm' },
      { text: 'With your right thumb, play any white key near the middle. Let the arm support it \u2014 don\u2019t press hard.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Your thumb is finger 1. It plays from the side, staying close to the keys.', 'With the right thumb, play any white key near the middle \u2014 a relaxed, supported sound. (We trust your hand here; play with intention.)'],
    show: { kind: 'keys', midis: [60], caption: 'Thumb \u2014 finger 1.', label: 'Finger 1' },
    handHint: { hand: 'right', highlight: [1] },
    tryPrompt: 'Play any white key near the middle with your right thumb (finger 1).', mode: 'any',
    okMsg: 'That\u2019s finger 1, your thumb \u2014 playing with intention. This is how every note begins: a chosen finger, a relaxed hand.',
    hint: 'Any white key near the centre is fine \u2014 the point is using the thumb, finger 1.',
  },
  {
    eyebrow: 'Your hands', title: 'Play with finger 3', id: 'finger3-play',
    say: [
      { text: 'Now your longest finger \u2014 the middle finger, number three.', pauseAfter: 560, tone: 'warm' },
      { text: 'With right finger three, play any white key near the middle. Keep the hand curved, the wrist level.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Finger 3 is your longest \u2014 the middle finger. Long fingers reach in toward the black keys naturally.', 'With right finger 3, play any white key near the middle, hand curved and wrist level.'],
    show: { kind: 'keys', midis: [64], caption: 'Middle finger \u2014 finger 3.', label: 'Finger 3' },
    handHint: { hand: 'right', highlight: [3] },
    tryPrompt: 'Play any white key near the middle with right finger 3.', mode: 'any',
    okMsg: 'Good \u2014 finger 3, curved and supported. Knowing your finger numbers is what lets a teacher (or this Course) guide your hands precisely.',
    hint: 'Any white key is fine \u2014 the point is using finger 3, the long middle finger.',
  },
  {
    eyebrow: 'Your hands', title: 'Press with control', id: 'press-control',
    say: [
      { text: 'One last habit before we play patterns: control.', pauseAfter: 520, tone: 'warm' },
      { text: 'Watch the finger, then press a single key slowly and deliberately \u2014 let the arm guide it down, don\u2019t jab. Feel the key under your finger, and listen to the sound it makes.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['Press a single key slowly and deliberately, the arm guiding the finger down \u2014 controlled, not jabbed.', 'This joins the three things piano asks of you at once: seeing the finger, feeling the key, and hearing the sound. Play any one white key, with control.'],
    show: { kind: 'keys', midis: [62], caption: 'See it, feel it, hear it.', label: 'Control' },
    handHint: { hand: 'right', highlight: [2] },
    demo: [62], demoGap: 0.5,
    tryPrompt: 'Press any single white key slowly, with control \u2014 and listen to it.', mode: 'any',
    okMsg: 'Good \u2014 a slow, supported press. Seeing, feeling and hearing together is how every note is played well. Now your hands are ready.',
    hint: 'Any single white key \u2014 the point is a slow, controlled, supported press, listening as you go.',
  },
  {
    eyebrow: 'Finding your way', title: 'Black-key groups of two', id: 'black-keys-two',
    cues: { brackets: [{ midis: [61, 63], label: 'group of two' }] },
    say: [
      { text: 'A keyboard has white keys and black keys.', pauseAfter: 520, tone: 'warm' },
      { text: 'The black keys sit in groups of two and three, and that pattern repeats \u2014 it helps you find your place.', pauseAfter: 580 },
      { text: 'Here is a group of two.', pauseAfter: 460, tone: 'instruct', emphasis: 'two' },
      { text: 'Now you try \u2014 tap either black key.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['A keyboard has white keys and black keys. The black keys sit in groups of two and three, and that pattern repeats across the keyboard \u2014 it helps you find your place.', 'Here is a group of two.'],
    show: { kind: 'keys', midis: [61, 63], caption: 'A group of two black keys.', label: 'group of two' },
    demo: [61, 63], demoGap: 0.4,
    tryPrompt: 'Tap one of the two black keys in the highlighted group.', targets: [61, 63], mode: 'oneof',
    okMsg: 'Good \u2014 that\u2019s one of the pair. The groups of two are your first anchor points.',
    hint: 'The group of two is highlighted \u2014 tap either black key.',
    reteach: 'Look again \u2014 the two black keys sit close together, with a wider gap before the next group. Tap either one.',
  },
  {
    eyebrow: 'Finding your way', title: 'Black-key groups of three', id: 'black-keys-three',
    cues: { brackets: [{ midis: [66, 68, 70], label: 'group of three' }] },
    say: [
      { text: 'Next to the twos are groups of three.', pauseAfter: 520, tone: 'warm' },
      { text: 'Here is a group of three.', pauseAfter: 520, tone: 'instruct', emphasis: 'three' },
      { text: 'We use these groups as landmarks.', pauseAfter: 520 },
      { text: 'Now you try \u2014 tap any of the three.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Next to the twos are groups of three black keys.', 'Here is a group of three.'],
    show: { kind: 'keys', midis: [66, 68, 70], caption: 'A group of three black keys.', label: 'group of three' },
    demo: [66, 68, 70], demoGap: 0.34,
    tryPrompt: 'Tap one of the three black keys in the highlighted group.', targets: [66, 68, 70], mode: 'oneof',
    okMsg: 'Good \u2014 that\u2019s the group of three. The groups of two and three repeat across the keyboard, so you can always find your place.',
    hint: 'The group of three is highlighted \u2014 tap any of them.',
    reteach: 'Look again \u2014 the group of three is the wider cluster. Tap any one of the three.',
  },
  {
    eyebrow: 'The landmark C', title: 'Find C', id: 'find-c',
    cues: { arrow: { from: [61, 63], to: 60 }, labels: [{ midi: 60, text: 'C', place: 'below' }] },
    say: [
      { text: 'Find a group of two black keys.', pauseAfter: 520 },
      { text: 'The white key just to their left is C.', pauseAfter: 560, tone: 'warm', emphasis: 'C' },
      { text: 'Because the pattern repeats, C is everywhere.', pauseAfter: 480 },
      { text: 'Now you try \u2014 find a C.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['C is the white key just to the left of every group of two black keys.', 'Because the pattern repeats, you can find a C anywhere.'],
    show: { kind: 'keys', midis: [60], caption: 'C sits just left of the two black keys.', label: 'this is C' },
    demo: [60], demoGap: 0.45,
    tryPrompt: 'Find and press a C \u2014 just left of a group of two black keys.', targets: [60], mode: 'one',
    okMsg: 'Good \u2014 that\u2019s C, just to the left of the two black keys.',
    hint: 'C is the white key immediately left of a group of two black keys.',
    reteach: 'Let\u2019s look again \u2014 first find a group of two black keys, then the white key just to their left is C.',
  },
  {
    eyebrow: 'White-key names', title: 'Find D', id: 'find-d',
    cues: { arrow: { from: [61, 63], to: 62 }, labels: [{ midi: 62, text: 'D', place: 'below' }] },
    say: [
      { text: 'D sits right between the two black keys.', pauseAfter: 540, tone: 'warm', emphasis: 'D' },
      { text: 'Now you try \u2014 find a D.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['D sits in the middle of the group of two black keys \u2014 right between them.', 'Because the pattern repeats, there is a D in every group of two.'],
    show: { kind: 'keys', midis: [62], caption: 'D \u2014 between the two black keys.', label: 'this is D' },
    demo: [62], demoGap: 0.45,
    tryPrompt: 'Find and press a D \u2014 between the two black keys.', targets: [62], mode: 'one',
    okMsg: 'Yes \u2014 that\u2019s D, sitting between the two black keys.',
    hint: 'D is the white key between the group of two black keys.',
  },
  {
    eyebrow: 'White-key names', title: 'Find E', id: 'find-e',
    cues: { labels: [{ midi: 64, text: 'E', place: 'below' }] },
    say: [
      { text: 'E sits just to the right of the two black keys.', pauseAfter: 540, tone: 'warm', emphasis: 'E' },
      { text: 'Now you try \u2014 find an E.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['E is the white key just to the right of the two black keys.', 'C, D, E \u2014 the three white keys around the group of two.'],
    show: { kind: 'keys', midis: [64], caption: 'E \u2014 just right of the two black keys.', label: 'this is E' },
    demo: [64], demoGap: 0.45,
    tryPrompt: 'Find and press an E \u2014 just right of the two black keys.', targets: [64], mode: 'one',
    okMsg: 'That\u2019s E, just to the right of the two black keys.',
    hint: 'E is the white key immediately right of the group of two black keys.',
  },
  {
    eyebrow: 'White-key names', title: 'Find F', id: 'find-f',
    cues: { arrow: { from: [66, 68, 70], to: 65 }, labels: [{ midi: 65, text: 'F', place: 'below' }] },
    say: [
      { text: 'F sits just to the left of the three black keys.', pauseAfter: 540, tone: 'warm', emphasis: 'F' },
      { text: 'Now you try \u2014 find an F.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['F is the white key just to the left of the group of three black keys.', 'The three black keys are your signpost for F.'],
    show: { kind: 'keys', midis: [65], caption: 'F \u2014 just left of the three black keys.', label: 'this is F' },
    demo: [65], demoGap: 0.45,
    tryPrompt: 'Find and press an F \u2014 just left of the three black keys.', targets: [65], mode: 'one',
    okMsg: 'Good \u2014 that\u2019s F, just to the left of the three black keys.',
    hint: 'F is the white key immediately left of the group of three black keys.',
  },
  {
    eyebrow: 'White-key names', title: 'Find G', id: 'find-g',
    cues: { labels: [{ midi: 67, text: 'G', place: 'below' }] },
    say: [
      { text: 'After F comes G \u2014 the next white key up.', pauseAfter: 540, tone: 'warm', emphasis: 'G' },
      { text: 'Now you try \u2014 find a G.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['G is the next white key to the right of F.', 'It sits between the first two of the three black keys.'],
    show: { kind: 'keys', midis: [67], caption: 'G \u2014 just right of F.', label: 'this is G' },
    demo: [67], demoGap: 0.45,
    tryPrompt: 'Find and press a G \u2014 the white key just right of F.', targets: [67], mode: 'one',
    okMsg: 'Yes \u2014 that\u2019s G, the next white key along.',
    hint: 'G is the next white key to the right of F.',
  },
  {
    eyebrow: 'White-key names', title: 'Find A', id: 'find-a',
    cues: { labels: [{ midi: 69, text: 'A', place: 'below' }] },
    say: [
      { text: 'After G comes A.', pauseAfter: 540, tone: 'warm', emphasis: 'A' },
      { text: 'Now you try \u2014 find an A.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['A is the next white key to the right of G.', 'C, D, E, F, G, A \u2014 the white-key names climbing upward.'],
    show: { kind: 'keys', midis: [69], caption: 'A \u2014 just right of G.', label: 'this is A' },
    demo: [69], demoGap: 0.45,
    tryPrompt: 'Find and press an A \u2014 the white key just right of G.', targets: [69], mode: 'one',
    okMsg: 'That\u2019s A. You can now name all of the white keys.',
    hint: 'A is the next white key to the right of G.',
  },
  {
    eyebrow: 'Your home note', title: 'Find exact Middle C', id: 'middle-c',
    cues: { arrow: { from: [61, 63], to: 60 }, labels: [{ midi: 60, text: 'Middle C', place: 'below' }] },
    say: [
      { text: 'Look near the centre of the keyboard.', pauseAfter: 520 },
      { text: 'Find the two black keys there.', pauseAfter: 520 },
      { text: 'The white key to their left is Middle C.', pauseAfter: 560, tone: 'warm', emphasis: 'Middle C' },
      { text: 'Here it is.', pauseAfter: 460 },
      { text: 'Now you try.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Middle C is one special C, near the centre of the piano.', 'It is a landmark for reading music.'],
    show: { kind: 'keys', midis: [60], caption: 'Middle C \u2014 near the centre.', label: 'Middle C' },
    demo: [60], demoGap: 0.45,
    tryPrompt: 'Press Middle C \u2014 the highlighted key near the centre.', targets: [60], exact: true, mode: 'one',
    okMsg: 'That\u2019s Middle C \u2014 the C nearest the centre of the keyboard.',
    hint: 'Middle C is the highlighted key, near the centre.',
    reteach: 'Let\u2019s look again \u2014 Middle C is near the centre, the white key just left of the two black keys there.',
  },
  {
    eyebrow: 'The note B', title: 'Find B below Middle C', id: 'b-below',
    cues: { arrow: { from: 60, to: 59 }, labels: [{ midi: 60, text: 'C', place: 'below' }, { midi: 59, text: 'B', place: 'below' }] },
    say: [
      { text: 'Start from Middle C.', pauseAfter: 500 },
      { text: 'Step one white key to the left.', pauseAfter: 540, tone: 'warm' },
      { text: 'That note is B \u2014 the B below Middle C.', pauseAfter: 560, emphasis: 'B' },
      { text: 'Later, this B becomes the starting note of the B major scale.', pauseAfter: 460, tone: 'warm' },
      { text: 'Now you try.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Step one white key to the left of Middle C. That note is B \u2014 the B below Middle C.', 'Later, this B will be the starting note of our B major scale.'],
    show: { kind: 'keys', midis: [59, 60], caption: 'B sits immediately left of Middle C.', label: 'C \u2192 one step left \u2192 B' },
    demo: [60, 59], demoGap: 0.5,
    tryPrompt: 'Press the B just below Middle C \u2014 one white key to the left.', targets: [59], exact: true, mode: 'one',
    okMsg: 'Good \u2014 that\u2019s B, the white key just below Middle C.',
    hint: 'B is the white key immediately left of Middle C.',
    reteach: 'Let\u2019s look again \u2014 find Middle C first, then step one white key to the left for B.',
  },
  {
    eyebrow: 'Direction', title: 'First direction: up and down', id: 'direction',
    cues: { arrow: { from: 60, to: 62 } },
    say: [
      { text: 'Moving to the right raises the pitch.', pauseAfter: 500, tone: 'warm' },
      { text: 'Moving to the left lowers it.', pauseAfter: 480 },
      { text: 'Play two notes that rise \u2014 C, then D.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Moving right raises the pitch; moving left lowers it.', 'Play two notes that rise \u2014 C, then the next white key up, D.'],
    show: { kind: 'keys', midis: [60, 62], caption: 'C up to D \u2014 going up.', label: 'up \u2192' },
    demo: [60, 62], demoGap: 0.4,
    tryPrompt: 'Play C, then D \u2014 two notes rising in pitch.', targets: [60, 62], mode: 'sequence',
    okMsg: 'Good \u2014 that\u2019s motion upward, C to D. Direction is how a melody moves.',
    hint: 'Start on C, then the next white key to the right, D.',
  },
  {
    eyebrow: 'Movement', title: 'Steps and skips', id: 'step-skip',
    cues: { labels: [{ midi: 60, text: 'C', place: 'below' }, { midi: 64, text: 'E', place: 'below' }] },
    say: [
      { text: 'Moving to the very next key is a step.', pauseAfter: 520 },
      { text: 'Jumping over a key is a skip.', pauseAfter: 540, tone: 'warm' },
      { text: 'Play C, then skip up to E.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['A step moves to the next note; a skip jumps over one.', 'Play C, then skip up to E \u2014 leaving D in between.'],
    show: { kind: 'keys', midis: [60, 64], caption: 'C up to E \u2014 a skip.', label: 'C \u2013 E (a skip)' },
    demo: [60, 64], demoGap: 0.5,
    tryPrompt: 'Play C, then skip up to E.', targets: [60, 64], mode: 'sequence',
    okMsg: 'Good \u2014 C to E is a skip. Steps and skips are how melodies move.',
    hint: 'Play C first, then skip over D to E.',
  },
  {
    eyebrow: 'Tones & semitones', title: 'The smallest step: a semitone', id: 'semitone',
    say: [
      { text: 'Two useful words now, ones we\u2019ll keep using as scales and keys grow: semitone and tone.', pauseAfter: 600, tone: 'warm' },
      { text: 'A semitone is the smallest step there is \u2014 from one key to the very next key, with nothing between, whether that next key is white or black.', pauseAfter: 600 },
      { text: 'E and F are neighbours with no key between them. Play E, then F \u2014 that move is one semitone.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A semitone is the smallest step \u2014 from any key to the very next key, with nothing between, white or black.', 'E and F sit side by side with no key between. Play E, then F: that is one semitone.'],
    show: { kind: 'keys', midis: [64, 65], caption: 'E to F \u2014 one semitone (no key between).', label: 'E \u2013 F = a semitone' },
    demo: [64, 65], demoGap: 0.5,
    tryPrompt: 'Play E, then the very next key F \u2014 one semitone.', targets: [64, 65], mode: 'sequence', manualNext: true,
    okMsg: 'Good \u2014 that\u2019s a semitone: the smallest move on the keyboard. Stepping to a black key is a semitone too.',
    hint: 'E and F are the two white keys with no black key between them.',
  },
  {
    eyebrow: 'Tones & semitones', title: 'Two steps: a tone', id: 'tone',
    say: [
      { text: 'A tone is simply two semitones \u2014 two of those smallest steps joined together.', pauseAfter: 580, tone: 'warm' },
      { text: 'From C, step up past the black key to D. You\u2019ve moved two semitones \u2014 that is one tone.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A tone is two semitones \u2014 two smallest steps at once.', 'C up to D skips the black key between them: two semitones, so C to D is one tone.'],
    show: { kind: 'keys', midis: [60, 62], caption: 'C to D \u2014 one tone (two semitones).', label: 'C \u2013 D = a tone' },
    demo: [60, 62], demoGap: 0.5,
    tryPrompt: 'Play C, then D \u2014 a tone (two semitones).', targets: [60, 62], mode: 'sequence', manualNext: true,
    okMsg: 'Good \u2014 a tone: two semitones. Scales are built from tones and semitones in a set order, as you\u2019ll see.',
    hint: 'C and D are white keys with one black key between them \u2014 that gap makes it a tone.',
  },
  {
    eyebrow: 'What a scale is', title: 'Why scales matter', id: 'scale-why',
    say: [
      { text: 'Before we climb one, a word on why scales matter.', pauseAfter: 540, tone: 'warm' },
      { text: 'A scale is an ordered set of steps \u2014 the basic vocabulary of a key. Melodies, chords and whole pieces are drawn from it, and practising one trains the hand to move evenly and find its shape.', pauseAfter: 680 },
      { text: 'We\u2019ll start in C because its steps are all white keys \u2014 easy to see and name. The hand-shape pathway then moves into B major, where the fingers fit the keys especially well.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['A scale is an ordered set of steps \u2014 the vocabulary of a key. Melodies, chords and pieces are built from it, and practising one trains the hand to move evenly.', 'We start in C (all white keys, easy to see), then the hand-shape pathway moves into B major, where the fingers fit the keys especially well.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67], caption: 'A scale: steps in order, C upward.', label: 'a scale = steps in order' },
    mode: 'none',
  },
  {
    eyebrow: 'Notes in order', title: 'First scale idea', id: 'first-scale',
    cues: { labels: [{ midi: 60, text: 'C', place: 'below' }, { midi: 62, text: 'D', place: 'below' }, { midi: 64, text: 'E', place: 'below' }] },
    say: [
      { text: 'A scale is steps in order \u2014 a ladder of pitch.', pauseAfter: 520, tone: 'warm' },
      { text: 'Climb the first three.', pauseAfter: 460, tone: 'instruct' },
      { text: 'C, then D, then E.', pauseAfter: 300 },
    ],
    explain: ['A scale is simply steps in order \u2014 a ladder of pitch.', 'Climb the first three: C, D, E.'],
    show: { kind: 'keys', midis: [60, 62, 64], caption: 'C, D, E \u2014 step by step.', label: 'C \u2013 D \u2013 E' },
    demo: [60, 62, 64], demoGap: 0.3,
    tryPrompt: 'Climb the first three steps in order: C, D, then E.', targets: [60, 62, 64], mode: 'sequence',
    okMsg: 'Good \u2014 C, D, E. That\u2019s the opening of a scale: three steps climbing.',
    hint: 'In order on the white keys: C, then D, then E.',
  },
  {
    eyebrow: 'The C scale', title: 'Five steps up', id: 'c-scale-five',
    say: [
      { text: 'Let\u2019s climb further \u2014 five steps of the C scale.', pauseAfter: 560, tone: 'warm' },
      { text: 'C, D, E, F, G \u2014 each the very next white key.', pauseAfter: 560 },
      { text: 'I\u2019ll play it, then you climb it.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['A scale climbs by steps. Here are five: C, D, E, F, G.', 'Each note is the next white key to the right.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67], caption: 'C, D, E, F, G \u2014 five steps up.', label: 'C D E F G' },
    demo: [60, 62, 64, 65, 67], demoGap: 0.42,
    tryPrompt: 'Climb the C scale: C, D, E, F, G.', targets: [60, 62, 64, 65, 67], mode: 'sequence',
    okMsg: 'Good \u2014 C, D, E, F, G. The first five notes of the C major scale.',
    hint: 'Start on C and play each next white key in turn: C, D, E, F, G.',
  },
  {
    eyebrow: 'The C scale', title: 'And back down', id: 'c-scale-down',
    say: [
      { text: 'A scale comes down as well as up.', pauseAfter: 540, tone: 'warm' },
      { text: 'From G, step down: G, F, E, D, C.', pauseAfter: 560 },
      { text: 'Now you bring it home.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Now descend the same five notes: G, F, E, D, C.', 'Down is just up, in reverse.'],
    show: { kind: 'keys', midis: [67, 65, 64, 62, 60], caption: 'G, F, E, D, C \u2014 five steps down.', label: 'G F E D C' },
    demo: [67, 65, 64, 62, 60], demoGap: 0.42,
    tryPrompt: 'Come down the C scale: G, F, E, D, C.', targets: [67, 65, 64, 62, 60], mode: 'sequence',
    okMsg: 'Good \u2014 up and down. You\u2019ve played your first scale, both directions.',
    hint: 'Start on G and step down: G, F, E, D, C.',
  },
  {
    eyebrow: 'A new shape', title: 'A taste of B major', id: 'first-b-scale',
    progressKey: 'scale:b-major-fragment',
    media: { kind: 'video', topic: 'hand-shape', caption: 'The B major hand shape \u2014 guided demonstration' },
    cues: { labels: B_FRAGMENT.map((m, i) => ({ midi: m, text: B_FRAGMENT_NAMES[i], place: 'below' })) },
    explain: ['Those notes moved upward. Now hear a different shape \u2014 the opening of B major.', `Copy these three: ${B_FRAGMENT_NAMES.join(', then ')}.`],
    show: { kind: 'keys', midis: B_FRAGMENT, caption: `${B_FRAGMENT_NAMES.join(', ')} \u2014 the first steps of B major.`, label: B_FRAGMENT_NAMES.join(' \u2013 ') },
    demo: B_FRAGMENT, demoGap: 0.32,
    tryPrompt: `Copy the shape: ${B_FRAGMENT_NAMES.join(', then ')}.`, targets: B_FRAGMENT, mode: 'sequence',
    okMsg: `That\u2019s the opening of B major \u2014 ${B_FRAGMENT_NAMES.join(', ')}.`,
    hint: 'In order: B, then the black key C#, then the black key D#.',
    reteach: 'B is the white key just left of the two black keys. Climb: B, C#, D#.',
  },
  {
    eyebrow: 'Why B major', title: 'The B-major pathway', id: 'b-major-why',
    say: [
      { text: 'You just played the opening of B major.', pauseAfter: 540, tone: 'warm' },
      { text: 'B major fits the hand beautifully \u2014 the black keys give your longer fingers natural resting points.', pauseAfter: 640 },
      { text: 'That\u2019s why KeyMaster PRO grows your playing from a B-major home: it builds confident, ergonomic technique.', pauseAfter: 320 },
    ],
    explain: ['B major fits the hand well \u2014 the black keys give your longer fingers natural resting points, and the shorter fingers fall comfortably on the white keys.', 'That is why KeyMaster PRO uses a B-major pathway as a home for building technique. The Scales Masterclass takes this much further.'],
    mode: 'none',
  },
  {
    eyebrow: 'Looking ahead', title: 'Scales come next', id: 'bridge-scales',
    explain: ['You found C and climbed your first steps upward \u2014 the beginning of a scale.', 'Scales have their own stage further on in the Course. For deeper practice any time, the Scales Masterclass is always open.'],
    show: { kind: 'keys', midis: [59, 61, 63, 64, 66, 68, 70, 71], caption: 'B major sits naturally under the hand.' },
    demo: [59, 61, 63, 64, 66, 68, 70, 71], demoGap: 0.26, mode: 'none',
    bridge: { label: 'For deeper scale practice, open Scales Masterclass', hash: '#/scales' },
    autoNext: 4200,
  },
  {
    eyebrow: 'Notes together', title: 'First chord idea', id: 'first-chord',
    explain: ['A chord is several notes sounded together.', 'C, E and G together make a C major chord.'],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'C + E + G = C major.', label: 'C + E + G' },
    demo: [60, 64, 67], demoGap: 0.08,
    tryPrompt: 'Press C, E and G together.', targets: [60, 64, 67], mode: 'set',
    okMsg: 'That\u2019s a C major chord \u2014 C, E and G together.',
    hint: 'Press the three highlighted keys together: C, E and G.',
  },
  {
    eyebrow: 'A second chord', title: 'G major chord', id: 'chord-g',
    cues: { labels: [{ midi: 67, text: 'G', place: 'below' }, { midi: 71, text: 'B', place: 'below' }, { midi: 74, text: 'D', place: 'below' }] },
    say: [
      { text: 'You know one chord. Here is a second.', pauseAfter: 520, tone: 'warm' },
      { text: 'G, B and D, played together, make a G major chord.', pauseAfter: 560, emphasis: 'G' },
      { text: 'Press all three at once.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Stack G, B and D and play them together \u2014 that is a G major chord.', 'Like C major, it is built from every-other white key.'],
    show: { kind: 'keys', midis: [67, 71, 74], caption: 'G, B, D \u2014 a G major chord.', label: 'G \u2013 B \u2013 D' },
    demo: [67, 71, 74], demoGap: 0.08,
    tryPrompt: 'Press G, B and D together.', targets: [67, 71, 74], mode: 'set',
    okMsg: 'That\u2019s a G major chord \u2014 G, B and D. You now have two chords.',
    hint: 'Press the three highlighted keys together: G, B and D.',
  },
  {
    eyebrow: 'Looking ahead', title: 'Chords come next', id: 'bridge-chords',
    explain: ['You sounded your first chord \u2014 three notes ringing together.', 'Chords have their own stage further on in the Course. For extra practice any time, the Chord Masterclass is always open.'],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'Chords are built from stacked notes.' },
    demo: [60, 64, 67], demoGap: 0.08, mode: 'none',
    bridge: { label: 'For extra chord practice, open Chord Masterclass', hash: '#/chords' },
    autoNext: 3200,
  },
  {
    eyebrow: 'Reading the staff', title: 'The staff: lines', id: 'staff-what',
    say: [
      { text: 'A quick foundation that unlocks written music: the staff.', pauseAfter: 540, tone: 'warm' },
      { text: 'The staff is the map musicians use to show pitch. Each staff has five lines. A note\u2019s height on the staff tells you how high or low it sounds.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['The staff is the map musicians use to show pitch \u2014 higher on the staff means higher in sound.', 'It has five lines. Here they are, highlighted.'],
    show: { kind: 'staff', clef: 'treble', highlight: 'lines', caption: 'Five lines.' },
    mode: 'none',
  },
  {
    eyebrow: 'Reading the staff', title: 'The staff: spaces', id: 'staff-spaces',
    say: [
      { text: 'Between the five lines are four spaces.', pauseAfter: 520, tone: 'warm' },
      { text: 'A note can sit on a line, or in a space. Lines and spaces together give every pitch a place.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['Between the five lines are four spaces. A note can sit on a line, or in a space.', 'Here are the four spaces, highlighted.'],
    show: { kind: 'staff', clef: 'treble', highlight: 'spaces', caption: 'Four spaces.' },
    mode: 'none',
  },
  {
    eyebrow: 'Reading the staff', title: 'The treble clef', id: 'treble-clef',
    say: [
      { text: 'At the start of a staff sits a clef \u2014 it tells you which pitches the lines and spaces stand for.', pauseAfter: 600, tone: 'warm' },
      { text: 'The treble clef usually helps us read higher notes \u2014 often the right hand at the piano.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['A clef at the start of the staff tells you which pitches the lines and spaces mean.', 'The treble clef usually carries the higher notes \u2014 at the piano, often the right hand.'],
    show: { kind: 'staff', clef: 'treble', caption: 'The treble clef \u2014 higher notes.' },
    mode: 'none',
  },
  {
    eyebrow: 'Reading the staff', title: 'The bass clef', id: 'bass-clef',
    say: [
      { text: 'The bass clef usually helps us read lower notes \u2014 often the left hand at the piano.', pauseAfter: 600, tone: 'warm' },
      { text: 'Same five lines and four spaces, but standing for lower pitches.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['The bass clef usually carries the lower notes \u2014 at the piano, often the left hand.', 'Same five lines and four spaces, standing for lower pitches.'],
    show: { kind: 'staff', clef: 'bass', caption: 'The bass clef \u2014 lower notes.' },
    mode: 'none',
  },
  {
    eyebrow: 'Reading the staff', title: 'The grand staff', id: 'grand-staff',
    say: [
      { text: 'Piano music often uses both clefs together, joined into one system. That is called the grand staff.', pauseAfter: 640, tone: 'warm' },
      { text: 'Treble on top for the right hand, bass below for the left \u2014 to begin with. And right in the middle sits Middle C.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['Piano music joins both clefs into the grand staff \u2014 treble above, bass below. To begin with: treble for the right hand, bass for the left.', 'Between the two staves sits Middle C \u2014 the landmark that links them.'],
    show: { kind: 'staff', clef: 'grand', middleC: true, caption: 'The grand staff \u2014 Middle C sits between.' },
    mode: 'none',
  },
  {
    eyebrow: 'Reading the staff', title: 'Ledger lines', id: 'ledger-line',
    say: [
      { text: 'When notes go above or below the five lines, we add small extra lines called ledger lines.', pauseAfter: 620, tone: 'warm' },
      { text: 'They simply extend the staff. Middle C, just below the treble staff, sits on its own short ledger line \u2014 you can see it here.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['When notes go above or below the five lines, small extra lines \u2014 ledger lines \u2014 extend the staff.', 'Middle C sits on a ledger line just below the treble staff. That is the note shown here.'],
    show: { kind: 'staff', clef: 'treble', notes: [60], caption: 'Middle C on a ledger line below the treble staff.' },
    mode: 'none',
  },
  {
    eyebrow: 'Reading the staff', title: 'From staff to key', id: 'staff-to-key',
    say: [
      { text: 'Now connect it. This note on the staff is Middle C \u2014 and Middle C is a key you already know.', pauseAfter: 620, tone: 'warm' },
      { text: 'Find it on the staff, then find it on the keyboard, and play it.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The note on the staff is Middle C. The staff shows it; the keyboard is where you play it.', 'Find Middle C \u2014 just left of the two black keys, near the centre \u2014 and play it.'],
    show: { kind: 'keys', midis: [60], caption: 'This staff note is Middle C.', label: 'Middle C' },
    staffHint: { clef: 'grand', notes: [60], middleC: true },
    demo: [60], demoGap: 0.45,
    tryPrompt: 'Find Middle C on the staff, then play it on the keyboard.', targets: [60], exact: true, mode: 'one', manualNext: true,
    okMsg: 'Good \u2014 you connected the written note to the key. That link, staff to keyboard, is the whole of reading.',
    hint: 'Middle C is the white key just left of the two black keys, near the centre.',
  },
  {
    eyebrow: 'Reading', title: 'Name and play: E', id: 'read-play-e',
    say: [
      { text: 'Reading music means knowing a note, then playing it.', pauseAfter: 560, tone: 'warm' },
      { text: 'The note is E. Find it and play it.', pauseAfter: 300, tone: 'instruct', emphasis: 'E' },
    ],
    explain: ['Reading music means recognising a note, then finding it on the keyboard.', 'The note is E \u2014 just right of the two black keys. Play it.'],
    show: { kind: 'keys', midis: [64], caption: 'The note is E.', label: 'E' },
    staffHint: { clef: 'treble', notes: [64] },
    demo: [64], demoGap: 0.45,
    tryPrompt: 'The note is E \u2014 find it and play it.', targets: [64], mode: 'one',
    okMsg: 'Good \u2014 you knew E, and you played it. That is where reading music begins.',
    hint: 'E is just right of the two black keys.',
  },
  {
    eyebrow: 'Reading', title: 'Name and play: G', id: 'read-play-g',
    say: [
      { text: 'One more. The note is G.', pauseAfter: 520, tone: 'warm', emphasis: 'G' },
      { text: 'Find it and play it.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Know the note, then play it.', 'The note is G \u2014 just right of F.'],
    show: { kind: 'keys', midis: [67], caption: 'The note is G.', label: 'G' },
    staffHint: { clef: 'treble', notes: [67] },
    demo: [67], demoGap: 0.45,
    tryPrompt: 'The note is G \u2014 find it and play it.', targets: [67], mode: 'one',
    okMsg: 'Good \u2014 know it, then play it. Cognitive Sight-Reading takes this much further.',
    hint: 'G is just right of F.',
  },
  {
    eyebrow: 'Reading', title: 'First reading idea', id: 'first-reading',
    say: [
      { text: 'Written music lives on lines and spaces \u2014 the staff.', pauseAfter: 560, tone: 'warm' },
      { text: 'Middle C is the shared landmark between your two hands, the note we count outward from.', pauseAfter: 620 },
      { text: 'You already know it on the keys. Play Middle C now, and hold it as your anchor.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Written music lives on a staff \u2014 lines and spaces. Middle C is the shared landmark between the hands, the note we count outward from.', 'You already know it on the keys. Play Middle C \u2014 your reading anchor.'],
    show: { kind: 'keys', midis: [60], caption: 'Middle C \u2014 your anchor, on the keys and on the page.', label: 'Middle C' },
    media: { kind: 'image', topic: 'staff', caption: 'Middle C on the staff \u2014 notation view' },
    demo: [60], demoGap: 0.45,
    tryPrompt: 'Play Middle C \u2014 your reading anchor.', targets: [60], exact: true, mode: 'one',
    okMsg: 'Good \u2014 that\u2019s your anchor. In Sight-Reading, every note is read from here.',
    hint: 'Middle C is the white key just left of the two black keys, near the centre.',
    progressKey: 'reading:middle-c-anchor',
  },
  {
    eyebrow: 'Looking ahead', title: 'Reading comes next', id: 'bridge-sightreading',
    explain: ['Reading grows from recognising landmarks like Middle C, then the patterns around them.', 'Reading has its own stage further on in the Course. For more drills any time, Cognitive Sight-Reading is always open.'],
    show: { kind: 'keys', midis: [60], caption: 'Start reading from Middle C.' },
    demo: [60], demoGap: 0.45, mode: 'none',
    bridge: { label: 'For more reading drills, open Cognitive Sight-Reading', hash: '#/sightreading' },
    autoNext: 3200,
  },
  {
    eyebrow: 'Rhythm', title: 'Feel the pulse', id: 'first-pulse',
    media: { kind: 'video', topic: 'pulse', caption: 'Keeping a steady pulse \u2014 guided demonstration' },
    say: [
      { text: 'Music moves in time, over a steady pulse \u2014 a calm, even heartbeat under the notes.', pauseAfter: 560, tone: 'warm' },
      { text: 'Music groups beats in different ways. A very common pattern is four beats: one, two, three, four. We\u2019ll start there.', pauseAfter: 640 },
      { text: 'Listen to the count first, then play a note on each beat. Don\u2019t rush.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Music moves over a steady pulse \u2014 an even heartbeat under the notes.', 'Beats group in different ways; a very common one is four: 1, 2, 3, 4. Listen to the count first, then play a note on each beat.'],
    show: { kind: 'pulse', caption: 'A steady count of four: 1 2 3 4.' },
    tryPrompt: 'After the count, play four notes \u2014 one on each beat.', mode: 'count', count: 4,
    okMsg: 'Good \u2014 that\u2019s pulse: an even beat you can rely on. Every piece you play sits on it.',
    hint: 'Wait for the count to finish, then play any four notes, evenly spaced \u2014 don\u2019t rush.',
    progressKey: 'rhythm:first-pulse',
  },
  {
    eyebrow: 'Rhythm', title: 'Eight steady beats', id: 'pulse-eight',
    say: [
      { text: 'Let\u2019s hold the pulse a little longer \u2014 two groups of four.', pauseAfter: 540, tone: 'warm' },
      { text: 'Listen to the count, then play eight even notes \u2014 one on each beat.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Keep the pulse steady and even \u2014 not rushing, not dragging.', 'Eight beats, grouped as two fours: 1 2 3 4 \u00B7 1 2 3 4. Play a note on each.'],
    show: { kind: 'pulse', caption: 'Two groups of four: 1 2 3 4 \u00B7 1 2 3 4.' },
    tryPrompt: 'After the count, play eight notes \u2014 one on each beat.', mode: 'count', count: 8,
    okMsg: 'Good \u2014 a steady pulse you can rely on. Other music counts in twos, threes, sixes and more, but a steady four is a strong place to start.',
  },
  {
    eyebrow: 'Checkpoint', title: 'Checkpoint: Middle C', id: 'review-c',
    say: [
      { text: 'A quick checkpoint \u2014 a chance to use what you already know.', pauseAfter: 540, tone: 'warm' },
      { text: 'Play Middle C.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Let\u2019s bring together what you\u2019ve learned so far.', 'Find and play Middle C, near the centre.'],
    show: { kind: 'keys', midis: [60], caption: 'Middle C.', label: 'Middle C' },
    demo: [60], demoGap: 0.45,
    tryPrompt: 'Play Middle C.', targets: [60], exact: true, mode: 'one',
    okMsg: 'That\u2019s Middle C, near the centre \u2014 well remembered.',
    hint: 'Middle C is the white key just left of the two black keys, near the centre.',
  },
  {
    eyebrow: 'Checkpoint', title: 'Checkpoint: three steps', id: 'review-scale',
    say: [
      { text: 'Now play the first three steps of the C scale.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['From memory \u2014 climb the first three steps of the C scale.', 'C, then D, then E.'],
    show: { kind: 'keys', midis: [60, 62, 64], caption: 'C, D, E.', label: 'C D E' },
    demo: [60, 62, 64], demoGap: 0.46,
    tryPrompt: 'Play C, D, E in order.', targets: [60, 62, 64], mode: 'sequence',
    okMsg: 'Good \u2014 C, D, E. The scale is in your hands now.',
    hint: 'Start on C, then the next white key, then the next: C, D, E.',
  },
  {
    eyebrow: 'Checkpoint', title: 'Checkpoint: C major chord', id: 'review-chord',
    say: [
      { text: 'Last checkpoint \u2014 a chord.', pauseAfter: 500, tone: 'warm' },
      { text: 'Play C, E and G together.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['One chord, from memory.', 'Press C, E and G together \u2014 a C major chord.'],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'C, E, G together.', label: 'C \u2013 E \u2013 G' },
    demo: [60, 64, 67], demoGap: 0.08,
    tryPrompt: 'Press C, E and G together.', targets: [60, 64, 67], mode: 'set',
    okMsg: 'That\u2019s a C major chord. Orientation, names, scales, reading, rhythm and harmony \u2014 you\u2019ve begun them all.',
    hint: 'Press the three highlighted keys together: C, E and G.',
  },
  {
    eyebrow: 'Stage 1 complete', title: 'Foundations complete', id: 'stage1-complete',
    say: [
      { text: 'That\u2019s Stage 1 complete \u2014 the foundations are yours.', pauseAfter: 600, tone: 'warm' },
      { text: 'You can name the white keys, climb a scale up and down, play two chords, name a note and play it, and hold a steady pulse.', pauseAfter: 700 },
      { text: 'The Course now continues into Stage 2, where we begin shaping these notes into music. The masterclasses are there too, any time, for deeper practice.', pauseAfter: 360, tone: 'warm' },
    ],
    explain: ['Stage 1 complete \u2014 you\u2019ve built the foundations: the keyboard, the white keys, movement, scales, B major, harmony, naming notes, and a steady pulse.', 'Next is Stage 2, where these foundations become music. Continue the Course below \u2014 the masterclasses stay available any time for deeper practice.'],
    bridge: { label: 'Optional \u2014 open a practice room for deeper practice', hash: '#/scales' },
    mode: 'none',
  },

  // ===========================================================================
  // STAGE 2 \u2014 Making Music. Applied music built on the Stage 1 foundations:
  // short phrases, pulse inside music, scale shape, harmony, pattern recognition,
  // a first melody. Same gating / captions-first / demo-sweep engine; no timing
  // is scored. Masterclasses remain optional deeper practice, never the Course.
  // ===========================================================================
  {
    eyebrow: 'Stage 2 \u00B7 Making music', title: 'Welcome to Stage 2', id: 'stage2-welcome',
    say: [
      { text: 'Welcome to Stage 2. In Stage 1 you learned the keyboard; now we start to shape those notes into music.', pauseAfter: 620, tone: 'warm' },
      { text: 'Short phrases, a little harmony, and a steady pulse underneath \u2014 one small step at a time.', pauseAfter: 360 },
    ],
    explain: ['Welcome to Stage 2. You\u2019ll begin connecting notes into short phrases, a little harmony, and pulse \u2014 the start of shaping sound into music.', 'Nothing here is graded for timing. We\u2019re building musicianship, one small step at a time.'],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'From notes to music.', label: 'Stage 2' },
    mode: 'none',
  },
  {
    eyebrow: 'The B-major pathway', title: 'Why B major fits the hand', id: 'bmaj-shape',
    say: [
      { text: 'Here\u2019s something pianists know: B major sits beautifully under the hand.', pauseAfter: 580, tone: 'warm' },
      { text: 'Your long fingers \u2014 two, three and four \u2014 fall naturally onto the raised black keys, while the thumb and little finger rest on the white keys. C major actually asks more of a beginner\u2019s flat hand.', pauseAfter: 720 },
      { text: 'C major stays our reference for naming and reading. But B major is the KeyMaster hand-shape pathway \u2014 the shape your hand wants to make.', pauseAfter: 360, tone: 'warm' },
    ],
    explain: ['B major fits the hand: the long fingers (2, 3, 4) fall onto the raised black keys, while the thumb (1) and little finger (5) take the white keys.', 'C major is our reference for naming and reading; B major is the KeyMaster hand-shape pathway. Watch the long fingers light \u2014 those are the ones that reach the black keys.'],
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

  // ===========================================================================
  // STAGE 3 \u2014 Reading & Playing. The eye-to-hand loop: read a note on the treble
  // staff, find it on the keyboard, play it with the right finger, hear it. Staff,
  // keyboard and fingering shown together throughout. No timing scored.
  // ===========================================================================
  {
    eyebrow: 'Stage 3 \u00B7 Reading & playing', title: 'Reading while you play', id: 's3-welcome',
    say: [
      { text: 'Welcome to Stage 3. Here we join two things you already have: reading the staff, and playing with your hand.', pauseAfter: 640, tone: 'warm' },
      { text: 'From now on, when you play, you\u2019ll often see the note on the staff, the key on the keyboard, and the finger to use \u2014 all at once. Eye, staff, finger, key, sound.', pauseAfter: 360 },
    ],
    explain: ['Stage 3 joins reading and playing into one loop: see the note on the staff, find the key, play it with the right finger, hear it.', 'The staff, the keyboard and the fingering appear together \u2014 so what you see and what your hand does become the same thing.'],
    show: { kind: 'staff', clef: 'treble', notes: [64], caption: 'See it, find it, play it.' },
    mode: 'none',
  },
  {
    eyebrow: 'Treble landmarks', title: 'G on the second line', id: 's3-landmark-g',
    say: [
      { text: 'A landmark to anchor your reading: the note G sits on the second line of the treble staff \u2014 the line the treble clef curls around.', pauseAfter: 660, tone: 'warm' },
      { text: 'That G is the G just above Middle C. Find it and play it with finger two.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The treble clef curls around the second line \u2014 the line for G, just above Middle C. It\u2019s a reading landmark.', 'Find that G and play it with finger 2.'],
    show: { kind: 'keys', midis: [67], caption: 'G \u2014 second line of the treble staff.', label: 'G' },
    staffHint: { clef: 'treble', notes: [67] },
    handHint: { hand: 'right', highlight: [2] },
    demo: [67], demoGap: 0.45,
    tryPrompt: 'Play the G shown on the staff \u2014 just above Middle C, with finger 2.', targets: [67], mode: 'one',
    okMsg: 'Yes \u2014 G on the second line. Landmarks like this let you read by sight, without counting every line.',
    hint: 'G is the white key just above the two-black-key group, near the middle.',
  },
  {
    eyebrow: 'Reading on the staff', title: 'Three notes, going up', id: 's3-read-up',
    say: [
      { text: 'Now follow a short rise: C, D, E, climbing from Middle C \u2014 each note a step higher on the staff.', pauseAfter: 620, tone: 'warm' },
      { text: 'Higher on the staff means higher in sound. Play them in order, fingers one, two, three.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Notes climbing the staff climb in pitch. Read C, D, E rising from Middle C.', 'Play them in order with fingers 1, 2, 3 \u2014 watching the notes rise as your hand moves.'],
    show: { kind: 'keys', midis: [60, 62, 64], caption: 'C, D, E \u2014 rising on the staff.', label: 'C D E' },
    staffHint: { clef: 'treble', notes: [60, 62, 64] },
    handHint: { hand: 'right', highlight: [1, 2, 3] },
    demo: [60, 62, 64], demoGap: 0.46,
    tryPrompt: 'Play the rise you see: C, D, E (fingers 1, 2, 3).', targets: [60, 62, 64], mode: 'sequence',
    okMsg: 'There \u2014 the notes rose on the staff and your hand rose with them. That match is reading.',
    hint: 'From Middle C: C, then D, then E \u2014 fingers 1, 2, 3.',
  },
  {
    eyebrow: 'Reading on the staff', title: 'Which note is higher?', id: 's3-direction',
    say: [
      { text: 'A quick test of direction. Two notes are on the staff \u2014 one sits higher than the other.', pauseAfter: 560, tone: 'warm' },
      { text: 'The higher note on the staff is the higher sound. Play the higher one.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Staff height shows pitch: the note placed higher sounds higher. Here, G sits well above Middle C.', 'Play the higher note \u2014 the G.'],
    show: { kind: 'keys', midis: [67], caption: 'Play the higher note.', label: 'higher = G' },
    staffHint: { clef: 'treble', notes: [60, 67] },
    demo: [67], demoGap: 0.45,
    tryPrompt: 'Play the higher of the two notes on the staff.', targets: [67], mode: 'one',
    okMsg: 'Yes \u2014 higher on the staff, higher in sound, further right on the keyboard. Direction connects all three.',
    hint: 'The higher note on the staff is G, above Middle C.',
  },
  {
    eyebrow: 'Fingering while reading', title: 'A pattern with fingers', id: 's3-read-fingered',
    say: [
      { text: 'Now follow a small pattern with a finger ready for each note: C, D, E, then back to D.', pauseAfter: 600, tone: 'warm' },
      { text: 'Fingers one, two, three, two. Let your eye lead and your hand follow.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Follow the pattern C, D, E, D \u2014 a small there-and-back. Fingers 1, 2, 3, 2.', 'A finger ready for each note is what keeps reading smooth.'],
    show: { kind: 'keys', midis: [60, 62, 64, 62], caption: 'C, D, E, D.', label: 'C D E D' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 62] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 2] },
    demo: [60, 62, 64, 62], demoGap: 0.44,
    tryPrompt: 'Play the pattern: C, D, E, D (fingers 1, 2, 3, 2).', targets: [60, 62, 64, 62], mode: 'sequence',
    okMsg: 'Good \u2014 read, fingered, played. The eye-to-hand loop is getting smoother.',
    hint: 'C, D, E, then back to D \u2014 fingers 1, 2, 3, 2.',
  },
  {
    eyebrow: 'Right-hand patterns', title: 'Up to F and back', id: 's3-rh-pattern',
    say: [
      { text: 'A longer line now, still all steps: C, D, E, F, E.', pauseAfter: 580, tone: 'warm' },
      { text: 'Fingers one, two, three, four, three. Keep the hand quiet \u2014 only the fingers move.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Follow a five-note line: C, D, E, F, E \u2014 up to F and back a step. Fingers 1, 2, 3, 4, 3.', 'Keep the hand settled; let the fingers do the moving.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 64], caption: 'C, D, E, F, E.', label: 'C D E F E' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 65, 64] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 4, 3] },
    demo: [60, 62, 64, 65, 64], demoGap: 0.4,
    tryPrompt: 'Play C, D, E, F, E in order (fingers 1, 2, 3, 4, 3).', targets: [60, 62, 64, 65, 64], mode: 'sequence',
    okMsg: 'That\u2019s it \u2014 a five-note line, played in order. Your hand is learning to stay home while the fingers travel.',
    hint: 'C up to F, then one step back to E \u2014 fingers 1, 2, 3, 4, 3.',
  },
  {
    eyebrow: 'Right-hand patterns', title: 'Five notes, coming down', id: 's3-rh-down',
    say: [
      { text: 'Now from the top down: G, F, E, D, C \u2014 the five-finger position, descending.', pauseAfter: 580, tone: 'warm' },
      { text: 'Fingers five, four, three, two, one. Even and unhurried.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Descend the five-finger position: G, F, E, D, C. Fingers 5, 4, 3, 2, 1.', 'This is the right hand\u2019s home position \u2014 a thumb-to-little-finger span you\u2019ll use constantly.'],
    show: { kind: 'keys', midis: [67, 65, 64, 62, 60], caption: 'G, F, E, D, C \u2014 coming down.', label: 'G F E D C' },
    staffHint: { clef: 'treble', notes: [67, 65, 64, 62, 60] },
    handHint: { hand: 'right', highlight: [5, 4, 3, 2, 1] },
    demo: [67, 65, 64, 62, 60], demoGap: 0.4,
    tryPrompt: 'Play G, F, E, D, C coming down (fingers 5, 4, 3, 2, 1).', targets: [67, 65, 64, 62, 60], mode: 'sequence',
    okMsg: 'Good \u2014 the five-finger position, top to bottom. This shape underlies the C scale and much more.',
    hint: 'Start on G with finger 5, then step down to Middle C with the thumb.',
  },
  {
    eyebrow: 'Reading with pulse', title: 'Playing in time', id: 's3-read-pulse',
    say: [
      { text: 'Let\u2019s add the pulse back. Listen to the count of four, then play four steady notes \u2014 C, D, E, F, one on each beat.', pauseAfter: 640, tone: 'warm' },
      { text: 'Reading, fingering and pulse together now \u2014 unhurried.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Reading and playing in time: after the count, play C, D, E, F \u2014 one note per beat, even and calm.', 'Music groups beats in different ways; we keep to a steady four here. Nothing is scored \u2014 the count is support.'],
    show: { kind: 'pulse', caption: 'A note on each beat: 1 2 3 4.' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 65] },
    tryPrompt: 'After the count, play four notes \u2014 one on each beat.', mode: 'count', count: 4,
    okMsg: 'Yes \u2014 reading and playing carried on a steady pulse. That\u2019s how written music actually moves.',
    hint: 'Wait for the count to finish, then four even notes \u2014 C, D, E, F is a good choice.',
  },
  {
    eyebrow: 'B major, with the staff', title: 'B, C\u266F, D\u266F from the staff', id: 's3-bmaj-staff',
    say: [
      { text: 'Bring the B-major shape into your reading. These three notes are B, C sharp, D sharp \u2014 the start of B major, right hand.', pauseAfter: 680, tone: 'warm' },
      { text: 'Thumb on B, finger two on C sharp, finger three on D sharp. The long fingers reach the black keys, just as your hand wants to.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The B-major shape, now read from the staff: B, C\u266F, D\u266F with fingers 1, 2, 3.', 'White key under the thumb, long fingers up onto the black keys \u2014 the ergonomic shape, connected to what you see.'],
    show: { kind: 'keys', midis: [71, 73, 75], caption: '1 on B, 2 on C\u266F, 3 on D\u266F.', label: 'B C\u266F D\u266F' },
    staffHint: { clef: 'treble', notes: [71, 73, 75] },
    handHint: { hand: 'right', highlight: [1, 2, 3] },
    demo: [71, 73, 75], demoGap: 0.5,
    tryPrompt: 'Right hand: play B, C\u266F, D\u266F (fingers 1, 2, 3).', targets: [71, 73, 75], mode: 'sequence',
    okMsg: 'Good \u2014 the B-major hand shape, played from the staff. This is the pathway the Scales Masterclass develops in full.',
    hint: 'B (white) under the thumb, then up onto the two black keys C\u266F and D\u266F.',
  },
  {
    eyebrow: 'Building a phrase', title: 'A rising-and-falling line', id: 's3-phrase',
    say: [
      { text: 'Let\u2019s shape a longer line: C, E, G, E, C \u2014 up through a chord shape and back home.', pauseAfter: 620, tone: 'warm' },
      { text: 'Fingers one, two, three, two, one. Let it sound like one idea, not five separate notes.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Shape a phrase: C, E, G, E, C \u2014 rising through a chord shape, then settling home. Fingers 1, 2, 3, 2, 1.', 'Aim for one connected line, not five separate notes.'],
    show: { kind: 'keys', midis: [60, 64, 67, 64, 60], caption: 'C, E, G, E, C.', label: 'C E G E C' },
    staffHint: { clef: 'treble', notes: [60, 64, 67, 64, 60] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 2, 1] },
    demo: [60, 64, 67, 64, 60], demoGap: 0.42,
    tryPrompt: 'Play the line: C, E, G, E, C (fingers 1, 2, 3, 2, 1).', targets: [60, 64, 67, 64, 60], mode: 'sequence',
    okMsg: 'Good \u2014 up and home again. Read, fingered, shaped: that is a phrase, and you played it whole.',
    hint: 'C, E, G, then back E, C \u2014 fingers 1, 2, 3, 2, 1.',
  },
  {
    eyebrow: 'Stage 3 review', title: 'Checkpoint: see and play', id: 's3-review',
    say: [
      { text: 'A calm checkpoint \u2014 let\u2019s bring this together. Play this short rise once more: C, D, E, F, G.', pauseAfter: 620, tone: 'warm' },
      { text: 'The whole five-finger position, going up. Fingers one to five.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['From memory and from the staff: C, D, E, F, G \u2014 the five-finger position rising. Fingers 1, 2, 3, 4, 5.', 'Just reading and playing what you\u2019ve built \u2014 take it steadily.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67], caption: 'C, D, E, F, G.', label: 'C D E F G' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 65, 67] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 4, 5] },
    demo: [60, 62, 64, 65, 67], demoGap: 0.4,
    tryPrompt: 'Play C, D, E, F, G rising (fingers 1, 2, 3, 4, 5).', targets: [60, 62, 64, 65, 67], mode: 'sequence',
    okMsg: 'Good \u2014 the five-finger position, played from the staff, top to bottom. Stage 3 is yours.',
    hint: 'From Middle C up five white keys: C, D, E, F, G \u2014 fingers 1 to 5.',
  },
  {
    eyebrow: 'Stage 3 complete', title: 'On to two hands', id: 's3-onward',
    say: [
      { text: 'That\u2019s Stage 3 \u2014 you\u2019re reading from the staff and playing in one motion, right hand leading.', pauseAfter: 620, tone: 'warm' },
      { text: 'Stage 4 brings in the left hand and the bass clef, and joins them on the grand staff. The Course keeps going.', pauseAfter: 360, tone: 'warm' },
    ],
    explain: ['Stage 3 complete \u2014 eye, staff, finger, key and sound are working as one, right hand leading.', 'Stage 4 adds the left hand, the bass clef, and the grand staff that joins them. Continue below.'],
    bridge: { label: 'Optional \u2014 open a practice room for deeper practice', hash: '#/scales' },
    mode: 'none',
  },

  // ===========================================================================
  // STAGE 4 \u2014 Two Hands & the Grand Staff. The left hand, the bass clef, and the
  // grand staff that joins both; left-hand patterns, a right-hand melody over a
  // left-hand anchor, scale fragments hand by hand, and a first little piece.
  // ===========================================================================
  {
    eyebrow: 'Stage 4 \u00B7 Two hands', title: 'The left hand joins in', id: 's4-welcome',
    say: [
      { text: 'Welcome to Stage 4. Until now the right hand has led. Now the left hand joins, and with it the bass clef.', pauseAfter: 640, tone: 'warm' },
      { text: 'We\u2019ll take it hand by hand first \u2014 the way good practice always begins \u2014 then let them meet on the grand staff.', pauseAfter: 360 },
    ],
    explain: ['Stage 4 brings in the left hand and the bass clef. Piano reading uses both staves at once \u2014 the grand staff.', 'We build hand by hand first, then join them. No rush.'],
    show: { kind: 'staff', clef: 'grand', middleC: true, caption: 'Two hands, two staves \u2014 joined by Middle C.' },
    mode: 'none',
  },
  {
    eyebrow: 'The bass clef', title: 'Lower notes, left hand', id: 's4-bass-clef',
    say: [
      { text: 'The bass clef carries the lower notes \u2014 usually the left hand at the piano.', pauseAfter: 580, tone: 'warm' },
      { text: 'Its landmark is F: the note F sits on the fourth line, between the two dots of the clef.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['The bass clef carries lower notes \u2014 usually the left hand. Same five lines and four spaces, lower in pitch.', 'Its landmark: F on the fourth line, marked by the clef\u2019s two dots.'],
    show: { kind: 'staff', clef: 'bass', notes: [53], caption: 'F \u2014 the bass-clef landmark, fourth line.' },
    mode: 'none',
  },
  {
    eyebrow: 'Left-hand fingers', title: 'The left hand, numbered', id: 's4-lh-fingers',
    say: [
      { text: 'A reminder of the left hand. Same numbers \u2014 thumb is one, little finger is five \u2014 mirrored, with the thumb toward the middle.', pauseAfter: 660, tone: 'warm' },
      { text: 'Watch them light: one, two, three, four, five.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The left hand uses the same numbers, mirrored: thumb (1) toward the centre, little finger (5) reaching low.', 'When the left hand climbs from a low note, the little finger often starts \u2014 5, 4, 3, 2, 1.'],
    show: { kind: 'hand', hand: 'left', sweep: [1, 2, 3, 4, 5], caption: 'Left hand: 1 (thumb) to 5 (little finger).' },
    mode: 'none',
  },
  {
    eyebrow: 'Reading the bass', title: 'Play a bass note', id: 's4-lh-note',
    say: [
      { text: 'A note sits in the bass clef for the left hand. This is C \u2014 the C below Middle C.', pauseAfter: 640, tone: 'warm' },
      { text: 'It sits in the second space of the bass staff. Play it with your left thumb, finger one.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['This bass-clef note is the C below Middle C, in the second space. Play it with the left hand, finger 1 (thumb).', 'Lower on the staff, lower on the keyboard, to the left of Middle C.'],
    show: { kind: 'keys', midis: [48], caption: 'C below Middle C \u2014 left hand.', label: 'low C' },
    staffHint: { clef: 'bass', notes: [48] },
    handHint: { hand: 'left', highlight: [1] },
    demo: [48], demoGap: 0.5,
    tryPrompt: 'Left hand: play the C below Middle C (finger 1).', targets: [48], exact: true, mode: 'one',
    okMsg: 'Good \u2014 a bass note, played from the staff with the left hand. The left hand reads its own clef.',
    hint: 'The C an octave below Middle C \u2014 left of centre, just left of a two-black-key group.',
  },
  {
    eyebrow: 'Left-hand pattern', title: 'Three notes, left hand', id: 's4-lh-pattern',
    say: [
      { text: 'Now a short left-hand rise: C, D, E, low on the keyboard.', pauseAfter: 580, tone: 'warm' },
      { text: 'The left hand climbs with fingers three, two, one \u2014 the thumb arriving on top.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A left-hand rise: C, D, E below Middle C. Ascending, the left hand uses fingers 3, 2, 1 \u2014 thumb on the highest.', 'Follow it in the bass clef as you play.'],
    show: { kind: 'keys', midis: [48, 50, 52], caption: 'Low C, D, E \u2014 left hand.', label: 'C D E' },
    staffHint: { clef: 'bass', notes: [48, 50, 52] },
    handHint: { hand: 'left', highlight: [3, 2, 1] },
    demo: [48, 50, 52], demoGap: 0.48,
    tryPrompt: 'Left hand: play low C, D, E rising (fingers 3, 2, 1).', targets: [48, 50, 52], mode: 'sequence',
    okMsg: 'Good \u2014 the left hand reads and plays too. Notice it climbs toward the thumb, mirroring the right.',
    hint: 'Low C, D, E to the left of Middle C \u2014 left-hand fingers 3, 2, 1.',
  },
  {
    eyebrow: 'The grand staff', title: 'Both hands, both clefs', id: 's4-grand',
    say: [
      { text: 'Here is the grand staff with a note for each hand: a low C for the left, a G for the right.', pauseAfter: 660, tone: 'warm' },
      { text: 'Play the low note first with the left hand, then the high note with the right. Two clefs, two hands, one keyboard.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The grand staff shows both hands at once. The bass note is the left hand\u2019s low C; the treble note is the right hand\u2019s G.', 'Play the low note, then the high note \u2014 left hand, then right.'],
    show: { kind: 'keys', midis: [48, 67], caption: 'Low C (left) and G (right).', label: 'C  \u2026  G' },
    staffHint: { clef: 'grand', notes: [48, 67] },
    demo: [48, 67], demoGap: 0.6,
    tryPrompt: 'Play a low note with the left hand, then a high note with the right.', mode: 'lowhigh',
    okMsg: 'There \u2014 left below, right above, joined on the grand staff. That division is how piano reading begins.',
    hint: 'A low key on the left for the left hand, then a higher key on the right for the right hand.',
  },
  {
    eyebrow: 'Melody over an anchor', title: 'Left anchor, right melody', id: 's4-anchor',
    say: [
      { text: 'A first taste of two hands with a job each: the left hand holds a low anchor note, and the right plays a little melody above it.', pauseAfter: 700, tone: 'warm' },
      { text: 'Play your low left-hand C, then a short right-hand line above. Left grounds, right sings.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The left hand often anchors a low note while the right plays the melody. Play a low note (left), then a higher note (right).', 'This left-grounds, right-sings shape is the heart of countless pieces.'],
    show: { kind: 'keys', midis: [48, 64], caption: 'Left anchor, right melody.', label: 'low + high' },
    staffHint: { clef: 'grand', notes: [48, 64] },
    demo: [48, 64], demoGap: 0.6,
    tryPrompt: 'Play a low left-hand note, then a higher right-hand note.', mode: 'lowhigh',
    okMsg: 'Yes \u2014 an anchor below and a voice above. You\u2019re hearing how the two hands share a single piece of music.',
    hint: 'Low key with the left hand first, then a higher key with the right.',
  },
  {
    eyebrow: 'Chord or arpeggio', title: 'Together, or one at a time', id: 's4-chord-arp',
    say: [
      { text: 'A reminder that pays off with two hands. Three notes together make a chord; the same three one at a time make an arpeggio.', pauseAfter: 680, tone: 'warm' },
      { text: 'Play C, E, G one at a time \u2014 an arpeggio \u2014 with the right hand, fingers one, two, three.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['Chord = notes together; arpeggio = the same notes one at a time. Play C, E, G as an arpeggio, fingers 1, 2, 3.', 'Left hands often arpeggiate a chord while the right plays melody \u2014 worth knowing well.'],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'C, E, G \u2014 one at a time.', label: 'C \u2192 E \u2192 G' },
    staffHint: { clef: 'treble', notes: [60, 64, 67] },
    handHint: { hand: 'right', highlight: [1, 2, 3] },
    demo: [60, 64, 67], demoGap: 0.5,
    tryPrompt: 'Play C, E, G one at a time \u2014 an arpeggio (fingers 1, 2, 3).', targets: [60, 64, 67], mode: 'sequence',
    okMsg: 'Good \u2014 a clean arpeggio. Chords and arpeggios are the same harmony, shaped two ways.',
    hint: 'The three chord notes, one after another: C, E, G.',
  },
  {
    eyebrow: 'Scale fragment, right hand', title: 'Five notes up, right hand', id: 's4-scale-rh',
    say: [
      { text: 'Toward scales. The right hand\u2019s five-finger position is the front half of the C scale: C, D, E, F, G.', pauseAfter: 640, tone: 'warm' },
      { text: 'Play it up, fingers one to five \u2014 even and connected.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The five-finger position C-D-E-F-G is the first half of the C scale. Right hand, fingers 1, 2, 3, 4, 5.', 'The full scale joins two such shapes with the thumb passing under \u2014 the Scales Masterclass builds that in depth.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67], caption: 'C, D, E, F, G \u2014 right hand.', label: 'C D E F G' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 65, 67] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 4, 5] },
    demo: [60, 62, 64, 65, 67], demoGap: 0.38,
    tryPrompt: 'Right hand: play C, D, E, F, G up (fingers 1, 2, 3, 4, 5).', targets: [60, 62, 64, 65, 67], mode: 'sequence',
    okMsg: 'Good \u2014 half a scale, evenly fingered. This is the foundation the Scales Masterclass takes all the way.',
    hint: 'From Middle C up five white keys, fingers 1 to 5.',
  },
  {
    eyebrow: 'Scale fragment, left hand', title: 'Five notes up, left hand', id: 's4-scale-lh',
    say: [
      { text: 'The same shape, left hand, low on the keyboard: C, D, E, F, G.', pauseAfter: 580, tone: 'warm' },
      { text: 'Ascending, the left hand starts on the little finger: five, four, three, two, one.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['The left-hand five-finger position, ascending: C, D, E, F, G with fingers 5, 4, 3, 2, 1 \u2014 little finger to thumb.', 'Follow it in the bass clef. Both hands now know the shape.'],
    show: { kind: 'keys', midis: [48, 50, 52, 53, 55], caption: 'Low C, D, E, F, G \u2014 left hand.', label: 'C D E F G' },
    staffHint: { clef: 'bass', notes: [48, 50, 52, 53, 55] },
    handHint: { hand: 'left', highlight: [5, 4, 3, 2, 1] },
    demo: [48, 50, 52, 53, 55], demoGap: 0.38,
    tryPrompt: 'Left hand: play low C, D, E, F, G up (fingers 5, 4, 3, 2, 1).', targets: [48, 50, 52, 53, 55], mode: 'sequence',
    okMsg: 'Good \u2014 the left hand has the shape too, mirrored. Now both hands are ready for scale work.',
    hint: 'Low C up five white keys \u2014 left-hand fingers 5, 4, 3, 2, 1.',
  },
  {
    eyebrow: 'Practising well', title: 'Hands separately, then together', id: 's4-practise',
    say: [
      { text: 'A word on practising two hands. Always learn each hand on its own first \u2014 sure and even \u2014 before joining them.', pauseAfter: 680, tone: 'warm' },
      { text: 'Joining too early just teaches confusion. Hands separately, slowly, then together: that is the whole secret.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['Two-hand playing is built one hand at a time. Learn each hand separately, slowly and evenly, then join them.', 'This patience is exactly what separates steady progress from frustration.'],
    show: { kind: 'hand', hand: 'both', sweep: [1], caption: 'Each hand on its own first \u2014 then together.' },
    mode: 'none',
  },
  {
    eyebrow: 'A little piece', title: 'Your first short piece', id: 's4-piece',
    say: [
      { text: 'Let\u2019s end with a short piece for the right hand \u2014 a real little line: C, D, E, F, E, D, C.', pauseAfter: 660, tone: 'warm' },
      { text: 'Up to F and all the way home. Fingers one, two, three, four, three, two, one. Slowly, evenly, listening.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A short piece: C, D, E, F, E, D, C \u2014 up to F and back home. Fingers 1, 2, 3, 4, 3, 2, 1.', 'Play it slowly and evenly, as one shape, listening to the sound.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 64, 62, 60], caption: 'C, D, E, F, E, D, C.', label: 'a little piece' },
    staffHint: { clef: 'treble', notes: [60, 62, 64, 65, 64, 62, 60] },
    handHint: { hand: 'right', highlight: [1, 2, 3, 4, 3, 2, 1] },
    demo: [60, 62, 64, 65, 64, 62, 60], demoGap: 0.42,
    tryPrompt: 'Play the piece: C, D, E, F, E, D, C (fingers 1, 2, 3, 4, 3, 2, 1).', targets: [60, 62, 64, 65, 64, 62, 60], mode: 'sequence',
    okMsg: 'Good \u2014 you played a whole short line from the staff, up and home. That is a real piece of music, played from notation.',
    hint: 'C up to F, then back down to C \u2014 fingers 1, 2, 3, 4, 3, 2, 1.',
  },
  {
    eyebrow: 'Stage 4 review', title: 'Checkpoint: both hands, the shape', id: 's4-review',
    say: [
      { text: 'A calm checkpoint. Play the left-hand five-finger shape once more: low C, D, E, F, G.', pauseAfter: 620, tone: 'warm' },
      { text: 'Fingers five, four, three, two, one \u2014 from memory and from the bass clef.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['From memory: the left-hand five-finger shape, low C, D, E, F, G \u2014 fingers 5, 4, 3, 2, 1.', 'A chance to confirm the left hand knows its shape and its clef.'],
    show: { kind: 'keys', midis: [48, 50, 52, 53, 55], caption: 'Low C, D, E, F, G \u2014 left hand.', label: 'C D E F G' },
    staffHint: { clef: 'bass', notes: [48, 50, 52, 53, 55] },
    handHint: { hand: 'left', highlight: [5, 4, 3, 2, 1] },
    demo: [48, 50, 52, 53, 55], demoGap: 0.4,
    tryPrompt: 'Left hand: play low C, D, E, F, G (fingers 5, 4, 3, 2, 1).', targets: [48, 50, 52, 53, 55], mode: 'sequence',
    okMsg: 'Good \u2014 both hands now know their own clef and the five-finger shape. Stage 4 is yours.',
    hint: 'Low C up five white keys \u2014 left-hand fingers 5, 4, 3, 2, 1.',
  },
  {
    eyebrow: 'The road ahead', title: 'Where you are now', id: 's4-onward',
    say: [
      { text: 'Look how far this has come. You sit and shape your hands, you know the finger numbers, you read both clefs, you play patterns and a short piece, and you feel a steady pulse.', pauseAfter: 760, tone: 'warm' },
      { text: 'From here the path widens: full scales hand over hand, longer pieces, two hands together. The Scales Masterclass and Cognitive Sight-Reading are ready whenever you want to go deeper \u2014 and more Course is on the way.', pauseAfter: 360, tone: 'warm' },
    ],
    explain: ['You\u2019ve built real foundations: posture and hand shape, finger numbers, keyboard geography, both clefs and the grand staff, the B-major pathway, five-finger shapes in both hands, pulse, and a first short piece.', 'Ahead: full scales (thumb passing under), longer two-hand pieces, and deeper reading. The masterclasses are there for deeper practice any time, and the Course continues to grow.'],
    bridge: { label: 'Optional \u2014 open the Scales Masterclass for deeper practice', hash: '#/scales' },
    mode: 'none',
  },
];

// ---- Course chapters -------------------------------------------------------
// The Course is one continuous path, but learners orient far better when that
// path is grouped into named chapters with a sense of "where am I / what's next"
// (the structure benchmark apps use). This is presentation only — it maps over
// the existing LEARN_STEPS by id and changes nothing about the steps themselves.
const COURSE_CHAPTERS = [
  { stage: 1, name: 'Orientation', ids: ['welcome', 'meet-keyboard', 'low-high'] },
  { stage: 1, name: 'Your hands', ids: ['sit-approach', 'hand-shape', 'fingers-rh', 'fingers-lh', 'hands-mirror', 'thumb-play', 'finger3-play', 'press-control'],
    intro: 'Before patterns, set up the hands: posture, a relaxed curved shape, the finger numbers, and control.' },
  { stage: 1, name: 'Black keys', ids: ['black-keys-two', 'black-keys-three'],
    intro: 'The black keys come in groups of two and three \u2014 your signposts.' },
  { stage: 1, name: 'White keys', ids: ['find-c', 'find-d', 'find-e', 'find-f', 'find-g', 'find-a', 'middle-c', 'b-below'],
    intro: 'Now we name the white keys, using the black-key groups to find them.' },
  { stage: 1, name: 'Movement', ids: ['direction', 'step-skip'],
    intro: 'Music moves \u2014 up and down, by steps and by skips.' },
  { stage: 1, name: 'Tones & semitones', ids: ['semitone', 'tone'],
    intro: 'The two sizes of step \u2014 the semitone and the tone \u2014 that scales are built from.' },
  { stage: 1, name: 'Scales', ids: ['scale-why', 'first-scale', 'c-scale-five', 'c-scale-down'],
    intro: 'What a scale is and why it matters \u2014 ordered steps you can climb and descend.' },
  { stage: 1, name: 'B major', ids: ['first-b-scale', 'b-major-why', 'bridge-scales'],
    intro: 'A first taste of the B-major pathway, and why it fits the hand.' },
  { stage: 1, name: 'Harmony', ids: ['first-chord', 'chord-g', 'bridge-chords'],
    intro: 'Notes sounded together make chords \u2014 the colour of music.' },
  { stage: 1, name: 'Reading the staff', ids: ['staff-what', 'staff-spaces', 'treble-clef', 'bass-clef', 'grand-staff', 'ledger-line', 'staff-to-key'],
    intro: 'The staff is the map musicians read \u2014 lines, spaces, clefs, the grand staff, and how it connects to the keys.' },
  { stage: 1, name: 'Reading', ids: ['read-play-e', 'read-play-g', 'first-reading', 'bridge-sightreading'],
    intro: 'Reading music means knowing a note, then playing it \u2014 now linked to the staff.' },
  { stage: 1, name: 'Rhythm', ids: ['first-pulse', 'pulse-eight'],
    intro: 'Music sits on a steady pulse \u2014 an even beat underneath the notes.' },
  { stage: 1, name: 'Checkpoint', ids: ['review-c', 'review-scale', 'review-chord'],
    intro: 'A calm checkpoint \u2014 just the things you already know.' },
  { stage: 1, name: 'Stage 1 complete', ids: ['stage1-complete'] },
  { stage: 2, name: 'Making music', ids: ['stage2-welcome'],
    intro: 'Stage 2 \u2014 the foundations become music.' },
  { stage: 2, name: 'The B-major pathway', ids: ['bmaj-shape', 'bmaj-rh', 'bmaj-lh'],
    intro: 'The KeyMaster hand-shape pathway \u2014 fingering, hand by hand, on the keys that fit.' },
  { stage: 2, name: 'Phrases', ids: ['phrase-up', 'phrase-down', 'read-pattern'],
    intro: 'Short phrases you can play \u2014 up, down, and a pattern to name and play in order.' },
  { stage: 2, name: 'Rhythm in music', ids: ['play-on-pulse', 'pattern-pulse'],
    intro: 'Notes over a steady pulse \u2014 the feel of music in time.' },
  { stage: 2, name: 'Scale & pattern shapes', ids: ['scale-shape-up', 'pattern-fingered'],
    intro: 'A scale and a pattern as shapes \u2014 with a finger ready for each note.' },
  { stage: 2, name: 'Harmony in music', ids: ['arpeggio-c'],
    intro: 'A chord spread out in time becomes an arpeggio.' },
  { stage: 2, name: 'Patterns & phrases', ids: ['motif-echo', 'first-phrase'],
    intro: 'Recognise a small pattern, then play your first melody.' },
  { stage: 2, name: 'Becoming a musician', ids: ['practise-slow', 'listen-tone'],
    intro: 'The habits behind the notes \u2014 practising slowly, and listening.' },
  { stage: 2, name: 'Stage 2 review', ids: ['review-phrase', 'stage2-onward'],
    intro: 'A calm review, and the road into Stage 3.' },

  { stage: 3, name: 'Reading & playing', ids: ['s3-welcome'],
    intro: 'Stage 3 \u2014 reading from the staff and playing as one motion.' },
  { stage: 3, name: 'Reading the staff', ids: ['s3-landmark-g', 's3-read-up', 's3-direction', 's3-read-fingered'],
    intro: 'Landmarks, note movement, and a finger ready for each note.' },
  { stage: 3, name: 'Right-hand patterns', ids: ['s3-rh-pattern', 's3-rh-down'],
    intro: 'Short five-finger lines, played from the staff, the hand staying home.' },
  { stage: 3, name: 'Reading with pulse', ids: ['s3-read-pulse'],
    intro: 'Reading and playing carried on a steady count.' },
  { stage: 3, name: 'B major, reading', ids: ['s3-bmaj-staff'],
    intro: 'The B-major hand shape, now read from the staff.' },
  { stage: 3, name: 'Phrase & review', ids: ['s3-phrase', 's3-review', 's3-onward'],
    intro: 'Shaping a line, a checkpoint, and the road into Stage 4.' },

  { stage: 4, name: 'Two hands', ids: ['s4-welcome'],
    intro: 'Stage 4 \u2014 the left hand and the bass clef join in.' },
  { stage: 4, name: 'The bass clef', ids: ['s4-bass-clef', 's4-lh-fingers', 's4-lh-note', 's4-lh-pattern'],
    intro: 'Lower notes, left-hand fingers, and reading the bass.' },
  { stage: 4, name: 'The grand staff', ids: ['s4-grand', 's4-anchor'],
    intro: 'Both clefs together \u2014 a left-hand anchor under a right-hand melody.' },
  { stage: 4, name: 'Harmony & scales', ids: ['s4-chord-arp', 's4-scale-rh', 's4-scale-lh'],
    intro: 'Chord and arpeggio, and the five-finger scale shape in both hands.' },
  { stage: 4, name: 'Practising well', ids: ['s4-practise'],
    intro: 'Hands separately first, then together \u2014 the heart of good practice.' },
  { stage: 4, name: 'A piece & review', ids: ['s4-piece', 's4-review', 's4-onward'],
    intro: 'A first short piece, a checkpoint, and where you are now.' },
];
function chapterFor(stepId) {
  for (let i = 0; i < COURSE_CHAPTERS.length; i += 1) {
    const pos = COURSE_CHAPTERS[i].ids.indexOf(stepId);
    if (pos >= 0) {
      return {
        chIdx: i + 1, chTotal: COURSE_CHAPTERS.length, name: COURSE_CHAPTERS[i].name,
        stage: COURSE_CHAPTERS[i].stage || 1,
        pos: pos + 1, len: COURSE_CHAPTERS[i].ids.length, intro: COURSE_CHAPTERS[i].intro || null,
      };
    }
  }
  return null;
}

// Public helpers so the dashboard can show the REAL Course shape (11 chapters /
// 34 lessons) instead of a misleading single-stage count.
export const COURSE_CHAPTER_COUNT = COURSE_CHAPTERS.length;
export function chapterAtIndex(idx) {
  const step = LEARN_STEPS[idx];
  const ch = step ? chapterFor(step.id) : null;
  return {
    chIdx: ch ? ch.chIdx : 1,
    chTotal: COURSE_CHAPTERS.length,
    name: ch ? ch.name : '',
    stage: ch ? ch.stage : 1,
    lessonsTotal: LEARN_STEPS.length,
  };
}

/**
 * The foundation pathway. Each card is short by design:
 *   explain   one or two calm sentences (adult, precise, never childish)
 *   show      a small visual (keyboard highlight, the sharps, or a pulse)
 *   demo      midis to SOUND as the demonstration (staggered); demoGap = seconds
 *             between onsets (a small gap rolls a chord; a larger gap walks notes)
 *   try       one interaction with a mode:
 *               any       — free exploration (acknowledged honestly, not praised)
 *               one       — a single target note (pitch-class, unless exact:true)
 *               set       — a chord: all target pitch-classes held together
 *               sequence  — target pitch-classes played in order
 *               count     — tap N times to feel a pulse (any key)
 *               none      — teaching/visual only; Continue moves on
 *   okMsg     the SPECIFIC confirmation shown only when the task is truly correct
 *   hint      used to guide a wrong attempt ("That was G. <hint>")
 *   exact     for 'one': require the literal MIDI, not just the pitch class
 */
const CARDS = [
  {
    eyebrow: 'The keyboard',
    title: 'The piano keyboard',
    explain: [
      'This is the piano keyboard \u2014 one long row of keys. Lower sounds sit to the left, higher sounds to the right.',
      'Press a key anywhere and listen: each key gives one clear sound.',
    ],
    show: { kind: 'keys', midis: [55, 57, 59, 60, 62, 64, 67], caption: 'Lower to the left, higher to the right.' },
    demo: [55, 60, 67], demoGap: 0.5,
    tryPrompt: 'Press any key to hear where you are.',
    mode: 'any',
    okMsg: 'Good. That is your first landmark: sound moves across the keyboard from low to high.',
  },
  {
    eyebrow: 'Finding your way',
    title: 'Black-key groups',
    explain: [
      'Look at the black keys: they fall into groups of two and three, with a gap between each group.',
      'These groups are your map \u2014 they let you find any note by sight and by feel.',
    ],
    show: { kind: 'keys', midis: [61, 63, 66, 68, 70], caption: 'A group of two, then a group of three.' },
    demo: [61, 63, 66, 68, 70], demoGap: 0.34,
    mode: 'none',
  },
  {
    eyebrow: 'The landmark C',
    title: 'Finding C',
    explain: [
      'C is the white key just to the left of every group of two black keys.',
      'Because that pattern repeats, you can find a C anywhere on the keyboard.',
    ],
    show: { kind: 'keys', midis: [60], caption: 'C sits just left of the two black keys.' },
    demo: [60], demoGap: 0.45,
    tryPrompt: 'Find and press a C.',
    targets: [60],
    mode: 'one',
    okMsg: 'Good \u2014 that\u2019s C, just left of the two black keys.',
    hint: 'C is the white key immediately left of a group of two black keys.',
  },
  {
    eyebrow: 'Your home note',
    title: 'Middle C',
    explain: [
      'Middle C is one special C, near the centre of the piano.',
      'It is a landmark for reading music \u2014 we will return to it often.',
    ],
    show: { kind: 'keys', midis: [60], caption: 'Middle C \u2014 near the centre.' },
    demo: [60], demoGap: 0.45,
    tryPrompt: 'Press Middle C.',
    targets: [60],
    exact: true,
    mode: 'one',
    okMsg: 'Yes \u2014 that\u2019s Middle C (C4).',
    hint: 'Middle C is the highlighted key, near the centre of the keyboard.',
  },
  {
    eyebrow: 'The note B',
    title: 'B below Middle C',
    explain: [
      'Step one white key to the left of Middle C. That note is B \u2014 the B below Middle C.',
      'Later, this B will be the starting note of our B major scale.',
    ],
    show: { kind: 'keys', midis: [59, 60], caption: 'B sits immediately left of Middle C.' },
    demo: [59], demoGap: 0.45,
    tryPrompt: 'Press the B just below Middle C.',
    targets: [59],
    exact: true,
    mode: 'one',
    okMsg: 'That\u2019s right \u2014 that\u2019s B, just below Middle C.',
    hint: 'B is the white key immediately to the left of Middle C \u2014 the highlighted key.',
  },
  {
    eyebrow: 'Raising a note',
    title: 'What is a sharp?',
    explain: [
      'A sharp (\u266F) raises a note to the very next key up \u2014 usually a black key.',
      'C raised by a sharp becomes C\u266F.',
    ],
    show: { kind: 'keys', midis: [60, 61], caption: 'C \u2192 C\u266F' },
    demo: [60, 61], demoGap: 0.5,
    tryPrompt: 'Press C\u266F \u2014 the black key just above C.',
    targets: [61],
    mode: 'one',
    okMsg: 'Correct \u2014 that\u2019s C\u266F, the black key just above C.',
    hint: 'C\u266F is the black key immediately to the right of C.',
  },
  {
    eyebrow: 'Lowering a note',
    title: 'What is a flat?',
    explain: [
      'A flat (\u266D) lowers a note to the very next key down.',
      'D lowered by a flat becomes D\u266D \u2014 the same black key as C\u266F.',
    ],
    show: { kind: 'keys', midis: [62, 61], caption: 'D \u2192 D\u266D' },
    demo: [62, 61], demoGap: 0.5,
    tryPrompt: 'Press D\u266D \u2014 the black key just below D.',
    targets: [61],
    mode: 'one',
    okMsg: 'Correct \u2014 that\u2019s D\u266D, the same black key as C\u266F.',
    hint: 'D\u266D is the black key immediately to the left of D.',
  },
  {
    eyebrow: 'Notes in order',
    title: 'What is a scale?',
    explain: [
      'A scale is a ladder of notes climbing in order, from one note up to the same note higher.',
      'Here is C major: the white keys, C up to C.',
    ],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67, 69, 71, 72], caption: 'C major, step by step.' },
    demo: [60, 62, 64, 65, 67, 69, 71, 72], demoGap: 0.26,
    tryPrompt: 'Climb the first three steps: C, then D, then E.',
    targets: [60, 62, 64],
    mode: 'sequence',
    okMsg: 'That\u2019s the first three steps of C major \u2014 C, D, E.',
    hint: 'Climb in order on the white keys: C, then D, then E.',
  },
  {
    eyebrow: 'A symbol that saves repetition',
    title: 'What is a key signature?',
    explain: [
      'Some music sharpens the same notes again and again.',
      'A key signature states those sharps once, at the start, so every matching note is sharp without repeating the symbol.',
    ],
    show: { kind: 'sharps', midis: B_MAJOR_SHARPS, caption: 'Five sharps \u2014 the fingerprint of B major.' },
    demo: [61, 63, 66, 68, 70], demoGap: 0.3,
    mode: 'none',
  },
  {
    eyebrow: 'Our starting key',
    title: 'Why B major?',
    explain: [
      'KeyMaster PRO begins with B major on purpose.',
      'Its shape fits the hand: the longer fingers fall on the raised black keys, giving a secure, repeatable anchor.',
    ],
    show: { kind: 'keys', midis: [59, 61, 63, 64, 66, 68, 70, 71], caption: 'B major sits naturally under the hand.' },
    demo: [59, 61, 63, 64, 66, 68, 70, 71], demoGap: 0.26,
    mode: 'none',
  },
  {
    eyebrow: 'Time',
    title: 'What is rhythm?',
    explain: [
      'Rhythm is timing \u2014 how long each note lasts and when it falls.',
      'A steady beat underneath holds everything together.',
    ],
    show: { kind: 'pulse', caption: 'Feel a steady count of four.' },
    tryPrompt: 'Tap any key four times, evenly with the pulse.',
    mode: 'count',
    count: 4,
    okMsg: 'Good \u2014 four steady taps. That steady beat is your pulse.',
  },
  {
    eyebrow: 'Notes together',
    title: 'What is a chord?',
    explain: [
      'A chord is several notes sounded together, blending into one richer sound.',
      'Three notes \u2014 C, E and G \u2014 make a C major chord.',
    ],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'C + E + G = C major.' },
    demo: [60, 64, 67], demoGap: 0.08,
    tryPrompt: 'Press C, E and G together.',
    targets: [60, 64, 67],
    mode: 'set',
    okMsg: 'That\u2019s a C major chord \u2014 C, E and G together.',
    hint: 'Press the three highlighted keys together: C, E and G.',
  },
];

export default function createView(ctx) {
  const { mount, keyboard, viewport, input, synth } = ctx;

  // Master Training / Learn mode is enabled purely by the route id; /foundations
  // stays in plain mode with every learn-only branch below skipped.
  const learnMode = ctx.route === 'learn';
  const progress = (learnMode && ctx.progress) ? ctx.progress : null;
  const voice = learnMode
    ? createTutorVoice({ rate: 0.9, pitch: 0.96, volume: 0.7, lang: 'en-GB', preferFemale: true })
    : null;
  // Premium-voice-first layer: plays a licensed audio file per stable line ID when one
  // exists, else falls back to the browser TTS prototype above. No assets bundled yet.
  // Browser SpeechSynthesis is an emergency/DEV fallback only — OFF by default so it
  // can never speak under Jack. Flip to true only for development without a voice pack.
  const TTS_DEV_FALLBACK = false;
  const audio = learnMode ? createTutorAudio({ voice, lang: 'en-GB', ttsFallback: TTS_DEV_FALLBACK }) : null;
  // Recorded-human voice pilot (route A). Maps the Course's stable opening line IDs
  // to local audio files under voice/en-GB/. The architecture (premium file -> TTS
  // -> captions) already lives in tutorAudio.js; this only supplies the manifest.
  // GATED OFF until the real recordings exist, so behaviour is unchanged today: with
  // no pack active, voice-on falls back to TTS and voice-off shows captions. Flip
  // PREMIUM_VOICE_READY to true once the files in VOICE_SCRIPT.md are recorded and
  // dropped into voice/en-GB/. (Full script + delivery brief: VOICE_SCRIPT.md.)
  const PREMIUM_VOICE_READY = true;
  // Full code-matched voice pack (every spoken line ID -> local MP3), imported from
  // voicePackData.js — generated from the course script so IDs always match.
  if (audio && PREMIUM_VOICE_READY) audio.setPack(VOICE_PACK, 'en-GB');
  // Visual teaching cues (brackets / pointer / labels), measured from real key geometry.
  const overlay = learnMode ? createLearnOverlay(keyboard) : null;
  // Master Training uses its own curriculum; Foundations keeps the original cards.
  const steps = learnMode ? LEARN_STEPS : CARDS;
  let voiceOn = PREMIUM_VOICE_READY;   // Jack is the product voice: ON by default when the pack exists
  let greeted = false;            // speak the greeting at most once per session
  let suppressSpeakOnce = false;  // first render after greeting must not cut it off
  let pendingGreeting = null;     // greeting+intro awaiting the first user gesture (mobile autoplay)
  let stepAttempts = 0;           // learn: interactions on the current step (gentle progression gate)
  let wrongCount = 0;             // learn: wrong attempts on the current step (graduated re-teach)
  let gateTimer = null;           // learn: failsafe so the learner is never trapped

  injectStyles();

  let index = 0;
  let unsub = null;          // input subscription
  let pulseTimer = null;     // rhythm-card animation
  let tryState = null;       // per-card progress for the Try interaction

  // ---- Lesson-control state (learn): the learner must always know whether THEY
  // are being waited on, or whether the app is about to move on. -----------------
  let paused = false;        // lesson paused by the learner (overlay shown)
  let pauseOverlay = null;   // the calm "Lesson paused" overlay (built in learn mode)
  let contState = 'ready';   // 'wait' | 'ready' | 'auto' — Continue button meaning
  let autoCountTimer = null; // visible "Continuing in 3…" countdown interval

  // ---- Demonstration audio (Course-only warm voice; synth.js untouched) -----
  // The tutor's note demonstrations and the pulse metronome use courseVoice,
  // which reuses the shared AudioContext (synth.ctx) — a warmer, clearer, less
  // "plinky" tone than the borrowed 'demo' voice, with NO change to synth.js
  // (the protected Scales audio). The learner's own key-press tone is unchanged.
  const courseVoice = createCourseVoice((synth && synth.ctx) ? synth.ctx : null, { volume: 0.85 });
  const demoVoices = [];     // teaching-audio Voice instances we own
  const demoSweepTimers = []; // visual highlight-sweep timers (animated guidance)
  let demoToken = 0;         // cancels a pending demo when the card changes
  let demoTimer = null;
  let autoAdvTimer = null;   // learn: auto-advance after a simple completed task
  let seqTimer = null;       // learn: drives the speak -> pause -> demo -> pause chain

  // Teaching-rhythm pacing (learn). The tutor and keyboard take turns; nothing
  // overlaps and the tutor is never cut off. Calm, human, not sluggish.
  const PAUSE_AFTER_SPEECH  = 600;   // voice on: tutor finishes -> keyboard demonstrates
  const PAUSE_AFTER_DEMO    = 900;   // demonstration ends -> learner plays / bridge advances
  const PAUSE_AFTER_SUCCESS = 1800;  // voice on: confirmation finishes -> next step (calm beat)

  // Captions-first reading time for a line — used to pace the lesson when the
  // voice is off (the default), so the learner has time to read before the demo
  // and to read the confirmation before the Course moves on.
  function readTimeMs(text) {
    const n = (typeof text === 'string') ? text.length : 0;
    return Math.max(2000, Math.min(7000, n * 48 + 900));
  }
  function instructionText(c) {
    if (!c) return '';
    if (Array.isArray(c.say) && c.say.length) return c.say.map((b) => b.text || '').join(' ');
    return Array.isArray(c.explain) ? c.explain.join(' ') : '';
  }
  // Gap between the spoken/read instruction and the demonstration.
  function gapBeforeDemo(c) {
    return (voice && voiceOn) ? PAUSE_AFTER_SPEECH : readTimeMs(instructionText(c));
  }

  // Rough duration of a card's demonstration, so the chain can wait it out.
  function demoDurationMs(c) {
    if (!c || !Array.isArray(c.demo) || !c.demo.length) return 0;
    const gap = c.demoGap ?? 0.4;
    const tail = (gap <= 0.12) ? 1.10 : Math.max(0.42, gap * 1.05);
    return Math.round((c.demo.length * gap + tail) * 1000);
  }
  // GENEROUS upper bound on spoken-instruction time — only a failsafe so a dropped
  // end-event can never stall the lesson. Deliberately long so it NEVER pre-empts
  // real speech (which would make the demo play over the voice).
  function speechBudgetMs(c) {
    if (!c) return 8000;
    const base = Array.isArray(c.say) && c.say.length
      ? c.say.reduce((t, b) => t + ((b.text || '').length * 130) + (b.pauseAfter || 360), 0)
      : (instructionText(c).length + (c.tryPrompt || '').length) * 130;
    return Math.min(60000, base + 6000);
  }
  function audioReady() { return !!(synth && synth.ctx && synth.ctx.state === 'running'); }
  function playDemoVoice(midi, vel, durSec, atSec) {
    if (!audioReady()) return;
    const t = atSec ?? synth.ctx.currentTime;
    // Course-only warm voice (synth.js untouched). Same shared AudioContext.
    const v = courseVoice.note(midi, { when: t, dur: durSec, velocity: vel });
    if (v) { demoVoices.push(v); try { v.release(t + durSec); } catch (_) { /* no-op */ } }
  }
  function stopDemoAudio() {
    try { courseVoice?.cancelAll?.(); } catch (_) { /* no-op */ }   // hard-stop sampled notes
    if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
    if (demoSweepTimers.length) { for (const t of demoSweepTimers.splice(0)) clearTimeout(t); }
    try { keyboard?.clearHighlight?.('demo'); } catch (_) { /* no-op */ }
    if (!demoVoices.length) return;
    const now = synth && synth.ctx ? synth.ctx.currentTime : 0;
    for (const v of demoVoices.splice(0)) { try { v.release(now); } catch (_) { /* no-op */ } }
  }
  // Sound the current card's example: single notes ring; a tight gap rolls a chord.
  function demoCard(c) {
    if (!c || !Array.isArray(c.demo) || !c.demo.length || !audioReady()) return;
    stopDemoAudio();
    const gap = c.demoGap ?? 0.4;
    const isChord = gap <= 0.12;
    const vel = isChord ? 50 : 58;
    // Sequence notes must clear before the next starts (no overlap-summing);
    // chords are meant to ring together.
    const dur = isChord ? 1.10 : Math.min(0.55, Math.max(0.20, gap * 0.9));
    const t0 = synth.ctx.currentTime + 0.02;
    c.demo.forEach((m, i) => playDemoVoice(m, vel, dur, t0 + i * gap));
    sweepDemoVisual(c.demo, gap, isChord, dur);   // light each key as the tutor plays it
  }

  // Original animated on-keyboard guidance: the keyboard lights each note as the
  // tutor demonstrates it (the same idea Scales uses for its "Listen" sweep).
  // Visual only — uses the existing keyboard highlight API with an 'hl-demo'
  // variant styled in theme.css, so keyboard.css and the audio path are untouched.
  function sweepDemoVisual(midis, gap, isChord, durSec) {
    const clearAll = () => { try { keyboard?.clearHighlight?.('demo'); } catch (_) { /* no-op */ } };
    if (isChord) {
      demoSweepTimers.push(setTimeout(() => { try { keyboard?.highlight?.(midis, 'demo'); } catch (_) { /* no-op */ } }, 0));
      demoSweepTimers.push(setTimeout(clearAll, Math.round(durSec * 1000) + 140));
    } else {
      midis.forEach((m, i) => {
        demoSweepTimers.push(setTimeout(() => {
          clearAll();
          try { keyboard?.highlight?.([m], 'demo'); } catch (_) { /* no-op */ }
        }, Math.round(i * gap * 1000)));
      });
      demoSweepTimers.push(setTimeout(clearAll, Math.round((midis.length * gap + durSec) * 1000)));
    }
  }

  // ---- DOM scaffold (built once) -------------------------------------------
  const root = el('div', { class: 'mf' });

  const head = el('div', { class: 'mf__head' });
  const eyebrow = el('p', { class: 'mf__eyebrow' });
  const stepLine = el('p', { class: 'mf__step' });
  head.append(eyebrow, stepLine);

  const dots = el('div', { class: 'mf__dots', role: 'presentation' });

  const title = el('h2', { class: 'mf__title' });
  const explain = el('div', { class: 'mf__explain' });

  const showCaption = el('p', { class: 'mf__showcap' });
  const keyLabel = el('p', { class: 'mf__keylabel', 'aria-hidden': 'true' });
  const pulse = el('div', { class: 'mf__pulse', 'aria-hidden': 'true' });
  for (let i = 0; i < 4; i++) pulse.appendChild(el('span', { class: 'mf__beat' }));
  const handSlot = el('div', { class: 'mf__hand' });
  handSlot.style.display = 'none';
  const staffSlot = el('div', { class: 'mf__staff' });
  staffSlot.style.display = 'none';
  const sharps = el('p', { class: 'mf__sharps', 'aria-hidden': 'true' });
  const replayBtn = el('button', { class: 'mf__replay mf__btn mf__btn--ghost', type: 'button' });
  replayBtn.textContent = 'Hear it again';
  const mediaEl = el('div', { class: 'mf__media' });
  mediaEl.style.display = 'none';
  const showWrap = el('div', { class: 'mf__show' }, [keyLabel, handSlot, staffSlot, pulse, sharps, mediaEl, showCaption, replayBtn]);

  const tryWrap = el('div', { class: 'mf__try' });
  const tryPrompt = el('p', { class: 'mf__tryprompt' });
  const tryStatus = el('p', { class: 'mf__trystatus', 'aria-live': 'polite' });
  tryWrap.append(tryPrompt, tryStatus);

  const footer = el('div', { class: 'mf__footer' });
  const backBtn = el('button', { class: 'mf__btn mf__btn--ghost', type: 'button' });
  backBtn.textContent = 'Back';
  const contBtn = el('button', { class: 'mf__btn mf__btn--primary', type: 'button' });
  const stayBtn = el('button', { class: 'mf__btn mf__btn--ghost mf__stay', type: 'button' });
  stayBtn.textContent = 'Stay here';
  stayBtn.style.display = 'none';
  stayBtn.addEventListener('click', () => { clearAutoCount(); setContinue('ready'); });
  footer.append(backBtn, contBtn, stayBtn);

  const card = el('div', { class: 'mf__card' }, [title, explain, showWrap, tryWrap]);
  root.append(head, dots, card, footer);
  mount.replaceChildren(root);

  // ---- Learn-mode UI (greeting, voice toggle, reset, bridge) — built only in
  // Master Training; plain Foundations never creates these. --------------------
  let greetingEl = null, voiceBtn = null, bridgeBtn = null, statusEl = null, startBtn = null;
  if (learnMode) {
    greetingEl = el('p', { class: 'mf__greeting', 'aria-live': 'polite' });
    startBtn = el('button', { class: 'mf__btn mf__btn--primary mf__learnbtn mf__startvoice', type: 'button' });
    startBtn.textContent = 'Start tutor voice';
    startBtn.style.display = 'none';
    voiceBtn = el('button', { class: 'mf__btn mf__btn--ghost mf__learnbtn', type: 'button' });
    const pauseBtn = el('button', { class: 'mf__btn mf__btn--pause', type: 'button' });
    pauseBtn.textContent = '\u275A\u275A  Pause lesson';
    const repeatBtn = el('button', { class: 'mf__btn mf__btn--ghost mf__learnbtn', type: 'button' });
    repeatBtn.textContent = 'Repeat';
    const resetBtn = el('button', { class: 'mf__btn mf__btn--ghost mf__learnbtn', type: 'button' });
    resetBtn.textContent = 'Reset progress';
    const ctrls = el('div', { class: 'mf__learnctrls' }, [startBtn, voiceBtn, pauseBtn, repeatBtn, resetBtn]);
    statusEl = el('p', { class: 'mf__voicestatus', 'aria-live': 'polite' });
    root.insertBefore(greetingEl, head);
    root.insertBefore(ctrls, dots);
    root.insertBefore(statusEl, dots);
    bridgeBtn = el('button', { class: 'mf__bridgelink', type: 'button' });
    bridgeBtn.style.display = 'none';
    card.appendChild(bridgeBtn);

    // Calm pause overlay — covers the lesson card; footer is frozen while shown.
    pauseOverlay = el('div', { class: 'mf__pause' });
    pauseOverlay.style.display = 'none';
    const pTitle = el('p', { class: 'mf__pause-title' }); pTitle.textContent = 'Lesson paused';
    const pText = el('p', { class: 'mf__pause-text' });
    pText.textContent = 'Take your time. Resume when you\u2019re ready.';
    const resumeBtn = el('button', { class: 'mf__btn mf__btn--primary is-ready', type: 'button' });
    resumeBtn.textContent = 'Resume lesson';
    const homeBtn = el('button', { class: 'mf__btn mf__btn--ghost', type: 'button' });
    homeBtn.textContent = 'Back to Course home';
    pauseOverlay.append(pTitle, pText, el('div', { class: 'mf__pause-row' }, [resumeBtn, homeBtn]));
    card.appendChild(pauseOverlay);
    resumeBtn.addEventListener('click', () => { voice?.unlock?.(); resumeLesson(); });
    homeBtn.addEventListener('click', () => { paused = false; goHome(); });

    startBtn.addEventListener('click', () => { voice?.unlock?.(); speakPending(); });
    voiceBtn.addEventListener('click', () => { voice?.unlock?.(); setVoice(!voiceOn); speakPending(); });
    pauseBtn.addEventListener('click', () => { pauseLesson(); });
    repeatBtn.addEventListener('click', () => {
      voice?.unlock?.();
      clearAutoCount();                                 // stop any "Continuing in…" countdown
      demoToken += 1;                                   // cancel any pending sequence
      if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
      if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
      audio?.cancel?.();
      runLearnSequence(steps[index], false);            // speak, then demonstrate — never both at once
    });
    resetBtn.addEventListener('click', onReset);
    if (typeof window !== 'undefined') window.addEventListener('resize', () => overlay?.reflow?.());
    bridgeBtn.addEventListener('click', () => {
      voice?.unlock?.();
      const b = steps[index]?.bridge;
      if (b) { audio?.cancel?.(); try { window.location.hash = b.hash; } catch (_) { /* no-op */ } }
    });
  }

  // Progress dots
  steps.forEach((_, i) => {
    const d = el('span', { class: 'mf__dot' });
    d.dataset.i = String(i);
    dots.appendChild(d);
  });

  backBtn.addEventListener('click', () => { voice?.unlock?.(); goBack(); });
  // Back stays INSIDE the Course (previous step). Only the very first step's Back
  // is an explicit exit (clearly labelled "Exit Course"). The chrome Back is wired
  // to this same handler in render(), so neither one ejects the learner mid-Course.
  function goBack() {
    audio?.cancel?.();
    if (autoAdvTimer) { clearTimeout(autoAdvTimer); autoAdvTimer = null; }
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
    if (index === 0) { goHome(); return; }
    index -= 1; render();
  }
  function advanceStep() {
    if (autoAdvTimer) { clearTimeout(autoAdvTimer); autoAdvTimer = null; }
    if (learnMode && progress && steps[index]) {
      progress.addToSet('foundationsCompleted', steps[index].title);
      progress.addToSet('learnCompleted', steps[index].title);
      if (steps[index].progressKey) progress.addToSet('courseConcepts', steps[index].progressKey);
    }
    if (index >= steps.length - 1) { goHome(); return; }
    index += 1; render();
  }
  contBtn.addEventListener('click', () => {
    voice?.unlock?.();
    if (paused) return;                           // frozen while the pause overlay is up
    speakPending();                               // tutor arrives on the first primary tap
    if (learnMode && contBtn.disabled) return;   // proficiency gate (learn only)
    clearAutoCount();                             // if mid-countdown, continue now
    advanceStep();
  });
  replayBtn.addEventListener('click', () => { voice?.unlock?.(); demoCard(steps[index]); });

  function goHome() { try { window.location.hash = '#/'; } catch { /* no-op */ } }

  // Has every step in a given chapter been completed? Used to acknowledge a
  // chapter as a real milestone when the next one opens (journey, not gamification).
  function chapterComplete(chIdx) {
    if (!progress || chIdx < 1 || chIdx > COURSE_CHAPTERS.length) return false;
    return COURSE_CHAPTERS[chIdx - 1].ids.every((id) => {
      const st = steps.find((s) => s.id === id);
      return st ? progress.has('foundationsCompleted', st.title) : true;
    });
  }

  // ---- Learn-mode helpers (unused in plain mode) ----------------------------
  function setVoice(on) {
    voiceOn = !!on;
    voice?.setEnabled?.(voiceOn);
    if (voiceBtn) {
      voiceBtn.textContent = voiceOn ? 'Voice: on' : 'Voice: off';
      voiceBtn.setAttribute('aria-pressed', voiceOn ? 'true' : 'false');
      voiceBtn.classList.toggle('is-voice-on', voiceOn);
      voiceBtn.classList.toggle('is-voice-off', !voiceOn);
    }
    if (progress) progress.set('voiceOn', voiceOn);
    updateVoiceStatus();
  }
  // Visible voice diagnostic — the tutor must never fail silently.
  function updateVoiceStatus() {
    if (!statusEl) return;
    let msg, showStart = false;
    if (!voice || !voice.available?.()) {
      msg = 'Tutor voice unavailable on this device \u2014 captions only.';
    } else if (!voiceOn) {
      msg = 'Tutor voice muted \u2014 captions only.';
    } else if (!voice.isUnlocked?.()) {
      msg = 'Captions are on. The tutor begins speaking the moment you play or continue.';
      showStart = false;
    } else {
      msg = PREMIUM_VOICE_READY ? 'Tutor voice on. Captions on.' : 'Tutor voice ready \u2014 device prototype (premium voice coming).';
    }
    statusEl.textContent = msg;
    if (startBtn) startBtn.style.display = showStart ? '' : 'none';
  }
  // Speak the queued greeting+intro — MUST be triggered from inside a user gesture
  // (button tap / key press) so mobile autoplay rules allow the first utterance.
  function speakPending() {
    if (!pendingGreeting) { updateVoiceStatus(); return; }
    if (voice && voiceOn) {
      // Premium name-greeting: pick the recorded segment for this time of day
      // (and whether the learner is resuming). Falls back to TTS if absent.
      const gh = new Date().getHours();
      const tod = (gh >= 5 && gh < 12) ? 'morning' : (gh >= 12 && gh < 18) ? 'afternoon' : 'evening';
      const resuming = !!(progress && (((progress.get('learnLesson') || 0) > 0)
        || (Array.isArray(progress.get('learnCompleted')) && progress.get('learnCompleted').length > 0)));
      // If the time-of-day greeting MP3 isn't present yet, fall through to the
      // welcome card's own generated beats so Jack still greets the learner.
      audio.say((resuming ? 'greeting.back.' : 'greeting.') + tod, pendingGreeting,
        { onError: () => { const c0 = steps[index]; if (c0) speakCard(c0); } });
      const c0 = steps[index];
      if (progress && c0) progress.addToSet('heardNarration', `narr:${c0.title}`);
      pendingGreeting = null;
      greeted = true;
    }
    updateVoiceStatus();
  }
  function onReset() {
    const okToReset = (typeof window !== 'undefined' && typeof window.confirm === 'function')
      ? window.confirm('Reset your learning progress on this device? This clears saved lessons and the voice preference.')
      : true;
    if (!okToReset) return;
    audio?.cancel?.();
    if (progress) progress.reset();
    index = 0;
    greeted = false;
    setVoice(false);
    render();
  }
  function speakCard(c, onDone) {
    let fired = false;
    const done = () => { if (fired) return; fired = true; if (typeof onDone === 'function') onDone(); };
    if (!voice || !voiceOn || !c) { done(); return; }
    // Failsafe: never let a dropped end-event stall the lesson.
    const fs = setTimeout(done, speechBudgetMs(c));
    const wrapped = () => { clearTimeout(fs); done(); };
    if (Array.isArray(c.say) && c.say.length) {
      audio.sayBeats(`${c.id}.say`, c.say, { onDone: wrapped });   // performed as short, paced beats
    } else {
      const parts = [];
      if (Array.isArray(c.explain) && c.explain[0]) parts.push(c.explain[0]);
      if (c.mode && c.mode !== 'none' && c.tryPrompt) parts.push(c.tryPrompt);
      const text = parts.join(' ');
      if (text) audio.say(`${c.id}.explain`, text, { onDone: wrapped });
      else wrapped();
    }
    if (progress) progress.addToSet('heardNarration', `narr:${c.title}`);
  }

  // The teaching rhythm: tutor speaks -> pause -> keyboard demonstrates -> pause.
  // Nothing overlaps; the demo waits for the voice; reflective 'come next' bridge
  // steps then advance along the main Course path. Cancels cleanly if the card
  // changes (demoToken, bumped by render()).
  function runLearnSequence(c, skipSpeech) {
    const seqToken = demoToken;
    const alive = () => seqToken === demoToken;
    const interactive = !!(c.mode && c.mode !== 'none' && !c.autoNext);
    // Captions-first turn-taking: with the voice off (the default) the learner
    // still needs to know whose turn it is. (When voice is on, the spoken line
    // carries this, so we stay quiet.) Writes only to the aria-live status line,
    // so screen-reader users hear the hand-off too.
    const cue = (text) => {
      if (!alive() || !interactive || (voice && voiceOn)) return;
      if (!tryState || tryState.done) return;
      tryStatus.textContent = text;
      tryStatus.classList.remove('is-wrong', 'is-done');
    };
    const afterDemo = () => {
      if (!alive()) return;
      cue('Your turn.');
      setPhase(interactive ? 'try' : '');
      if (c.autoNext) {   // reflective bridge: move along the main path after a calm pause
        if (autoAdvTimer) clearTimeout(autoAdvTimer);
        autoAdvTimer = setTimeout(() => { if (alive()) advanceStep(); }, PAUSE_AFTER_DEMO + 400);
      }
    };
    const doDemo = () => {
      if (!alive()) return;
      setPhase('watch');
      if (c.show && c.show.kind === 'hand' && Array.isArray(c.show.sweep) && c.show.sweep.length) {
        cue('\u266A  Watch \u2014 the fingers light in order.');
        runHandSequence(c.show.sweep, () => { if (alive()) afterDemo(); });
        return;
      }
      if (c.show && c.show.kind === 'pulse') {   // rhythm: listen-first count-in, then play
        cue('\u266A  Listen first \u2014 count: 1, 2, 3, 4.');
        runCountIn(c, () => { if (alive()) cue('Now you try \u2014 play a note on each beat.'); });
        return;
      }
      if (c.demo && c.demo.length) {
        cue('\u266A  Listen \u2014 watch the keyboard.');
        demoCard(c);
        seqTimer = setTimeout(afterDemo, demoDurationMs(c) + PAUSE_AFTER_DEMO);
      } else {
        afterDemo();
      }
    };
    const afterSpeech = () => { if (alive()) seqTimer = setTimeout(doDemo, gapBeforeDemo(c)); };
    if (skipSpeech) afterSpeech();
    else speakCard(c, afterSpeech);
  }

  // ---- Lesson-control state machine (learn only) ---------------------------
  // Three Continue states the learner can always read:
  //   wait  — they must do the step first (button muted, says why)
  //   ready — the app is waiting for THEM to choose to move on (green Continue)
  //   auto  — the app will move on by itself, shown as a visible countdown they
  //           can interrupt (Stay here / Repeat / Pause).
  function setContinue(state, reason) {
    contState = state;
    contBtn.classList.remove('is-gated', 'is-ready', 'is-auto');
    if (state === 'wait') {
      contBtn.disabled = true;
      contBtn.classList.add('is-gated');
      contBtn.textContent = reason || 'Complete the step to continue';
      if (stayBtn) stayBtn.style.display = 'none';
    } else if (state === 'auto') {
      contBtn.disabled = false;
      contBtn.classList.add('is-ready', 'is-auto');     // text set by the countdown
      if (stayBtn) stayBtn.style.display = '';
    } else { // ready
      contBtn.disabled = false;
      contBtn.classList.add('is-ready');
      contBtn.textContent = (index >= steps.length - 1) ? 'Finish' : 'Continue';
      if (stayBtn) stayBtn.style.display = 'none';
    }
  }
  // The reason a step is holding Continue — written plainly for the learner.
  function gateReason(c) {
    if (countInActive) return 'Listen first\u2026';
    if (!c) return 'Complete the step to continue';
    switch (c.mode) {
      case 'count': return 'Play on the beat to continue';
      case 'sequence': return 'Play the pattern to continue';
      case 'set': case 'lowhigh': return 'Play the notes to continue';
      case 'any': case 'one': case 'oneof': return 'Play to continue';
      default: return 'Complete the step to continue';
    }
  }
  function clearAutoCount() { if (autoCountTimer) { clearInterval(autoCountTimer); autoCountTimer = null; } }
  // Visible auto-continue: "Continuing in 3… 2… 1…", interruptible at any time.
  function startAutoCountdown(secs) {
    const c = steps[index];
    if (paused || (c && (c.hold || c.manualNext))) { setContinue('ready'); return; }
    clearAutoCount();
    let n = Math.max(1, secs || 3);
    setContinue('auto');
    contBtn.textContent = `Continuing in ${n}\u2026`;
    autoCountTimer = setInterval(() => {
      if (paused) { clearAutoCount(); setContinue('ready'); return; }
      n -= 1;
      if (n <= 0) { clearAutoCount(); advanceStep(); return; }
      contBtn.textContent = `Continuing in ${n}\u2026`;
    }, 1000);
  }
  function enableContinue() {
    if (gateTimer) { clearTimeout(gateTimer); gateTimer = null; }
    setContinue('ready');
  }
  function gateStep(c) {
    if (gateTimer) { clearTimeout(gateTimer); gateTimer = null; }
    clearAutoCount();
    stepAttempts = 0;
    wrongCount = 0;
    const interactive = !!(c && c.mode && c.mode !== 'none');
    if (!interactive) { setContinue('ready'); return; }   // explanation/reflective: manual Continue
    setContinue('wait', gateReason(c));
    gateTimer = setTimeout(enableContinue, 22000);  // failsafe: input may be unavailable
  }

  // ---- Pause / Resume -------------------------------------------------------
  function pauseLesson() {
    if (paused || !learnMode) return;
    paused = true;
    audio?.cancel?.();                                  // tutor speech
    stopDemoAudio();                                    // demo notes + visual sweep
    stopPulse();                                        // metronome / pulse
    clearCountIn();                                     // any listen-first count
    clearAutoCount();                                   // the "Continuing in…" countdown
    if (autoAdvTimer) { clearTimeout(autoAdvTimer); autoAdvTimer = null; }
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
    if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
    demoToken += 1;                                     // cancel any pending speak→demo chain
    root.classList.add('is-paused');                    // freeze footer + pause CSS animations
    if (pauseOverlay) pauseOverlay.style.display = '';
  }
  function resumeLesson() {
    if (!paused) return;
    paused = false;
    root.classList.remove('is-paused');
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    const c = steps[index];
    if (c && c.mode === 'count' && tryState && !tryState.done) {
      // a pulse exercise: restart cleanly with a fresh count-in
      tryState.count = 0;
      setContinue('wait', 'Play on the beat to continue');
      runCountIn(c, () => {
        if (!paused && tryState && !tryState.done) {
          tryStatus.textContent = 'Now you try \u2014 play a note on each beat.';
          tryStatus.classList.remove('is-wrong', 'is-done');
        }
      });
    } else if (c && c.mode && c.mode !== 'none') {
      if (tryState && tryState.done) setContinue('ready');
      else setContinue('wait', gateReason(c));
    } else {
      setContinue('ready');                             // explanation step: ready to continue
    }
  }


  // ---- Per-card render ------------------------------------------------------
  // Video-ready slot (rc2-63): an honest premium placeholder until real, licensed
  // teaching assets ship. No fake or uncanny video — just a clean architecture.
  function buildMediaSlot(media) {
    const wrap = el('div', { class: 'mf__media-inner' });
    const icon = el('span', { class: 'mf__media-icon', 'aria-hidden': 'true' });
    icon.textContent = media.kind === 'video' ? '\u25B6' : '\u25A6';
    const cap = el('p', { class: 'mf__media-cap' });
    cap.textContent = media.caption || 'Guided demonstration';
    const sub = el('p', { class: 'mf__media-sub' });
    sub.textContent = media.kind === 'video' ? 'Video teaching' : 'Notation view';
    wrap.append(icon, cap, sub);
    return wrap;
  }
  function render() {
    const c = steps[index];
    stopPulse();
    clearCountIn();
    stopDemoAudio();
    clearAutoCount();                                 // no countdown carries across steps
    paused = false;                                   // a freshly rendered step is never paused
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    root.classList.remove('is-paused');
    if (stayBtn) stayBtn.style.display = 'none';
    if (autoAdvTimer) { clearTimeout(autoAdvTimer); autoAdvTimer = null; }
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
    demoToken += 1;
    stopDemoAudio();                                  // stop any in-flight demo + its visual sweep
    keyboard?.clearHighlight?.('target');
    keyboard?.clearHighlight?.('demo');
    overlay?.clear?.();

    const ch = learnMode ? chapterFor(c.id) : null;
    if (ch) {
      // Journey framing: chapter + position. The title carries the specific step.
      eyebrow.textContent = `Ch ${ch.chIdx} \u00B7 ${ch.name}`;
      stepLine.textContent = `${ch.pos} of ${ch.len}`;
    } else {
      eyebrow.textContent = c.eyebrow;
      stepLine.textContent = `${learnMode ? 'Lesson' : 'Step'} ${index + 1} of ${steps.length}`;
    }
    title.textContent = c.title;
    // Chapter openings: acknowledge the previous chapter as a real milestone, then
    // frame the new one — so the Course feels like a guided journey with progress,
    // without any points/badges gamification.
    const lead = [];
    if (ch && ch.pos === 1) {
      if (ch.chIdx > 1 && chapterComplete(ch.chIdx - 1)) {
        lead.push(`\u2713 ${COURSE_CHAPTERS[ch.chIdx - 2].name} complete.`);
      }
      if (ch.intro) lead.push(ch.intro);
    }
    const explainLines = lead.length ? [...lead, ...c.explain] : c.explain;
    explain.replaceChildren(...explainLines.map((line) => {
      const p = el('p'); p.textContent = speakable(line); return p;
    }));

    // Progress dots
    [...dots.children].forEach((d, i) => {
      d.classList.toggle('is-done', i < index);
      d.classList.toggle('is-current', i === index);
    });

    // Show
    pulse.style.display = 'none';
    sharps.style.display = 'none';
    sharps.textContent = '';
    clearHandSeq();
    setPhase('');
    handSlot.style.display = 'none';
    handSlot.replaceChildren();
    staffSlot.style.display = 'none';
    staffSlot.replaceChildren();
    const s = c.show || {};
    showCaption.textContent = s.caption || '';
    keyLabel.textContent = s.label || '';
    keyLabel.style.display = s.label ? '' : 'none';
    if (s.kind === 'keys' && Array.isArray(s.midis)) {
      keyboard?.highlight?.(s.midis, 'target');
      viewport?.frame?.(s.midis);
      overlay?.render?.(c.cues || null);
    } else if (s.kind === 'sharps' && Array.isArray(s.midis)) {
      keyboard?.highlight?.(s.midis, 'target');
      viewport?.frame?.(s.midis);
      sharps.textContent = '\u266F \u266F \u266F \u266F \u266F';
      sharps.style.display = '';
    } else if (s.kind === 'pulse') {
      pulse.style.display = '';
      buildPulse((c.mode === 'count' && c.count) ? c.count : 4);
      // Learn mode runs a listen-first count-in (see runLearnSequence); plain
      // Foundations has no tutor turn-taking, so the pulse animates right away.
      if (!learnMode) startPulse();
    } else if (s.kind === 'hand') {
      // Pure hand-teaching step: the diagram IS the visual.
      keyLabel.style.display = 'none';
      renderHand(s);
    } else if (s.kind === 'staff') {
      keyLabel.style.display = 'none';
      renderStaff(s);
    }
    // A playable step can also carry a finger-number hand hint alongside its keys.
    if (s.kind !== 'hand' && c.handHint) renderHand(c.handHint);
    // …and a staff hint (e.g. "this note on the staff is the key you'll play").
    if (s.kind !== 'staff' && c.staffHint) renderStaff(c.staffHint);

    // Video-ready media slot (rc2-63): honest placeholder; hidden unless the step opts in.
    // Only show the media panel once a REAL asset (src) exists — no "coming
    // soon" placeholder is ever shown to the learner (video package is deferred).
    if (c.media && c.media.src) { mediaEl.replaceChildren(buildMediaSlot(c.media)); mediaEl.style.display = ''; }
    else { mediaEl.replaceChildren(); mediaEl.style.display = 'none'; }

    // Demonstration sound. In plain Foundations there's no tutor voice, so the
    // demo plays shortly after the card appears. In learn mode the demo is driven
    // by the teaching sequence below (after the tutor finishes), so it never
    // overlaps the voice.
    replayBtn.style.display = (c.demo && c.demo.length) ? '' : 'none';
    if (!learnMode && c.demo && c.demo.length) {
      const myToken = demoToken;
      demoTimer = setTimeout(() => { if (myToken === demoToken) demoCard(c); }, 340);
    }

    // Try
    tryState = { pressed: new Set(), seqPos: 0, count: 0, done: false };
    if (c.mode && c.mode !== 'none') {
      tryWrap.style.display = '';
      tryPrompt.textContent = speakable(c.tryPrompt || '');
      tryStatus.textContent = '';
      tryStatus.classList.remove('is-done', 'is-wrong');
    } else {
      tryWrap.style.display = 'none';
    }

    // Footer
    backBtn.textContent = index === 0 ? 'Exit Course' : 'Back';
    contBtn.textContent = index >= steps.length - 1 ? 'Finish' : 'Continue';

    // ---- Learn-mode: gate, bridge, memory, narration, self-centering ----------
    if (learnMode) {
      gateStep(c);
      const bridge = c.bridge;
      if (bridgeBtn) {
        if (bridge) { bridgeBtn.textContent = bridge.label; bridgeBtn.style.display = ''; }
        else { bridgeBtn.style.display = 'none'; }
      }
      if (progress) progress.set('learnLesson', index);
      // Own the chrome Back too: it now steps back through the Course instead of
      // ejecting to the dashboard. (Exit/Home remain available via the chrome.)
      try { ctx.nav?.set?.([{ label: 'Master Training', go: goBack }, { label: ch ? ch.name : `Lesson ${index + 1}` }]); } catch (_) { /* nav is non-critical */ }
      // Teaching rhythm: tutor speaks, then (after a pause) the keyboard
      // demonstrates. Step 0's speech is covered by the greeting, so we skip
      // straight to the demonstration there.
      const skipSpeech = suppressSpeakOnce;
      if (suppressSpeakOnce) suppressSpeakOnce = false;
      runLearnSequence(c, skipSpeech);
      // Gently bring the active teaching area into view (device-tuned; never jumps if visible).
      try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) { /* no-op */ }
    }
  }

  // ---- Try detection — accurate, teaching feedback --------------------------
  function onNote(ev) {
    if (paused) return;                            // lesson is paused — ignore presses
    if (learnMode) { voice?.unlock?.(); speakPending(); }
    const c = steps[index];
    if (!c || !c.mode || c.mode === 'none' || !tryState || tryState.done) return;
    stopDemoAudio();   // the learner is playing now — never let the demo ring under their input/feedback
    if (learnMode) { stepAttempts += 1; if (stepAttempts >= 3) enableContinue(); }
    const midi = ev.midiNote;
    const pc = pcOf(midi);
    const name = NOTE_NAMES[pc];
    const targetsPc = (c.targets || []).map(pcOf);

    if (c.mode === 'any') {
      complete(c.okMsg);
    } else if (c.mode === 'lowhigh') {
      // Require BOTH a low and a high note (split at Middle C). One alone is not enough.
      const side = midi < 60 ? 'low' : 'high';
      tryState.pressed.add(side);
      if (tryState.pressed.has('low') && tryState.pressed.has('high')) {
        complete(c.okMsg);
      } else if (side === 'low') {
        neutral('Good \u2014 that\u2019s a low note. Now play a high note, well to the right.');
      } else {
        neutral('Good \u2014 that\u2019s a high note. Now play a low note, well to the left.');
      }
    } else if (c.mode === 'one') {
      const target = c.targets[0];
      const hit = c.exact ? (midi === target) : (pc === pcOf(target));
      if (hit) {
        complete(c.okMsg);
      } else if (c.exact && pc === pcOf(target)) {
        guide('That\u2019s the right note name, but not the one we mean here. Press the highlighted key.');
      } else {
        guide(`That was ${name}. ${c.hint || 'Try the highlighted key.'}`);
      }
    } else if (c.mode === 'oneof') {
      if (targetsPc.includes(pc)) complete(c.okMsg);
      else guide(`That was ${name}. ${c.hint || 'Tap one of the highlighted keys.'}`);
    } else if (c.mode === 'set') {
      if (targetsPc.includes(pc)) {
        tryState.pressed.add(pc);
        if (targetsPc.every((t) => tryState.pressed.has(t))) complete(c.okMsg);
        else neutral(`Good \u2014 ${tryState.pressed.size} of ${targetsPc.length}. Keep them held and add the rest.`);
      } else {
        guide(`That was ${name}, which isn\u2019t in this chord. ${c.hint || ''}`.trim());
      }
    } else if (c.mode === 'sequence') {
      if (pc === targetsPc[tryState.seqPos]) {
        tryState.seqPos += 1;
        if (tryState.seqPos >= targetsPc.length) complete(c.okMsg);
        else neutral('Good \u2014 now the next step.');
      } else {
        tryState.seqPos = 0;
        guide(`That was ${name}. ${c.hint || 'Start again from C.'}`);
      }
    } else if (c.mode === 'count') {
      if (countInActive) return;   // count-in is listen-first; presses don't count yet
      tryState.count += 1;
      const remaining = (c.count || 4) - tryState.count;
      if (remaining > 0) neutral(`${remaining} more\u2026`);
      else complete(c.okMsg);
    }
  }

  function complete(msg) {
    if (!tryState || tryState.done) return;
    tryState.done = true;
    let shown = msg || 'Correct.';
    // Acknowledge a correct answer that came after a stumble (deterministic, not flattery).
    if (learnMode && wrongCount > 0) shown = `That\u2019s clearer. ${shown}`;
    tryStatus.textContent = `\u2713 ${speakable(shown)}`;
    tryStatus.classList.remove('is-wrong');
    tryStatus.classList.add('is-done');
    if (learnMode) {
      enableContinue();
      // Advance only after the confirmation has been fully delivered, then a calm
      // pause — never cut off, never rushed. Captions-led uses reading time.
      const scheduleAdvance = (delay) => {
        if (steps[index] && (steps[index].hold || steps[index].manualNext)) { setContinue('ready'); return; }
        const at = index;
        if (autoAdvTimer) clearTimeout(autoAdvTimer);
        autoAdvTimer = setTimeout(() => {
          if (index === at && tryState && tryState.done && !paused) startAutoCountdown(3);
        }, delay);
      };
      if (voice && voiceOn) {
        const sid = (steps[index] && steps[index].id) ? steps[index].id : `i${index}`;
        audio.say(wrongCount > 0 ? `${sid}.correct-retry` : `${sid}.correct`, shown,
          { onDone: () => scheduleAdvance(PAUSE_AFTER_SUCCESS) });
      } else {
        scheduleAdvance(readTimeMs(shown));   // captions-first: time to read the confirmation
      }
    }
  }
  function guide(msg) {          // calm correction — guides, never punishes
    // Graduated re-teach (learn only): 1st miss = the specific hint; 2nd+ = the step's
    // re-teach line if it has one. Rule-based and legible — no opaque adaptation.
    if (learnMode) {
      wrongCount += 1;
      const c = steps[index];
      if (wrongCount >= 2 && c && c.reteach) msg = c.reteach;
    }
    tryStatus.textContent = speakable(msg);
    tryStatus.classList.remove('is-done');
    tryStatus.classList.add('is-wrong');
    if (learnMode && voice && voiceOn) {
      const c = steps[index];
      const sid = (c && c.id) ? c.id : `i${index}`;
      audio.say((c && msg === c.reteach) ? `${sid}.reteach` : `${sid}.miss`, msg);
    }
  }
  function neutral(msg) {        // progress within an attempt (not yet complete)
    tryStatus.textContent = speakable(msg);
    tryStatus.classList.remove('is-done', 'is-wrong');
  }

  // ---- Rhythm pulse ---------------------------------------------------------
  // ---- Hand / finger diagrams ----------------------------------------------
  // Original SVG hand art (handViz.js). A pure-teaching step uses show.kind
  // 'hand'; a playable step can add a finger-number hint via c.handHint. The
  // "watch this" finger animation lights fingers in order, then hands over.
  let handSeqTimers = [];
  let activeHandEl = null;
  function clearHandSeq() {
    handSeqTimers.forEach((t) => clearTimeout(t));
    handSeqTimers = [];
    activeHandEl = null;
  }
  // watch / try phase — lets the panel visibly shift from "watch this" to "your
  // turn" (styled in theme.css). Set on the card element.
  function setPhase(p) {
    try { if (p) card.dataset.phase = p; else delete card.dataset.phase; } catch (_) { /* no-op */ }
  }
  function renderHand(spec) {
    const hand = (spec && (spec.hand === 'left' || spec.hand === 'both')) ? spec.hand : 'right';
    const highlight = (spec && Array.isArray(spec.highlight)) ? spec.highlight : [];
    const numbers = !(spec && spec.numbers === false);
    activeHandEl = buildHandSvg({ hand, highlight, numbers });
    handSlot.replaceChildren(activeHandEl);
    handSlot.style.display = '';
  }
  function renderStaff(spec) {
    const s = spec || {};
    staffSlot.replaceChildren(buildStaff({
      clef: s.clef || 'treble',
      highlight: s.highlight || null,
      notes: Array.isArray(s.notes) ? s.notes : [],
      middleC: !!s.middleC,
    }));
    staffSlot.style.display = '';
  }
  // Light each finger in turn (e.g. [1,2,3,4,5]) over a calm cadence, then rest.
  // Device-verify: motion + timing only confirmable on a real device.
  function runHandSequence(fingers, onDone) {
    if (!activeHandEl || !Array.isArray(fingers) || !fingers.length) {
      if (typeof onDone === 'function') onDone();
      return;
    }
    const seqToken = demoToken;
    const stepMs = 560;
    fingers.forEach((f, i) => {
      handSeqTimers.push(setTimeout(() => {
        if (seqToken !== demoToken) return;
        setHandHighlight(activeHandEl, [f]);
      }, i * stepMs));
    });
    handSeqTimers.push(setTimeout(() => {
      if (seqToken !== demoToken) return;
      setHandHighlight(activeHandEl, fingers);   // leave them all lit, settled
      if (typeof onDone === 'function') onDone();
    }, fingers.length * stepMs + 200));
  }


  // Beats now carry visible numbers (1 2 3 4), groups of four are separated by a
  // mid-dot (1 2 3 4 · 1 2 3 4), and a "listen-first" count-in runs before the
  // learner plays. The gate still only counts presses — no timing is scored.
  let countInActive = false;     // true during the listen-first count-in
  let countInTimers = [];
  function pulseBeats() { return [...pulse.querySelectorAll('.mf__beat')]; }
  function buildPulse(n) {
    const total = (Number.isInteger(n) && n > 0) ? n : 4;
    pulse.replaceChildren();
    for (let i = 0; i < total; i += 1) {
      if (i > 0 && i % 4 === 0) {
        pulse.appendChild(el('span', { class: 'mf__beatsep', 'aria-hidden': 'true' }, ['\u00B7']));
      }
      const b = el('span', { class: 'mf__beat' });
      b.textContent = String((i % 4) + 1);   // 1 2 3 4 within each group of four
      pulse.appendChild(b);
    }
  }
  function clearCountIn() {
    countInActive = false;
    countInTimers.forEach((t) => clearTimeout(t));
    countInTimers = [];
  }
  function startPulse() {
    const beats = pulseBeats();
    if (!beats.length) return;
    let b = 0;
    const tick = () => {
      if (audioReady()) { try { courseVoice.tick((b % 4) === 0); } catch (_) { /* no-op */ } }
      beats.forEach((node, i) => node.classList.toggle('is-on', i === b));
      b = (b + 1) % beats.length;
    };
    tick();
    pulseTimer = setInterval(tick, 600); // a calm ~100 BPM pulse
  }
  function stopPulse() {
    if (pulseTimer != null) { clearInterval(pulseTimer); pulseTimer = null; }
    pulseBeats().forEach((n) => n.classList.remove('is-on'));
  }
  // Listen-first count-in: highlight beat 1, 2, 3, 4 in time, with input ignored,
  // then hand the steady pulse to the learner. Device-verify: motion + timing.
  function runCountIn(c, onReady) {
    clearCountIn();
    stopPulse();
    const total = (c && c.mode === 'count' && c.count) ? c.count : 4;
    buildPulse(total);
    const beats = pulseBeats();
    if (!beats.length) { if (typeof onReady === 'function') onReady(); return; }
    countInActive = true;
    const seqToken = demoToken;
    const beatMs = 600;
    const groupLen = Math.min(4, beats.length);
    for (let i = 0; i < groupLen; i += 1) {
      countInTimers.push(setTimeout(() => {
        if (seqToken !== demoToken) return;
        if (audioReady()) { try { courseVoice.tick(i === 0); } catch (_) { /* no-op */ } }
        beats.forEach((node, j) => node.classList.toggle('is-on', j === i));
      }, i * beatMs));
    }
    countInTimers.push(setTimeout(() => {
      if (seqToken !== demoToken) return;
      countInActive = false;
      startPulse();   // the steady pulse the learner plays along with
      if (typeof onReady === 'function') onReady();
    }, groupLen * beatMs + 220));
  }

  // ---- Lifecycle ------------------------------------------------------------
  return {
    enter() {
      if (!unsub && input?.subscribe) unsub = input.subscribe(onNote);
      if (learnMode) {
        if (progress) {
          const storedVoice = progress.get('voiceOn');
          voiceOn = (storedVoice === undefined || storedVoice === null) ? PREMIUM_VOICE_READY : !!storedVoice;
          let resume = progress.get('learnLesson');
          if (!Number.isInteger(resume) || resume < 0 || resume > steps.length - 1) resume = 0;
          index = resume;
          // The Course is the centre: record which stage this path represents (Stage 1
          // = Foundations of the keyboard) so the dashboard/course can resume truthfully.
          if (learnMode) progress.set('courseStage', STAGES[0].id);
        }
        setVoice(voiceOn);
        // Warm opener + the existing time-of-day greeting. greetingFor's logic is
        // unchanged; called without a name so we place "Hello, Tim." in front cleanly,
        // giving e.g. "Hello, Tim. Good morning." (morning/afternoon/evening as before).
        // Greeting in the Warm Precision register: name + time of day, then a warm
        // continuation. greetingFor(date, name) returns e.g. "Good afternoon, Tim."
        const greet = greetingFor(new Date(), LEARNER_NAME);
        const started = !!(progress && (((progress.get('learnLesson') || 0) > 0)
          || (Array.isArray(progress.get('learnCompleted')) && progress.get('learnCompleted').length > 0)));
        // Continuous Learning: name the lesson actually last reached (factual, from progressStore).
        const lastTitle = (index > 0 && steps[index - 1]) ? steps[index - 1].title : null;
        const greetText = !started
          ? `${greet} Let\u2019s begin by orienting the keyboard.`
          : (lastTitle
            ? `${greet} Welcome back. Let\u2019s continue where you left off \u2014 ${lastTitle}.`
            : `${greet} Welcome back. Let\u2019s continue where you left off.`);
        if (greetingEl) greetingEl.textContent = greetText;
        if (!greeted) {
          const c0 = steps[index];
          const intro0 = (c0 && Array.isArray(c0.explain) && c0.explain[0]) ? c0.explain[0] : '';
          const prompt0 = (c0 && c0.mode && c0.mode !== 'none' && c0.tryPrompt) ? c0.tryPrompt : '';
          pendingGreeting = [greetText, intro0, prompt0].filter(Boolean).join(' ');
          suppressSpeakOnce = true;   // render won't auto-speak card 0; the greeting covers it
          // If voice is already unlocked this session (a prior gesture), speak now;
          // otherwise wait for the first tap (Start / Continue / key) — mobile autoplay.
          if (voice && voiceOn && voice.isUnlocked?.()) speakPending();
        }
        updateVoiceStatus();
      }
      render();
    },
    exit() {
      if (unsub) { unsub(); unsub = null; }
      audio?.cancel?.();
      if (gateTimer) { clearTimeout(gateTimer); gateTimer = null; }
      if (autoAdvTimer) { clearTimeout(autoAdvTimer); autoAdvTimer = null; }
      if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
      stopPulse();
      clearCountIn();
      clearHandSeq();
      stopDemoAudio();
      keyboard?.clearHighlight?.('target');
      overlay?.destroy?.();
    },
  };
}

/* -------------------------------------------------------------------------- */

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const ch of children) node.appendChild(ch);
  return node;
}

function injectStyles() {
  if (document.getElementById('mf-styles')) return;
  const s = document.createElement('style');
  s.id = 'mf-styles';
  s.textContent = `
    .mf { max-width: 56rem; margin: 0 auto; padding: 0.5rem 0 1rem; color: var(--ivory, #F4EFE6); }
    .mf__head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
    .mf__eyebrow { margin: 0; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--champagne, #E8C57E); }
    .mf__step { margin: 0; font-size: 0.82rem; color: var(--ivory-faint, #7E7A72); }
    .mf__dots { display: flex; gap: 0.4rem; margin: 0.6rem 0 1rem; }
    .mf__dot { width: 0.5rem; height: 0.5rem; border-radius: 50%;
      background: rgba(244,239,230,0.16); transition: background 0.25s, transform 0.25s; }
    .mf__dot.is-done { background: var(--brass, #C99A4B); }
    .mf__dot.is-current { background: var(--champagne, #E8C57E); transform: scale(1.35); }
    .mf__card { background: rgba(255,255,255,0.035); border: 1px solid rgba(232,197,126,0.18);
      border-radius: 16px; padding: 1.25rem 1.35rem 1.4rem; }
    .mf__title { margin: 0 0 0.6rem; font-size: clamp(1.3rem, 4vw, 1.7rem); font-weight: 650;
      color: var(--ivory, #F4EFE6); }
    .mf__explain p { margin: 0 0 0.55rem; font-size: 1.02rem; line-height: 1.55; color: var(--ivory-dim, #B9B2A6); }
    .mf__explain p:first-child { color: var(--ivory, #F4EFE6); }
    .mf__show { margin: 1rem 0 0.4rem; }
    .mf__showcap { margin: 0; font-size: 0.95rem; color: var(--ivory-dim, #B9B2A6); }
    .mf__sharps { margin: 0 0 0.3rem; font-size: 1.6rem; letter-spacing: 0.25em; color: var(--champagne, #E8C57E); }
    .mf__pulse { display: flex; gap: 0.6rem; margin: 0 0 0.5rem; }
    .mf__beat { width: 0.85rem; height: 0.85rem; border-radius: 50%; background: rgba(244,239,230,0.16);
      transition: background 0.12s, transform 0.12s; }
    .mf__beat.is-on { background: var(--amber, #E0A94B); transform: scale(1.25); }
    .mf__replay { margin-top: 0.6rem; padding: 0.4rem 0.95rem; min-height: 38px; font-size: 0.88rem; }
    .mf__try { margin-top: 1.1rem; padding-top: 0.9rem; border-top: 1px solid rgba(244,239,230,0.08); }
    .mf__tryprompt { margin: 0 0 0.35rem; font-size: 1rem; color: var(--ivory, #F4EFE6); }
    .mf__trystatus { margin: 0; min-height: 1.3em; font-size: 0.95rem; color: var(--ivory-faint, #7E7A72); }
    .mf__trystatus.is-done { color: var(--emerald, #46C08A); font-weight: 600; }
    .mf__trystatus.is-wrong { color: #D8A28F; }
    .mf__footer { display: flex; justify-content: space-between; gap: 1rem; margin-top: 1.25rem; }
    .mf__btn { appearance: none; border-radius: 11px; padding: 0.7rem 1.3rem; font-size: 1rem; font-weight: 600;
      cursor: pointer; min-height: 46px; border: 1px solid transparent; transition: filter 0.15s, background 0.15s; }
    .mf__btn--ghost { background: transparent; border-color: rgba(244,239,230,0.22); color: var(--ivory-dim, #B9B2A6); }
    .mf__btn--ghost:hover { color: var(--ivory, #F4EFE6); border-color: rgba(244,239,230,0.4); }
    .mf__btn--primary { background: var(--brass, #C99A4B); color: #1a1206; }
    .mf__btn--primary:hover { filter: brightness(1.08); }
    /* Continue-state machine. ready = green action/success language; auto = a
       pulsing "Continuing in…" the learner can interrupt. */
    .mf__btn--primary.is-ready { background: var(--emerald, #46C08A); color: #06251a;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--emerald, #46C08A) 24%, transparent), 0 6px 18px -7px var(--emerald, #46C08A); }
    .mf__btn--primary.is-ready:hover { filter: brightness(1.06); }
    .mf__btn--primary.is-auto { animation: mfAutoPulse 1s ease-in-out infinite; }
    @keyframes mfAutoPulse {
      0%, 100% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--emerald, #46C08A) 20%, transparent); }
      50%      { box-shadow: 0 0 0 7px color-mix(in srgb, var(--emerald, #46C08A) 32%, transparent); }
    }
    .mf__stay { padding: 0.7rem 1rem; }
    /* Prominent Pause — a proper lesson control, easy to find. */
    .mf__btn--pause { background: color-mix(in srgb, var(--amber, #E0A94B) 18%, transparent);
      border: 1px solid color-mix(in srgb, var(--amber, #E0A94B) 60%, transparent); color: var(--amber, #E0A94B);
      font-weight: 700; min-height: 42px; padding: 0.5rem 1.1rem; border-radius: 11px; cursor: pointer; }
    .mf__btn--pause:hover { background: color-mix(in srgb, var(--amber, #E0A94B) 30%, transparent); color: var(--ivory, #F4EFE6); }
    /* Calm pause overlay — covers the lesson; the footer is frozen behind it. */
    .mf__card { position: relative; }
    .mf__pause { position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 0.85rem; text-align: center; padding: 1.5rem;
      border-radius: 16px; background: color-mix(in srgb, var(--ebony, #14131A) 85%, transparent);
      -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
    .mf__pause-title { margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--ivory, #F4EFE6); }
    .mf__pause-text { margin: 0; font-size: 1.02rem; color: var(--ivory-dim, #B9B2A6); max-width: 22rem; line-height: 1.5; }
    .mf__pause-row { display: flex; gap: 0.7rem; flex-wrap: wrap; justify-content: center; margin-top: 0.3rem; }
    .mf.is-paused .mf__footer { opacity: 0.4; pointer-events: none; }
    .mf.is-paused .mf__learnctrls { opacity: 0.4; pointer-events: none; }
    .mf.is-paused .km-hand, .mf.is-paused .km-staff, .mf.is-paused .mf__beat { animation-play-state: paused !important; }
    .mf__greeting { margin: 0 0 0.7rem; font-size: 1.08rem; font-weight: 600; color: var(--champagne, #E8C57E); }
    .mf__learnctrls { display: flex; gap: 0.55rem; margin: 0 0 0.9rem; flex-wrap: wrap; }
    .mf__learnbtn { padding: 0.42rem 0.95rem; min-height: 38px; font-size: 0.85rem; }
    .mf__startvoice { font-weight: 650; }
    .mf__voicestatus { margin: 0 0 0.7rem; font-size: 0.85rem; color: var(--ivory-faint, #7E7A72); }
    .mf__keylabel { margin: 0 0 0.35rem; font-size: 0.98rem; font-weight: 650; letter-spacing: 0.02em; color: var(--amber, #E0A94B); }
    .mf__btn.is-gated, .mf__btn:disabled { opacity: 0.55; cursor: not-allowed; font-weight: 600; }
    .mf__bridgelink { display: block; width: fit-content; margin: 0.95rem auto 0; padding: 0.3rem 0.4rem; background: none; border: 0; cursor: pointer; font: inherit; font-size: 0.82rem; color: var(--champagne, #E8C57E); opacity: 0.72; }
    .mf__bridgelink:hover, .mf__bridgelink:focus-visible { opacity: 1; text-decoration: underline; }
    .mf__media { margin: 0 0 0.85rem; }
    .mf__media-inner { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 1.15rem 1rem; border: 1px dashed rgba(232, 197, 126, 0.45); border-radius: 13px; background: linear-gradient(160deg, rgba(232, 197, 126, 0.07), rgba(27, 39, 66, 0.14)); }
    .mf__media-icon { font-size: 1.55rem; line-height: 1; color: var(--champagne, #E8C57E); opacity: 0.92; }
    .mf__media-cap { margin: 0; font-size: 0.92rem; color: var(--ivory, #F4EFE6); text-align: center; }
    .mf__media-sub { margin: 0; font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ivory-faint, #7E7A72); }
    @media (max-width: 520px) {
      .mf__card { padding: 1rem 1rem 1.15rem; }
      .mf__explain p { font-size: 0.98rem; }
    }
  `;
  document.head.appendChild(s);
}
