// scalesMasterclass.js
//
// View controller for the Scales Masterclass vector. This is an interim build:
// it shows a "coming soon" header AND a small live demo that proves the whole
// chain is wired — clicking a key/hand builds the scale, lights the real
// fingering onto the keyboard, frames the viewport to it, and can play it
// through the synth. When the full curriculum lands, this panel grows in place.
//
// Loaded lazily by app.js via import('./scalesMasterclass.js'). It must
// default-export a factory matching the orchestrator's contract:
//   createView({ mount, store, keyboard, viewport, midi, synth, scheduler, metronome })
//     → { enter(), exit(), destroy() }

import { majorFingering } from './fingeringEngine.js';
import { buildScale } from './scaleEngine.js';
import { unlockAudio } from './audioContext.js';

const KEYS = ['C', 'G', 'D', 'A', 'E', 'F'];

export default function createView(ctx) {
  const { mount, keyboard, viewport, synth } = ctx;
  const state = { tonic: 'C', hand: 'RH' };

  // ---- Build the panel once ----
  const ui = el('div', { class: 'sm' });
  ui.innerHTML = `
    <p class="vector__eyebrow">01 — Technique · live module check</p>
    <p class="placeholder__note" style="margin:.25rem 0 1rem">
      Full Scales Masterclass coming soon. Meanwhile, this verifies the engines,
      keyboard, viewport and synth are all live:
    </p>`;

  const keyRow = el('div', { class: 'sm__row' });
  const keyBtns = KEYS.map((k) =>
    button(`${k} major`, () => { state.tonic = k; apply(); markActive(keyBtns, k); })
  );
  keyBtns.forEach((b) => keyRow.appendChild(b));

  const handRow = el('div', { class: 'sm__row' });
  const handBtns = ['RH', 'LH'].map((h) =>
    button(h, () => { state.hand = h; apply(); markActive(handBtns, h); }, 'btn--ghost')
  );
  handBtns.forEach((b) => handRow.appendChild(b));
  const playBtn = button('▶ Play scale', play);
  handRow.appendChild(playBtn);

  const readout = el('div', { class: 'sm__readout' });

  ui.append(keyRow, handRow, readout);

  // Light spacing without touching the global stylesheet.
  injectOnce('sm-styles', `
    .sm__row{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0}
    .sm__readout{font-family:var(--font-mono);font-size:var(--step-sm);
      color:var(--ivory-dim);background:var(--ebony-sink);
      border:1px solid var(--ebony-edge);border-radius:var(--radius-sm);
      padding:.75rem;margin-top:.75rem;min-height:2.5rem;white-space:pre-wrap}
    .btn.is-on{border-color:var(--brass);color:var(--brass-bright)}
  `);

  /** Apply the current selection to the keyboard + viewport + readout. */
  function apply() {
    keyboard.clearHighlight('target');
    keyboard.clearFingers();

    const fing = majorFingering(state.tonic, state.hand, { octaves: 1, startOctave: 4 });
    const scale = buildScale(parseTonic(state.tonic), 'major');
    const nameByDegree = {};
    scale.degrees.forEach((d) => { nameByDegree[d.degree] = d.name; });

    const midis = fing.notes.map((n) => n.midi);
    keyboard.highlight(midis, 'target');
    fing.notes.forEach((n) => keyboard.setFinger(n.midi, n.finger));
    viewport?.frame(midis);

    const line = fing.notes
      .map((n) => `${nameByDegree[n.degree]}(${n.finger})`)
      .join('  ');
    readout.textContent = `${state.tonic} major · ${state.hand}\n${line}`;
  }

  /** Play the current scale ascending through the synth. */
  function play() {
    if (!synth) { readout.textContent += '\n(audio unavailable in this browser)'; return; }
    unlockAudio();
    synth.allNotesOff();
    const t0 = synth.ctx.currentTime + 0.06;
    const dt = 0.3;
    const fing = majorFingering(state.tonic, state.hand, { octaves: 1, startOctave: 4 });
    fing.notes.forEach((n, i) => {
      synth.noteOn(n.midi, 96, t0 + i * dt);
      synth.noteOff(n.midi, t0 + i * dt + dt * 0.9);
    });
  }

  return {
    enter() {
      mount.replaceChildren(ui);
      markActive(keyBtns, `${state.tonic} major`);
      markActive(handBtns, state.hand);
      apply();
    },
    exit() {
      synth?.allNotesOff();
      keyboard.clearHighlight('target');
      keyboard.clearFingers();
    },
    destroy() {
      synth?.allNotesOff();
    },
  };
}

/* ---------------- small DOM helpers ---------------- */

function el(tag, props = {}) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  return node;
}

function button(label, onClick, variant = '') {
  const b = el('button', { class: `btn ${variant}`.trim(), type: 'button' });
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function markActive(buttons, label) {
  buttons.forEach((b) => b.classList.toggle('is-on', b.textContent === label));
}

function parseTonic(name) {
  const letter = name[0].toUpperCase();
  const acc = name.slice(1);
  const accidental = acc === '#' ? 1 : acc === 'b' ? -1 : acc === 'x' ? 2 : acc === 'bb' ? -2 : 0;
  return { letter, accidental };
}

function injectOnce(id, css) {
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}
