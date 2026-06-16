// scalesMasterclass.js
//
// Scales Masterclass — the full trainer for the Scales vector.
//
// Flow:  choose key / type / hand / octaves  →  Listen (hear it, watch the
// fingering)  →  Practice (play it with the metronome while we measure the
// pedagogy metrics)  →  Summary (+ Tempo Climb on a clean run).
//
// Metrics measured during Practice:
//   • Pattern Fluency  — recognition latency: ms from a note being shown as the
//                         current target to the first correct key press.
//   • Pulse Stability  — mean |deviation| of presses from the nearest beat.
//   • Resilience Index — beats to re-sync: beats elapsed from a wrong note until
//                         the player is back on the correct note.
//   • Accuracy         — correct presses / total presses.
//   • Fluency Score    — composite of accuracy and timing tightness (0–100).
//
// Self-paced: the sequence advances when the correct next note is played, but
// timing is still scored against the live beat grid, so the metronome is real
// without forcing rigid lockstep.
//
// Loaded lazily by app.js: import('./scalesMasterclass.js'). Default-exports a
// factory: createView({ mount, store, keyboard, viewport, synth, scheduler,
// metronome }) → { enter(), exit(), destroy() }.

import { majorFingering } from './fingeringEngine.js';
import { buildScale } from './scaleEngine.js';
import { unlockAudio, perfToContextTime } from './audioContext.js';
import { createStaffView } from './staffView.js';
import { noteName } from './notes.js';
import { createInfoPanel } from './infoPanel.js';
import { WHY_B_MAJOR_HTML } from './infoCopy.js';
import { EventBridge } from './eventBridge.js';

const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#'];
const TYPES = [
  ['major', 'Major'],
  ['natural_minor', 'Natural minor'],
  ['harmonic_minor', 'Harmonic minor'],
  ['melodic_minor', 'Melodic minor'],
];
const START_OCT = { RH: 4, LH: 3 };
const CLEAN_RUN_ACCURACY = 0.9; // threshold to unlock the Tempo Climb

export default function createView(ctx) {
  const { mount, keyboard, viewport, synth, scheduler, metronome } = ctx;
  const audioOK = Boolean(synth && scheduler);

  const sel = { tonic: 'B', type: 'major', hand: 'RH', octaves: 1, updown: false };
  let mode = 'idle';                 // idle | listening | practice | summary
  let staffFingers = true;           // "Staff Fingering" toggle
  const disposers = [];              // cleanup callbacks for the active mode

  // Permanent compact staff (top tier). Shows the active scale and highlights
  // in real time alongside the keyboard.
  const staff = createStaffView({ compact: false });
  let staffMap = new Map();          // midi → staff note index
  const bridge = new EventBridge();  // raw validation/log layer (RC3)

  function markStaff(midi, state) {
    staff.clearMarks();
    const i = staffMap.get(midi);
    if (i != null) staff.mark(i, state);
  }

  // Two-way tempo binding: a single place that reflects the scheduler's tempo
  // into the slider position + numerical readout.
  function syncTempoUI(bpm) {
    if (!ui || !ui.tempo) return;
    ui.tempo.value = String(bpm);
    ui.tempoVal.textContent = `${bpm} BPM`;
  }
  function bumpTempoBy(delta) {
    if (!scheduler) return;
    scheduler.setTempo(scheduler.tempo + delta);   // clamped inside the scheduler
    syncTempoUI(scheduler.tempo);                   // immediate, even if onTempo no-ops
  }

  injectStyles();
  const ui = buildUI();
  wireControls();
  // Reflect ANY tempo change (steppers, slider, or engine logic) into the UI.
  // Persistent for the view's life (NOT a per-mode disposer).
  if (scheduler?.onTempo) scheduler.onTempo((bpm) => syncTempoUI(bpm));

  /* ===================================================================== *
   * Build / refresh the fingering preview on the keyboard
   * ===================================================================== */

  // Which hands are active, and which is the "primary" (staff treble) voice.
  function activeHands() { return sel.hand === 'Both' ? ['RH', 'LH'] : [sel.hand]; }
  function primaryHand() { return sel.hand === 'LH' ? 'LH' : 'RH'; }

  // ONE ascending pass for a given hand: tonic→tonic, with fingering (majors).
  function buildHandAsc(hand) {
    const steps = [];
    if (sel.type === 'major') {
      const f = majorFingering(sel.tonic, hand, {
        octaves: sel.octaves, startOctave: START_OCT[hand],
      });
      f.notes.forEach((n) => steps.push({ midi: n.midi, finger: n.finger, degree: n.degree }));
      if (hand === primaryHand()) ui.fingerNote.textContent = f.reviewed ? '' : (f.note ?? '');
    } else {
      const scale = buildScale(parseTonic(sel.tonic), sel.type);
      for (let o = 0; o < sel.octaves; o++) {
        scale.midiAt(START_OCT[hand] + o).forEach((m, i) =>
          steps.push({ midi: m, finger: null, degree: i + 1 }));
      }
      steps.push({ midi: scale.midiAt(START_OCT[hand] + sel.octaves)[0], finger: null, degree: 1 });
      if (hand === primaryHand()) ui.fingerNote.textContent =
        'Fingering for minor scales is pending verification — practising on notes only.';
    }
    return steps;
  }

  // Columns: one entry per beat. Each column carries every active hand's note,
  // so Both-Hands is a true grand-staff chord per step.
  function buildColumns() {
    const hands = activeHands();
    const per = {}; hands.forEach((h) => { per[h] = buildHandAsc(h); });
    const len = Math.min(...hands.map((h) => per[h].length));
    const cols = [];
    for (let i = 0; i < len; i++) cols.push(hands.map((h) => ({ hand: h, ...per[h][i] })));
    return cols;
  }

  // Ascending then descending (no repeated turn note) — used by Listen and by
  // the continuous Practice loop, which cycles this forever.
  function buildUpDownColumns(cols) {
    return cols.length > 1 ? cols.concat(cols.slice(0, -1).reverse()) : cols;
  }

  function primaryOf(col) { return col.find((c) => c.hand === primaryHand()) ?? col[0]; }
  function lowerOf(col) { return col.find((c) => c.hand !== primaryHand()) ?? null; }
  function colMidis(col) { return col.map((c) => c.midi); }

  /**
   * Paint the whole scale onto the keyboard with the given highlight variant,
   * plus finger badges (majors). Used for the idle preview ('target' rings, very
   * visible) and as the dim base during Listen/Practice ('ghost').
   */
  function paintScale(variant) {
    keyboard.clearHighlight('target');
    keyboard.clearHighlight('ghost');
    keyboard.clearFingers();
    const cols = buildColumns();
    const midis = cols.flatMap(colMidis);
    keyboard.highlight(midis, variant);
    cols.forEach((col) => col.forEach((c) => { if (c.finger != null) keyboard.setFinger(c.midi, c.finger); }));
    viewport?.frame(midis);

    const scale = buildScale(parseTonic(sel.tonic), sel.type);
    const names = scale.degrees.map((d) => d.name).join(' ');
    const handLabel = sel.hand === 'Both' ? 'Both' : sel.hand;
    ui.notesLine.textContent =
      `${displayTonic(sel.tonic)} ${typeLabel(sel.type)} · ${handLabel} · ${cols.length} notes\n${names}`;

    // Mirror onto the permanent compact staff. Both-Hands → grand-staff chords.
    const pref = scale.degrees.some((d) => d.name.includes('b')) ? 'flat' : 'sharp';
    const primaryNames = cols.map((col) => noteName(primaryOf(col).midi, { accidental: pref }));
    const primaryFingers = cols.map((col) => primaryOf(col).finger);
    let lowerNames = null, lowerFingers = null;
    if (sel.hand === 'Both') {
      lowerNames = cols.map((col) => noteName(lowerOf(col).midi, { accidental: pref }));
      lowerFingers = cols.map((col) => lowerOf(col)?.finger ?? null);
    }
    staff.setSequence(primaryNames, { lower: lowerNames, fingers: primaryFingers, lowerFingers, pan: true });
    staff.setFingersVisible(staffFingers);
    staff.setFingersFaded(false);
    staffMap = new Map();
    staff.model.forEach((m, i) => { if (!staffMap.has(m.midi)) staffMap.set(m.midi, i); });
  }

  /* ===================================================================== *
   * Listen — play the scale through the synth, sweeping the highlight
   * ===================================================================== */

  function listen() {
    if (!audioOK) return;
    stopAll();
    mode = 'listening';
    unlockAudio();
    paintScale('ghost');
    const cols = buildUpDownColumns(buildColumns());
    const midis = cols.flatMap(colMidis);
    viewport?.frame(midis);

    const dt = scheduler.secondsPerBeat;
    const t0 = synth.ctx.currentTime + 0.12;
    const timers = [];
    cols.forEach((col, i) => {
      col.forEach((c) => {
        synth.noteOn(c.midi, 90, t0 + i * dt);
        synth.noteOff(c.midi, t0 + i * dt + dt * 0.92);
      });
      const ms = Math.max(0, (t0 + i * dt - synth.ctx.currentTime) * 1000);
      timers.push(setTimeout(() => {
        keyboard.clearHighlight('target');
        keyboard.highlight(colMidis(col), 'target');
        markStaff(primaryOf(col).midi, 'current');
      }, ms));
    });
    const endMs = (t0 + cols.length * dt - synth.ctx.currentTime) * 1000;
    timers.push(setTimeout(() => { keyboard.clearHighlight('target'); staff.clearMarks(); mode = 'idle'; setButtons(); }, endMs));

    disposers.push(() => timers.forEach(clearTimeout));
    setButtons();
  }

  /* ===================================================================== *
   * Practice — metronome-driven, with live scoring
   * ===================================================================== */

  function practice() {
    if (!audioOK) return;
    stopAll();
    mode = 'practice';
    unlockAudio();

    // Build the looping up-&-down columns, then render THREE copies on the
    // scrolling staff so there is always a full copy of lookbehind + lookahead.
    const baseCols = buildUpDownColumns(buildColumns());
    const L = baseCols.length;
    const COPIES = 3;
    const repCols = [];
    for (let c = 0; c < COPIES; c++) for (let j = 0; j < L; j++) repCols.push(baseCols[j]);

    const scale = buildScale(parseTonic(sel.tonic), sel.type);
    const pref = scale.degrees.some((d) => d.name.includes('b')) ? 'flat' : 'sharp';
    const primaryNames = repCols.map((col) => noteName(primaryOf(col).midi, { accidental: pref }));
    const primaryFingers = repCols.map((col) => primaryOf(col).finger);
    let lowerNames = null, lowerFingers = null;
    if (sel.hand === 'Both') {
      lowerNames = repCols.map((col) => noteName(lowerOf(col).midi, { accidental: pref }));
      lowerFingers = repCols.map((col) => lowerOf(col)?.finger ?? null);
    }
    staff.setSequence(primaryNames, { lower: lowerNames, fingers: primaryFingers, lowerFingers, scroll: true });
    staff.setFingersVisible(staffFingers);
    staff.setFingersFaded(false);
    keyboard.clearFingers();
    repCols.slice(0, L).forEach((col) => col.forEach((c) => { if (c.finger != null) keyboard.setFinger(c.midi, c.finger); }));
    viewport?.frame(baseCols.flatMap(colMidis));

    const M = { started: false, need: new Set(), targetShownAt: 0 };
    let rIndex = L;              // start in the middle copy
    let rebaseTimer = null;
    staff.scrollToIndex(rIndex, false);

    scheduler.start();
    if (metronome) metronome.setEnabled(true);

    // Fade the staff fingering after 60s of continuous practice (force recall).
    const fadeTimer = setTimeout(() => {
      staff.setFingersFaded(true);
      ui.status.textContent = 'Fingering faded — rely on memory. Keep looping, or press Stop.';
    }, 60000);
    disposers.push(() => clearTimeout(fadeTimer));
    disposers.push(() => { if (rebaseTimer) clearTimeout(rebaseTimer); });

    // Count-in: let one full bar pass, then begin on the NEXT downbeat so the
    // first note of the first measure lands on the accented "one".
    let countBeats = 0, bars = 0;
    const offBeat = scheduler.onBeat(() => {
      if (M.started) return;
      countBeats += 1;
      ui.status.textContent = `Count-in… ${Math.min(countBeats, scheduler.beatsPerBar)}/${scheduler.beatsPerBar}`;
    });
    const offBar = scheduler.onBar(() => {
      if (M.started) return;
      bars += 1;
      if (bars >= 2) { M.started = true; showTarget(); }   // 2nd downbeat = first note
    });

    function showTarget() {
      const col = baseCols[rIndex % L];
      staff.clearMarks();
      staff.mark(rIndex, 'current');
      staff.scrollToIndex(rIndex, true);          // continuous right-to-left scroll
      keyboard.clearHighlight('target');
      keyboard.highlight(colMidis(col), 'target');
      M.need = new Set(colMidis(col));            // Both-Hands → both notes required
      M.targetShownAt = performance.now();
      updateLive();
    }

    function advance() {
      rIndex += 1;
      showTarget();
      // Seamless treadmill: once we scroll into the upper copy, after the glide
      // completes jump back one copy to an identical frame (no visible jump).
      if (rIndex >= 2 * L && !rebaseTimer) {
        rebaseTimer = setTimeout(() => {
          rebaseTimer = null;
          rIndex -= L;
          staff.clearMarks();
          staff.scrollToIndex(rIndex, false);
          staff.mark(rIndex, 'current');
        }, 460);
      }
    }

    function updateLive() {
      ui.status.textContent =
        `Looping ${displayTonic(sel.tonic)} ${typeLabel(sel.type)} · ` +
        `${sel.hand === 'Both' ? 'Both hands' : sel.hand} · ${scheduler.tempo} BPM`;
    }

    // Validate each press through the Event Bridge. A correct strike lights its
    // OWN note head green immediately (independent per hand); a column advances
    // only once every required note has been struck.
    const onPress = (midi) => {
      if (mode !== 'practice' || !M.started) return;
      const col = baseCols[rIndex % L];
      const isNeeded = M.need.has(midi);
      const expectedNote = isNeeded ? midi : primaryOf(col).midi;
      const payload = bridge.record({
        midiNote: midi,
        expectedNote,
        timestamp: performance.now(),
        expectedTimestamp: M.targetShownAt,
      });

      if (isNeeded && payload.accuracy) {
        const which = (midi === primaryOf(col).midi) ? 'primary' : 'lower';
        staff.markVoice(rIndex, which, 'correct');   // vivid green on THIS head
        M.need.delete(midi);
        keyboard.highlight([midi], 'target');
        if (M.need.size > 0) return;                 // wait for the other hand
        advance();
      } else {
        staff.markVoice(rIndex, 'primary', 'missed');
        flashWrong(midi);
      }
    };

    const offPress = keyboard.on('press', onPress);
    disposers.push(offBeat, offBar, offPress);
    ui.status.textContent = 'Count-in…';
    setButtons();
  }

  function flashWrong(midi) {
    keyboard.highlight([midi], 'root');
    setTimeout(() => keyboard.clearHighlight('root', [midi]), 220);
  }

  /* ===================================================================== *
   * Summary + Tempo Climb
   * ===================================================================== */

  function summarise(M, noteCount, secPerBeat) {
    const total = M.correct + M.errors;
    const accuracy = total ? M.correct / total : 0;
    const meanLatency = mean(M.latencies);
    const pulse = mean(M.deviations);
    const resil = M.resyncs.length ? mean(M.resyncs) : null;
    const timingFactor = clamp(1 - pulse / (0.5 * secPerBeat * 1000), 0, 1);
    const fluency = Math.round(100 * accuracy * timingFactor);
    return {
      accuracy: Math.round(accuracy * 100),
      meanLatency: Math.round(meanLatency),
      pulse: Math.round(pulse),
      resil: resil == null ? null : resil.toFixed(2),
      fluency,
      eligible: accuracy >= CLEAN_RUN_ACCURACY,
      noteCount,
    };
  }

  function renderSummary(s) {
    keyboard.clearHighlight('target');
    ui.status.textContent = `Run complete · Fluency Score ${s.fluency}/100`;
    ui.metrics.innerHTML = `
      ${tile('Pattern Fluency', s.meanLatency + ' ms', 'recognition latency')}
      ${tile('Pulse Stability', '± ' + s.pulse + ' ms', 'off the beat')}
      ${tile('Resilience', s.resil == null ? 'clean' : s.resil + ' beats', 'to re-sync')}
      ${tile('Accuracy', s.accuracy + ' %', 'notes correct')}
      ${tile('Fluency Score', s.fluency + '/100', 'overall flow')}`;
    ui.climb.innerHTML = '';
    if (s.eligible) {
      const note = document.createElement('p');
      note.className = 'smc__levelup';
      note.textContent = `Clean run! Tempo Climb unlocked — step up to ${scheduler.tempo + 5} BPM.`;
      const go = button('▲ Level up +5 BPM & retry', () => {
        scheduler.bumpTempo(5);
        practice();
      });
      ui.climb.append(note, go);
    } else {
      const note = document.createElement('p');
      note.className = 'smc__levelup smc__levelup--hold';
      note.textContent = `Aim for ${Math.round(CLEAN_RUN_ACCURACY * 100)}%+ accuracy to unlock the Tempo Climb.`;
      ui.climb.append(note);
    }
    setButtons();
  }

  /* ===================================================================== *
   * Teardown shared by every mode transition
   * ===================================================================== */

  function stopAll() {
    while (disposers.length) {
      const d = disposers.pop();
      try { d(); } catch { /* ignore */ }
    }
    if (metronome) metronome.setEnabled(false);
    scheduler?.stop();
    synth?.allNotesOff();
    keyboard.clearHighlight('target');
    keyboard.clearHighlight('root');
    staff.clearMarks();
  }

  /* ===================================================================== *
   * UI
   * ===================================================================== */

  function buildUI() {
    const root = el('div', { class: 'smc' });
    root.innerHTML = `<p class="vector__eyebrow">01 — Technique</p>`;

    const bar = el('div', { class: 'smc__bar' });
    const keySel = select(KEYS.map((k) => [k, displayTonic(k)]), sel.tonic);
    const typeSel = select(TYPES, sel.type);
    const handSel = select([['RH', 'Right hand'], ['LH', 'Left hand'], ['Both', 'Both hands']], sel.hand);
    const octSel = select([['1', '1 octave'], ['2', '2 octaves']], String(sel.octaves));
    const updownWrap = el('label', { class: 'smc__check' });
    const updown = el('input', { type: 'checkbox' });
    updownWrap.append(updown, document.createTextNode(' Up & down'));
    const fingerWrap = el('label', { class: 'smc__check' });
    const fingerToggle = el('input', { type: 'checkbox' });
    fingerToggle.checked = staffFingers;
    fingerWrap.append(fingerToggle, document.createTextNode(' Staff fingering'));
    bar.append(
      labeled('Key', keySel), labeled('Scale', typeSel),
      labeled('Hand', handSel), labeled('Range', octSel), updownWrap, fingerWrap,
    );

    const notesLine = el('div', { class: 'smc__readout' });
    const fingerNote = el('p', { class: 'smc__fingernote' });

    // TOP TIER — permanent compact staff inside the dark container.
    const stafftop = el('div', { class: 'smc__stafftop' });
    const stafflabel = el('p', { class: 'smc__stafftop-label' });
    stafflabel.textContent = 'Active scale';
    stafftop.append(stafflabel, staff.el);

    // MIDDLE TIER — oversized controls + tempo slider.
    const actions = el('div', { class: 'smc__row' });
    // Listen and Practice are self-canceling toggles: pressing one while its own
    // mode is active stops that mode. Stop stays a global override (unchanged).
    const listenBtn = button('♪ Listen', () => (mode === 'listening' ? stopToIdle() : listen()), 'btn--xl');
    const practiceBtn = button('● Practice', () => (mode === 'practice' ? stopToIdle() : practice()), 'btn--xl');
    const stopBtn = button('◼ Stop', stopToIdle, 'btn--xl btn--ghost');
    actions.append(listenBtn, practiceBtn, stopBtn);

    const tempoWrap = el('div', { class: 'smc__tempo' });
    const tempoLabel = el('span', { class: 'smc__tempolabel' }); tempoLabel.textContent = 'Tempo';
    const tempoDown = button('−5', () => bumpTempoBy(-5), 'btn--ghost smc__step');
    const tempo = el('input', { type: 'range', min: '40', max: '180', step: '1', 'aria-label': 'Tempo (BPM)' });
    tempo.value = String(scheduler?.tempo ?? 90);
    const tempoUp = button('+5', () => bumpTempoBy(+5), 'btn--ghost smc__step');
    const tempoVal = el('span', { class: 'smc__tempoval' });
    tempoVal.textContent = `${tempo.value} BPM`;
    // Dragging the slider drives the scheduler; the onTempo subscription (set up
    // after buildUI) reflects every change — from here, the steppers, OR engine
    // logic such as Tempo Climb — back into the slider position + readout.
    tempo.addEventListener('input', () => {
      try { scheduler?.setTempo(Number(tempo.value)); } catch { /* ignore */ }
      syncTempoUI(scheduler?.tempo ?? Number(tempo.value));
    });
    tempoWrap.append(tempoLabel, tempoDown, tempo, tempoUp, tempoVal);

    const status = el('div', { class: 'smc__status' });
    status.textContent = audioOK ? 'Ready.' : 'Web Audio unavailable — Listen and Practice are disabled, but the fingering preview works.';
    const metrics = el('div', { class: 'smc__metrics' });
    const climb = el('div', { class: 'smc__climb' });

    // "Why B Major?" — relocated from the dashboard to this page (RC3).
    const why = createInfoPanel({
      label: 'ⓘ Why B Major?',
      title: 'Why B Major?',
      storageKey: 'whyBMajorDismissed',
      defaultOpen: false,
      bodyHtml: WHY_B_MAJOR_HTML,
    });

    root.append(stafftop, bar, notesLine, fingerNote, actions, tempoWrap, status, metrics, climb, why.el);

    return { root, keySel, typeSel, handSel, octSel, updown, fingerToggle,
             notesLine, fingerNote, listenBtn, practiceBtn, stopBtn, tempo, tempoVal, status, metrics, climb };
  }

  function wireControls() {
    ui.keySel.addEventListener('change', () => { sel.tonic = ui.keySel.value; reset(); });
    ui.typeSel.addEventListener('change', () => { sel.type = ui.typeSel.value; reset(); });
    ui.handSel.addEventListener('change', () => { sel.hand = ui.handSel.value; reset(); });
    ui.octSel.addEventListener('change', () => { sel.octaves = Number(ui.octSel.value); reset(); });
    ui.updown.addEventListener('change', () => { sel.updown = ui.updown.checked; reset(); });
    ui.fingerToggle.addEventListener('change', () => {
      staffFingers = ui.fingerToggle.checked;
      staff.setFingersVisible(staffFingers);
    });
    if (!audioOK) { ui.listenBtn.disabled = true; ui.practiceBtn.disabled = true; }
  }

  function reset() {
    stopAll();
    mode = 'idle';
    ui.metrics.innerHTML = '';
    ui.climb.innerHTML = '';
    ui.status.textContent = audioOK ? 'Ready.' : ui.status.textContent;
    paintScale('target');
    setButtons();
  }

  /**
   * Return to the idle/preview state. This is exactly what the global Stop
   * button has always done; Listen/Practice reuse it to cancel themselves.
   */
  function stopToIdle() {
    stopAll();
    mode = 'idle';
    ui.status.textContent = 'Ready.';
    paintScale('target');
    setButtons();
  }

  function setButtons() {
    if (!audioOK) return;
    const listening = mode === 'listening';
    const practicing = mode === 'practice';
    // Each toggle stays enabled while ITS mode is active (so a second press
    // cancels it); it's only disabled while the OTHER mode is running.
    ui.listenBtn.disabled = practicing;
    ui.practiceBtn.disabled = listening;
    ui.listenBtn.classList.toggle('is-on', listening);
    ui.practiceBtn.classList.toggle('is-on', practicing);
    ui.listenBtn.textContent = listening ? '◼ Stop listening' : '♪ Listen';
    ui.practiceBtn.textContent = practicing ? '◼ Stop practice' : '● Practice';
    ui.stopBtn.disabled = !(listening || practicing);
  }

  /* ===================================================================== *
   * Lifecycle
   * ===================================================================== */

  return {
    enter() {
      mount.replaceChildren(ui.root);
      syncControls();
      reset();
    },
    exit() { stopAll(); mode = 'idle'; keyboard.clearHighlight('ghost'); keyboard.clearFingers(); },
    destroy() { stopAll(); },
  };

  function syncControls() {
    ui.keySel.value = sel.tonic; ui.typeSel.value = sel.type;
    ui.handSel.value = sel.hand; ui.octSel.value = String(sel.octaves);
    ui.updown.checked = sel.updown;
  }
}

/* ========================= helpers ========================= */

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function parseTonic(name) {
  const letter = name[0].toUpperCase();
  const acc = name.slice(1);
  const accidental = acc === '#' ? 1 : acc === 'b' ? -1 : acc === 'x' ? 2 : acc === 'bb' ? -2 : 0;
  return { letter, accidental };
}
function displayTonic(name) { return name.replace('b', '♭').replace('#', '♯'); }
function typeLabel(t) { return (TYPES.find((x) => x[0] === t) || [t, t])[1]; }

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
function select(options, value) {
  const s = el('select', { class: 'smc__select' });
  for (const [val, label] of options) {
    const o = el('option'); o.value = val; o.textContent = label;
    if (val === value) o.selected = true;
    s.appendChild(o);
  }
  return s;
}
function labeled(label, control) {
  const wrap = el('label', { class: 'smc__field' });
  const span = el('span', { class: 'smc__fieldlabel' }); span.textContent = label;
  wrap.append(span, control);
  return wrap;
}
function tile(label, value, sub) {
  return `<div class="tile"><span class="tile__label">${label}</span>` +
         `<span class="tile__value">${value}</span><span class="tile__sub">${sub}</span></div>`;
}

function injectStyles() {
  if (document.getElementById('smc-styles')) return;
  const s = document.createElement('style');
  s.id = 'smc-styles';
  s.textContent = `
    .smc__bar{display:flex;flex-wrap:wrap;gap:.75rem;align-items:flex-end;margin:.25rem 0 1rem}
    .smc__field{display:flex;flex-direction:column;gap:.25rem}
    .smc__fieldlabel{font-family:var(--font-mono);font-size:var(--step-xs);
      letter-spacing:.08em;text-transform:uppercase;color:var(--ivory-faint)}
    .smc__select{background:var(--ebony-sink);color:var(--ivory);
      border:1px solid var(--ebony-edge);border-radius:var(--radius-sm);
      padding:6px 8px;font-family:var(--font-ui);font-size:var(--step-sm)}
    .smc__check{display:flex;align-items:center;gap:.4rem;color:var(--ivory-dim);
      font-size:var(--step-sm);align-self:center}
    .smc__row{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0}
    .smc__readout{font-family:var(--font-mono);font-size:var(--step-sm);
      color:var(--ivory-dim);background:var(--ebony-sink);border:1px solid var(--ebony-edge);
      border-radius:var(--radius-sm);padding:.6rem .75rem;white-space:pre-wrap}
    .smc__fingernote{color:var(--brass-bright);font-size:var(--step-xs);
      font-family:var(--font-mono);margin:.4rem 0 0;min-height:1em}
    .smc__status{font-family:var(--font-mono);font-size:var(--step-sm);
      color:var(--ivory);margin:.5rem 0}
    .smc__metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
      gap:.6rem;margin-top:.25rem}
    .tile{display:flex;flex-direction:column;gap:.15rem;padding:.7rem .8rem;
      background:linear-gradient(160deg,var(--ebony-raise),var(--ebony-sink));
      border:1px solid var(--ebony-edge);border-radius:var(--radius-md)}
    .tile__label{font-family:var(--font-mono);font-size:var(--step-xs);
      letter-spacing:.06em;text-transform:uppercase;color:var(--ivory-faint)}
    .tile__value{font-family:var(--font-display);font-size:var(--step-lg);color:var(--brass-bright)}
    .tile__sub{font-size:var(--step-xs);color:var(--ivory-dim)}
    .smc__climb{margin-top:1rem;display:flex;flex-direction:column;gap:.6rem;align-items:flex-start}
    .smc__levelup{color:var(--good);font-family:var(--font-mono);font-size:var(--step-sm);margin:0}
    .smc__levelup--hold{color:var(--warn)}
  `;
  document.head.appendChild(s);
}
