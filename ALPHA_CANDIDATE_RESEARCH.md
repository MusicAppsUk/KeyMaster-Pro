# KeyMaster PRO — Alpha Candidate Product Research & Plan

The strategic record for getting KeyMaster PRO from "working prototype" to a sendable,
commercially-credible Alpha Candidate. Competitor descriptions are paraphrased from public
reviews (sources at the end). No competitor layout, wording, artwork, songs, or assets are copied.

---

## 1. Frank diagnosis — why rc2-63 was not a sendable alpha

The honest causes, named plainly:

1. **The wrong layer was optimised.** rc2-61→63 improved what is *headlessly verifiable* — copy,
   lesson content, course structure, progress logic, tokens. But "premium / modern / alive" is
   decided by the *visual and experiential* surface, which is exactly the layer that can't be
   self-verified without a human looking at the rendered screen. Effort went where it could be
   measured, not where the gap was.

2. **The product's mental model is a utility, not an experience.** It is a dashboard plus
   lesson-cards-in-a-column. A premium app is an *environment*: a front door, a sense of place,
   atmosphere, and flow between spaces. Cards in a column read as a worksheet or a dev prototype
   no matter how good the copy is. This is structural, not cosmetic.

3. **The visual system is too thin.** Flat black/gold panels, little depth, no light, almost no
   colour life, minimal motion. Modern premium interfaces use layered depth, gradient, light,
   considered restraint *with* richness. Monochrome-flat reads as "theme," not "product."

4. **The voice actively cheapened it.** Leaning on staccato browser TTS as the experience
   undermined the whole feel. The right move is to design *around* it (captions-first), not polish it.

5. **"Coming soon" placeholders signal unfinished.** Honest, but they cheapen the surface. A
   premium interim visual must look finished in its own right.

6. **The meta-cause (the important one):** the visual axis has been built blind, three times, with
   three misses. That isn't sustainable. The execution model must change so a human eye is in the
   loop on visual packages — in a few meaningful reviews, not constant micro-tests.

7. **"Alpha" was misapplied.** Alpha = *sendable to musician friends*, a holistic experiential bar.
   It was attached to structural increments. It should only be declared when the whole experience
   clears the bar.

---

## 2. Benchmark analysis (Skoove · Flowkey · Simply Piano)

Studied for first impression, visual system, lesson screen, feedback, emotional pull, video, voice.
Paraphrased, not copied.

**The shared winning loop (all three):** friction-free onboarding → *playing real music within
minutes*; a clean, uncluttered screen; live, colour-coded note feedback; a patient "wait mode"; and
a clear sense the app knows what it's doing.

- **Flowkey — the visual benchmark.** Reviewers describe it as slick, modern, minimal, and
  "thoroughly considered… like a beautiful instrument," calm and focused on the music rather than
  the chrome, with a familiar streaming-service layout. Its weakness is a teaching one: it's
  *too forgiving* (wrong rhythm/technique, it moves on), and can feel like disconnected courses
  "without a clear common thread."

- **Simply Piano — the onboarding/feedback benchmark.** An appealing design that deliberately
  "creates a positive learning environment," built mobile/tablet-first to remove friction; notes
  are colour-coded (correct / mistake / hint-after-hesitation), and it's heavily gamified for
  momentum and immediate reward. Weakness: the learning *plateaus*, and it's gamification-first
  rather than literacy-first.

- **Skoove — the credibility benchmark.** Rated best-overall in 2026 round-ups for combining
  real-time listening feedback *with* sheet-music instruction from day one, plus voice-over and
  instructional video and genuine technique depth (scales, hand independence). It teaches *how to
  practise*, the nearest market analogue to a tutor.

**The gap they all leave — and it is KeyMaster's opening.** Market round-ups now explicitly frame
the prize as "genuine musical literacy, not just coloured-dot following," and note these apps lean
on song-following and plateau on real musicianship. KeyMaster's musicianship-led, tutor-led
position is the differentiator — *if* it can match their polish.

**Must NOT copy:** their layouts, song libraries, subscription framing, Simply Piano's
gamification, the coloured-dot follow-the-cursor model, or any wording/art/onboarding sequence.

---

## 3. KeyMaster PRO visual/product direction (original)

A premium identity that is *ours*, not a clone:

**Concept — "the studio at dusk."** A real instrument in a warm, low-lit room — but enriched into a
*living, modern space*, not flat black panels. Depth is layered: ebony base → midnight-blue depth →
warm pools of brass/amber light → champagne highlights, on luminous rather than matte surfaces.

**Spatial model — from "lesson card" to "learning room."** The keyboard is the hero object at the
centre of a generous stage; the tutor's words and visual cues orbit it; chrome recedes. This is the
structural shift that makes it feel like the main event.

**Light as the language.** Correct notes make the space *bloom* with warm/emerald light; the target
glows amber (already present); a mistake is a soft rose guide, never a buzzer. Reward is luminous,
not points — engagement without gamification.

**Motion as breathing and arrival, not decoration.** Entrance rise/fade, a slow amber breath, a
success shimmer, smooth transitions between spaces. CSS opacity/transform only; reduced-motion safe.

**Proposed enriched palette (roles, to be tuned on-device):**
- Ebony base `#0E0C0A` · Midnight depth `#16203A` / `#1B2742` · Brass `#C99A4B` · Amber glow
  `#E0A33C` · Champagne `#E8C57E` · Emerald success `#5FB58C` · Soft rose `#D98A8A` · Ivory text
  `#F4EFE6` · one cool "intelligent" accent (a restrained teal, e.g. `#4FB0A8`) used *sparingly* for
  interactive/AI moments. Midnight + cool accent are what move it from "black & gold" to "alive."

**Typography:** keep Fraunces for display (editorial, premium); clean UI sans for controls.

**Differentiation, stated:** musicianship-led, tutor-led, MIDI-precise, ownership (no subscription
nag), and a *real curriculum with a through-line* — the very thing Flowkey is criticised for lacking.

**Standard to hold each screen to:** would this stand beside Flowkey visually, Simply Piano in
onboarding clarity, Skoove in credibility — while staying original and more musicianship-led?

---

## 4. Concrete Alpha Candidate plan (work packages)

Sequenced. Each notes whether it needs Tim's eyes or is self-verifiable.

- **WP0 — Practice Rooms tap fix (code-level).** Ruled out: the welcome overlay (it's removed,
  pointer-events:none). Remaining suspects to verify: stacking/z-index of the hero vs the launcher,
  any transparent layer, tap-target size, `touch-action`, hash-route handlers for #/scales etc.
  Apply defensive fixes (explicit z-index, `touch-action: manipulation`, larger tap targets).
  *Mostly self-verifiable; Tim confirms once on device.*

- **WP1 — Visual foundation & "learning room" (the big one).** Enriched colour/depth/light system +
  re-spatialise the Course view and dashboard from cards to a generous stage with the keyboard as
  hero. *Needs Tim's eyes — ships as a visual draft for review.*

- **WP2 — Front door.** Splash/welcome screen (KeyMaster PRO identity, tasteful motion, greeting,
  "Continue as Tim", one clear way in) + polished transition into the Course. Honest, no fake
  account system. *Needs Tim's eyes.*

- **WP3 — Course structure (self-verifiable pedagogy).** Six connected, alpha-level stages:
  1 Keyboard orientation & landmarks · 2 First reading · 3 Rhythm & pulse · 4 First scale pathway ·
  5 First chords/harmony · 6 Applied-music preview. Intentional and connected, not locked headings.

- **WP4 — Premium visual teaching.** Replace "coming" placeholders with *finished-looking* animated
  SVG/CSS teaching panels (posture, hand shape, keyboard geography, Middle C, B-major shape, pulse).
  Video-ready architecture retained, but interim visuals are real and premium. *Needs Tim's eyes.*

- **WP5 — Voice strategy (self-verifiable design).** Captions-first: the Course must read beautifully
  with text alone. Browser TTS demoted to a hidden, optional fallback (never the headline). Spec a
  small premium voice pilot (recorded human or licensed AI) for the opening lines as the real path.

- **WP6 — Alpha QA & gate.** Red-team against the 13 questions; declare "Alpha Candidate" only when
  WP1–5 cohere and the experience is genuinely sendable.

**Execution model (the process fix for Tim's fatigue + the blind-build problem):** each *visual*
package (WP1, WP2, WP4) ships as a clearly-labelled "visual draft for review" — one look per
package, not micro-tests. Non-visual packages (WP0, WP3, WP5, WP6) are largely self-verified.
"Alpha Candidate" is reserved for the end. To make WP1 land first time, it would help enormously if
Tim shares one or two reference images/apps whose *vibe* he likes (for calibration, not copying), or
reacts to a single bold visual draft.

---

## 5. Build / Defer / Preserve

**Build for the Alpha Candidate:** WP0–WP6 above (Practice Rooms fix; visual foundation & learning
room; front door + transition; six-stage course; premium visual teaching; captions-first voice;
alpha QA).

**Defer to post-alpha:** real AI/licensed teaching video production; acoustic/microphone recognition
(future pillar, framed confidently — MIDI gives exact note data for precise teaching); premium voice
asset production beyond the pilot; deep commercial per-stage lesson depth; accounts / sign-in /
payments; Chord Masterclass overhaul (leave stable; superficial nav/copy only).

**Preserve (do not destabilise):** Scales audio (untouched), Scales Masterclass, Cognitive
Sight-Reading, MIDI routing, NoteInput, Event Bridge, progressStore, visible build tag, the
no-launcher correction, the overlay system where useful, the premium-voice architecture, and the
protected RC2 foundations.

---

## Source notes (paraphrased, not quoted)
Flowkey: musicindustryhowto.com; teds-list.com; pianodreamers.com; trustpilot.com/review/flowkey.com;
pianistscompass.org; pianoers.com. Simply Piano: americansongwriter.com; learnopoly.com; jazzdixie.com;
musicradar.com. Market overview: stuff.tv (best piano apps 2026). Skoove: prior research pass
(ONBOARDING_RESEARCH.md). Retrieved June 2026; app specifics change — re-verify before decisions that
depend on a competitor's current behaviour.
