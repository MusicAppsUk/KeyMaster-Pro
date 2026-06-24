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
import { createTutorAudio } from './tutorAudio.js?v=rc2-107';
import { createVoiceControl } from './voiceControl.js?v=rc2-127';
import { VOICE_PACK } from './voicePackData.js?v=rc2-116';
import { STAGES } from './courseMap.js?v=rc2-55';
import { createLearnOverlay } from './learnOverlay.js?v=rc2-108';
import { buildHandSvg, setHandHighlight, FINGER_NAMES } from './handViz.js?v=rc2-81';
import { buildStaff, flashPlayed } from './staffViz.js?v=rc2-117';
import { createCourseVoice } from './courseVoice.js?v=rc2-105';
import { FOUNDATION_STEPS } from './courseFoundation.js?v=rc2-136';
import { STAGE1_MAKING_STEPS } from './courseStage1Making.js?v=rc2-136';
import { STAGE2_READING_STEPS } from './courseStage2Reading.js?v=rc2-136';
import { STAGE3_TWOHANDS_STEPS } from './courseStage3TwoHands.js?v=rc2-136';
import { KEY_LEVEL1_STEPS } from './courseKeyLevel1.js?v=rc2-152';
import { COURSE_CHAPTERS } from './courseChapters.js?v=rc2-136';

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
// B_FRAGMENT / B_FRAGMENT_NAMES moved to ./courseData.js (imported by the
// Foundation step module). The buildScale import above was removed with them.

export const LEARN_STEPS = [
  ...FOUNDATION_STEPS,
  ...STAGE1_MAKING_STEPS,
  ...STAGE2_READING_STEPS,
  ...STAGE3_TWOHANDS_STEPS,
  ...KEY_LEVEL1_STEPS,
];

// ---- Course chapters -------------------------------------------------------
// The Course is one continuous path, but learners orient far better when that
// path is grouped into named chapters with a sense of "where am I / what's next"
// (the structure benchmark apps use). This is presentation only — it maps over
// the existing LEARN_STEPS by id and changes nothing about the steps themselves.
// COURSE_CHAPTERS is imported from ./courseChapters.js (see imports above).
function chapterFor(stepId) {
  for (let i = 0; i < COURSE_CHAPTERS.length; i += 1) {
    const pos = COURSE_CHAPTERS[i].ids.indexOf(stepId);
    if (pos >= 0) {
      return {
        chIdx: i + 1, chTotal: COURSE_CHAPTERS.length, name: COURSE_CHAPTERS[i].name,
        stage: COURSE_CHAPTERS[i].stage || 1,
        course: COURSE_CHAPTERS[i].course || 'foundation',
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
    course: ch ? ch.course : 'foundation',
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
  const { mount, keyboard, viewport, input, synth, piano } = ctx;

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
  // Build token — visible in the Voice Self-Test (#voice-test) and on window.__kmBuild.
  const KM_BUILD = 'rc2-127';
try { if (typeof window !== 'undefined') (window.__kmVer = window.__kmVer || {}).foundations = KM_BUILD; } catch (_) { /* no-op */ }
  // Jack's audio goes through ONE central controller (voiceControl.js): a single
  // narration authority that guarantees one active playback and ignores duplicate
  // same-line requests from any path. The frozen tutorAudio.js is wrapped, never
  // modified. Every audio.say / audio.sayBeats below is therefore guarded centrally.
  const audio = learnMode
    ? createVoiceControl(createTutorAudio({ voice, lang: 'en-GB', ttsFallback: TTS_DEV_FALLBACK }), { build: KM_BUILD, lang: 'en-GB' })
    : null;
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
  let lastAutoSpokenIndex = -1;   // last card whose intro render() auto-narrated (dedupe re-renders)
  // --- Central narration stability guard (Course voice layer; tutorAudio frozen) ---
  // Guarantees one welcome auto-play per session and blocks auto re-narration of the
  // same card within a short window, no matter which path requests it (greeting,
  // render, resume, audio-unlock, re-render). Explicit "Hear it again" bypasses it.
  let welcomeAutoPlayed = false;  // welcome.say.* may auto-play at most once per session
  let lastAutoNarrId = null;      // last auto-narrated card id (debounce key)
  let lastAutoNarrAt = 0;         // timestamp of that narration (ms)
  const NARR_DEDUPE_MS = 2500;    // identical auto requests inside this window are ignored
  const VOICE_TRACE = true;       // TEMP diagnostic — set false to silence; safe to delete later
  const voiceTrace = (action, id, source, reason) => {
    if (!VOICE_TRACE) return;
    try {
      if (typeof window !== 'undefined') {
        const log = (window.__kmVoiceTrace = window.__kmVoiceTrace || []);
        log.push({ t: Date.now(), build: KM_BUILD, action, id, source: source || '?', reason: reason || '' });
        if (log.length > 30) log.shift();
        window.__kmBuild = KM_BUILD;
      }
      console.debug(`[KM ${KM_BUILD} voice] ${action} ${id} <- ${source || '?'}${reason ? ' (' + reason + ')' : ''}`);
    } catch (_) { /* no-op */ }
  };
  if (typeof window !== 'undefined' && !window.__kmBuildLogged) {
    window.__kmBuildLogged = true;
    window.__kmBuild = KM_BUILD;
    try { console.info(`KeyMaster build ${KM_BUILD} — voice stability guard active`); } catch (_) { /* no-op */ }
  }
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
    // STABILISED: the demo uses the SAME engine the on-screen keypress uses
    // (piano / pianoVoice) — the proven, always-ready path. The sampler is NOT
    // the demo path until it's verified working in the real Course; this
    // guarantees "Hear it" is never silent.
    // Soften high-register autonomous notes so early demos are never piercing:
    // roll velocity (and a touch of length) down above C5 (midi 72).
    let v = vel, d = durSec;
    if (midi > 72) { const over = midi - 72; v = Math.max(26, vel - over * 2.2); d = Math.max(0.18, durSec * 0.85); }
    if (piano && typeof piano.noteOn === 'function') {
      try {
        piano.noteOn(midi, v, t);
        piano.noteOff(midi, t + d);
        demoVoices.push({ release: (rt) => { try { piano.noteOff(midi, Math.max(rt ?? synth.ctx.currentTime, synth.ctx.currentTime)); } catch (_) { /* no-op */ } } });
      } catch (_) { /* no-op */ }
    }
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
    setVoice(voiceOn);   // reflect on-by-default state immediately (no off/red flash)
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
      runLearnSequence(steps[index], false, { explicit: true, source: 'repeat' });  // explicit replay bypasses the guard
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
      // The named time-of-day greeting MP3s aren't part of the shipped pack yet.
      // Rather than play a missing file and fall silent, speak the welcome card's
      // own recorded beats — Jack reliably introduces the Course at the start
      // using voice files that already exist. (Named greeting returns once those
      // files are generated.)
      const gh = new Date().getHours();
      const tod = (gh >= 5 && gh < 12) ? 'morning' : (gh >= 12 && gh < 18) ? 'afternoon' : 'evening';
      const resuming = !!(progress && (((progress.get('learnLesson') || 0) > 0)
        || (Array.isArray(progress.get('learnCompleted')) && progress.get('learnCompleted').length > 0)));
      const c0 = steps[index];
      if (!resuming && c0 && Array.isArray(c0.say) && c0.say.length) {
        speakCard(c0, undefined, { source: 'greeting' });   // spoken Course introduction (existing MP3s)
      } else {
        audio.say((resuming ? 'greeting.back.' : 'greeting.') + tod, pendingGreeting, { source: 'greeting', once: true });
      }
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
    lastAutoSpokenIndex = -1;
    welcomeAutoPlayed = false; lastAutoNarrId = null; lastAutoNarrAt = 0;
    setVoice(false);
    render();
  }
  function speakCard(c, onDone, opts = {}) {
    let fired = false;
    const done = () => { if (fired) return; fired = true; if (typeof onDone === 'function') onDone(); };
    if (!voice || !voiceOn || !c) { done(); return; }
    // ---- Narration guard: one welcome per session; debounce identical auto reqs ----
    const explicit = !!opts.explicit;                       // "Hear it again" sets this
    const source = opts.source || (explicit ? 'repeat' : 'auto');
    const isWelcome = c.id === (steps[0] && steps[0].id);
    if (!explicit) {
      const now = Date.now();
      if (isWelcome && welcomeAutoPlayed) { voiceTrace('suppress', `${c.id}.say`, source, 'welcome-once'); done(); return; }
      if (c.id === lastAutoNarrId && (now - lastAutoNarrAt) < NARR_DEDUPE_MS) {
        voiceTrace('suppress', `${c.id}.say`, source, 'debounce'); done(); return;
      }
      lastAutoNarrId = c.id; lastAutoNarrAt = now;
      if (isWelcome) welcomeAutoPlayed = true;
    }
    voiceTrace('play', `${c.id}.say`, source, explicit ? 'explicit' : 'allowed');
    // Failsafe: never let a dropped end-event stall the lesson.
    const fs = setTimeout(done, speechBudgetMs(c));
    const wrapped = () => { clearTimeout(fs); done(); };
    if (Array.isArray(c.say) && c.say.length) {
      audio.sayBeats(`${c.id}.say`, c.say, { onDone: wrapped, source, explicit, once: isWelcome });   // guarded centrally
    } else {
      const parts = [];
      if (Array.isArray(c.explain) && c.explain[0]) parts.push(c.explain[0]);
      if (c.mode && c.mode !== 'none' && c.tryPrompt) parts.push(c.tryPrompt);
      const text = parts.join(' ');
      if (text) audio.say(`${c.id}.explain`, text, { onDone: wrapped, source, explicit, once: isWelcome });
      else wrapped();
    }
    if (progress) progress.addToSet('heardNarration', `narr:${c.title}`);
  }

  // The teaching rhythm: tutor speaks -> pause -> keyboard demonstrates -> pause.
  // Nothing overlaps; the demo waits for the voice; reflective 'come next' bridge
  // steps then advance along the main Course path. Cancels cleanly if the card
  // changes (demoToken, bumped by render()).
  function runLearnSequence(c, skipSpeech, opts = {}) {
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
    else speakCard(c, afterSpeech, opts);
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
    // ---- Course Focus Mode (learn route only) ----------------------------
    // Collapse the on-screen keyboard on passive teaching steps (hand-shape /
    // staff / pulse-explanation / video / image / text), and show it whenever the
    // learner is expected to play (any interactive mode) or the step points at
    // keys/sharps. Drives the existing data-keyboard collapse via the app hook and
    // re-applies every step, so the manual keyboard toggle still works as a peek
    // and re-syncs on the next step. Never touches the keyboard engine or scaling.
    if (learnMode) {
      const needsKeyboard = (c.mode && c.mode !== 'none')
        || (c.show && (c.show.kind === 'keys' || c.show.kind === 'sharps'));
      try { ctx.setKeyboardVisible?.(needsKeyboard); } catch (_) { /* non-critical */ }
    }
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
      // Foundation reads "Ch N"; the KeyMaster Course reads "Key Level N".
      eyebrow.textContent = (ch.course === 'keymaster')
        ? `Key Level ${ch.stage} \u00B7 ${ch.name}`
        : `Ch ${ch.chIdx} \u00B7 ${ch.name}`;
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
      // Marker diagnostic (visible in device remote-debug console): shows each
      // marked midi, whether its key element exists, and whether it's on-screen.
      try {
        const w = viewport?.window;
        const diag = s.midis.map((m) => {
          const k = keyboard?.keys?.get?.(m);
          const onscreen = k && !k.el.classList.contains('is-offscreen');
          return `${m}:${k ? (onscreen ? 'on' : 'OFF') : 'MISSING'}`;
        }).join(' ');
        console.debug(`[KeyMaster] ${c.id} markers=[${s.midis}] window=${w ? w.low + '..' + w.high : '?'} -> ${diag}`);
      } catch (_) { /* no-op */ }
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
      try { ctx.nav?.set?.([{ label: 'Foundation Course', go: goBack }, { label: ch ? ch.name : `Lesson ${index + 1}` }]); } catch (_) { /* nav is non-critical */ }
      // Teaching rhythm: tutor speaks, then (after a pause) the keyboard
      // demonstrates. Step 0's speech is owned by the greeting/speakPending path
      // (once per session), and an incidental re-render of the SAME card must not
      // restart its narration — sayBeats() interrupts and replays from the top,
      // which is the "Jack starts again" double-play. Explicit replay (Hear it
      // again) bypasses this by calling runLearnSequence directly.
      const greetingOwnsCard0 = (index === 0) && (pendingGreeting != null || greeted);
      const sameCardReRender = (index === lastAutoSpokenIndex);
      const skipSpeech = suppressSpeakOnce || greetingOwnsCard0 || sameCardReRender;
      if (suppressSpeakOnce) suppressSpeakOnce = false;
      if (!skipSpeech) lastAutoSpokenIndex = index;
      runLearnSequence(c, skipSpeech, { source: 'render' });
      // Gently bring the active teaching area into view (device-tuned; never jumps if visible).
      try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) { /* no-op */ }
    }
  }

  // ---- Try detection — accurate, teaching feedback --------------------------
  // rc2-157: remember the last MIDI the learner played, so a wrong attempt can
  // show THAT pitch as a transient ghost on the staff (the target stays neutral).
  let lastPlayedMidi = null;
  function onNote(ev) {
    if (paused) return;                            // lesson is paused — ignore presses
    if (learnMode) { voice?.unlock?.(); speakPending(); }
    const c = steps[index];
    if (!c || !c.mode || c.mode === 'none' || !tryState || tryState.done) return;
    stopDemoAudio();   // the learner is playing now — never let the demo ring under their input/feedback
    if (learnMode) { stepAttempts += 1; if (stepAttempts >= 3) enableContinue(); }
    const midi = ev.midiNote;
    lastPlayedMidi = midi;
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
    // Premium soft success confirmation: the keys just played glow warmly for a
    // moment (kmSuccessGlow via the 'success' highlight variant). Visual only.
    try {
      const cc = steps[index];
      const okKeys = (cc && Array.isArray(cc.targets) && cc.targets.length)
        ? cc.targets
        : (cc && cc.show && Array.isArray(cc.show.midis) ? cc.show.midis : []);
      if (okKeys.length) {
        keyboard?.highlight?.(okKeys, 'success');
        setTimeout(() => { try { keyboard?.clearHighlight?.('success'); } catch (_) { /* no-op */ } }, 950);
      }
      flashStaff('correct');
    } catch (_) { /* success glow is a flourish, never required */ }
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
      // Graduated SUPPORT for retrieval steps: on the 2nd miss, gently REVEAL the
      // help that was deliberately withheld (the highlight, the cue, and/or a
      // replay of the pattern) so recall never becomes failure. Recall -> try ->
      // support if needed -> try again. Best-effort; never blocks the retry.
      if (wrongCount >= 2 && c && c.support) {
        try {
          if (Array.isArray(c.support.highlight) && c.support.highlight.length) {
            keyboard?.highlight?.(c.support.highlight, 'target');
            viewport?.frame?.(c.support.highlight);
          }
          if (c.support.cue) overlay?.render?.(c.support.cue);
          if (c.support.replay && Array.isArray(c.demo) && c.demo.length) demoCard(c);
        } catch (_) { /* support is a kindness, not a requirement */ }
      }
    }
    tryStatus.textContent = speakable(msg);
    tryStatus.classList.remove('is-done');
    tryStatus.classList.add('is-wrong');
    showWrongGhost(lastPlayedMidi);   // played note → red ghost; target stays neutral
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
  // Mirror the keyboard's success/correction feedback onto the staff note(s):
  // correct -> the note glows emerald; wrong -> it shows soft rose, then settles
  // back to the amber target. Only acts when the current step shows a staff, so
  // keyboard-only steps are untouched. Success glows; mistakes guide.
  // rc2-157: show the wrong note the learner just played as a transient red ghost
  // at its real pitch. The target note is deliberately NOT reddened — it stays
  // neutral so the correct answer is never visually branded as the mistake.
  function showWrongGhost(midi) {
    try {
      const c = steps[index];
      const hasStaff = c && ((c.show && c.show.kind === 'staff') || c.staffHint);
      if (!hasStaff || !staffSlot || staffSlot.style.display === 'none') return;
      const wrap = staffSlot.querySelector('.km-staff');
      if (wrap && Number.isFinite(midi)) flashPlayed(wrap, midi, 900);
    } catch (_) { /* feedback flourish, never required */ }
  }
  function flashStaff(state) {
    try {
      const c = steps[index];
      const hasStaff = c && ((c.show && c.show.kind === 'staff') || c.staffHint);
      if (!hasStaff || !staffSlot || staffSlot.style.display === 'none') return;
      const notes = staffSlot.querySelectorAll('.km-staff__note');
      if (!notes.length) return;
      if (state === 'wrong') {
        notes.forEach((n) => { n.classList.add('is-wrong'); });
        setTimeout(() => { notes.forEach((n) => { n.classList.remove('is-wrong'); }); }, 720);
      } else {
        notes.forEach((n) => { n.classList.remove('is-on', 'is-wrong'); n.classList.add('is-correct'); });
      }
    } catch (_) { /* staff feedback is a flourish, never required */ }
  }
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
      // ROUTE-IN HARD STOP: entering the Course cancels any narration still alive
      // from the front door / greeting / a prior instance, so the welcome can never
      // layer over an earlier line. One engine + this = a single clean voice on entry.
      audio?.cancel?.();
      if (!unsub && input?.subscribe) unsub = input.subscribe(onNote);
      if (learnMode) {
        if (progress) {
          // KeyMaster PRO is tutor-led: Jack is ON by default. Migrate any stale
          // 'voice off' left over from earlier sessions to the new default once;
          // genuine user choices made after this are respected.
          let storedVoice = progress.get('voiceOn');
          if (!progress.get('voicePrefMigrated')) {
            storedVoice = PREMIUM_VOICE_READY;
            progress.set('voicePrefMigrated', true);
            progress.set('voiceOn', PREMIUM_VOICE_READY);
          }
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
          // DETERMINISTIC OWNERSHIP: the welcome is spoken ONLY by an explicit user
          // gesture (Start / voice toggle / Continue / first key) via speakPending().
          // Route init / progress restore no longer auto-speak it — that removed the
          // last non-gesture trigger that could overlap the gesture-driven one.
          // (pendingGreeting waits here until the first gesture fires speakPending.)
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
    /* Course Focus Mode: compress the top bar in the Course only, so the lesson
       area gains a little height. Back / Continue / Repeat / MIDI stay reachable.
       The bar row grows to fit its content (brand + the "Modules / Foundation
       Course / chapter" breadcrumb) so that trail is never clipped against the
       compressed bar; --bar-h remains the compressed floor. */
    html[data-view="learn"] { --bar-h: 44px; }
    html[data-view="learn"] .app { grid-template-rows: minmax(var(--bar-h), auto) 1fr auto; }
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
