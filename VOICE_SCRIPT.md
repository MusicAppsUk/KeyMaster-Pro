# KeyMaster PRO — Voice Pilot Script (Recorded-Human, Route A)

*Opening pilot pack. Record these exact lines; drop the files into
`voice/en-GB/`; set `PREMIUM_VOICE_READY = true` in foundations.js to activate.
Until then the Course uses captions (default) / browser-TTS fallback — unchanged.*

## Voice brief
Warm, calm, adult, premium, natural, musically intelligent. **Not** theatrical,
harsh, childish, or robotic. A real tutor sitting beside an adult beginner —
unhurried and encouraging, never sing-song. Accent: **en-GB**, neutral.
Pace: relaxed; leave natural breath at the end of each line (the app adds its own
pauses between lines, so don't rush the tail).

## Recording spec
- One file per line, named exactly as below.
- Format: **Ogg Vorbis** (`.ogg`), mono, ~128 kbps, 44.1 kHz; trim leading/trailing
  silence to ~80 ms. (We can convert from WAV masters — keep the WAVs.)
- Consistent mic distance / tone across all lines (they play back to back).
- Deliver into `voice/en-GB/`.

## Lines (17)

| # | File (`voice/en-GB/…`) | Line ID | Script | Delivery |
|---|---|---|---|---|
| 1 | welcome-0.ogg | welcome.0 | Welcome to the KeyMaster PRO Course. | warm, settling-in |
| 2 | welcome-1.ogg | welcome.1 | I'm your tutor. We'll go step by step, and you'll always know what to do next. | reassuring |
| 3 | welcome-2.ogg | welcome.2 | Sit comfortably — both feet down, shoulders easy, hands relaxed over the keys. Natural, supported, never forced. | calm, guiding |
| 4 | welcome-3.ogg | welcome.3 | When you're ready, we'll begin by orienting the keyboard. | gentle invitation |
| 5 | meet-keyboard-0.ogg | meet-keyboard.0 | Let's orient the keyboard first. | warm |
| 6 | meet-keyboard-1.ogg | meet-keyboard.1 | Lower notes live to your left, higher notes to your right. | clear, even |
| 7 | meet-keyboard-2.ogg | meet-keyboard.2 | Play any key, and listen to where its sound sits. | inviting (it's their turn) |
| 8 | meet-keyboard-correct.ogg | meet-keyboard.correct | Good. That is your first landmark: sound moves across the keyboard, low to high. | affirming, not gushing |
| 9 | low-high-0.ogg | low-high.0 | The keyboard is laid out by pitch. | warm |
| 10 | low-high-1.ogg | low-high.1 | Keys to the left sound lower; keys to the right sound higher. | clear, even |
| 11 | low-high-2.ogg | low-high.2 | Play a low note on the left — then a high note on the right. | inviting |
| 12 | low-high-correct.ogg | low-high.correct | Good — low on the left, high on the right. You're hearing the shape of the keyboard. | affirming |
| 13 | find-c-0.ogg | find-c.0 | Find a group of two black keys. | clear |
| 14 | find-c-1.ogg | find-c.1 | The white key just to their left is C. | warm, land on "C" |
| 15 | find-c-2.ogg | find-c.2 | Because the pattern repeats, C is everywhere. | reassuring |
| 16 | find-c-3.ogg | find-c.3 | Now you try — find a C. | inviting |
| 17 | find-c-correct.ogg | find-c.correct | Exactly — that's C, just left of the two black keys. | affirming |

## How it wires (no code change needed at record time)
- The Course already emits these IDs (`<step>.<beat>` and `<step>.correct`).
- `OPENING_VOICE_PACK` in foundations.js maps each ID → file above.
- `tutorAudio.say()/sayBeats()` resolves `voice/en-GB/<file>`; on any miss it falls
  back to browser TTS, and captions are always shown. No overlap with the keyboard
  demo (the existing teaching-rhythm gate handles that).
- Activate by setting `PREMIUM_VOICE_READY = true`.

## Notes for the next batch (after this pilot is approved)
- The dynamic greeting (name + time of day) stays caption/TTS — don't record a
  name into a fixed file. A name-agnostic `welcome-back` line can be added later.
- Next batch: `middle-c.*`, the Landmarks black-key lines, and reusable lines
  (try-again, lesson-complete) once the curriculum copy is frozen.
