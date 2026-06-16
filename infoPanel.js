// infoPanel.js
//
// Reusable expandable information panel — a small "ⓘ" trigger that smoothly
// expands/collapses a clean card of educational copy. Designed to be dropped in
// anywhere across the app; the first instantiation is the "Why B Major?" panel
// on the opening dashboard, but the same factory powers future panels
// (e.g. "ⓘ Why Fingering Matters?").
//
// Usage:
//   const panel = createInfoPanel({
//     label: 'ⓘ Why B Major?',
//     title: 'Why B Major?',
//     bodyHtml: '<p>…</p>',
//     storageKey: 'whyBMajorDismissed',   // localStorage persistence
//     defaultOpen: true,                  // expanded on the very first visit
//   });
//   container.appendChild(panel.el);
//
// Persistence contract: once the user closes the panel after reading, the
// storageKey is set so the panel stays COLLAPSED on subsequent launches. The
// trigger is always available to reopen it within a session; reopening does not
// clear the dismissal (next launch still starts collapsed).
//
// This component is purely presentational and does NOT touch the EventBridge
// data layer or its payload schema.

let counter = 0;

export function createInfoPanel({
  label = 'ⓘ More info',
  title = '',
  bodyHtml = '',
  storageKey = null,
  defaultOpen = true,
} = {}) {
  injectStyles();

  const id = `infopanel-${++counter}`;
  const root = el('section', { class: 'infopanel' });

  const trigger = el('button', {
    class: 'infopanel__trigger btn btn--xl btn--ghost',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': id,
  });
  trigger.textContent = label;

  // The region uses the grid 0fr→1fr technique for a smooth, height-agnostic
  // expand with no magic max-height numbers.
  const region = el('div', { class: 'infopanel__region', id, role: 'region', 'aria-label': title || label });
  const inner = el('div', { class: 'infopanel__inner' });
  const card = el('div', { class: 'infopanel__card' });

  if (title) {
    const h = el('h3', { class: 'infopanel__title' });
    h.textContent = title;
    card.appendChild(h);
  }
  const body = el('div', { class: 'infopanel__body' });
  body.innerHTML = bodyHtml;
  card.appendChild(body);

  const close = el('button', { class: 'infopanel__close btn', type: 'button' });
  close.textContent = 'Got it';
  card.appendChild(close);

  inner.appendChild(card);
  region.appendChild(inner);
  root.append(trigger, region);

  let open = false;
  function setOpen(next, { persist = false } = {}) {
    open = Boolean(next);
    root.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    // Only a CLOSE is remembered — that is the user's "I've read it" signal.
    if (persist && !open && storageKey) safeSet(storageKey, '1');
  }

  trigger.addEventListener('click', () => setOpen(!open, { persist: true }));
  close.addEventListener('click', () => {
    setOpen(false, { persist: true });
    trigger.focus();
  });

  // Initial state: expanded on first visit, collapsed once previously dismissed.
  const dismissed = storageKey ? safeGet(storageKey) === '1' : false;
  setOpen(defaultOpen && !dismissed);

  return {
    el: root,
    open: () => setOpen(true),
    close: () => setOpen(false, { persist: true }),
    toggle: () => setOpen(!open, { persist: true }),
    get isOpen() { return open; },
  };
}

/* ---------- helpers ---------- */

function el(tag, props = {}) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else n.setAttribute(k, v);
  }
  return n;
}

function safeGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, val) {
  try { window.localStorage.setItem(key, val); } catch { /* private mode; ignore */ }
}

function injectStyles() {
  if (document.getElementById('infopanel-styles')) return;
  const s = document.createElement('style');
  s.id = 'infopanel-styles';
  s.textContent = `
    .infopanel{ margin: 1.5rem 0 0; }
    .infopanel__trigger{ gap:.5rem; }
    /* Smooth height-agnostic expand/collapse. */
    .infopanel__region{
      display:grid; grid-template-rows:0fr;
      transition:grid-template-rows .32s var(--ease, cubic-bezier(.4,0,.2,1));
    }
    .infopanel.is-open .infopanel__region{ grid-template-rows:1fr; }
    .infopanel__inner{ overflow:hidden; }
    .infopanel__card{
      margin-top:.85rem;
      background:var(--ebony-sink, #14130f);
      border:1px solid var(--ebony-edge, #2a2720);
      border-radius:16px;
      padding:1.25rem 1.4rem 1.1rem;
      box-shadow:0 14px 40px -24px rgba(0,0,0,.7);
      max-width:64ch;
    }
    .infopanel__title{
      font-family:var(--font-display, serif);
      font-size:var(--step-lg);
      color:var(--brass-bright);
      margin:0 0 .6rem;
    }
    .infopanel__body{ color:var(--ivory, #ECE7DC); font-size:var(--step-sm); line-height:1.6; }
    .infopanel__body p{ margin:0 0 .7rem; }
    .infopanel__body p:last-of-type{ margin-bottom:0; }
    .infopanel__body strong{ color:var(--ivory); font-weight:600; }
    .infopanel__body ul{ margin:.3rem 0 .2rem; padding-left:1.1rem; }
    .infopanel__body li{ margin:.2rem 0; }
    .infopanel__body .infopanel__lead{ color:var(--brass); }
    .infopanel__close{ margin-top:1rem; }
    @media (prefers-reduced-motion: reduce){
      .infopanel__region{ transition:none; }
    }
  `;
  document.head.appendChild(s);
}
