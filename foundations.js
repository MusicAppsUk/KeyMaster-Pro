// foundations.js
//
// Musical Foundations — a calm, tutor-led first lesson at the piano for true
// beginners, in the spirit of Recognition Before Execution and the wider
// "KeyMaster PRO is the tutor" doctrine: explain → demonstrate (with sound) →
// show the target → ask the learner to copy → wait → give ACCURATE feedback.
//
// Strictly additive and self-contained:
//   • Default-exports createView(ctx) and returns { enter, exit } like the other
//     views, so app.js routes to it with zero special-casing.
//   • Reuses the SHARED on-screen keyboard for "Show" highlights and detects the
//     "Try" press via ctx.input (the input-agnostic NoteInput hub) — read-only.
//   • Demonstrates with the shared synth's existing gentle 'demo' voice (rc2-41)
//     at reduced velocity, staggered onsets — synth.js is NOT modified, so the
//     Scales Listen voice, the default learner-play voice, and the shared limiter
//     are untouched. Each demo Voice instance is released individually, so it can
//     never cut the learner's own held notes.
//   • Never touches the evaluator, the Scales/Sight-Reading/Chord engines, MIDI
//     mapping, EventBridge, staff rendering, Practice Review, or progression
//     gates. It sets NO expected notes, so the evaluator stays idle throughout.
//
// Feedback is meaningful, never generic: targeted cards confirm the SPECIFIC note
// ("Exactly — that is Middle C"), wrong notes are named and gently guided, and
// only genuine free-exploration is acknowledged as exploration.

const NOTE_NAMES = ['C', 'C\u266F', 'D', 'D\u266F', 'E', 'F', 'F\u266F', 'G', 'G\u266F', 'A', 'A\u266F', 'B'];
const pcOf = (m) => ((m % 12) + 12) % 12;

// Sharp keys that spell B major's key signature (F# C# G# D# A#), near the centre.
const B_MAJOR_SHARPS = [66, 61, 68, 63, 70];

/**
 * The foundation pathway. Each card is short by design:
 *   explain   one or two calm sentences (adult, precise, never childish)
 *   show      a small visual (keyboard highlight, the sharps, or a pulse)
 *   demo      midis to SOUND as the demonstration (staggered); demoGap = seconds
 *             between onsets (a small gap rolls a chord; a larger gap walks notes)
 *   try       one interaction with a mode:
 *               any       — free exploration (acknowledged honestly, not praised)
 *               one       — a single target note (pitch-class, unless exact:true)
 *               set       — a chord: all target pitch-classes held together
 *               sequence  — target pitch-classes played in order
 *               count     — tap N times to feel a pulse (any key)
 *               none      — teaching/visual only; Continue moves on
 *   okMsg     the SPECIFIC confirmation shown only when the task is truly correct
 *   hint      used to guide a wrong attempt ("That was G. <hint>")
 *   exact     for 'one': require the literal MIDI, not just the pitch class
 */
const CARDS = [
  {
    eyebrow: 'The keyboard',
    title: 'The piano keyboard',
    explain: [
      'This is the piano keyboard \u2014 one long row of keys. Lower sounds sit to the left, higher sounds to the right.',
      'Press a key anywhere and listen: each key gives one clear sound.',
    ],
    show: { kind: 'keys', midis: [55, 57, 59, 60, 62, 64, 67], caption: 'Lower to the left, higher to the right.' },
    demo: [55, 60, 67], demoGap: 0.5,
    tryPrompt: 'Press any key to hear where you are.',
    mode: 'any',
    okMsg: 'Good \u2014 you\u2019ve made the piano sound. Keys to the left sound lower; to the right, higher.',
  },
  {
    eyebrow: 'Finding your way',
    title: 'Black-key groups',
    explain: [
      'Look at the black keys: they fall into groups of two and three, with a gap between each group.',
      'These groups are your map \u2014 they let you find any note by sight and by feel.',
    ],
    show: { kind: 'keys', midis: [61, 63, 66, 68, 70], caption: 'A group of two, then a group of three.' },
    demo: [61, 63, 66, 68, 70], demoGap: 0.34,
    mode: 'none',
  },
  {
    eyebrow: 'The landmark C',
    title: 'Finding C',
    explain: [
      'C is the white key just to the left of every group of two black keys.',
      'Because that pattern repeats, you can find a C anywhere on the keyboard.',
    ],
    show: { kind: 'keys', midis: [60], caption: 'C sits just left of the two black keys.' },
    demo: [60], demoGap: 0.45,
    tryPrompt: 'Find and press a C.',
    targets: [60],
    mode: 'one',
    okMsg: 'Exactly \u2014 that\u2019s C, just left of the two black keys.',
    hint: 'C is the white key immediately left of a group of two black keys.',
  },
  {
    eyebrow: 'Your home note',
    title: 'Middle C',
    explain: [
      'Middle C is one special C, near the centre of the piano.',
      'It is a landmark for reading music \u2014 we will return to it often.',
    ],
    show: { kind: 'keys', midis: [60], caption: 'Middle C \u2014 near the centre.' },
    demo: [60], demoGap: 0.45,
    tryPrompt: 'Press Middle C.',
    targets: [60],
    exact: true,
    mode: 'one',
    okMsg: 'Exactly \u2014 that\u2019s Middle C (C4).',
    hint: 'Middle C is the highlighted key, near the centre of the keyboard.',
  },
  {
    eyebrow: 'Where B major begins',
    title: 'B below Middle C',
    explain: [
      'Just to the left of Middle C is B \u2014 the B below Middle C.',
      'KeyMaster PRO begins with B major around here, because its shape fits the hand.',
    ],
    show: { kind: 'keys', midis: [59, 60], caption: 'B sits immediately left of Middle C.' },
    demo: [59], demoGap: 0.45,
    tryPrompt: 'Press the B just below Middle C.',
    targets: [59],
    exact: true,
    mode: 'one',
    okMsg: 'Exactly \u2014 that\u2019s B, just below Middle C. This is where B major lives.',
    hint: 'B is the white key immediately to the left of Middle C \u2014 the highlighted key.',
  },
  {
    eyebrow: 'Raising a note',
    title: 'What is a sharp?',
    explain: [
      'A sharp (\u266F) raises a note to the very next key up \u2014 usually a black key.',
      'C raised by a sharp becomes C\u266F.',
    ],
    show: { kind: 'keys', midis: [60, 61], caption: 'C \u2192 C\u266F' },
    demo: [60, 61], demoGap: 0.5,
    tryPrompt: 'Press C\u266F \u2014 the black key just above C.',
    targets: [61],
    mode: 'one',
    okMsg: 'Correct \u2014 that\u2019s C\u266F, the black key just above C.',
    hint: 'C\u266F is the black key immediately to the right of C.',
  },
  {
    eyebrow: 'Lowering a note',
    title: 'What is a flat?',
    explain: [
      'A flat (\u266D) lowers a note to the very next key down.',
      'D lowered by a flat becomes D\u266D \u2014 the same black key as C\u266F.',
    ],
    show: { kind: 'keys', midis: [62, 61], caption: 'D \u2192 D\u266D' },
    demo: [62, 61], demoGap: 0.5,
    tryPrompt: 'Press D\u266D \u2014 the black key just below D.',
    targets: [61],
    mode: 'one',
    okMsg: 'Correct \u2014 that\u2019s D\u266D, the same black key as C\u266F.',
    hint: 'D\u266D is the black key immediately to the left of D.',
  },
  {
    eyebrow: 'Notes in order',
    title: 'What is a scale?',
    explain: [
      'A scale is a ladder of notes climbing in order, from one note up to the same note higher.',
      'Here is C major: the white keys, C up to C.',
    ],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67, 69, 71, 72], caption: 'C major, step by step.' },
    demo: [60, 62, 64, 65, 67, 69, 71, 72], demoGap: 0.26,
    tryPrompt: 'Climb the first three steps: C, then D, then E.',
    targets: [60, 62, 64],
    mode: 'sequence',
    okMsg: 'That\u2019s the first three steps of C major \u2014 C, D, E.',
    hint: 'Climb in order on the white keys: C, then D, then E.',
  },
  {
    eyebrow: 'A symbol that saves repetition',
    title: 'What is a key signature?',
    explain: [
      'Some music sharpens the same notes again and again.',
      'A key signature states those sharps once, at the start, so every matching note is sharp without repeating the symbol.',
    ],
    show: { kind: 'sharps', midis: B_MAJOR_SHARPS, caption: 'Five sharps \u2014 the fingerprint of B major.' },
    demo: [61, 63, 66, 68, 70], demoGap: 0.3,
    mode: 'none',
  },
  {
    eyebrow: 'Our starting key',
    title: 'Why B major?',
    explain: [
      'KeyMaster PRO begins with B major on purpose.',
      'Its shape fits the hand: the longer fingers fall on the raised black keys, giving a secure, repeatable anchor.',
    ],
    show: { kind: 'keys', midis: [59, 61, 63, 64, 66, 68, 70, 71], caption: 'B major sits naturally under the hand.' },
    demo: [59, 61, 63, 64, 66, 68, 70, 71], demoGap: 0.26,
    mode: 'none',
  },
  {
    eyebrow: 'Time',
    title: 'What is rhythm?',
    explain: [
      'Rhythm is timing \u2014 how long each note lasts and when it falls.',
      'A steady beat underneath holds everything together.',
    ],
    show: { kind: 'pulse', caption: 'Feel a steady count of four.' },
    tryPrompt: 'Tap any key four times, evenly with the pulse.',
    mode: 'count',
    count: 4,
    okMsg: 'Good \u2014 four steady taps. That steady beat is your pulse.',
  },
  {
    eyebrow: 'Notes together',
    title: 'What is a chord?',
    explain: [
      'A chord is several notes sounded together, blending into one richer sound.',
      'Three notes \u2014 C, E and G \u2014 make a C major chord.',
    ],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'C + E + G = C major.' },
    demo: [60, 64, 67], demoGap: 0.08,
    tryPrompt: 'Press C, E and G together.',
    targets: [60, 64, 67],
    mode: 'set',
    okMsg: 'That\u2019s a C major chord \u2014 C, E and G together.',
    hint: 'Press the three highlighted keys together: C, E and G.',
  },
];

export default function createView(ctx) {
  const { mount, keyboard, viewport, input, synth } = ctx;

  injectStyles();

  let index = 0;
  let unsub = null;          // input subscription
  let pulseTimer = null;     // rhythm-card animation
  let tryState = null;       // per-card progress for the Try interaction

  // ---- Demonstration audio (shared 'demo' voice; no synth.js change) --------
  const demoVoices = [];     // teaching-audio Voice instances we own
  let demoToken = 0;         // cancels a pending demo when the card changes
  let demoTimer = null;
  function audioReady() { return !!(synth && synth.ctx && synth.ctx.state === 'running'); }
  function playDemoVoice(midi, vel, durSec, atSec) {
    if (!audioReady()) return;
    const t = atSec ?? synth.ctx.currentTime;
    const v = synth.noteOn(midi, vel, t, 'demo');
    if (v) { demoVoices.push(v); try { v.release(t + durSec); } catch (_) { /* no-op */ } }
  }
  function stopDemoAudio() {
    if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
    if (!demoVoices.length) return;
    const now = synth && synth.ctx ? synth.ctx.currentTime : 0;
    for (const v of demoVoices.splice(0)) { try { v.release(now); } catch (_) { /* no-op */ } }
  }
  // Sound the current card's example: single notes ring; a tight gap rolls a chord.
  function demoCard(c) {
    if (!c || !Array.isArray(c.demo) || !c.demo.length || !audioReady()) return;
    stopDemoAudio();
    const gap = c.demoGap ?? 0.4;
    const isChord = gap <= 0.12;
    const vel = isChord ? 50 : 58;
    const dur = isChord ? 1.10 : Math.max(0.42, gap * 1.05);
    const t0 = synth.ctx.currentTime + 0.02;
    c.demo.forEach((m, i) => playDemoVoice(m, vel, dur, t0 + i * gap));
  }

  // ---- DOM scaffold (built once) -------------------------------------------
  const root = el('div', { class: 'mf' });

  const head = el('div', { class: 'mf__head' });
  const eyebrow = el('p', { class: 'mf__eyebrow' });
  const stepLine = el('p', { class: 'mf__step' });
  head.append(eyebrow, stepLine);

  const dots = el('div', { class: 'mf__dots', role: 'presentation' });

  const title = el('h2', { class: 'mf__title' });
  const explain = el('div', { class: 'mf__explain' });

  const showCaption = el('p', { class: 'mf__showcap' });
  const pulse = el('div', { class: 'mf__pulse', 'aria-hidden': 'true' });
  for (let i = 0; i < 4; i++) pulse.appendChild(el('span', { class: 'mf__beat' }));
  const sharps = el('p', { class: 'mf__sharps', 'aria-hidden': 'true' });
  const replayBtn = el('button', { class: 'mf__replay mf__btn mf__btn--ghost', type: 'button' });
  replayBtn.textContent = 'Hear it again';
  const showWrap = el('div', { class: 'mf__show' }, [pulse, sharps, showCaption, replayBtn]);

  const tryWrap = el('div', { class: 'mf__try' });
  const tryPrompt = el('p', { class: 'mf__tryprompt' });
  const tryStatus = el('p', { class: 'mf__trystatus', 'aria-live': 'polite' });
  tryWrap.append(tryPrompt, tryStatus);

  const footer = el('div', { class: 'mf__footer' });
  const backBtn = el('button', { class: 'mf__btn mf__btn--ghost', type: 'button' });
  backBtn.textContent = 'Back';
  const contBtn = el('button', { class: 'mf__btn mf__btn--primary', type: 'button' });
  footer.append(backBtn, contBtn);

  const card = el('div', { class: 'mf__card' }, [title, explain, showWrap, tryWrap]);
  root.append(head, dots, card, footer);
  mount.replaceChildren(root);

  // Progress dots
  CARDS.forEach((_, i) => {
    const d = el('span', { class: 'mf__dot' });
    d.dataset.i = String(i);
    dots.appendChild(d);
  });

  backBtn.addEventListener('click', () => {
    if (index === 0) { goHome(); return; }
    index -= 1; render();
  });
  contBtn.addEventListener('click', () => {
    if (index >= CARDS.length - 1) { goHome(); return; }
    index += 1; render();
  });
  replayBtn.addEventListener('click', () => demoCard(CARDS[index]));

  function goHome() { try { window.location.hash = '#/'; } catch { /* no-op */ } }

  // ---- Per-card render ------------------------------------------------------
  function render() {
    const c = CARDS[index];
    stopPulse();
    stopDemoAudio();
    demoToken += 1;
    keyboard?.clearHighlight?.('target');

    eyebrow.textContent = c.eyebrow;
    stepLine.textContent = `Step ${index + 1} of ${CARDS.length}`;
    title.textContent = c.title;
    explain.replaceChildren(...c.explain.map((line) => {
      const p = el('p'); p.textContent = line; return p;
    }));

    // Progress dots
    [...dots.children].forEach((d, i) => {
      d.classList.toggle('is-done', i < index);
      d.classList.toggle('is-current', i === index);
    });

    // Show
    pulse.style.display = 'none';
    sharps.style.display = 'none';
    sharps.textContent = '';
    const s = c.show || {};
    showCaption.textContent = s.caption || '';
    if (s.kind === 'keys' && Array.isArray(s.midis)) {
      keyboard?.highlight?.(s.midis, 'target');
      viewport?.frame?.(s.midis);
    } else if (s.kind === 'sharps' && Array.isArray(s.midis)) {
      keyboard?.highlight?.(s.midis, 'target');
      viewport?.frame?.(s.midis);
      sharps.textContent = '\u266F \u266F \u266F \u266F \u266F';
      sharps.style.display = '';
    } else if (s.kind === 'pulse') {
      pulse.style.display = '';
      startPulse();
    }

    // Demonstration sound — show first, then sound a moment later (tutor cadence).
    replayBtn.style.display = (c.demo && c.demo.length) ? '' : 'none';
    if (c.demo && c.demo.length) {
      const myToken = demoToken;
      demoTimer = setTimeout(() => { if (myToken === demoToken) demoCard(c); }, 340);
    }

    // Try
    tryState = { pressed: new Set(), seqPos: 0, count: 0, done: false };
    if (c.mode && c.mode !== 'none') {
      tryWrap.style.display = '';
      tryPrompt.textContent = c.tryPrompt || '';
      tryStatus.textContent = '';
      tryStatus.classList.remove('is-done', 'is-wrong');
    } else {
      tryWrap.style.display = 'none';
    }

    // Footer
    backBtn.textContent = index === 0 ? 'Back to dashboard' : 'Back';
    contBtn.textContent = index >= CARDS.length - 1 ? 'Finish' : 'Continue';
  }

  // ---- Try detection — accurate, teaching feedback --------------------------
  function onNote(ev) {
    const c = CARDS[index];
    if (!c || !c.mode || c.mode === 'none' || !tryState || tryState.done) return;
    const midi = ev.midiNote;
    const pc = pcOf(midi);
    const name = NOTE_NAMES[pc];
    const targetsPc = (c.targets || []).map(pcOf);

    if (c.mode === 'any') {
      complete(c.okMsg);
    } else if (c.mode === 'one') {
      const target = c.targets[0];
      const hit = c.exact ? (midi === target) : (pc === pcOf(target));
      if (hit) {
        complete(c.okMsg);
      } else if (c.exact && pc === pcOf(target)) {
        guide('That\u2019s the right note name, but not the one we mean here. Press the highlighted key.');
      } else {
        guide(`That was ${name}. ${c.hint || 'Try the highlighted key.'}`);
      }
    } else if (c.mode === 'set') {
      if (targetsPc.includes(pc)) {
        tryState.pressed.add(pc);
        if (targetsPc.every((t) => tryState.pressed.has(t))) complete(c.okMsg);
        else neutral(`Good \u2014 ${tryState.pressed.size} of ${targetsPc.length}. Keep them held and add the rest.`);
      } else {
        guide(`That was ${name}, which isn\u2019t in this chord. ${c.hint || ''}`.trim());
      }
    } else if (c.mode === 'sequence') {
      if (pc === targetsPc[tryState.seqPos]) {
        tryState.seqPos += 1;
        if (tryState.seqPos >= targetsPc.length) complete(c.okMsg);
        else neutral('Good \u2014 now the next step.');
      } else {
        tryState.seqPos = 0;
        guide(`That was ${name}. ${c.hint || 'Start again from C.'}`);
      }
    } else if (c.mode === 'count') {
      tryState.count += 1;
      const remaining = (c.count || 4) - tryState.count;
      if (remaining > 0) neutral(`${remaining} more\u2026`);
      else complete(c.okMsg);
    }
  }

  function complete(msg) {
    if (!tryState || tryState.done) return;
    tryState.done = true;
    tryStatus.textContent = `\u2713 ${msg || 'Correct.'}`;
    tryStatus.classList.remove('is-wrong');
    tryStatus.classList.add('is-done');
  }
  function guide(msg) {          // calm correction — guides, never punishes
    tryStatus.textContent = msg;
    tryStatus.classList.remove('is-done');
    tryStatus.classList.add('is-wrong');
  }
  function neutral(msg) {        // progress within an attempt (not yet complete)
    tryStatus.textContent = msg;
    tryStatus.classList.remove('is-done', 'is-wrong');
  }

  // ---- Rhythm pulse ---------------------------------------------------------
  function startPulse() {
    const beats = [...pulse.children];
    let b = 0;
    const tick = () => {
      beats.forEach((node, i) => node.classList.toggle('is-on', i === b));
      b = (b + 1) % beats.length;
    };
    tick();
    pulseTimer = setInterval(tick, 600); // a calm ~100 BPM pulse
  }
  function stopPulse() {
    if (pulseTimer != null) { clearInterval(pulseTimer); pulseTimer = null; }
    [...pulse.children].forEach((n) => n.classList.remove('is-on'));
  }

  // ---- Lifecycle ------------------------------------------------------------
  return {
    enter() {
      if (!unsub && input?.subscribe) unsub = input.subscribe(onNote);
      render();
    },
    exit() {
      if (unsub) { unsub(); unsub = null; }
      stopPulse();
      stopDemoAudio();
      keyboard?.clearHighlight?.('target');
    },
  };
}

/* -------------------------------------------------------------------------- */

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const ch of children) node.appendChild(ch);
  return node;
}

function injectStyles() {
  if (document.getElementById('mf-styles')) return;
  const s = document.createElement('style');
  s.id = 'mf-styles';
  s.textContent = `
    .mf { max-width: 56rem; margin: 0 auto; padding: 0.5rem 0 1rem; color: var(--ivory, #F4EFE6); }
    .mf__head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
    .mf__eyebrow { margin: 0; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--champagne, #E8C57E); }
    .mf__step { margin: 0; font-size: 0.82rem; color: var(--ivory-faint, #7E7A72); }
    .mf__dots { display: flex; gap: 0.4rem; margin: 0.6rem 0 1rem; }
    .mf__dot { width: 0.5rem; height: 0.5rem; border-radius: 50%;
      background: rgba(244,239,230,0.16); transition: background 0.25s, transform 0.25s; }
    .mf__dot.is-done { background: var(--brass, #C99A4B); }
    .mf__dot.is-current { background: var(--champagne, #E8C57E); transform: scale(1.35); }
    .mf__card { background: rgba(255,255,255,0.035); border: 1px solid rgba(232,197,126,0.18);
      border-radius: 16px; padding: 1.25rem 1.35rem 1.4rem; }
    .mf__title { margin: 0 0 0.6rem; font-size: clamp(1.3rem, 4vw, 1.7rem); font-weight: 650;
      color: var(--ivory, #F4EFE6); }
    .mf__explain p { margin: 0 0 0.55rem; font-size: 1.02rem; line-height: 1.55; color: var(--ivory-dim, #B9B2A6); }
    .mf__explain p:first-child { color: var(--ivory, #F4EFE6); }
    .mf__show { margin: 1rem 0 0.4rem; }
    .mf__showcap { margin: 0; font-size: 0.95rem; color: var(--ivory-dim, #B9B2A6); }
    .mf__sharps { margin: 0 0 0.3rem; font-size: 1.6rem; letter-spacing: 0.25em; color: var(--champagne, #E8C57E); }
    .mf__pulse { display: flex; gap: 0.6rem; margin: 0 0 0.5rem; }
    .mf__beat { width: 0.85rem; height: 0.85rem; border-radius: 50%; background: rgba(244,239,230,0.16);
      transition: background 0.12s, transform 0.12s; }
    .mf__beat.is-on { background: var(--amber, #E0A94B); transform: scale(1.25); }
    .mf__replay { margin-top: 0.6rem; padding: 0.4rem 0.95rem; min-height: 38px; font-size: 0.88rem; }
    .mf__try { margin-top: 1.1rem; padding-top: 0.9rem; border-top: 1px solid rgba(244,239,230,0.08); }
    .mf__tryprompt { margin: 0 0 0.35rem; font-size: 1rem; color: var(--ivory, #F4EFE6); }
    .mf__trystatus { margin: 0; min-height: 1.3em; font-size: 0.95rem; color: var(--ivory-faint, #7E7A72); }
    .mf__trystatus.is-done { color: var(--emerald, #46C08A); font-weight: 600; }
    .mf__trystatus.is-wrong { color: #D8A28F; }
    .mf__footer { display: flex; justify-content: space-between; gap: 1rem; margin-top: 1.25rem; }
    .mf__btn { appearance: none; border-radius: 11px; padding: 0.7rem 1.3rem; font-size: 1rem; font-weight: 600;
      cursor: pointer; min-height: 46px; border: 1px solid transparent; transition: filter 0.15s, background 0.15s; }
    .mf__btn--ghost { background: transparent; border-color: rgba(244,239,230,0.22); color: var(--ivory-dim, #B9B2A6); }
    .mf__btn--ghost:hover { color: var(--ivory, #F4EFE6); border-color: rgba(244,239,230,0.4); }
    .mf__btn--primary { background: var(--brass, #C99A4B); color: #1a1206; }
    .mf__btn--primary:hover { filter: brightness(1.08); }
    @media (max-width: 520px) {
      .mf__card { padding: 1rem 1rem 1.15rem; }
      .mf__explain p { font-size: 0.98rem; }
    }
  `;
  document.head.appendChild(s);
}
