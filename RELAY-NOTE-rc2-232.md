# Relay Note — rc2-232

**Build:** rc2-231 → **rc2-232**, the new app icon.
**Cumulative:** this package also contains everything in rc2-230 and rc2-231, so it goes on top of whichever of rc2-229 or rc2-231 is live. If you haven't uploaded rc2-231 yet, upload this one instead and skip rc2-231.

## What changed

| | Before | Now |
|---|---|---|
| App icon | Gold K on black | Tim's choice **B**: white K with a powder-blue arm on deep navy, in the app's own colours |
| Home-screen icon on Android | Same art | Full-bleed navy version, K kept inside Android's safe zone so it is never clipped |
| iPad icon (apple-touch) | Same art | Square navy version (iPad rounds the corners itself) |
| Launch screen and status-bar colour | #14131A (near-black, off-palette) | #15213A, the app's own navy |
| App description (shown when installing) | "A cognitive piano-training studio: scales fluency and sight-reading resilience." | "Learn properly. Progress intelligently. A piano course that builds real musicianship." |

Nothing else changed: no code, no audio, no lessons.

## Verification — MACHINE-VERIFIED
Full harness suite green (check-engraving, check-rc2-230, test-staffviz-diff, test-staffviz, smoke-render-all, verify-kl2a-build, validate-kl2a, audit-musical-consistency, feedback-toggle, aural-strand, scale-octaves, scales-masterclass, derive-fingering, fingeringTests, chord-dictionary, chord-library, cadences, arpeggio-masterclass); check-versions 0 errors; manifest.json parses. The package is proven by overlaying it on the rc2-229 source. Protected hashes unchanged.

## Install
Main folder (19 files): the 13 from rc2-231 (`app.js` `cockpit.css` `courseChapters.js` `courseFoundation.js` `courseKeyLevel2.js` `courseKeyLevel4.js` `foundations.js` `index.html` `progressStore.js` `pwaUpdate.js` `staffViz.js` `sw.js` `voiceTest.js`) plus `manifest.json` `icon-180.png` `icon-192.png` `icon-512.png` `icon-maskable-192.png` `icon-maskable-512.png`.
`tools` folder: as rc2-231 (the `check-versions.mjs` here expects rc2-232).
**Rollback (icon only):** the old icons and manifest are in `tools/rollback/icons-rc2-231/`.

## Tablet check
1. Badge reads **rc2-232**.
2. **The home-screen icon:** tablets often keep the old icon. If it is still gold, remove KeyMaster from the home screen and add it again from the browser menu. **If the tablet asks whether to also delete the app's data, say no**, otherwise saved progress on that tablet would be lost.
3. The new icon is navy with a white K and a blue arm, not clipped at the edges.
4. Then checklist M from the rc2-231 note (the Engraver's pass), if not already done.
