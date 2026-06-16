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

  function place(name) {
    const m = /^([A-Ga-g])(##|bb|[#b]|x)?(-?\d+)$/.exec(String(name).trim());
    if (!m) throw new Error(`staffView: unparseable note "${name}"`);
    const letter = m[1].toUpperCase();
    const accidental = { '#': 1, '##': 2, x: 2, b: -1, bb: -2 }[m[2]] ?? 0;
    const octave = parseInt(m[3], 10);
    const diatonic = LETTER_INDEX[letter] + 7 * octave;
    const midi = toMidi(letter, accidental, octave);
    const staff = midi >= 60 ? 'treble' : 'bass';
    const topLine = staff === 'treble' ? TREBLE_TOP : BASS_TOP;
    return { staff, off: (topLine - diatonic) / 2, accidental, midi };
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
      s && s.querySelectorAll('.note, .ledger, .barline').forEach((n) => n.remove()));
  }

  /**
   * Render a sequence.
   *   opts.lower        second voice (same length) → grand-staff Both-Hands
   *   opts.fingers      fingering numbers under each primary note
   *   opts.lowerFingers fingering numbers under each lower note
   *   opts.scroll       lay notes on the fixed pixel grid for scrolling
   */
  function setSequence(names, opts = {}) {
    const { lower = null, fingers = null, lowerFingers = null, scroll = false, pan = false, beatsPerBar = 4 } = opts;
    scrolling = scroll;
    el.classList.toggle('notation--scroll', scroll);
    el.classList.toggle('notation--pan', pan && !scroll);
    if (scroll) ensureTracks();
    clearNotes();

    const n = names.length;
    // Layout x-position per note index:
    //   scroll → fixed grid inside the translatable track (animated playhead)
    //   pan    → fixed grid in a natively horizontally-scrollable container
    //            (full note size; the staff scrolls instead of shrinking)
    //   page   → spread across the width by percentage (short exercises)
    const xFor = scroll
      ? (i) => `calc(var(--col-w) * ${i})`
      : pan
        ? (i) => `calc(var(--gutter) + var(--col-w) * ${i})`
        : (i) => `${n <= 1 ? 50 : 22 + (68 * i) / (n - 1)}%`;
    if (pan && !scroll) {
      el.style.setProperty('--content-w', `calc(var(--gutter) + var(--col-w) * ${(n + 0.5).toFixed(2)})`);
    }

    model = names.map((name, i) => {
      const x = xFor(i);
      const p = place(name);
      const node = engrave(p, x, fingers ? fingers[i] : null);
      const entry = { name, midi: p.midi, off: p.off, staff: p.staff, el: node, lower: null };
      if (lower && lower[i] != null) {
        const lp = place(lower[i]);
        const lnode = engrave(lp, x, lowerFingers ? lowerFingers[i] : null);
        entry.lower = { name: lower[i], midi: lp.midi, off: lp.off, staff: lp.staff, el: lnode };
      }
      return entry;
    });

    drawBarlines(n, scroll, pan, beatsPerBar);
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
    const { fingers = null } = opts;
    scrolling = false;
    el.classList.remove('notation--scroll', 'notation--pan');
    clearNotes();

    const x = '50%';
    model = names.map((name, i) => {
      const p = place(name);
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
    if (p.accidental) {
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
  function drawBarlines(n, scroll, pan, beatsPerBar) {
    const tHost = scroll ? trebleTrack : treble;
    const bHost = scroll ? bassTrack : bass;
    const leftPct = (k) => (n <= 1 ? 50 : 22 + (68 * k) / (n - 1));
    const addBar = (x, cls) => {
      for (const host of [tHost, bHost]) {
        const bl = document.createElement('div');
        bl.className = cls;
        bl.style.left = x;
        host.appendChild(bl);
      }
    };
    // Interior barlines just before every downbeat (multiple of beatsPerBar).
    for (let i = beatsPerBar; i < n; i += beatsPerBar) {
      const x = scroll
        ? `calc(var(--col-w) * ${i} - var(--col-w) * 0.5)`
        : pan
          ? `calc(var(--gutter) + var(--col-w) * ${i} - var(--col-w) * 0.5)`
          : `${(leftPct(i - 1) + leftPct(i)) / 2}%`;
      addBar(x, 'barline');
    }
    // Final barline closing the last measure.
    if (n > 0 && !scroll) {
      const xEnd = pan
        ? `calc(var(--gutter) + var(--col-w) * ${n} - var(--col-w) * 0.5)`
        : `${Math.min(99, leftPct(n - 1) + 4)}%`;
      addBar(xEnd, 'barline barline--final');
    }
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
