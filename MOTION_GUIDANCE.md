# KeyMaster PRO — Premium Motion-Guidance System (rc2-114)

Teaching-led, not decorative: Jack guides, the visuals point, the learner's eye
knows where to go. A small, reusable vocabulary of calm cues built on the
existing highlight API and overlay classes. Vanilla CSS/DOM only; GPU-friendly
(opacity / box-shadow / filter); every motion has a `prefers-reduced-motion`
off-switch; tablet-light (cues are few, short, never heavy continuous shadows on
many nodes).

## Reusable components (the visual language)

| Name              | Wired to                  | Effect                                            |
|-------------------|---------------------------|---------------------------------------------------|
| kmFocusHalo       | `.key.hl-target`          | soft breathing emerald ring on the active target  |
| kmPulseHighlight  | `.key.hl-demo`            | soft glow as the tutor plays each key (demo-sync)  |
| kmChordGlow       | `.key.hl-demo` (chord)    | chord notes lit together read as one shape        |
| kmSuccessGlow     | `.key.hl-success`         | brief warm confirmation on the keys played right  |
| kmRangeSweep      | `.mf-ovl__range`          | low→high line eases in, then breathes             |
| kmDirectionArrow  | `.mf-ovl__arrow`          | emerald pointer + calm pulse                      |
| kmBracket         | `.mf-ovl__stroke`         | black-key group bracket glows in                  |
| kmLandmarkBadge   | `.mf-ovl__label--badge`   | Middle C badge scales/fades in, soft gold pulse   |
| kmBeatPulse       | `.mf__beat.is-on` (live) / `.km-beat-dot` (reusable) | calm beat glow on the count |
| kmSoftDim         | `.km-soft-dim`            | optional de-emphasis of non-relevant area         |

## Jack / demo synchronisation (no audio-path change)

True word-level timing would require touching the protected audio path, so sync
is anchored to the **demo playback**, which the Course controls:
- Jack plays the low note → the low key glows (hl-demo). Plays the high note →
  the high key glows. Plays a chord → the chord keys glow together.
- The cue overlay (range sweep / Middle C badge / group bracket / arrow) animates
  IN during the teaching phase of the matching step — so when the Middle C step
  is being taught, the C badge appears and pulses; on low/high, the sweep draws in.
- The beat dots pulse on the count-in.
- On a correct answer, the played keys give a soft success glow.
- In "Bring it back", the 2nd-miss support reveal reuses these same cues.

## Reduced motion & performance

All animations are disabled under `@media (prefers-reduced-motion: reduce)`,
leaving the cues static and fully legible. Animations use only opacity/box-shadow/
filter/transform (compositor-friendly), are short, and are never applied to large
numbers of nodes simultaneously — suitable for tablet.

## Applied first (safe areas)

low/high (range sweep), black-key groups (brackets), Middle C (badge), stepwise &
phrase steps (arrows), echo / call-and-response, first chord (chord glow via demo),
pulse/rhythm (beat pulse), and the "Bring it back" recall support reveal.

No animated hand/finger system yet — the pointer/halo/arrow/sweep/glow language is
the safer, more professional first step.
