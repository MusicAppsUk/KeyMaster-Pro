// chordLibrary.js
//
// ============================================================================
// THE CHORD LIBRARY — rc2-224
// ============================================================================
//
// The Chords room, rebuilt as a REFERENCE rather than a trainer.
//
// The old room fed you one chord at a time and asked you to play it. That is a
// useful thing, but it is not what a chord book is for, and it is not what a
// player reaches for mid-piece. A book opens at a root and shows you the whole
// family at once: every quality side by side, so you can find the one you want
// in a second and hear it.
//
// So: pick a root, see every chord built on it, tap one to hear it and see it
// on the staff and the keys. Inversions along the bottom. Play it yourself and
// the keys still answer green or red — the recognition did not go away, it just
// stopped being the point.
//
// Both spellings of every black-key root are listed. A flat major and G sharp
// major are one shape under the hand and two different entries on the page, and
// a player who meets G sharp major in a score needs to find it under G sharp.
// That is the whole reason a dictionary is spelled rather than numbered.
//
// SOUND: plays through ctx.piano — the Salamander sampler with the pianoVoice
// fallback, which is the same voice the Course and the keyboard use. The old
// room only ever had ctx.synth's plainer demo voice, which is why chords did
// not sound like the rest of the app.
//
// Loaded lazily by app.js. Default-exports a factory:
//   createView({ mount, keyboard, piano, synth, evaluator }) -> { enter, exit, destroy }

import {
  CHORD_ROOTS, buildChord, qualityGroups, inversionCount, inversionLabel,
} from './chordDictionary.js';
import { createStaffView } from './staffView.js';
import { unlockAudio } from './audioContext.js';

/** Roots that are a plain letter, for a visual distinction in the picker. */
const NATURAL = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
const display = (s) => String(s).replace('#', '♯').replace('b', '♭');

/** Which octave a chord sounds in, so it sits around middle C whatever the root. */
function octaveFor(rootName) {
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const acc = rootName.slice(1);
  const pc = (((PC[rootName[0]] + (acc.includes('#') ? 1 : acc.includes('b') ? -1 : 0)) % 12) + 12) % 12;
  // Choose the octave whose root sits closest to middle C, leaning low so the
  // upper notes of a thirteenth still land in a comfortable register.
  return pc >= 5 ? 3 : 4;
}

export default function createView(ctx) {
  const { mount, keyboard, piano, synth, evaluator } = ctx;

  const sel = { root: 'C', quality: 'major', inversion: 0 };
  const disposers = [];
  const staff = createStaffView({ compact: false });
  let cards = new Map();          // quality id -> button
  let rootPills = new Map();      // root -> button
  let invButtons = [];

  injectStyles();
  const ui = build();
  wire();

  /* ===================================================================== *
   * Sound
   * ===================================================================== */

  /** The good piano if the app handed us one, else the plain synth. */
  function voice() { return piano || null; }

  function playChord(notes, { spread = 0 } = {}) {
    try { unlockAudio(); } catch (_) { /* no-op */ }
    const p = voice();
    if (p && typeof p.noteOn === 'function') {
      // A small spread reads as a played chord rather than a sampled block.
      notes.forEach((n, i) => {
        try { p.noteOn(n.midi, 96, undefined); } catch (_) { /* no-op */ }
        void i; void spread;
      });
      window.setTimeout(() => {
        notes.forEach((n) => { try { p.noteOff(n.midi); } catch (_) { /* no-op */ } });
      }, 1500);
      return;
    }
    // Fallback: the plain synth's demo voice, so the room is never silent.
    if (synth && synth.ctx) {
      const t = synth.ctx.currentTime;
      notes.forEach((n) => { try { synth.noteOn(n.midi, 90, t, 'demo'); } catch (_) { /* no-op */ } });
      notes.forEach((n) => { try { synth.noteOff(n.midi, t + 1.4); } catch (_) { /* no-op */ } });
    }
  }

  function stopSound() {
    const p = voice();
    try { p && p.allNotesOff && p.allNotesOff(); } catch (_) { /* no-op */ }
    try { synth && synth.allNotesOff && synth.allNotesOff(); } catch (_) { /* no-op */ }
  }

  /* ===================================================================== *
   * Selection
   * ===================================================================== */

  function current() {
    return buildChord(sel.root, sel.quality, {
      octave: octaveFor(sel.root), inversion: sel.inversion,
    });
  }

  /** Redraw every card's note list for the current root. Cheap: 23 chords. */
  function refreshCards() {
    for (const [id, btn] of cards) {
      const ch = buildChord(sel.root, id, { octave: octaveFor(sel.root) });
      const sym = btn.querySelector('.chl__sym');
      const notes = btn.querySelector('.chl__notes');
      if (sym) sym.textContent = ch.symbol;
      if (notes) {
        notes.textContent = ch.notes
          .slice().sort((a, b) => a.degree - b.degree).map((n) => n.name).join(' ');
      }
      btn.classList.toggle('is-active', id === sel.quality);
      btn.setAttribute('aria-pressed', id === sel.quality ? 'true' : 'false');
    }
    for (const [r, btn] of rootPills) {
      btn.classList.toggle('is-active', r === sel.root);
      btn.setAttribute('aria-pressed', r === sel.root ? 'true' : 'false');
    }
  }

  /** Rebuild the inversion row for the selected quality. */
  function refreshInversions() {
    const n = inversionCount(sel.quality);
    if (sel.inversion >= n) sel.inversion = 0;
    ui.invRow.replaceChildren();
    invButtons = [];
    for (let i = 0; i < n; i++) {
      const b = el('button', { class: 'chl__inv', type: 'button' });
      b.textContent = i === 0 ? 'Root' : `${i}${['st', 'nd', 'rd', 'th', 'th', 'th'][i - 1]}`;
      b.title = inversionLabel(i);
      b.classList.toggle('is-active', i === sel.inversion);
      b.setAttribute('aria-pressed', i === sel.inversion ? 'true' : 'false');
      b.addEventListener('click', () => { sel.inversion = i; show({ sound: true }); });
      ui.invRow.appendChild(b);
      invButtons.push(b);
    }
  }

  /**
   * Show the selected chord everywhere at once: the headline, the note list,
   * the staff, the keys — and, unless told otherwise, sound it. Tapping a card
   * should answer immediately; that instant answer is the whole experience.
   */
  function show({ sound = false } = {}) {
    const ch = current();

    ui.symbol.textContent = ch.symbol;
    ui.qualityName.textContent = ch.quality.label;
    ui.invName.textContent = inversionLabel(sel.inversion);

    // Degrees in theory order, not sounding order, because that is how the
    // chord is built and how the book prints it.
    const byDegree = ch.notes.slice().sort((a, b) => a.degree - b.degree);
    ui.noteList.replaceChildren(...byDegree.map((n) => {
      const s = el('span', { class: 'chl__note' + (n.black ? ' is-black' : '') });
      const nm = el('span', { class: 'chl__noteName' }); nm.textContent = n.name;
      const dg = el('span', { class: 'chl__noteDeg' }); dg.textContent = degreeLabel(n.degree);
      s.append(nm, dg);
      return s;
    }));

    // Staff — spelled, so C sharp major draws E sharp on the E line.
    try {
      staff.setChord(ch.notes.map((n) => `${asciiName(n)}${octaveOf(n)}`), { clef: 'grand' });
    } catch (_) { /* a staff failure must never silence the room */ }

    // Keys
    for (const v of ['target', 'root', 'match', 'mismatch']) {
      try { keyboard.clearHighlight(v); } catch (_) { /* no-op */ }
    }
    try {
      keyboard.highlight(ch.notes.map((n) => n.midi), 'target');
      keyboard.highlight([ch.notes.find((n) => n.degree === 1)?.midi ?? ch.notes[0].midi], 'root');
    } catch (_) { /* no-op */ }

    // Recognition stays armed the whole time — play it and the keys answer.
    try { evaluator && evaluator.setExpected(ch.notes.map((n) => n.midi)); } catch (_) { /* no-op */ }

    refreshCards();
    if (sound) playChord(ch.notes);
  }

  function selectQuality(id) {
    sel.quality = id;
    refreshInversions();
    show({ sound: true });
  }

  function selectRoot(r) {
    sel.root = r;
    show({ sound: true });
  }

  /* ===================================================================== *
   * Build
   * ===================================================================== */

  function build() {
    const root = el('div', { class: 'chl' });
    root.innerHTML = '<p class="vector__eyebrow">02 — Harmony</p>';

    const head = el('div', { class: 'chl__head' });
    const title = el('h2', { class: 'chl__title' });
    title.textContent = 'Chord Library';
    const blurb = el('p', { class: 'chl__blurb' });
    blurb.textContent = 'Every chord on every root. Tap one to hear it, see it and find it '
      + 'under your hands. Both spellings of each black-key root are listed, because '
      + 'A♭ major and G♯ major are the same shape and two different chords on paper.';
    head.append(title, blurb);

    // ---- Root picker -------------------------------------------------------
    const rootWrap = el('div', { class: 'chl__roots' });
    const rootLabel = el('span', { class: 'chl__fieldlabel' });
    rootLabel.textContent = 'Root';
    const rootRow = el('div', { class: 'chl__rootrow', role: 'group', 'aria-label': 'Chord root' });
    for (const r of CHORD_ROOTS) {
      const b = el('button', {
        class: 'chl__pill' + (NATURAL.has(r) ? '' : ' is-accidental'),
        type: 'button', 'aria-pressed': 'false',
      });
      b.textContent = display(r);
      b.addEventListener('click', () => selectRoot(r));
      rootRow.appendChild(b);
      rootPills.set(r, b);
    }
    rootWrap.append(rootLabel, rootRow);

    // ---- Selected chord ----------------------------------------------------
    const panel = el('div', { class: 'chl__panel' });
    const symbol = el('div', { class: 'chl__symbol' });
    const qualityName = el('div', { class: 'chl__qualityname' });
    const noteList = el('div', { class: 'chl__notelist' });
    const invName = el('div', { class: 'chl__invname' });

    const invRow = el('div', { class: 'chl__invrow', role: 'group', 'aria-label': 'Inversion' });
    const playBtn = button('♪ Hear it', () => show({ sound: true }), 'btn--xl');
    const stopBtn = button('◼ Stop', stopSound, 'btn--xl btn--ghost');
    const actions = el('div', { class: 'chl__actions' });
    actions.append(playBtn, stopBtn);

    const staffWrap = el('div', { class: 'chl__staff' });
    staffWrap.appendChild(staff.el);

    panel.append(symbol, qualityName, noteList, staffWrap, invName, invRow, actions);

    // ---- Quality grid ------------------------------------------------------
    const grid = el('div', { class: 'chl__grid' });
    for (const g of qualityGroups()) {
      const section = el('section', { class: 'chl__group' });
      const h = el('h3', { class: 'chl__grouphead' });
      h.textContent = g.group;
      const row = el('div', { class: 'chl__cards' });
      for (const q of g.items) {
        const b = el('button', { class: 'chl__card', type: 'button', 'aria-pressed': 'false' });
        const sym = el('span', { class: 'chl__sym' });
        const lab = el('span', { class: 'chl__lab' }); lab.textContent = q.label;
        const notes = el('span', { class: 'chl__notes' });
        b.append(sym, lab, notes);
        b.addEventListener('click', () => selectQuality(q.id));
        row.appendChild(b);
        cards.set(q.id, b);
      }
      section.append(h, row);
      grid.appendChild(section);
    }

    root.append(head, rootWrap, panel, grid);
    return { root, symbol, qualityName, noteList, invName, invRow, grid };
  }

  function wire() {
    // Nothing global to bind — every control carries its own listener, and the
    // evaluator is driven by the app's own input layer.
  }

  /* ===================================================================== *
   * Lifecycle
   * ===================================================================== */

  return {
    enter() {
      mount.replaceChildren(ui.root);
      refreshInversions();
      show({ sound: false });     // opening the room should not make a noise
    },
    exit() {
      stopSound();
      for (const v of ['target', 'root', 'match', 'mismatch']) {
        try { keyboard.clearHighlight(v); } catch (_) { /* no-op */ }
      }
      try { evaluator && evaluator.reset(); } catch (_) { /* no-op */ }
    },
    destroy() {
      stopSound();
      disposers.forEach((d) => { try { d(); } catch (_) { /* no-op */ } });
      disposers.length = 0;
    },
  };
}

/* ========================= helpers ========================= */

function degreeLabel(d) {
  return ({ 1: 'root', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th',
    7: '7th', 9: '9th', 11: '11th', 13: '13th' })[d] ?? `${d}`;
}

/** staffView parses ASCII accidentals, so translate the display signs back. */
function asciiName(n) {
  const marks = { '-2': 'bb', '-1': 'b', 0: '', 1: '#', 2: 'x' };
  return n.letter + (marks[String(n.accidental)] ?? '');
}

/** The scientific octave that puts this spelling on the pitch it sounds. */
function octaveOf(n) {
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return Math.round((n.midi - PC[n.letter] - n.accidental) / 12) - 1;
}

function el(tag, props = {}) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v; else node.setAttribute(k, v);
  }
  return node;
}

function button(label, onClick, variant = '') {
  const b = el('button', { class: `btn ${variant}`.trim(), type: 'button' });
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function injectStyles() {
  if (document.getElementById('chl-styles')) return;
  const s = document.createElement('style');
  s.id = 'chl-styles';
  s.textContent = `
  .chl { display: flex; flex-direction: column; gap: 1rem; }
  .chl__title { margin: .1rem 0 .3rem; font-size: 1.5rem; letter-spacing: -.01em; }
  .chl__blurb { margin: 0; max-width: 62ch; opacity: .72; font-size: .95rem; line-height: 1.45; }

  .chl__fieldlabel { display: block; font-size: .72rem; letter-spacing: .09em;
    text-transform: uppercase; opacity: .6; margin-bottom: .4rem; }
  .chl__rootrow { display: flex; flex-wrap: wrap; gap: .35rem; }
  .chl__pill { min-width: 2.9rem; padding: .5rem .55rem; border-radius: .55rem;
    border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04);
    color: inherit; font: 600 1rem/1 inherit; cursor: pointer; }
  .chl__pill.is-accidental { background: rgba(0,0,0,.28); opacity: .88; }
  .chl__pill:hover { border-color: rgba(255,255,255,.34); }
  .chl__pill.is-active { background: var(--km-accent, #c8a34a); color: #14110c;
    border-color: transparent; opacity: 1; }

  .chl__panel { border: 1px solid rgba(255,255,255,.12); border-radius: .9rem;
    padding: 1rem 1rem 1.1rem; background: rgba(255,255,255,.03);
    display: flex; flex-direction: column; align-items: center; gap: .5rem; }
  .chl__symbol { font-size: 2.6rem; font-weight: 700; line-height: 1.05; letter-spacing: -.01em; }
  .chl__qualityname { font-size: .95rem; opacity: .68; margin-top: -.25rem; }
  .chl__notelist { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin: .35rem 0 .1rem; }
  .chl__note { display: flex; flex-direction: column; align-items: center;
    min-width: 3.1rem; padding: .35rem .45rem; border-radius: .5rem;
    background: rgba(255,255,255,.06); }
  .chl__note.is-black { background: rgba(0,0,0,.34); }
  .chl__noteName { font-size: 1.12rem; font-weight: 700; }
  .chl__noteDeg { font-size: .66rem; letter-spacing: .05em; text-transform: uppercase; opacity: .55; }
  .chl__staff { width: 100%; margin: .3rem 0 .1rem; }
  .chl__invname { font-size: .8rem; opacity: .6; }
  .chl__invrow { display: flex; gap: .35rem; flex-wrap: wrap; justify-content: center; }
  .chl__inv { padding: .4rem .7rem; border-radius: .5rem; cursor: pointer;
    border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04);
    color: inherit; font: 600 .86rem/1 inherit; }
  .chl__inv.is-active { background: var(--km-accent, #c8a34a); color: #14110c; border-color: transparent; }
  .chl__actions { display: flex; gap: .5rem; flex-wrap: wrap; justify-content: center; margin-top: .35rem; }

  .chl__grid { display: flex; flex-direction: column; gap: .9rem; }
  .chl__grouphead { margin: 0 0 .4rem; font-size: .72rem; letter-spacing: .1em;
    text-transform: uppercase; opacity: .55; font-weight: 600; }
  .chl__cards { display: grid; gap: .5rem;
    grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr)); }
  .chl__card { display: flex; flex-direction: column; gap: .12rem; text-align: left;
    padding: .6rem .7rem; border-radius: .6rem; cursor: pointer; color: inherit;
    border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.035); }
  .chl__card:hover { border-color: rgba(255,255,255,.32); }
  .chl__card.is-active { background: var(--km-accent, #c8a34a); color: #14110c; border-color: transparent; }
  .chl__sym { font-size: 1.12rem; font-weight: 700; }
  .chl__lab { font-size: .72rem; opacity: .62; }
  .chl__notes { font-size: .78rem; opacity: .78; margin-top: .15rem; letter-spacing: .01em; }
  .chl__card.is-active .chl__lab, .chl__card.is-active .chl__notes { opacity: .78; }

  @media (max-width: 560px) {
    .chl__symbol { font-size: 2.1rem; }
    .chl__cards { grid-template-columns: repeat(auto-fill, minmax(8.2rem, 1fr)); }
    .chl__pill { min-width: 2.6rem; padding: .45rem .4rem; font-size: .94rem; }
  }
  `;
  document.head.appendChild(s);
}
