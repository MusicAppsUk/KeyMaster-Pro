# KeyMaster PRO — Voice Regeneration Checklist (definitive)

Jack's spoken lines are pre-generated MP3s. The generator **skips files that
already exist**, so changing a line's *text* will NOT re-record it. Any line whose
text changes must be force-regenerated, or its old MP3 deleted first — otherwise
Jack keeps speaking the old words under the new caption.

## Mechanism (pick one, per changed id)

- **Delete-then-generate:** remove the specific `voice/en-GB/<id>.mp3` files for the
  changed lines, then run the normal generation (skip-existing will now re-create
  exactly those).
- **Selective force flag (preferred):** add a `--only=<id-prefix>` / `FORCE_IDS`
  option to `tools/generate-jack.mjs` that regenerates only the listed ids and
  leaves every other file untouched. Safer than a global `--force` (which would
  re-bill the whole pack and risk drift). This keeps regeneration **additive and
  scoped**, consistent with the project rule.

> Never run a blanket re-record. Only the ids listed for a given pass.

## Line-id reference (what maps to audio)

For a step with id `X`:
- `X.say.0`, `X.say.1`, … — the spoken teaching beats (from the step's `say[]`).
- `X.explain` — spoken only when a step has **no** `say[]` (explain[0]+tryPrompt).
- `X.correct`, `X.correct-retry` — the spoken confirmation (from `okMsg`).
- `X.reteach`, `X.miss` — the calm second-try lines (from `reteach`).
Greeting: `greeting.morning|afternoon|evening`, `greeting.back.morning|…`.

## Regeneration backlog (grouped)

### A. Course introduction
- [ ] `welcome.say.*` — optional: re-record to the fuller professorial intro
      (currently the existing welcome beats play; on-screen intro already updated).
- [ ] `greeting.morning|afternoon|evening`, `greeting.back.*` — named time-of-day
      greeting (not in the pack yet; today the welcome beats cover the start).

### B. Stage titles + boundary lines (the naming alignment pass)
Re-record together with the display rename so screen + audio always agree:
- [ ] `stage1-complete.say.*`  → "Foundation complete…"
- [ ] `stage2-welcome.say.*`   → "Welcome to KeyMaster Stage 1 — Making Music…"
- [ ] `stage2-onward.say.*`
- [ ] `s3-welcome.say.*`       → "KeyMaster Stage 2 — Reading and Playing…"
- [ ] `s3-onward.say.*`
- [ ] `s4-welcome.say.*`       → "KeyMaster Stage 3 — Two Hands…"
- [ ] `s4-onward.say.*`

### C. Foundation spoken rewrites (Warm Precision) — proposed
On-screen text for these is already improved; the SPOKEN versions to match:
- [ ] `low-high.say.*` → e.g. "Keys to the left sound lower and deeper. Keys to
      the right sound higher and brighter. Touch a low note, then a high note, and
      hear the difference."
- [ ] `low-high.correct` (okMsg) → "That is the shape of the keyboard — low to the
      left, high to the right."
- [ ] `black-keys-two.correct`, `black-keys-three.correct` → fewer "Good"s; e.g.
      "That's the pair — your first anchor point." / "That's the group of three."
- [ ] `find-c.say.*` / `find-c.correct` → "Middle C is a landmark. We'll use it to
      help the eye find its place." / "That's C, just left of the two black keys."

### D. Feedback lines (reduce "Good"/"Exactly" repetition)
- [ ] Audit all `*.correct` / `*.correct-retry` for repeated "Good"/"Exactly";
      re-record the worst offenders with the Warm Precision set (see app copy).

### E. KeyMaster Stage 1 (Making Music) lines
- [ ] New spoken lines for any Stage 1 studies/exercises added later
      (`study-morning-steps.say.*`, `call-response.say.*`, etc.).

## Process per pass
1. Freeze the final text in `tools/voice-lines.json` (captions = audio).
2. List the changed ids (above).
3. Delete those MP3s **or** run `--only=<ids>`.
4. Generate; verify file count + spot-listen.
5. Ship display + audio in the same build (no mismatch window).

## UPDATE (rc2-110): KeyMaster Stage 1 study lines are LIVE and queued

Three live Stage 1 steps shipped (`play-echo`, `study-steps`, `study-qa`). Their
spoken lines are **new ids** (no MP3 exists yet), so normal generation CREATES
them — no force/delete needed. Until generated, captions carry Jack (no TTS); the
musical demo plays via pianoVoice. New ids added to `tools/voice-lines.json`:
- `play-echo.say.0`, `play-echo.say.1`, `play-echo.correct`, `play-echo.correct-retry`
- `study-steps.say.0`, `study-steps.say.1`, `study-steps.correct`, `study-steps.correct-retry`
- `study-qa.say.0`, `study-qa.say.1`, `study-qa.correct`, `study-qa.correct-retry`

To voice them: run the normal generation (dry-run first), then `dry_run=false`.
These are additive; existing files are untouched.

## UPDATE (rc2-111): three more live Stage 1 steps queued

`call-response`, `chord-warm`, `study-tune` shipped live. New ids in the manifest
(captions carry them until generated; no TTS):
- `call-response.say.0/1`, `call-response.correct`, `call-response.correct-retry`
- `chord-warm.say.0/1`, `chord-warm.correct`, `chord-warm.correct-retry`
- `study-tune.say.0/1`, `study-tune.correct`, `study-tune.correct-retry`
All new ids → normal generation creates them (additive; no force/delete).
