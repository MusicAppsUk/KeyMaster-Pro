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

## Chord Masterclass (future)

Purpose: instant recognition and execution of chord structures.

- **Stage 1 — Chord Recognition:** major / minor / diminished / augmented triads. Recognise and play quickly.
- **Stage 2 — Inversions:** root, first, second. Understand shapes in all positions.
- **Stage 3 — Speed & Fluency:** random chord drills, timed execution, fast recognition.
- **Stage 4 — Four-Note Chords:** major 7, minor 7, dominant 7, half-diminished. Practical harmonic fluency.

**Fingering philosophy — "Recommended Fingering", not "Correct Fingering".**
Unlike scales there is often no single correct fingering. Focus on thumb anchors,
thumb shifts, and thumb-under movements; allow flexibility for fingers 2/3/4 as
real players adapt. Recognition and shape understanding take priority over strict
fingering.

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

*This document is a specification only. Implementing any module above is a
separate, gated phase that must leave RC2 untouched.*
