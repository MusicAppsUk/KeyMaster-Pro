# KeyMaster PRO — Course Piano Sound: premium sampled/hybrid plan

## Current state (honest)

The Course note sound is `pianoVoice` — a stable, synchronous WebAudio synth.
It is the PROTECTED stability fallback: it never fails, starts instantly, and
powers Hear it / Hear it again / manual keypress today. It is NOT the final
premium sound — it is a synth, not a piano.

A sampler already exists (`courseVoice.js`, 16 original synth-rendered samples in
`audio/course/`), but it is bypassed for the demo because earlier attempts to make
it the demo path caused silence / double-attack / delay (the rc2-105→107
firefight). Swapping it in tonight would NOT deliver a premium piano (its samples
are still synth) and would risk the working path — so this is a design + plan,
to be built and **device-tested in isolation**, not shipped blind.

## Target approach: real samples + hybrid + safe fallback

1. **Real, public-domain piano samples.** Use University of Iowa MIS piano
   (public domain — see SAMPLE_LICENSE.md) as the cleanest legal source. Sample
   sparsely (e.g. every 3rd semitone), normalise, trim silence, and encode small
   mobile-friendly files (mono, ~32–48 kbps OGG/MP3). Target total < ~1–1.5 MB so
   it is cache- and tablet-friendly. Document provenance per file.
2. **Hybrid voicing.** Pitch-shift each sample to its neighbours (±1 semitone)
   for naturalness; layer a faint synth body underneath only if needed for warmth.
   Soften the high register (reuse the existing demo velocity roll-off) so nothing
   is piercing.
3. **Course-only.** This layer is used ONLY by the Course demo. It does not touch
   `synth.js` / `scaleEngine.js` (Scales audio stays frozen) and does not change
   Scales Masterclass.

## Safe switch + fallback architecture (no silence possible)

- A flag `COURSE_SAMPLED_VOICE` (default **false**). False = today's exact
  pianoVoice path, byte-identical.
- When true, the demo plays each note through the sampler **with a per-note
  fallback**: `if (sampler.ready && sampler.has(note)) sampler.play(note); else
  piano.noteOn(note)`. Because the fallback is per-note and synchronous, a missing
  or still-loading sample can never cause silence (the failure mode that broke
  rc2-105) — the worst case is a single pianoVoice note.
- Preload/warm the buffers on first user gesture; show "Preparing sound…" only if
  buffers are still loading when a demo is requested (never a silent tap).
- Hear it / Hear it again call the same demo function, so they inherit the same
  fallback automatically — the working path is preserved.

## Why it is not wired tonight

- The premium gain requires REAL samples, which need network access to fetch and
  process — not available in this environment.
- Audio cannot be heard or latency-tested here; the earlier instability came
  precisely from shipping untested audio-path changes. The discipline learned:
  build the sampled layer in isolation and device-test it the same session.

## Recommended next step (one isolated build)

Fetch + process the Iowa MIS samples → drop into `audio/course/` → add the flag +
per-note-fallback wiring → ship with flag OFF → you flip it on to A/B against
pianoVoice on the tablet (listening for warmth, no crackle/pop/double-attack, and
sub-second start). Promote to default only after it passes on-device.
