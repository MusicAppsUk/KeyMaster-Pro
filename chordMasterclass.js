// chordMasterclass.js
//
// Chord Masterclass — GUIDED TEACHING (Phase 2).
//
// Phase 2 turns the chord view from a selector/checker into a guided lesson path.
// The learner is led through a small course (Unit 1 — B major) one lesson card at
// a time, following Teach → Show → Shape → Try → Guide → Repeat → Review. The
// advanced Root/Quality/Inversion/Hand selectors still exist but are demoted into
// a collapsed "Free explore" disclosure, so the FIRST experience is a lesson, not
// a settings panel.
//
// Reuses the stable infrastructure UNCHANGED:
//   • chordEngine.buildChord / chordSymbol  — MIDI set + symbol per inversion/hand
//   • chordEvaluator                         — set-membership checker on the shared
//                                              NoteInput hub (MIDI *and* on-screen),
//                                              green/red paint, progress/complete.
//   • staffView.setChord({clef})             — opt-in single-clef display: RH→treble,
//                                              LH→bass (default 'grand' elsewhere).
//   • keyboard.highlight                     — target + root decoration.
// The single-note midiEvaluator (Scales/Sight-Reading), the Event Bridge, and
// progression gating are NOT touched — chords are a set decision, not a cursor.
//
// Review is honest: we summarise only what we actually observe (chords completed),
// in a calm teacher voice — no invented per-dimension scores.
//
// Loaded lazily by app.js. Default-exports createView(ctx) -> { enter, exit, destroy }.

import { createStaffView } from './staffView.js';
import { noteName, SHARP_NAMES, FLAT_NAMES } from './notes.js';
import { buildChord, chordSymbol, INVERSIONS } from './chordEngine.js';
import { createChordEvaluator } from './chordEvaluator.js';
import { UNIT1 } from './chordCourse.js';

const QUALITY_OPTIONS = [['major', 'Major']];          // Phase 2: major triads only
const HAND_OPTIONS = [['RH', 'Right hand'], ['LH', 'Left hand'], ['BOTH', 'Both hands - later', true]];
const PRAISE = ['Correct chord - nicely shaped.', 'Excellent recognition.', 'Good hand shape.', 'Same chord, confidently played.'];

function triadFingering(hand) { return hand === 'LH' ? [5, 3, 1] : [1, 3, 5]; }   // low -> high
function fingeringText(hand) {
  return hand === 'LH'
    ? 'Recommended fingering - LH: 5 \u00b7 3 \u00b7 1 (little finger on the low note)'
    : 'Recommended fingering - RH: 1 \u00b7 3 \u00b7 5 (thumb on the low note)';
}
function clefForHand(hand) { return hand === 'LH' ? 'bass' : 'treble'; }   // BOTH (later) -> grand
function handWord(hand) { return hand === 'LH' ? 'left hand' : 'right hand'; }
function invLabel(inv) { const f = INVERSIONS.find(([v]) => v === inv); return f ? f[1] : 'Root position'; }

export default function createView(ctx) {
  const { mount, keyboard, viewport, input, evaluator: globalEvaluator } = ctx;
  const pref = keyboard && keyboard.accidental === 'flat' ? 'flat' : 'sharp';
  const ROOT_NAMES = pref === 'flat' ? FLAT_NAMES : SHARP_NAMES;
  const ROOT_OPTIONS = ROOT_NAMES.map((n, pc) => [String(pc), n]);

  // ---- state -----------------------------------------------------------
  let view = 'course';                 // 'course' | 'explore' | 'summary'
  let lessonIx = 0;                    // index into UNIT1.lessons
  let subSeq = [];                     // [{inversion, hand}] for the current lesson
  let subIx = 0;
  let lessonDone = false;
  let praiseIx = 0;
  let advanceTimer = null;
  let expectedSet = new Set();
  const sel = { rootPc: 11, quality: 'major', inversion: 'root', hand: 'RH' };  // explore
  const stats = { completed: 0, lessonsSeen: new Set() };

  const staff = createStaffView({ compact: false });
  const evaluator = createChordEvaluator({ input, keyboard });
  const ui = {};
  let built = false;
  const offs = [];

  /* ---- build (once) -------------------------------------------------- */
  function build() {
    injectStyles();
    const root = el('div', { class: 'cmx' });

    // Lesson card ------------------------------------------------------
    ui.lesson = el('div', { class: 'cmx__lesson' });
    ui.eyebrow = el('p', { class: 'cmx__eyebrow' });
    ui.title = el('h2', { class: 'cmx__title' });
    ui.teach = el('div', { class: 'cmx__teach' });
    ui.panel = el('div', { class: 'cmx__panel' });
    ui.panel.appendChild(staff.el);
    ui.band = el('div', { class: 'cmx__band' });
    ui.symbol = el('span', { class: 'cmx__symbol' });
    ui.invlabel = el('span', { class: 'cmx__invlabel' });
    ui.finger = el('span', { class: 'cmx__finger' });
    ui.band.append(ui.symbol, ui.invlabel, ui.finger);
    ui.prompt = el('p', { class: 'cmx__prompt' });
    ui.status = el('p', { class: 'cmx__status' });
    ui.lesson.append(ui.eyebrow, ui.title, ui.teach, ui.panel, ui.band, ui.prompt, ui.status);

    // Honest end-of-unit review --------------------------------------
    ui.summary = el('div', { class: 'cmx__summary' });
    ui.summary.hidden = true;

    // Free explore (advanced) — demoted selectors --------------------
    ui.explore = el('details', { class: 'cmx__explore' });
    const sm = el('summary', { class: 'cmx__exsummary' }); sm.textContent = 'Free explore (advanced)';
    const controls = el('div', { class: 'cmx__controls' });
    ui.root_ = select(ROOT_OPTIONS, String(sel.rootPc), (v) => { sel.rootPc = Number(v); enterExplore(); });
    ui.qual = select(QUALITY_OPTIONS, sel.quality, (v) => { sel.quality = v; enterExplore(); });
    ui.inv = select(INVERSIONS, sel.inversion, (v) => { sel.inversion = v; enterExplore(); });
    ui.hand = select(HAND_OPTIONS, sel.hand, (v) => {
      if (v === 'BOTH') { ui.hand.value = sel.hand; return; }   // reserved for later
      sel.hand = v; enterExplore();
    });
    controls.append(labeled('Root', ui.root_), labeled('Quality', ui.qual), labeled('Inversion', ui.inv), labeled('Hand', ui.hand));
    const exNote = el('p', { class: 'cmx__exnote' });
    exNote.textContent = 'Pick any chord to explore freely. Use Continue to return to the lesson.';
    ui.explore.append(sm, controls, exNote);

    // Sticky action bar (always visible above the keyboard) ----------
    ui.actionbar = el('div', { class: 'cmx__actionbar' });
    ui.progress = el('span', { class: 'cmx__progresstext' });
    ui.primary = el('button', { class: 'cmx__primary', type: 'button' });
    ui.primary.addEventListener('click', onPrimary);
    ui.actionbar.append(ui.progress, ui.primary);

    root.append(ui.lesson, ui.summary, ui.explore, ui.actionbar);
    mount.replaceChildren(root);
    built = true;

    offs.push(evaluator.on('complete', onComplete));
    offs.push(evaluator.on('progress', onProgress));
  }

  /* ---- course flow --------------------------------------------------- */
  function loadLesson(i) {
    view = 'course';
    lessonIx = Math.max(0, Math.min(i, UNIT1.lessons.length - 1));
    const L = UNIT1.lessons[lessonIx];
    stats.lessonsSeen.add(L.id);
    lessonDone = false;
    subIx = 0;
    clearAdvance();

    // Build the sub-sequence of chords this lesson plays through.
    if (L.kind === 'review') subSeq = L.sequence.map((inv) => ({ inversion: inv, hand: L.hand }));
    else if (L.kind === 'assessment') subSeq = L.sequence.map((s) => ({ ...s }));
    else subSeq = [{ inversion: L.inversion, hand: L.hand }];

    ui.summary.hidden = true;
    ui.lesson.hidden = false;
    ui.explore.hidden = false;
    ui.explore.open = false;

    // Teach
    ui.eyebrow.textContent = `Unit 1 \u00b7 ${UNIT1.title} \u00b7 Lesson ${L.id} of ${UNIT1.lessons.length}`;
    ui.teach.replaceChildren(...(L.teach || []).map((line) => { const p = el('p'); p.textContent = line; return p; }));
    ui.progress.textContent = `Lesson ${L.id} of ${UNIT1.lessons.length}`;

    showSpec(subSeq[0], L);
    setPrimary(L);
  }

  // Render + arm one chord (Show + Shape + Try).
  function showSpec(spec, L) {
    const chord = buildChord({ rootPc: UNIT1.rootPc, quality: UNIT1.quality, inversion: spec.inversion, hand: spec.hand });
    expectedSet = new Set(chord.midis);
    const names = chord.midis.map((m) => noteName(m, { accidental: pref }));
    const staffFingers = triadFingering(spec.hand).map((f) => (f === 1 ? 1 : null));

    staff.setChord(names, { fingers: staffFingers, clef: clefForHand(spec.hand) });
    const map = new Map(); chord.midis.forEach((m, i) => map.set(m, i));
    evaluator.attachStaff(staff, map);
    evaluator.setExpected(chord.midis);

    for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    viewport.frame(chord.midis);
    keyboard.highlight(chord.midis, 'target');
    keyboard.highlight([chord.rootMidi], 'root');

    const sym = chordSymbol(ROOT_NAMES[chord.rootPc], UNIT1.quality);
    ui.title.textContent = `${sym} - ${invLabel(spec.inversion).toLowerCase()} \u00b7 ${handWord(spec.hand)}`;
    ui.symbol.textContent = sym;
    ui.invlabel.textContent = invLabel(spec.inversion);
    ui.finger.textContent = fingeringText(spec.hand);
    ui.prompt.textContent = `Play ${sym} - ${invLabel(spec.inversion).toLowerCase()} - ${handWord(spec.hand)}.`;
    ui.status.textContent = `Press the ${chord.midis.length} notes together.`;
    ui.status.classList.remove('is-good');
  }

  function setPrimary(L) {
    if (L.kind === 'assessment') { ui.primary.textContent = 'See your review \u203a'; }
    else if (lessonIx >= UNIT1.lessons.length - 1) { ui.primary.textContent = 'Continue \u203a'; }
    else { ui.primary.textContent = 'Continue \u203a'; }
    ui.primary.classList.remove('is-ready');
  }

  /* ---- live feedback (calm, teacher-style) --------------------------- */
  function onProgress() {
    if (evaluator.isComplete) return;
    let correct = 0, wrong = 0;
    for (const m of evaluator.held) (expectedSet.has(m) ? correct++ : wrong++);
    const missing = expectedSet.size - correct;
    ui.status.classList.remove('is-good');
    if (wrong > 0) { ui.status.textContent = 'One of those notes isn\u2019t in the chord - lift it and reshape.'; return; }
    if (missing <= 0) return;
    ui.status.textContent = missing === 1 ? 'One note missing - almost there.' : `${missing} notes to go - sound them together.`;
  }

  function onComplete() {
    if (view !== 'course') {       // explore mode: simple praise, no course advance
      ui.status.textContent = PRAISE[praiseIx % PRAISE.length]; praiseIx++;
      ui.status.classList.add('is-good');
      return;
    }
    stats.completed++;
    const L = UNIT1.lessons[lessonIx];
    ui.status.classList.add('is-good');

    const more = subIx < subSeq.length - 1;
    if ((L.kind === 'review' || L.kind === 'assessment') && more) {
      ui.status.textContent = L.kind === 'review' ? 'Same chord - new shape.' : 'Good - next chord.';
      clearAdvance();
      advanceTimer = setTimeout(() => { subIx++; showSpec(subSeq[subIx], L); }, evaluator.FLASH_MS + 250);
      return;
    }
    // Lesson (or its sub-sequence) finished.
    lessonDone = true;
    ui.status.textContent = L.kind === 'review'
      ? 'All three shapes - well played.'
      : L.kind === 'assessment'
        ? 'Assessment complete. Tap below to see your review.'
        : PRAISE[praiseIx % PRAISE.length];
    praiseIx++;
    ui.primary.classList.add('is-ready');
  }

  function onPrimary() {
    if (view === 'explore') { loadLesson(lessonIx); return; }       // back to the lesson
    if (view === 'summary') { stats.completed = 0; loadLesson(0); return; }
    const L = UNIT1.lessons[lessonIx];
    if (L.kind === 'assessment') { showSummary(); return; }
    if (lessonIx >= UNIT1.lessons.length - 1) { showSummary(); return; }
    loadLesson(lessonIx + 1);
  }

  /* ---- explore (advanced, demoted) ----------------------------------- */
  function enterExplore() {
    view = 'explore';
    clearAdvance();
    ui.summary.hidden = true;
    ui.lesson.hidden = false;
    ui.eyebrow.textContent = 'Free explore';
    ui.teach.replaceChildren((() => { const p = el('p'); p.textContent = 'Exploring freely - pick any root, inversion and hand above.'; return p; })());
    ui.progress.textContent = 'Free explore';
    ui.primary.textContent = '\u2039 Back to the lesson';
    ui.primary.classList.remove('is-ready');
    if (ui.inv) ui.inv.value = sel.inversion;
    // Reuse showSpec, but explore can use any root/quality (single clef by hand).
    const chord = buildChord(sel);
    expectedSet = new Set(chord.midis);
    const names = chord.midis.map((m) => noteName(m, { accidental: pref }));
    const staffFingers = triadFingering(sel.hand).map((f) => (f === 1 ? 1 : null));
    staff.setChord(names, { fingers: staffFingers, clef: clefForHand(sel.hand) });
    const map = new Map(); chord.midis.forEach((m, i) => map.set(m, i));
    evaluator.attachStaff(staff, map);
    evaluator.setExpected(chord.midis);
    for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    viewport.frame(chord.midis);
    keyboard.highlight(chord.midis, 'target');
    keyboard.highlight([chord.rootMidi], 'root');
    const sym = chordSymbol(ROOT_NAMES[chord.rootPc], sel.quality);
    ui.title.textContent = `${sym} - ${invLabel(sel.inversion).toLowerCase()} \u00b7 ${handWord(sel.hand)}`;
    ui.symbol.textContent = sym; ui.invlabel.textContent = invLabel(sel.inversion);
    ui.finger.textContent = fingeringText(sel.hand);
    ui.prompt.textContent = `Play ${sym} - ${invLabel(sel.inversion).toLowerCase()} - ${handWord(sel.hand)}.`;
    ui.status.textContent = `Press the ${chord.midis.length} notes together.`;
    ui.status.classList.remove('is-good');
  }

  /* ---- honest end-of-unit review ------------------------------------- */
  function showSummary() {
    view = 'summary';
    clearAdvance();
    evaluator.clear();
    for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    ui.lesson.hidden = true;
    ui.explore.hidden = true;
    ui.summary.hidden = false;

    const seen = stats.lessonsSeen.size;
    const head = el('div');
    head.innerHTML = `<p class="cmx__eyebrow">Unit 1 \u00b7 ${UNIT1.title}</p>
      <h2 class="cmx__title">Your review</h2>`;
    const body = el('div', { class: 'cmx__reviewbody' });
    // Honest, qualitative — only what we actually observed.
    const lines = [
      `You worked through B major in root position, first inversion and second inversion, in both hands.`,
      `That is the key idea: B major is one harmonic shape that can move \u2014 the same three notes (B, D\u266F, F\u266F) seen from three positions.`,
      `Chords completed this run: ${stats.completed}. Lessons visited: ${seen} of ${UNIT1.lessons.length}.`,
      `Next, keep returning to these shapes until your hand finds them without searching. Fuller teacher-style feedback (hand shape, inversion awareness, fluency) will arrive once the module tracks those over time.`,
    ];
    body.replaceChildren(...lines.map((t) => { const p = el('p'); p.textContent = t; return p; }));
    ui.summary.replaceChildren(head, body);

    ui.progress.textContent = 'Unit complete';
    ui.primary.textContent = 'Practise again \u203a';
    ui.primary.classList.add('is-ready');
  }

  function clearAdvance() { if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; } }

  /* ---- view lifecycle ------------------------------------------------ */
  return {
    enter() {
      if (!built) build();
      globalEvaluator?.clearExpected?.();            // keep Scales/SR evaluator disarmed here
      loadLesson(lessonIx);
    },
    exit() {
      clearAdvance();
      evaluator.clear();
      staff.clearMarks();
      for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    },
    destroy() {
      clearAdvance();
      for (const off of offs) off?.();
      evaluator.destroy();
    },
  };
}

/* ===========================================================================
 * FUTURE — Chord Masterclass Practice Review (reserved, educational only).
 * Calm, teacher-style dimensions to surface once the module tracks them over
 * time (never game stats): Chord Recognition · Chord Spelling · Hand Shape ·
 * Inversion Awareness · Fingering Confidence · Left-Hand Fluency ·
 * Right-Hand Fluency · Harmonic Understanding. Phase 2 deliberately shows only
 * an honest qualitative summary (chords completed / lessons visited) rather than
 * inventing per-dimension scores.
 * ========================================================================= */

/* ===========================================================================
 * Small DOM helpers (local — mirrors the other controllers' style)
 * ========================================================================= */
function el(tag, props = {}) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k === 'class' ? (n.className = v) : n.setAttribute(k, v);
  return n;
}
function select(options, value, onChange) {
  const s = el('select', { class: 'cmx__select' });
  for (const opt of options) {
    const [val, label, disabled] = opt;
    const o = el('option'); o.value = val; o.textContent = label;
    if (disabled) o.disabled = true;
    if (val === value) o.selected = true;
    s.appendChild(o);
  }
  s.addEventListener('change', (e) => onChange(e.target.value));
  return s;
}
function labeled(label, control) {
  const wrap = el('label', { class: 'cmx__field' });
  const span = el('span', { class: 'cmx__fieldlabel' }); span.textContent = label;
  wrap.append(span, control);
  return wrap;
}

function injectStyles() {
  if (document.getElementById('cmx-styles')) return;
  const s = document.createElement('style');
  s.id = 'cmx-styles';
  s.textContent = `
    .cmx{display:flex;flex-direction:column;gap:.55rem;padding-bottom:.4rem}
    .cmx__eyebrow{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.1em;
      text-transform:uppercase;color:var(--brass-bright);margin:0}
    .cmx__title{font-family:var(--font-display);font-size:var(--step-lg,1.5rem);color:var(--ivory);margin:.1rem 0 .2rem}
    .cmx__teach{display:flex;flex-direction:column;gap:.35rem;margin:.1rem 0 .3rem}
    .cmx__teach p{margin:0;font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory);line-height:1.5}
    .cmx__panel{margin:.1rem 0}
    .cmx__band{display:flex;flex-wrap:wrap;align-items:baseline;gap:.4rem .9rem}
    .cmx__symbol{font-family:var(--font-display);font-size:var(--step-xl);font-weight:600;color:var(--ivory)}
    .cmx__invlabel{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.08em;
      text-transform:uppercase;color:var(--brass-bright)}
    .cmx__finger{font-size:var(--step-xs);color:var(--ivory-dim);margin-left:auto}
    .cmx__prompt{margin:.1rem 0 0;font-family:var(--font-display);font-size:var(--step-md,1.15rem);color:var(--ivory)}
    .cmx__status{margin:.1rem 0 0;font-size:var(--step-sm);color:var(--ivory-dim);min-height:1.2em}
    .cmx__status.is-good{color:var(--good,#6FB59A)}
    .cmx__reviewbody{display:flex;flex-direction:column;gap:.55rem;margin-top:.5rem;max-width:640px}
    .cmx__reviewbody p{margin:0;font-family:var(--font-sans);font-size:var(--step-sm);color:var(--ivory);line-height:1.55}
    /* Demoted advanced selectors */
    .cmx__explore{border:1px solid var(--ebony-edge);border-radius:var(--radius-md,8px);padding:.2rem .6rem;background:#211F29}
    .cmx__exsummary{cursor:pointer;font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.06em;
      text-transform:uppercase;color:var(--ivory-faint);padding:.45rem 0}
    .cmx__controls{display:flex;flex-wrap:wrap;gap:.6rem;padding:.2rem 0 .5rem}
    .cmx__field{display:flex;flex-direction:column;gap:.25rem}
    .cmx__fieldlabel{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.08em;text-transform:uppercase;color:var(--ivory-faint)}
    .cmx__select{background:#24222D;color:var(--ivory);border:1px solid var(--ebony-edge);
      border-radius:var(--radius-md,8px);padding:8px 10px;font-size:var(--step-sm);min-width:8.5rem}
    .cmx__exnote{margin:0 0 .4rem;font-size:var(--step-xs);color:var(--ivory-faint)}
    /* Sticky action bar — always reachable above the keyboard footer */
    .cmx__actionbar{position:sticky;bottom:0;z-index:2;display:flex;align-items:center;gap:.8rem;
      margin-top:.2rem;padding:.6rem .2rem;background:linear-gradient(to top,var(--ebony,#1A1820) 70%,transparent);
      backdrop-filter:blur(2px)}
    .cmx__progresstext{font-family:var(--font-mono);font-size:var(--step-xs);color:var(--ivory-faint);letter-spacing:.05em}
    .cmx__primary{margin-left:auto;background:color-mix(in srgb,var(--brass) 18%,#24222D);color:var(--ivory);
      border:1px solid var(--brass);border-radius:999px;padding:10px 22px;font-size:var(--step-sm);
      font-family:var(--font-sans);cursor:pointer;transition:transform .12s ease,box-shadow .12s ease}
    .cmx__primary.is-ready{box-shadow:0 0 0 3px color-mix(in srgb,var(--good,#6FB59A) 35%,transparent)}
    .cmx__primary:active{transform:translateY(1px)}
    @media (max-width:720px){
      .cmx__finger{margin-left:0;flex-basis:100%}
      .cmx__select{min-width:0;flex:1 1 44%}
    }
  `;
  document.head.appendChild(s);
}
