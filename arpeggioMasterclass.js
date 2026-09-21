// arpeggioMasterclass.js
//
// ============================================================================
// THE ARPEGGIO MASTERCLASS — rc2-226
// ============================================================================
//
// 04 — Flow. The room the front door has been promising since the beginning:
// "Broken-chord patterns across all keys, hands, and inversions."
//
// Arpeggios shipped at rc2-223 as two extra entries in the Scales dropdown,
// which was the cheap way to get them working and the wrong place for them to
// live. A broken chord is not a scale — it is a chord you walk through — and
// burying it under "Scale: Major arpeggio" hid a whole strand of the book
// behind a menu. They now have their own shelf, and the Scales room is a scales
// room again.
//
// Built in the same language as the Chord Library, because that shape worked:
// pick a root, see what you are about to play spelled out, tap once and hear
// it. No drill, no scoring — this is a reference you practise from.
//
// SOUND: ctx.piano, the Course voice, with ctx.synth as the fallback.
//
// Loaded lazily by app.js. Default-exports a factory:
//   createView({ mount, keyboard, piano, synth, evaluator }) -> { enter, exit, destroy }

import { arpeggioFingering } from './fingeringEngine.js';
import { buildChord, inversionLabel } from './chordDictionary.js';
import { createStaffView } from './staffView.js';
import { unlockAudio } from './audioContext.js';

const MAJOR_ROOTS = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#'];
const MINOR_ROOTS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'Eb', 'Bb', 'F', 'C', 'G', 'D'];
const NATURAL = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const BLACK_PC = new Set([1, 3, 6, 8, 10]);

const display = (s) => String(s).replace('#', '♯').replace('b', '♭');

/** Put the arpeggio where it sits comfortably around middle C. */
function baseOctave(rootName, hand) {
  const acc = rootName.slice(1);
  const pc = (((LETTER_PC[rootName[0]] + (acc.includes('#') ? 1 : acc.includes('b') ? -1 : 0)) % 12) + 12) % 12;
  const rh = pc >= 5 ? 3 : 4;
  return hand === 'LH' ? rh - 1 : rh;
}

export default function createView(ctx) {
  const { mount, keyboard, piano, synth, evaluator } = ctx;

  const sel = { root: 'C', quality: 'major', hand: 'RH', octaves: 1, inversion: 0 };
  const staff = createStaffView({ compact: false });
  const rootPills = new Map();
  const qualityButtons = new Map();
  const handButtons = new Map();
  const octButtons = new Map();
  let invButtons = [];
  let timers = [];

  injectStyles();
  const ui = build();

  /* ===================================================================== *
   * The notes
   * ===================================================================== */

  const roots = () => (sel.quality === 'minor' ? MINOR_ROOTS : MAJOR_ROOTS);

  /**
   * One hand's arpeggio, ascending, with fingering where we have it.
   *
   * Root position comes from the fingering engine, which carries the derived
   * 1 2 3 5 / 5 3 2 1 and its multi-octave join. An INVERSION is built from the
   * chord dictionary instead and carries no fingering: the root-position shape
   * is a convention I can state and defend, and the inversions are not, so
   * rather than invent numbers the room shows the notes and says so.
   */
  function handNotes(hand) {
    const octave = baseOctave(sel.root, hand);
    if (sel.inversion === 0) {
      const f = arpeggioFingering(sel.root, hand, {
        octaves: sel.octaves, startOctave: octave, quality: sel.quality,
      });
      return {
        notes: f.notes.map((n) => ({ ...n, black: BLACK_PC.has((((n.midi % 12) + 12) % 12)) })),
        note: f.note,
        fingered: true,
      };
    }
    const ch = buildChord(sel.root, sel.quality === 'minor' ? 'minor' : 'major', {
      octave, inversion: sel.inversion,
    });
    const cell = ch.notes;                     // already sorted low to high
    const out = [];
    for (let o = 0; o < sel.octaves; o++) {
      for (const n of cell) out.push({ ...n, midi: n.midi + 12 * o, finger: null });
    }
    out.push({ ...cell[0], midi: cell[0].midi + 12 * sel.octaves, finger: null });
    return {
      notes: out.map((n) => ({ ...n, black: BLACK_PC.has((((n.midi % 12) + 12) % 12)) })),
      note: 'Inversion fingering has not been checked against a method book — '
        + 'practising on notes only. The pitches are correct.',
      fingered: false,
    };
  }

  function current() {
    const hands = sel.hand === 'Both' ? ['RH', 'LH'] : [sel.hand];
    const per = {};
    hands.forEach((h) => { per[h] = handNotes(h); });
    const primary = per[sel.hand === 'LH' ? 'LH' : 'RH'] || per[hands[0]];
    return { hands, per, primary };
  }

  /* ===================================================================== *
   * Sound
   * ===================================================================== */

  function clearTimers() {
    timers.forEach((t) => { try { window.clearTimeout(t); } catch (_) { /* no-op */ } });
    timers = [];
  }

  function sound(midi) {
    try { unlockAudio(); } catch (_) { /* no-op */ }
    if (piano && typeof piano.noteOn === 'function') {
      try {
        piano.noteOn(midi, 96, undefined);
        timers.push(window.setTimeout(() => {
          try { piano.noteOff(midi); } catch (_) { /* no-op */ }
        }, 900));
        return;
      } catch (_) { /* fall through */ }
    }
    if (synth && synth.ctx) {
      const t = synth.ctx.currentTime;
      try { synth.noteOn(midi, 90, t, 'demo'); synth.noteOff(midi, t + 0.8); } catch (_) { /* no-op */ }
    }
  }

  /**
   * An arpeggio is a chord walked through, so it is played one note at a time.
   * Both-hands plays the two hands together, note for note, which is how the
   * books set them.
   */
  function play() {
    clearTimers();
    const { hands, per } = current();
    const len = Math.min(...hands.map((h) => per[h].notes.length));
    for (let i = 0; i < len; i++) {
      timers.push(window.setTimeout(() => {
        const midis = hands.map((h) => per[h].notes[i].midi);
        midis.forEach(sound);
        lightStep(midis);
      }, i * 260));
    }
  }

  function stopAll() {
    clearTimers();
    try { piano && piano.allNotesOff && piano.allNotesOff(); } catch (_) { /* no-op */ }
    try { synth && synth.allNotesOff && synth.allNotesOff(); } catch (_) { /* no-op */ }
  }

  function lightStep(midis) {
    try { keyboard.clearHighlight('match'); } catch (_) { /* no-op */ }
    try { keyboard.highlight(midis, 'match'); } catch (_) { /* no-op */ }
  }

  /* ===================================================================== *
   * Show
   * ===================================================================== */

  function show({ sound: withSound = false } = {}) {
    const { hands, per, primary } = current();

    const ch = buildChord(sel.root, sel.quality === 'minor' ? 'minor' : 'major', { octave: 4 });
    ui.symbol.textContent = ch.symbol;
    ui.qualityName.textContent = `${sel.quality === 'minor' ? 'Minor' : 'Major'} arpeggio`
      + ` · ${inversionLabel(sel.inversion)}`;

    // The notes of one octave, in theory order — what the player is walking up.
    ui.noteList.replaceChildren(...primary.notes.slice(0, sel.inversion === 0 ? 4 : 4).map((n) => {
      const s = el('span', { class: 'arp__note' + (n.black ? ' is-black' : '') });
      const nm = el('span', { class: 'arp__noteName' }); nm.textContent = n.name ?? '';
      const fg = el('span', { class: 'arp__noteFinger' });
      fg.textContent = n.finger == null ? '·' : String(n.finger);
      s.append(nm, fg);
      return s;
    }));

    ui.fingerNote.textContent = primary.fingered ? (primary.note ?? '') : primary.note;

    try {
      const names = primary.notes.map((n) => `${asciiName(n)}${octaveOf(n)}`);
      const lower = sel.hand === 'Both' && per.LH
        ? per.LH.notes.map((n) => `${asciiName(n)}${octaveOf(n)}`) : null;
      staff.setSequence(names, { lower, pan: true });
    } catch (_) { /* never silence the room over the staff */ }

    for (const v of ['target', 'root', 'match', 'mismatch']) {
      try { keyboard.clearHighlight(v); } catch (_) { /* no-op */ }
    }
    const all = hands.flatMap((h) => per[h].notes.map((n) => n.midi));
    try {
      keyboard.highlight(all, 'target');
      keyboard.highlight([primary.notes[0].midi], 'root');
    } catch (_) { /* no-op */ }
    try { evaluator && evaluator.setExpected(all); } catch (_) { /* no-op */ }

    refreshControls();
    if (withSound) play();
  }

  function refreshControls() {
    for (const [r, b] of rootPills) {
      b.classList.toggle('is-active', r === sel.root);
      b.setAttribute('aria-pressed', r === sel.root ? 'true' : 'false');
    }
    for (const [q, b] of qualityButtons) {
      b.classList.toggle('is-active', q === sel.quality);
      b.setAttribute('aria-pressed', q === sel.quality ? 'true' : 'false');
    }
    for (const [h, b] of handButtons) {
      b.classList.toggle('is-active', h === sel.hand);
      b.setAttribute('aria-pressed', h === sel.hand ? 'true' : 'false');
    }
    for (const [o, b] of octButtons) {
      b.classList.toggle('is-active', Number(o) === sel.octaves);
      b.setAttribute('aria-pressed', Number(o) === sel.octaves ? 'true' : 'false');
    }
    invButtons.forEach((b, i) => {
      b.classList.toggle('is-active', i === sel.inversion);
      b.setAttribute('aria-pressed', i === sel.inversion ? 'true' : 'false');
    });
  }

  function rebuildRoots() {
    ui.rootRow.replaceChildren();
    rootPills.clear();
    for (const r of roots()) {
      const b = el('button', {
        class: 'arp__pill' + (NATURAL.has(r) ? '' : ' is-accidental'),
        type: 'button', 'aria-pressed': 'false',
      });
      b.textContent = display(r);
      b.addEventListener('click', () => { sel.root = r; show({ sound: true }); });
      ui.rootRow.appendChild(b);
      rootPills.set(r, b);
    }
  }

  function selectQuality(q) {
    sel.quality = q;
    if (!roots().includes(sel.root)) {
      const swap = { Db: 'C#', 'C#': 'Db', Ab: 'G#', 'G#': 'Ab' }[sel.root];
      sel.root = (swap && roots().includes(swap)) ? swap : roots()[0];
    }
    rebuildRoots();
    show({ sound: true });
  }

  /* ===================================================================== *
   * Build
   * ===================================================================== */

  function build() {
    const root = el('div', { class: 'arp' });
    root.innerHTML = '<p class="vector__eyebrow">04 — Flow</p>';

    const head = el('div', { class: 'arp__head' });
    const title = el('h2', { class: 'arp__title' });
    title.textContent = 'Arpeggio Masterclass';
    const blurb = el('p', { class: 'arp__blurb' });
    blurb.textContent = 'Broken chords across all keys, hands and inversions. '
      + 'A chord you walk through rather than strike — pick one and hear it.';
    head.append(title, blurb);

    const bar = el('div', { class: 'arp__bar' });

    const qualRow = el('div', { class: 'arp__seg', role: 'group', 'aria-label': 'Quality' });
    for (const [q, label] of [['major', 'Major'], ['minor', 'Minor']]) {
      const b = segButton(label, () => selectQuality(q));
      qualRow.appendChild(b); qualityButtons.set(q, b);
    }
    const handRow = el('div', { class: 'arp__seg', role: 'group', 'aria-label': 'Hand' });
    for (const [h, label] of [['RH', 'Right'], ['LH', 'Left'], ['Both', 'Both']]) {
      const b = segButton(label, () => { sel.hand = h; show({ sound: true }); });
      handRow.appendChild(b); handButtons.set(h, b);
    }
    const octRow = el('div', { class: 'arp__seg', role: 'group', 'aria-label': 'Range' });
    for (const o of [1, 2]) {
      const b = segButton(`${o} octave${o > 1 ? 's' : ''}`, () => { sel.octaves = o; show({ sound: true }); });
      octRow.appendChild(b); octButtons.set(String(o), b);
    }
    bar.append(labelled('Quality', qualRow), labelled('Hand', handRow), labelled('Range', octRow));

    const rootWrap = el('div', { class: 'arp__roots' });
    const rootLabel = el('span', { class: 'arp__fieldlabel' }); rootLabel.textContent = 'Root';
    const rootRow = el('div', { class: 'arp__rootrow', role: 'group', 'aria-label': 'Arpeggio root' });
    rootWrap.append(rootLabel, rootRow);

    const panel = el('div', { class: 'arp__panel' });
    const symbol = el('div', { class: 'arp__symbol' });
    const qualityName = el('div', { class: 'arp__qualityname' });
    const noteList = el('div', { class: 'arp__notelist' });
    const staffWrap = el('div', { class: 'arp__staff' }); staffWrap.appendChild(staff.el);
    const fingerNote = el('p', { class: 'arp__fingernote' });

    const invRow = el('div', { class: 'arp__seg', role: 'group', 'aria-label': 'Inversion' });
    invButtons = [];
    for (let i = 0; i < 3; i++) {
      const b = segButton(i === 0 ? 'Root' : `${i}${i === 1 ? 'st' : 'nd'}`, () => {
        sel.inversion = i; show({ sound: true });
      });
      b.title = inversionLabel(i);
      invRow.appendChild(b); invButtons.push(b);
    }

    const actions = el('div', { class: 'arp__actions' });
    actions.append(
      button('♪ Hear it', () => show({ sound: true }), 'btn--xl'),
      button('◼ Stop', stopAll, 'btn--xl btn--ghost'),
    );

    panel.append(symbol, qualityName, noteList, staffWrap, fingerNote,
      labelled('Inversion', invRow), actions);

    root.append(head, bar, rootWrap, panel);
    return { root, rootRow, symbol, qualityName, noteList, fingerNote };
  }

  /* ===================================================================== *
   * Lifecycle
   * ===================================================================== */

  return {
    enter() {
      mount.replaceChildren(ui.root);
      rebuildRoots();
      show({ sound: false });
    },
    exit() {
      stopAll();
      for (const v of ['target', 'root', 'match', 'mismatch']) {
        try { keyboard.clearHighlight(v); } catch (_) { /* no-op */ }
      }
      try { evaluator && evaluator.reset(); } catch (_) { /* no-op */ }
    },
    destroy() { stopAll(); },
  };
}

/* ========================= helpers ========================= */

function asciiName(n) {
  const marks = { '-2': 'bb', '-1': 'b', 0: '', 1: '#', 2: 'x' };
  return n.letter + (marks[String(n.accidental)] ?? '');
}
function octaveOf(n) {
  return Math.round((n.midi - LETTER_PC[n.letter] - n.accidental) / 12) - 1;
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
function segButton(label, onClick) {
  const b = el('button', { class: 'arp__segbtn', type: 'button', 'aria-pressed': 'false' });
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
function labelled(label, control) {
  const wrap = el('div', { class: 'arp__field' });
  const s = el('span', { class: 'arp__fieldlabel' }); s.textContent = label;
  wrap.append(s, control);
  return wrap;
}

function injectStyles() {
  if (document.getElementById('arp-styles')) return;
  const s = document.createElement('style');
  s.id = 'arp-styles';
  s.textContent = `
  .arp { display: flex; flex-direction: column; gap: 1rem; }
  .arp__title { margin: .1rem 0 .3rem; font-size: 1.5rem; letter-spacing: -.01em; }
  .arp__blurb { margin: 0; max-width: 60ch; opacity: .72; font-size: .95rem; line-height: 1.45; }
  .arp__bar { display: flex; flex-wrap: wrap; gap: 1rem; }
  .arp__field { display: flex; flex-direction: column; gap: .35rem; }
  .arp__fieldlabel { font-size: .72rem; letter-spacing: .09em; text-transform: uppercase; opacity: .6; }
  .arp__seg { display: flex; gap: .3rem; flex-wrap: wrap; }
  .arp__segbtn { padding: .45rem .8rem; border-radius: .5rem; cursor: pointer; color: inherit;
    border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04);
    font: 600 .88rem/1 inherit; }
  .arp__segbtn.is-active { background: var(--km-accent, #c8a34a); color: #14110c; border-color: transparent; }
  .arp__rootrow { display: flex; flex-wrap: wrap; gap: .35rem; }
  .arp__pill { min-width: 2.9rem; padding: .5rem .55rem; border-radius: .55rem; cursor: pointer;
    border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04);
    color: inherit; font: 600 1rem/1 inherit; }
  .arp__pill.is-accidental { background: rgba(0,0,0,.28); }
  .arp__pill.is-active { background: var(--km-accent, #c8a34a); color: #14110c; border-color: transparent; }
  .arp__panel { border: 1px solid rgba(255,255,255,.12); border-radius: .9rem;
    padding: 1rem; background: rgba(255,255,255,.03);
    display: flex; flex-direction: column; align-items: center; gap: .5rem; }
  .arp__symbol { font-size: 2.6rem; font-weight: 700; line-height: 1.05; }
  .arp__qualityname { font-size: .9rem; opacity: .68; margin-top: -.25rem; }
  .arp__notelist { display: flex; gap: .5rem; justify-content: center; margin: .35rem 0 .1rem; flex-wrap: wrap; }
  .arp__note { display: flex; flex-direction: column; align-items: center; min-width: 3.1rem;
    padding: .35rem .45rem; border-radius: .5rem; background: rgba(255,255,255,.06); }
  .arp__note.is-black { background: rgba(0,0,0,.34); }
  .arp__noteName { font-size: 1.12rem; font-weight: 700; }
  .arp__noteFinger { font-size: .74rem; opacity: .6; }
  .arp__staff { width: 100%; margin: .3rem 0 .1rem; }
  .arp__fingernote { margin: 0; font-size: .78rem; opacity: .6; text-align: center; max-width: 52ch; line-height: 1.4; }
  .arp__actions { display: flex; gap: .5rem; flex-wrap: wrap; justify-content: center; margin-top: .4rem; }
  @media (max-width: 560px) {
    .arp__symbol { font-size: 2.1rem; }
    .arp__pill { min-width: 2.6rem; padding: .45rem .4rem; font-size: .94rem; }
  }
  `;
  document.head.appendChild(s);
}
