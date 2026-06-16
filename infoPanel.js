// infoPanel.js
//
// "Learn Why" educational panel — MODAL variant (RC4).
//
// The page keeps a small inline trigger button (e.g. "ⓘ Why B Major?"). Tapping
// it opens a centred pop-up modal: a full-screen semi-transparent, blurred
// backdrop with a crisp dark card on top. Because the overlay is position:fixed
// and lives on <body>, opening/closing it never reflows the staff or the page —
// the inline trigger never changes size, so nothing below it shifts.
//
// Public API (unchanged from the previous accordion version):
//   createInfoPanel({ label, title, bodyHtml, storageKey, defaultOpen })
//     → { el, open(), close(), toggle(), isOpen, destroy() }
//   `el` is the inline trigger to place in the page.

let _idSeq = 0;

export function createInfoPanel({ label, title, bodyHtml, storageKey = null, defaultOpen = false }) {
  injectStyles();
  const id = `infomodal-${++_idSeq}`;

  // ---- inline trigger (stays in the page; never expands) ----
  const el = document.createElement('div');
  el.className = 'infopanel';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'infopanel__trigger';
  trigger.textContent = label;
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', id);
  trigger.setAttribute('aria-expanded', 'false');
  el.appendChild(trigger);

  // ---- modal overlay (appended to <body> lazily on first open) ----
  const overlay = document.createElement('div');
  overlay.className = 'infomodal';
  overlay.id = id;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);
  overlay.innerHTML = `
    <div class="infomodal__card" role="document">
      <button class="infomodal__x" type="button" aria-label="Close">&times;</button>
      <h2 class="infomodal__title">${title}</h2>
      <div class="infomodal__body">${bodyHtml}</div>
    </div>`;
  const card = overlay.querySelector('.infomodal__card');
  const xBtn = overlay.querySelector('.infomodal__x');

  let isOpen = false;
  let lastFocus = null;

  function open() {
    if (isOpen) return;
    isOpen = true;
    if (!overlay.isConnected) document.body.appendChild(overlay);
    lastFocus = document.activeElement;
    // Two frames so the fade/scale transition runs from the hidden state.
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('is-open')));
    document.addEventListener('keydown', onKey, true);
    trigger.setAttribute('aria-expanded', 'true');
    xBtn.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('is-open');
    document.removeEventListener('keydown', onKey, true);
    trigger.setAttribute('aria-expanded', 'false');
    if (storageKey) { try { localStorage.setItem(storageKey, '1'); } catch (_) {} }
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function toggle() { isOpen ? close() : open(); }

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {
      const f = overlay.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  trigger.addEventListener('click', open);
  xBtn.addEventListener('click', close);
  // Tap on the darkened backdrop (the overlay itself, not the card) dismisses.
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  // defaultOpen: only auto-opens if not previously dismissed. Both current
  // callers pass false, so the modal never appears unprompted.
  if (defaultOpen) {
    let dismissed = false;
    if (storageKey) { try { dismissed = localStorage.getItem(storageKey) === '1'; } catch (_) {} }
    if (!dismissed) requestAnimationFrame(open);
  }

  return {
    el,
    open,
    close,
    toggle,
    get isOpen() { return isOpen; },
    destroy() { close(); overlay.remove(); },
  };
}

function injectStyles() {
  if (document.getElementById('infopanel-styles')) return;
  const s = document.createElement('style');
  s.id = 'infopanel-styles';
  s.textContent = `
    /* Inline trigger */
    .infopanel { margin-top: 1rem; }
    .infopanel__trigger {
      font-family: var(--font-mono, monospace); font-size: var(--step-sm, .95rem);
      color: var(--brass-bright, #e9c987); background: transparent;
      border: 1px solid color-mix(in srgb, var(--brass, #caa45a) 40%, transparent);
      border-radius: 999px; padding: .5rem 1rem; cursor: pointer;
      transition: background .15s ease, border-color .15s ease;
    }
    .infopanel__trigger:hover {
      background: color-mix(in srgb, var(--brass, #caa45a) 12%, transparent);
      border-color: var(--brass, #caa45a);
    }
    .infopanel__trigger:focus-visible { outline: 2px solid var(--brass-bright, #e9c987); outline-offset: 2px; }

    /* Modal overlay + backdrop */
    .infomodal {
      position: fixed; inset: 0; z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: clamp(1rem, 4vw, 2rem);
      background: rgba(0, 0, 0, 0.5);
      -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
      opacity: 0; visibility: hidden;
      transition: opacity .2s ease, visibility 0s linear .2s;
    }
    .infomodal.is-open { opacity: 1; visibility: visible; transition: opacity .2s ease; }

    /* Card */
    .infomodal__card {
      position: relative;
      width: 100%; max-width: 38rem;        /* tablet-optimised (~max-w-xl) */
      max-height: 85vh; overflow-y: auto;
      background: linear-gradient(165deg, var(--ebony-raise, #211f2a), #18161f);
      border: 1px solid var(--ebony-edge, #2e2b38);
      border-radius: 18px;
      padding: clamp(1.5rem, 3.5vw, 2.4rem);
      box-shadow: 0 30px 80px -22px rgba(0, 0, 0, .75), 0 0 0 1px rgba(255,255,255,.02) inset;
      color: var(--ivory, #f4efe6);
      transform: translateY(10px) scale(.985); opacity: 0;
      transition: transform .22s cubic-bezier(.2,.8,.25,1), opacity .22s ease;
    }
    .infomodal.is-open .infomodal__card { transform: none; opacity: 1; }

    /* Close button */
    .infomodal__x {
      position: absolute; top: .9rem; right: .9rem;
      width: 2.4rem; height: 2.4rem; border-radius: 999px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.6rem; line-height: 1; cursor: pointer;
      color: var(--ivory, #f4efe6);
      background: rgba(255, 255, 255, .05);
      border: 1px solid var(--ebony-edge, #2e2b38);
      transition: background .15s ease, transform .15s ease;
    }
    .infomodal__x:hover { background: rgba(255, 255, 255, .12); transform: rotate(90deg); }
    .infomodal__x:focus-visible { outline: 2px solid var(--brass-bright, #e9c987); outline-offset: 2px; }

    /* Text */
    .infomodal__title {
      font-family: var(--font-display, serif); font-weight: 600;
      font-size: var(--step-xl, 1.6rem); color: var(--ivory, #f4efe6);
      margin: 0 2.4rem .8rem 0;
    }
    .infomodal__body { font-family: var(--font-sans, system-ui); font-size: var(--step-sm, .98rem);
      line-height: 1.6; color: var(--ivory-dim, #d9d2c6); }
    .infomodal__body p { margin: 0 0 .8rem; }
    .infomodal__body ul { margin: .4rem 0 .8rem; padding-left: 1.2rem; }
    .infomodal__body li { margin: .25rem 0; }
    .infomodal__body strong { color: var(--ivory, #f4efe6); }
    .infomodal__body .infopanel__lead {
      margin-top: 1rem; padding: .8rem 1rem; border-radius: 10px;
      background: color-mix(in srgb, var(--brass, #caa45a) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--brass, #caa45a) 28%, transparent);
      color: var(--ivory, #f4efe6);
    }

    @media (prefers-reduced-motion: reduce) {
      .infomodal, .infomodal__card, .infomodal__x { transition: none; }
    }
  `;
  document.head.appendChild(s);
}
