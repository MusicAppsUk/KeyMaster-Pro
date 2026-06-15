# KeyMaster PRO (flat build)

A client-side, modular piano-training studio. This build uses a **flat layout** —
every file sits in the repo root and all imports are relative — so it deploys to
GitHub Pages with no pathing (404) errors.

## Deploy on GitHub Pages
1. Upload every file in this folder to the repo root (same level as README).
2. Repo **Settings → Pages → Branch: main → Save**.
3. Open the URL Pages gives you. The dark launcher and a playable keyboard load.

## Run locally
Serve over HTTP (ES modules don't load from a file:// URL):
```
python3 -m http.server 8000   # then open http://localhost:8000
```

## Files
- `index.html` — app shell (loads `app.js`)
- `manifest.json` — PWA config
- JS modules: `app.js`, `notes.js`, `scaleEngine.js`, `fingeringEngine.js`,
  `pianoEngine.js`, `viewport.js`, `midiRouter.js`, `audioContext.js`,
  `synth.js`, `scheduler.js`, `metronome.js`
- CSS: `theme.css`, `keyboard.css`, `notation.css`

## Known gaps (expected)
- `manifest.json` / `index.html` reference icon images that aren't included yet —
  harmless 404 until added.
- The Scales and Sight-Reading vectors show a placeholder; the keyboard is fully
  playable. Their controllers are the next build step.
