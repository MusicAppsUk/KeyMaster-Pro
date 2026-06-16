// sightReading.js
//
// READING ENGINE — 3-Stage progression shell (RC4).
//
// The module presents three reading STAGES (modes), each backed by lessons drawn
// from the scalable Lesson Matrix (see lessonMatrix.js). The current working
// engine is reclassified as:
//
//   Stage 1 — Recognition Mode   (static identification, free timing)  [LIVE]
//   Stage 2 — Guided Reading      (short sequences, gentle pulse)       [preview]
//   Stage 3 — Cognitive Sight-Reading (scrolling timeline, recovery)    [preview]
//
// Navigation: Stages → Lessons → Play. Stage 1 lessons run the live engine on the
// lesson's generator config; Stage 2/3 lessons show a placeholder describing the
// mode that is coming. The lesson menus loop the matrix dynamically, so extending
// the curriculum in lessonMatrix.js automatically grows these menus.
//
// Standard Middle-C notation domain only; the engine scores the raw normalized
// MIDI stream from the NoteInput hub. It never transposes and never consults the
// B-Major motor system — the two communicate purely through performance events.

import { generateExercise, whiteKeyPool } from './exerciseGenerator.js';
import { lessonsForStage, tiersForStage, TOTAL_LESSONS } from './lessonMatrix.js';
import { createStaffView } from './staffView.js';
import { EventBridge } from './eventBridge.js';
import { unlockAudio } from './audioContext.js';
import { createInfoPanel } from './infoPanel.js';
import { SIGHT_READING_HTML } from './infoCopy.js';
import { toMidi } from './notes.js';
import { createProgressionGate } from './progressionGate.js';
import { createStage3Flow } from './stage3Flow.js';

const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

const PASS_HOLD_MS = 1500;
const FAIL_HOLD_MS = 1500;
const ASSIST_AFTER = 3;
const RECENT_CAP = 16;

const STAGES = [
  { n: 1, title: 'Recognition Mode',       eyebrow: 'Stage 1',
    tagline: 'Static single-note identification. No timing pressure.', ready: true },
  { n: 2, title: 'Guided Reading',          eyebrow: 'Stage 2',
    tagline: 'Short note sequences carried by a gentle pulse.',        ready: false },
  { n: 3, title: 'Cognitive Sight-Reading', eyebrow: 'Stage 3',
    tagline: 'A continuous scrolling timeline — recovery-focused.',    ready: true },
];

export default function createView(ctx) {
  const { mount, keyboard, viewport, synth, input, evaluator } = ctx;
  const audioOK = Boolean(synth);

  // ---- shell state ----
  let screen = 'stages';        // stages | lessons | play
  let activeStage = 1;
  let playlist = [];            // lessons for the active stage
  let lessonIdx = 0;

  // ---- engine state ----
  let mode = 'idle';            // idle | active | listening | pass | fail
  let cursor = 0;
  let exercise = { names: [], signature: '' };
  let failCount = 0;
  let assisted = false;
  let expectedTs = 0;
  let timers = [];
  let playToken = 0;            // playback session token — bumped on every stop so
                               // a queued Listen callback becomes a no-op (no stacking)
  const seen = new Map();        // lesson id → recent signatures (capped)

  const bridge = new EventBridge();
  const staff = createStaffView({ compact: false });
  const gate = createProgressionGate();
  let stage3 = null;   // lazily created continuous-flow engine (Stage 3)

  // Stage 1 → 2 assessment accumulator (deterministic 20-note block).
  // Stage 1 → 2 assessment: ONE atomic, continuous 20-note exercise instance
  // (no cross-exercise accumulation). A grand-staff natural span exercises both
  // treble and bass recognition. Evaluated as a single coherent performance unit.
  const ASSESSMENT_CFG = {
    name: 'Stage 1 Unlock Assessment',
    pool: whiteKeyPool('C3', 'C5'),
    maxStep: 3,
    maxDirChanges: 4,
    length: gate.THRESHOLDS.stage1.block,   // 20
  };
  let assessing = false;            // true while the atomic assessment is running
  let assess = newBlock();
  function newBlock() { return { targets: 0, correct: 0, latencySumMs: 0, latencyCount: 0 }; }

  injectStyles();
  const root = el('div', { class: 'srx' });
  const playUI = buildPlayUI();   // built once, mounted on the play screen

  // Consume the centralized controller's broadcasts; this module no longer
  // evaluates correctness or colours notes itself.
  const offEval = evaluator ? evaluator.on(onResult) : null;

  /* ======================= screen routing ======================= */

  function go(next) { screen = next; render(); }

  function render() {
    if (screen === 'stages') return renderStages();
    if (screen === 'lessons') return renderLessons();
    if (screen === 'play') return renderPlay();
    if (screen === 'stage3') return renderStage3();
  }

  function renderStages() {
    stopEngine();
    evaluator?.detachStaff();
    stage3?.stop(true);
    assessing = false;
    const wrap = el('div', { class: 'srx__screen' });
    wrap.innerHTML = `
      <p class="vector__eyebrow">02 — Cognition</p>
      <h2 class="srx__h">Reading Stages</h2>
      <p class="srx__sub">A three-stage path from note recognition to fluent, self-correcting sight-reading. ${TOTAL_LESSONS} lessons across the full matrix.</p>`;
    const grid = el('div', { class: 'srx__stages' });
    for (const s of STAGES) {
      const count = lessonsForStage(s.n).length;
      const locked = !gate.isUnlocked(s.n);
      const card = el('button', {
        class: `srx__stage ${s.ready ? '' : 'is-preview'} ${locked ? 'is-locked' : ''}`.replace(/\s+/g, ' ').trim(),
        type: 'button',
      });
      const eyebrow = locked ? `${s.eyebrow} · locked` : s.ready ? s.eyebrow : `${s.eyebrow} · preview`;
      card.innerHTML = `
        <span class="srx__stage-eyebrow">${locked ? '🔒 ' : ''}${eyebrow}</span>
        <span class="srx__stage-title">${s.title}</span>
        <span class="srx__stage-tag">${s.tagline}</span>
        <span class="srx__stage-meta">${count} lessons</span>`;
      if (locked) card.setAttribute('aria-disabled', 'true');
      card.addEventListener('click', () => {
        if (locked) return renderLockedStage(s);
        if (s.n === 3) return openStage3();   // continuous flow, not a lesson menu
        openStage(s.n);
      });
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
    root.replaceChildren(wrap);
  }

  // Locked stages show their explicit unlock requirement (no probabilistic copy).
  function renderLockedStage(s) {
    const dialog = el('div', { class: 'srx__placeholder' });
    dialog.innerHTML = `
      <p class="vector__eyebrow">${s.eyebrow} — Locked</p>
      <h2 class="srx__h">🔒 ${s.title}</h2>
      <p class="srx__sub"><strong>To unlock:</strong> ${gate.requirementText(s.n)}</p>`;
    const back = button('‹ Back to stages', () => go('stages'), 'btn--xl btn--ghost');
    dialog.appendChild(back);
    root.replaceChildren(dialog);
  }

  function openStage(n) {
    activeStage = n;
    playlist = lessonsForStage(n);
    lessonIdx = 0;
    assessing = false;
    go('lessons');
  }

  // Stage 3 — continuous flow. Self-contained engine; shares only the keyboard,
  // viewport, evaluator and Event Bridge. Does NOT touch Stage 1/2 logic.
  function openStage3() {
    activeStage = 3;
    assessing = false;
    go('stage3');
  }

  function renderStage3() {
    stopEngine();
    evaluator?.detachStaff();
    if (!stage3) stage3 = createStage3Flow({ keyboard, viewport, evaluator, synth });
    const head = el('div', { class: 'srx__head' });
    const back = button('‹ Stages', () => { stage3?.stop(true); evaluator?.detachStaff(); go('stages'); }, 'btn--ghost srx__back');
    head.append(back, el('div'));
    root.replaceChildren(head, stage3.el);
  }

  function renderLessons() {
    stopEngine();
    evaluator?.detachStaff();
    stage3?.stop(true);
    assessing = false;
    const stage = STAGES.find((s) => s.n === activeStage);
    const wrap = el('div', { class: 'srx__screen' });

    const head = el('div', { class: 'srx__head' });
    const back = button('‹ Stages', () => go('stages'), 'btn--ghost srx__back');
    const h = el('div');
    h.innerHTML = `<p class="vector__eyebrow">${stage.eyebrow} — ${stage.title}</p>
      <h2 class="srx__h">${stage.title} — Lessons</h2>`;
    head.append(back, h);
    wrap.appendChild(head);

    if (!stage.ready) {
      const note = el('div', { class: 'srx__previewbar' });
      note.textContent = `Preview — ${stage.title} playback is coming soon. The lesson path below is live and will run in this mode once released.`;
      wrap.appendChild(note);
    }

    // Stage 1 unlock assessment — the single, atomic gate to Stage 2.
    if (activeStage === 1) {
      const unlocked = gate.isUnlocked(2);
      const cta = button(
        unlocked
          ? '✓ Stage 2 unlocked — retake assessment'
          : `● Take the Stage 2 Unlock Assessment (${gate.THRESHOLDS.stage1.block} notes)`,
        openAssessment,
        'btn--xl srx__assessbtn',
      );
      if (!input) cta.disabled = true;
      wrap.appendChild(cta);
    }

    for (const group of tiersForStage(activeStage)) {
      const sec = el('section', { class: 'srx__tier' });
      sec.innerHTML = `<h3 class="srx__tier-title"><span>Tier ${group.tier}</span> ${group.title}</h3>`;
      const list = el('div', { class: 'srx__lessons' });
      for (const lesson of group.lessons) {
        const idx = playlist.findIndex((l) => l.id === lesson.id);
        const b = el('button', { class: 'srx__lesson', type: 'button' });
        b.innerHTML = `
          <span class="srx__lesson-id">${lesson.id}</span>
          <span class="srx__lesson-title">${lesson.title}</span>
          <span class="srx__lesson-tags">${clefTag(lesson.clef)} · ${accTag(lesson.accidentals)}</span>
          <span class="srx__lesson-gov">${lesson.governance}</span>`;
        b.addEventListener('click', () => (stage.ready ? openLesson(idx) : previewLesson(lesson)));
        list.appendChild(b);
      }
      sec.appendChild(list);
      wrap.appendChild(sec);
    }
    root.replaceChildren(wrap);
  }

  function previewLesson(lesson) {
    const stage = STAGES.find((s) => s.n === activeStage);
    const dialog = el('div', { class: 'srx__placeholder' });
    dialog.innerHTML = `
      <p class="vector__eyebrow">${stage.eyebrow} — ${stage.title}</p>
      <h2 class="srx__h">Lesson ${lesson.id} · ${lesson.title}</h2>
      <p class="srx__sub">${stage.tagline}</p>
      <p class="srx__sub">This mode is in development. When released, this lesson will run with: <strong>${clefTag(lesson.clef)}</strong> clef focus, a <strong>${lesson.range.low}–${lesson.range.high}</strong> span, and <strong>${accTag(lesson.accidentals)}</strong>.</p>`;
    const back = button('‹ Back to lessons', () => go('lessons'), 'btn--xl btn--ghost');
    dialog.appendChild(back);
    root.replaceChildren(dialog);
  }

  function openLesson(idx) {
    lessonIdx = Math.max(0, Math.min(idx, playlist.length - 1));
    go('play');
  }

  function renderPlay() {
    const head = el('div', { class: 'srx__head' });
    const back = button('‹ Lessons', () => go('lessons'), 'btn--ghost srx__back');
    const h = el('div');
    h.innerHTML = `<p class="vector__eyebrow">${assessing ? 'Stage 1 — Unlock Assessment' : 'Stage 1 — Recognition Mode'}</p>`;
    head.append(back, h);
    root.replaceChildren(head, playUI.root);
    evaluator?.attachStaff(staff);
    if (assessing) startAssessment(); else startLesson();
  }

  /* ===================== exercise lifecycle ===================== */

  function activeLesson() { return playlist[lessonIdx]; }
  function recentFor(id) { if (!seen.has(id)) seen.set(id, []); return seen.get(id); }

  function startLesson() {
    if (!input || !activeLesson()) return;
    clearTimers();
    hideBanner();
    mode = 'active';
    cursor = 0;

    const lesson = activeLesson();
    const recent = recentFor(lesson.id);
    exercise = generateExercise(lesson.cfg, new Set(recent));
    recent.push(exercise.signature);
    if (recent.length > RECENT_CAP) recent.shift();

    // Hand assignment + register logic (labels rendered on-staff).
    const hm = handModel(exercise.names, lesson.clef);
    const model = staff.setSequence(exercise.names, { fingers: hm.labels });
    viewport?.frame(model.map((m) => m.midi));
    staff.setAnchor(assisted ? letterOf(exercise.names[0]) : null);
    playUI.hint.textContent = handHint(exercise.names, lesson.clef, hm);

    staff.clearMarks();
    armCurrent();
    renderMeta();
    setButtons();
    playUI.status.textContent = assisted
      ? 'Assisted: the first note is labelled — read the rest by interval.'
      : 'Read and play the sequence. Timing is free.';
  }

  // Set the current target (brass cursor is a non-correctness HINT) and arm the
  // controller with the expected note. Correctness colour is the controller's.
  function armCurrent() {
    const m = staff.model[cursor];
    if (!m) return;
    staff.mark(cursor, 'current');
    expectedTs = nowMs();
    evaluator?.setExpected([{ midi: m.midi, staffIndex: cursor, voice: 'primary' }]);
  }

  // The controller already evaluated + painted; here we only advance lesson
  // state and log the raw interaction to the bridge.
  function onResult(payload) {
    if (screen !== 'play' || mode !== 'active') return;
    if (payload.state === 'complete') return;   // single-note steps resolve on 'match'

    // Canonical Event Bridge record — the ONLY data the gate is permitted to
    // use (its accuracy + deltaMs, not any parallel/inferred measurement).
    const rec = bridge.record({
      midiNote: payload.midiNote,
      expectedNote: payload.target?.midi ?? payload.expected?.midi ?? null,
      timestamp: payload.timestamp,
      expectedTimestamp: expectedTs,
    });

    if (assessing) { onAssessResult(rec); return; }

    // Regular practice: NO progression gating happens here (gating is the
    // dedicated atomic assessment only).
    if (payload.state === 'match') {
      staff.unmark(cursor, 'current');
      cursor += 1;
      if (cursor >= staff.model.length) { pass(); return; }
      armCurrent();
    } else if (payload.state === 'mismatch') {
      fail();
    }
  }

  /* ===================== Stage 1 → 2 atomic assessment ===================== */

  function startAssessment() {
    if (!input) return;
    clearTimers();
    hideBanner();
    assessing = true;
    mode = 'active';
    cursor = 0;
    assess = newBlock();

    exercise = generateExercise(ASSESSMENT_CFG, new Set());
    const model = staff.setSequence(exercise.names);
    viewport?.frame(model.map((m) => m.midi));
    staff.setAnchor(null);
    playUI.hint.textContent = 'Unlock Assessment — one continuous 20-note sequence, no restarts.';
    armCurrent();
    playUI.level.textContent = 'Stage 1 — Unlock Assessment';
    playUI.count.textContent = `${ASSESSMENT_CFG.length}-note block · need ≥95% · ≤1200 ms`;
    playUI.assist.hidden = true;
    setButtons();
    playUI.status.textContent = `Play all ${ASSESSMENT_CFG.length} notes in sequence. Each note is graded once.`;
  }

  // One graded attempt per note, from canonical Event Bridge data; advance
  // regardless of right/wrong so the block stays a single coherent unit.
  function onAssessResult(rec) {
    assess.targets += 1;
    if (rec.accuracy) {
      assess.correct += 1;
      if (Number.isFinite(rec.deltaMs) && rec.deltaMs >= 0) {
        assess.latencySumMs += rec.deltaMs;
        assess.latencyCount += 1;
      }
    }
    staff.unmark(cursor, 'current');
    cursor += 1;
    if (cursor >= staff.model.length) { finishAssessment(); return; }
    armCurrent();
  }

  function finishAssessment() {
    mode = 'done';
    evaluator?.clearExpected();
    const verdict = gate.evaluateStage1Block(assess);    // deterministic, hard thresholds
    const acc = Math.round((assess.correct / assess.targets) * 100);
    const lat = assess.latencyCount ? Math.round(assess.latencySumMs / assess.latencyCount) : null;
    const latTxt = lat == null ? '—' : `${lat} ms`;
    if (verdict.pass) {
      showBanner('pass', '✓ Assessment passed — Stage 2 unlocked!');
      playUI.status.textContent = `Accuracy ${acc}% · avg latency ${latTxt}. Stage 2 (Guided Reading) is now unlocked in the stage menu.`;
    } else {
      showBanner('fail', 'Assessment not passed');
      playUI.status.textContent = `Accuracy ${acc}% · avg latency ${latTxt}. Need ≥ 95% and ≤ 1200 ms across all 20 notes. Press Retry.`;
    }
    setButtons();
  }

  function openAssessment() {
    assessing = true;
    go('play');
  }

  function pass() {
    mode = 'pass';
    assisted = false;
    evaluator?.clearExpected();
    keyboard?.clearHighlight('target');
    const atEnd = lessonIdx >= playlist.length - 1;
    showBanner('pass', atEnd ? '✓ Stage path complete!' : `✓ Lesson ${activeLesson().id} complete!`);
    const t = setTimeout(() => {
      failCount = 0;
      if (atEnd) { go('lessons'); return; }
      lessonIdx += 1;
      startLesson();
    }, PASS_HOLD_MS);
    timers.push(t);
    setButtons();
  }

  function fail() {
    mode = 'fail';
    failCount += 1;
    if (failCount >= ASSIST_AFTER) assisted = true;
    evaluator?.clearExpected();
    showBanner('fail', "Not quite there yet! Let's try a fresh variation…");
    const t = setTimeout(() => { staff.clear(); startLesson(); }, FAIL_HOLD_MS);
    timers.push(t);
    setButtons();
  }

  function stopEngine() {
    playToken++;                 // invalidate any queued/in-flight Listen callback
    clearTimers();
    mode = 'idle';
    hideBanner();
    evaluator?.clearExpected();
    evaluator?.reset();
    keyboard?.clearHighlight('target');
    synth?.panic();              // hard-stop all voices, incl. future-scheduled
    synth?.allNotesOff();
    staff.clearMarks();
    if (playUI) playUI.hint.textContent = '';
  }

  function gotoLesson(delta) {
    lessonIdx = Math.max(0, Math.min(lessonIdx + delta, playlist.length - 1));
    failCount = 0;
    assisted = false;
    startLesson();
  }

  /* ===================== Listen (audio preview) ===================== */

  function listen() {
    if (!audioOK || staff.model.length === 0) return;
    stopEngine();                // cancel ANY prior session first (bumps token, kills audio)
    const token = playToken;     // this session
    mode = 'listening';
    unlockAudio();
    hideBanner();
    staff.clearMarks();
    const dt = 0.62;
    // Just-in-time, token-gated scheduling — no audio is pre-loaded into the Web
    // Audio graph, so Stop (or a new Listen) cancels everything cleanly and taps
    // can never stack overlapping playback.
    staff.model.forEach((m, i) => {
      const ms = Math.max(0, i * dt * 1000);
      timers.push(setTimeout(() => {
        if (token !== playToken || mode !== 'listening') return;   // stale → silent
        const now = synth.ctx.currentTime;
        synth.noteOn(m.midi, 90, now);
        synth.noteOff(m.midi, now + dt * 0.9);
        staff.clearMarks();
        staff.mark(i, 'current');
      }, ms));
    });
    timers.push(setTimeout(() => {
      if (token !== playToken) return;
      staff.clearMarks();
      mode = 'idle';
      playUI.status.textContent = 'Ready. Press Practice to begin.';
      setButtons();
    }, staff.model.length * dt * 1000 + 200));
    playUI.status.textContent = 'Listening…';
    setButtons();
  }

  /* ===================== banners + meta ===================== */

  function showBanner(kind, text) {
    playUI.banner.textContent = text;
    playUI.banner.className = `srx__banner is-${kind} is-shown`;
  }
  function hideBanner() { playUI.banner.className = 'srx__banner'; }

  function renderMeta() {
    const lesson = activeLesson();
    playUI.level.textContent = `Lesson ${lesson.id} · ${lesson.title}`;
    playUI.count.textContent = `${exercise.names.length} notes · ${lessonIdx + 1}/${playlist.length}`;
    playUI.assist.hidden = !assisted;
  }

  /* ===================== Play UI (built once) ===================== */

  function buildPlayUI() {
    const container = el('div', { class: 'srx__play' });

    const hint = el('div', { class: 'srx__hint' });
    const staffWrap = el('div', { class: 'srx__staff' });
    const banner = el('div', { class: 'srx__banner' });
    staffWrap.append(banner, staff.el);

    const bar = el('div', { class: 'srx__bar' });
    const practiceBtn = button('● Practice', () => (assessing ? startAssessment() : startLesson()), 'btn--xl');
    const stopBtn = button('◼ Stop', () => { stopEngine(); playUI.status.textContent = 'Stopped. Press Practice to begin.'; setButtons(); }, 'btn--xl btn--ghost');
    const prevBtn = button('‹ Previous', () => gotoLesson(-1), 'btn--xl btn--ghost');
    const nextBtn = button('Next ›', () => gotoLesson(1), 'btn--xl btn--ghost');
    const listenBtn = button('♪ Listen', () => {
      if (mode === 'listening') { stopEngine(); playUI.status.textContent = 'Stopped.'; setButtons(); }
      else listen();
    }, 'btn--xl btn--ghost');
    bar.append(practiceBtn, stopBtn, prevBtn, nextBtn, listenBtn);

    const meta = el('div', { class: 'srx__meta' });
    const level = el('span', { class: 'srx__level' });
    const count = el('span', { class: 'srx__count' });
    const assist = el('span', { class: 'srx__assist' }); assist.textContent = 'ASSIST'; assist.hidden = true;
    meta.append(level, count, assist);
    const status = el('div', { class: 'srx__status' });

    const info = createInfoPanel({
      label: 'ⓘ The Recognition Engine',
      title: 'The Recognition Engine',
      storageKey: 'sightReadingEngineDismissed',
      defaultOpen: false,
      bodyHtml: SIGHT_READING_HTML,
    });

    container.append(hint, staffWrap, bar, meta, status, info.el);
    return { root: container, hint, banner, practiceBtn, stopBtn, prevBtn, nextBtn, listenBtn, level, count, assist, status };
  }

  function setButtons() {
    playUI.practiceBtn.disabled = !input;
    playUI.stopBtn.disabled = mode === 'idle';
    playUI.prevBtn.disabled = assessing || !input || lessonIdx <= 0;
    playUI.nextBtn.disabled = assessing || !input || lessonIdx >= playlist.length - 1;
    playUI.listenBtn.disabled = assessing || !audioOK || staff.model.length === 0;
    playUI.listenBtn.textContent = mode === 'listening' ? '◼ Stop listening' : '♪ Listen';
    playUI.listenBtn.classList.toggle('is-on', mode === 'listening');
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ===================== lifecycle ===================== */

  return {
    enter() {
      screen = 'stages';
      render();
      mount.replaceChildren(root);
    },
    exit() { stopEngine(); stage3?.stop(true); evaluator?.detachStaff(); },
    destroy() { clearTimers(); offEval?.(); stage3?.destroy(); evaluator?.detachStaff(); keyboard?.clearHighlight('target'); synth?.allNotesOff(); },
  };
}

/* ===================== hand assignment & register logic ===================== */
//
// Hands are ASSIGNED from clef/melodic context (a MIDI keyboard reports pitch,
// not which hand played), then rendered as on-staff labels.
//   • Clef-split baseline: Treble (≥C4) → RH, Bass (≤B3) → LH.
//   • A single-clef lesson is wholly one hand (treble→RH, bass→LH); the
//     cross-clef OVERRIDE is the case where that hand reaches into the other
//     clef's territory (e.g. a RH treble lesson dipping to B3).
//   • Fingering is only emitted where it is PRINCIPLED — a single-hand
//     five-finger position (span ≤ a 5th), mapped lowest→highest. Wider or
//     grand-staff lessons get hand labels but no invented finger numbers.

function parseName(name) {
  const m = /^([A-G])(#|b)?(-?\d+)$/.exec(String(name).trim());
  if (!m) return { letter: 'C', acc: 0, octave: 4 };
  return { letter: m[1], acc: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0, octave: parseInt(m[3], 10) };
}

function handModel(names, clef) {
  const parsed = names.map(parseName);
  const dia = parsed.map((p) => LETTER_INDEX[p.letter] + 7 * p.octave);
  const midi = parsed.map((p) => toMidi(p.letter, p.acc, p.octave));
  const hands = midi.map((m) => (clef === 'treble' ? 'R' : clef === 'bass' ? 'L' : m >= 60 ? 'R' : 'L'));

  // Musical fingering for EVERY note (never null) with position shifts.
  const { fingers, shifts } = assignFingering(dia, hands);
  const fiveFinger = !shifts.some(Boolean);   // whole line fits one position

  // Inline staff labels are STRICTLY fingering numbers 1–5 so they can never be
  // mistaken for a note name. Hand (RH/LH) is conveyed by the hint text below the
  // staff, never by a note-like letter on the staff.
  const labels = fingers.map((f) => (f != null ? String(f) : null));
  return { midi, hands, fingers, shifts, fiveFinger, labels };
}

// Five-finger-position fingering with shifts. Notes are GROUPED into positions:
// each position is a maximal run (per hand) whose diatonic range stays within a
// 5th, and the hand is anchored on that position's LOWEST note (RH finger 1 /
// LH finger 5 sits there). Fingers then follow the white-key distance from the
// anchor, so steps → adjacent fingers and skips → finger jumps. Because the whole
// position's range is considered before assigning, the hand seats where the music
// actually sits — a note a third below the opening note stays in-position (a
// natural reach) instead of triggering a spurious pinny reseat. A new position is
// only opened when the music genuinely exceeds a 5th, and its first finger marks
// the shift. Hands are fingered independently (grand staff).
function assignFingering(dia, hands) {
  const fingers = new Array(dia.length).fill(null);
  const shifts = new Array(dia.length).fill(false);

  for (const hand of ['R', 'L']) {
    const idx = [];
    for (let i = 0; i < dia.length; i++) if (hands[i] === hand) idx.push(i);
    if (!idx.length) continue;

    let p = 0;
    let first = true;
    while (p < idx.length) {
      // Extend this position while the running diatonic range stays within a 5th.
      let q = p;
      let posMin = dia[idx[p]];
      let posMax = dia[idx[p]];
      while (q + 1 < idx.length) {
        const d = dia[idx[q + 1]];
        const nMin = Math.min(posMin, d);
        const nMax = Math.max(posMax, d);
        if (nMax - nMin > 4) break;            // would exceed a five-finger span
        posMin = nMin; posMax = nMax; q++;
      }
      // Assign fingers from the settled anchor (the position's lowest note).
      for (let k = p; k <= q; k++) {
        const d = dia[idx[k]];
        fingers[idx[k]] = hand === 'R' ? (d - posMin + 1) : (5 - (d - posMin));
      }
      if (!first) shifts[idx[p]] = true;        // a genuine hand reposition begins here
      first = false;
      p = q + 1;
    }
  }
  return { fingers, shifts };
}

// Starting-position hint: states the starting hand + finger (no note names).
function handHint(names, clef, hm) {
  const startFinger = (h) => {
    const i = hm.hands.findIndex((x) => x === h);
    return i >= 0 ? hm.fingers[i] : null;
  };
  const seg = (label, h) => {
    const f = startFinger(h);
    return f != null ? `${label}: start finger ${f}` : null;
  };
  if (clef === 'treble') return seg('Right Hand', 'R') ?? '';
  if (clef === 'bass') return seg('Left Hand', 'L') ?? '';
  return [seg('Right Hand', 'R'), seg('Left Hand', 'L')].filter(Boolean).join('   ·   ');
}

/* ===================== helpers ===================== */

function letterOf(name) { return /^[A-Ga-g]/.exec(name)?.[0].toUpperCase() ?? '?'; }
function nowMs() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
function clefTag(c) { return c === 'grand' ? 'Grand staff' : c === 'bass' ? 'Bass clef' : 'Treble clef'; }
function accTag(a) { return a === 'sharps' ? 'sharps' : a === 'flats' ? 'flats' : 'naturals only'; }

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
    .srx__screen{display:flex;flex-direction:column;gap:.4rem}
    .srx__h{font-family:var(--font-display);font-size:var(--step-xl,1.6rem);color:var(--ivory);margin:.1rem 0}
    .srx__sub{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory-dim);max-width:60ch;margin:.1rem 0}
    .srx__head{display:flex;align-items:center;gap:.8rem;margin-bottom:.4rem}
    .srx__back{flex:0 0 auto}
    /* Stage cards */
    .srx__stages{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:.8rem}
    .srx__stage{display:flex;flex-direction:column;gap:.35rem;text-align:left;padding:1.2rem;border-radius:16px;
      background:linear-gradient(165deg,var(--ebony-raise,#1f1d27),#191721);border:1px solid var(--ebony-edge,#2a2833);
      color:var(--ivory);cursor:pointer;transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease}
    .srx__stage:hover{transform:translateY(-3px);border-color:var(--brass);box-shadow:0 14px 34px -18px var(--brass-glow,#caa45a)}
    .srx__stage.is-preview{opacity:.82}
    .srx__stage.is-locked{opacity:.5;cursor:not-allowed}
    .srx__stage.is-locked:hover{transform:none;border-color:var(--ebony-edge,#2a2833);box-shadow:none}
    .srx__stage-eyebrow{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.14em;text-transform:uppercase;color:var(--brass-bright)}
    .srx__stage-title{font-family:var(--font-display);font-size:var(--step-lg);color:var(--ivory)}
    .srx__stage-tag{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory-dim)}
    .srx__stage-meta{margin-top:.3rem;font-family:var(--font-mono);font-size:var(--step-xs);color:var(--ivory-dim)}
    /* Preview banner */
    .srx__previewbar{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory);
      background:color-mix(in srgb,var(--brass) 14%,transparent);border:1px solid color-mix(in srgb,var(--brass) 40%,transparent);
      border-radius:10px;padding:.7rem .9rem;margin:.5rem 0}
    .srx__assessbtn{align-self:flex-start;margin:.5rem 0 .3rem}
    /* Lesson lists */
    .srx__tier{margin-top:1rem}
    .srx__tier-title{font-family:var(--font-display);font-size:var(--step-md,1.1rem);color:var(--ivory);display:flex;gap:.6rem;align-items:baseline;margin:.2rem 0 .5rem}
    .srx__tier-title span{font-family:var(--font-mono);font-size:var(--step-xs);color:var(--brass-bright);letter-spacing:.1em;text-transform:uppercase}
    .srx__lessons{display:grid;gap:.6rem;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
    .srx__lesson{display:flex;flex-direction:column;gap:.2rem;text-align:left;padding:.7rem .8rem;border-radius:12px;
      background:var(--ebony-raise,#1f1d27);border:1px solid var(--ebony-edge,#2a2833);color:var(--ivory);cursor:pointer;
      transition:transform .12s ease,border-color .12s ease}
    .srx__lesson:hover{transform:translateY(-2px);border-color:var(--brass)}
    .srx__lesson-id{font-family:var(--font-mono);font-size:var(--step-xs);color:var(--brass-bright)}
    .srx__lesson-title{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory)}
    .srx__lesson-tags{font-family:var(--font-mono);font-size:var(--step-xs);color:var(--ivory-dim)}
    .srx__lesson-gov{margin-top:.15rem;align-self:flex-start;font-family:var(--font-mono);font-size:var(--step-xs);
      letter-spacing:.04em;color:var(--brass-bright);background:color-mix(in srgb,var(--brass) 14%,transparent);
      border:1px solid color-mix(in srgb,var(--brass) 34%,transparent);border-radius:999px;padding:.05rem .5rem}
    /* Hand / register anchor hint above the staff */
    .srx__hint{font-family:var(--font-mono);font-size:var(--step-sm);color:var(--brass-bright);
      min-height:1.2em;margin-bottom:.4rem;letter-spacing:.02em}
    /* Placeholder dialog */
    .srx__placeholder{display:flex;flex-direction:column;gap:.6rem;align-items:flex-start;padding:1.4rem;border-radius:16px;
      background:linear-gradient(165deg,var(--ebony-raise,#1f1d27),#191721);border:1px solid var(--ebony-edge,#2a2833)}
    /* Play screen (engine) */
    .srx__play{display:flex;flex-direction:column}
    .srx__staff{position:relative}
    .srx__bar{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin-top:1.1rem}
    .srx__meta{display:flex;gap:.75rem;align-items:baseline;margin-top:.7rem;flex-wrap:wrap}
    .srx__level{font-family:var(--font-display);font-size:var(--step-lg);color:var(--brass-bright)}
    .srx__count{font-family:var(--font-mono);font-size:var(--step-sm);color:var(--ivory-dim)}
    .srx__assist{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.12em;
      color:var(--ebony-deep,#15110c);background:var(--brass);border-radius:4px;padding:.1rem .4rem}
    .srx__status{font-family:var(--font-mono);font-size:var(--step-sm);color:var(--ivory);margin-top:.5rem;min-height:1.2em}
    .note.is-current .note__head{box-shadow:0 0 0 2px var(--brass-bright),0 0 10px var(--brass-glow)}
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
