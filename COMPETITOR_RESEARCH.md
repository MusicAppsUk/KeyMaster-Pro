# KeyMaster PRO — Product Research & Original Course Direction

*Internal research document. Lawful sources only. Last updated: rc2-70.*

## Sourcing & legal boundary (read first)

Everything here is drawn from **legitimate, public sources**: official product
websites, official app-store listings, and independent published reviews — plus
my own analysis of widely-understood UX patterns. No competitor code, assets,
layouts, lesson text, songs, audio, video, or other protected expression was
accessed, copied, or reproduced. Sources are listed at the foot of this document.

The governing rule for this project:

> **Take the best learning *principles*. Never take protected *expression*.**

A principle is "show the learner, then wait for them to play." That is common
craft, free to use. Protected expression is a specific lesson script, a song
arrangement, a UI layout, an icon set, a voice recording, a melody. We build all
of that ourselves, in KeyMaster PRO's own voice.

---

## What the market does well (principles worth learning)

### flowkey
- **Wait-for-input teaching ("Wait Mode").** The app demonstrates, then pauses
  and waits for the correct note before moving on. No racing ahead. This is the
  single most-praised mechanic across reviews, especially for adult self-learners.
- **See-it-then-play.** A short demonstration ("here's how it sounds / here are
  the hands") precedes the learner's attempt. Reviewers repeatedly value *hearing
  the target first*.
- **Practice controls that respect the learner:** loop a hard bar, slow to
  50–75%, isolate one hand. These reduce frustration without dumbing content down.
- **Clean, calm, linear progression** (keyboard orientation → one hand → two
  hands → chords → songs → scales). Beginners are never asked to choose from a
  confusing menu.
- **Instant, low-friction feedback** via microphone *or* MIDI — no hardware
  barrier to entry.

### Skoove
- **"Listen → Learn → Play" loop**, with content broken into *small chunks*
  (a few bars at a time), each hand rehearsed before combining.
- **"Finger Gym" / pre-drill.** Before a new technique appears in a real piece,
  the learner rehearses *just that skill* in isolation. Excellent scaffolding.
- **Short explainer media for new concepts** (e.g. a major scale) appears exactly
  when the concept is introduced — teaching, not just testing.
- **Theory and technique woven into the playing**, not bolted on (e.g. pedal
  technique taught in context).

### Simply Piano
- **Exceptionally smooth onboarding.** The first session is engineered to feel
  achievable — "early wins" — which matters enormously for nervous beginners.
- **Keyboard-first orientation** (white/black keys, octaves, hand position)
  before notation.
- **Gradual notation with colour-coding** that visually links the written note to
  its key, then removes the "training wheels" as the learner gains confidence.
- **Pathway choice** (e.g. chords vs. melody) so the learner pursues what they
  actually want to play.
- **Credibility signal:** lessons developed with qualified teachers / external
  accreditation.

### Sight Reading Factory (most relevant to our Cognitive Sight-Reading)
- **On-demand generation of unlimited, never-repeating exercises** that still obey
  real composition rules — so the material is fresh but musically sensible.
- **Deep, precise customization:** exact range, rhythms permitted, leap size,
  accidentals, dynamics — so difficulty can be dialled to the learner.
- **Progressive difficulty** (wider range, harder rhythms, more accidentals).
- **Self-assessment and listen-back**, optional note-cursor and metronome,
  optional annotations (pitch names, scale degrees, counting).

This is strong external validation that KeyMaster PRO's **Cognitive Sight-Reading**
direction (procedural generation + adjustable difficulty + assessment) is the
right architecture, not a novelty.

---

## What KeyMaster PRO must NOT copy or imitate

- **Any protected expression** — their lesson scripts, song arrangements, exact
  wordings, graphics, icons, colour systems, voice/video, or screen layouts.
- **Hollow gamification.** Multiple reviewers (including a piano teacher who
  tested for six months) warn that point/streak loops can make a learner *feel*
  like they're progressing more than they actually are. KeyMaster PRO has already
  ruled out badges/XP/arcade scoring — hold that line. Recognition before
  execution and genuine skill are our differentiators.
- **Subscription-first framing / aggressive paywalls.** A recurring complaint is
  content suddenly locked behind a wall and pushy renewal mechanics. Our premium
  *ownership* model is a deliberate contrast — keep it.
- **Microphone-only note detection as the source of truth.** Reviewers across all
  three song apps note the mic mis-hears octaves and chords. KeyMaster PRO is
  **MIDI-first / exact**, which is a real quality advantage — don't regress it.
- **"Can't see your hands."** A common structural limitation: the app judges
  *which* note, not *how* it was played. We should be honest about the same limit
  and frame our future **acoustic recognition** work as the answer, not pretend.
- **Song-library-as-product.** Their core loop is "learn this pop song." That's
  licensing-heavy and not our identity. Our product is **the Course** and
  **musicianship**, not a jukebox.

---

## What KeyMaster PRO can do BETTER (our edge)

1. **Exact, MIDI-first truth.** We know precisely what was played. That makes our
   feedback trustworthy where mic-based rivals are fuzzy.
2. **Recognition before execution.** We can teach the learner to *recognise* a
   note/shape/interval before asking them to play it — a genuinely different
   pedagogy from "copy the falling notes."
3. **A single coherent Course with real masterclasses behind it.** Scales
   Masterclass, Chord Masterclass and Cognitive Sight-Reading are deeper, more
   serious practice rooms than the typical app's "exercises" tab.
4. **The B-major ergonomic pathway** — an opinionated, teacher-style rationale
   (hand shape fits the keys) that no competitor offers. It gives the Course a
   point of view.
5. **Calm, adult tone.** No cartoon mascots, no babying. The market is crowded
   with bright/childish apps; a serious, warm, precise tutor is open space.
6. **Ownership, not rental.** A premium product the learner *keeps*.

---

## How the KeyMaster PRO Course should be built (original experience)

Synthesising the *principles* above into our own design:

- **Front door → Course as the main path.** (Shipped.) The splash sets a calm,
  premium tone and routes straight into the Course; practice rooms are secondary.
- **Strict teaching rhythm, every step:** tutor instruction → pause →
  demonstration → pause → learner attempt → feedback → pause → advance. Nothing
  overlaps; nothing is cut off. (Shipped rc2-69; reinforced rc2-70.) This is our
  original expression of flowkey's wait-mode + Skoove's listen/learn/play.
- **Recognition step before execution step.** Where a competitor would just have
  you copy, we can first ask "which key is B?" (identify) and *then* "play B"
  (execute). This is our pedagogy, and it's original.
- **Pre-drill before the real thing** (our take on Skoove's Finger Gym): isolate
  a new skill — a black-key group, a single interval — before it appears in a
  phrase. Already partly present (black-key group steps, single-note landmarks).
- **Captions-first, voice-optional.** (Shipped rc2-69/70.) Because our current
  browser voice is not premium-grade, the default Course leads with written tutor
  lines paced by reading time, with a clear "Listen / Your turn" hand-off. A
  premium recorded/again-licensed voice is the upgrade path (see below) — but the
  Course never depends on a poor voice.
- **Honest media slots.** Where competitors show a pro's hands on video, we
  reserve a media slot and label it truthfully until real teaching media exists —
  we don't fake it.
- **Difficulty you can dial** (our take on SRF's customization), expressed through
  our own generators in the masterclasses — range, rhythm, accidentals — feeding a
  trustworthy MIDI assessment.
- **Continuous learning + resume.** The Course remembers where you were and what
  you've completed, and carries you forward — no re-grinding.

---

## The honest gap to a sendable alpha

The Course *foundation* (timing, navigation, pacing, accuracy, captions-first) is
now sound. The two things that still separate KeyMaster PRO from the polish of
flowkey / Skoove / Simply Piano are **assets, not architecture**:

1. **A premium tutor voice** — recorded human or a properly licensed neural voice
   for at least the opening lessons. Browser TTS is not good enough and has been
   demoted to an optional, off-by-default fallback.
2. **Real teaching visuals** — short demonstrations / hand-position media in the
   reserved slots, in our own style.

Both are production decisions (record/license/commission), not code we can
conjure. The recommendation is to commission a **small premium-voice pilot pack**
(≈12 opening Course lines) and a first set of demonstration visuals, then judge
the Course again with those in place.

---

## Sources (lawful, public)

- flowkey — official site (flowkey.com) and App Store / Google Play listings;
  independent reviews: Smarter Learning Guide, Deviant Noise, Know Your Instrument,
  Very Piano.
- Skoove — independent reviews: American Songwriter, Pianist's Compass, Pianoers,
  Midder Music, Piano Dreamers, Pro Musician Hub, AnneLam Music.
- Simply Piano — App Store / Google Play listings; independent reviews: Learnopoly,
  Pianist's Compass, Pianoers, The Breaking Dad, ArtMaster, Indie Musician Resources.
- Sight Reading Factory — official site (sightreadingfactory.com) feature pages and
  App Store listing; MusicFirst listing.

*No competitor code, assets, or copyrighted text were accessed or reproduced.
All competitor descriptions above are paraphrased summaries of publicly stated
features and published review observations.*
