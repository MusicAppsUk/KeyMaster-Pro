// chordMasterclass.js
//
// Chord Masterclass — INTERACTIVE TRAINING (Phase 1).
//
// Phase 1 turns the chord view from passive display into the first working
// chord-learning loop, additively and non-breakingly. It reuses the existing,
// stable infrastructure unchanged:
//   • chordEngine.buildChord   — the MIDI set per inversion/hand (B major etc.)
//   • chordEvaluator           — set-membership checker wired to the shared
//                                NoteInput hub (MIDI *and* on-screen keyboard),
//                                green/red paint, progress/wrong/complete events.
//   • staffView.setChord       — stemless block-chord notation
//   • keyboard.highlight        — target + root decoration
// The single-note midiEvaluator used by Scales / Sight-Reading is NOT touched,
// and the Event Bridge is NOT involved (chords are a set decision, not a cursor).
//
// Phase 1 scope: MAJOR TRIADS, B major as the canonical first chord, root / 1st /
// 2nd inversion, Right or Left hand (Both hands = later), three modes —
//   Learn            : understand the chord (the prior display behaviour).
//   Guided Practice  : "Play <chord>" → green/red → calm success.
//   Inversion Trainer: root → first → second, "Same chord — new shape."
// Recognition Mode (show-and-identify) is documented/reserved for a later phase.
//
// Fingering is "Recommended" (never "Correct"): a reliable, low-movement triad
// shape — RH 1·3·5, LH 5·3·1 (low→high).
//
// Loaded lazily by app.js: import('./chordMasterclass.js'). Default-exports a
// factory createView(ctx) -> { enter, exit, destroy }.

import { createStaffView } from './staffView.js';
import { noteName, SHARP_NAMES, FLAT_NAMES } from './notes.js';
import { buildChord, chordSymbol, INVERSIONS } from './chordEngine.js';
import { createChordEvaluator } from './chordEvaluator.js';

const QUALITY_OPTIONS = [['major', 'Major']];          // Phase 1: major triads only
const HAND_OPTIONS = [['RH', 'Right hand'], ['LH', 'Left hand'], ['BOTH', 'Both hands - later', true]];
const MODES = [['learn', 'Learn'], ['practise', 'Guided Practice'], ['inversions', 'Inversion Trainer']];
const INV_SEQ = ['root', 'first', 'second'];
const PRAISE = ['Correct chord - nicely shaped.', 'Excellent recognition.', 'Good hand shape.', 'Same chord, confidently played.'];

// Recommended (NOT "correct") triad fingering — a reliable, low-movement shape.
function triadFingering(hand) { return hand === 'LH' ? [5, 3, 1] : [1, 3, 5]; }   // low -> high
function fingeringText(hand) {
  return hand === 'LH'
    ? 'Recommended fingering - LH: 5 \u00b7 3 \u00b7 1 (little finger on the low note)'
    : 'Recommended fingering - RH: 1 \u00b7 3 \u00b7 5 (thumb on the low note)';
}

export default function createView(ctx) {
  const { mount, keyboard, viewport, input, evaluator: globalEvaluator } = ctx;
  const pref = keyboard && keyboard.accidental === 'flat' ? 'flat' : 'sharp';
  const ROOT_NAMES = pref === 'flat' ? FLAT_NAMES : SHARP_NAMES;
  const ROOT_OPTIONS = ROOT_NAMES.map((n, pc) => [String(pc), n]);

  // B major is the canonical first chord (B - D# - F#).
  const sel = { rootPc: 11, quality: 'major', inversion: 'root', hand: 'RH' };
  let mode = 'learn';
  let expectedSet = new Set();
  let praiseIx = 0;
  let advanceTimer = null;

  const staff = createStaffView({ compact: false });
  const evaluator = createChordEvaluator({ input, keyboard });
  const ui = {};
  let built = false;
  const offs = [];

  /* ---- build (once) -------------------------------------------------- */
  function build() {
    injectStyles();
    const root = el('div', { class: 'cmx' });

    const modeBar = el('div', { class: 'cmx__modes' });
    ui.modeBtns = {};
    for (const [val, label] of MODES) {
      const b = el('button', { class: 'cmx__mode', type: 'button' });
      b.textContent = label;
      b.addEventListener('click', () => setMode(val));
      ui.modeBtns[val] = b;
      modeBar.appendChild(b);
    }

    const controls = el('div', { class: 'cmx__controls' });
    ui.root_ = select(ROOT_OPTIONS, String(sel.rootPc), (v) => { sel.rootPc = Number(v); restart(); });
    ui.qual = select(QUALITY_OPTIONS, sel.quality, (v) => { sel.quality = v; restart(); });
    ui.inv = select(INVERSIONS, sel.inversion, (v) => { sel.inversion = v; restart(); });
    ui.hand = select(HAND_OPTIONS, sel.hand, (v) => {
      if (v === 'BOTH') { ui.hand.value = sel.hand; return; }   // reserved for a later phase
      sel.hand = v; restart();
    });
    controls.append(
      labeled('Root', ui.root_),
      labeled('Quality', ui.qual),
      labeled('Inversion', ui.inv),
      labeled('Hand', ui.hand),
    );

    const band = el('div', { class: 'cmx__band' });
    ui.symbol = el('span', { class: 'cmx__symbol' });
    ui.invlabel = el('span', { class: 'cmx__invlabel' });
    ui.finger = el('span', { class: 'cmx__finger' });
    band.append(ui.symbol, ui.invlabel, ui.finger);

    ui.prompt = el('p', { class: 'cmx__prompt' });

    const panel = el('div', { class: 'cmx__panel' });
    panel.appendChild(staff.el);

    ui.status = el('p', { class: 'cmx__status' });

    ui.next = el('button', { class: 'cmx__next', type: 'button' });
    ui.next.textContent = 'Next \u203a';
    ui.next.addEventListener('click', manualNext);

    root.append(modeBar, controls, band, ui.prompt, panel, ui.status, ui.next);
    mount.replaceChildren(root);
    built = true;

    offs.push(evaluator.on('complete', onComplete));
    offs.push(evaluator.on('progress', onProgress));
    // 'wrong' paint is owned by the evaluator; the status line is driven by
    // onProgress (which sees the full held set), so no separate handler needed.
  }

  /* ---- mode + lifecycle helpers -------------------------------------- */
  function setMode(m) {
    mode = m;
    for (const [val] of MODES) ui.modeBtns[val].classList.toggle('is-on', val === m);
    ui.inv.disabled = (m === 'inversions');          // the trainer drives the inversion
    ui.next.hidden = (m === 'learn');
    if (m === 'inversions') sel.inversion = 'root';
    restart();
  }

  function clearAdvance() { if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; } }

  function restart() {
    clearAdvance();
    if (ui.inv) ui.inv.value = sel.inversion;
    showChord();
  }

  /* ---- render + arm the current chord -------------------------------- */
  function showChord() {
    const chord = buildChord(sel);
    expectedSet = new Set(chord.midis);
    const names = chord.midis.map((m) => noteName(m, { accidental: pref }));
    // Staff shows only the thumb anchor to keep stacked triads uncluttered; the
    // full recommended fingering is given in words in the band + below.
    const staffFingers = triadFingering(sel.hand).map((f) => (f === 1 ? 1 : null));

    staff.setChord(names, { fingers: staffFingers });
    const map = new Map();
    chord.midis.forEach((m, i) => map.set(m, i));
    evaluator.attachStaff(staff, map);
    evaluator.setExpected(chord.midis);

    for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    viewport.frame(chord.midis);
    keyboard.highlight(chord.midis, 'target');
    keyboard.highlight([chord.rootMidi], 'root');

    const sym = chordSymbol(ROOT_NAMES[chord.rootPc], sel.quality);
    ui.symbol.textContent = sym;
    ui.invlabel.textContent = invLabel(sel.inversion);
    ui.finger.textContent = fingeringText(sel.hand);

    const handWord = sel.hand === 'LH' ? 'left hand' : 'right hand';
    const invWord = invLabel(sel.inversion).toLowerCase();
    ui.prompt.textContent = mode === 'learn'
      ? `Learn ${sym} - ${invWord}. See the shape, the notes and the keys, then try playing it.`
      : `Play ${sym} - ${invWord} - ${handWord}.`;
    ui.status.textContent = `Press the ${chord.midis.length} notes together.`;
    ui.status.classList.remove('is-good');
  }

  /* ---- live feedback (calm, teacher-style) --------------------------- */
  function onProgress() {
    if (evaluator.isComplete) return;                 // success handled by onComplete
    let correct = 0, wrong = 0;
    for (const m of evaluator.held) (expectedSet.has(m) ? correct++ : wrong++);
    const missing = expectedSet.size - correct;
    ui.status.classList.remove('is-good');
    if (wrong > 0) { ui.status.textContent = 'One of those notes isn\u2019t in the chord - lift it and reshape.'; return; }
    if (missing <= 0) return;
    ui.status.textContent = missing === 1
      ? 'One note missing - almost there.'
      : `${missing} notes to go - sound them together.`;
  }

  function onComplete() {
    ui.status.textContent = PRAISE[praiseIx % PRAISE.length]; praiseIx++;
    ui.status.classList.add('is-good');
    if (mode === 'inversions') {
      clearAdvance();
      advanceTimer = setTimeout(advanceInversion, evaluator.FLASH_MS + 250);
    }
  }

  function advanceInversion() {
    const i = INV_SEQ.indexOf(sel.inversion);
    const last = i === INV_SEQ.length - 1;
    sel.inversion = INV_SEQ[(i + 1) % INV_SEQ.length];
    showChord();
    ui.status.textContent = last
      ? 'Same chord, three shapes - you\u2019ve been all the way round. Back to root position.'
      : 'Same chord - new shape.';
  }

  function manualNext() {
    clearAdvance();
    if (mode === 'inversions') advanceInversion();
    else showChord();                                 // fresh attempt / re-arm
  }

  /* ---- view lifecycle ------------------------------------------------ */
  return {
    enter() {
      if (!built) build();
      globalEvaluator?.clearExpected?.();             // keep Scales/SR evaluator disarmed here
      setMode(mode);                                  // applies mode + shows the chord
    },
    exit() {
      clearAdvance();
      evaluator.clear();
      staff.clearMarks();
      for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    },
    destroy() {
      clearAdvance();
      for (const off of offs) off?.();
      evaluator.destroy();
    },
  };
}

/* ===========================================================================
 * FUTURE — Chord Masterclass Practice Review (reserved, educational only).
 * Not rendered in Phase 1. Calm, teacher-style dimensions (never game stats):
 *   Chord Recognition · Chord Spelling · Inversion Awareness · Hand Shape ·
 *   Fingering Confidence · Left-Hand Fluency · Right-Hand Fluency ·
 *   Harmonic Understanding.
 * Recognition Mode (show-and-identify) is also reserved for a later phase.
 * ========================================================================= */

/* ===========================================================================
 * Small DOM helpers (local — mirrors the other controllers' style)
 * ========================================================================= */
function el(tag, props = {}) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k === 'class' ? (n.className = v) : n.setAttribute(k, v);
  return n;
}
function select(options, value, onChange) {
  const s = el('select', { class: 'cmx__select' });
  for (const opt of options) {
    const [val, label, disabled] = opt;
    const o = el('option'); o.value = val; o.textContent = label;
    if (disabled) o.disabled = true;
    if (val === value) o.selected = true;
    s.appendChild(o);
  }
  s.addEventListener('change', (e) => onChange(e.target.value));
  return s;
}
function labeled(label, control) {
  const wrap = el('label', { class: 'cmx__field' });
  const span = el('span', { class: 'cmx__fieldlabel' }); span.textContent = label;
  wrap.append(span, control);
  return wrap;
}
function invLabel(inv) {
  const found = INVERSIONS.find(([v]) => v === inv);
  return found ? found[1] : 'Root position';
}

function injectStyles() {
  if (document.getElementById('cmx-styles')) return;
  const s = document.createElement('style');
  s.id = 'cmx-styles';
  s.textContent = `
    .cmx{display:flex;flex-direction:column;gap:.55rem}
    .cmx__modes{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.1rem}
    .cmx__mode{background:#24222D;color:var(--ivory-dim);border:1px solid var(--ebony-edge);
      border-radius:999px;padding:7px 14px;font-size:var(--step-sm);cursor:pointer;
      font-family:var(--font-sans)}
    .cmx__mode.is-on{background:color-mix(in srgb,var(--brass) 22%,#24222D);
      color:var(--ivory);border-color:var(--brass)}
    .cmx__controls{display:flex;flex-wrap:wrap;gap:.6rem}
    .cmx__field{display:flex;flex-direction:column;gap:.25rem}
    .cmx__fieldlabel{font-family:var(--font-mono);font-size:var(--step-xs);
      letter-spacing:.08em;text-transform:uppercase;color:var(--ivory-faint)}
    .cmx__select{background:#24222D;color:var(--ivory);border:1px solid var(--ebony-edge);
      border-radius:var(--radius-md,8px);padding:8px 10px;font-size:var(--step-sm);min-width:8.5rem}
    .cmx__select:disabled{opacity:.5}
    .cmx__band{display:flex;flex-wrap:wrap;align-items:baseline;gap:.4rem .9rem}
    .cmx__symbol{font-family:var(--font-display);font-size:var(--step-xl);font-weight:600;color:var(--ivory)}
    .cmx__invlabel{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.08em;
      text-transform:uppercase;color:var(--brass-bright)}
    .cmx__finger{font-size:var(--step-xs);color:var(--ivory-dim);margin-left:auto}
    .cmx__prompt{margin:.1rem 0 0;font-family:var(--font-display);font-size:var(--step-md,1.15rem);
      color:var(--ivory)}
    .cmx__panel{margin:0}
    .cmx__status{margin:.1rem 0 0;font-size:var(--step-sm);color:var(--ivory-dim);min-height:1.2em}
    .cmx__status.is-good{color:var(--good,#6FB59A)}
    .cmx__next{align-self:flex-start;background:#24222D;color:var(--ivory);
      border:1px solid var(--ebony-edge);border-radius:var(--radius-md,8px);
      padding:8px 16px;font-size:var(--step-sm);cursor:pointer}
    @media (max-width:720px){
      .cmx__finger{margin-left:0;flex-basis:100%}
      .cmx__select{min-width:0;flex:1 1 44%}
    }
  `;
  document.head.appendChild(s);
}
