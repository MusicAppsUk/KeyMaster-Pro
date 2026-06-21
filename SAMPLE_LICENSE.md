# KeyMaster PRO — Course teaching-piano samples: licence & provenance

## Current samples (shipped in `audio/course/note-*.mp3`)

**Status: 100% original. No third-party content. No licence obligation.**

The 16 Course teaching-piano samples are generated offline by KeyMaster's own
tooling (`tools/generate-course-samples.mjs`) using additive synthesis — a
fundamental plus a small set of harmonically-related partials with a soft attack
and a piano-like decay, rendered to PCM and encoded to MP3. They contain no
recorded audio and no material from any external sample library, so there is
**no attribution requirement and no licensing constraint**. They are owned by
the project and free to embed and ship commercially.

- Count: **16 samples**, midi C2–C7 every 4 semitones (36,40,…,96)
- Format: mono MP3, 32 kHz, 64 kbps
- Total size: **~256 KB**
- Reproducible via `node tools/generate-course-samples.mjs` (no network needed)

The runtime sampler (`courseVoice.js`) maps each played note to the nearest
sample and repitches by at most 2 semitones, so the full Course range is covered
cleanly from this small set.

## If a more realistic piano timbre is wanted later (reference only — NOT used)

These were investigated for a possible future real-piano layer. Neither is used
in the current build.

- **University of Iowa Musical Instrument Samples (MIS piano).** Placed in the
  **public domain** by the University of Iowa Electronic Music Studios — freely
  usable commercially with no attribution legally required. Steinway grand, every
  note sampled at three velocities. Cleanest legal option for a real-piano upgrade.
  (Verify current wording at theremin.music.uiowa.edu before embedding.)
- **Salamander Grand Piano (Alexander Holm).** Licensed **CC BY 3.0** — usable
  commercially **but attribution is required**, and the full set is large
  (~1 GB uncompressed, sampled every minor third, 16 velocity layers); it would
  need heavy trimming/downsampling for a mobile web build. Some redistributions
  claim a later public-domain release, but the canonical licence is CC BY 3.0, so
  treat attribution as required unless a clear public-domain grant is confirmed.

Any future real-piano layer would be additive to (not a replacement of) the
protected Scales audio, and would reuse the same `courseVoice.js` sampler engine.
