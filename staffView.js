// staffView.js
//
// Shared STANDARD Middle-C notation renderer (RC3+). Used by the sight-reading
// engine and the Scale Masterclass staff.
//
// Layout modes:
//   • PAGE (default): notes spread across the staff width by percentage.
//   • SCROLL: notes laid on a fixed pixel grid inside a translatable track, so
//     the engine can scroll the music right-to-left with the current note held
//     at a fixed "playhead". Used for the continuous practice loop.
//
// Features: per-note fingering (matches keyboard badges), a show/hide + timed
// fade for that fingering, an optional LOWER voice for a true grand staff
// (Both-Hands), per-VOICE highlighting (independent green per hand), and an
// assisted first-note letter anchor.

import { toMidi } from './notes.js';

const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const TREBLE_TOP = 38; // F5 — top line of treble
const BASS_TOP = 26;   // A3 — top line of bass

// Canonical engraved pitch for each key-signature accidental, per clef — the
// exact staff positions used in printed music (mirrors keySignaturePanel.js).
// Indexed in circle-of-fifths order, matching keySignature().letters.
const KEYSIG_PITCH = {
  sharp: {
    treble: { F: 'F5', C: 'C5', G: 'G5', D: 'D5', A: 'A4', E: 'E5', B: 'B4' },
    bass:   { F: 'F3', C: 'C3', G: 'G3', D: 'D3', A: 'A2', E: 'E3', B: 'B2' },
  },
  flat: {
    treble: { B: 'B4', E: 'E5', A: 'A4', D: 'D5', G: 'G4', C: 'C5', F: 'F4' },
    bass:   { B: 'B2', E: 'E3', A: 'A2', D: 'D3', G: 'G2', C: 'C3', F: 'F3' },
  },
};
// Default header geometry, in --staff-space units (see notation.css). When a key
// signature is shown, the time-sig, start-barline, gutter and playhead all shift
// right by the signature's width so the conventional order clef → key sig →
// time sig → notes is preserved and scroll alignment (gutter↔playhead gap) holds.
const HDR = { timeSig: 4.6, startBar: 6.3, gutter: 7.6, playhead: 10 };
const KS_START = 3.4;   // first accidental sits just right of the clef
const KS_STEP = 0.78;   // horizontal gap between successive accidentals

export function createStaffView({ compact = false } = {}) {
  const el = document.createElement('div');
  el.className = `notation${compact ? ' notation--compact' : ''}`;
  el.innerHTML = `
    <div class="grand-staff">
      <div class="grand-staff__brace"></div>
      <div class="grand-staff__spine"></div>
      <div class="staff staff--treble"><span class="clef clef--treble">&#x1D11E;</span><span class="time-sig"><span>4</span><span>4</span></span><span class="staff__startbar"></span></div>
      <div class="staff staff--bass"><span class="clef clef--bass">&#x1D122;</span><span class="time-sig"><span>4</span><span>4</span></span><span class="staff__startbar"></span></div>
    </div>`;

  const treble = el.querySelector('.staff--treble');
  const bass = el.querySelector('.staff--bass');
  drawStaffLines(treble);
  drawStaffLines(bass);

  // Scroll tracks (created lazily) + a playhead marker.
  let trebleTrack = null, bassTrack = null, scrolling = false;

  let model = [];

  function place(name, forceClef = null) {
    const m = /^([A-Ga-g])(##|bb|[#b]|x)?(-?\d+)$/.exec(String(name).trim());
    if (!m) throw new Error(`staffView: unparseable note "${name}"`);
    const letter = m[1].toUpperCase();
    const accidental = { '#': 1, '##': 2, x: 2, b: -1, bb: -2 }[m[2]] ?? 0;
    const octave = parseInt(m[3], 10);
    const diatonic = LETTER_INDEX[letter] + 7 * octave;
    const midi = toMidi(letter, accidental, octave);
    // Default placement is by pitch (midi ≥ 60 → treble). A forced clef (opt-in,
    // used only by single-hand chord lessons) keeps EVERY note on the chosen
    // staff, so e.g. a left-hand chord stays on the bass clef with ledger lines
    // instead of splitting across both staves.
    const staff = forceClef || (midi >= 60 ? 'treble' : 'bass');
    const topLine = staff === 'treble' ? TREBLE_TOP : BASS_TOP;
    return { staff, off: (topLine - diatonic) / 2, accidental, midi, letter };
  }

  function ledgerOffsets(off) {
    const out = []; const EPS = 1e-9;
    if (off >= 5 - EPS) for (let k = 5; k <= Math.floor(off + EPS); k++) out.push(k);
    if (off <= -1 + EPS) for (let k = -1; k >= Math.ceil(off - EPS); k--) out.push(k);
    return out;
  }

  function ensureTracks() {
    if (trebleTrack) return;
    const mk = (staffEl) => {
      // The scroll-area starts AFTER the clef + time signature so scrolled-past
      // notes are clipped there and never overlap the fixed emblems.
      const area = document.createElement('div'); area.className = 'staff__scrollarea';
      const track = document.createElement('div'); track.className = 'staff__track';
      area.appendChild(track);
      staffEl.appendChild(area);
      const ph = document.createElement('div'); ph.className = 'staff__playhead'; staffEl.appendChild(ph);
      return track;
    };
    trebleTrack = mk(treble);
    bassTrack = mk(bass);
  }

  function containerFor(staffName) {
    if (scrolling) return staffName === 'treble' ? trebleTrack : bassTrack;
    return staffName === 'treble' ? treble : bass;
  }

  function clearNotes() {
    [treble, bass, trebleTrack, bassTrack].forEach((s) =>
      s && s.querySelectorAll('.note, .ledger, .barline, .rest, .staff__keysig').forEach((n) => n.remove()));
  }

  // ---- Key signature (opt-in; Scales only) ---------------------------------
  // True when a notehead accidental is already implied by the key signature, so
  // its glyph should be suppressed (e.g. every F#/C#/… in B major). Out-of-key
  // accidentals (different sign, or a letter not in the signature) still draw.
  function suppressedByKeySig(p, keySig) {
    if (!keySig) return false;
    const sign = keySig.kind === 'flat' ? -1 : keySig.kind === 'sharp' ? 1 : 0;
    return sign !== 0 && p.accidental === sign && keySig.letters.includes(p.letter);
  }

  // Draw the sharps/flats after each clef in canonical engraved positions.
  // Glyphs go on the FIXED staff (not the scroll track) so they stay put while
  // the music scrolls. Returns the signature width in --staff-space units.
  function drawKeySignature(sig) {
    const glyph = sig.kind === 'flat' ? '\u266D' : '\u266F';
    for (const clef of ['treble', 'bass']) {
      const host = clef === 'treble' ? treble : bass;
      sig.letters.forEach((letter, i) => {
        const pitch = KEYSIG_PITCH[sig.kind]?.[clef]?.[letter];
        if (!pitch) return;
        const p = place(pitch, clef);
        const acc = document.createElement('span');
        acc.className = 'staff__keysig';
        acc.textContent = glyph;
        acc.style.cssText =
          `position:absolute;z-index:3;pointer-events:none;line-height:1;` +
          `color:var(--ink);font-size:calc(var(--staff-space) * 2.6);` +
          `left:calc(var(--staff-space) * ${(KS_START + i * KS_STEP).toFixed(3)});` +
          `top:calc(var(--staff-space) * ${p.off.toFixed(3)});transform:translateY(-50%);`;
        host.appendChild(acc);
      });
    }
    return sig.letters.length * KS_STEP + 0.6; // accidental run + trailing gap
  }

  // Restore the default header geometry (used every render before optionally
  // re-applying a shift; a no-op for SR/Chord, which never shift it).
  function resetHeaderShift() {
    el.style.removeProperty('--gutter');
    el.style.removeProperty('--playhead');
    for (const s of [treble, bass]) {
      const t = s.querySelector('.time-sig'); if (t) t.style.left = '';
      const b = s.querySelector('.staff__startbar'); if (b) b.style.left = '';
    }
  }

  // Shift the time-sig, start-barline, gutter and playhead right by `w` spaces so
  // the key signature has room and clef → key sig → time sig → notes is in order.
  // Gutter and playhead move together, preserving the scroll alignment gap.
  function applyHeaderShift(w) {
    const sp = (v) => `calc(var(--staff-space) * ${(v).toFixed(3)})`;
    el.style.setProperty('--gutter', sp(HDR.gutter + w));
    el.style.setProperty('--playhead', sp(HDR.playhead + w));
    for (const s of [treble, bass]) {
      const t = s.querySelector('.time-sig'); if (t) t.style.left = sp(HDR.timeSig + w);
      const b = s.querySelector('.staff__startbar'); if (b) b.style.left = sp(HDR.startBar + w);
    }
  }

  /**
   * Render a sequence.
   *   opts.lower        second voice (same length) → grand-staff Both-Hands
   *   opts.fingers      fingering numbers under each primary note
   *   opts.lowerFingers fingering numbers under each lower note
   *   opts.scroll       lay notes on the fixed pixel grid for scrolling
   */
  function setSequence(names, opts = {}) {
    const { lower = null, fingers = null, lowerFingers = null, scroll = false, pan = false, beatsPerBar = 4, showRests = false, keySignature = null, forceVoiceClefs = false } = opts;
    scrolling = scroll;
    el.classList.toggle('notation--scroll', scroll);
    el.classList.toggle('notation--pan', pan && !scroll);
    if (scroll) ensureTracks();
    clearNotes();

    // Conventional key signature — OPT-IN (default null → identical behaviour for
    // Sight-Reading and Chord, which never pass it). When supplied, draw the
    // sharps/flats after each clef and shift the header (time-sig, start-barline,
    // gutter, playhead) right by the signature width so the order is clef → key
    // sig → time sig → notes; in-key notehead accidentals are then suppressed.
    resetHeaderShift();
    const keySig = (keySignature && keySignature.kind && keySignature.kind !== 'none'
      && Array.isArray(keySignature.letters) && keySignature.letters.length) ? keySignature : null;
    if (keySig) applyHeaderShift(drawKeySignature(keySig));

    const n = names.length;
    // Visual rests are PAGE-mode only and OPT-IN. When on, notes sit on a whole-bar
    // beat grid (rounded up to full bars) and the trailing empty beats of the final
    // bar are padded with crotchet rests. This is DISPLAY ONLY — `model` still holds
    // notes only, so the cursor, matching, scoring and review are unaffected.
    const restPad = showRests && !scroll && !pan && n > 0;
    const slots = restPad ? Math.max(1, Math.ceil(n / beatsPerBar) * beatsPerBar) : n;
    const pageDen = Math.max(1, slots - 1);
    // Layout x-position per note index:
    //   scroll → fixed grid inside the translatable track (animated playhead)
    //   pan    → fixed grid in a natively horizontally-scrollable container
    //   page   → spread across the width by percentage (short exercises)
    const xFor = scroll
      ? (i) => `calc(var(--col-w) * ${i})`
      : pan
        ? (i) => `calc(var(--gutter) + var(--col-w) * ${i})`
        : (i) => `${slots <= 1 ? 50 : 22 + (68 * i) / pageDen}%`;
    if (pan && !scroll) {
      el.style.setProperty('--content-w', `calc(var(--gutter) + var(--col-w) * ${(n + 0.5).toFixed(2)})`);
    }

    // When forceVoiceClefs is set (Scales Both-Hands), keep the RH (primary)
    // voice on the treble staff and the LH (lower) voice on the bass staff —
    // conventional grand-staff layout — instead of letting pitch alone decide
    // (which would strand a low RH note like B3 on the bass clef). Default off,
    // so pitch-based placement is unchanged for single-hand, SR, and Chord.
    const primaryClef = forceVoiceClefs ? 'treble' : null;
    const lowerClef = forceVoiceClefs ? 'bass' : null;
    model = names.map((name, i) => {
      const x = xFor(i);
      const p = place(name, primaryClef);
      const node = engrave(p, x, fingers ? fingers[i] : null, { keySig });
      const entry = { name, midi: p.midi, off: p.off, staff: p.staff, el: node, lower: null };
      if (lower && lower[i] != null) {
        const lp = place(lower[i], lowerClef);
        const lnode = engrave(lp, x, lowerFingers ? lowerFingers[i] : null, { keySig });
        entry.lower = { name: lower[i], midi: lp.midi, off: lp.off, staff: lp.staff, el: lnode };
      }
      return entry;
    });

    // Pad the final incomplete bar with crotchet rests (notation only; not in model).
    if (restPad && slots > n) {
      const restStaff = model.length ? model[model.length - 1].staff : 'treble';
      for (let k = n; k < slots; k++) engraveRest(xFor(k), restStaff);
    }

    drawBarlines(n, scroll, pan, beatsPerBar, slots);
    if (scroll) scrollToIndex(0, false);

    // ---- Dynamic vertical bounds (no fixed rendering boundary) ----
    // Measure how far the music extends above the treble top line and below the
    // bass bottom line, then reserve SYMMETRIC padding (keeps the staff centred)
    // sized to the larger extreme + a 40px safe margin above the top ledger.
    let topLift = 0, botDrop = 0;
    for (const m of model) {
      for (const v of [m, m.lower]) {
        if (!v) continue;
        if (v.staff === 'treble') topLift = Math.max(topLift, -v.off);  // negative off = above
        else botDrop = Math.max(botDrop, v.off - 4);                    // off>4 = below bass
      }
    }
    const topSpaces = (Math.max(0, topLift) + 1).toFixed(2);  // +1 ≈ note-head radius
    const botSpaces = (Math.max(0, botDrop) + 1).toFixed(2);
    el.style.setProperty('--pad',
      `max(calc(var(--staff-space) * ${topSpaces} + 40px), ` +
      `calc(var(--staff-space) * ${botSpaces} + 16px), ` +
      `calc(var(--staff-space) * 2.5))`);

    return model;
  }

  /**
   * Render a single BLOCK CHORD: all notes stacked at one centred column,
   * stemless for a clean shape. `names` low→high. opts.fingers gives a light
   * per-note recommended anchor (null entries draw nothing). Additive sibling of
   * setSequence — used by the Chord Masterclass; Scales/Sight-Reading never call it.
   */
  function setChord(names, opts = {}) {
    const { fingers = null, clef = 'grand' } = opts;
    scrolling = false;
    el.classList.remove('notation--scroll', 'notation--pan');
    // Opt-in single-clef display for hand-specific chord lessons. Default 'grand'
    // leaves the two-staff layout exactly as before (Scales/Sight-Reading never
    // pass `clef`, so they are unaffected).
    const forceClef = clef === 'treble' ? 'treble' : clef === 'bass' ? 'bass' : null;
    el.classList.toggle('notation--treble-only', clef === 'treble');
    el.classList.toggle('notation--bass-only', clef === 'bass');
    clearNotes();

    const x = '50%';
    model = names.map((name, i) => {
      const p = place(name, forceClef);
      const node = engrave(p, x, fingers ? fingers[i] : null, { stem: false });
      return { name, midi: p.midi, off: p.off, staff: p.staff, el: node, lower: null };
    });

    // Symmetric vertical padding so high/low chords stay centred (mirrors setSequence).
    let topLift = 0, botDrop = 0;
    for (const m of model) {
      if (m.staff === 'treble') topLift = Math.max(topLift, -m.off);
      else botDrop = Math.max(botDrop, m.off - 4);
    }
    const topSpaces = (Math.max(0, topLift) + 1).toFixed(2);
    const botSpaces = (Math.max(0, botDrop) + 1).toFixed(2);
    el.style.setProperty('--pad',
      `max(calc(var(--staff-space) * ${topSpaces} + 40px), ` +
      `calc(var(--staff-space) * ${botSpaces} + 16px), ` +
      `calc(var(--staff-space) * 2.5))`);

    return model;
  }

  function engrave(p, xCss, finger, opts = {}) {
    const host = containerFor(p.staff);
    for (const k of ledgerOffsets(p.off)) {
      const led = document.createElement('div');
      led.className = 'ledger';
      led.style.left = `calc(${xCss} - var(--note-head) * 0.4)`;
      led.style.top = `calc(var(--staff-space) * ${k} - var(--staff-line) / 2)`;
      host.appendChild(led);
    }
    const note = document.createElement('div');
    note.className = `note ${p.off < 2 ? 'note--stem-down' : ''}`.trim();
    note.style.left = xCss;
    note.style.top = `calc(var(--staff-space) * ${p.off} - var(--note-head) / 2)`;
    if (p.accidental && !suppressedByKeySig(p, opts.keySig)) {
      const a = document.createElement('span');
      a.className = 'note__accidental';
      a.textContent = p.accidental > 0 ? '\u266F' : '\u266D';
      note.appendChild(a);
    }
    const head = document.createElement('div'); head.className = 'note__head'; note.appendChild(head);
    if (opts.stem !== false) {
      const stem = document.createElement('div'); stem.className = 'note__stem'; note.appendChild(stem);
    }
    if (finger != null) {
      const f = document.createElement('span');
      f.className = 'note__finger';
      f.textContent = String(finger);
      note.appendChild(f);
    }
    host.appendChild(note);
    return note;
  }

  /* ---- highlighting (per column or per voice) ---- */

  const STATES = ['is-current', 'is-correct', 'is-missed', 'is-next'];
  function voiceEl(i, which) {
    const m = model[i]; if (!m) return null;
    return which === 'lower' ? (m.lower && m.lower.el) : m.el;
  }
  function mark(i, state) {
    const m = model[i]; if (!m) return;
    m.el.classList.add(`is-${state}`);
    if (m.lower) m.lower.el.classList.add(`is-${state}`);
  }
  function markVoice(i, which, state) {
    const node = voiceEl(i, which);
    if (node) node.classList.add(`is-${state}`);
  }
  function unmarkVoice(i, which, state) {
    const node = voiceEl(i, which);
    if (node) node.classList.remove(`is-${state}`);
  }
  // DEV verification: does the notehead for (i, voice) currently carry is-<state>?
  // Returns null when the node can't be found (target missing), else a boolean.
  function voiceHasState(i, which, state) {
    const node = voiceEl(i, which);
    if (!node) return null;
    return node.classList.contains(`is-${state}`);
  }
  function unmark(i, state) {
    const m = model[i]; if (!m) return;
    [m.el, m.lower && m.lower.el].forEach((node) => {
      if (!node) return;
      if (state) node.classList.remove(`is-${state}`);
      else STATES.forEach((c) => node.classList.remove(c));
    });
  }
  function clearMarks() { model.forEach((_, i) => unmark(i)); }
  // Clear ONLY the module-owned cursor states (is-current / is-next). The
  // correctness states (is-correct / is-missed) belong to the MIDI Evaluation
  // Controller and must NOT be wiped by a cursor re-target, or the green/red
  // feedback would vanish on the same tick it was painted.
  function clearCursor() {
    model.forEach((_, i) => { unmark(i, 'current'); unmark(i, 'next'); });
  }

  function setAnchor(letter) {
    el.querySelectorAll('.note__anchor').forEach((n) => n.remove());
    if (letter == null || !model[0]) return;
    const tag = document.createElement('span');
    tag.className = 'note__anchor';
    tag.textContent = letter;
    model[0].el.appendChild(tag);
  }

  function setFingersVisible(on) { el.classList.toggle('is-fingers-hidden', !on); }
  function setFingersFaded(on) { el.classList.toggle('is-fingers-faded', !!on); }

  /* ---- scrolling ---- */

  // Vertical bar lines dividing the stream into 4-beat measures. A line is drawn
  // just before every note whose index is a multiple of beatsPerBar.
  function drawBarlines(n, scroll, pan, beatsPerBar, slots = n) {
    const tHost = scroll ? trebleTrack : treble;
    const bHost = scroll ? bassTrack : bass;
    const span = Math.max(1, slots - 1);
    const leftPct = (k) => (slots <= 1 ? 50 : 22 + (68 * k) / span);
    const addBar = (x, cls) => {
      for (const host of [tHost, bHost]) {
        const bl = document.createElement('div');
        bl.className = cls;
        bl.style.left = x;
        host.appendChild(bl);
      }
    };
    // Interior barlines just before every downbeat (multiple of beatsPerBar).
    for (let i = beatsPerBar; i < slots; i += beatsPerBar) {
      const x = scroll
        ? `calc(var(--col-w) * ${i} - var(--col-w) * 0.5)`
        : pan
          ? `calc(var(--gutter) + var(--col-w) * ${i} - var(--col-w) * 0.5)`
          : `${(leftPct(i - 1) + leftPct(i)) / 2}%`;
      addBar(x, 'barline');
    }
    // Final barline closing the last measure.
    if (slots > 0 && !scroll) {
      const xEnd = pan
        ? `calc(var(--gutter) + var(--col-w) * ${n} - var(--col-w) * 0.5)`
        : `${Math.min(99, leftPct(slots - 1) + 4)}%`;
      addBar(xEnd, 'barline barline--final');
    }
  }

  // A display-only crotchet rest at a beat slot (never enters `model`).
  function engraveRest(xCss, staffName) {
    const host = containerFor(staffName);
    const r = document.createElement('div');
    r.className = 'rest rest--quarter';
    r.style.left = xCss;
    r.setAttribute('aria-hidden', 'true');
    r.textContent = '\uD834\uDD3D';   // U+1D13D MUSICAL SYMBOL QUARTER REST
    host.appendChild(r);
    return r;
  }

  function scrollToIndex(i, animate = true) {
    if (!scrolling) return;
    // Subtract the gutter so the current note lands exactly on the playhead even
    // though the track sits inside the (gutter-offset) scroll-area.
    const transform = `translateX(calc(var(--playhead) - var(--gutter, 0px) - var(--col-w) * ${i}))`;
    for (const t of [trebleTrack, bassTrack]) {
      if (!t) continue;
      t.classList.toggle('is-animating', !!animate);
      t.style.transform = transform;
    }
  }

  function clear() { clearNotes(); model = []; }

  return {
    el, treble, bass,
    setSequence, setChord, mark, markVoice, unmark, unmarkVoice, voiceHasState, clearMarks, clearCursor, setAnchor,
    setFingersVisible, setFingersFaded, scrollToIndex, clear,
    get model() { return model; },
    get scrolling() { return scrolling; },
  };
}

function drawStaffLines(staffEl) {
  for (let k = 0; k <= 4; k++) {
    const line = document.createElement('div');
    line.className = 'staff__line';
    line.style.top = `calc(var(--staff-space) * ${k} - var(--staff-line) / 2)`;
    staffEl.appendChild(line);
  }
}
