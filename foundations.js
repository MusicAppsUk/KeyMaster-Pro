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
//   • Demonstrates with the shared synth's existing gentle 'demo' voice (rc2-41)
//     at reduced velocity, staggered onsets — synth.js is NOT modified, so the
//     Scales Listen voice, the default learner-play voice, and the shared limiter
//     are untouched. Each demo Voice instance is released individually, so it can
//     never cut the learner's own held notes.
//   • Never touches the evaluator, the Scales/Sight-Reading/Chord engines, MIDI
//     mapping, EventBridge, staff rendering, Practice Review, or progression
//     gates. It sets NO expected notes, so the evaluator stays idle throughout.
//
// Feedback is meaningful, never generic: targeted cards confirm the SPECIFIC note
// ("Exactly — that is Middle C"), wrong notes are named and gently guided, and
// only genuine free-exploration is acknowledged as exploration.

import { createTutorVoice } from './tutorVoice.js?v=rc2-74';
import { createTutorAudio } from './tutorAudio.js?v=rc2-54';
import { STAGES } from './courseMap.js?v=rc2-55';
import { createLearnOverlay } from './learnOverlay.js?v=rc2-56';
import { buildScale } from './scaleEngine.js';
import { buildHandSvg, setHandHighlight, FINGER_NAMES } from './handViz.js?v=rc2-77';

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
    media: { kind: 'video', topic: 'posture', caption: 'Sitting at the piano \u2014 guided demonstration coming' },
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
    cues: { labels: [{ midi: 48, text: 'low', place: 'below' }, { midi: 72, text: 'high', place: 'below' }] },
    say: [
      { text: 'Let\u2019s orient the keyboard first.', pauseAfter: 520, tone: 'warm' },
      { text: 'Lower notes live to your left, higher notes to your right.', pauseAfter: 560 },
      { text: 'Play any key, and listen to where its sound sits.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Let\u2019s orient the keyboard first. Lower notes live to your left, higher notes to your right.', 'Play any key, and listen to where its sound sits.'],
    show: { kind: 'keys', midis: [48, 55, 60, 67, 72], caption: 'One row \u2014 low on the left, high on the right.', label: 'Low \u2190                      \u2192 High' },
    demo: [48, 60, 72], demoGap: 0.5,
    tryPrompt: 'Play any key, and listen to where its sound sits on the keyboard.', mode: 'any',
    okMsg: 'Good. That is your first landmark: sound moves across the keyboard, low to high.',
  },
  {
    eyebrow: 'Low and high', title: 'Low and high sounds', id: 'low-high',
    cues: { labels: [{ midi: 50, text: 'low', place: 'below' }, { midi: 69, text: 'high', place: 'below' }] },
    say: [
      { text: 'The keyboard is laid out by pitch.', pauseAfter: 500, tone: 'warm' },
      { text: 'Keys to the left sound lower; keys to the right sound higher.', pauseAfter: 560 },
      { text: 'Play a low note on the left \u2014 then a high note on the right.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['The keyboard is laid out by pitch \u2014 keys to the left sound lower, keys to the right higher.', 'Play a low note on the left, then a high note on the right.'],
    show: { kind: 'keys', midis: [48, 50, 52, 67, 69, 71], caption: 'Left is low; right is high.', label: 'low                          high' },
    demo: [48, 50, 52, 67, 69, 71], demoGap: 0.34,
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
      { text: 'Sit tall, a little back from the keys. Let your arms hang easily, elbows roughly level with the keyboard, shoulders relaxed.', pauseAfter: 680 },
      { text: 'Bring a hand to the keys and let it curve naturally \u2014 as if holding a small ball. The wrist stays level, never locked.', pauseAfter: 360, tone: 'instruct' },
    ],
    explain: ['Sit tall, a little back, arms hanging easily \u2014 elbows about level with the keys, shoulders relaxed.', 'Let the hand curve naturally over the keys, as if holding a small ball. Wrist level and loose, weight supported by the arm.'],
    show: { kind: 'hand', hand: 'right', caption: 'A relaxed, curved hand \u2014 wrist level, fingers gently rounded.' },
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
    okMsg: 'Exactly \u2014 that\u2019s C, just left of the two black keys.',
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
    okMsg: 'Exactly \u2014 that\u2019s D, between the two black keys.',
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
    okMsg: 'Exactly \u2014 that\u2019s E, just right of the two black keys.',
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
    okMsg: 'Exactly \u2014 that\u2019s F, just left of the three black keys.',
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
    okMsg: 'Exactly \u2014 that\u2019s G.',
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
    okMsg: 'Exactly \u2014 that\u2019s A. You can now name the white keys.',
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
    okMsg: 'Exactly \u2014 that\u2019s Middle C (C4).',
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
    okMsg: 'Exactly \u2014 that\u2019s B, just below Middle C.',
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
    media: { kind: 'video', topic: 'hand-shape', caption: 'The B major hand shape \u2014 guided demonstration coming' },
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
    eyebrow: 'Reading', title: 'Name and play: E', id: 'read-play-e',
    say: [
      { text: 'Reading music means knowing a note, then playing it.', pauseAfter: 560, tone: 'warm' },
      { text: 'The note is E. Find it and play it.', pauseAfter: 300, tone: 'instruct', emphasis: 'E' },
    ],
    explain: ['Reading music means recognising a note, then finding it on the keyboard.', 'The note is E \u2014 just right of the two black keys. Play it.'],
    show: { kind: 'keys', midis: [64], caption: 'The note is E.', label: 'E' },
    demo: [64], demoGap: 0.45,
    tryPrompt: 'The note is E \u2014 find it and play it.', targets: [64], mode: 'one',
    okMsg: 'Exactly \u2014 you knew E and played it. That is the start of reading music.',
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
    media: { kind: 'image', topic: 'staff', caption: 'Middle C on the staff \u2014 notation view coming' },
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
    media: { kind: 'video', topic: 'pulse', caption: 'Keeping a steady pulse \u2014 guided demonstration coming' },
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
      { text: 'A quick checkpoint \u2014 no new ideas, just what you know.', pauseAfter: 540, tone: 'warm' },
      { text: 'Play Middle C.', pauseAfter: 300, tone: 'instruct' },
    ],
    explain: ['Let\u2019s check what you\u2019ve learned \u2014 nothing new here.', 'Find and play Middle C, near the centre.'],
    show: { kind: 'keys', midis: [60], caption: 'Middle C.', label: 'Middle C' },
    demo: [60], demoGap: 0.45,
    tryPrompt: 'Play Middle C.', targets: [60], exact: true, mode: 'one',
    okMsg: 'Exactly \u2014 Middle C, near the centre. Well remembered.',
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
    okMsg: 'Exactly \u2014 a C major chord. Orientation, names, scales, reading, rhythm and harmony \u2014 you\u2019ve begun them all.',
    hint: 'Press the three highlighted keys together: C, E and G.',
  },
  {
    eyebrow: 'Stage 1 complete', title: 'Foundations complete', id: 'stage1-complete',
    say: [
      { text: 'That\u2019s Stage 1 complete \u2014 the foundations are yours.', pauseAfter: 600, tone: 'warm' },
      { text: 'You can name the white keys, climb a scale up and down, play two chords, name a note and play it, and hold a steady pulse.', pauseAfter: 700 },
      { text: 'The Course now continues into Stage 2, where we start to make music. The masterclasses are there too, any time, for deeper practice.', pauseAfter: 360, tone: 'warm' },
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
      { text: 'Welcome to Stage 2. In Stage 1 you learned the keyboard. Now we begin to make music with it.', pauseAfter: 620, tone: 'warm' },
      { text: 'Short phrases, a little harmony, and a steady pulse underneath \u2014 one small step at a time.', pauseAfter: 360 },
    ],
    explain: ['Welcome to Stage 2 \u2014 making music. You\u2019ll play short phrases, a little harmony, and feel pulse inside music.', 'Nothing here is graded for timing. We\u2019re building musicianship, one small step at a time.'],
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
    demo: [60, 62, 64], demoGap: 0.5,
    tryPrompt: 'Play C, then D, then E \u2014 in order.', targets: [60, 62, 64], mode: 'sequence',
    okMsg: 'That\u2019s a phrase \u2014 three notes rising. Small, but it\u2019s music.',
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
    demo: [64, 62, 60], demoGap: 0.5,
    tryPrompt: 'Play E, then D, then C \u2014 in order.', targets: [64, 62, 60], mode: 'sequence',
    okMsg: 'Up and down \u2014 a phrase has shape. You\u2019re shaping music now.',
    hint: 'Start on E, then the next white key down, then the next: E, D, C.',
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
    eyebrow: 'Scale shape', title: 'The scale as a shape', id: 'scale-shape-up',
    say: [
      { text: 'A scale isn\u2019t just notes \u2014 it\u2019s a shape your hand learns.', pauseAfter: 560, tone: 'warm' },
      { text: 'Climb the C scale all the way up to the next C: C, D, E, F, G, A, B, C.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['A scale is a shape \u2014 the same pattern of steps your hand can learn to feel. We use C here because it names and reads easily.', 'Climb from C up to the next C: C, D, E, F, G, A, B, C.'],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67, 69, 71, 72], caption: 'C up to the next C.', label: 'C \u2192 C' },
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
    demo: [60, 64, 67, 72], demoGap: 0.46,
    tryPrompt: 'Play C, E, G, then the C above \u2014 in order.', targets: [60, 64, 67, 72], mode: 'sequence',
    okMsg: 'That\u2019s a melody \u2014 your first real phrase. Rising, then home. This is making music.',
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
    okMsg: 'That\u2019s listening \u2014 the habit behind every musical sound. Notes, patterns, harmony, pulse, and now your ear: you\u2019re becoming a musician.',
    hint: 'Any single note \u2014 the point is to play it, then truly listen to the sound.',
  },
  {
    eyebrow: 'Stage 2 review', title: 'Checkpoint: your phrase', id: 'review-phrase',
    say: [
      { text: 'A calm checkpoint \u2014 no new ideas.', pauseAfter: 520, tone: 'warm' },
      { text: 'Play your melody once more, from memory: C, E, G, C.', pauseAfter: 320, tone: 'instruct' },
    ],
    explain: ['From memory \u2014 the melody you just learned.', 'Play C, E, G, then the C above.'],
    show: { kind: 'keys', midis: [60, 64, 67, 72], caption: 'C, E, G, C.', label: 'C E G C' },
    demo: [60, 64, 67, 72], demoGap: 0.46,
    tryPrompt: 'Play the melody: C, E, G, then the C above.', targets: [60, 64, 67, 72], mode: 'sequence',
    okMsg: 'Held together from memory \u2014 a phrase that\u2019s yours now.',
    hint: 'C, E, G, then the next C higher up.',
  },
  {
    eyebrow: 'The Course continues', title: 'More music ahead', id: 'stage2-onward',
    say: [
      { text: 'That\u2019s the start of Stage 2 \u2014 you\u2019re making music now, not just finding keys.', pauseAfter: 600, tone: 'warm' },
      { text: 'There\u2019s more Course ahead: longer phrases, more harmony, real reading and rhythm. And the masterclasses are always here for deeper practice.', pauseAfter: 360, tone: 'warm' },
    ],
    explain: ['You\u2019ve begun making music \u2014 phrases, harmony, pattern, and pulse. This is the start of Stage 2, not the end of the Course.', 'More is coming: longer phrases, deeper harmony, real reading and rhythm. The masterclasses stay available any time for deeper practice.'],
    bridge: { label: 'Optional \u2014 open a practice room for deeper practice', hash: '#/scales' },
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
  { stage: 1, name: 'Your hands', ids: ['sit-approach', 'fingers-rh', 'fingers-lh', 'thumb-play', 'finger3-play'],
    intro: 'Before patterns, set up the hands: posture, a relaxed curved shape, and the finger numbers.' },
  { stage: 1, name: 'Black keys', ids: ['black-keys-two', 'black-keys-three'],
    intro: 'The black keys come in groups of two and three \u2014 your signposts.' },
  { stage: 1, name: 'White keys', ids: ['find-c', 'find-d', 'find-e', 'find-f', 'find-g', 'find-a', 'middle-c', 'b-below'],
    intro: 'Now we name the white keys, using the black-key groups to find them.' },
  { stage: 1, name: 'Movement', ids: ['direction', 'step-skip'],
    intro: 'Music moves \u2014 up and down, by steps and by skips.' },
  { stage: 1, name: 'Scales', ids: ['first-scale', 'c-scale-five', 'c-scale-down'],
    intro: 'A scale is steps in order \u2014 a ladder of pitch you can climb and descend.' },
  { stage: 1, name: 'B major', ids: ['first-b-scale', 'b-major-why', 'bridge-scales'],
    intro: 'A first taste of the B-major pathway, and why it fits the hand.' },
  { stage: 1, name: 'Harmony', ids: ['first-chord', 'chord-g', 'bridge-chords'],
    intro: 'Notes sounded together make chords \u2014 the colour of music.' },
  { stage: 1, name: 'Reading', ids: ['read-play-e', 'read-play-g', 'first-reading', 'bridge-sightreading'],
    intro: 'Reading music means knowing a note, then playing it.' },
  { stage: 1, name: 'Rhythm', ids: ['first-pulse', 'pulse-eight'],
    intro: 'Music sits on a steady pulse \u2014 an even beat underneath the notes.' },
  { stage: 1, name: 'Checkpoint', ids: ['review-c', 'review-scale', 'review-chord'],
    intro: 'A calm checkpoint \u2014 just the things you already know.' },
  { stage: 1, name: 'Stage 1 complete', ids: ['stage1-complete'] },
  { stage: 2, name: 'Making music', ids: ['stage2-welcome'],
    intro: 'Stage 2 \u2014 the foundations become music.' },
  { stage: 2, name: 'The B-major pathway', ids: ['bmaj-shape', 'bmaj-rh', 'bmaj-lh'],
    intro: 'The KeyMaster hand-shape pathway \u2014 fingering, hand by hand, on the keys that fit.' },
  { stage: 2, name: 'Phrases', ids: ['phrase-up', 'phrase-down'],
    intro: 'Short phrases you can play \u2014 a small musical idea, up and down.' },
  { stage: 2, name: 'Rhythm in music', ids: ['play-on-pulse'],
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
    intro: 'A calm review, and the road ahead.' },
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
    okMsg: 'Exactly \u2014 that\u2019s C, just left of the two black keys.',
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
    okMsg: 'Exactly \u2014 that\u2019s Middle C (C4).',
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
    okMsg: 'Exactly \u2014 that\u2019s B, just below Middle C.',
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
  const audio = learnMode ? createTutorAudio({ voice, lang: 'en-GB' }) : null;
  // Recorded-human voice pilot (route A). Maps the Course's stable opening line IDs
  // to local audio files under voice/en-GB/. The architecture (premium file -> TTS
  // -> captions) already lives in tutorAudio.js; this only supplies the manifest.
  // GATED OFF until the real recordings exist, so behaviour is unchanged today: with
  // no pack active, voice-on falls back to TTS and voice-off shows captions. Flip
  // PREMIUM_VOICE_READY to true once the files in VOICE_SCRIPT.md are recorded and
  // dropped into voice/en-GB/. (Full script + delivery brief: VOICE_SCRIPT.md.)
  const PREMIUM_VOICE_READY = false;
  const OPENING_VOICE_PACK = {
    'welcome.0': 'welcome-0.ogg',
    'welcome.1': 'welcome-1.ogg',
    'welcome.2': 'welcome-2.ogg',
    'welcome.3': 'welcome-3.ogg',
    'meet-keyboard.0': 'meet-keyboard-0.ogg',
    'meet-keyboard.1': 'meet-keyboard-1.ogg',
    'meet-keyboard.2': 'meet-keyboard-2.ogg',
    'meet-keyboard.correct': 'meet-keyboard-correct.ogg',
    'low-high.0': 'low-high-0.ogg',
    'low-high.1': 'low-high-1.ogg',
    'low-high.2': 'low-high-2.ogg',
    'low-high.correct': 'low-high-correct.ogg',
    'find-c.0': 'find-c-0.ogg',
    'find-c.1': 'find-c-1.ogg',
    'find-c.2': 'find-c-2.ogg',
    'find-c.3': 'find-c-3.ogg',
    'find-c.correct': 'find-c-correct.ogg',
  };
  if (audio && PREMIUM_VOICE_READY) audio.setPack(OPENING_VOICE_PACK, 'en-GB');
  // Visual teaching cues (brackets / pointer / labels), measured from real key geometry.
  const overlay = learnMode ? createLearnOverlay(keyboard) : null;
  // Master Training uses its own curriculum; Foundations keeps the original cards.
  const steps = learnMode ? LEARN_STEPS : CARDS;
  let voiceOn = false;   // captions-first: browser TTS is opt-in, not the default
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

  // ---- Demonstration audio (shared 'demo' voice; no synth.js change) --------
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
    const v = synth.noteOn(midi, vel, t, 'demo');
    if (v) { demoVoices.push(v); try { v.release(t + durSec); } catch (_) { /* no-op */ } }
  }
  function stopDemoAudio() {
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
    const dur = isChord ? 1.10 : Math.max(0.42, gap * 1.05);
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
  const sharps = el('p', { class: 'mf__sharps', 'aria-hidden': 'true' });
  const replayBtn = el('button', { class: 'mf__replay mf__btn mf__btn--ghost', type: 'button' });
  replayBtn.textContent = 'Hear it again';
  const mediaEl = el('div', { class: 'mf__media' });
  mediaEl.style.display = 'none';
  const showWrap = el('div', { class: 'mf__show' }, [keyLabel, handSlot, pulse, sharps, mediaEl, showCaption, replayBtn]);

  const tryWrap = el('div', { class: 'mf__try' });
  const tryPrompt = el('p', { class: 'mf__tryprompt' });
  const tryStatus = el('p', { class: 'mf__trystatus', 'aria-live': 'polite' });
  tryWrap.append(tryPrompt, tryStatus);

  const footer = el('div', { class: 'mf__footer' });
  const backBtn = el('button', { class: 'mf__btn mf__btn--ghost', type: 'button' });
  backBtn.textContent = 'Back';
  const contBtn = el('button', { class: 'mf__btn mf__btn--primary', type: 'button' });
  footer.append(backBtn, contBtn);

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
    const pauseBtn = el('button', { class: 'mf__btn mf__btn--ghost mf__learnbtn', type: 'button' });
    pauseBtn.textContent = 'Pause';
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

    startBtn.addEventListener('click', () => { voice?.unlock?.(); speakPending(); });
    voiceBtn.addEventListener('click', () => { voice?.unlock?.(); setVoice(!voiceOn); speakPending(); });
    pauseBtn.addEventListener('click', () => { audio?.cancel?.(); stopDemoAudio(); stopPulse(); });
    repeatBtn.addEventListener('click', () => {
      voice?.unlock?.();
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
    speakPending();                               // tutor arrives on the first primary tap
    if (learnMode && contBtn.disabled) return;   // proficiency gate (learn only)
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
      msg = 'Tutor voice ready \u2014 device prototype (premium voice coming).';
    }
    statusEl.textContent = msg;
    if (startBtn) startBtn.style.display = showStart ? '' : 'none';
  }
  // Speak the queued greeting+intro — MUST be triggered from inside a user gesture
  // (button tap / key press) so mobile autoplay rules allow the first utterance.
  function speakPending() {
    if (!pendingGreeting) { updateVoiceStatus(); return; }
    if (voice && voiceOn) {
      audio.say('greeting', pendingGreeting);
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
      if (c.autoNext) {   // reflective bridge: move along the main path after a calm pause
        if (autoAdvTimer) clearTimeout(autoAdvTimer);
        autoAdvTimer = setTimeout(() => { if (alive()) advanceStep(); }, PAUSE_AFTER_DEMO + 400);
      }
    };
    const doDemo = () => {
      if (!alive()) return;
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

  // ---- Proficiency gate (learn only): an interactive step holds Continue until the
  // learner has done it, with a gentle escape so they are never trapped. ----------
  function enableContinue() {
    if (gateTimer) { clearTimeout(gateTimer); gateTimer = null; }
    contBtn.disabled = false;
    contBtn.classList.remove('is-gated');
  }
  function gateStep(c) {
    if (gateTimer) { clearTimeout(gateTimer); gateTimer = null; }
    stepAttempts = 0;
    wrongCount = 0;
    const interactive = !!(c && c.mode && c.mode !== 'none');
    if (!interactive) { enableContinue(); return; }
    contBtn.disabled = true;
    contBtn.classList.add('is-gated');
    gateTimer = setTimeout(enableContinue, 22000);  // failsafe: input may be unavailable
  }

  // ---- Per-card render ------------------------------------------------------
  // Video-ready slot (rc2-63): an honest premium placeholder until real, licensed
  // teaching assets ship. No fake or uncanny video — just a clean architecture.
  function buildMediaSlot(media) {
    const wrap = el('div', { class: 'mf__media-inner' });
    const icon = el('span', { class: 'mf__media-icon', 'aria-hidden': 'true' });
    icon.textContent = media.kind === 'video' ? '\u25B6' : '\u25A6';
    const cap = el('p', { class: 'mf__media-cap' });
    cap.textContent = media.caption || 'Guided demonstration \u2014 coming';
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
    handSlot.style.display = 'none';
    handSlot.replaceChildren();
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
    }
    // A playable step can also carry a finger-number hand hint alongside its keys.
    if (s.kind !== 'hand' && c.handHint) renderHand(c.handHint);

    // Video-ready media slot (rc2-63): honest placeholder; hidden unless the step opts in.
    if (c.media) { mediaEl.replaceChildren(buildMediaSlot(c.media)); mediaEl.style.display = ''; }
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
    if (learnMode && wrongCount > 0) shown = `That\u2019s clearer now \u2014 ${shown}`;
    tryStatus.textContent = `\u2713 ${speakable(shown)}`;
    tryStatus.classList.remove('is-wrong');
    tryStatus.classList.add('is-done');
    if (learnMode) {
      enableContinue();
      // Advance only after the confirmation has been fully delivered, then a calm
      // pause — never cut off, never rushed. Captions-led uses reading time.
      const scheduleAdvance = (delay) => {
        if (steps[index] && steps[index].hold) return;
        const at = index;
        if (autoAdvTimer) clearTimeout(autoAdvTimer);
        autoAdvTimer = setTimeout(() => {
          if (index === at && tryState && tryState.done) advanceStep();
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
  function renderHand(spec) {
    const hand = (spec && spec.hand === 'left') ? 'left' : 'right';
    const highlight = (spec && Array.isArray(spec.highlight)) ? spec.highlight : [];
    const numbers = !(spec && spec.numbers === false);
    activeHandEl = buildHandSvg({ hand, highlight, numbers });
    handSlot.replaceChildren(activeHandEl);
    handSlot.style.display = '';
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
          voiceOn = (storedVoice === undefined || storedVoice === null) ? false : !!storedVoice;
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
    .mf__greeting { margin: 0 0 0.7rem; font-size: 1.08rem; font-weight: 600; color: var(--champagne, #E8C57E); }
    .mf__learnctrls { display: flex; gap: 0.55rem; margin: 0 0 0.9rem; flex-wrap: wrap; }
    .mf__learnbtn { padding: 0.42rem 0.95rem; min-height: 38px; font-size: 0.85rem; }
    .mf__startvoice { font-weight: 650; }
    .mf__voicestatus { margin: 0 0 0.7rem; font-size: 0.85rem; color: var(--ivory-faint, #7E7A72); }
    .mf__keylabel { margin: 0 0 0.35rem; font-size: 0.98rem; font-weight: 650; letter-spacing: 0.02em; color: var(--amber, #E0A94B); }
    .mf__btn.is-gated, .mf__btn:disabled { opacity: 0.45; cursor: not-allowed; }
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
