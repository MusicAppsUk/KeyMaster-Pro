# PROJECT NOTES — read before renaming or deleting files

## 1. Filename: `scalesMasterclass.js` (NOT `scalesEngine.js`)

The Scales card's controller is named **`scalesMasterclass.js`**. This is
deliberate and it must stay matched to one line in `app.js`:

```js
// app.js — VIEW_REGISTRY
scales:       { ... load: () => import('./scalesMasterclass.js') },
sightreading: { ... load: () => import('./sightReading.js') },
```

- `app.js` lazy-loads these two files **by exact name**. If the filename and the
  `import('./…')` string don't match, the card silently falls back to the
  "coming soon" placeholder.
- There is intentionally **no** `scalesEngine.js`. Do not create one — it would
  be one letter away from `scaleEngine.js` and cause exactly the confusion we're
  avoiding.

### Don't confuse these two similarly-named files:
| File | Role |
|------|------|
| `scaleEngine.js`       | ENGINE — builds scale notes + spelling (pure logic) |
| `scalesMasterclass.js` | VIEW  — the on-screen Scales panel (uses the engine) |

### If you ever want to rename the view controller
Renaming is fine, but it's a **two-place** change: rename the file *and* update
the matching `import('./…')` in `app.js`. (If you move back to the modular
subfolder layout, the path becomes `./scales/scalesMasterclass.js`.)

## 2. These two controllers are INTERIM — replace contents, don't delete files

`scalesMasterclass.js` and `sightReading.js` currently hold small "live check"
demos (light a scale on the keyboard / render the staff + run the metronome).
They exist to prove the routing and engines are wired.

When you build the real features: **edit the code inside these files.** Do not
delete the files — `app.js` depends on them by name. Deleting a file = the card
reverts to the placeholder.

So there is nothing to delete here. The thing that gets "thrown away later" is
the demo *code inside* these two files, not the files themselves.

## 3. Known gaps (expected, harmless)

- **Icons:** `manifest.json` and `index.html` reference icon images
  (`icon-192.png`, `icon-512.png`, `icon-180.png`, maskable variants) that
  aren't in the project yet → they 404 until added. No effect on the app itself.
- **Music font:** `notation.css` asks for the `Bravura` font for clefs /
  accidentals; until it's loaded, those fall back to system music glyphs.

## 4. This is the FLAT build (for GitHub Pages)

Every file lives in the repo root and all imports are relative (`./x.js`), which
is what makes GitHub Pages work without 404s. The earlier *modular* source used
subfolders (`js/…`, `styles/…`) with absolute paths (`/js/app.js`). Pick one as
your source of truth so the two don't drift apart.

## 5. Input architecture (added in the Practice Engine, Phase 1)

`noteInput.js` is the single normalized note stream. Every device feeds the same
event shape: `{ midiNote, velocity, timestamp, source }`.

- `app.js` owns the wiring: on-screen keyboard presses emit `source: 'screen'`,
  Web MIDI emits `source: 'midi'`. Each physical action fires exactly one event
  (screen presses that originate from MIDI are skipped to avoid double-firing).
- Scoring engines (e.g. `sightReading.js`) `input.subscribe(fn)` and react to the
  event shape only — they don't know or care which device played the note.
- To add a new input source later (playback, a tutor, a different controller),
  wire it into `this.input.emit(...)` in `app.js`. No engine changes needed.

## 6. Stable baseline log

- **rc2-18 — STABLE BASELINE (confirmed on device).** MIDI detection/input verified
  working on the tablet after the rc2-17 navigation hardening + diagnostics hotfix.
  Confirmed stable in this build: Web-MIDI detection and note input; the breadcrumb /
  Back navigation across Sight-Reading, Scales and Chords; the per-module fingering-
  number show/hide toggle; the learner-facing Sight-Reading lesson screen; the frozen
  fingering engine (rc2-12). This is the rollback point for subsequent feature work.

- **rc2-20 — Sight-Reading note matching CONFIRMED working on device.** The rc2-20
  temporary on-screen note-match diagnostic confirmed the expected/played MIDI flow
  was correct (the matching code was unchanged from baseline); root cause was external
  to the app. The temporary diagnostic has now been removed. New active baseline going
  forward: Sight-Reading matching, MIDI, navigation, fingering toggle and Practice
  Review all confirmed working.

- **R1 design — Time, Rhythm & Musical Duration pillar (design/stub only).**
  Added the canonical timing pillar to ROADMAP.md, a detailed design doc
  (TIMING_RHYTHM_PILLAR.md, design-docs location), and an isolated, FROZEN,
  UNUSED vocabulary stub `rhythmModel.js` (imported by nothing). No runtime
  module changed; no version bump. Nothing touches MIDI, Event Bridge, staff
  rendering, gating, feedback, transport, or any stable module. The display-only
  crotchet rests already in Sight-Reading are the only visible part of this
  pillar; all else is future, re-approval-gated work.

- **DECISION — Timing pillar canonically accepted into R1; reserved.** Stays
  documented only until a deliberately begun, separate, isolated build phase.
  First step when started = silent rhythm recognition (recognition before
  execution), NOT live tempo scoring. Prohibited until then: rhythm scoring,
  metronome enforcement, held-note/duration detection, tempo-based pass/fail.
  rhythmModel.js remains unwired. Fixed Practice-Review timing dimensions: Pulse
  Stability · Rhythm Recognition · Note Duration · Continuity · Rest Awareness.
  All timing work bound by the Golden Rule. No runtime change; no version bump.

- **PACKAGING FIX (rc2-24) — interactive Chord Masterclass was never shipped.**
  Live testing showed the chord view as display-only (no Learn / Guided Practice
  / Inversion Trainer tabs). Root cause: the zip held an OLD 191-line
  chordMasterclass.js ("Stage 1 prototype"), while flat/ had the 315-line
  INTERACTIVE version. Cause of drift: `zip -rq` UPDATES only files whose mtime
  is newer, so it silently skipped the (older-mtime) interactive chord file and a
  stale ROADMAP.md. FIX: always rebuild the zip FROM SCRATCH (`rm` then `zip`),
  never incremental update. Bumped rc2-23 → rc2-24 to force browsers to re-fetch
  the chord module (same-token cache would serve the old file). No service worker
  exists; cache-busting is via the ?v= token only. No feature code rebuilt — the
  interactive modes already existed in source; this was a shipping + cache fix.
  STANDING RULE: re-zip = rm + fresh zip, then diff zip vs flat (0 stale) before
  presenting.

- **rc2-31 — CURRENT WORKING BASELINE (confirmed loading on the live test site).**
  Chord Masterclass loads correctly via #/chords. The chord era rc2-26..rc2-31 in
  brief: rc2-26 restored the active trainer (Teach/Demonstrate → Follow Me → Try →
  Review/Assess/Unit Review); rc2-27 made Try Yourself a partial-support retrieval
  step (root anchor only) + a unified cockpit heading; rc2-28 added the always-
  visible (disabled-until-played) primary, honest per-shape review, and accessible
  sizing/aria-live; rc2-29 added the colour-feedback layer (emerald-glow ✓ success,
  soft-rose ○ correction, additive palette tokens); rc2-30 added the on-screen
  route-failure diagnostic (viewId / requested URL / token / error / cause) + fixed
  renderPlaceholder to label each route correctly; rc2-31 fixed a template-literal
  OCTAL-ESCAPE SyntaxError in the chord feedback glyphs (`\2713`/`\25CB`/`\00a0` →
  `\u2713`/`\u25CB`/`\u00A0`) that broke #/chords on the live site. Lesson logged:
  script-mode `node --check` gives false passes; module-mode parse is now a
  mandatory release step (see step 7 below). Reserved/untouched: Musical Sight
  Reading isolated stub, timing/rhythm pillar, Scales, Cognitive Sight-Reading.

- **rc2-37 — Chord Masterclass teaching-flow (Phase 1, Unit 1 B major).** Turned the
  module from a card/Continue flow into a guided auto-flow: Teach → Demonstrate →
  Follow Me → Try Yourself → next shape now advance BY THEMSELVES once the demo has
  finished or the learner has played the chord correctly and the success glow has
  registered. Manual Continue remains ONLY at the three reflection boundaries (into
  Review, into Assessment, into Unit Review) and to restart/leave the unit — verified
  by logic sim: 17 auto transitions, 3 manual gates. Added calm pacing (demo→follow
  2.0s, follow→try 1.9s, try→next shape 2.3s with a "Next: …" transition cue; resume
  0.8s) — no pressure timer, no fail-on-slow, waits indefinitely on a slow learner.
  New lesson controls (additive): Pause (freezes the pending auto-advance and offers
  Continue as an override; never interrupts a demo — demo uses its own timer), Repeat
  (re-runs the current step / re-demos), Back (previous step). Skip stays subtle.
  Colour-feedback principle preserved (emerald glow / soft-rose correction). ONLY
  chordMasterclass.js changed (+ ?v= bump). Engine/evaluator/NoteInput/EventBridge/
  staff/keyboard untouched. Render/MIDI/audio behaviour flagged UNVERIFIED without a
  device — logic + module-mode parse verified headlessly only.

- **rc2-38 — Scales audio + two-octave LH notation (Scales-only, opt-in).**
  *Issue 1 (Listen crackle):* the only mode that self-sounds the scale is Listen; it
  fired `noteOn(midi, 90)` per column with no per-hand gain compensation, so Both-Hands
  doubled the simultaneous voice energy into the limiter. Fix lives only in
  `scalesMasterclass.listen()`: Listen self-playback velocity lowered to 72, with extra
  reduction to 52 when a column sounds two voices (Both-Hands). No synth internals
  touched; learner-play volume unchanged (separate path). Stacking was already prevented
  (self-cancelling toggle + `stopAll()` bumps the play token, clears timers,
  `panic()`+`allNotesOff()`).
  *Issue 2 (LH bass-clef ledger clutter):* in Both-Hands `forceVoiceClefs` pinned the
  LH (lower) voice to bass for the whole two-octave passage, so its top octave stacked
  up to 4 ledger lines above the bass staff. New OPT-IN `lowerClefSwitch` (staffView)
  lets the LOWER voice change clef per note ON ITS OWN STAFF: bass below middle C, a
  temporary treble clef at/above it, switching back on descent — verified by sim: clef
  change at C#4 up / B3 down, max ledger lines 4 -> 1, scale MIDIs unchanged. An inline
  clef glyph is drawn on the LH track at each change (overlay only — consumes no grid
  width, so the playhead/glide alignment is preserved). The flag is passed only by Scales
  Both-Hands (paint/Listen/Practice); SR, Chord and single-hand never pass it, so their
  behaviour is byte-identical (engrave's new `domStaff`/`forceAccidental` default to the
  old path).
  KEY-SIGNATURE RESTATEMENT — DELIBERATELY NOT SHIPPED: a restated 5-sharp B-major
  signature (~7.8 staff-spaces ≈ 1.7 columns at --col-w 4.6) cannot fit the uniform
  scroll grid without overlapping notes or breaking the glide. Instead the temporary-
  treble LH notes carry explicit (courtesy) accidentals, keeping them correctly readable.
  The full inline key-sig block remains a reported OPEN DECISION.
  ONLY scalesMasterclass.js + staffView.js changed (+ ?v= bump). B-major register
  (B3/B4/B5), scale generation, fingering, MIDI, evaluator untouched. Audio quality and
  the inline clef's exact vertical centring are DEVICE-VERIFY-ONLY (not renderable here).

- **rc2-39 — Scales Listen articulation fix + scoped warmer demo voice (code-only).**
  *Option A (shared synth release):* the "doot/cutoff" was the Voice stopping its
  oscillators while gain was still ~1% (a non-zero-sample click), plus a fragile
  `cancelScheduledValues`+`setValueAtTime(g.value)` re-anchor that could jump. New
  release uses `cancelAndHoldAtTime(t)` (with a `cancelScheduledValues`+re-anchor
  FALLBACK for browsers/mobile without it), an exponential tail to 0.0008, then a
  short LINEAR ramp to TRUE zero before the oscillators stop -> no end click. Benefits
  ALL synth use (learner-play, flourish, Listen, SR); `panic()`/`allNotesOff()` and
  voice cleanup/`onended` teardown preserved; no stuck notes (finite stopAt). This is
  an articulation bug fix, not a timbre change — the default voice is byte-identical.
  *Option B (scoped demo voice):* added an opt-in `tone` arg to `Voice`/`noteOn`;
  `tone==='demo'` builds a warmer, more piano-like voice (triangle+sine core, filter
  envelope bright->mellow over 0.26s, clean 4ms attack, faster 0.5s decay, low 0.22
  sustain, peak matched to default so no loudness jump). ONLY `scalesMasterclass.listen()`
  passes 'demo'. Learner key-press, the flourish, Chord (plays via keyboard->default
  voice), Foundations, and SR self-play all omit the arg -> default voice UNCHANGED.
  SR self-playback intentionally left on the default voice (not changed without report).
  ONLY synth.js + scalesMasterclass.js changed (+ ?v= bump). rc2-38 clef/notation fix,
  B-major register, scale notes/MIDI/fingering/evaluator untouched. FINAL AUDIO QUALITY
  (artifact gone? warmer? clean on 1-oct / 2-oct / both-hands?) is DEVICE-VERIFY-BY-EAR
  only — not renderable here.

- **rc2-40 — B major LH octave-boundary fingering fix (Scales-only).** Device report:
  two-octave LH B major showed the interior octave B as finger 4 instead of the thumb
  (1). ROOT CAUSE: `fingeringEngine.chainFingers` gated its "leading-finger-once"
  branch on `p[0] === 5`, so only the pinky-start LH scales (C/G/D/A/E/F) used it; B
  major LH starts on 4, fell into the RH-style cell-restart branch, and that re-anchored
  the octave tonic on the bottom finger (4) instead of the thumb. FIX: route ALL LH
  majors through leading-finger-once (bottom note plays the leading finger once; each
  octave above reuses the inner run, ending interior octave tonics on the thumb-side
  finger). The two branches differ ONLY at the octave boundary (`p[0]` vs `p[7]`), so
  this changes ONLY B major LH (boundary 4 -> 1); every other LH key has `p[0] === p[7]`
  and is byte-identical, and RH stays on cell-restart (verified by direct engine test:
  B LH 1-oct 4 3 2 1 4 3 2 1 unchanged; B LH 2-oct now 4 3 2 1 4 3 2 1 3 2 1 4 3 2 1;
  B RH, C/Db/F# LH all unchanged). ONLY fingeringEngine.js changed (+ ?v= bump). Scale
  notes, B-major register, MIDI targets, evaluator, notation/clef switch, audio, and
  scalesMasterclass.js are untouched — fingeringEngine is imported only by Scales.
  One-octave was already correct in source; the visible bug was the two-octave boundary.

- **rc2-41 — Scales Listen demo-voice articulation polish (Listen-scoped).** Third audio
  pass for the residual intermittent ping/click. Root suspects: the demo voice SNAPPED
  its filter to a high cutoff at t0 (a pitch-dependent onset transient) feeding the
  shared limiter on both-hands/overlap peaks. Fix — all inside the Voice `demo` branch
  (tone==='demo', Scales Listen only): (1) ONSET softened — the filter now starts mellow
  (fFloor) and BLOOMS up to fPeak over ~10ms, then settles (was an instant snap); fPeak
  base lowered 1700+v*3200 -> 1500+v*2600; amp attack 4ms -> 9ms. (2) RELEASE tightened
  0.30 -> 0.20s to cut tail overlap between consecutive notes (still musical, not
  staccato). NO velocity trim (goal was artifact removal, not loudness — left 72/52 as
  rc2-39). DELIBERATELY UNCHANGED: the shared limiter/compressor (threshold -6, ratio 12,
  attack 3ms, release 0.18), the default voice, and the shared release() fade-to-zero —
  so Chord, learner key-press, Foundations, SR self-play and the flourish are byte-
  identical. ONLY synth.js changed (+ ?v= bump). rc2-40 fingering, rc2-38 clef notation,
  B-register, evaluator untouched. Whether the ping is fully gone and the voice still
  reads warm/premium on 1-oct / 2-oct / both-hands is DEVICE-VERIFY-BY-EAR only.

## RELEASE CHECKLIST (canonical — run before reporting ANY build complete)
A correct source file is NOT sufficient; the shipped zip must be verified against
current source every release. Steps:
  1. Rebuild the zip FROM SCRATCH (`rm` the zip, then `zip -rq` fresh) — never
     update-in-place (incremental zip skips files whose mtime isn't newer).
  2. Verify chordMasterclass.js in the zip matches source.
  3. Verify changed docs (e.g. ROADMAP.md) are refreshed in the zip.
  4. Verify the cache/version token (?v=) is bumped whenever live behaviour changes.
  5. Confirm stale-file count (zip vs flat) is ZERO.
  6. Confirm the live route loads the intended module (app.js import token + the
     dashboard card link in index.html).
  7. MODULE-MODE PARSE every shipped JS module (browser-equivalent). `node --check
     file.js` parses as a non-strict SCRIPT and gives FALSE PASSES for errors that
     only surface when the browser loads the file as a strict ES module (it is
     loaded via `import()`). Verify each module the way the browser will:
       for f in *.js; do cp "$f" /tmp/m.mjs; node --check /tmp/m.mjs || echo "FAIL $f"; done
     (Equivalently `node --input-type=module --check` from stdin, or any real
     browser-module parse.) A clean script-mode `node --check` is NOT sufficient.

## Release-process lessons
- **rc2-31 — module-mode parsing is mandatory.** rc2-29 shipped CSS glyph escapes
  inside an `injectStyles` template literal as `content:"\2713…"` / `"\25CB…"` /
  `"\00a0"`. In a template string `\2…` / `\0…` are OCTAL escapes — illegal — so the
  browser threw `SyntaxError: Octal escape sequences are not allowed in template
  strings` and `#/chords` failed to load. `node --check chordMasterclass.js`
  (script mode) PASSED and hid it; a `.mjs` module-mode check reproduced the
  failure exactly. Fix: use `\u` escapes (`\u2713`, `\u25CB`, `\u00A0`) or literal
  glyphs in template literals; never backslash-digit. Verification now includes
  step 7 above. (The on-screen route-failure diagnostic in app.js — viewId /
  requested URL / token / error / cause — is what surfaced this from the device
  without dev tools; keep it.)

## rc2-47 — Master Training foundation (Stage 1 of the Learn build)
Foundation-only release: two new files, no live-behaviour change, no `?v=` bump.

- **progressStore.js (new)** — versioned local learning memory, namespace
  `keymaster.progress.v1`, SCHEMA_VERSION 1. `createProgressStore()` →
  `{ available, getAll, get, set, update, addToSet, has, incr, reset }`. Stores
  musical-learning state ONLY (current Learn lesson, completed lessons/cards,
  heard-narration ids, voice/keyboard/fingering prefs, opaque scales/chord/SR
  slots, supportLevel + attempts for later). Best-effort: probes localStorage,
  and on private-mode / corrupt JSON / unknown schema / write-throw it falls back
  to in-memory for the session and NEVER throws into a lesson. `available()`
  reports honestly whether anything persists. 25 headless unit tests pass
  (persistence across instances, dedupe, incr, reset, corruption recovery, schema
  reset, missing/unknown-field handling, no-LS + throwing-LS fallback).
  NOT yet wired into any module — it is the foundation Stage 2 (/learn) builds on.

- **tutorVoice.js (new)** — the rc2-46 SpeechSynthesis wrapper, generalised into a
  shared `createTutorVoice()` (identical implementation). Single source of truth
  for tutor voice across the app.

- **chordVoice.js (edited → thin re-export)** — now
  `export const createChordVoice = createTutorVoice;`. Chord Masterclass keeps
  importing `createChordVoice` from `./chordVoice.js`; verified `createChordVoice
  === createTutorVoice`, so rc2-46 Chord voice is behaviour-identical.

No tokens bumped (Chord behaviour unchanged; new files unreferenced until Stage 2).
Stage 2 = `/learn` route reusing the Foundations engine in a "learn mode" (voice
from lesson 1, masterclass bridges, course framing, progress wiring) + dashboard
"Master Training" CTA. Stage 3 = optional videoCue metadata + placeholder panel
(no video assets). Protected invariants confirmed intact: HAND_FLOOR LH 47,
amber chord cue, chord demo audio, Foundations okMsg (zero "Nicely done"), chord
voice, synth demo voice, Scales fingering, synth.js untouched.

## rc2-48 — Master Training Stage 2: the /learn route (tutor-led course)

The first **/learn** ("Master Training") route ships, making rc2-47 progressStore a live
consumer. /learn **reuses the Foundations engine** in "learn mode" (no copy): a new
`learn` VIEW_REGISTRY entry points `src` at `foundations.js`, and `learnMode = ctx.route
=== 'learn'` gates every addition. **/foundations runs every learn branch skipped and is
byte-identical to rc2-45.**

Added (learn-mode only):
- **Greeting** — pure `greetingFor(date, name)` (exported, unit-tested) from local device
  time: 05:00–11:59 morning / 12:00–17:59 afternoon / 18:00–04:59 evening. Shown at the top
  of /learn; spoken once per session, merged with lesson 1's intro so it isn't cut off.
  Name **hardcoded `LEARNER_NAME = 'Tim'` — NOT persisted** (progressStore stays personal-
  data-free). `getDisplayName` noted as the future production hook.
- **Voice** — `createTutorVoice()` speaks each lesson's first explanation + prompt; silent
  no-op when SpeechSynthesis is unavailable. `unlock()` on every control tap.
- **Memory writes** — `learnLesson` (on render), `foundationsCompleted` + `learnCompleted`
  (on Continue), `heardNarration` (on narration), `voiceOn` (on toggle). On enter, /learn
  **resumes** at the stored `learnLesson` and restores `voiceOn`.
- **Bridges** — inline buttons on the scale card → Scales and the chord card → Chords
  (learn-mode overlay keyed by card title; shared CARDS never mutated).
- **Voice on/off** toggle (persisted) and **Reset progress** (window.confirm-gated →
  `progress.reset()`, back to lesson 1, voice on).

app.js: imports `createProgressStore`, builds one `this.progress` in the constructor, passes
`ctx.route` + `ctx.progress`, adds `learn` to ROUTES / KEYBOARD_HIDDEN_DEFAULT /
FINGERING_HIDDEN_DEFAULT / MODULE_NAME, and `_updateLearnCta()` sets the dashboard CTA to
"Start Learning" or "Continue Learning · Lesson N". index.html: a brass **learn CTA** in the
dashboard header and a `data-view="learn"` section/slot.

**No duplicate persistence**: keyboard/fingering keep `kbHidden:`/`fingerHidden:`, lastView
keeps `keymaster.prefs.v1`; progressStore's overlapping `keyboardVisible`/`fingeringVisible`/
`route` fields remain unused. voiceOn is Learn-only this stage — Chord (rc2-46) stays
session-only and untouched.

Tokens bumped rc2-46 → rc2-48 (app.js + index.html). progressStore.js / tutorVoice.js /
chordVoice.js unchanged from rc2-47.

**Device-verify-only**: all rendering, spoken voice, demo audio, greeting-by-local-time,
greeting-not-repeated, and bridge navigation. The rc2-44/45/46 by-ear voice/audio checks
remain the gate, since /learn leans on the same browser TTS.

**Deferred to the next Learn stage**: Lessons "Clefs and hands" + "First reading idea" and a
Sight-Reading bridge (must use a learn-only overlay, never the shared CARDS). Then Stage 3 =
videoCue metadata + placeholder panel (no assets).

## rc2-49 — Master Training: tutor voice fix + visible voice diagnostic

**Root cause of the silent tutor on Android/PWA:** the greeting's `voice.speak()` ran inside
`enter()`, which executes *asynchronously after* the hash navigation (CTA click → hashchange
→ _handleRoute → _enterView → enter). By then the mobile user-gesture token had expired, so
SpeechSynthesis silently ignored the first utterance. `unlock()` only fired on later in-/learn
taps — after the greeting had already failed. Desktop is lenient, so it "worked" there and
headlessly showed no error.

**Fix (learn-mode only; /foundations untouched):**
- The greeting+intro is now *queued* (`pendingGreeting`) and spoken from **inside a user
  gesture** — a new **"Start tutor voice"** button, or the first Continue/Back/Replay/key tap.
  This is the canonical Android autoplay fix. If voice was already unlocked earlier in the
  session, it speaks immediately on enter.
- **Visible voice status** (the tutor must never fail silently): "unavailable / muted /
  Tap Start to let the tutor speak / ready", driven by real `available()` + `isEnabled()` +
  `isUnlocked()` state.
- `tutorVoice.js` (additive, backward-compatible): exposes `isUnlocked()` and warms up the
  (async) voice list. Chord is unaffected — it uses the unchanged speak/cancel/unlock API and
  reaches the wrapper via the untouched `chordVoice.js` re-export.

`foundations.js` now imports `./tutorVoice.js?v=rc2-49` so the updated wrapper is fetched in
/learn (its only changed dependency). NOTE: bump that import token whenever tutorVoice changes.
Tokens rc2-48 → rc2-49 (app.js + index.html).

**This is the voice phase only.** The visual tutor cockpit (interactive Black-keys / Find-C /
Middle-C / B, SVG/CSS keyboard cues, self-centering focus) is the next build, to be built on a
device-confirmed-working voice rather than blind. **Device-verify-only:** spoken voice, the
status text transitions, greeting-by-local-time, and that the first gesture unlocks speech.

## rc2-50 — Master Training becomes the curriculum (interactive, proficiency-gated) + dashboard IA

**Master Training (/learn) is now the guided course, not a card deck.** It gets its own
14-step curriculum, `LEARN_STEPS` (exported), selected by `const steps = learnMode ?
LEARN_STEPS : CARDS`. The shared `CARDS` array is never mutated, so **/foundations stays
byte-identical** (steps === CARDS in plain mode; every learn behaviour is behind `if
(learnMode)`).

**Curriculum (14 steps):** meet the keyboard · low/high · black-key groups of two · groups of
three · find C · exact Middle C · B below Middle C · up/down direction · first scale idea ·
→ Scales Masterclass · first chord idea · → Chord Masterclass · first reading idea · →
Cognitive Sight-Reading. Early steps are genuinely interactive (watch → listen → try →
feedback), reusing the proven `onNote` + `complete/guide/neutral` engine.

**New interaction + teaching:**
- New `oneof` mode — "tap any one of the highlighted keys" (group of two = C♯/D♯; group of
  three = F♯/G♯/A♯).
- **Proficiency gate:** in learn mode an interactive step holds **Continue** (disabled) until
  the task is done. Gentle escape so the learner is never trapped — unlocks after a few
  attempts or a 22 s failsafe. Explanation/bridge steps continue freely.
- **Controls:** added **Pause** (silence voice/demo) and **Repeat** (re-demonstrate: re-sound
  + re-speak) to the learn row; footer keeps Back/Continue; show area keeps Hear-it-again;
  Start tutor voice / Voice / Reset as before.
- **Visual cues:** on-screen amber pointer **labels** ("group of two", "this is C", "Middle C")
  + the existing amber target highlight + a `[data-view="learn"]`-scoped breathing **glow**
  (mirrors the rc2-43 chord cue exactly; Scales/Chord/Foundations untouched) + the existing
  `viewport.frame()` keyboard centering.
- **Self-centering:** a gentle `scrollIntoView({block:'nearest'})` on step change.
- Step-level `bridge` doorways into the three practice rooms.

**Dashboard IA:** Master Training is now the **hero** CTA ("Master Training · the guided
course" → Start Learning). The masterclasses sit under a secondary **"Practice rooms"**
heading. The Foundations card is **removed from the grid** (absorbed into the path); the
`/foundations` route is unchanged and still reachable via the hint link.

Tokens rc2-49 → rc2-50 (app.js + index.html, incl. keyboard.css link). `tutorVoice.js` was
unchanged this release, so foundations' import token stays `?v=rc2-49` (convention: an
intra-module import token tracks the version that dependency last changed).

**Deferred (needs device-tuned positioning — too risky to build blind):** SVG brackets /
arrows / pointers from black keys to C, and staff↔keyboard reading graphics. Next polish pass.

**Device-verify-only:** all on-screen rendering (labels, glow, gated button), the scroll/
self-centering feel, spoken voice (rc2-49, still awaiting your confirmation), demo audio,
the proficiency-gate pacing, and bridge navigation.
