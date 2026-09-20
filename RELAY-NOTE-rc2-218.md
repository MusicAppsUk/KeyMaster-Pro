# Relay Note — rc2-218

**Build:** rc2-215 → **rc2-218**

## The headline

**The KeyMaster Course is built through Key Level 8.**

| | |
|---|---|
| Total course steps | **327** |
| Total chapters | **115** (75 in the KeyMaster Course) |
| Levels built this run | **KL4, KL5, KL6, KL7, KL8** |
| State | **BUILT + MACHINE-VERIFIED** |
| Device-verified | **Nothing. That is yours.** |

| Level | Name | Chapters | Cards |
|---|---|---|---|
| KL1 | First Musicianship | 16 | 66 (protected, unchanged) |
| KL2 | Real Repertoire | 10 | 35 |
| KL3 | Pattern Fluency | 8 | 20 |
| KL4 | Musical Independence | 9 | 22 |
| KL5 | Harmonic Fluency | 9 | 19 |
| KL6 | Expressive Repertoire | 8 | 18 |
| KL7 | Advanced Musicianship | 8 | 15 |
| KL8 | Performance Mastery | 7 | 14 |

---

## Repertoire — the blocker is gone

**A verified, machine-readable source was found and used.** The Minuets in
G major and G minor, BWV Anh.114 and 115, by **Christian Petzold**, from a
**CC0-1.0 public-domain LilyPond source**:

> https://github.com/jeandeaual/lilypond-piano-bwvanh114-115

Every pitch, duration and octave was **parsed programmatically** from that file
by a purpose-written LilyPond reader, then checked bar by bar against the metre.
Nothing was reconstructed from memory. The source `.ly` files ship in `tools/`
so the transcription can be re-checked independently.

**The G major Minuet is now taught complete — all 32 bars — across four levels:**

- **KL4** bars 1–8, both hands (its left hand holds one note per bar for five
  bars running, which makes it an almost perfect first lesson in independence)
- **KL6** bars 9–16, completing the first section — and bars 9–14 are
  note-for-note identical to bars 1–6, which is itself the lesson
- **KL7** bars 17–24, the second section, which **modulates to D major** via
  four C sharps against an unchanged key signature — textbook modulation, in
  real music the learner already half knows
- **KL8** bars 25–32, presented once with no breakdown, no fingering and no
  lit keys, because working out *how* to learn it is the exercise

The **G minor** Minuet (BWV Anh.115) appears in KL5 as the major/minor
comparison: the same composer, the same dance, the same tonic, differing only
in mode.

**Attribution is taught, not just recorded.** KL4 has a card on why the piece
was credited to Bach for two centuries and why it is Petzold's.

**Ornaments** were deliberately omitted where they occur (bars 3, 5, 8) and
**restored at KL7**, where the curriculum places them — with the cards saying
so openly at both ends rather than quietly dropping them.

---

## Infrastructure built, in the order the curriculum demanded it

Each was an isolated, regression-tested change to the protected renderer.

| # | Capability | Needed by |
|---|---|---|
| 1 | **Chords** — shared stems, seconds displaced across the stem, accidentals stacked into columns | KL4 |
| 2 | **`hand: 'L'/'R'`** — puts a note on the correct staff regardless of pitch | KL4 |
| 3 | **Two-voice TIME-ALIGNED notation** — notes that sound together are drawn together | KL4 |
| 4 | **Score wrapping in bars** + a `km-staff--score` class so tall scores aren't scaled unreadably small | KL4 |
| 5 | **Flat-key spelling** — E flat drawn on the E space, not as D sharp | KL5 |
| 6 | **Roman-numeral analysis labels** | KL5 |
| 7 | **Articulation** (staccato, accent, tenuto), **slurs**, **hairpins**, **pedal lines** | KL6 |
| 8 | **Ornaments** (trill, mordent, lower mordent, turn) | KL7 |

Item 3 was the one that mattered most. The renderer previously spaced notes by
slot, so a crotchet in one hand took the same width as a quaver in the other —
making it impossible to *see* which notes coincide, which is the entire subject
of KL4. Entries are now placed by cumulative musical time, and **bar lines are
derived from the metre** rather than hand-counted, which removed a whole class
of error at source.

Ornaments are drawn as **original SVG paths, not font glyphs** — the Unicode
music block's ornament characters render unreliably on Android, and an ornament
that appears as a missing-glyph box teaches nothing.

**Protected renderer lineage:**
`rc2-210 7d7ca3979342` → `rc2-215 f1b0972c9e70` → **`rc2-218 2c7c69a7e7a7`**
Rollback copies of both earlier renderers ship in `tools/`.

**Audio untouched, as required:** `coursePianoSampler.js` `d0835e23bd1a` ✓ ·
`pianoVoice.js` `884bab6ea5d9` ✓ — byte-identical to the pristine repo, and no
audio version string was altered. Nothing in the piano, demo, MIDI, Scales or
routing paths was modified.

**One thing I did NOT need to build:** chord *playback* and chord *input*
already existed. `demoGap ≤ 0.12` triggers the engine's chord mode, and
`mode: 'set'` means "played together". The protected audio path was not touched.

---

## Validation — six harnesses, all green

```
test-staffviz-diff.mjs        77/77 course cards + 14/14 synthetic byte-identical
test-staffviz.mjs             544 assertions passed, 0 failed
validate-kl2a.mjs             143 cards, 0 errors, 0 warnings
audit-musical-consistency.mjs 163 staff cards, 0 errors, 0 warnings
smoke-render-all.mjs          186 staff cards rendered end-to-end, 0 errors
check-versions.mjs            0 errors, 0 notes
```

**The regression proof still holds after eight renderer changes:** every one of
the 77 pre-existing course cards renders **byte-identical** to the rc2-210
baseline. KL1 is untouched and provably so.

**The tooling found real errors this run**, all fixed:
- three miscounted bars and a wrong beam index in KL6
- a system break falling mid-bar in **KL4** (found only after I strengthened
  the audit to check cards using `systems` without `bars`)
- an incomplete 7-beat excerpt in KL7
- two KL5 cards demoing an arpeggio while asking for a block chord
- a **musical** bug in the chord engine: B flat and A sharp are the same key but
  different staff positions, and the first implementation drew them identically

Two new harnesses: **`smoke-render-all.mjs`** renders every card in the whole
course and checks each output for throws, NaN geometry, clipped note-heads,
silently-dropped beams or ornaments, and missing note-heads. **`check-versions.mjs`**
(from rc2-214) continues to catch un-bumped cache-busters.

---

## Pedagogy — the hand-holding genuinely reduces

This was a stated requirement and it is visible in the data, not just the prose:

- **KL4–KL5** teach normally, with full fingering and hints.
- **KL6** introduces the first card with **no right answer** — one phrase, three
  defensible readings, and the learner chooses and justifies.
- **KL7** supplies fingering **only at awkward moments** and says so; several
  cards ask a question and do not answer it.
- **KL8** is mostly `mode: 'none'` — the app stops lighting keys, stops checking
  notes and stops saying when you are finished. The final performance card is
  deliberately unmarked. Two questions about the closing section are asked and
  **left unanswered on purpose**.

KL8 teaches no new notation at all. Its subject is practice diagnosis,
structural memorisation, performance psychology, programme building — and
then it gets out of the way.

---

## Known issues and decisions for you and ChatGPT

1. **`kl1-review-2.mp3` voice desync** — still speaks "Confident Reading".
   Flagged `needsRegeneration` in the manifest. One line. Unchanged from rc2-214.
2. **No KL2–KL8 Jack audio has been generated.** All narration, hints, reteach
   and encouragement text is written and voice-ready, but generation remains an
   explicitly approved operation and **no spend has occurred**.
3. **The pedal cannot be checked.** KL6 teaches pedalling and says plainly, in
   the card itself, that KeyMaster cannot detect it and the learner must judge
   by ear. I would rather admit that than fake a feedback loop.
4. **Fingering in KL7–KL8 is sparse by design.** Worth confirming you agree —
   it is a pedagogical choice, not an omission.
5. **Beamed chords are refused**, not drawn. Legitimate engraving, not needed by
   the curriculum, and drawing one wrongly would be worse than flagging it.
6. **`courseMap.js` dual-version import** — fixed in rc2-215, still fixed.

---

## Install

Fourteen files replace their namesakes at repo root:
`staffViz.js` · `courseKeyLevel1.js` · `courseKeyLevel2.js` ·
`courseKeyLevel3.js` · `courseKeyLevel4.js` *(new)* · `courseKeyLevel5.js` *(new)* ·
`courseKeyLevel6.js` *(new)* · `courseKeyLevel7.js` *(new)* ·
`courseKeyLevel8.js` *(new)* · `courseChapters.js` · `foundations.js` ·
`app.js` · `sw.js` · `index.html`

Plus `tools/` — six checkers, the voice manifest, rollback copies of the
rc2-210 and rc2-215 renderers, and the two Petzold LilyPond sources.

`KM_BUILD = 'rc2-218'`, `sw.js CACHE = 'keymaster-rc2-218'`.

---

## When you have the energy — the device pass

Nothing here is DEVICE-VERIFIED. There is no urgency; the build sits safely.

1. **Course Map shows all eight Key Levels as open**, no "coming soon" bands.
2. **KL1 looks and sounds exactly as before** — the machine proof says it must.
3. **KL4 `kl4-minuet-both-see`** — the grand staff score. Check that notes
   sounding together are drawn **vertically aligned**, and that the score is
   readable rather than shrunk.
4. **KL5 `kl5-triad-play`** — a three-note chord: one stem, three heads.
   And `kl5-minor-hear` — the E flat must sit on the **E space**, not the D line.
5. **KL6 `kl6-touch-hear`** — slur arc above the first four notes, staccato dots
   under the next four.
6. **KL7 `kl7-ornament-minuet`** — the mordent sign draws as a zigzag, not a box.
7. **KL8 `kl8-minuet-whole`** — no lit keys, no marking. That is intended.
8. **Piano tone and demo playback unchanged** anywhere.

If a score looks squashed, the `km-staff--score` CSS rule is the first suspect —
that is the rule that stops tall multi-system music being scaled down to fit.
