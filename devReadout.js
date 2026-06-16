// devReadout.js
//
// TEMPORARY validation tooling — NOT part of the shipping user interface.
// It renders a small fixed overlay that shows the live MIDI evaluation chain so
// the green/red feedback can be verified at a glance on a real device.
//
// Enable it with EITHER:
//   • a `dev` query param:  https://…/?dev#/scales
//   • localStorage:         localStorage.setItem('km_dev','1')   (then reload)
// Disable: remove the param / localStorage.removeItem('km_dev').
//
// When disabled (the default), nothing is created and there is zero UI impact.

export function isDevMode() {
  try {
    if (typeof location !== 'undefined' &&
        /(?:^|[?&])dev(?:=1)?(?:&|$)/.test(location.search || '')) return true;
    if (typeof localStorage !== 'undefined' &&
        localStorage.getItem('km_dev') === '1') return true;
  } catch (_) { /* ignore */ }
  return false;
}

const FIELDS = [
  ['midi',   'midiNote'],
  ['exp',    'expectedNote'],
  ['acc',    'accuracy'],
  ['key',    'key target found'],
  ['keycls', 'key class applied'],
  ['stf',    'staff target found'],
  ['stfcls', 'staff class applied'],
];

export function createDevReadout({ evaluator }) {
  if (typeof document === 'undefined' || !evaluator) return { destroy() {} };

  const style = document.createElement('style');
  style.setAttribute('data-km-dev', '');
  style.textContent = `
    .km-devreadout{position:fixed;top:8px;right:8px;z-index:99999;
      font:12px/1.55 ui-monospace,Menlo,Consolas,monospace;
      background:rgba(12,11,16,.93);color:#E8E2D4;border:1px solid #4a4636;
      border-radius:8px;padding:8px 10px;min-width:210px;
      box-shadow:0 6px 22px rgba(0,0,0,.55);pointer-events:none}
    .km-devreadout b{display:block;color:#E8C57E;margin-bottom:5px;
      letter-spacing:.04em;text-transform:uppercase;font-size:11px}
    .km-devreadout div{display:flex;justify-content:space-between;gap:12px}
    .km-devreadout .v{font-weight:700}
    .km-devreadout .ok .v{color:#6FB59A}
    .km-devreadout .no .v{color:#C96B6B}`;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.className = 'km-devreadout';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<b>DEV · feedback chain</b>' +
    FIELDS.map(([k, label]) => `<div data-f="${k}"><span>${label}</span><span class="v">—</span></div>`).join('');
  document.body.appendChild(el);

  const set = (k, value, tone) => {
    const row = el.querySelector(`[data-f="${k}"]`);
    if (!row) return;
    row.querySelector('.v').textContent = String(value);
    row.classList.remove('ok', 'no');
    if (tone === true) row.classList.add('ok');
    else if (tone === false) row.classList.add('no');
  };

  const render = (d) => {
    if (!d) return;
    set('midi', d.midiNote ?? '—');
    set('exp', d.expectedNote ?? '—');
    set('acc', d.accuracy ? 'true' : 'false', d.accuracy);
    set('key', d.keyTargetFound ? 'true' : 'false', d.keyTargetFound);
    set('keycls', d.keyClassApplied ? 'true' : 'false', d.keyClassApplied);
    set('stf', d.staffTargetFound == null ? 'n/a' : (d.staffTargetFound ? 'true' : 'false'),
        d.staffTargetFound == null ? undefined : d.staffTargetFound);
    set('stfcls', d.staffClassApplied == null ? 'n/a' : (d.staffClassApplied ? 'true' : 'false'),
        d.staffClassApplied == null ? undefined : d.staffClassApplied);
  };

  // The evaluator paints BEFORE it emits, so by the time this fires the classes
  // are already on the DOM and the debug snapshot reflects the real post-state.
  const off = evaluator.on((payload) => render(payload.debug || evaluator.lastEval));

  return {
    el,
    destroy() { try { off?.(); } catch (_) {} el.remove(); style.remove(); },
  };
}
