# Relay Note — rc2-215

**Build:** rc2-214 → **rc2-215**
**Headline:** three cleanups closed, multi-system notation built, **Key Level 3
BUILT + MACHINE-VERIFIED**. KL4–KL8 remain DESIGNED and unbuilt — see §6, which
is the honest part of this note.

---

## 1. The three cleanups

**(a) `courseMap.js` imports unified.** `app.js` used `?v=rc2-83`,
`foundations.js` used `?v=rc2-55`, so the module loaded twice as two distinct
instances. Investigated before changing: `courseMap.js` is **pure data plus pure
functions with no module-level mutable state**, so the split was wasteful (a
duplicate fetch, parse and `STAGES` array) rather than corrupting. Unified to
`?v=rc2-83` — the later reference, so browsers already holding that URL do not
re-fetch. Now single-instance.

**(b) `kl1-finger-phrase` corrected.** Was C–E–D–C as
crotchet/crotchet/crotchet/minim = **5 beats in one 4/4 bar**, with the barline
drawn after the final note. Now two honest bars:

| | Notes | Beats |
|---|---|---|
| Bar 1 | C(♩) E(♩) D(𝅗𝅥) | 4 |
| Bar 2 | C(𝅝) | 4 |

**Narration implications — checked deliberately, not assumed.** All three
recorded lines (`say.0`, `say.1`, `reteach`) speak only about fingering and
pitch: *"thumb on C, skip up to E with finger three, step down to D, home to
C."* **No line mentions rhythm or note values.** Pitches, fingering, `demo` and
`targets` are all unchanged, so playback is byte-identical. **No voice
regeneration required.**

**(c) `kl1-review-2.mp3` stays on the voice list, not the critical path.**
Still flagged in `tools/voice-lines.json` with `needsRegeneration: true`. One
line, one MP3, deferred to the eventual voice batch. It has blocked nothing.

**The musical-consistency audit now reports 0 errors across all 101 staff cards
in the entire course** — the first time that has been true.

---

## 2. New infrastructure — multi-system (wrapping) notation

`staffViz.js`, `opts.systems: [n, …]` — 1-based note indices at which a new line
begins.

- Out-of-range, zero, duplicate and unsorted entries are all handled; absent
  means one system.
- **Time signature stated on the first system only**; **key signature repeats on
  every system** — both real engraving conventions, both tested.
- Each system gets its own clef, staff lines and end barline.
- **A beam may not span a system break** and is refused if it tries, falling
  back to flags rather than drawing something wrong.
- The `viewBox` grows to contain the extra systems.

This required refactoring the beam helpers from item-based to index-based
accessors — a non-trivial internal change.

**Hashes:** rc2-214 `a63be860c739` → rc2-215 `f1b0972c9e70`.
Rollback copies of **both** prior renderers ship in `tools/`
(`_staffViz.rc2-210.js`, `_staffViz.rc2-214.js`).

**Regression proof after the refactor: still 77/77 course cards and 14/14
synthetic cases byte-identical to rc2-210.** Zero differences.

---

## 3. Key Level 3 — Pattern Fluency (BUILT)

**8 chapters, 20 cards.** The premise: by KL2's end the learner reads accurately
but one note at a time. KL3 trains *chunking* — seeing distances and shapes
instead of note-heads.

| Ch | Name | Teaches |
|---|---|---|
| 1 | Reading by Distance | 2nds/3rds by shape, not counting |
| 2 | Wider Steps | 4ths/5ths; name the leap before moving |
| 3 | The Thumb Passes Under | first real technical mechanism |
| 4 | The C Major Scale | full octave both ways, as one gesture |
| 5 | Patterns That Repeat | sequence — **first wrapped notation** |
| 6 | Riverlight | 7 bars across two systems |
| 7 | Reading Ahead | scan-before-play as explicit habit |
| 8 | KL3 Review | undemonstrated sight-read, two systems, sharp key |

Chapter 3 is the one to look at first: the thumb-under is what makes the
keyboard wider than the hand, and it is taught with an *aural* success test —
if you can hear where the thumb passed under, it was not smooth enough.

---

## 4. Validation — all green

```
test-staffviz-diff.mjs       77/77 + 14/14 byte-identical, 0 differences
test-staffviz.mjs            444 passed, 0 failed  (was 427; +17 wrapping tests)
validate-kl2a.mjs            55 cards (KL2 35, KL3 20), 0 errors, 0 warnings
audit-musical-consistency.mjs 101 cards, 0 errors, 0 warnings
verify-kl2a-build.mjs        0 errors; course = 239 steps
check-versions.mjs           0 errors, 0 notes
```

`coursePianoSampler.js` `d0835e23bd1a` ✓ · `pianoVoice.js` `884bab6ea5d9` ✓

**The tooling caught three real errors this build** that would otherwise have
shipped: two short bars in Riverlight (a genuine compositional error — the
closing phrase held 2 beats in a 3/4 bar, fixed by completing the music, not by
moving the barline), and two un-bumped cache-busters on `courseChapters.js` and
`courseKeyLevel2.js`. The validators are now generalised across levels, so they
will keep working as KL4+ arrive.

---

## 5. Version map

`KM_BUILD = 'rc2-215'` · `sw.js CACHE = 'keymaster-rc2-215'`
Bumped: `staffViz.js`, `courseKeyLevel1.js`, `courseKeyLevel2.js`,
`courseKeyLevel3.js` (new), `courseChapters.js`, `foundations.js` (×6 from
`app.js`), `app.js` (from `index.html`).

---

## 6. What is NOT built — and why I stopped here

**KL4–KL8 are DESIGNED, not built.** I have not raced ahead, and I want to be
straight about the reason rather than imply more progress than exists.

**KL4 is gated on simultaneous/chord notation, which does not exist yet.** The
renderer lays every note out sequentially along the x-axis; two pitches sounding
together genuinely cannot be drawn. KL4's entire subject is two hands doing
different things at once, so it cannot be written honestly without it. Faking it
would violate the standing instruction not to fake notation to avoid engineering
work.

Chord rendering is a **large** change — note layout, shared stems, seconds
displaced across the stem, accidental stacking, collision handling — and it
touches the same protected renderer three builds have now kept byte-identical.
It deserves its own isolated, regression-tested build with the same discipline
applied here, not a rushed appendix to this one.

**That is the next single piece of work**, and it unlocks KL4 through KL8.

Also still open, unchanged:
- **Repertoire blocked** — Petzold provenance verified (BWV Anh.114 is his,
  c.1720, not Bach's); pitches unverifiable from IMSLP scans. Needs MusicXML,
  MIDI, LilyPond or ABC from a reputable public-domain edition.
- **Sustain pedal input (KL6)** — open hardware question.

---

## 7. Device check, when you have the energy

Nothing here is DEVICE-VERIFIED. No urgency; the build sits safely.

1. Course Map shows **Key Level 3 — Pattern Fluency** open, 8 chapters, below
   KL2.
2. **KL1 and KL2 unchanged** — the machine proof says they must be.
3. KL3 Ch5–6: notation **wraps onto a second line**, each line with its own
   clef; the time signature appears **once**, on the first line only.
4. KL3 Ch8 review: two systems in G major — key signature repeats on **both**
   lines.
5. `kl1-finger-phrase` (KL1) now shows two bars; **its narration should still
   match**, since only note lengths changed.
6. Piano tone and demo playback unchanged.
