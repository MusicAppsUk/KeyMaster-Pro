// stage3Flow.js
//
// STAGE 3 — COGNITIVE SIGHT-READING CONTINUOUS FLOW ENGINE.
//
// A continuous PERFORMANCE STREAM, not an exercise loop. It deliberately shares
// NONE of Stage 1's recognition logic (input-gated advance, fail-on-wrong) or
// Stage 2's phrase logic. It reuses only shared infrastructure: the staff
// renderer, the centralized feedback controller (for the universal green/red
// flash), and the Event Bridge (for the raw correctness log).
//
// Defining properties:
//   • TIME-DRIVEN, not input-driven — a clock (rAF) moves the cursor at a fixed
//     notes/second. The cursor NEVER stops, never resets, never waits for input.
//   • Errors do not interrupt flow — wrong = red flash + log + continue;
//     correct = green flash + continue.
//   • Evaluation happens ONLY at end of session (fixed note count). The live
//     layer just logs to the Event Bridge.
//   • Optional "Disappearing Notes" mode — notes vanish once the cursor passes.
//
// Post-session metrics (descriptive analytics, NOT the deterministic Stage 1/2
// gate; Stage 3 unlocks nothing further):
//   • Accuracy over stream  = hits / notes passed
//   • Continuity Index      = longest unbroken run of hits / notes passed
//   • Recovery Time         = mean time from an error to the next hit (ms)

import { generateExercise, whiteKeyPool } from './exerciseGenerator.js';
import { createStaffView } from './staffView.js';
import { EventBridge } from './eventBridge.js';

const SPEEDS = { Slow: 0.9, Medium: 1.4, Fast: 2.0 };   // notes per second
const SESSION_NOTES = 48;                               // fixed-count session
const STREAM_CFG = { name: 'stage3-stream', pool: whiteKeyPool('C3', 'C5'), maxStep: 3, maxDirChanges: 8, length: SESSION_NOTES };

export function createStage3Flow(ctx) {
  const { keyboard, viewport, evaluator, synth } = ctx;
  injectStyles();

  const staff = createStaffView({ compact: false });
  const bridge = new EventBridge();

  let stream = [];            // note names
  let log = [];               // per-note { idx, midi, status:'hit'|'wrong'|'miss', tNoteMs, tInputMs }
  let active = -1;            // index currently at the cursor
  let activeShownAt = 0;
  let rafId = null;
  let startMs = 0;
  let running = false;
  let notesPerSec = SPEEDS.Medium;
  let disappearing = false;
  let offEval = null;

  const ui = buildUI();

  /* ----------------------------- session control ----------------------------- */

  function start() {
    stop(true);                       // clear any prior run silently
    stream = generateExercise(STREAM_CFG, new Set()).names;
    const model = staff.setSequence(stream, { scroll: true });
    viewport?.frame(model.map((m) => m.midi));
    log = model.map((m, i) => ({ idx: i, midi: m.midi, status: 'pending', tNoteMs: (i / notesPerSec) * 1000, tInputMs: null }));
    active = -1;
    evaluator?.attachStaff(staff);
    offEval = evaluator ? evaluator.on(onResult) : null;
    hideMetrics();
    running = true;
    startMs = performance.now();
    ui.status.textContent = 'Reading… keep flowing. Don\u2019t stop for mistakes.';
    setButtons();
    rafId = requestAnimationFrame(tick);
  }

  // The clock. Cursor position is a continuous function of elapsed time; nothing
  // here ever depends on whether the player hit the note.
  function tick() {
    if (!running) return;
    const elapsed = (performance.now() - startMs) / 1000;
    const frac = elapsed * notesPerSec;
    if (frac >= stream.length) { finish(); return; }

    staff.scrollToIndex(frac, false);             // smooth, transition-free scroll
    const nearest = Math.round(frac);
    if (nearest !== active && nearest < stream.length) {
      finalize(active);                            // close out the note we just left
      active = nearest;
      staff.clearMarks();
      staff.mark(active, 'current');
      activeShownAt = performance.now();
      evaluator?.setExpected([{ midi: log[active].midi, staffIndex: active, voice: 'primary' }]);
    }
    rafId = requestAnimationFrame(tick);
  }

  // A note leaving the cursor that was never hit is a miss. Disappearing mode
  // hides notes once passed.
  function finalize(i) {
    if (i < 0 || i >= log.length) return;
    if (log[i].status === 'pending') log[i].status = 'miss';
    if (disappearing && staff.model[i]) staff.model[i].el.style.transition = 'opacity .25s ease';
    if (disappearing && staff.model[i]) staff.model[i].el.style.opacity = '0';
  }

  // Live layer: log every interaction; NEVER alter the clock. The controller has
  // already painted the green/red flash; we only record.
  function onResult(payload) {
    if (!running || active < 0) return;
    if (payload.state === 'complete') return;
    const entry = log[active];
    bridge.record({
      midiNote: payload.midiNote,
      expectedNote: entry.midi,
      timestamp: payload.timestamp,
      expectedTimestamp: activeShownAt,
    });
    if (payload.state === 'match' && entry.status === 'pending') {
      entry.status = 'hit';
      entry.tInputMs = payload.timestamp;
    } else if (payload.state === 'mismatch' && entry.status === 'pending') {
      entry.status = 'wrong';
      entry.tInputMs = payload.timestamp;
    }
  }

  function finish() {
    finalize(active);
    running = false;
    cancelRaf();
    evaluator?.clearExpected();
    staff.clearMarks();
    showMetrics(computeMetrics());
    ui.status.textContent = 'Session complete.';
    setButtons();
  }

  function stop(silent = false) {
    cancelRaf();
    running = false;
    offEval?.(); offEval = null;
    evaluator?.clearExpected();
    evaluator?.reset();
    if (!silent) {
      staff.clearMarks();
      ui.status.textContent = 'Stopped.';
      setButtons();
    }
  }

  function cancelRaf() { if (rafId) cancelAnimationFrame(rafId); rafId = null; }

  /* --------------------------------- metrics --------------------------------- */
  // Post-session ONLY. Deterministic descriptive analytics over the logged stream.

  function computeMetrics() {
    const passed = log.filter((e) => e.status !== 'pending');
    const n = passed.length || 1;
    const hits = passed.filter((e) => e.status === 'hit').length;

    // Continuity Index — longest unbroken run of hits, as a fraction of stream.
    let run = 0, best = 0;
    for (const e of passed) { run = e.status === 'hit' ? run + 1 : 0; if (run > best) best = run; }

    // Recovery Time — mean ms from each error to the next hit (by note schedule).
    const recoveries = [];
    for (let i = 0; i < passed.length; i++) {
      if (passed[i].status === 'hit') continue;
      const next = passed.slice(i + 1).find((e) => e.status === 'hit');
      if (next) recoveries.push(next.tNoteMs - passed[i].tNoteMs);
    }
    const recoveryMs = recoveries.length ? Math.round(recoveries.reduce((a, b) => a + b, 0) / recoveries.length) : null;

    return {
      notes: passed.length,
      accuracy: hits / n,
      continuity: best / n,
      recoveryMs,
    };
  }

  /* ----------------------------------- UI ------------------------------------ */

  function buildUI() {
    const root = document.createElement('div');
    root.className = 's3';
    root.innerHTML = `<p class="vector__eyebrow">Stage 3 — Cognitive Sight-Reading</p>
      <p class="s3__sub">A continuous moving stream. Read ahead, keep flowing, recover without stopping. Evaluated only at the end.</p>`;

    const staffWrap = document.createElement('div');
    staffWrap.className = 's3__staff';
    staffWrap.appendChild(staff.el);

    const bar = document.createElement('div');
    bar.className = 's3__bar';
    const startBtn = btn('● Start session', () => start(), 'btn--xl');
    const stopBtn = btn('◼ Stop', () => stop(), 'btn--xl btn--ghost');
    bar.append(startBtn, stopBtn);

    // speed + disappearing controls
    const opts = document.createElement('div');
    opts.className = 's3__opts';
    const speedSel = document.createElement('select');
    speedSel.className = 's3__speed';
    for (const k of Object.keys(SPEEDS)) {
      const o = document.createElement('option'); o.value = k; o.textContent = k; if (k === 'Medium') o.selected = true; speedSel.appendChild(o);
    }
    speedSel.addEventListener('change', () => { notesPerSec = SPEEDS[speedSel.value] || SPEEDS.Medium; });
    const speedLabel = document.createElement('label'); speedLabel.className = 's3__optlabel'; speedLabel.textContent = 'Speed'; speedLabel.appendChild(speedSel);

    const disWrap = document.createElement('label'); disWrap.className = 's3__optlabel s3__check';
    const disBox = document.createElement('input'); disBox.type = 'checkbox';
    disBox.addEventListener('change', () => { disappearing = disBox.checked; });
    disWrap.append(disBox, document.createTextNode(' Disappearing notes'));
    opts.append(speedLabel, disWrap);

    const status = document.createElement('div');
    status.className = 's3__status';
    status.textContent = 'Press Start to begin a continuous session.';

    const metrics = document.createElement('div');
    metrics.className = 's3__metrics';
    metrics.hidden = true;

    root.append(staffWrap, bar, opts, status, metrics);
    return { root, startBtn, stopBtn, status, metrics };
  }

  function setButtons() {
    ui.startBtn.disabled = running;
    ui.stopBtn.disabled = !running;
  }

  function showMetrics(m) {
    ui.metrics.hidden = false;
    const pct = (x) => `${Math.round(x * 100)}%`;
    ui.metrics.innerHTML = `
      <h3 class="s3__mtitle">Session results</h3>
      <div class="s3__mgrid">
        <div class="s3__metric"><span class="s3__mval">${pct(m.accuracy)}</span><span class="s3__mkey">Accuracy over stream</span></div>
        <div class="s3__metric"><span class="s3__mval">${pct(m.continuity)}</span><span class="s3__mkey">Continuity Index</span></div>
        <div class="s3__metric"><span class="s3__mval">${m.recoveryMs == null ? '—' : m.recoveryMs + ' ms'}</span><span class="s3__mkey">Avg recovery time</span></div>
        <div class="s3__metric"><span class="s3__mval">${m.notes}</span><span class="s3__mkey">Notes in stream</span></div>
      </div>`;
  }
  function hideMetrics() { ui.metrics.hidden = true; ui.metrics.innerHTML = ''; }

  return {
    el: ui.root,
    start,
    stop,
    destroy() { stop(true); evaluator?.detachStaff(); },
  };
}

function btn(label, onClick, variant = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn ${variant}`.trim();
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function injectStyles() {
  if (document.getElementById('s3-styles')) return;
  const s = document.createElement('style');
  s.id = 's3-styles';
  s.textContent = `
    .s3{display:flex;flex-direction:column;gap:.5rem}
    .s3__sub{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory-dim);max-width:60ch;margin:.1rem 0 .5rem}
    .s3__staff{position:relative}
    .s3__bar{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin-top:1rem}
    .s3__opts{display:flex;flex-wrap:wrap;gap:1.2rem;align-items:center;margin-top:.7rem}
    .s3__optlabel{font-family:var(--font-mono);font-size:var(--step-sm);color:var(--ivory-dim);display:flex;align-items:center;gap:.4rem}
    .s3__speed{font-family:var(--font-mono);background:var(--ebony-raise,#1f1d27);color:var(--ivory);border:1px solid var(--ebony-edge,#2a2833);border-radius:8px;padding:.3rem .5rem}
    .s3__check{cursor:pointer}
    .s3__status{font-family:var(--font-mono);font-size:var(--step-sm);color:var(--ivory);margin-top:.6rem;min-height:1.2em}
    .s3__metrics{margin-top:1rem;padding:1.1rem;border-radius:14px;background:linear-gradient(165deg,var(--ebony-raise,#1f1d27),#18161f);border:1px solid var(--ebony-edge,#2a2833)}
    .s3__mtitle{font-family:var(--font-display);font-size:var(--step-lg);color:var(--ivory);margin:0 0 .6rem}
    .s3__mgrid{display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
    .s3__metric{display:flex;flex-direction:column;gap:.15rem}
    .s3__mval{font-family:var(--font-display);font-size:var(--step-xl,1.6rem);color:var(--brass-bright)}
    .s3__mkey{font-family:var(--font-mono);font-size:var(--step-xs);color:var(--ivory-dim)}
  `;
  document.head.appendChild(s);
}
