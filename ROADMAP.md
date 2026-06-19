# KeyMaster PRO — Post-RC2 Roadmap

**Golden rule for every future feature:** *Does this help the musician process
music more like an expert reader and performer?* If yes, it belongs in
KeyMaster PRO; if not, reconsider it.

RC2 priority remains **Scales Masterclass** and **Cognitive Sight-Reading**.
These are the stable foundation. No new engine work may destabilise MIDI mapping,
the Event Bridge, staff rendering, progression gating, the feedback system,
transport controls, or the existing fingering systems.

## Stage 1 Recognition — Governing Philosophy (CANONICAL)

> **The objective of Stage 1 is not to create a pianist.**
> **The objective of Stage 1 is to create a reader.**

Stage 1 Recognition teaches **reading before technique**. During Stage 1:

- The eye is trained before the hand.
- Recognition is trained before speed.
- Continuity is trained before perfection.
- Reading fluency is trained before scale technique.

For this reason:

- Fixed-position fingering is used (Stage 1 only).
- Technical piano mechanics are intentionally simplified.
- Scales Masterclass remains the dedicated environment for technical development.

**Canonical status.** This statement is the constitutional document for Stage 1
Recognition. Every future Stage 1 curriculum decision must be evaluated against
it: *does this change serve the reader the eye is becoming, or does it import
hand-technique load that belongs to Scales Masterclass?* If the latter, it does
not belong in Stage 1.

## Canonical Pillar — Time, Rhythm & Musical Duration (R1)

> **Music is not only the correct note. It is the correct note, at the correct
> time, for the correct duration, within a living pulse.**

Timing is a **first-class pillar** of KeyMaster PRO, equal to pitch — not an
optional extra, and not specific to keyboard players. Pitch tells the musician
*what* to play; timing tells them *when*; duration tells them *how long* to hold
or release; silence (rests) tells them *when not* to play.

**Governing principle — the same one that governs reading:** *Recognition before
Execution.* Timing is taught as a **recognition skill before a speed skill**. The
learner first learns to *recognise* — Is the note short or long? On the beat or
between beats? Is there a rest? Does the rhythm continue or pause? Is the pattern
repeated? Does the phrase feel complete? — and only once recognition is secure
does speed and fluency increase.

**Founder's design constraint (canonical):** the founder found timekeeping hard
to learn, so KeyMaster PRO must **never assume** pulse, counting, duration or
rests are obvious. Timing must be made **visible, audible, and understandable** —
the aim is to help the learner *feel* time, not merely count mechanically.

**Progressive vocabulary (recognition first, execution later).** Whole/semibreve
→ half/minim → quarter/crotchet → eighth/quaver → sixteenth/semiquaver; dotted
notes, tied notes, triplets and tuplets; rests of every value; bar lines and time
signatures; simple and compound meter; anacrusis/pickups, held and repeated
notes, off-beat entries, syncopation, rhythmic patterns and phrase endings. Each
is introduced only when the prior layer is secure.

**Cross-module role (eventual).** Timing cross-references every module — Scales
(evenness, pulse, controlled tempo), Cognitive Sight-Reading (reading rhythm as
well as pitch, rests, continuity, not stopping after a mistake), Chords (harmonic
rhythm, in-tempo changes), Arpeggios (flow, pulse stability, crossing points),
Pattern Reading (rhythmic motifs, syncopation, musical memory), Organ/Pedalboard
(limb independence, sustained notes, release timing).

**Practice Review (eventual, educational — never game stats).** Timing will
surface as teacher-style lines alongside the existing review, e.g. *Pulse
Stability: Developing · Rhythm Recognition: Good · Note Duration: Needs attention
· Continuity: Improving · Rest Awareness: Ready.* These remain calm, formative
feedback in the established review voice.

**Status & safety.** This is a **design/specification entry only**. No rhythm
scoring, metronome enforcement, duration detection, rests engine, or tempo
progression is wired into RC2. The full design lives in
`TIMING_RHYTHM_PILLAR.md` (design docs); a forward-looking, **unused** vocabulary
stub lives in `rhythmModel.js` (imported by nothing). Nothing here touches MIDI,
the Event Bridge, staff rendering, progression gating, feedback, transport, or
any stable module. Existing display-only crotchet rests in Sight-Reading are the
first visible step of this pillar; everything else is future work.

**Canonically accepted; reserved.** This pillar is accepted into the R1
specification. It stays **documented and reserved** until a *deliberately begun,
separate, isolated build phase* — RC2 stability is the standing priority until
then. When that phase starts, the **natural first step is silent rhythm
recognition** (recognition before execution), not live tempo scoring. The
prohibited-for-now list is explicit: no rhythm scoring, no metronome
*enforcement*, no held-note/duration detection, and no tempo-based pass/fail.
`rhythmModel.js` must remain unwired until that phase begins. The future Practice
Review timing dimensions are fixed as: **Pulse Stability · Rhythm Recognition ·
Note Duration · Continuity · Rest Awareness.** Every timing increment must pass
the Golden Rule — *does this help the musician process music more like an expert
reader and performer?*

## Curriculum flow

Scales → Cognitive Sight-Reading → Chords → Arpeggios → Pattern Reading →
Organ / Pedalboard. This sequence is surfaced on the dashboard.

## Modules

| # | Module | Status | Subtitle |
|---|--------|--------|----------|
| 1 | Scales Masterclass | **Active** | Fingering, fluency, and the tempo climb. |
| 2 | Cognitive Sight-Reading | **Active** | Read ahead, recover fast, stay in time. |
| 3 | Chord Masterclass | Coming Next | Triads, inversions, seventh chords, full chords, and broken chords. |
| 4 | Arpeggio Masterclass | Planned | Broken-chord patterns across all keys, hands, and inversions. |
| 5 | Pattern Reading | Future | Think in fragments, shapes, intervals, and harmonic structures. |
| 6 | Organ / Pedalboard | Future | Hands-and-feet coordination, pedal reading, full pedalboard. |

Future modules are **visible but locked** on the dashboard. No engines are
implemented yet — the cards advertise the curriculum only.

## Cognitive Sight-Reading — Tier 1 pathway (CANONICAL)

Tier 1 is sequenced for a **genuine beginner** under *Recognition before
Execution*. The reading eye is developed entirely inside the fixed **C4–G4
five-note frame** before any register expansion; ledger lines are withheld
until late, and the register shift is last. This is pure curriculum data in
`TIER1_SEQUENCE` (`lessonMatrix.js`) using only the existing generator knobs
(range · `length` · `maxStep` · `maxDirChanges`) — no engine/generator change.

| Stage | Lessons | Focus | Frame |
|------|---------|-------|-------|
| 1 — Note Recognition | 1.1–1.3 | Three notes → five-note frame → the frame in varied order | C4–G4 |
| 2 — Step Recognition | 1.4–1.5 | Reading by step; longer stepwise lines | C4–G4 |
| 3 — Shape / Contour | 1.6–1.9 | Three- & four-note contours, direction changes, simple shapes | C4–G4 |
| 4 — Skip Recognition | 1.10–1.12 | The 3rd; mixed steps & skips; simple patterns | C4–G4 |
| 5 — Interval Recognition | 1.13–1.14 | Reading up to a 4th, then a 5th | C4–G4 |
| 6 — Register Expansion | 1.15–1.17 | One above the frame → the octave → **first ledger line (A5)** | widening up |
| 7 — Register Shift | 1.18–1.19 | Further ledger lines (to C6); the home leaves Middle C | shifted |

Pacing rationale: Stages 1–5 (lessons 1–14) never leave C4–G4, so position,
step, contour, skip and interval recognition are all automatic before the
**first ledger line appears at lesson 17** (vs. lesson 9 previously). Items that
would need a new generator knob (repeated notes, ascending/descending split,
isolated 4ths/5ths, notes below Middle C) are intentionally **out of scope** and
omitted; the pathway stays fully data-driven on the current engine.

## Chord Masterclass — interactive training (Phase 1 ACTIVE)

Purpose: train the musician to **recognise, understand, and execute** chords — a
chord is a single harmonic object (a sound, a shape, a spelling, a hand position,
a function, a movable structure), not three isolated notes. Governed by the
Golden Rule and by *Recognition before Execution*. **Design note:** the founder
found chord learning slow, so chords are taught patiently — visually, physically,
and repeatedly — never assuming "simple" chords are obvious.

**Phase 1 — shipped (additive, non-breaking).** The chord view is now an
interactive learning loop, not passive display. Scope: **major triads, B major as
the canonical first chord** (root B-D#-F#, first D#-F#-B, second F#-B-D#), root /
1st / 2nd inversion, Right or Left hand (Both hands reserved), MIDI **and**
on-screen input, green/red per-note feedback, calm teacher-style messaging. Built
entirely on existing infrastructure — `chordEngine.buildChord`, the self-contained
`chordEvaluator` (shared NoteInput hub; not the single-note evaluator; no Event
Bridge), `staffView.setChord`, keyboard highlights. Three modes:
- **Learn** — understand the chord (notes, keyboard, staff, recommended fingering); the prior display behaviour, preserved.
- **Guided Practice** — "Play *chord* — *inversion* — *hand*"; play it, green/red, calm success.
- **Inversion Trainer** — root → first → second, teaching *"Same chord — new shape"*: a chord is a harmonic identity that can move.

Recognition Mode (show-and-identify) is **reserved/stubbed** for a later phase.

**Fingering philosophy — "Recommended Fingering", not "Correct Fingering".** There
is often no single correct chord fingering. Phase 1 recommends a reliable,
low-movement triad shape (RH 1·3·5, LH 5·3·1, low→high) to build dependable hand
shapes and avoid unnecessary movement; fingers stay flexible as real players adapt.

**Curriculum ladder (long-term — only Level 1 / Phase 1 is started):**
1. **Major triads** — root, 1st, 2nd; hands separately. *(Phase 1 in progress)*
2. **Minor triads** — root, 1st, 2nd.
3. **Diminished & augmented triads** — recognise altered fifths; compare shapes.
4. **Primary chords** — I, IV, V; chord families within a key.
5. **Chord progressions** — I–IV–V–I, ii–V–I, I–vi–IV–V.
6. **Seventh chords** — dominant, major, minor, diminished, half-diminished.
7. **Extended & colour chords** — 9ths, 11ths, 13ths, added-note, suspended.
8. **Slash chords & voicings** — bass vs upper chord; LH bass / RH harmony; slash-chord decoder.
9. **Harmonic fluency** — recognition in context, efficient movement, pattern-based harmonic reading.

**Practice Review (future, educational — never game stats).** Reserved chord
dimensions: Chord Recognition · Chord Spelling · Inversion Awareness · Hand Shape ·
Fingering Confidence · Left-Hand Fluency · Right-Hand Fluency · Harmonic
Understanding (e.g. *Inversion Awareness: Good · Hand Shape: Needs attention*). Not
implemented in Phase 1; reserved here to keep future review lines on-voice. No
badges, points, scores, or arcade language anywhere in Chord Masterclass.

## Arpeggio Masterclass (future)

Purpose: flowing execution of chord structures across the keyboard.

- **Stage 1 — Broken-Chord Recognition:** the chord↔arpeggio relationship.
- **Stage 2 — Hand Patterns:** consistent movement patterns.
- **Stage 3 — Arpeggio Flow:** continuous execution, no interruption.
- **Stage 4 — All-Key Expansion:** all major and minor keys.

**Fingering philosophy — recommended fingering is appropriate.** Less rigid than
scales, more guidance than chords. Focus on thumb crossings, position changes,
and smooth transitions.

## Pattern Reading (future)

Move beyond note-by-note reading. Teach recognition of scale fragments, chord
shapes, intervals, harmonic patterns, and common musical structures — training
musicians to think in patterns rather than individual notes.

## Organ / Pedalboard Training (future)

Extend beyond piano/keyboard:

- Full 32-note concave pedalboard, MIDI pedalboard support
- Hands-and-feet coordination; independent pedal sight-reading
- Pedal scale training; pedal arpeggios; combined manuals and pedals
- Pedalling (the fingering equivalent) remains mandatory.

---

## Canonical Principle — Colour & Feedback (Teaching Language)

Colour in KeyMaster PRO is a teaching language, not decoration. The governing
rule: **success should glow; mistakes should guide.** Correct states are
emotionally warmer and more luminous than error states are loud. Getting it
right should feel rewarding ("Yes — that is it"); getting it wrong should feel
instructional ("Check this note and try again"), never punished.

**Expanded palette** (tokens in theme.css, additive over the ebony/brass base):
midnight blue (structure), champagne/gold (accent), warm amber (guidance /
current target), bright emerald (success), soft rose (gentle correction), warm
ivory (reading text). Emerald is brighter than the legacy `--good`; rose is
softer than the legacy `--bad`.

**Correct** — bright emerald, a gentle glow, calm positive wording, and a
**check (✓)** as a non-colour cue. **Incorrect** — soft rose (not harsh red), an
**outline marker (○)** and a gentle treatment rather than alarm, with calm
instructional wording and no shame language. **Current target** — warm amber/
gold. **Missing** — subtle neutral/amber.

**Accessibility (hard rule): never rely on colour alone.** Every correct/wrong
state must also carry text, shape/icon, border, or position so the system works
for colour-blind users, children, older learners, and varied lighting.

**Per-mode (Chord Masterclass):** Follow Me — target amber, held emerald glow,
wrong soft-rose outline, missing neutral/amber. Try Yourself — reduced help, but
correct still feels rewarding. Assess — minimal support, calm confirmation, no
dramatic error state. Review — gold/ivory summary, emerald = secure, amber =
developing, rose sparingly for "needs attention".

**Visual identity:** *stage glow, not arcade glow* — premium, musical, luminous,
calm, inviting. Not flashy, childish, neon, or gamified.

### Reserved — Theme System (Day / Night / Auto)

Three themes are the canonical target, gated behind a deliberate phase because a
light theme requires auditing ~100+ hardcoded colour literals across keyboard.css,
notation.css, and several module-injected styles (none render-verifiable headless):

- **Night — Ebony Velvet** (current default): deep ebony, midnight blue, champagne
  gold, amber, emerald success, soft-rose correction, ivory text. Premium,
  cinematic, stage-like.
- **Day — Studio Ivory**: warm ivory/cream ground, charcoal text, restrained gold,
  midnight-blue structure, amber guidance, emerald/rose feedback. Clear, readable,
  lesson-book quality for daytime and older learners.
- **Auto**: follow the device `prefers-color-scheme`; the user may still force Day
  or Night. Persisted locally.

Theme must serve readability, accessibility, learner comfort, long sessions, and
premium identity — never decoration. The feedback principle holds across both
themes: correct feels more rewarding than incorrect feels punishing.

*Status (rc2-29):* expanded palette tokens added (additive); the feedback
principle is implemented inside Chord Masterclass (emerald-glow success with ✓,
soft-rose correction with ○, amber target, colour-coded honest review). The
shared keyboard/staff feedback recolour and the Day/Night/Auto theme mechanism
remain reserved, deliberate phases.

---

## Canonical Pillar — Musical Sight Reading / Repertoire (reserved)

Cognitive Sight Reading trains the **eye**; Musical Sight Reading **applies** that
skill to material that *sounds like music*. The goal is not infinite notes but
infinite musical growth — the learner should finish a study thinking "that sounded
beautiful, I want to play another," never "that was a random note drill."

This is a separate, parallel source of material — it does **not** modify the stable
Cognitive Sight-Reading engine (`sightReading.js`, `exerciseGenerator.js`,
`lessonMatrix.js`). The existing levels are preserved; the musical layer is
anchored to begin where the eye-training frames leave off (C4–G4 → five-finger →
skips → full C major → two hands).

**Music, not random notes.** Every study is a small *piece*: motif → phrase →
contour → cadence → satisfying close, judged against an 8-question musicality gate
(sound like music? pianistic? replayable? teaches the skill? phrase direction?
satisfying ending? right level? legally safe?). If it sounds generated, reject it.

**Legal safety (non-negotiable).** Three content categories: (1) verified
public-domain works — composition **and** edition/engraving rights checked; (2)
**original** genre-inspired studies — *inspired by genre, not derived from a
protected song*, never "slightly adjusted" copyrighted songs; (3) properly
licensed repertoire later. Phase-1 material is all original.

**Data model.** Canonical = a simplified internal sequence (note-name events with
`beats`, plus a parallel left-hand voice); MusicXML reserved as an import source
converted to the internal form. See `MUSICAL_SIGHT_READING_PILLAR.md` for the full
report (the seven investigation questions) and the staged build order.

*Status (this build):* reserved pillar opened with a FROZEN, UNWIRED stub
(`flat/musicalSightReading.js`, imported by nothing — like `rhythmModel.js`):
the data model, five original micro-studies (classical/folk, Levels 1–5, two of
them two-hand), and pure validators (shape, note-name, bar math, two-hand
alignment, and a provenance gate for any future public-domain entry). No route, no
engine change, no cache bump. Building an actual Musical Sight Reading route is a
separate, approved phase.

## Canonical Pillar — Musical Foundations: Healthy Technique & Ergonomics (FUTURE / RESERVED — NOT YET IMPLEMENTED)

*Design/planning only. Captured as the authoritative intent for a future Musical
Foundations expansion. No runtime, audio, route, or engine change is implied by this
section; building the cards/visuals below is a separate, approved phase.*

**Governing principle — "Natural, supported, flexible — never forced."**
KeyMaster PRO teaches a healthy playing *mechanism*, not a decorative hand shape. It
must NOT teach a rigid "curl your fingers as if holding a ball" pose — that phrase
tends to produce a stiff claw, raised knuckles, a tight wrist, and finger/forearm
strain. Instead:

- The hand has a **natural arch**, not a rigid claw.
- The wrist stays **free and aligned**, not collapsed or locked.
- Forearm, wrist, hand, and the playing finger **work together** as one mechanism.
- The **thumb stays relaxed and close** to the keys (quiet thumb).
- The **longer fingers are allowed to live comfortably on the black keys**.
- Hand shape is **shaped by the music and keyboard geography**, never frozen into one pose.

**Injury-prevention principle.** Help learners avoid unnecessary hand, finger, wrist,
forearm, shoulder, and neck tension; healthy alignment matters from the very beginning
for anyone practising regularly. Avoid all language that encourages force, gripping,
clawing, stretching, or holding tension. The aim is **not** limp relaxation — it is
*efficient use*: only the muscles needed, only as much as needed. Approved teaching
language: easy shoulders · free wrist · supported hand · natural arch · quiet thumb ·
long fingers on black keys · no gripping · no clawing · no forcing · no pain.

**Safety / scope-of-advice stance (important).** If a learner reports pain, strain,
numbness, or persistent discomfort, the app advises **stopping** and seeking help from
a **qualified teacher or health professional**. The app does **not** diagnose injury or
present itself as a medical authority.

**Modern pedagogy — why B major, not C.** Many older beginner methods start in C
because it is visually simple (no sharps/flats) and easy to explain on the page — but
that is not necessarily the easiest key for the *hand*. KeyMaster PRO deliberately
begins with **B major** following the Chopin-inspired ergonomic idea: the longer fingers
fall naturally on the black keys while the shorter thumb and fifth finger sit on white
keys. Explain this gently. *Suggested learner wording:* "Many books begin with C because
it is easy to see. KeyMaster PRO begins with B major because it is kind to the hand. The
long fingers naturally reach the black keys, and the shorter fingers stay close to the
white keys."

**Terminology care (Chopin key point).** The historical/teaching reference pairs
**B major for the right hand** with **D-flat major for the left hand** — *not* B-flat
major. Do not overburden beginners with enharmonic theory, but add a gentle note to
reduce confusion. *Suggested learner wording:* "B major, B-flat major, B-sharp major,
and D-flat major are different names and different spellings. Some notes can sound the
same but be written differently. You do not need to master that yet. For now, notice the
hand shape: long fingers like the black keys."

**Possible future Foundations cards** (each Explain → Show → (optional) Try, in the
existing calm Foundations style): (1) how to sit at the piano; (2) how the arm hangs
naturally; (3) natural hand shape, not claw shape; (4) why the wrist must stay free;
(5) how the thumb rests near the keys; (6) why B major fits the hand; (7) what tension
feels like; (8) when to stop practising; (9) why slow practice protects the hand;
(10) how posture supports reading and rhythm.

**Future-ready video placeholders** (placeholders only — no actual videos until
approved). Candidate titles: "How to sit at the piano", "Natural hand shape", "Why B
major fits the hand", "Relaxed wrist and supported fingers", "What not to do — clawing,
gripping, collapsing". Hard rules for any future video layer: videos are **optional** and
**must never block the lesson**; need captions/transcript; should be short; learners can
skip/replay; **no autoplay with sound**; **no large assets yet**; **no external
copyrighted clips**. AI-generated stills/animations may serve as interim placeholders or
visual supports, but **final** posture/hand-shape teaching should be based on real
filmed/photographed reference or expert-checked material — **no AI-generated anatomy used
as final authority without expert review**.

---

*This document is a specification only. Implementing any module above is a
separate, gated phase that must leave RC2 untouched.*

## Input: MIDI-first now, acoustic/microphone later (documentation note — not yet built)

KeyMaster PRO is currently **MIDI and on-screen input first, by design**. MIDI gives the
tutor exact note data for precise teaching — every note is unambiguous, with no false
"wrong note" readings and no "play it louder" frustration. This precision is what lets the
Course give honest, specific feedback (Recognition Latency, Resilience Index) rather than
guessing.

**Acoustic / microphone recognition is planned as a later, dedicated project**, not a quick
add-on. Real-time pitch detection (especially polyphonic, in noisy rooms, with low latency)
is a substantial engine; the market leaders rely on it but reviewers consistently report
that microphone detection is less reliable than MIDI — misheard octaves, dropped notes in
two-hand chords, and demoralising false negatives on soft or hesitant playing. When
KeyMaster PRO adds an acoustic mode, it will be additive (a second input path), and MIDI/
on-screen will remain the precise default. This is a confident product position, not a
limitation: precise input, precise teaching.

Sequencing: ship the premium Course opening, first-lesson tone, and in-Course musicianship
first; treat acoustic input as a separate phase after those land.
