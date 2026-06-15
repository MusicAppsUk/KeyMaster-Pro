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
