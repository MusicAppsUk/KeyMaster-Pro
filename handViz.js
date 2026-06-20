// handViz.js — original KeyMaster PRO hand & finger-number diagrams.
// =============================================================================
// Built from scratch as simple, original SVG line art for KeyMaster PRO. No
// scraped images, no stock art, no method-book illustrations, no competitor
// assets. Pure geometry generated here.
//
// Teaches, at a glance:
//   • finger numbers — 1 = thumb … 5 = little finger
//   • right hand vs left hand (the left hand is the right, mirrored)
//   • a natural, curved hand shape with the thumb to the side
//   • which finger is active (any finger can be highlighted, or animated in
//     sequence for a "watch this" demonstration)
//
// The diagram is intentionally clean and diagrammatic rather than photographic:
// it reads clearly at small sizes on a phone and stays original and lightweight.
// =============================================================================

const W = 240;
const H = 262;

// Right-hand geometry (palm-down, fingers pointing up). Each finger carries the
// fingertip point (for its numbered disc) and the rounded-capsule body. The left
// hand mirrors every x across the vertical centre line; finger NUMBERS never
// mirror — the thumb is finger 1 in either hand.
const RH_FINGERS = [
  { n: 1, tipX: 52,  tipY: 152, x: 40,  y: 150, w: 26, h: 66, rot: -40, rcx: 53,  rcy: 178 }, // thumb
  { n: 2, tipX: 94,  tipY: 50,  x: 81,  y: 52,  w: 26, h: 104 },
  { n: 3, tipX: 126, tipY: 32,  x: 113, y: 34,  w: 26, h: 122 },
  { n: 4, tipX: 158, tipY: 48,  x: 145, y: 50,  w: 26, h: 106 },
  { n: 5, tipX: 190, tipY: 76,  x: 177, y: 78,  w: 26, h: 82  },
];

function mirrorFinger(f) {
  return {
    ...f,
    tipX: W - f.tipX,
    x: W - f.x - f.w,
    rot: (f.rot != null) ? -f.rot : undefined,
    rcx: (f.rcx != null) ? W - f.rcx : undefined,
  };
}

/**
 * Build an original hand diagram.
 * @param {object} opts
 *   hand       'right' | 'left'            (default 'right')
 *   highlight  number[]  fingers to mark active, e.g. [1,2,3]   (default [])
 *   numbers    boolean   show the 1–5 discs                     (default true)
 * @returns {HTMLDivElement} a <div class="km-hand"> wrapping the <svg>
 */
export function buildHandSvg(opts = {}) {
  const hand = (opts.hand === 'left') ? 'left' : 'right';
  const mirror = (hand === 'left');
  const showNumbers = opts.numbers !== false;
  const highlight = Array.isArray(opts.highlight) ? opts.highlight : [];
  const fingers = mirror ? RH_FINGERS.map(mirrorFinger) : RH_FINGERS;

  const palm = '<rect class="km-hand__palm" x="70" y="138" width="140" height="92" rx="40"/>';

  const shapes = fingers.map((f) => {
    const on = highlight.includes(f.n) ? ' is-on' : '';
    const transform = (f.rot != null && f.rcx != null)
      ? ` transform="rotate(${f.rot} ${f.rcx} ${f.rcy})"` : '';
    return `<rect class="km-finger${on}" data-finger="${f.n}" x="${f.x}" y="${f.y}" `
      + `width="${f.w}" height="${f.h}" rx="13"${transform}/>`;
  }).join('');

  const labels = showNumbers ? fingers.map((f) => {
    const on = highlight.includes(f.n) ? ' is-on' : '';
    return `<g class="km-fingernum${on}" data-finger="${f.n}">`
      + `<circle cx="${f.tipX}" cy="${f.tipY}" r="13.5"/>`
      + `<text x="${f.tipX}" y="${f.tipY + 5}" text-anchor="middle">${f.n}</text>`
      + '</g>';
  }).join('') : '';

  const tag = (hand === 'left') ? 'L' : 'R';
  const tagX = mirror ? (W - 22) : 22;
  const aria = `${hand === 'left' ? 'Left' : 'Right'} hand, fingers numbered 1 to 5`;

  const svg =
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">`
    + `<g class="km-hand__shapes">${palm}${shapes}</g>`
    + `<g class="km-hand__labels">${labels}</g>`
    + `<text class="km-hand__tag" x="${tagX}" y="250" text-anchor="middle">${tag}</text>`
    + '</svg>';

  const wrap = document.createElement('div');
  wrap.className = `km-hand km-hand--${hand}`;
  wrap.innerHTML = svg;
  return wrap;
}

/** Set which fingers are lit on an existing hand element (used for animation). */
export function setHandHighlight(handEl, fingers) {
  if (!handEl || !handEl.querySelectorAll) return;
  const want = new Set(Array.isArray(fingers) ? fingers : []);
  handEl.querySelectorAll('[data-finger]').forEach((node) => {
    const n = Number(node.getAttribute('data-finger'));
    node.classList.toggle('is-on', want.has(n));
  });
}

/** Finger names, for captions/labels. 1 = thumb … 5 = little finger. */
export const FINGER_NAMES = {
  1: 'thumb', 2: 'index finger', 3: 'middle finger', 4: 'ring finger', 5: 'little finger',
};
