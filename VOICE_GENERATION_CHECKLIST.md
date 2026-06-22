# KeyMaster PRO — Definitive Voice Generation Checklist

## 1. Why Jack disappears after the early stages (diagnosis)

Jack's lines are pre-generated MP3s served from `voice/en-GB/`. A missing MP3
falls to **captions only** (silent, paced by reading time) — never browser TTS.

The Foundation pack was generated earlier, so Jack speaks there. The KeyMaster
Stage 1 content added in rc2-110 → rc2-114 (the studies, the Making-Music
chapters, "Bring it back", and the recall-support lines) has its line IDs in the
manifest but **its MP3s were never generated** — so Jack goes caption-silent
exactly when the learner reaches that newer material.

Verified this build:
- Every one of the 105 steps HAS voice coverage in code (100 with spoken beats,
  5 explain-only); `speakCard` runs on every step. **No code/logic gap.**
- The manifest is **complete**: all 401 line IDs the steps request are present.
- The gap is purely **39 ungenerated MP3s** (listed below).

## 2. The 39 line IDs to generate (the gap)

These are NEW ids — normal generation creates them (skip-existing leaves your
existing Foundation MP3s untouched). No selective/force flag needed.

```
play-echo.say.0  play-echo.say.1  play-echo.correct  play-echo.correct-retry
study-steps.say.0  study-steps.say.1  study-steps.correct  study-steps.correct-retry
study-qa.say.0  study-qa.say.1  study-qa.correct  study-qa.correct-retry
call-response.say.0  call-response.say.1  call-response.correct  call-response.correct-retry
chord-warm.say.0  chord-warm.say.1  chord-warm.correct  chord-warm.correct-retry
study-tune.say.0  study-tune.say.1  study-tune.correct  study-tune.correct-retry
recall-register.say.0  recall-register.say.1  recall-register.correct  recall-register.correct-retry  recall-register.reteach
recall-middlec.say.0  recall-middlec.say.1  recall-middlec.correct  recall-middlec.correct-retry  recall-middlec.reteach
recall-echo.say.0  recall-echo.say.1  recall-echo.correct  recall-echo.correct-retry  recall-echo.reteach
```

## 3. How to generate (additive, safe)

1. Confirm `ELEVENLABS_API_KEY` exists in the repo's GitHub Actions secrets.
2. Actions → "Generate Jack voice pack" → run with `dry_run=true` (preview the
   ~39 new lines, no cost).
3. Run again with `dry_run=false` → generates ONLY the missing 39 (skip-existing
   protects the rest), pushes the voice branch.
4. Merge the branch, deploy, and test Stage 1: Jack should now speak throughout.

## 4. CRITICAL — preserve your existing voice MP3s on deploy

The build packages here **do not contain `voice/en-GB/*.mp3`** (0 files in this
working copy — they live only in your generated repo). When you deploy a build
zip, **do not delete or overwrite your `voice/en-GB/` folder**, or Jack will go
fully silent. Overlay the app files; keep the voice folder. Then generate the 39.

## 5. Later, coordinated: feedback-enrichment (selective regeneration)

Separate from the gap above. 44 of 86 confirmation lines currently open with
"Good / Exactly / Great". To make Jack teach rather than approve, those should be
reworded (e.g. "That is the shape of the keyboard — low to the left, high to the
right") AND re-recorded together. Because they already have working MP3s, this is
a **selective regeneration** (delete those specific MP3s or use a `--only=<ids>`
flag) shipped WITH the new captions — never caption/audio mismatch on your working
Foundation audio. Not done tonight precisely to avoid breaking your working pack;
queued as a coordinated pass.
