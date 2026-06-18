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
