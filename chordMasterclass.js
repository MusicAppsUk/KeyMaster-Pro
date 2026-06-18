// chordMasterclass.js
//
// Chord Masterclass — ACTIVE GUIDED TRAINER (Phase 2 / rc2-26).
//
// Each chord shape is a short ACTION SEQUENCE, not a static card:
//   Teach/Demonstrate -> Follow Me -> Try Yourself  (then Review -> Assess -> Unit Review)
// The cards always lead into PLAYING: the primary button stays VISIBLE throughout
// (no hidden NEXT) but is disabled on an active step until the learner has actually
// played the chord; a subtle "Skip for now" is the secondary escape so nobody is
// trapped (guided, not gated). The advanced Root/Quality/Inversion/Hand selectors
// remain, demoted into a collapsed "Free explore".
//
// Support gradient: Follow Me = full (whole shape lit) -> Try Yourself = partial
// (root anchor only; learner RECALLS the rest) -> Assess = reduced (nothing lit).
// Accessibility: large readable text, >=44px touch targets, a sticky cockpit
// heading, an aria-live status so feedback is never colour-only.
//
// Reuses stable infrastructure UNCHANGED:
//   • chordEngine.buildChord / chordSymbol  — MIDI set + symbol per inversion/hand
//   • chordEvaluator                         — set-membership checker on the shared
//                                              NoteInput hub (MIDI + on-screen); its
//                                              `progress` events + `held` set drive
//                                              Follow Me; green/red paint is reused.
//   • staffView.setChord({clef})             — opt-in single clef: RH->treble, LH->bass
//                                              (default 'grand' elsewhere).
//   • keyboard.highlight                     — target/root decoration + demonstrate.
// The single-note midiEvaluator, Event Bridge, and progression gating are NOT used.
//
// Review is honest: only data we actually observe (chords completed, clean vs.
// retried) is summarised — no invented per-dimension scores.
//
// Lazily loaded by app.js. Default-exports createView(ctx) -> { enter, exit, destroy }.

import { createStaffView } from './staffView.js';
import { noteName, SHARP_NAMES, FLAT_NAMES } from './notes.js';
import { buildChord, chordSymbol, INVERSIONS } from './chordEngine.js';
import { createChordEvaluator } from './chordEvaluator.js';
import { UNIT1 } from './chordCourse.js';

const QUALITY_OPTIONS = [['major', 'Major']];          // Phase 2: major triads only
const HAND_OPTIONS = [['RH', 'Right hand'], ['LH', 'Left hand'], ['BOTH', 'Both hands - later', true]];
const PRAISE = ['Yes - that\u2019s it.', 'Correct - nicely shaped.', 'Excellent recognition.', 'Confidently played.'];
const FINGER_WORD = { 1: 'thumb', 2: 'index finger', 3: 'middle finger', 4: 'ring finger', 5: 'little finger' };

function triadFingering(hand) { return hand === 'LH' ? [5, 3, 1] : [1, 3, 5]; }   // low -> high
function fingeringText(hand) {
  return hand === 'LH'
    ? 'Recommended fingering - LH: 5 \u00b7 3 \u00b7 1 (little finger on the low note)'
    : 'Recommended fingering - RH: 1 \u00b7 3 \u00b7 5 (thumb on the low note)';
}
function clefForHand(hand) { return hand === 'LH' ? 'bass' : 'treble'; }   // BOTH (later) -> grand
function handWord(hand) { return hand === 'LH' ? 'left hand' : 'right hand'; }
function invLabel(inv) { const f = INVERSIONS.find(([v]) => v === inv); return f ? f[1] : 'Root position'; }
function modeLabel(kind) {
  return { teach: 'Teach', followme: 'Follow Me', try: 'Try Yourself', review: 'Review', assess: 'Assessment', unitreview: 'Unit Review' }[kind] || '';
}
function shapeLabel(s) { return `${invLabel(s.inversion).toLowerCase()}, ${handWord(s.hand)}`; }
function cap(t) { return t ? t[0].toUpperCase() + t.slice(1) : t; }

export default function createView(ctx) {
  const { mount, keyboard, viewport, input, evaluator: globalEvaluator } = ctx;
  const pref = keyboard && keyboard.accidental === 'flat' ? 'flat' : 'sharp';
  const ROOT_NAMES = pref === 'flat' ? FLAT_NAMES : SHARP_NAMES;
  const ROOT_OPTIONS = ROOT_NAMES.map((n, pc) => [String(pc), n]);

  // ---- state -----------------------------------------------------------
  let view = 'course';                 // 'course' | 'explore' | 'summary'
  let stepIx = 0;                      // index into UNIT1.steps
  let kind = 'teach';
  let subSeq = [];                     // [{inversion, hand}] for review/assess (else single)
  let subIx = 0;
  let stepDone = false;
  let praiseIx = 0;
  let advanceTimer = null;
  let demoToken = 0;
  let expectedSet = new Set();
  let chordMidis = [];
  let wrongThisChord = false;
  let currentStepId = 1;               // for the unified cockpit heading
  let cockpitMode = 'Teach';
  const sel = { rootPc: 11, quality: 'major', inversion: 'root', hand: 'RH' };  // explore
  // Honest behaviour tracking — only what we actually observe, per chord shape.
  const shapeStats = new Map();   // `${inversion}:${hand}` -> {inversion,hand,completed,clean,retried,skipped}
  function shapeRec(spec) {
    const k = `${spec.inversion}:${spec.hand}`;
    let r = shapeStats.get(k);
    if (!r) { r = { inversion: spec.inversion, hand: spec.hand, completed: 0, clean: 0, retried: 0, skipped: 0 }; shapeStats.set(k, r); }
    return r;
  }

  const staff = createStaffView({ compact: false });
  const evaluator = createChordEvaluator({ input, keyboard });
  const ui = {};
  let built = false;
  const offs = [];

  /* ---- build (once) -------------------------------------------------- */
  function build() {
    injectStyles();
    const root = el('div', { class: 'cmx' });

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
    ui.step = el('p', { class: 'cmx__steptag' });        // e.g. "Follow me"
    ui.prompt = el('p', { class: 'cmx__prompt' });
    ui.status = el('p', { class: 'cmx__status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    ui.lesson.append(ui.eyebrow, ui.title, ui.teach, ui.panel, ui.band, ui.step, ui.prompt, ui.status);

    ui.summary = el('div', { class: 'cmx__summary' });
    ui.summary.hidden = true;

    // Free explore (advanced) — demoted selectors
    ui.explore = el('details', { class: 'cmx__explore' });
    const sm = el('summary', { class: 'cmx__exsummary' }); sm.textContent = 'Free explore (advanced)';
    const controls = el('div', { class: 'cmx__controls' });
    ui.root_ = select(ROOT_OPTIONS, String(sel.rootPc), (v) => { sel.rootPc = Number(v); enterExplore(); });
    ui.qual = select(QUALITY_OPTIONS, sel.quality, (v) => { sel.quality = v; enterExplore(); });
    ui.inv = select(INVERSIONS, sel.inversion, (v) => { sel.inversion = v; enterExplore(); });
    ui.hand = select(HAND_OPTIONS, sel.hand, (v) => { if (v === 'BOTH') { ui.hand.value = sel.hand; return; } sel.hand = v; enterExplore(); });
    controls.append(labeled('Root', ui.root_), labeled('Quality', ui.qual), labeled('Inversion', ui.inv), labeled('Hand', ui.hand));
    const exNote = el('p', { class: 'cmx__exnote' });
    exNote.textContent = 'Pick any chord to explore freely. Use Back to the lesson to return to the course.';
    ui.explore.append(sm, controls, exNote);

    // Sticky action bar — always visible above the keyboard
    ui.actionbar = el('div', { class: 'cmx__actionbar' });
    ui.progress = el('span', { class: 'cmx__progresstext' });
    ui.skip = el('button', { class: 'cmx__skip', type: 'button' });
    ui.skip.textContent = 'Skip for now';
    ui.skip.addEventListener('click', onSkip);
    ui.primary = el('button', { class: 'cmx__primary', type: 'button' });
    ui.primary.addEventListener('click', onPrimary);
    ui.actionbar.append(ui.progress, ui.skip, ui.primary);

    root.append(ui.lesson, ui.summary, ui.explore, ui.actionbar);
    mount.replaceChildren(root);
    built = true;

    offs.push(evaluator.on('complete', onComplete));
    offs.push(evaluator.on('progress', onProgress));
  }

  /* ---- step loading -------------------------------------------------- */
  function loadStep(i) {
    view = 'course';
    clearAdvance();
    demoToken++;
    stepIx = Math.max(0, Math.min(i, UNIT1.steps.length - 1));
    const S = UNIT1.steps[stepIx];
    kind = S.kind;
    stepDone = false;
    subIx = 0;
    currentStepId = S.id;
    cockpitMode = modeLabel(kind);

    if (kind === 'unitreview') { showSummary(); return; }

    ui.summary.hidden = true;
    ui.lesson.hidden = false;
    ui.explore.hidden = false; ui.explore.open = false;

    if (kind === 'review') subSeq = S.sequence.map((inv) => ({ inversion: inv, hand: S.hand }));
    else if (kind === 'assess') subSeq = S.sequence.map((s) => ({ ...s }));
    else subSeq = [{ inversion: S.inversion, hand: S.hand }];

    // The unified cockpit line (unit · step · mode · chord · inversion · hand) is
    // set in showSpec, where the current chord spec is known (it also keeps the line
    // accurate as review/assess advance through their sub-chords).
    ui.progress.textContent = `Step ${S.id} of 21`;
    ui.teach.replaceChildren(...((S.teach || []).map((line) => { const p = el('p'); p.textContent = line; return p; })));

    const support = kind === 'assess' ? 'reduced' : kind === 'try' ? 'partial' : 'full';
    showSpec(subSeq[0], support);

    // Step tag + how the action bar behaves per kind.
    if (kind === 'teach') {
      ui.step.textContent = 'Teach \u00b7 watch';
      demonstrate();
      setAction({ primary: 'Let\u2019s try it \u203a', primaryReady: true, skip: false });
    } else if (kind === 'followme') {
      ui.step.textContent = 'Follow me \u00b7 one note at a time';
      followMeUpdate();
      setAction({ primary: 'Next \u203a', primaryReady: false, skip: true });
    } else if (kind === 'try') {
      ui.step.textContent = 'Try yourself';
      ui.prompt.textContent = `Play ${promptName(subSeq[0])} - all notes together.`;
      ui.status.textContent = 'Only the root note is marked - recall the full shape and play it.';
      setAction({ primary: 'Continue \u203a', primaryReady: false, skip: true });
    } else if (kind === 'review') {
      ui.step.textContent = 'Review \u00b7 same chord, three shapes';
      setAction({ primary: 'Continue \u203a', primaryReady: false, skip: true });
    } else if (kind === 'assess') {
      ui.step.textContent = 'Assessment \u00b7 fewer hints';
      setAction({ primary: 'See your review \u203a', primaryReady: false, skip: true });
    }
  }

  // Arm one chord and render Show + Shape. support 'reduced' hides the keyboard
  // target highlight (recognition with less help); staff still shown.
  function showSpec(spec, support = 'full') {
    const chord = buildChord({ rootPc: UNIT1.rootPc, quality: UNIT1.quality, inversion: spec.inversion, hand: spec.hand });
    chordMidis = chord.midis.slice();
    expectedSet = new Set(chord.midis);
    wrongThisChord = false;
    const names = chord.midis.map((m) => noteName(m, { accidental: pref }));
    const staffFingers = triadFingering(spec.hand).map((f) => (f === 1 ? 1 : null));

    staff.setChord(names, { fingers: staffFingers, clef: clefForHand(spec.hand) });
    const map = new Map(); chord.midis.forEach((m, i) => map.set(m, i));
    evaluator.attachStaff(staff, map);
    evaluator.setExpected(chord.midis);

    for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    viewport.frame(chord.midis);
    // Support gradient:
    //   full    = Follow Me / Teach / Review — whole shape lit (supported construction)
    //   partial = Try Yourself — only the root anchor lit; the learner RECALLS the rest
    //   reduced = Assess — nothing lit; recognise from the staff + chord name
    if (support === 'full') {
      keyboard.highlight(chord.midis, 'target');
      keyboard.highlight([chord.rootMidi], 'root');
    } else if (support === 'partial') {
      keyboard.highlight([chord.rootMidi], 'root');
    }

    const sym = chordSymbol(ROOT_NAMES[chord.rootPc], UNIT1.quality);
    ui.title.textContent = `${sym} - ${invLabel(spec.inversion).toLowerCase()} \u00b7 ${handWord(spec.hand)}`;
    ui.symbol.textContent = sym;
    ui.invlabel.textContent = invLabel(spec.inversion);
    ui.finger.textContent = fingeringText(spec.hand);
    // Unified "lesson cockpit" heading: one authoritative orientation line.
    ui.eyebrow.textContent = `Unit 1 \u00b7 Step ${currentStepId} of 21 \u00b7 ${cockpitMode} \u00b7 `
      + `${ROOT_NAMES[chord.rootPc]} major \u00b7 ${invLabel(spec.inversion).toLowerCase()} \u00b7 ${handWord(spec.hand)}`;
    setStatusState('');
  }

  function promptName(spec) {
    const sym = chordSymbol(ROOT_NAMES[UNIT1.rootPc], UNIT1.quality);
    return `${sym} - ${invLabel(spec.inversion).toLowerCase()} - ${handWord(spec.hand)}`;
  }

  /* ---- Demonstrate (folded into Teach) ------------------------------- */
  function demonstrate() {
    const spec = subSeq[0];
    const names = chordMidis.map((m) => noteName(m, { accidental: pref }));
    const fng = triadFingering(spec.hand);
    const token = demoToken;
    ui.prompt.textContent = `Watch the shape build: ${names.join(' \u2192 ')}.`;
    let i = 0;
    const stepDemo = () => {
      if (token !== demoToken) return;                 // cancelled by advancing
      for (const v of ['target', 'root']) keyboard.clearHighlight(v);
      keyboard.highlight(chordMidis.slice(0, i + 1), 'target');
      ui.status.textContent = `${FINGER_WORD[fng[i]] || 'finger'} on ${names[i]}`;
      i++;
      if (i < chordMidis.length) { advanceTimer = setTimeout(stepDemo, 650); }
      else {
        advanceTimer = setTimeout(() => {
          if (token !== demoToken) return;
          keyboard.highlight(chordMidis, 'target');
          keyboard.highlight([chordMidis[0]], 'root');
          ui.status.textContent = 'That is the shape. Tap \u201cLet\u2019s try it\u201d to play it yourself.';
        }, 650);
      }
    };
    stepDemo();
  }

  /* ---- Follow Me (note-by-note, driven by evaluator progress) -------- */
  function followMeUpdate() {
    const spec = subSeq[subIx];
    const fng = triadFingering(spec.hand);
    const held = evaluator.held || new Set();
    const wrong = [...held].some((m) => !expectedSet.has(m));
    if (wrong) { setStatusState('warn'); ui.status.textContent = 'Check this note - it is not part of the chord. Lift it gently and keep the others down.'; return; }
    // ascending expected; find first not yet held
    let nextI = chordMidis.findIndex((m) => !held.has(m));
    const names = chordMidis.map((m) => noteName(m, { accidental: pref }));
    setStatusState('');
    if (nextI === -1) return;                            // all down -> onComplete handles it
    const fw = FINGER_WORD[fng[nextI]] || 'finger';
    if (nextI === 0) ui.prompt.textContent = `Place your ${fw} on ${names[0]}.`;
    else ui.prompt.textContent = `Good. Now add ${names[nextI]} (${fw}).`;
    const downCount = chordMidis.filter((m) => held.has(m)).length;
    ui.status.textContent = downCount === 0 ? 'Press and hold the note.' : `Holding ${downCount} of ${chordMidis.length} - keep them down.`;
  }

  /* ---- live feedback ------------------------------------------------- */
  function onProgress() {
    if (view !== 'course') return;
    if (!evaluator.isComplete) {
      const held = evaluator.held || new Set();
      if ([...held].some((m) => !expectedSet.has(m)) && !wrongThisChord) { wrongThisChord = true; }
    }
    if (kind === 'followme') { if (!evaluator.isComplete) followMeUpdate(); return; }
    // try / review / assess: simple guidance
    if (evaluator.isComplete) return;
    let correct = 0, wrong = 0;
    for (const m of (evaluator.held || new Set())) (expectedSet.has(m) ? correct++ : wrong++);
    const missing = expectedSet.size - correct;
    if (wrong > 0) { setStatusState('warn'); ui.status.textContent = 'Check this note - it is not part of the chord. Lift it and reshape.'; return; }
    setStatusState('');
    if (missing > 0) ui.status.textContent = missing === 1 ? 'One note missing - almost there.' : `${missing} notes to go - sound them together.`;
  }

  function onComplete() {
    if (view !== 'course') { ui.status.textContent = PRAISE[praiseIx++ % PRAISE.length]; setStatusState('good'); return; }
    const S = UNIT1.steps[stepIx];
    setStatusState('good');
    // Record only playable steps (not the watch-only Teach card).
    if (kind !== 'teach') {
      const rec = shapeRec(subSeq[subIx]);
      rec.completed++;
      if (wrongThisChord) rec.retried++; else rec.clean++;
    }

    const more = subIx < subSeq.length - 1;
    if ((kind === 'review' || kind === 'assess') && more) {
      ui.status.textContent = kind === 'review' ? 'Same chord - new shape.' : 'Good - next chord.';
      clearAdvance();
      advanceTimer = setTimeout(() => { subIx++; showSpec(subSeq[subIx], kind === 'assess' ? 'reduced' : 'full'); if (kind === 'review') ui.prompt.textContent = `Play ${promptName(subSeq[subIx])}.`; }, evaluator.FLASH_MS + 250);
      return;
    }

    stepDone = true;
    if (kind === 'followme') ui.status.textContent = 'That is the full chord - B major, well shaped.';
    else if (kind === 'try') ui.status.textContent = PRAISE[praiseIx++ % PRAISE.length];
    else if (kind === 'review') ui.status.textContent = 'All three shapes - well played.';
    else if (kind === 'assess') ui.status.textContent = 'Assessment complete. Tap below to see your review.';
    else if (kind === 'teach') { ui.status.textContent = 'That is it. Tap \u201cLet\u2019s try it\u201d to continue.'; return; }
    enablePrimary();
    ui.skip.hidden = true;
  }
  // Primary stays VISIBLE throughout (no hidden NEXT button); it simply becomes
  // enabled + highlighted once the step's action is done.
  function enablePrimary() {
    ui.primary.disabled = false;
    ui.primary.setAttribute('aria-disabled', 'false');
    ui.primary.classList.add('is-ready');
  }

  /* ---- advancing ----------------------------------------------------- */
  function onPrimary() {
    if (view === 'explore') { loadStep(stepIx); return; }
    if (view === 'summary') { resetStats(); loadStep(0); return; }
    if (kind === 'assess') { loadStep(findUnitReview()); return; }
    loadStep(stepIx + 1);
  }
  function onSkip() {
    if (view !== 'course') return;
    if (kind !== 'teach' && subSeq[subIx]) shapeRec(subSeq[subIx]).skipped++;   // honest: record skips
    loadStep(stepIx + 1);
  }
  function findUnitReview() { return UNIT1.steps.findIndex((s) => s.kind === 'unitreview'); }

  function setAction({ primary, primaryReady, skip }) {
    ui.primary.textContent = primary;
    ui.primary.hidden = false;                         // never hidden — accessibility: no hidden NEXT
    ui.primary.disabled = !primaryReady;               // active steps: visible but disabled until played
    ui.primary.setAttribute('aria-disabled', String(!primaryReady));
    ui.primary.classList.toggle('is-ready', !!primaryReady);
    ui.skip.hidden = !skip;
  }

  /* ---- explore (advanced, demoted) ----------------------------------- */
  function enterExplore() {
    view = 'explore';
    clearAdvance(); demoToken++;
    ui.summary.hidden = true; ui.lesson.hidden = false;
    ui.eyebrow.textContent = 'Free explore';
    ui.step.textContent = 'Free explore';
    ui.teach.replaceChildren((() => { const p = el('p'); p.textContent = 'Exploring freely - pick any root, inversion and hand above, then play it.'; return p; })());
    ui.progress.textContent = 'Free explore';
    ui.primary.textContent = '\u2039 Back to the lesson'; ui.primary.hidden = false; ui.primary.disabled = false; ui.primary.setAttribute('aria-disabled', 'false'); ui.primary.classList.remove('is-ready');
    ui.skip.hidden = true;
    if (ui.inv) ui.inv.value = sel.inversion;
    subSeq = [{ inversion: sel.inversion, hand: sel.hand }];
    // explore can use any root/quality
    const chord = buildChord(sel);
    chordMidis = chord.midis.slice(); expectedSet = new Set(chord.midis); wrongThisChord = false;
    const names = chord.midis.map((m) => noteName(m, { accidental: pref }));
    const staffFingers = triadFingering(sel.hand).map((f) => (f === 1 ? 1 : null));
    staff.setChord(names, { fingers: staffFingers, clef: clefForHand(sel.hand) });
    const map = new Map(); chord.midis.forEach((m, i) => map.set(m, i));
    evaluator.attachStaff(staff, map); evaluator.setExpected(chord.midis);
    for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    viewport.frame(chord.midis); keyboard.highlight(chord.midis, 'target'); keyboard.highlight([chord.rootMidi], 'root');
    const sym = chordSymbol(ROOT_NAMES[chord.rootPc], sel.quality);
    ui.title.textContent = `${sym} - ${invLabel(sel.inversion).toLowerCase()} \u00b7 ${handWord(sel.hand)}`;
    ui.symbol.textContent = sym; ui.invlabel.textContent = invLabel(sel.inversion); ui.finger.textContent = fingeringText(sel.hand);
    ui.prompt.textContent = `Play ${sym} - ${invLabel(sel.inversion).toLowerCase()} - ${handWord(sel.hand)}.`;
    ui.status.textContent = `Press the ${chord.midis.length} notes together.`; setStatusState('');
  }

  /* ---- honest, teacher-style end-of-unit review ---------------------- */
  function showSummary() {
    view = 'summary';
    clearAdvance(); demoToken++;
    evaluator.clear();
    for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    ui.lesson.hidden = true; ui.explore.hidden = true; ui.summary.hidden = false;

    const head = el('div');
    head.innerHTML = `<p class="cmx__eyebrow">Unit 1 \u00b7 ${UNIT1.title}</p><h2 class="cmx__title">Your review</h2>`;
    const body = el('div', { class: 'cmx__reviewbody' });

    const shapes = [...shapeStats.values()];
    const completed = shapes.reduce((a, s) => a + s.completed, 0);
    const clean = shapes.reduce((a, s) => a + s.clean, 0);
    const retriedShapes = shapes.filter((s) => s.retried > 0).sort((a, b) => b.retried - a.retried);
    const skippedShapes = shapes.filter((s) => s.skipped > 0 && s.clean === 0);

    const lines = [];          // {text, cls?} — cls accents the recommendation line
    lines.push({ text: 'You worked through B major across its inversions and hands - one chord (B, D\u266F, F\u266F) that keeps its identity as it moves.' });
    if (completed === 0 && skippedShapes.length === 0) {
      lines.push({ text: 'No chords were completed yet. Tap Practise again and play each shape when prompted - Follow Me will guide your hand.' });
    } else {
      lines.push({ text: `Chords played: ${completed}. Played cleanly on the first attempt: ${clean} of ${completed}.` });
      // One clear, honest "what to practise next" — drawn only from observed behaviour.
      // Palette as teaching language: emerald = secure, amber = developing, rose = needs attention.
      if (skippedShapes.length) {
        lines.push({ text: `You skipped ${shapeLabel(skippedShapes[0])}. Return to it next - it is worth meeting properly.`, cls: 'cmx__rec is-attention' });
      } else if (retriedShapes.length) {
        const s = retriedShapes[0];
        lines.push({ text: `${cap(shapeLabel(s))} needed the most retries (${s.retried}). Make that your next focus - slowly, building it note by note in Follow Me.`, cls: 'cmx__rec is-developing' });
      } else {
        lines.push({ text: 'Every shape you played was secure on the first attempt - strong recognition. Keep them warm with the occasional return.', cls: 'cmx__rec is-secure' });
      }
    }
    lines.push({ text: 'This review reflects only what was observed - chords completed, clean vs. retried, and skips. Deeper measures like hand posture, fluency and timing will appear once they are genuinely tracked, never invented.' });
    body.replaceChildren(...lines.map(({ text, cls }) => { const p = el('p', cls ? { class: cls } : {}); p.textContent = text; return p; }));
    ui.summary.replaceChildren(head, body);

    ui.progress.textContent = 'Unit complete';
    ui.primary.textContent = 'Practise again \u203a'; ui.primary.hidden = false; ui.primary.disabled = false; ui.primary.setAttribute('aria-disabled', 'false'); ui.primary.classList.add('is-ready');
    ui.skip.hidden = true;
  }

  function resetStats() { shapeStats.clear(); }
  function clearAdvance() { if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; } }
  // Feedback state: success glows (emerald + check); correction guides (soft rose +
  // outline marker). Glyphs are a non-colour cue (accessibility), set via CSS ::before.
  function setStatusState(s) {
    ui.status.classList.remove('is-good', 'is-warn');
    if (s === 'good') ui.status.classList.add('is-good');
    else if (s === 'warn') ui.status.classList.add('is-warn');
  }

  /* ---- lifecycle ----------------------------------------------------- */
  return {
    enter() {
      if (!built) build();
      globalEvaluator?.clearExpected?.();
      loadStep(stepIx);
    },
    exit() {
      clearAdvance(); demoToken++;
      evaluator.clear(); staff.clearMarks();
      for (const v of ['target', 'root', 'match', 'mismatch']) keyboard.clearHighlight(v);
    },
    destroy() { clearAdvance(); for (const off of offs) off?.(); evaluator.destroy(); },
  };
}

/* ===========================================================================
 * FUTURE — Chord Masterclass Practice Review (reserved, educational only).
 * Dimensions to surface once genuinely tracked (never game stats): Hand Shape,
 * Fingering Confidence, Harmonic Understanding, Timing. rc2-28 reports only
 * observed behaviour per shape: chords completed, clean vs. retried, and skips,
 * with one honest "what to practise next" recommendation derived from those.
 * ========================================================================= */

/* ---- small DOM helpers (local) ---------------------------------------- */
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
    .cmx{display:flex;flex-direction:column;gap:.5rem;padding-bottom:.4rem}
    .cmx__eyebrow{position:sticky;top:0;z-index:3;font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.08em;
      text-transform:uppercase;color:var(--brass-bright);margin:0;padding:.4rem 0 .3rem;
      background:linear-gradient(to bottom,var(--ebony,#1A1820) 72%,transparent)}
    .cmx__title{font-family:var(--font-display);font-size:var(--step-lg,1.5rem);color:var(--ivory);margin:.1rem 0 .2rem}
    .cmx__teach{display:flex;flex-direction:column;gap:.4rem;margin:.1rem 0 .3rem}
    .cmx__teach p{margin:0;font-family:var(--font-sans);font-size:var(--step-md,1.05rem);color:var(--ivory);line-height:1.55}
    .cmx__panel{margin:.1rem 0}
    .cmx__band{display:flex;flex-wrap:wrap;align-items:baseline;gap:.4rem .9rem}
    .cmx__symbol{font-family:var(--font-display);font-size:var(--step-xl);font-weight:600;color:var(--ivory)}
    .cmx__invlabel{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.08em;text-transform:uppercase;color:var(--brass-bright)}
    .cmx__finger{font-size:var(--step-sm);color:var(--ivory-dim);margin-left:auto}
    .cmx__steptag{margin:.2rem 0 0;font-family:var(--font-mono);font-size:var(--step-sm);letter-spacing:.08em;text-transform:uppercase;color:var(--good,#6FB59A)}
    .cmx__prompt{margin:.05rem 0 0;font-family:var(--font-display);font-size:var(--step-lg,1.35rem);color:var(--ivory);line-height:1.4}
    .cmx__status{margin:.15rem 0 0;font-size:var(--step-md,1.05rem);color:var(--ivory-dim);min-height:1.4em;line-height:1.45}
    /* Success glows (emerald + check). Correction guides (soft rose + outline mark).
       Glyphs are a non-colour cue; success is intentionally more luminous than error. */
    .cmx__status.is-good{color:var(--emerald,#46C08A);text-shadow:0 0 14px var(--emerald-glow,rgba(70,192,138,.45))}
    .cmx__status.is-good::before{content:"\u2713\u00A0\u00A0";font-weight:700}
    .cmx__status.is-warn{color:var(--rose,#D98A92)}
    .cmx__status.is-warn::before{content:"\u25CB\u00A0\u00A0";font-weight:600;opacity:.85}
    .cmx__reviewbody{display:flex;flex-direction:column;gap:.6rem;margin-top:.5rem;max-width:640px}
    .cmx__reviewbody p{margin:0;font-family:var(--font-sans);font-size:var(--step-md,1.05rem);color:var(--ivory);line-height:1.6}
    .cmx__rec{font-weight:600}
    .cmx__rec.is-secure{color:var(--emerald,#46C08A)}
    .cmx__rec.is-developing{color:var(--amber,#E0A94B)}
    .cmx__rec.is-attention{color:var(--rose,#D98A92)}
    .cmx__explore{border:1px solid var(--ebony-edge);border-radius:var(--radius-md,8px);padding:.2rem .6rem;background:#211F29}
    .cmx__exsummary{cursor:pointer;font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.06em;text-transform:uppercase;color:var(--ivory-faint);padding:.6rem 0;min-height:44px;display:flex;align-items:center}
    .cmx__controls{display:flex;flex-wrap:wrap;gap:.6rem;padding:.2rem 0 .5rem}
    .cmx__field{display:flex;flex-direction:column;gap:.25rem}
    .cmx__fieldlabel{font-family:var(--font-mono);font-size:var(--step-xs);letter-spacing:.08em;text-transform:uppercase;color:var(--ivory-faint)}
    .cmx__select{background:#24222D;color:var(--ivory);border:1px solid var(--ebony-edge);border-radius:var(--radius-md,8px);padding:10px 12px;font-size:var(--step-sm);min-width:8.5rem;min-height:44px}
    .cmx__exnote{margin:0 0 .4rem;font-size:var(--step-xs);color:var(--ivory-faint)}
    .cmx__actionbar{position:sticky;bottom:0;z-index:2;display:flex;align-items:center;gap:.7rem;margin-top:.2rem;padding:.7rem .2rem;background:linear-gradient(to top,var(--ebony,#1A1820) 70%,transparent);backdrop-filter:blur(2px)}
    .cmx__progresstext{font-family:var(--font-mono);font-size:var(--step-xs);color:var(--ivory-faint);letter-spacing:.05em}
    .cmx__skip{margin-left:auto;background:transparent;color:var(--ivory-faint);border:0;text-decoration:underline;
      font-size:var(--step-sm);cursor:pointer;padding:10px 8px;min-height:44px}
    .cmx__skip:hover{color:var(--ivory-dim)}
    .cmx__primary{background:color-mix(in srgb,var(--brass) 18%,#24222D);color:var(--ivory);border:1px solid var(--brass);
      border-radius:999px;padding:12px 26px;font-size:var(--step-md,1.05rem);font-family:var(--font-sans);cursor:pointer;
      min-height:48px;transition:transform .12s ease,box-shadow .12s ease,opacity .12s ease}
    .cmx__primary:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
    .cmx__primary.is-ready{box-shadow:0 0 0 3px color-mix(in srgb,var(--good,#6FB59A) 38%,transparent)}
    .cmx__primary:not(:disabled):active{transform:translateY(1px)}
    /* When skip is hidden, push the (always-present) primary to the right. */
    .cmx__skip[hidden]+.cmx__primary{margin-left:auto}
    @media (prefers-reduced-motion:reduce){ .cmx__primary{transition:none} }
    @media (max-width:720px){ .cmx__finger{margin-left:0;flex-basis:100%} .cmx__select{min-width:0;flex:1 1 44%} }
  `;
  document.head.appendChild(s);
}
