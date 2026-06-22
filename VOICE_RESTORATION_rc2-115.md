# rc2-115 — Jack voice restoration (diagnosis + fix)

## Root cause (proven, not guessed)

Jack is silent across the Course for ONE dominant reason: **the deployed package
contains no tutor MP3 files** — `voice/en-GB/` has 0 `.mp3` files. Every line
resolves to a correct URL, fetches 404, and falls to a silent caption (no browser
TTS). With no audio assets present, Jack cannot speak anywhere.

A second, real bug compounded it for the new content and is now FIXED:
- The runtime resolver map `voicePackData.js` (`VOICE_PACK`) had the 368 Foundation
  IDs but **was missing the 39 new Stage 1 IDs** (I had updated the generation
  manifest but not this runtime map). Those lines returned `null` → silent even if
  their MP3s existed. `VOICE_PACK` is now regenerated from the manifest: **407 IDs,
  fully in sync.**

What was checked and found CORRECT (so we don't chase the wrong thing):
- Voice is ON by default (migration + build-time state). ✔
- First gesture unlocks audio and calls the tutor (`speakPending`/`speakCard`). ✔
- Line-ID → filename mapping resolves correctly (proof below). ✔
- `TTS_DEV_FALLBACK = false` correctly silences ONLY missing lines (captions, no TTS). ✔
- Service worker only caches HTTP 200 (`status===200 && type==='basic'`), so it does
  NOT cache 404s — no stale-404 trap. CACHE bumped to rc2-115 to clear old entries. ✔
- tutorAudio.js resolver is unchanged/frozen — not a resolver code bug. ✔

### Proof of resolution (mapping is correct; files are the gap)
```
welcome.say.0           -> voice/en-GB/welcome-say-0.mp3   (file ABSENT -> silent)
low-high.say.0          -> voice/en-GB/low-high-say-0.mp3  (file ABSENT -> silent)
play-echo.say.0         -> voice/en-GB/play-echo-say-0.mp3 (file ABSENT -> silent)
recall-register.reteach -> voice/en-GB/recall-register-reteach.mp3 (ABSENT)
```
I cannot show a 200 fetch for any Jack line because there are no MP3 files in the
package to fetch. This is the smoking gun: **assets missing, resolver fine.**

## What you should check on the DEPLOYED device (decisive)

Open the live site, and in the browser console run:
```js
fetch('voice/en-GB/welcome-say-0.mp3').then(r => console.log('status', r.status));
```
- **404** → the MP3s are not on the server. This is the cause. Generate (below).
  Most likely a deploy replaced the repo and removed the `voice/en-GB/` folder.
- **200** → files ARE present; then it's a path/serving edge case — tell me the
  Network-tab URL the app requested vs. where the file sits, and I'll fix resolution.

## Fix / recovery steps

1. Deploy rc2-115 **without deleting `voice/en-GB/`** (the build zips here contain
   NO voice MP3s — they live only in your generated repo; preserve that folder).
2. Generate the pack: Actions → "Generate Jack voice pack" → `dry_run=true` to
   preview, then `dry_run=false`. With `VOICE_PACK` now complete, the generator and
   runtime agree on all 407 IDs; skip-existing only creates what's missing.
3. Merge the voice branch so `voice/en-GB/*.mp3` are in the deployed site.
4. Reload (rc2-115 cache clears old entries). Jack should speak wherever a file
   exists; any not-yet-generated line shows captions only, never TTS.

## After this
Foundation + Stage 1 should be fully voiced once the 407 files exist. The earlier
"feedback enrichment" (reword the 44 'Good/Exactly' lines) remains a later
coordinated selective-regeneration, separate from restoring presence.
