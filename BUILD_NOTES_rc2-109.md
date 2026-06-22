# rc2-109 — build notes: staff visibility + autonomous timing

## Staff visibility (plan for Stage 2/3 cockpit)

When notation becomes central (Stage 2/3), the lesson cockpit should give the
staff priority. Target layout rules (to implement when reading steps are built):

- Staff is the visual hero: large, centred, generous vertical space; minimum
  staff height scales with viewport so it never collapses on tablet.
- One idea on the staff at a time — avoid crowding with many notes early.
- Text discipline: caption/explain sit **above or beside** the staff, never over
  it; Jack's caption strip must not overlap note-heads or ledger lines.
- Controls (Hear it / Repeat / Pause) dock to a row that does not encroach on the
  staff's bounding box.
- Keyboard stays usable at the bottom; staff and keyboard share vertical space
  with the staff getting the upper, central band.
- Reduced clutter: ledger lines and landmarks (Middle C, treble/bass anchors) use
  the same premium badge language now used in Foundation.

No staff-layout CSS is changed tonight (no live reading steps depend on it yet);
this is the agreed plan so Stage 2 is built into a cockpit that respects it.

## Autonomous playback timing (verified this build)

- The demo / Hear it / Hear it again path is the **pianoVoice** engine — a
  synchronous WebAudio voice with **no async sample loading**, so the first note
  starts immediately on tap (no dead-tap, no multi-second delay). This is the
  stabilised rc2-107 path, unchanged.
- Audio is unlocked on the first user gesture (Start / Continue / key / Hear it),
  so the context is already running by the time a demo plays.
- Because there is no load step on this path, a "Preparing sound…" cue is not
  needed for the demo today. If/when a sampled Course voice is introduced later,
  that path (and only that path) should show "Preparing sound…" while buffers
  load, with the pianoVoice remaining the instant fallback — never a silent tap.
