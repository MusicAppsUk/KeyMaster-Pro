// sightReading.js
//
// MODULE 1 — Cognitive Sight-Reading Engine (RC2).
//
// Standard Middle-C notation domain only; scores the raw normalized MIDI stream
// from the NoteInput hub. It never transposes and never consults the B-Major
// motor system — the two communicate purely through performance events.
//
// Core loop (free timing, zero rhythm constraints):
//   • procedurally generate an exercise for the active level (3-variable matrix)
//   • the user plays the sequence; each interaction is logged to the EventBridge
//   • 100% pitch accuracy → Emerald Success Banner, advance level
//   • one wrong note    → fail text, regenerate a fresh equivalent exercise
//   • after 3 fails in a level → Assisted mode (letter anchor under FIRST note)
//
// No alpha note-name labels are painted under notes during practice (no-crutch
// rule); the only exception is the Assisted first-note anchor.

import { LEVELS, levelAt, generateExercise } from './exerciseGenerator.js';
import { createStaffView } from './staffView.js';
import { EventBridge } from './eventBridge.js';
import { unlockAudio } from './audioContext.js';
import { createInfoPanel } from './infoPanel.js';
import { SIGHT_READING_HTML } from './infoCopy.js';

const PASS_HOLD_MS = 1500;
const FAIL_HOLD_MS = 1500;
const ASSIST_AFTER = 3;

export default function createView(ctx) {
  const { mount, keyboard, viewport, synth, input } = ctx;
  const audioOK = Boolean(synth);

  let levelIdx = 0;
  let mode = 'idle';            // idle | active | pass | fail
  let cursor = 0;
  let exercise = { names: [], signature: '' };
  let failCount = 0;
  let assisted = false;
  let expectedTs = 0;
  let timers = [];

  const seen = new Map();        // levelIdx → string[] (recent signatures, capped)
  const RECENT_CAP = 16;         // avoid exact repeats within the last N exercises
  const bridge = new EventBridge();
  const staff = createStaffView({ compact: false });

  injectStyles();
  const ui = buildUI();

  const offInput = input ? input.subscribe(onNotePlayed) : null;

  /* ===================== exercise lifecycle ===================== */

  function recentFor(i) {
    if (!seen.has(i)) seen.set(i, []);
    return seen.get(i);
  }

  function startLevel() {
    if (!input) return;
    clearTimers();
    hideBanner();
    mode = 'active';
    cursor = 0;

    const cfg = levelAt(levelIdx);
    const recent = recentFor(levelIdx);
    exercise = generateExercise(cfg, new Set(recent));
    recent.push(exercise.signature);
    if (recent.length > RECENT_CAP) recent.shift();

    const model = staff.setSequence(exercise.names);
    viewport?.frame(model.map((m) => m.midi));

    // Assisted scaffolding: letter anchor under the very first note only.
    staff.setAnchor(assisted ? letterOf(exercise.names[0]) : null);

    arm();
    renderMeta();
    setButtons();
    ui.status.textContent = assisted
      ? 'Assisted: the first note is labelled — read the rest by interval.'
      : 'Read and play the sequence. Timing is free.';
  }

  function arm() {
    staff.clearMarks();
    staff.mark(cursor, 'current');
    expectedTs = now();
  }

  function onNotePlayed(ev) {
    if (mode !== 'active') return;
    const model = staff.model;
    const cur = model[cursor];
    if (!cur) return;

    // Event Bridge: log EVERY interaction (raw data layer, no scoring).
    bridge.record({
      midiNote: ev.midiNote,
      expectedNote: cur.midi,
      timestamp: ev.timestamp,
      expectedTimestamp: expectedTs,
    });

    if (ev.midiNote === cur.midi) {
      staff.unmark(cursor, 'current');
      staff.mark(cursor, 'correct');          // real-time green
      cursor += 1;
      if (cursor >= model.length) { pass(); return; }
      arm();
    } else {
      staff.mark(cursor, 'missed');           // real-time red
      fail();                                 // one wrong note = immediate fail
    }
  }

  function pass() {
    mode = 'pass';
    assisted = false;                          // deactivate scaffolding on success
    keyboard?.clearHighlight('target');
    showBanner('pass', `✓ Level ${levelAt(levelIdx).level} complete!`);
    const t = setTimeout(() => {
      levelIdx += 1;                           // advance the ladder
      failCount = 0;
      startLevel();
    }, PASS_HOLD_MS);
    timers.push(t);
    setButtons();
  }

  function fail() {
    mode = 'fail';
    failCount += 1;
    if (failCount >= ASSIST_AFTER) assisted = true;
    showBanner('fail', "Not quite there yet! Let's try a fresh variation…");
    const t = setTimeout(() => {
      staff.clear();                           // clear the canvas
      startLevel();                            // fresh equivalent exercise
    }, FAIL_HOLD_MS);
    timers.push(t);
    setButtons();
  }

  function stop() {
    clearTimers();
    mode = 'idle';
    hideBanner();
    keyboard?.clearHighlight('target');
    staff.clearMarks();
    ui.status.textContent = 'Ready. Press Practice to begin.';
    setButtons();
  }

  function gotoLevel(delta) {
    levelIdx = ((levelIdx + delta) % LEVELS.length + LEVELS.length) % LEVELS.length;
    failCount = 0;
    assisted = false;
    startLevel();
  }

  /* ===================== Listen (audio preview) ===================== */

  function listen() {
    if (!audioOK || staff.model.length === 0) return;
    clearTimers();
    hideBanner();
    mode = 'idle';
    unlockAudio();
    synth.allNotesOff();
    staff.clearMarks();
    const dt = 0.62;
    const t0 = synth.ctx.currentTime + 0.12;
    staff.model.forEach((m, i) => {
      synth.noteOn(m.midi, 90, t0 + i * dt);
      synth.noteOff(m.midi, t0 + i * dt + dt * 0.9);
      const ms = Math.max(0, (t0 + i * dt - synth.ctx.currentTime) * 1000);
      timers.push(setTimeout(() => {
        staff.clearMarks();
        staff.mark(i, 'current');
      }, ms));
    });
    timers.push(setTimeout(() => staff.clearMarks(), (t0 + staff.model.length * dt - synth.ctx.currentTime) * 1000 + 200));
    ui.status.textContent = 'Listening…';
  }

  /* ===================== banners + meta ===================== */

  function showBanner(kind, text) {
    ui.banner.textContent = text;
    ui.banner.className = `srx__banner is-${kind} is-shown`;
  }
  function hideBanner() { ui.banner.className = 'srx__banner'; }

  function renderMeta() {
    const cfg = levelAt(levelIdx);
    ui.level.textContent = `Level ${cfg.level} · ${cfg.name}`;
    ui.count.textContent = `${exercise.names.length} notes · ${levelIdx + 1}/${LEVELS.length}`;
    ui.assist.hidden = !assisted;
  }

  /* ===================== UI ===================== */

  function buildUI() {
    const root = el('div', { class: 'srx' });
    root.innerHTML = `<p class="vector__eyebrow">02 — Cognition</p>`;

    const staffWrap = el('div', { class: 'srx__staff' });
    const banner = el('div', { class: 'srx__banner' });
    staffWrap.append(banner, staff.el);

    const bar = el('div', { class: 'srx__bar' });
    const practiceBtn = button('● Practice', () => startLevel(), 'btn--xl');
    const stopBtn = button('◼ Stop', stop, 'btn--xl btn--ghost');
    const prevBtn = button('‹ Previous', () => gotoLevel(-1), 'btn--xl btn--ghost');
    const nextBtn = button('Next ›', () => gotoLevel(1), 'btn--xl btn--ghost');
    const listenBtn = button('♪ Listen', listen, 'btn--xl btn--ghost');
    bar.append(practiceBtn, stopBtn, prevBtn, nextBtn, listenBtn);
    if (!input) practiceBtn.disabled = true;
    if (!audioOK) listenBtn.disabled = true;

    const meta = el('div', { class: 'srx__meta' });
    const level = el('span', { class: 'srx__level' });
    const count = el('span', { class: 'srx__count' });
    const assist = el('span', { class: 'srx__assist' }); assist.textContent = 'ASSIST'; assist.hidden = true;
    meta.append(level, count, assist);
    const status = el('div', { class: 'srx__status' });

    // "ⓘ The Sight-Reading Engine" — reusable info panel (RC3).
    const info = createInfoPanel({
      label: 'ⓘ The Sight-Reading Engine',
      title: 'The Sight-Reading Engine',
      storageKey: 'sightReadingEngineDismissed',
      defaultOpen: false,
      bodyHtml: SIGHT_READING_HTML,
    });

    root.append(staffWrap, bar, meta, status, info.el);
    return { root, staffWrap, banner, practiceBtn, stopBtn, prevBtn, nextBtn, listenBtn, level, count, assist, status };
  }

  function setButtons() {
    const active = mode === 'active';
    ui.practiceBtn.disabled = !input;
    ui.stopBtn.disabled = mode === 'idle';
    ui.prevBtn.disabled = !input;
    ui.nextBtn.disabled = !input;
    ui.listenBtn.disabled = !audioOK || staff.model.length === 0;
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ===================== lifecycle ===================== */

  return {
    enter() {
      mount.replaceChildren(ui.root);
      mode = 'idle';
      if (input) { startLevel(); } else { ui.status.textContent = 'Input unavailable.'; renderMeta(); }
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

/* ===================== helpers ===================== */

function letterOf(name) { return /^[A-Ga-g]/.exec(name)?.[0].toUpperCase() ?? '?'; }
function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

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
    .srx__staff{position:relative}
    .srx__bar{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin-top:1.1rem}
    .srx__meta{display:flex;gap:.75rem;align-items:baseline;margin-top:.7rem;flex-wrap:wrap}
    .srx__level{font-family:var(--font-display);font-size:var(--step-lg);color:var(--brass-bright)}
    .srx__count{font-family:var(--font-mono);font-size:var(--step-sm);color:var(--ivory-dim)}
    .srx__assist{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.12em;
      color:var(--ebony-deep,#15110c);background:var(--brass);border-radius:4px;padding:.1rem .4rem}
    .srx__status{font-family:var(--font-mono);font-size:var(--step-sm);color:var(--ivory);margin-top:.5rem;min-height:1.2em}
    .note.is-current .note__head{box-shadow:0 0 0 2px var(--brass-bright),0 0 10px var(--brass-glow)}
    /* Pass / Fail banner overlay on the staff */
    .srx__banner{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      text-align:center;font-family:var(--font-display);font-size:var(--step-lg);font-weight:600;
      border-radius:14px;opacity:0;pointer-events:none;transition:opacity .18s ease;z-index:5;padding:1rem}
    .srx__banner.is-shown{opacity:1}
    .srx__banner.is-pass{background:color-mix(in srgb,var(--good) 22%, transparent);
      color:var(--good);box-shadow:inset 0 0 0 1px var(--good),0 0 30px -6px var(--good)}
    .srx__banner.is-fail{background:color-mix(in srgb,var(--bad) 18%, transparent);
      color:var(--bad);box-shadow:inset 0 0 0 1px var(--bad)}
  `;
  document.head.appendChild(s);
}
