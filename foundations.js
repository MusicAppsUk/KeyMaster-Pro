// foundations.js
//
// Musical Foundations — a calm, OPTIONAL onboarding layer for true beginners.
// It answers "here is what you are about to train" before the engines ask the
// learner to train it, in the spirit of Recognition Before Execution.
//
// Strictly additive and self-contained:
//   • Default-exports createView(ctx) and returns { enter, exit } like the other
//     views, so app.js routes to it with zero special-casing.
//   • Reuses the SHARED on-screen keyboard for "Show" highlights and detects the
//     "Try" press via ctx.input (the input-agnostic NoteInput hub) — read-only.
//   • Never touches the evaluator, the Scales/Sight-Reading/Chord engines, MIDI
//     mapping, EventBridge, staff rendering, Practice Review, or progression
//     gates. It sets NO expected notes, so the evaluator stays idle throughout.
//
// Content is original and deliberately brief — Explain → Show → Try → Continue,
// never a textbook page.

const NOTE_NAMES = ['C', 'C\u266F', 'D', 'D\u266F', 'E', 'F', 'F\u266F', 'G', 'G\u266F', 'A', 'A\u266F', 'B'];
const pcOf = (m) => ((m % 12) + 12) % 12;

// Sharp keys that spell B major's key signature (F# C# G# D# A#), near the centre.
const B_MAJOR_SHARPS = [66, 61, 68, 63, 70];

/**
 * The foundation pathway. Each card is short by design:
 *   explain  one or two calm sentences
 *   show     a small visual (keyboard highlight, the sharps, or a pulse)
 *   try      one simple, FORGIVING interaction (matched by pitch class so any
 *            octave / device counts), or none — the Continue button never blocks
 */
const CARDS = [
  {
    eyebrow: 'The keyboard',
    title: 'What is a piano key?',
    explain: [
      'A piano is a long row of keys. Lower sounds sit to the left, higher sounds to the right.',
      'Each key makes one sound when you press it.',
    ],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67, 69, 71], caption: 'The keys near the middle of the keyboard.' },
    tryPrompt: 'Press any key to feel where you are.',
    mode: 'any',
  },
  {
    eyebrow: 'A single sound',
    title: 'What is a note?',
    explain: [
      'A note is a single musical sound — one key, one note.',
      'This one is Middle C, your home base near the centre of the keyboard.',
    ],
    show: { kind: 'keys', midis: [60], caption: 'Middle C.' },
    tryPrompt: 'Press Middle C.',
    targets: [60],
    mode: 'one',
  },
  {
    eyebrow: 'Letters',
    title: 'Why do notes have names?',
    explain: [
      'The white keys repeat the letters A to G, over and over, all the way up.',
      'Names let us talk about music exactly — and find any note again.',
    ],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67, 69, 71], caption: 'C D E F G A B \u2014 then it begins again.' },
    tryPrompt: 'Press D \u2014 the white key between the pair of black keys.',
    targets: [62],
    mode: 'one',
  },
  {
    eyebrow: 'Raising a note',
    title: 'What is a sharp?',
    explain: [
      'A sharp (\u266F) raises a note to the very next key up \u2014 usually a black key.',
      'C raised by a sharp becomes C\u266F.',
    ],
    show: { kind: 'keys', midis: [60, 61], caption: 'C \u2192 C\u266F' },
    tryPrompt: 'Press C\u266F \u2014 the black key just above C.',
    targets: [61],
    mode: 'one',
  },
  {
    eyebrow: 'Lowering a note',
    title: 'What is a flat?',
    explain: [
      'A flat (\u266D) lowers a note to the very next key down.',
      'D lowered by a flat becomes D\u266D \u2014 which is the same black key as C\u266F.',
    ],
    show: { kind: 'keys', midis: [62, 61], caption: 'D \u2192 D\u266D' },
    tryPrompt: 'Press D\u266D \u2014 the black key just below D.',
    targets: [61],
    mode: 'one',
  },
  {
    eyebrow: 'Notes in order',
    title: 'What is a scale?',
    explain: [
      'A scale is a ladder of notes climbing in order, from one note up to the same note higher.',
      'Here is C major: the white keys, C up to C.',
    ],
    show: { kind: 'keys', midis: [60, 62, 64, 65, 67, 69, 71, 72], caption: 'C major, step by step.' },
    tryPrompt: 'Climb the first three steps: C, then D, then E.',
    targets: [60, 62, 64],
    mode: 'sequence',
  },
  {
    eyebrow: 'A symbol that saves repetition',
    title: 'What is a key signature?',
    explain: [
      'Some music sharpens the same notes again and again.',
      'A key signature states those sharps once, at the very start, so every matching note is sharp without repeating the symbol.',
    ],
    show: { kind: 'sharps', midis: B_MAJOR_SHARPS, caption: 'Five sharps \u2014 the fingerprint of B major.' },
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
    tryPrompt: 'Press B \u2014 the white key just to the left of C.',
    targets: [71],
    mode: 'one',
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
  },
  {
    eyebrow: 'Notes together',
    title: 'What is a chord?',
    explain: [
      'A chord is several notes sounded together, blending into one richer sound.',
      'Three notes \u2014 C, E and G \u2014 make a C major chord.',
    ],
    show: { kind: 'keys', midis: [60, 64, 67], caption: 'C + E + G = C major.' },
    tryPrompt: 'Press C, E and G together.',
    targets: [60, 64, 67],
    mode: 'set',
  },
];

export default function createView(ctx) {
  const { mount, keyboard, viewport, input } = ctx;

  injectStyles();

  let index = 0;
  let unsub = null;          // input subscription
  let pulseTimer = null;     // rhythm-card animation
  let tryState = null;       // per-card progress for the Try interaction

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
  const showWrap = el('div', { class: 'mf__show' }, [pulse, sharps, showCaption]);

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

  function goHome() { try { window.location.hash = '#/'; } catch { /* no-op */ } }

  // ---- Per-card render ------------------------------------------------------
  function render() {
    const c = CARDS[index];
    stopPulse();
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

    // Try
    tryState = { pressed: new Set(), seqPos: 0, count: 0, done: false };
    if (c.mode && c.mode !== 'none') {
      tryWrap.style.display = '';
      tryPrompt.textContent = c.tryPrompt || '';
      tryStatus.textContent = '';
      tryStatus.classList.remove('is-done');
    } else {
      tryWrap.style.display = 'none';
    }

    // Footer
    backBtn.textContent = index === 0 ? 'Back to dashboard' : 'Back';
    contBtn.textContent = index >= CARDS.length - 1 ? 'Finish' : 'Continue';
  }

  // ---- Try detection (forgiving, pitch-class based) -------------------------
  function onNote(ev) {
    const c = CARDS[index];
    if (!c || !c.mode || c.mode === 'none' || !tryState || tryState.done) return;
    const pc = pcOf(ev.midiNote);
    const targets = (c.targets || []).map(pcOf);

    if (c.mode === 'any') {
      complete();
    } else if (c.mode === 'one') {
      if (pc === targets[0]) complete();
    } else if (c.mode === 'set') {
      if (targets.includes(pc)) tryState.pressed.add(pc);
      if (targets.every((t) => tryState.pressed.has(t))) complete();
    } else if (c.mode === 'sequence') {
      if (pc === targets[tryState.seqPos]) {
        tryState.seqPos += 1;
        if (tryState.seqPos >= targets.length) complete();
      } else {
        tryState.seqPos = 0; // gentle restart; no penalty, no scoring
      }
    } else if (c.mode === 'count') {
      tryState.count += 1;
      const remaining = (c.count || 4) - tryState.count;
      if (remaining > 0) tryStatus.textContent = `${remaining} more\u2026`;
      else complete();
    }
  }

  function complete() {
    if (!tryState || tryState.done) return;
    tryState.done = true;
    tryStatus.textContent = '\u2713 Nicely done.';
    tryStatus.classList.add('is-done');
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
    .mf__try { margin-top: 1.1rem; padding-top: 0.9rem; border-top: 1px solid rgba(244,239,230,0.08); }
    .mf__tryprompt { margin: 0 0 0.35rem; font-size: 1rem; color: var(--ivory, #F4EFE6); }
    .mf__trystatus { margin: 0; min-height: 1.3em; font-size: 0.95rem; color: var(--ivory-faint, #7E7A72); }
    .mf__trystatus.is-done { color: var(--emerald, #46C08A); font-weight: 600; }
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
