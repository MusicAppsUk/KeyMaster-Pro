# KeyMaster PRO — Audio System Manifest

**Status:** Doctrine (authoritative). Single source of truth for the KeyMaster PRO
audio and voice direction.
**Scope:** Architecture and policy only. This document grants **no permission** to
wire live paid APIs into the app.
**Owner decision:** Tim (product owner).
**Audience:** All AI collaborators working on KeyMaster PRO (Claude, Gemini, and any
other assistant). Where any prior note, plan, or assistant suggestion conflicts with
this manifest, **this manifest wins** until Tim revises it.
**Version:** manifest-v1 · aligned to app build rc2-84.
**Filed outside the app bundle** (not inside `flat/`, not in the shipped zip), so the
build currently under test is untouched.

---

## Licensing evidence (current)

**Status: cleared to generate a fixed pack via the API.** Written confirmation
received from ElevenLabs (contact: Dom) covering KeyMaster PRO specifically. The
confirmed rights, in substance:

- Generate fixed tutor-narration lines via the ElevenLabs API on a **paid plan**.
- **Export** the generated audio as **MP3** files.
- **Embed / cache** those MP3s inside KeyMaster PRO for **local playback**.
- The app **does not need to call the API at runtime**.
- We **retain the right to use those specific generated files** even if the
  subscription is later cancelled or changed.
- **Creator or Pro** is a suitable starting plan for expected usage.

The full correspondence is kept privately, **off-repo**, and is **not** included in
the shipped app or any committed file. This block records only the substance for
the build record. Generation remains gated on Tim's go-ahead and approved copy.

---

## Selected voice (current)

| | |
|---|---|
| **Selected voice** | **Jack** |
| **Selected voice ID** | `RL2gbGArFsmr05q4aJLj` (this is the voice ID, **not** an API key) |
| **Purpose** | KeyMaster PRO premium tutor narration |
| **Generation method** | Pre-rendered fixed pack (rendered once, at build time) |
| **Runtime method** | Local MP3 playback only, by stable line ID |
| **Fallback** | Captions / browser TTS, only if a local file is missing |
| **Tooling** | `tools/generateVoicePack.mjs` (dry-run default, env-only key); default voice = Jack |
| **Key handling** | `ELEVENLABS_API_KEY` from the environment only — never in the app, GitHub Pages, `app.js`, `premiumVoice.js`, `index.html`, or any committed config |
| **Generated?** | **No.** Pipeline ready and dry-run-verified; full pack awaits explicit instruction + approved copy + written redistribution rights. |

---

## 0. The core decision (read this first)

KeyMaster PRO is sold on a **one-off purchase / ownership** model. Therefore:

> **The core Course voice must not depend on live, per-use text-to-speech.**
> Repeating a lesson must never generate a new API call or a new cost. The voice a
> learner owns must play the same way, at zero marginal cost, ideally offline.

Everything below follows from that single commercial constraint. The voice is a
**fixed, embedded, licensed asset** — not a runtime service call.

---

## 1. Doctrine (the rules)

1. **Embedded fixed voice pack for the core Course.** Core Course narration plays
   from pre-rendered local audio files shipped with the app, addressed by stable
   line IDs. Generated or recorded **once**, exported as compressed local audio,
   played locally.
2. **No live runtime TTS for normal lessons.** Do **not** wire ElevenLabs, OpenAI,
   Google, Azure, or any other live TTS service into the runtime for core Course
   narration. No per-play or per-user API cost is acceptable in the core path.
3. **Premium, warm, adult tutor voice.** Calm, encouraging, precise, never childish,
   never robotic. One consistent voice identity across the whole Course.
4. **Browser/OS TTS is not the product voice.** Android/iOS/desktop default
   SpeechSynthesis is acceptable **only** as a temporary development stand-in and as
   a last-resort fallback when no audio file exists for a line. It must never be
   presented as the shipped premium voice.
5. **Captions are always present.** Every spoken line has an on-screen caption. The
   lesson must be fully usable with audio muted or unavailable. Audio enriches; it
   never gates.
6. **Stable voice line IDs.** Each spoken line has a permanent ID. Copy can be
   re-recorded, re-voiced, or localised without changing IDs or touching lesson code.
7. **Pronunciation is specified, not improvised** (see §6). Musical accidentals and
   ambiguous words are normalised by rule so every voice pack says them correctly.
8. **Scales audio is protected and untouched** (see §3·A).
9. **Licensing is verified before anything ships** (see §7). No pack is assumed
   redistributable until the exact plan, voice, and rights are confirmed in writing.
10. **The optional online AI tutor is a separate product layer** (see §8). It is
    never the core Course narration and never a dependency of it.

---

## 2. Current state vs. target (be honest with each other)

**Today (rc2-84):** the spoken Course voice is `tutorVoice.js` — a thin, isolated
wrapper over the browser's on-device **SpeechSynthesis**. It speaks short phrases
that *parallel* the on-screen captions, is optional and muteable, cancels overlapping
utterances, and is a silent no-op when speech is unavailable. It uses **no network
and no assets**.

**Under this doctrine, that browser-TTS path is re-designated as Tier 3 — the
development / last-resort fallback — not the product voice.** The shipping premium
voice is the embedded pack (Tier 1), which does not yet exist. Building it is future
work, gated on licensing. Nothing in the current build is "wrong"; it is simply the
fallback tier, and the manifest makes that explicit so no assistant mistakes
on-device TTS for the finished product voice.

**No code change is required by this manifest.** It defines the destination and the
seam; the migration happens in a later, separately-approved build.

---

## 3. The three audio subsystems — keep them distinct

A recurring risk is conflating three different things that all make sound. They are
separate, with separate rules. Do not merge them.

### A. Protected Scales audio — `synth.js` + `scaleEngine.js`
The Scales Masterclass instrument audio. **Do not modify. Do not refactor. Do not
route the voice system through it.** Treated as frozen. (Integrity is checked by hash
every release.) This manifest never asks anyone to touch it.

### B. Course instrument audio — `courseVoice.js`
An **original** Web-Audio module used by the Course for two non-speech jobs: the
tutor's note **demonstration tone** ("watch this" playback) and the soft
**metronome tick** during pulse / count-in exercises. It is synthesised locally from
the app's existing AudioContext — **no files, no network, no cost, no TTS**. It is
*instrument sound*, not narration. It stays as-is and is **out of scope** for the
voice-pack work, except that it must remain clearly distinct from spoken narration.

### C. Course spoken narration — the tutor voice (the subject of this manifest)
The warm adult tutor *speaking*. Today: `tutorVoice.js` → browser TTS (Tier 3).
Target: an embedded premium voice pack (Tier 1) resolved by line ID, with captions
(Tier 2) and browser TTS (Tier 3) as fallbacks. **This is the only subsystem this
manifest governs.**

---

## 4. Voice line ID system

Every spoken line gets a **permanent, human-readable ID**. IDs are the contract
between lesson content and audio assets: content authors write copy + caption + ID;
the voice pack supplies an audio file per ID; the runtime resolves ID → file.

**Recommended scheme** (to be finalised when the pack is built):

```
<stepId>.<slot>          e.g.  orient-rows.explain
                                hand-shape.try
                                semitone-ef.caption
```

- `stepId` is the existing Course step `id` (already stable in `foundations.js`).
- `slot` names the spoken role on that step: `explain`, `try`, `caption`, `praise`,
  `hint`, `recover`, `chapter-intro`, etc.
- IDs are **append-only and immutable.** If a line's wording changes, keep the ID and
  re-record. If a line is removed, retire the ID; never reuse it for different copy.

A small **manifest map** (e.g. `voiceLines.json`) pairs each ID with: canonical
spoken text, caption text, audio filename, duration, and pack/voice metadata. This is
the single index a pack is generated against and validated against.

---

## 5. Resolution & fallback chain

At play time, a line ID resolves down a strict priority chain. **Tier 1 is the
product; the rest are safety nets.**

1. **Tier 1 — Embedded premium pack.** If an audio file exists for the ID in the
   active voice pack → play the local file. (This is the normal, shipped path:
   licensed, fixed-cost, offline-capable.)
2. **Tier 2 — Caption only.** If audio is muted, missing, or the pack is absent → the
   on-screen caption already carries the meaning. The lesson proceeds fully. Silence
   is an acceptable, dignified state.
3. **Tier 3 — Browser TTS (development / last resort only).** Only when explicitly in
   a development/fallback mode **and** no Tier-1 file exists, the on-device
   SpeechSynthesis may speak the normalised text. Never the default shipped
   experience; never presented as the premium voice.

The chain must **degrade silently and safely** — exactly as `tutorVoice.js` already
does (no-op when speech is unavailable, nothing blocks the lesson).

---

## 6. Pronunciation rules (canonical)

These already exist in code (in `tutorVoice.js` for TTS and `foundations.js` for
captions/copy) and are hereby **canonical for every voice pack and every assistant.**
When a human or AI script is generated/recorded, the spoken text must already be
normalised to these forms.

**Accidentals — say the words, never the symbols or letters:**

| Written | Spoken |
|---|---|
| C♯ / C# | "C sharp" |
| D♯ / D# | "D sharp" |
| F♯ / F# | "F sharp" |
| G♯ / G# | "G sharp" |
| A♯ / A# | "A sharp" |
| B♭ / Bb | "B flat" |
| E♭ / Eb | "E flat" |
| A♭ / Ab | "A flat" |
| D♭ / Db | "D flat" |
| G♭ / Gb | "G flat" |

- Never speak "C hash", "C pound", "B b", or spell the symbol.
- **Visual notation keeps its symbols** (♯ ♭ on the staff and key labels are
  unaffected); only *spoken text and captions* are normalised.

**Ambiguous words — avoid in spoken/caption/title/prompt copy:**

- Avoid bare **"read" / "Read"** as an instruction, because TTS renders it as the
  colour "red" and it is ambiguous aloud. Use **"look at", "follow", "find", "play",
  "see"** instead.
- The gerunds **"reading" / "Reading"** (e.g. the *Reading the staff* chapter title)
  are fine — they are unambiguous aloud.
- This is an **authoring rule for spoken-facing copy.** Code comments and internal
  identifiers are unaffected.

**General spoken style:** short sentences; one idea per line; finger numbers spoken as
digits in context ("finger two"); octave/register read naturally ("middle C", not
"C four") unless precision is required.

---

## 7. Licensing — verify before anything ships

No voice pack may be generated, embedded, or shipped until the rights are confirmed
**in writing** for the **exact** plan, voice, and use.

Two acceptable routes, each with a hard gate:

- **Route A — AI-generated fixed pack (e.g. ElevenLabs).**
  - **Do not assume** a subscription grants redistribution. Verify, for the specific
    plan and voice: the right to **export** generated audio, **embed** it in a
    distributed/sold app, **redistribute** it to end users, and retain that right if
    the subscription later lapses (ownership model implication).
  - Confirm whether the chosen voice is a permitted commercial voice and whether
    attribution or any per-distribution term applies.
  - Capture the plan name, voice name/ID, date, and the exact licence clause in this
    repo before generation.
- **Route B — Recorded human tutor.**
  - A **written commercial agreement** with the voice talent covering recording,
    editing, embedding in a sold app, redistribution, future re-use, and localisation
    intent. Buyout vs. royalty terms recorded explicitly.

Either way: audio is produced **once**, exported as **compressed local files**
(format/bitrate chosen for size vs. clarity at the pack-build stage), and shipped with
the app. The generation/recording tool is **not** a runtime dependency.

**Until a route is verified, the app stays on Tier 2/Tier 3 (captions + dev TTS).**

---

## 8. Future optional online AI tutor (separate layer)

A live, conversational AI tutor (dynamic spoken answers, adaptive coaching) may be
considered **later** as an **optional, clearly-separate, online premium layer**. It is
explicitly **not** the core Course voice. Rules:

- It must never narrate core lessons or be a dependency of core playback.
- It is opt-in, visibly an online feature, and its costs/limits are its own — they
  never touch the owned, offline-capable core experience.
- It does not bypass §1.2 (no live TTS in the **core** path). A separate premium tier
  having its own online costs is a different commercial product, decided separately.

Keep the two mental models firmly apart: **owned core voice** (fixed, embedded) vs.
**optional online tutor** (live, separate, later).

---

## 9. Architecture seam (interfaces only — no live API)

The seam below is **descriptive**: it is the shape the code should take when the pack
work is approved. **Do not implement live API calls. Do not add network calls to the
core voice path.** This is planning, not a build instruction.

```
                       ┌─────────────────────────────┐
   lesson code  ──►    │   speakLine(lineId)         │   (single entry point;
   (foundations)       │   — never raw text          │    lesson code only ever
                       └──────────────┬──────────────┘    references stable IDs)
                                      │
                       ┌──────────────▼──────────────┐
                       │   VoicePack resolver         │
                       │   id → { file, caption }     │   (reads voiceLines.json +
                       └──────────────┬──────────────┘    the active pack)
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                        ▼
   Tier 1: play local file   Tier 2: show caption    Tier 3: dev TTS only
   (embedded premium pack)   (always available)      (no file + dev mode)
```

Design notes for whoever builds it later:
- **One entry point.** Lesson code calls `speakLine(id)`, never a TTS API and never
  raw text. The resolver owns the fallback chain.
- **Pack is swappable data.** The active pack (files + `voiceLines.json`) is selected
  by config; swapping packs (different voice, different locale) requires **no lesson
  code change** because IDs are stable (see §4 and §10).
- **Captions come from the lesson content**, already present today; the resolver just
  surfaces them on Tier 2/3.
- **Preserve the existing safety guarantees** of `tutorVoice.js`: optional, muteable,
  non-overlapping, no-op when unavailable, never blocking.
- **Keep `courseVoice.js` and `synth.js` out of this path entirely** — instrument
  sound is not narration (§3).

---

## 10. Localisation & pack replacement

Because IDs are stable and the pack is data:

- A new language = a new pack (audio files + translated `voiceLines.json`) under the
  same ID set. Lesson code is untouched.
- A new voice (e.g. a different premium tutor) = a new pack under the same IDs.
- Pronunciation rules (§6) are per-language; the English rules above are canonical for
  the English pack. New locales define their own normalisation table.
- Missing IDs in a pack degrade gracefully to Tier 2/3 for those lines only.

---

## 11. What NOT to do (explicit)

- Do **not** wire ElevenLabs / OpenAI / Google / Azure / any live TTS into the runtime
  for core Course narration.
- Do **not** create a per-play or per-user API cost in the core path.
- Do **not** ship Android/browser default TTS as the product voice.
- Do **not** assume any ElevenLabs (or other) licence is sufficient until the exact
  plan, voice, and redistribution rights are verified in writing.
- Do **not** touch `synth.js` / `scaleEngine.js` (protected Scales audio).
- Do **not** route narration through `courseVoice.js` or the Scales synth.
- Do **not** let the optional future online tutor become a dependency of core lessons.
- Do **not** reuse or renumber a retired voice line ID.

---

## 12. Pre-ship checklist (before any premium pack goes live)

- [ ] Licensing route (A or B) chosen and rights **confirmed in writing** in-repo.
- [ ] Voice identity chosen (warm, adult, premium) and approved by Tim.
- [ ] `voiceLines.json` map authored: every spoken line has an ID, caption, and
      normalised spoken text (§4, §6).
- [ ] Pronunciation pass applied to all spoken text (accidentals + "read"→safe verbs).
- [ ] Pack generated/recorded **once**, exported as compressed local files.
- [ ] Resolver implements the Tier 1→2→3 chain with the existing safety guarantees.
- [ ] Captions verified present for 100% of lines (lesson usable fully muted).
- [ ] Scales audio + `courseVoice.js` confirmed untouched (hash check).
- [ ] Device test: voice feels premium; offline playback works; repeat lessons incur
      no network/cost.

---

*End of manifest-v1. Revisions require Tim's sign-off; bump the version and note the
date. Keep this the single source of truth — supersede ad-hoc audio decisions by
pointing here.*
