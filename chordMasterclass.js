// chordMasterclass.js
//
// Chord Masterclass — Stage 1 prototype (Chord Recognition).
//
// Scope (per spec §10): major & minor triads, block chords, root/1st/2nd
// inversion, Left- or Right-hand, white notation panel, keyboard highlights,
// green/red feedback. NOT in scope yet: 7th chords, lead-sheet progressions,
// broken chords, analytics, audio. Those are later stages.
//
// The user picks Root · Quality · Inversion · Hand; we show the chord on the
// staff (stemless block), light up where it sits on the keyboard (brass target +
// felt root), and arm a block-chord evaluator. Playing every required tone with
// no extras flashes the chord green; a non-chord tone flashes red. The single-
// note midiEvaluator that Scales/Sight-Reading use is left completely alone.
//
// Loaded lazily by app.js: import('./chordMasterclass.js'). Default-exports a
// factory createView(ctx) → { enter, exit, destroy }.

import { createStaffView } from './staffView.js';
import { noteName, SHARP_NAMES, FLAT_NAMES } from './notes.js';
import { buildChord, recommendedFingering, chordSymbol, INVERSIONS } from './chordEngine.js';
import { createChordEvaluator } from './chordEvaluator.js';

const QUALITY_OPTIONS = [['major', 'Major'], ['minor', 'Minor']]; // Stage-1 scope
const HAND_OPTIONS = [['RH', 'Right hand'], ['LH', 'Left hand']];

export default function createView(ctx) {
  const { mount, keyboard, viewport, input, evaluator: globalEvaluator } = ctx;
  const pref = keyboard && keyboard.accidental === 'flat' ? 'flat' : 'sharp';
  const ROOT_NAMES = pref === 'flat' ? FLAT_NAMES : SHARP_NAMES;
  const ROOT_OPTIONS = ROOT_NAMES.map((n, pc) => [String(pc), n]);

  const sel = { rootPc: 0, quality: 'major', inversion: 'root', hand: 'RH' };
  const staff = createStaffView({ compact: false });
  const evaluator = createChordEvaluator({ input, keyboard });
  const ui = {};
  let built = false;
  let offComplete = null, offWrong = null;

  /* ---- build (once) -------------------------------------------------- */
  function build() {
    injectStyles();
    const root = el('div', { class: 'cmx' });

    const controls = el('div', { class: 'cmx__controls' });
    ui.root_ = select(ROOT_OPTIONS, String(sel.rootPc), (v) => { sel.rootPc = Number(v); showChord(); });
    ui.qual = select(QUALITY_OPTIONS, sel.quality, (v) => { sel.quality = v; showChord(); });
    ui.inv = select(INVERSIONS, sel.inversion, (v) => { sel.inversion = v; showChord(); });
    ui.hand = select(HAND_OPTIONS, sel.hand, (v) => { sel.hand = v; showChord(); });
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

    const panel = el('div', { class: 'cmx__panel' });
    panel.appendChild(staff.el);

    ui.status = el('p', { class: 'cmx__status' });

    root.append(controls, band, panel, ui.status);
    mount.replaceChildren(root);
    built = true;

    offComplete = evaluator.on('complete', () => {
      ui.status.textContent = '✓ Correct chord — nicely shaped.';
      ui.status.classList.add('is-good');
    });
    offWrong = evaluator.on('wrong', () => {
      ui.status.textContent = 'That note isn\u2019t in the chord — lift and reshape.';
      ui.status.classList.remove('is-good');
    });
  }

  /* ---- render the current selection ---------------------------------- */
  function showChord() {
    const chord = buildChord(sel);
    const names = chord.midis.map((m) => noteName(m, { accidental: pref }));
    const fingers = recommendedFingering(chord.midis, sel.hand);
    // Stage 1 display polish: show only the thumb anchor (finger 1) on the staff.
    // The pinky (5) marker is dropped to keep stacked triads uncluttered — the
    // keyboard highlights already teach the full hand shape. This trims the STAFF
    // LABELS only; chord detection, inversion logic, and keyboard highlights are
    // unaffected (none of them read this array).
    const staffFingers = fingers.map((f) => (f === 1 ? 1 : null));

    staff.setChord(names, { fingers: staffFingers });
    const map = new Map();
    chord.midis.forEach((m, i) => map.set(m, i));
    evaluator.attachStaff(staff, map);
    evaluator.setExpected(chord.midis);

    // Keyboard: clear any prior decoration, frame the chord, show shape + root.
    for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    viewport.frame(chord.midis);
    keyboard.highlight(chord.midis, 'target');
    keyboard.highlight([chord.rootMidi], 'root');

    // Readout.
    ui.symbol.textContent = chordSymbol(ROOT_NAMES[chord.rootPc], sel.quality);
    ui.invlabel.textContent = invLabel(sel.inversion);
    ui.finger.textContent = sel.hand === 'LH'
      ? 'Recommended: LH 5 (low) · 1 (high)'
      : 'Recommended: RH 1 (low) · 5 (high)';
    ui.status.textContent = `Play these ${chord.midis.length} notes together.`;
    ui.status.classList.remove('is-good');
  }

  /* ---- lifecycle ----------------------------------------------------- */
  return {
    enter() {
      if (!built) build();
      // Make sure the single-note evaluator (Scales/SR) is disarmed while here.
      globalEvaluator?.clearExpected?.();
      showChord();
    },
    exit() {
      evaluator.clear();
      staff.clearMarks();
      for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    },
    destroy() {
      offComplete?.(); offWrong?.();
      evaluator.destroy();
    },
  };
}

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
  for (const [val, label] of options) {
    const o = el('option'); o.value = val; o.textContent = label;
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
    .cmx__controls{display:flex;flex-wrap:wrap;gap:.6rem}
    .cmx__field{display:flex;flex-direction:column;gap:.25rem}
    .cmx__fieldlabel{font-family:var(--font-mono);font-size:var(--step-xs);
      letter-spacing:.08em;text-transform:uppercase;color:var(--ivory-faint)}
    .cmx__select{background:#24222D;color:var(--ivory);border:1px solid var(--ebony-edge);
      border-radius:var(--radius-md,8px);padding:8px 10px;font-size:var(--step-sm);min-width:8.5rem}
    .cmx__band{display:flex;flex-wrap:wrap;align-items:baseline;gap:.4rem .9rem}
    .cmx__symbol{font-family:var(--font-display);font-size:var(--step-xl);font-weight:600;color:var(--ivory)}
    .cmx__invlabel{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.08em;
      text-transform:uppercase;color:var(--brass-bright)}
    .cmx__finger{font-size:var(--step-xs);color:var(--ivory-dim);margin-left:auto}
    .cmx__panel{margin:0}
    .cmx__status{margin:.1rem 0 0;font-size:var(--step-sm);color:var(--ivory-dim);min-height:1.2em}
    .cmx__status.is-good{color:var(--good,#6FB59A)}
    @media (max-width:720px){
      .cmx__finger{margin-left:0;flex-basis:100%}
      .cmx__select{min-width:0;flex:1 1 44%}
    }
  `;
  document.head.appendChild(s);
}
