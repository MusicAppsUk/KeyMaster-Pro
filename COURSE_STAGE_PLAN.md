# KeyMaster PRO — Stage naming & chord-development plan

## 1. Stage naming alignment (target)

| Internal (current) | User-facing name (target)                         |
|--------------------|---------------------------------------------------|
| stage 1 content    | **Foundation Course**                             |
| stage 2 content    | **KeyMaster Stage 1 — Making Music**              |
| stage 3 content    | **KeyMaster Stage 2 — Reading and Playing**       |
| stage 4 content    | **KeyMaster Stage 3 — Two Hands & the Grand Staff** |
| future             | **Stages 4–8** (scales, arpeggios, chords,
inversions, cadences, sight-reading, theory-in-action, repertoire, performance)|

Rule: **"Reading and Playing" is never Stage 1.** It is KeyMaster Stage 2.

### Why this isn't fully flipped live tonight (evidence)

The stage-boundary narration is **spoken Jack audio** ("That's Stage 1 complete…",
"Welcome to Stage 2…") with existing MP3s. Renaming the *display* without the audio
would make Jack say "Stage 2" while the screen says "KeyMaster Stage 1" — a mismatch.
And the voice generator skips files that already exist, so changed text won't
re-record without a deliberate regeneration of those specific lines.

So the rename is a **coordinated change**, done in one pass:
1. Update display labels (eyebrow/title/courseMap titles) — safe, no audio.
2. Update the spoken stage-boundary lines' text in `tools/voice-lines.json`.
3. Regenerate **only** the affected stage lines (delete those MP3s or add a
   one-off `--force` to the generator so skip-existing doesn't block them).
4. Ship display + audio together so they always agree.

Affected spoken line ids to re-record on the naming pass:
`stage1-complete.say.*`, `stage2-welcome.say.*`, `stage2-onward.say.*`,
`s3-welcome.say.*`, `s3-onward.say.*`, `s4-welcome.say.*`, `s4-onward.say.*`.

## 2. Chord development THROUGH the Course (not only Chord Masterclass)

Chord Masterclass stays the specialist practice room. The main Course teaches
chords gradually, as sound and shape first, theory later:

**Foundation / Stage 1 (early):**
- chord as a *sound* (several notes heard together) — `first-chord`
- chord as a *hand shape* (C–E–G under the hand)
- a second shape — `chord-g`
- arpeggio = the same chord spread in time — `arpeggio-c`
- the B-major hand shape introduced ergonomically — `bmaj-*`
- no heavy theory yet (no inversion/function vocabulary)

**Stage 2–3 (later):**
- triads named (root/third/fifth)
- major vs minor *quality* by ear and shape
- broken chords / arpeggio patterns in pieces
- inversions (same notes, different shape)
- simple cadences (I–V–I feel) in context
- harmonic function as accompaniment under a melody

This ladder is already partly present (`first-chord`, `chord-g`, `arpeggio-c`,
`first-chord`→`review-chord`); the later rungs are authored as the Course grows.

## 3. Sight-reading assessment

The Sight-Reading Assessment Prototype stays a **separate, isolated** future route.
It does not replace Cognitive Sight Reading and is not wired into Foundation/Stage 1.

## rc2-112 — cognitive targets per live step (depth pass)

Every live Stage 1 study/recall step now has an explicit skill it trains:

| Step             | Trains (cognitive / musical)                                  |
|------------------|---------------------------------------------------------------|
| play-echo        | listening discrimination + short auditory memory (2-note echo)|
| study-steps      | even motor sequencing; stepwise pitch direction               |
| study-qa         | phrase shape; tension/resolution by ear (antecedent/consequent)|
| call-response    | musical response (transform, not copy); falling-direction recall|
| chord-warm       | harmonic listening; chord-as-colour; simultaneous hand-shape  |
| study-tune       | melodic shape & phrasing beyond scales; singable contour      |
| recall-register  | register RETRIEVAL + listening discrimination (no model given)|
| recall-middlec   | landmark RETRIEVAL from the black-key pattern (no marker)     |
| recall-echo      | auditory working memory (hold a heard pattern, reproduce it)  |

Design rule applied: retrieval steps deliberately REMOVE help (no marker, no demo,
no cue) so the learner recalls rather than copies. Never punitive — calm wording,
hints always available.
