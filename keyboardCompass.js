// keyboardCompass.js — reusable Middle-C / octave orientation overlay (rc2-139).
//
// Marks each C key with its octave label (C3, C4, C5 ...), with Middle C
// (C4 / midi 60) the clearest, most prominent marker. Markers are appended as
// pointer-events:none CHILDREN of the real key DOM elements, so they ride with
// the keys naturally when the learner moves +8va / -8va, and any C that leaves
// the 4-octave window is clipped with its key (so only VISIBLE C keys are shown).
//
// It NEVER touches the piano engine, the viewport, note-to-key mapping, MIDI or
// audio pitch, key highlighting, or keyboard sizing/scaling — it only decorates
// existing key elements with a label layer. Visibility is gated by the existing
// html[data-view="learn"] attribute, so it appears in the Foundation Course and
// leaves Scales / Chord / Sight-Reading visually untouched. Reusable: add other
// view ids to the gate selector to enable it for future stages.
// Original KeyMaster material.

const STYLE_ID = 'km-compass-style';

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
  .km-compass-mark{
    position:absolute; left:50%; bottom:.4rem; transform:translateX(-50%);
    display:none; pointer-events:none; z-index:3; white-space:nowrap; text-align:center;
    font-size:.62rem; font-weight:650; letter-spacing:.02em; line-height:1.05;
    color:var(--ivory-faint,#9a9182);
  }
  .km-compass-mark__oct{display:block;}
  .km-compass-mark--mid{
    color:var(--gold,#E0A94B); font-size:.68rem;
    text-shadow:0 1px 2px rgba(0,0,0,.35);
  }
  .km-compass-mark--mid .km-compass-mark__name{
    display:block; margin-top:.12rem; font-size:.5rem; font-weight:600;
    letter-spacing:.05em; text-transform:uppercase; opacity:.92;
  }
  /* Show only inside the Foundation Course, and only on on-window keys. */
  html[data-view="learn"] .km-compass-mark{display:block;}
  .key.is-offscreen .km-compass-mark{display:none;}
  `;
  document.head.appendChild(s);
}

// Scientific pitch: midi 60 -> C4 (Middle C).
const octaveOf = (midi) => Math.floor(midi / 12) - 1;
const isC = (midi) => (((midi % 12) + 12) % 12) === 0;

/**
 * @param {{ keyboard: { keys: Map<number, { el: HTMLElement }> } }} ctx
 * @returns {{ mount: () => void, destroy: () => void }}
 */
export function createKeyboardCompass({ keyboard } = {}) {
  let mounted = false;

  function mount() {
    if (mounted || !keyboard || !keyboard.keys) return;
    injectStyle();
    for (const [midi, key] of keyboard.keys) {
      if (!isC(midi) || !key || !key.el) continue;
      if (key.el.querySelector('.km-compass-mark')) continue;   // idempotent
      const isMid = midi === 60;
      const mark = document.createElement('span');
      mark.className = 'km-compass-mark' + (isMid ? ' km-compass-mark--mid' : '');
      mark.setAttribute('aria-hidden', 'true');

      const oct = document.createElement('span');
      oct.className = 'km-compass-mark__oct';
      oct.textContent = `C${octaveOf(midi)}`;
      mark.appendChild(oct);

      if (isMid) {
        const name = document.createElement('span');
        name.className = 'km-compass-mark__name';
        name.textContent = 'Middle C';
        mark.appendChild(name);
      }
      key.el.appendChild(mark);
    }
    mounted = true;
  }

  function destroy() {
    if (!keyboard || !keyboard.keys) return;
    for (const [, key] of keyboard.keys) {
      key?.el?.querySelectorAll?.('.km-compass-mark')?.forEach((m) => m.remove());
    }
    mounted = false;
  }

  return { mount, destroy };
}
