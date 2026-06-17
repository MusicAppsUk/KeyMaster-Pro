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
