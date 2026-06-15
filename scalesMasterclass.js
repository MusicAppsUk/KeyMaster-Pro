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

  const sel = { tonic: 'C', type: 'major', hand: 'RH', octaves: 1, updown: false };
  let mode = 'idle';                 // idle | listening | practice | summary
  const disposers = [];              // cleanup callbacks for the active mode

  injectStyles();
  const ui = buildUI();
  wireControls();

  /* ===================================================================== *
   * Build / refresh the fingering preview on the keyboard
   * ===================================================================== */

  // ONE ascending pass of the scale: the full set of notes, tonic→tonic.
  // 1 octave => 8 notes, 2 octaves => 15 notes. This is what the preview shows.
  function buildAscending() {
    const steps = [];
    if (sel.type === 'major') {
      const f = majorFingering(sel.tonic, sel.hand, {
        octaves: sel.octaves, startOctave: START_OCT[sel.hand],
      });
      f.notes.forEach((n) => steps.push({ midi: n.midi, finger: n.finger, degree: n.degree }));
      ui.fingerNote.textContent = f.reviewed ? '' : (f.note ?? '');
    } else {
      const scale = buildScale(parseTonic(sel.tonic), sel.type);
      for (let o = 0; o < sel.octaves; o++) {
        scale.midiAt(START_OCT[sel.hand] + o).forEach((m, i) =>
          steps.push({ midi: m, finger: null, degree: i + 1 }));
      }
      steps.push({ midi: scale.midiAt(START_OCT[sel.hand] + sel.octaves)[0], finger: null, degree: 1 });
      ui.fingerNote.textContent = 'Fingering for minor scales is pending verification — practising on notes only.';
    }
    return steps;
  }

  // The full play/practice sequence: ascending, plus the descending return
  // (without repeating the top note) only when "Up & down" is selected.
  function buildSequence() {
    const asc = buildAscending();
    return (sel.updown && asc.length > 1) ? asc.concat(asc.slice(0, -1).reverse()) : asc;
  }

  /**
   * Paint the whole scale onto the keyboard with the given highlight variant,
   * plus finger badges (majors). Used for the idle preview ('target' rings, very
   * visible) and as the dim base during Listen/Practice ('ghost').
   */
  function paintScale(variant) {
    keyboard.clearHighlight('target');
    keyboard.clearHighlight('ghost');
    keyboard.clearFingers();
    const asc = buildAscending();                 // every note, never a half-slice
    const midis = asc.map((s) => s.midi);
    keyboard.highlight(midis, variant);
    asc.forEach((s) => { if (s.finger != null) keyboard.setFinger(s.midi, s.finger); });
    viewport?.frame(midis);

    const scale = buildScale(parseTonic(sel.tonic), sel.type);
    const names = scale.degrees.map((d) => d.name).join(' ');
    ui.notesLine.textContent =
      `${displayTonic(sel.tonic)} ${typeLabel(sel.type)} · ${sel.hand} · ${asc.length} notes\n${names}`;
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
    const steps = buildSequence();
    const midis = steps.map((s) => s.midi);
    viewport?.frame(midis);

    const dt = scheduler.secondsPerBeat;
    const t0 = synth.ctx.currentTime + 0.12;
    const timers = [];
    steps.forEach((s, i) => {
      synth.noteOn(s.midi, 92, t0 + i * dt);
      synth.noteOff(s.midi, t0 + i * dt + dt * 0.92);
      const ms = Math.max(0, (t0 + i * dt - synth.ctx.currentTime) * 1000);
      timers.push(setTimeout(() => {
        keyboard.clearHighlight('target');
        keyboard.highlight([s.midi], 'target');
      }, ms));
    });
    const endMs = (t0 + steps.length * dt - synth.ctx.currentTime) * 1000;
    timers.push(setTimeout(() => { keyboard.clearHighlight('target'); mode = 'idle'; setButtons(); }, endMs));

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
    paintScale('ghost');

    const steps = buildSequence();
    const midis = steps.map((s) => s.midi);
    viewport?.frame(midis);

    const M = {
      idx: 0, correct: 0, errors: 0,
      latencies: [], deviations: [], resyncs: [],
      inError: false, errorBeatPos: 0, targetShownAt: 0,
      started: false,
    };

    scheduler.start();
    if (metronome) metronome.setEnabled(true);

    // Count-in: begin showing targets after one full bar.
    let countBeats = 0;
    const offBeat = scheduler.onBeat(() => {
      if (M.started) return;
      countBeats += 1;
      ui.status.textContent = `Count-in… ${countBeats}/${scheduler.beatsPerBar}`;
      if (countBeats >= scheduler.beatsPerBar) { M.started = true; showTarget(); }
    });

    function showTarget() {
      keyboard.clearHighlight('target');
      const step = steps[M.idx];
      keyboard.highlight([step.midi], 'target');
      M.targetShownAt = synth.ctx.currentTime;
      updateLive();
    }

    function finish() {
      mode = 'summary';
      stopAll();
      renderSummary(summarise(M, steps.length, scheduler.secondsPerBeat));
    }

    const onPress = (midi) => {
      if (mode !== 'practice' || !M.started) return;
      const pressTime = perfToContextTime(performance.now());
      const expected = steps[M.idx].midi;

      if (midi === expected) {
        M.correct += 1;
        M.latencies.push(Math.max(0, (pressTime - M.targetShownAt) * 1000));
        M.deviations.push(Math.abs(scheduler.nearestBeat(pressTime).deviation) * 1000);
        if (M.inError) {
          M.resyncs.push(scheduler.beatPositionAt(pressTime) - M.errorBeatPos);
          M.inError = false;
          keyboard.clearHighlight('root');
        }
        M.idx += 1;
        if (M.idx >= steps.length) { finish(); return; }
        showTarget();
      } else {
        M.errors += 1;
        if (!M.inError) { M.inError = true; M.errorBeatPos = scheduler.beatPositionAt(pressTime); }
        flashWrong(midi);
        updateLive();
      }
    };

    function updateLive() {
      const total = M.correct + M.errors;
      const acc = total ? Math.round((M.correct / total) * 100) : 100;
      ui.status.textContent =
        `Note ${Math.min(M.idx + 1, steps.length)}/${steps.length}  ·  ` +
        `${M.correct} correct  ·  ${M.errors} slips  ·  ${acc}% acc  ·  ${scheduler.tempo} BPM`;
    }

    const offPress = keyboard.on('press', onPress);
    disposers.push(offBeat, offPress);
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
    const handSel = select([['RH', 'Right hand'], ['LH', 'Left hand']], sel.hand);
    const octSel = select([['1', '1 octave'], ['2', '2 octaves']], String(sel.octaves));
    const updownWrap = el('label', { class: 'smc__check' });
    const updown = el('input', { type: 'checkbox' });
    updownWrap.append(updown, document.createTextNode(' Up & down'));
    bar.append(
      labeled('Key', keySel), labeled('Scale', typeSel),
      labeled('Hand', handSel), labeled('Range', octSel), updownWrap,
    );

    const notesLine = el('div', { class: 'smc__readout' });
    const fingerNote = el('p', { class: 'smc__fingernote' });

    const actions = el('div', { class: 'smc__row' });
    // Listen and Practice are self-canceling toggles: pressing one while its own
    // mode is active stops that mode. Stop stays a global override (unchanged).
    const listenBtn = button('♪ Listen', () => (mode === 'listening' ? stopToIdle() : listen()));
    const practiceBtn = button('● Practice', () => (mode === 'practice' ? stopToIdle() : practice()));
    const stopBtn = button('◼ Stop', stopToIdle, 'btn--ghost');
    actions.append(listenBtn, practiceBtn, stopBtn);

    const status = el('div', { class: 'smc__status' });
    status.textContent = audioOK ? 'Ready.' : 'Web Audio unavailable — Listen and Practice are disabled, but the fingering preview works.';
    const metrics = el('div', { class: 'smc__metrics' });
    const climb = el('div', { class: 'smc__climb' });

    root.append(bar, notesLine, fingerNote, actions, status, metrics, climb);

    return { root, keySel, typeSel, handSel, octSel, updown,
             notesLine, fingerNote, listenBtn, practiceBtn, stopBtn, status, metrics, climb };
  }

  function wireControls() {
    ui.keySel.addEventListener('change', () => { sel.tonic = ui.keySel.value; reset(); });
    ui.typeSel.addEventListener('change', () => { sel.type = ui.typeSel.value; reset(); });
    ui.handSel.addEventListener('change', () => { sel.hand = ui.handSel.value; reset(); });
    ui.octSel.addEventListener('change', () => { sel.octaves = Number(ui.octSel.value); reset(); });
    ui.updown.addEventListener('change', () => { sel.updown = ui.updown.checked; reset(); });
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
