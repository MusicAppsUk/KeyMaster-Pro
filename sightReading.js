// sightReading.js
//
// Cognitive Sight-Reading — curriculum ENGINE + interactive practice.
// Data-driven (reads sightReadingCurriculum.js) and input-agnostic: it scores
// the normalized note stream from app's NoteInput hub and never cares whether a
// note came from the on-screen keyboard or a Web MIDI controller.
//
// PHASE 1 — Guided "stop-and-wait" practice:
//   • a cursor marks the expected note; the next note shows a faint preview
//   • correct input  → note turns emerald green, cursor advances
//   • wrong input    → note flashes warning red, cursor WAITS (no advance)
//   • last note right → success state, then the next level loads automatically
//
// Loaded lazily by app.js: import('./sightReading.js'). Factory:
//   createView({ mount, keyboard, viewport, synth, input, … })
//     → { enter(), exit(), destroy() }

import CURRICULUM from './sightReadingCurriculum.js';
import { toMidi, noteName } from './notes.js';
import { unlockAudio } from './audioContext.js';

const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const TREBLE_TOP = 38; // F5 diatonic number (top line of treble)
const BASS_TOP = 26;   // A3 diatonic number (top line of bass)
const WRONG_FLASH_MS = 280;
const SUCCESS_HOLD_MS = 1300;

export default function createView(ctx) {
  const { mount, keyboard, viewport, synth, input } = ctx;
  const audioOK = Boolean(synth);

  let idx = 0;               // current level index
  let mode = 'idle';         // idle | guided | complete
  let cursor = 0;            // expected-note index within the exercise
  let model = [];            // [{ name, midi, staff, off, leftPct, el }]
  let timers = [];

  injectStyles();
  const ui = buildUI();

  // One subscription to the normalized input stream for the life of the view.
  const offInput = input ? input.subscribe(onNotePlayed) : null;

  /* ===================================================================== *
   * Note parsing + staff placement
   * ===================================================================== */

  function parseNote(name) {
    const m = /^([A-Ga-g])(##|bb|[#b]|x)?(-?\d+)$/.exec(String(name).trim());
    if (!m) throw new Error(`sightReading: unparseable note "${name}"`);
    const letter = m[1].toUpperCase();
    const accidental = { '#': 1, '##': 2, x: 2, b: -1, bb: -2 }[m[2]] ?? 0;
    return { letter, accidental, octave: parseInt(m[3], 10) };
  }

  function place(name) {
    const n = parseNote(name);
    const diatonic = LETTER_INDEX[n.letter] + 7 * n.octave;
    const midi = toMidi(n.letter, n.accidental, n.octave);
    const staff = midi >= 60 ? 'treble' : 'bass';
    const topLine = staff === 'treble' ? TREBLE_TOP : BASS_TOP;
    return { staff, off: (topLine - diatonic) / 2, accidental: n.accidental, midi };
  }

  function ledgerOffsets(off) {
    const out = []; const EPS = 1e-9;
    if (off >= 5 - EPS) for (let k = 5; k <= Math.floor(off + EPS); k++) out.push(k);
    if (off <= -1 + EPS) for (let k = -1; k >= Math.ceil(off - EPS); k--) out.push(k);
    return out;
  }

  /* ===================================================================== *
   * Render the current level into the staff (builds `model`)
   * ===================================================================== */

  function render() {
    idx = ((idx % CURRICULUM.length) + CURRICULUM.length) % CURRICULUM.length;
    const ex = CURRICULUM[idx];

    [ui.treble, ui.bass].forEach((s) =>
      s.querySelectorAll('.note, .ledger').forEach((n) => n.remove()));

    const notes = ex.notes ?? [];
    const n = notes.length;
    const START = 24, END = 88;
    model = notes.map((name, i) => {
      const leftPct = n <= 1 ? 52 : START + ((END - START) * i) / (n - 1);
      const p = place(name);
      const el = engrave(p, leftPct, i, name);
      return { name, midi: p.midi, staff: p.staff, off: p.off, leftPct, el };
    });

    ui.level.textContent = `Level ${ex.level}${ex.name ? ' · ' + ex.name : ''}`;
    ui.count.textContent = `${n} note${n === 1 ? '' : 's'}  ·  ${idx + 1}/${CURRICULUM.length}`;
  }

  function engrave(p, leftPct, i, name) {
    const staffEl = p.staff === 'treble' ? ui.treble : ui.bass;
    for (const k of ledgerOffsets(p.off)) {
      const led = el('div', { class: 'ledger' });
      led.style.left = `calc(${leftPct}% - var(--note-head) * 0.4)`;
      led.style.top = `calc(var(--staff-space) * ${k} - var(--staff-line) / 2)`;
      staffEl.appendChild(led);
    }
    const note = el('div', { class: `note ${p.off < 2 ? 'note--stem-down' : ''}`.trim() });
    note.dataset.index = String(i);
    note.style.left = `${leftPct}%`;
    note.style.top = `calc(var(--staff-space) * ${p.off} - var(--note-head) / 2)`;
    if (p.accidental) {
      const a = el('span', { class: 'note__accidental' });
      a.textContent = p.accidental > 0 ? '\u266F' : '\u266D';
      note.appendChild(a);
    }
    note.appendChild(el('div', { class: 'note__head' }));
    note.appendChild(el('div', { class: 'note__stem' }));
    // Small name label so the staff is never ambiguous (training aid).
    const tag = el('span', { class: 'note__name' });
    tag.textContent = name;
    note.appendChild(tag);
    staffEl.appendChild(note);
    return note;
  }

  /* ===================================================================== *
   * Guided practice (stop-and-wait)
   * ===================================================================== */

  function startGuided() {
    if (!input || model.length === 0) return;
    clearTimers();
    mode = 'guided';
    cursor = 0;
    render();                 // fresh notes, no states
    arm();                    // arm() now sets the status line
    viewport?.frame(model.map((m) => m.midi));
    setButtons();
  }

  /** Mark the expected note as the cursor, preview the next, guide the key. */
  function arm() {
    model.forEach((m) => m.el.classList.remove('is-current', 'is-next'));
    const cur = model[cursor];
    cur.el.classList.add('is-current');
    model[cursor + 1]?.el.classList.add('is-next');

    keyboard?.clearHighlight('target');
    keyboard?.highlight([cur.midi], 'target');

    // Make the expectation explicit: name AND MIDI, the single value used for
    // the staff cursor, the keyboard highlight, and scoring alike.
    ui.status.textContent = `Expected: ${cur.name} · MIDI ${cur.midi} — play the highlighted key.`;
  }

  function onNotePlayed(ev) {
    if (mode !== 'guided') return;          // input-agnostic: only the shape matters
    const cur = model[cursor];
    if (!cur) return;

    if (ev.midiNote === cur.midi) {
      cur.el.classList.remove('is-current', 'is-missed');
      cur.el.classList.add('is-correct');   // emerald green
      cursor += 1;
      if (cursor >= model.length) { success(); return; }
      arm();
    } else {
      // Wrong: flash red and WAIT — the cursor does not advance. Show exactly
      // what was expected vs received, so any transposition (in the engine OR
      // in a MIDI controller's octave/transpose setting) is visible in numbers.
      cur.el.classList.add('is-missed');
      const t = setTimeout(() => cur.el.classList.remove('is-missed'), WRONG_FLASH_MS);
      timers.push(t);
      ui.status.textContent =
        `✗ Expected ${cur.name} (MIDI ${cur.midi}) — received ${noteName(ev.midiNote)} (MIDI ${ev.midiNote}). Try again.`;
    }
  }

  function success() {
    mode = 'complete';
    keyboard?.clearHighlight('target');
    ui.status.textContent = '✓ Level complete! Loading the next one…';
    ui.staffWrap.classList.add('is-success');
    const t = setTimeout(() => {
      ui.staffWrap.classList.remove('is-success');
      idx += 1;          // advance the curriculum
      startGuided();     // auto-load + arm the next level
    }, SUCCESS_HOLD_MS);
    timers.push(t);
    setButtons();
  }

  function stop() {
    clearTimers();
    mode = 'idle';
    keyboard?.clearHighlight('target');
    ui.staffWrap.classList.remove('is-success');
    render();
    ui.status.textContent = 'Ready.';
    setButtons();
  }

  /* ===================================================================== *
   * Listen (bonus)
   * ===================================================================== */

  function play() {
    if (!audioOK) return;
    stop();
    unlockAudio();
    synth.allNotesOff();
    const dt = 0.6;
    const t0 = synth.ctx.currentTime + 0.1;
    model.forEach((m, i) => {
      synth.noteOn(m.midi, 92, t0 + i * dt);
      synth.noteOff(m.midi, t0 + i * dt + dt * 0.9);
      const ms = Math.max(0, (t0 + i * dt - synth.ctx.currentTime) * 1000);
      timers.push(setTimeout(() => flash(i), ms));
    });
  }

  function flash(i) {
    model.forEach((m) => m.el.classList.remove('is-current'));
    model[i]?.el.classList.add('is-current');
  }

  /* ===================================================================== *
   * UI
   * ===================================================================== */

  function buildUI() {
    const root = el('div', { class: 'srx' });
    root.innerHTML = `<p class="vector__eyebrow">02 — Cognition</p>`;

    const staffWrap = el('div', { class: 'srx__staff' });
    staffWrap.innerHTML = `
      <div class="notation">
        <div class="grand-staff">
          <div class="grand-staff__brace"></div>
          <div class="grand-staff__spine"></div>
          <div class="staff staff--treble"><span class="clef clef--treble">&#x1D11E;</span></div>
          <div class="staff staff--bass"><span class="clef clef--bass">&#x1D122;</span></div>
        </div>
      </div>`;

    const bar = el('div', { class: 'srx__bar' });
    const practiceBtn = button('● Practice', startGuided);
    const stopBtn = button('◼ Stop', stop, 'btn--ghost');
    const prevBtn = button('‹ Prev', () => { idx -= 1; mode === 'idle' ? render() : startGuided(); }, 'btn--ghost');
    const nextBtn = button('Next ›', () => { idx += 1; mode === 'idle' ? render() : startGuided(); }, 'btn--ghost');
    const playBtn = button('♪ Listen', play, 'btn--ghost');
    const level = el('span', { class: 'srx__level' });
    const count = el('span', { class: 'srx__count' });
    bar.append(practiceBtn, stopBtn, prevBtn, nextBtn, playBtn);
    if (!input) practiceBtn.disabled = true;
    if (!audioOK) playBtn.disabled = true;

    const meta = el('div', { class: 'srx__meta' });
    meta.append(level, count);
    const status = el('div', { class: 'srx__status' });

    root.append(staffWrap, bar, meta, status);

    return {
      root, staffWrap,
      treble: staffWrap.querySelector('.staff--treble'),
      bass: staffWrap.querySelector('.staff--bass'),
      practiceBtn, stopBtn, prevBtn, nextBtn, playBtn, level, count, status,
    };
  }

  function setButtons() {
    ui.practiceBtn.disabled = !input || mode === 'guided';
    ui.stopBtn.disabled = mode === 'idle';
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ===================================================================== *
   * Lifecycle
   * ===================================================================== */

  return {
    enter() {
      mount.replaceChildren(ui.root);
      mode = 'idle';
      render();
      ui.status.textContent = input ? 'Press Practice, then play the highlighted notes.' : 'Input unavailable.';
      setButtons();
    },
    exit() {
      clearTimers();
      mode = 'idle';
      keyboard?.clearHighlight('target');
      synth?.allNotesOff();
    },
    destroy() {
      clearTimers();
      offInput?.();
      keyboard?.clearHighlight('target');
      synth?.allNotesOff();
    },
  };
}

/* ========================= helpers ========================= */

function el(tag, props = {}) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k === 'class' ? (n.className = v) : n.setAttribute(k, v);
  return n;
}
function button(label, onClick, variant = '') {
  const b = el('button', { class: `btn ${variant}`.trim(), type: 'button' });
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
function injectStyles() {
  if (document.getElementById('srx-styles')) return;
  const s = document.createElement('style');
  s.id = 'srx-styles';
  s.textContent = `
    .srx__bar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-top:1rem}
    .srx__meta{display:flex;gap:.75rem;align-items:baseline;margin-top:.6rem}
    .srx__level{font-family:var(--font-display);font-size:var(--step-lg);color:var(--brass-bright)}
    .srx__count{font-family:var(--font-mono);font-size:var(--step-sm);color:var(--ivory-dim)}
    .srx__status{font-family:var(--font-mono);font-size:var(--step-sm);color:var(--ivory);margin-top:.4rem;min-height:1.2em}
    /* Cursor + preview on the staff */
    .note.is-current .note__head{box-shadow:0 0 0 2px var(--brass-bright),0 0 10px var(--brass-glow)}
    .note.is-next{opacity:.5;color:var(--brass)}
    /* Small note-name label under each head (training aid, removes ambiguity) */
    .note__name{position:absolute;top:calc(var(--note-head) + 3px);left:50%;
      transform:translateX(-50%);font:500 9px var(--font-mono,monospace);
      color:var(--ivory-faint);white-space:nowrap;pointer-events:none}
    .note.is-current .note__name{color:var(--brass-bright)}
    /* Success pulse on the whole staff */
    .srx__staff.is-success .notation{box-shadow:0 0 0 1px var(--good),0 0 22px -4px var(--good)}
  `;
  document.head.appendChild(s);
}
