# KeyMaster PRO — Curriculum Architecture, Key Levels 3–8

**Status: DESIGNED (not built).** This is the design spine agreed before
implementation, so each level is written against a coherent whole rather than
invented one at a time. Written rc2-213, after KL2 reached BUILT +
MACHINE-VERIFIED.

Doctrine throughout: **Recognition Before Execution.** Every new concept is
heard and seen before it is played. Every level asks: *does this help the
musician process music more like an expert reader and performer?*

---

## The shape of the whole ladder

| Level | Name | The one thing it changes |
|---|---|---|
| Foundation | — | The instrument stops being strange |
| KL1 | First Musicianship | Notation starts meaning something |
| KL2 | Real Repertoire | Music acquires time, colour and key |
| KL3 | Pattern Fluency | Reading stops being note-by-note |
| KL4 | Musical Independence | The hands stop copying each other |
| KL5 | Harmonic Fluency | Harmony becomes predictive, not decorative |
| KL6 | Expressive Repertoire | Interpretation becomes the learner's own |
| KL7 | Advanced Musicianship | Structure becomes visible at sight |
| KL8 | Performance Mastery | The app stops being needed |

The through-line is **decreasing instruction**. KL1–2 tell the learner what to
do. KL3–5 show and ask. KL6–7 suggest and question. KL8 mostly gets out of the
way. If a KL8 card reads like a KL2 card, it is wrong.

---

## KL3 — Pattern Fluency

**Premise:** by KL2's end the learner reads accurately but slowly, one note at
a time. Fluency is not speed of fingers — it is *chunking*: seeing "descending
third then step" instead of five separate note-heads.

**Prerequisites from KL2:** quavers, dotted values, key signature of one sharp,
five-finger transfer to a new tonic, dynamics.

**Teaches**
1. **Interval recognition at sight** — 2nds/3rds/4ths/5ths named by *shape on
   the page*, not counted upward from the bottom note.
2. **Scale and arpeggio fragments as single units** — the learner learns to see
   a four-note run as one gesture with one fingering.
3. **Thumb-under / finger-crossing** — the first genuine technical mechanism,
   which is what unlocks passages wider than five notes.
4. **The full C and G major scales**, one octave, hands separately.
5. **Sequence and repetition** — spotting that bars 3–4 are bars 1–2 moved.
6. **Sight-reading discipline** — scan-before-play as an explicit, timed habit.

**Infrastructure required**
- Fingering that changes mid-phrase (already supported — `finger` per note).
- Longer staves: passages exceeding ~10 notes will crowd. **Likely needs a
  multi-system staff** (wrapping to a second line). This is the first real
  renderer limit KL3 will hit.
- A pattern-highlight overlay (colour a recognised group) — new capability.

**Repertoire:** still largely original, because material must be built to
*contain* the specific patterns being taught. One or two short public-domain
folk melodies where a genuinely useful sequence occurs naturally.

---

## KL4 — Musical Independence

**Premise:** the hands have so far moved together or taken turns. Real piano
music asks them to do genuinely different things simultaneously. This is the
single largest cognitive step in the course and must not be rushed.

**Prerequisites:** KL3 fluency — the reading must be automatic before attention
can be split.

**Teaches**
1. **Melody with a held bass** — the easiest form of independence.
2. **Broken-chord accompaniment (Alberti-style)** under a moving melody.
3. **Contrary motion** — hands moving in opposite directions.
4. **Different rhythms in each hand** — crotchets against quavers.
5. **Two-voice reading on the grand staff** as a normal expectation.
6. **Mistake recovery** — explicitly taught: how to keep the pulse and rejoin,
   rather than stopping. This is a performance skill and belongs here.

**Infrastructure required**
- **Simultaneous notes (chords/dyads).** The renderer currently lays every note
  out sequentially along the x-axis; two notes sounding *together* cannot be
  drawn. **This is a hard blocker and the biggest engineering item in the whole
  remaining course.** It affects note layout, stem sharing, accidental
  stacking, and collision handling.
- Independent per-hand playback in the demo path.
- Per-hand target evaluation (did the left hand hold while the right moved?).

**Repertoire:** the natural home for the **Petzold Minuet in G, BWV Anh.114**
once a verified score is available — it is exactly a melody-plus-independent-
bass piece in G major, in three-time, using material KL2 and KL3 have taught.

---

## KL5 — Harmonic Fluency

**Premise:** the learner has met the tonic triad. Now harmony becomes a system
that *predicts* — hearing where music is going before reading it.

**Teaches**
1. **Triads on every degree**; major vs minor quality by ear.
2. **I–IV–V–I** as the structural backbone of Western tonal music.
3. **Cadences** — perfect, imperfect, plagal — recognised aurally first.
4. **Inversions**, and why they exist (voice-leading, not theory for its own
   sake).
5. **Reading chord shapes as single objects** rather than stacked note-heads.
6. **Keys of D, F and their signatures**; the circle of fifths as geography.
7. **Predictive listening** — pausing a piece and asking the learner to *sing
   or play* what comes next. This is the doctrine's purest expression.

**Infrastructure required**
- Chord rendering (from KL4).
- Key signatures up to 2 sharps / 1 flat (**already built** in rc2-213 — the
  key-signature engine supports ±7 and is tested to 3).
- Harmonic analysis labels under the staff (I, IV, V) — extends the existing
  `marks` mechanism.

**Repertoire:** increasingly real. Chorale-style progressions, simple dances.

---

## KL6 — Expressive Repertoire

**Premise:** the learner can play correctly. Now the question changes from
*what* to *how* — and, crucially, the answer stops being supplied by the app.

**Teaches**
1. **Articulation** — legato, staccato, slurs, phrase marks.
2. **The full dynamic range** and gradual change (crescendo, diminuendo).
3. **Rubato and tempo language** — ritardando, a tempo.
4. **Pedalling** — the sustain pedal as a musical tool.
5. **Interpretive choice** — the same phrase played three defensible ways, with
   the learner asked to choose and justify. No single "correct" answer.
6. **Substantial repertoire**, played whole.

**Infrastructure required**
- Slur and phrase-mark rendering (curved SVG paths over note groups).
- Staccato dots, accents, tenuto marks.
- Hairpin crescendo/diminuendo glyphs.
- Pedal marks.
- **Sustain-pedal input.** Whether the target device can report pedal state is
  an open hardware question that needs answering before this level is built.

---

## KL7 — Advanced Musicianship

**Premise:** an expert reader sees *structure* — form, modulation, texture —
not just notes. This level trains that top-down perception.

**Teaches**
1. **Form recognition at sight** — binary, ternary, rondo, theme and variations.
2. **Modulation** — hearing and reading a change of key mid-piece.
3. **Chromaticism and accidentals in context**; the natural sign doing real
   work.
4. **Compound time** — 6/8, 9/8 — and the different *feel* of a beat that
   divides in three.
5. **Ornaments** — trills, mordents, appoggiaturas, historically informed.
6. **Score reading** — following a piece beyond the learner's own playing level.
7. **Transposition** at sight, as a test of pattern understanding.

**Infrastructure required**
- Compound time signatures and triplet beaming.
- Ornament glyphs.
- Multi-system layout becomes essential, not optional.
- Section markers (A/B/A labelling on the staff).

---

## KL8 — Performance Mastery

**Premise:** the learner should leave. This level's success criterion is that
KeyMaster becomes unnecessary.

**Teaches**
1. **Independent practice method** — diagnosing one's own weak bar and
   designing a drill for it, without being told which bar it is.
2. **Learning a new piece unaided**, start to finish, with the app observing
   rather than instructing.
3. **Memorisation** — structural, not muscular.
4. **Performance psychology** — nerves, recovery, continuity under pressure.
5. **Programme building** — choosing pieces that work together.
6. **Substantial repertoire performed complete**, at roughly Grade-8-equivalent
   musicianship — *KeyMaster's own standard, not an exam syllabus*.

**Infrastructure required**
- A practice-diagnosis mode (the app identifies weak bars from performance data
  but withholds them, asking the learner to identify them first).
- Whole-piece performance capture and review.

**Design warning:** the temptation at KL8 is to make it *harder*. The correct
move is to make it *quieter*. Hand-holding must visibly fall away.

---

## Cross-cutting engineering roadmap

Ordered by when it blocks:

| # | Capability | Blocks | Size |
|---|---|---|---|
| 1 | Multi-system staff (wrap to 2nd line) | KL3 | Medium |
| 2 | **Simultaneous notes / chords** | KL4 | **Large** |
| 3 | Per-hand target evaluation | KL4 | Medium |
| 4 | Harmonic labels under staff | KL5 | Small |
| 5 | Slurs, articulation, hairpins | KL6 | Medium |
| 6 | Sustain pedal input | KL6 | Unknown — hardware question |
| 7 | Compound time + triplet beaming | KL7 | Medium |
| 8 | Ornament glyphs | KL7 | Small |
| 9 | Practice-diagnosis mode | KL8 | Large |

**Item 2 is the critical path.** Chord rendering is required by KL4 and every
level after it. It should be built as its own isolated, regression-tested
change against the current `staffViz.js` baseline, exactly as rc2-213 was.

---

## Repertoire policy

Standing rule: **named historical works are never transcribed from memory.**

Verified so far:
- **BWV Anh.114 / 115** — by **Christian Petzold** (c.1720), not Bach.
  Misattributed through the 1725 Notebook for Anna Magdalena Bach. Public
  domain. *Pitches not yet verified — not transcribed.*

Still requiring verified source: Beethoven *Ode to Joy*; Mozart *Minuet K.2*.

**To unblock any of these:** supply machine-readable score data (MusicXML,
MIDI, LilyPond or ABC) from a reputable public-domain edition. Scanned PDFs
are not sufficient — text extraction from IMSLP scans returns layout and
rhythm marks with no recoverable pitch data.

Original KeyMaster material remains legitimate where it performs a precise
teaching function, but from KL4 onward real repertoire should carry
progressively more of the weight.
