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
  const { mount, keyboard, viewport, synth, input, evaluator, nav } = ctx;
  const audioOK = Boolean(synth);

  // ---- shell state ----
  let screen = 'stages';        // stages | lessons | play
  let activeStage = 1;
  let playlist = [];            // lessons for the active stage
  let lessonIdx = 0;
  let focusTier = 1;            // which tier's pathway the lessons screen shows (others collapse)

  // ---- engine state ----
  let mode = 'idle';            // idle | active | listening | pass | fail
  let cursor = 0;
  let exercise = { names: [], signature: '' };
  let failCount = 0;
  let assisted = false;
  let expectedTs = 0;
  let sessionStartLen = 0;       // index into bridge.log marking this practice session's start (read-only review)
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
    publishNav();
    if (screen === 'stages') return renderStages();
    if (screen === 'lessons') return renderLessons();
    if (screen === 'play') return renderPlay();
    if (screen === 'review') return renderReview();
    if (screen === 'stage3') return renderStage3();
  }

  // Report the current breadcrumb trail to the chrome (navigation only). The
  // chrome prepends a "Modules" crumb and derives the Back target from this; no
  // engine, scoring or lesson state is touched here.
  function publishNav() {
    if (!nav) return;
    try {
      const SR = 'Cognitive Sight-Reading';
      const tierName = () => {
        const focus = tiersForStage(activeStage).find((t) => t.tier === focusTier);
        return focus ? tierCopyFor(focus).name : 'Lessons';
      };
      if (screen === 'lessons') {
        nav.set([{ label: SR, go: () => go('stages') }, { label: tierName() }]);
      } else if (screen === 'play') {
        nav.set([{ label: SR, go: () => go('stages') }, { label: tierName(), go: () => go('lessons') }, { label: 'Practice' }]);
      } else if (screen === 'review') {
        nav.set([{ label: SR, go: () => go('stages') }, { label: tierName(), go: () => go('lessons') }, { label: 'Practice Review' }]);
      } else if (screen === 'stage3') {
        nav.set([{ label: SR, go: () => go('stages') }, { label: 'Continuous Flow' }]);
      } else {
        nav.set([{ label: SR }]);
      }
    } catch { /* navigation is non-critical; never break the screen render */ }
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
    const tiers = tiersForStage(n);
    focusTier = tiers.length ? tiers[0].tier : 1;
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
    const tiers = tiersForStage(activeStage);
    if (!tiers.some((t) => t.tier === focusTier)) focusTier = tiers[0]?.tier ?? 1;
    const focus = tiers.find((t) => t.tier === focusTier);
    const nextLessonIn = (lessons) => lessons.find((l) => !seen.has(l.id)) || lessons[lessons.length - 1];

    const wrap = el('div', { class: 'srx__screen' });

    // ---- Header: where am I ----
    const head = el('div', { class: 'srx__head' });
    const back = button('‹ Stages', () => go('stages'), 'btn--ghost srx__back');
    const info = focus ? tierCopyFor(focus) : { name: stage.title, blurb: '' };
    const h = el('div');
    h.innerHTML = `<p class="srx__eyebrow">Stage ${stage.n} · ${stage.title}</p>
      <h2 class="srx__path-title">${info.name}</h2>
      <p class="srx__path-sub">${info.blurb}</p>`;
    head.append(back, h);
    wrap.appendChild(head);

    if (focus) {
      const visited = focus.lessons.filter((l) => seen.has(l.id)).length;
      const total = focus.lessons.length;
      const prog = el('div', { class: 'srx__progress' });
      prog.innerHTML = `<span class="srx__progress-dots">${progressDots(visited, total)}</span>
        <span class="srx__progress-label">${visited} of ${total} practised</span>`;
      wrap.appendChild(prog);

      if (!stage.ready) {
        const note = el('div', { class: 'srx__previewbar' });
        note.textContent = 'Preview — this mode is coming soon. The pathway below is ready and will run here once released.';
        wrap.appendChild(note);
      }

      // ---- Continue card: the single primary action (what next) ----
      const next = nextLessonIn(focus.lessons);
      const nc = lessonCopyFor(next);
      const nVisited = seen.has(next.id);
      const verb = nVisited ? 'Resume' : (visited > 0 ? 'Continue' : 'Start here');
      const nextIdx = playlist.findIndex((l) => l.id === next.id);
      const cont = el('div', { class: 'srx__continue' });
      cont.innerHTML = `<span class="srx__continue-eyebrow">${verb}</span>
        <h3 class="srx__continue-title">${nc.title}</h3>
        <p class="srx__continue-blurb">${nc.blurb}</p>
        <p class="srx__continue-meta">${spanLine(next)}</p>`;
      cont.appendChild(button(`${nVisited ? 'Resume' : (visited > 0 ? 'Continue' : 'Start')} →`,
        () => (stage.ready ? openLesson(nextIdx) : previewLesson(next)), 'btn--xl srx__continue-btn'));
      wrap.appendChild(cont);

      // ---- Pathway: this tier's lessons (what will each teach me) ----
      const sec = el('section', { class: 'srx__tier' });
      sec.innerHTML = `<h3 class="srx__tier-title">Your pathway</h3>`;
      const list = el('div', { class: 'srx__pathlist' });
      focus.lessons.forEach((lesson, i) => {
        const lc = lessonCopyFor(lesson);
        const isNext = lesson.id === next.id;
        const isVisited = seen.has(lesson.id);
        const state = isNext ? 'current' : isVisited ? 'review' : 'available';
        const action = isNext ? (isVisited ? 'Resume' : 'Start') : isVisited ? 'Review' : 'Start';
        const idx = playlist.findIndex((l) => l.id === lesson.id);
        const row = el('button', { class: `srx__step is-${state}`, type: 'button' });
        row.innerHTML = `<span class="srx__step-mark">${isNext ? '▶' : isVisited ? '✓' : i + 1}</span>
          <span class="srx__step-body">
            <span class="srx__step-title">${lc.title}</span>
            <span class="srx__step-blurb">${lc.blurb}</span>
            <span class="srx__step-meta">${spanLine(lesson)}</span>
          </span>
          <span class="srx__step-action">${action}</span>`;
        row.addEventListener('click', () => (stage.ready ? openLesson(idx) : previewLesson(lesson)));
        list.appendChild(row);
      });
      sec.appendChild(list);
      wrap.appendChild(sec);
    }

    // ---- Coming next: other tiers, collapsed (reduce clutter) ----
    const others = tiers.filter((t) => t.tier !== focusTier);
    if (others.length) {
      const cn = el('section', { class: 'srx__coming' });
      cn.innerHTML = `<h3 class="srx__coming-title">Coming next</h3>`;
      others.forEach((t) => {
        const tc = tierCopyFor(t);
        const r = el('button', { class: 'srx__coming-row', type: 'button' });
        r.innerHTML = `<span class="srx__coming-name">${tc.name}</span>
          <span class="srx__coming-blurb">${tc.blurb}</span>
          <span class="srx__coming-chip">View</span>`;
        r.addEventListener('click', () => { focusTier = t.tier; render(); });
        cn.appendChild(r);
      });
      wrap.appendChild(cn);
    }

    // ---- Secondary milestone: the unlock challenge (never the primary CTA) ----
    if (activeStage === 1) {
      const unlocked = gate.isUnlocked(2);
      const ms = el('div', { class: 'srx__milestone' });
      ms.innerHTML = `<span class="srx__milestone-label">${unlocked ? '✓ Stage 2 unlocked' : 'When you’re ready'}</span>`;
      const cta = button(unlocked ? 'Retake the unlock challenge' : 'Take the Stage 2 unlock challenge',
        openAssessment, 'btn--ghost srx__assessbtn');
      if (!input) cta.disabled = true;
      ms.appendChild(cta);
      wrap.appendChild(ms);
    }

    root.replaceChildren(wrap);
  }

  function previewLesson(lesson) {
    const stage = STAGES.find((s) => s.n === activeStage);
    const lc = lessonCopyFor(lesson);
    const dialog = el('div', { class: 'srx__placeholder' });
    dialog.innerHTML = `
      <p class="vector__eyebrow">${stage.eyebrow} · ${stage.title}</p>
      <h2 class="srx__h">${lc.title}</h2>
      <p class="srx__sub">${lc.blurb || stage.tagline}</p>
      <p class="srx__sub">This mode is coming soon. When it’s ready, this lesson will run right here.</p>`;
    const back = button('‹ Back to lessons', () => go('lessons'), 'btn--xl btn--ghost');
    dialog.appendChild(back);
    root.replaceChildren(dialog);
  }

  function openLesson(idx) {
    lessonIdx = Math.max(0, Math.min(idx, playlist.length - 1));
    go('play');
  }

  // End the current practice session and show the read-only review.
  function endSession() { go('review'); }

  // Your Practice Review — calm, teacher-led summary computed read-only from the
  // Event Bridge records logged this session. No scoring/evaluator/MIDI change.
  function renderReview() {
    stopEngine();
    evaluator?.detachStaff();
    const records = bridge.log.slice(sessionStartLen);
    const a = analyseSession(records);
    const lesson = activeLesson();
    const lc = lesson ? lessonCopyFor(lesson) : { title: 'Practice' };

    const wrap = el('div', { class: 'srx__screen srx__review' });

    const head = el('div', { class: 'srx__head' });
    const back = button('‹ Lessons', () => go('lessons'), 'btn--ghost srx__back');
    const h = el('div');
    h.innerHTML = `<p class="srx__eyebrow">Stage ${activeStage} · Recognition</p>
      <h2 class="srx__review-title">Your Practice Review</h2>
      <p class="srx__review-sub">${lc.title}</p>`;
    head.append(back, h);
    wrap.appendChild(head);

    if (!a.attempted) {
      const empty = el('p', { class: 'srx__review-empty' });
      empty.textContent = 'No notes were recorded in this session yet. Press Practise Again to begin reading.';
      wrap.appendChild(empty);
    } else {
      const rows = [
        ['Notes read', `${a.correct} of ${a.attempted}`],
        ['Accuracy', `${a.accuracy}%`],
        ['Longest fluent run', `${a.longest} ${a.longest === 1 ? 'note' : 'notes'}`],
        ['Reading consistency', a.consistency],
      ];
      const grid = el('div', { class: 'srx__review-grid' });
      rows.forEach(([k, v]) => {
        const row = el('div', { class: 'srx__review-row' });
        row.innerHTML = `<span class="srx__review-key">${k}</span><span class="srx__review-val">${v}</span>`;
        grid.appendChild(row);
      });
      wrap.appendChild(grid);

      const notes = el('div', { class: 'srx__review-notes' });
      notes.innerHTML = `
        <p class="srx__review-line"><span class="srx__review-label">What stood out</span>${hesitationPhrase(a.hesitant)}</p>
        <p class="srx__review-line"><span class="srx__review-label">Focus for next time</span>${focusPhrase(a)}</p>
        <p class="srx__review-coach">${coachNote(a)}</p>`;
      wrap.appendChild(notes);
    }

    const actions = el('div', { class: 'srx__review-actions' });
    actions.append(
      button('Practise Again', () => openLesson(lessonIdx), 'btn--xl'),
      button('Back to Lessons', () => go('lessons'), 'btn--xl btn--ghost'),
      button('Back to Modules', () => {
        try { if (location.hash && location.hash !== '#/' && location.hash !== '#') location.hash = '#/'; } catch { /* ignore */ }
      }, 'btn--xl btn--ghost'),
    );
    wrap.appendChild(actions);

    root.replaceChildren(wrap);
  }

  function renderPlay() {
    // Mark where this practice session's records begin (read-only review only).
    if (!assessing) sessionStartLen = bridge.log.length;
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

    // Hand assignment + register logic (labels rendered on-staff). Recognition
    // (Stage 1) lessons use cognitive fixed-position fingering; see usesFixedPosition.
    const fixedPos = usesFixedPosition(lesson);
    const hm = handModel(exercise.names, lesson.clef, fixedPos, lesson.range);
    const model = staff.setSequence(exercise.names, { fingers: hm.labels, showRests: true });
    playUI.diag.textContent = renderFingeringDiag(hm, exercise.names, fixedPos);   // [diagnostic rc2-12]
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

    // Refresh controls so "Finish & Review" enables the moment this session has
    // something to review (and stays disabled when it does not).
    setButtons();

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
    const reviewBtn = button('Finish & Review', () => endSession(), 'btn--xl btn--ghost');
    bar.append(practiceBtn, stopBtn, prevBtn, nextBtn, listenBtn, reviewBtn);

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

    // [diagnostic rc2-11] Temporary fingering-engine readout — remove later.
    const diag = el('pre', { class: 'srx__diag' });
    diag.textContent = `${SR_FINGERING_BUILD}\n(press Practice to populate the readout)`;

    container.append(hint, staffWrap, bar, meta, status, info.el, diag);
    return { root: container, hint, banner, practiceBtn, stopBtn, prevBtn, nextBtn, listenBtn, reviewBtn, level, count, assist, status, diag };
  }

  function setButtons() {
    playUI.practiceBtn.disabled = !input;
    playUI.stopBtn.disabled = mode === 'idle';
    playUI.prevBtn.disabled = assessing || !input || lessonIdx <= 0;
    playUI.nextBtn.disabled = assessing || !input || lessonIdx >= playlist.length - 1;
    playUI.listenBtn.disabled = assessing || !audioOK || staff.model.length === 0;
    playUI.listenBtn.textContent = mode === 'listening' ? '◼ Stop listening' : '♪ Listen';
    playUI.listenBtn.classList.toggle('is-on', mode === 'listening');
    // Review is offered for regular practice once at least one note is recorded
    // this session. Read-only; never shown for the atomic unlock assessment.
    playUI.reviewBtn.disabled = assessing || bridge.log.length <= sessionStartLen;
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

function handModel(names, clef, fixedPosition = false, frame = null) {
  const parsed = names.map(parseName);
  const dia = parsed.map((p) => LETTER_INDEX[p.letter] + 7 * p.octave);
  const midi = parsed.map((p) => toMidi(p.letter, p.acc, p.octave));
  const hands = midi.map((m) => (clef === 'treble' ? 'R' : clef === 'bass' ? 'L' : m >= 60 ? 'R' : 'L'));

  // Stage 1 fixed-position fingering is anchored on the LESSON FRAME low note
  // (not the exercise's lowest note), so a given note ALWAYS shows the same
  // finger inside that frame — C4–G4 reads 1 2 3 4 5, finger 5 only ever on G4.
  // Frames wider than a five-finger position (a perfect 5th), and grand-staff
  // lessons, show NO fingering at all — reading and hand identification stay the
  // focus rather than misleading clamped/repeated finger numbers.
  let anchorDia = null;
  let hideFingering = false;
  if (fixedPosition && frame) {
    const lo = parseName(frame.low);
    const hi = parseName(frame.high);
    anchorDia = LETTER_INDEX[lo.letter] + 7 * lo.octave;
    const span = (LETTER_INDEX[hi.letter] + 7 * hi.octave) - anchorDia;
    hideFingering = clef === 'grand' || span > 4;
  }

  // Musical fingering for EVERY note (or none, when hidden). Recognition-stage
  // lessons use a frame-anchored fixed position (no shifts); later stages use
  // range-aware shifts.
  const { fingers, shifts } = assignFingering(dia, hands, { fixedPosition, anchorDia, hideFingering });
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
function assignFingering(dia, hands, opts = {}) {
  const fixedPosition = opts.fixedPosition === true;
  const anchorDia = opts.anchorDia ?? null;
  const hideFingering = opts.hideFingering === true;
  const fingers = new Array(dia.length).fill(null);
  const shifts = new Array(dia.length).fill(false);

  for (const hand of ['R', 'L']) {
    const idx = [];
    for (let i = 0; i < dia.length; i++) if (hands[i] === hand) idx.push(i);
    if (!idx.length) continue;

    if (fixedPosition) {
      // COGNITIVE fixed-position fingering (Recognition / Stage 1). Frames wider
      // than a five-finger span, and grand-staff lessons, intentionally show NO
      // fingering (fingers stay null) — reading, not technique. Otherwise the hand
      // is anchored on the LESSON FRAME low note (opts.anchorDia) for the WHOLE
      // lesson, so a note's finger is invariant across exercises: no thumb-under,
      // no shift, one stable five-finger map (RH 1→5 low→high; LH 5→1).
      if (hideFingering) continue;
      const anchor = anchorDia != null ? anchorDia : Math.min(...idx.map((i) => dia[i]));
      for (const i of idx) {
        const within = dia[i] - anchor;
        const f = hand === 'R' ? within + 1 : 5 - within;
        fingers[i] = Math.min(5, Math.max(1, f));
      }
      continue;   // fixed mode never shifts
    }

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

/* ===== TEMPORARY fingering-engine diagnostic (build rc2-11) =====
   Derives its readout purely from the live handModel output — it does NOT
   touch assignFingering, so the algorithm itself is unchanged. Remove after we
   have confirmed which build is running on the tablet. */
const SR_FINGERING_BUILD = 'Sight Reading Fingering Engine: rc2-23 (frame-anchored fixed position; fingering hidden beyond a 5th / grand staff)';
const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
function diaToName(d) {
  const oct = Math.floor(d / 7);
  const li = ((d % 7) + 7) % 7;
  return `${NOTE_LETTERS[li]}${oct}`;
}
function renderFingeringDiag(hm, names, fixedPosition = false) {
  const dia = names.map((n) => { const p = parseName(n); return LETTER_INDEX[p.letter] + 7 * p.octave; });
  // Per-note position anchor (posMin) implied by the assigned finger:
  //   RH: finger = d - posMin + 1   ->  posMin = d - (finger - 1)
  //   LH: finger = 5 - (d - posMin) ->  posMin = d - (5 - finger)
  const anchors = dia.map((d, i) => {
    const f = hm.fingers[i]; const h = hm.hands[i];
    if (f == null) return '--';
    return diaToName(h === 'R' ? d - (f - 1) : d - (5 - f));
  });
  const w = (arr) => arr.map((x) => String(x == null ? '-' : x).padStart(3, ' ')).join(' ');
  return [
    SR_FINGERING_BUILD,
    `mode:   ${fixedPosition ? 'fixed_position (Recognition / Stage 1) — no shift, no thumb-under' : 'range-aware (conventional pianistic)'}`,
    `idx:    ${w(names.map((_, i) => i))}`,
    `name:   ${w(names)}`,
    `midi:   ${w(hm.midi)}`,
    `hand:   ${w(hm.hands)}`,
    `finger: ${w(hm.fingers)}`,
    `anchor: ${w(anchors)}`,
    `shift:  ${w(hm.shifts.map((s) => (s ? '^' : '-')))}`,
    `one-position: ${hm.fiveFinger ? 'YES — single five-finger position, no shift' : 'NO — shift(s) applied'}`,
  ].join('\n');
}

// Cognitive Sight-Reading mode gate. The Recognition stage (Stage 1) optimises
// for note recognition: fixed five-finger position, no thumb-under, no shifts.
// Later stages (and the separate Scales Masterclass module) keep conventional
// pianistic fingering. Adjust this single predicate to retune which lessons
// qualify (e.g. `lesson?.cfg?.level <= 5` for a stricter early-levels-only gate).
function usesFixedPosition(lesson) {
  return lesson?.stage === 1;
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

/* ---- Learner-facing lesson presentation (copy only — no curriculum data) ----
 * Friendly titles + one-line teacher descriptions keyed by the lesson id that
 * already exists in the build. If an id has no entry we fall back gracefully to
 * a humanised label, so the learner never sees an internal label and new lessons
 * never break the screen. */
const LESSON_COPY = {
  // Stage 1 — Note Recognition
  '1.1':  { title: 'Starting Notes',        blurb: 'Meet your first three treble notes.' },
  '1.2':  { title: 'The Five-Note Frame',   blurb: 'Read five notes around Middle C, step by step.' },
  '1.3':  { title: 'Knowing the Frame',     blurb: 'Find each of the five notes in any order.' },
  // Stage 2 — Step Recognition
  '1.4':  { title: 'Reading by Step',       blurb: 'Follow notes that move to their neighbour.' },
  '1.5':  { title: 'Steps Up and Down',     blurb: 'Read longer stepwise lines that change direction.' },
  // Stage 3 — Shape / Contour Recognition
  '1.6':  { title: 'First Shapes',          blurb: 'Recognise the shape of a three-note phrase.' },
  '1.7':  { title: 'Four-Note Shapes',      blurb: 'Read the contour of a four-note phrase.' },
  '1.8':  { title: 'Changing Direction',    blurb: 'Follow a line that turns more than once.' },
  '1.9':  { title: 'Little Melodies',       blurb: 'Read simple melodic shapes within the frame.' },
  // Stage 4 — Skip Recognition
  '1.10': { title: 'The Skip',              blurb: 'Read your first skip — a jump of a third.' },
  '1.11': { title: 'Steps and Skips',       blurb: 'Mix steps and skips in the same line.' },
  '1.12': { title: 'Reading Patterns',      blurb: 'Recognise small patterns of steps and skips.' },
  // Stage 5 — Interval Recognition
  '1.13': { title: 'Wider Skips',           blurb: 'Read jumps up to a fourth.' },
  '1.14': { title: 'Reaching a Fifth',      blurb: 'Read the widest jumps inside the frame.' },
  // Stage 6 — Register Expansion
  '1.15': { title: 'One Note Above',        blurb: 'Stretch your reading just beyond the frame.' },
  '1.16': { title: 'Up to the Octave',      blurb: 'Read across a full octave from Middle C.' },
  '1.17': { title: 'First Ledger Line',     blurb: 'Step onto your first note above the staff.' },
  // Stage 7 — Register Shift
  '1.18': { title: 'Further Ledger Lines',  blurb: 'Read higher notes above the staff.' },
  '1.19': { title: 'A New Position',        blurb: 'Move your reading frame higher up the keyboard.' },
};
const TIER_COPY = {
  1: { name: 'Treble Foundations',  blurb: 'Learning to read fluently around Middle C.' },
  2: { name: 'Bass Foundations',    blurb: 'Reading confidently in the bass clef.' },
  3: { name: 'Grand Staff Reading', blurb: 'Reading across both hands and the middle-C bridge.' },
};
const RANGE_PHRASES = {
  'C4-G4': 'around Middle C', 'C4-A4': 'around Middle C',
  'C4-C5': 'a full octave from Middle C', 'C4-A5': 'up to the first ledger line',
  'C4-C6': 'up to the second ledger line', 'A4-E6': 'higher up the staff',
};
function lessonCopyFor(lesson) {
  const c = LESSON_COPY[lesson.id];
  if (c) return c;
  const concept = lesson.concept ? lesson.concept.split('—')[0].trim() : null;
  return { title: concept || `${clefTag(lesson.clef)} reading`, blurb: '' };
}
function tierCopyFor(group) { return TIER_COPY[group.tier] || { name: group.title, blurb: '' }; }
function spanLine(lesson) {
  const r = lesson.range;
  const phrase = RANGE_PHRASES[`${r.low}-${r.high}`];
  const span = phrase ? `${phrase} (${r.low}–${r.high})` : `${r.low}–${r.high}`;
  const n = lesson.cfg.length;
  return `${clefTag(lesson.clef)} · ${span} · ${n} ${n === 1 ? 'note' : 'notes'}`;
}
function progressDots(done, total) {
  const max = Math.min(total, 12); let s = '';
  for (let i = 0; i < max; i++) s += i < done ? '●' : '○';
  return s;
}

/* ---- Practice Review analysis (READ-ONLY over Event Bridge records) ----
 * These pure functions never touch scoring, the evaluator, the gate, MIDI or
 * the bridge's own state — they only read a copy of the session's records and
 * turn them into calm, teacher-led language. */
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiToName(m) {
  if (!Number.isFinite(m)) return '—';
  return `${PITCH_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}
function analyseSession(records) {
  const attempted = records.length;
  const correct = records.reduce((n, r) => n + (r.accuracy ? 1 : 0), 0);
  const misses = attempted - correct;
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;

  let longest = 0, run = 0;
  for (const r of records) { if (r.accuracy) { run += 1; if (run > longest) longest = run; } else run = 0; }
  let trailing = 0;
  for (let i = records.length - 1; i >= 0; i--) { if (records[i].accuracy) trailing += 1; else break; }

  const lat = records
    .filter((r) => r.accuracy && Number.isFinite(r.deltaMs) && r.deltaMs >= 0)
    .map((r) => r.deltaMs);
  const mean = lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null;
  const sd = lat.length > 1 ? Math.sqrt(lat.reduce((a, b) => a + (b - mean) ** 2, 0) / (lat.length - 1)) : 0;
  const cv = mean && mean > 0 ? sd / mean : 0;
  let consistency = '—';
  if (lat.length >= 3) consistency = cv < 0.4 ? 'steady' : cv < 0.75 ? 'fairly steady' : 'still settling';
  else if (lat.length) consistency = 'steady';

  const byNote = new Map();
  for (const r of records) {
    const midi = r.expectedNote;
    if (!Number.isFinite(midi)) continue;
    let e = byNote.get(midi);
    if (!e) { e = { midi, name: midiToName(midi), attempts: 0, misses: 0, latSum: 0, latN: 0 }; byNote.set(midi, e); }
    e.attempts += 1;
    if (!r.accuracy) e.misses += 1;
    else if (Number.isFinite(r.deltaMs) && r.deltaMs >= 0) { e.latSum += r.deltaMs; e.latN += 1; }
  }
  const slowThresh = mean != null ? mean * 1.3 : Infinity;
  const hesitant = [...byNote.values()]
    .map((n) => ({ ...n, avgLat: n.latN ? n.latSum / n.latN : null }))
    .filter((n) => n.misses > 0 || (n.avgLat != null && n.avgLat > slowThresh))
    .sort((a, b) => (b.misses - a.misses) || ((b.avgLat ?? 0) - (a.avgLat ?? 0)));

  return { attempted, correct, misses, accuracy, longest, trailing, consistency, cv, meanLat: mean, hesitant };
}
function hesitationPhrase(hesitant) {
  if (!hesitant.length) return 'Nothing stood out — your reading stayed even across the whole session.';
  const top = hesitant.slice(0, 2);
  if (top.every((n) => n.midi >= 81)) return 'You paused most on the higher ledger-line notes above the staff.';
  if (top.every((n) => n.midi <= 48)) return 'You paused most on the lower ledger-line notes below the staff.';
  return `You paused most around ${top.map((n) => n.name).join(' and ')}.`;
}
function focusPhrase(a) {
  if (!a.attempted) return 'Play a few notes and your focus for next time will appear here.';
  if (a.hesitant.length) {
    const top = a.hesitant.slice(0, 2);
    if (top.every((n) => n.midi >= 81)) return 'Next time, name the ledger-line note before your hand moves to the key.';
    if (top.every((n) => n.midi <= 48)) return 'Next time, take an extra moment to place the lower ledger notes before playing.';
    return `Next time, look at ${top[0].name} and read its position before reaching for it.`;
  }
  if (a.consistency === 'still settling') return 'Next time, let your reading settle into an even, unhurried pace.';
  if (a.accuracy >= 95) return 'Next time, let your eyes glance ahead to the next note while you play the current one.';
  return 'Next time, read each note’s position on the staff before reaching for the key.';
}
function coachNote(a) {
  if (!a.attempted) return 'Whenever you’re ready, take it one note at a time — there’s no rush.';
  if (a.accuracy >= 95 && a.consistency === 'steady') return 'Your reading was accurate and assured today — that is exactly how fluency is built.';
  if (a.misses > 0 && a.trailing >= 3) return 'You kept reading after a slip rather than stalling — that recovery is a real strength.';
  if (a.longest >= 8) return 'You sustained some long, fluent passages today — that steadiness is real reading progress.';
  if (a.accuracy >= 80) return 'Good work — your reading is becoming more confident.';
  return 'Every read makes the next one easier. Steady, patient practice is doing its work.';
}

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
    /* ---- Learner-facing lesson screen (presentation) ---- */
    .srx__eyebrow{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.12em;text-transform:uppercase;color:var(--brass-bright)}
    .srx__path-title{font-family:var(--font-display);font-size:var(--step-lg,1.6rem);color:var(--ivory);margin:.1rem 0}
    .srx__path-sub{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory-dim);margin:0}
    .srx__progress{display:flex;align-items:center;gap:.6rem;margin:.4rem 0 .2rem}
    .srx__progress-dots{font-size:var(--step-sm);letter-spacing:.18em;color:var(--brass)}
    .srx__progress-label{font-family:var(--font-mono);font-size:var(--step-xs);color:var(--ivory-dim)}
    .srx__continue{display:flex;flex-direction:column;gap:.2rem;padding:1rem 1.1rem;border-radius:16px;margin:.6rem 0 1.1rem;
      background:linear-gradient(160deg,color-mix(in srgb,var(--brass) 16%,transparent),transparent);border:1px solid var(--brass)}
    .srx__continue-eyebrow{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.12em;text-transform:uppercase;color:var(--brass-bright)}
    .srx__continue-title{font-family:var(--font-display);font-size:var(--step-md,1.25rem);color:var(--ivory);margin:.05rem 0}
    .srx__continue-blurb{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory);margin:0}
    .srx__continue-meta{font-family:var(--font-mono);font-size:var(--step-xs);color:var(--ivory-dim);margin:.15rem 0 .55rem}
    .srx__continue-btn{align-self:flex-start}
    .srx__pathlist{display:flex;flex-direction:column;gap:.5rem}
    .srx__step{display:flex;align-items:center;gap:.8rem;width:100%;text-align:left;padding:.7rem .8rem;border-radius:12px;cursor:pointer;
      background:color-mix(in srgb,var(--ivory) 4%,transparent);border:1px solid color-mix(in srgb,var(--ivory) 10%,transparent);transition:transform .12s,border-color .12s}
    .srx__step:hover{transform:translateY(-1px);border-color:var(--brass)}
    .srx__step-mark{flex:0 0 1.7rem;height:1.7rem;display:grid;place-items:center;border-radius:50%;
      font-family:var(--font-mono);font-size:var(--step-xs);color:var(--ivory-dim);background:color-mix(in srgb,var(--ivory) 6%,transparent)}
    .srx__step.is-current{border-color:var(--brass);background:color-mix(in srgb,var(--brass) 10%,transparent)}
    .srx__step.is-current .srx__step-mark{color:var(--brass-bright);background:color-mix(in srgb,var(--brass) 22%,transparent)}
    .srx__step.is-review{opacity:.72}
    .srx__step.is-review .srx__step-mark{color:var(--ok,#6fcf97)}
    .srx__step-body{display:flex;flex-direction:column;gap:.1rem;flex:1 1 auto;min-width:0}
    .srx__step-title{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory)}
    .srx__step-blurb{font-family:var(--font-sans);font-size:var(--step-xs);color:var(--ivory-dim)}
    .srx__step-meta{font-family:var(--font-mono);font-size:var(--step-xs);color:var(--ivory-dim);opacity:.82}
    .srx__step-action{flex:0 0 auto;font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.08em;text-transform:uppercase;color:var(--brass-bright)}
    .srx__coming{margin-top:1.3rem}
    .srx__coming-title{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.12em;text-transform:uppercase;color:var(--ivory-dim);margin:0 0 .4rem}
    .srx__coming-row{display:flex;align-items:center;gap:.6rem;width:100%;text-align:left;padding:.6rem .8rem;border-radius:12px;cursor:pointer;margin-bottom:.4rem;
      background:color-mix(in srgb,var(--ivory) 2%,transparent);border:1px dashed color-mix(in srgb,var(--ivory) 12%,transparent)}
    .srx__coming-row:hover{border-color:var(--brass)}
    .srx__coming-name{font-family:var(--font-display);font-size:var(--step-sm);color:var(--ivory)}
    .srx__coming-blurb{flex:1 1 auto;font-family:var(--font-sans);font-size:var(--step-xs);color:var(--ivory-dim)}
    .srx__coming-chip{font-family:var(--font-mono);font-size:var(--step-xs);color:var(--brass-bright)}
    .srx__milestone{display:flex;align-items:center;gap:.8rem;margin:1.4rem 0 .3rem;padding-top:1rem;border-top:1px solid color-mix(in srgb,var(--ivory) 10%,transparent)}
    .srx__milestone-label{font-family:var(--font-mono);font-size:var(--step-xs);color:var(--ivory-dim)}
    /* ---- Your Practice Review (calm, coach-led; no badges/XP/scoreboard) ---- */
    .srx__review-title{font-family:var(--font-display);font-size:var(--step-lg,1.6rem);color:var(--ivory);margin:.1rem 0}
    .srx__review-sub{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory-dim);margin:0}
    .srx__review-empty{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory-dim);margin:1rem 0}
    .srx__review-grid{display:flex;flex-direction:column;gap:.1rem;margin:1rem 0 .4rem;
      border:1px solid color-mix(in srgb,var(--ivory) 10%,transparent);border-radius:14px;overflow:hidden}
    .srx__review-row{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:.6rem .9rem;
      background:color-mix(in srgb,var(--ivory) 3%,transparent)}
    .srx__review-row:nth-child(even){background:color-mix(in srgb,var(--ivory) 5%,transparent)}
    .srx__review-key{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory-dim)}
    .srx__review-val{font-family:var(--font-display);font-size:var(--step-md,1.2rem);color:var(--ivory)}
    .srx__review-notes{display:flex;flex-direction:column;gap:.7rem;margin:1.1rem 0}
    .srx__review-line{font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory);margin:0;line-height:1.5}
    .srx__review-label{display:block;font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.1em;
      text-transform:uppercase;color:var(--brass-bright);margin-bottom:.15rem}
    .srx__review-coach{font-family:var(--font-display);font-style:italic;font-size:var(--step-md,1.15rem);
      color:var(--ivory);margin:.4rem 0 0;padding:.8rem 1rem;border-left:2px solid var(--brass);
      background:color-mix(in srgb,var(--brass) 8%,transparent);border-radius:0 10px 10px 0;line-height:1.5}
    .srx__review-actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.3rem}
    /* Hand / register anchor hint above the staff */
    .srx__hint{font-family:var(--font-mono);font-size:var(--step-sm);color:var(--brass-bright);
      min-height:1.2em;margin-bottom:.4rem;letter-spacing:.02em}
    /* Placeholder dialog */
    .srx__placeholder{display:flex;flex-direction:column;gap:.6rem;align-items:flex-start;padding:1.4rem;border-radius:16px;
      background:linear-gradient(165deg,var(--ebony-raise,#1f1d27),#191721);border:1px solid var(--ebony-edge,#2a2833)}
    /* Play screen (engine) */
    .srx__play{display:flex;flex-direction:column}
    /* [diagnostic rc2-11] temporary fingering-engine readout */
    .srx__diag{margin:.5rem 0 0;padding:.55rem .7rem;background:#0c0b10;color:#8fe39a;
      border:1px solid #2a2833;border-radius:8px;white-space:pre;overflow-x:auto;
      font:600 11px/1.45 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.02em}
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
