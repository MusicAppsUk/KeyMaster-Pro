# KeyMaster PRO — Local Audio Architecture Plan

*Companion to ALPHA_PLAN.md. Plan only — nothing here is implemented yet, and
none of it touches the current Scales audio or shared synth.*

Two future, fully-local, dependency-free audio subsystems:
**(1)** a sample-based premium piano tone, and **(2)** a pre-rendered tutor-voice
player. Both run on the native Web Audio API only — no runtime libraries, no CDN,
no streaming APIs, no live AI calls, no exposed keys.

---

## PART 1 — Premium piano tone (sample-based engine)

### Goal
A warm, real-piano tone for the Course/keyboard, built from a **small** set of
local samples that are pitch-shifted to cover all notes — not 88 individual files.
Implemented as a **separate, opt-in voice**, leaving the current synth and Scales
audio completely untouched until it's proven.

### Licensing findings (verified, not assumed)
- **Salamander Grand Piano V3 (Alexander Holm)** — **CC-BY 3.0**. Commercial use
  permitted *with attribution* and an indication that changes were made. Yamaha C5,
  sampled in **minor thirds** (every 3 semitones) — which is ideal for low-artifact
  pitch shifting. Ogg Vorbis and reduced-size repacks exist. **Recommended source.**
- **FluidR3 (Frank Wen)** — **MIT**. Commercial use permitted with the copyright
  notice included. *Caveat:* the author's stated wishes ask that it not be locked
  behind a paywall / treated as a commodity — a yellow flag for a premium product.
  General-MIDI soundfont; piano is decent but not a featured-grade tone.
- **Hard rule (yours):** assume nothing is CC0 or commercial-safe until the licence
  of the *exact files we bundle* is checked. Many repacks relabel licences
  incorrectly. Before bundling: confirm provenance, keep the LICENSE text, add
  attribution in an in-app credits screen, and note our modifications (downsample/
  convert/trim).

### Engine design (native Web Audio)
- **Base-sample map, not 88 files.** Load ~12–16 samples spanning A0–C8 (roughly
  one every 3–4 semitones, single mf velocity layer to start). With minor-third
  source sampling, every target note is at most ~1.5 semitones from a base sample,
  which keeps `playbackRate` shifting clean.
- **Note-on:** pick the nearest base sample, create an `AudioBufferSourceNode`, set
  `playbackRate = 2 ** ((targetMidi - sampleMidi) / 12)` for pitch, route through a
  per-voice `GainNode` → shared master → existing `AudioContext` destination.
- **Click-free envelope:** short attack ramp (~3–5 ms) via
  `gain.linearRampToValueAtTime`; on note-off, a release ramp (~120–200 ms) with
  `setTargetAtTime`, then `source.stop()` after the tail. No abrupt cuts.
- **Polyphony management:** cap active voices (e.g. 16–24) in a `Map` keyed by note;
  steal the oldest when exceeded; guard double note-ons and stray note-offs.
- **Shared AudioContext:** reuse the app's existing context (the same unlock-on-
  gesture path already used), so there's one context and the mobile autoplay
  unlock keeps working. **No second context, no change to Scales audio.**
- **Lazy + cached:** decode buffers on first use, cache them; optional preload of
  the most-used mid-range samples to avoid first-note latency.

### File structure (proposed)
```
/audio/piano/
  manifest.json        // { "48": "C3.ogg", "51": "Eb3.ogg", ... }  midi -> file
  C3.ogg  Eb3.ogg  Gb3.ogg  A3.ogg  ...   // ~12–16 compressed base samples
  LICENSE.txt          // Salamander CC-BY 3.0 text + attribution + "modified"
/js/audio/
  premiumPiano.js      // the engine (separate module; default OFF)
```
- **Format:** Ogg Vorbis (well-supported on Android/Chrome, your platform) or
  AAC/MP3 for broad coverage; ~12–16 files at small sizes = a light download.

### Integration & safety
- New module, **opt-in**, selected as an alternate "voice." Default stays the
  current synth until the piano engine is judged good on device.
- Touches nothing in Scales audio, the limiter, masterclasses, or the shared synth
  path. Purely additive.

### Risks
- Bandwidth/size on GitHub Pages (mitigated by small base map + compression).
- First-note decode latency (mitigated by preload).
- Pitch-shift artifacts at extreme ranges (mitigated by minor-third base spacing).
- Licence compliance: must ship attribution + LICENSE and verify file provenance.

### Deferred (later, not alpha)
Multiple velocity layers, release/pedal/string-resonance samples, true dynamics.

---

## PART 2 — Pre-rendered tutor-voice player

### Goal
Play warm, premium tutor lines from **local pre-rendered audio**, keyed by stable
curriculum IDs, with captions always present and browser TTS only as a fallback.

### Design
- **Stable line IDs** (curriculum-keyed), e.g.:
  `welcome-back`, `listen-first`, `now-you-try`, `try-again`, `lesson-complete`,
  `middle-c-correct`, `find-c-hint`, `low-high-explain`. These map 1:1 to the
  tutorAudio IDs the Course already emits.
- **Manifest/dictionary:** `voice-manifest.json` maps each ID →
  `{ file, caption }`. Captions render regardless of audio (accessibility + fallback).
- **Local compressed files** in `/audio/voice/` (Ogg/MP3). No live API, no keys,
  no streaming.
- **Sequencing:** play lines in order via `onended` chaining (the Course already
  threads completion callbacks, so demos wait for speech — no overlap).
- **Stop/cancel:** stop the current source and clear the queue on navigation,
  reset, or learner input.
- **No overlap with the piano demo:** routes through the same "tutor speaking" gate
  that already gates demonstrations.
- **Fallback:** if an asset is missing, fall back to browser TTS (current behaviour)
  with captions still shown.

### File structure (proposed)
```
/audio/voice/
  voice-manifest.json
  welcome-back.ogg  listen-first.ogg  now-you-try.ogg  ...
  LICENSE-or-rights.txt   // recording contract or TTS commercial-redistribution proof
/js/audio/
  premiumVoice.js         // thin player behind tutorAudio; TTS fallback preserved
```

### Licensing
- **Recorded human:** we own it via a work-for-hire/buyout contract — cleanest.
- **Licensed neural TTS:** confirm the licence explicitly allows bundling/redistrib
  of the rendered audio inside a shipped product. **Report-first decision (yours).**

### Risks
- Rights confirmation before bundling (above).
- Keeping IDs stable as the curriculum grows (manifest-driven, so manageable).

---

## Proof-of-concept stance
A POC is only worth doing once a direction is chosen. If desired, the **safest** POC
is the piano engine as a **fully-separated module loaded on an isolated test page**
(not wired into the live Course, not touching the synth or Scales audio). I will not
build any of this until you say so — this is a plan, as requested.

## Effect on alpha readiness
- Neither subsystem blocks the *software* candidate.
- The **voice player** + a first batch of real lines is the bigger lever for an
  alpha that "sounds premium." The **piano tone** is a quality upgrade that can
  follow, since the current synth already works.
- Both are additive and reversible; the default experience is unaffected until each
  is explicitly switched on.
