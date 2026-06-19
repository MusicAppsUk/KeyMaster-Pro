# KeyMaster PRO — Path to a Real Alpha Candidate

*Senior-partner assessment + decision-ready plan. rc2-72.*

This document exists because two things stand between the current build and a
genuine, competitor-level Alpha Candidate — and both are decisions your own rules
reserve for you (premium-voice licensing, real visual-asset procurement). I'm not
going to fake either with browser TTS or unverifiable CSS you'd then have to debug.
Here is exactly where we stand and what I need from you to close the gap.

---

## Candidate readiness — honest scorecard

**Software foundation — DONE and verified (rc2-69 → rc2-72):**
- Premium front-door experience with returning-learner, chapter-aware welcome.
- Course is the main path; Practice Rooms secondary and responsive on tablet.
- A real **chapter journey** (Orientation → Landmarks → Melody → Harmony →
  Reading → Rhythm → Onward) with positions, chapter intros, and **completion
  milestones** (non-gamified).
- Strict **teaching rhythm** with no voice/demo overlap, no cut-off, calm
  reading-time pacing, and a clear "Listen / Your turn" hand-off.
- **Back stays inside the Course** (footer + chrome); step-0 is an explicit exit.
- **Musically accurate** early teaching (white/black keys, B below Middle C,
  B-major deferred, true triad and B-major fragment, Middle C anchor).
- **Captions-first**; browser voice demoted to optional/off-by-default.
- Accessibility: live-region cues, reduced-motion paths, keyboard-independent flow.
- Masterclasses (Scales, Chord, Cognitive Sight-Reading) and Scales audio
  preserved and untouched.

**Verdict:** the *software experience* is at candidate quality. The reason this is
still labelled a Course build and **not** "Alpha Candidate" is the two gates below.

---

## GATE 1 — Premium tutor voice  *(report-first: licensing/provider decision)*

**Problem.** Browser TTS is not good enough to represent KeyMaster PRO. It's now
off by default, with captions carrying the Course. But a warm, premium voice is
core to the "Warm Precision Tutor" identity, and benchmark apps lean on
professionally produced audio/video narration.

**Options (you choose):**
1. **Recorded human pilot (recommended for alpha).** Hire one warm, neutral VO
   artist to record ~12–20 opening Course lines (Orientation + Landmarks). Ship as
   audio assets behind the existing tutorAudio layer; captions stay as fallback.
   - *Pros:* highest quality, fully owned, no per-use cost, no model drift.
   - *Cons:* fixed script (re-records cost money); ~1 studio session.
2. **Licensed neural voice (e.g. a premium TTS provider with a commercial
   license).** Generate all lines from one consistent voice.
   - *Pros:* covers the whole Course, easy to extend/edit copy.
   - *Cons:* licensing terms + per-character or subscription cost; must confirm
     the license permits redistribution inside a shipped product. **This is the
     legal/licensing decision I need you to make — I won't pick a provider or
     accept terms on your behalf.**
3. **Hybrid:** recorded human for the fixed opening lines, licensed neural for the
   long tail. Best quality where it matters, scalable elsewhere.

**What I need from you:** pick a route (1, 2, or 3) and, for 2/3, name the
provider/licence you're comfortable with. The tutorAudio architecture is already
built to play real assets, so once a route is chosen, wiring is low-risk.

---

## GATE 2 — Real teaching visuals  *(report-first: asset procurement)*

**Problem.** Benchmark apps show a professional's hands on video, or richly
animated note guidance. We currently teach with the on-screen keyboard, highlight
overlays, and a labelled mini-keyboard — good, original, and honest, but not yet
the "video-assisted" standard.

**Options (you choose):**
1. **Commission short demonstration clips** (hands playing the target on a real
   keyboard) for the opening lessons. Drop into the reserved media slot (already
   built and honestly hidden until real media exists).
   - *Pros:* matches the market standard directly.
   - *Cons:* filming/editing cost; must be our own footage (no competitor media).
2. **Original animated keyboard guidance** (our answer to video): build a guided,
   labelled, finger-numbered on-keyboard animation using the existing overlay +
   keyboard engine. No external assets, fully ours.
   - *Pros:* no procurement; on-brand; extends what we already render.
   - *Cons:* this is **visual work I cannot verify from my environment** — it
     needs either your device testing during iteration or a short on-site build
     loop. I can build it, but you'd be judging pixels/motion.
3. **Both:** animation now (cheap, original), real clips later for polish.

**Recommendation:** Option 2 first (original animated guidance — no procurement,
no licensing, on-brand), with Option 1 as a later polish pass. If you want me to
build the animation, say so and accept that this specific piece will need a round
of your visual judgement — it's the one area I genuinely can't self-verify.

---

## What I'll do next *without* asking (within doctrine, safe, verifiable)

- Continue deepening Course pedagogy and copy (recognition-before-execution,
  warm-precise feedback) — these are verifiable and need no approval.
- Keep chapter/journey structure and resume coherent.
- Hold every preserved module and the legal boundary.

## What I will NOT do without your decision

- Pick or accept a voice provider/licence (Gate 1).
- Procure or commission video/footage (Gate 2, option 1).
- Touch Scales audio, rewrite architecture, or anything that could contaminate the
  project.

---

## Bottom line

The software is ready for your milestone test. A real **Alpha Candidate** badge is
two decisions away — a voice route and a visuals route — both yours to make. Tell
me which options you want and I'll execute the safe parts immediately and bring
you only the genuinely unverifiable visual piece for judgement.
