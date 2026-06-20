// handViz.js — original KeyMaster PRO hand & finger-number teaching diagrams.
// =============================================================================
// Built entirely from geometry here. No scraped images, no stock art, no
// method-book illustrations, no competitor assets. Original KeyMaster PRO line
// art designed to be LARGE and instructional — a teaching diagram, not decor.
//
// Teaches at a glance:
//   • finger numbers — 1 = thumb … 5 = little finger
//   • right hand vs left hand (the left hand is the right, mirrored)
//   • a natural, curved hand shape with the thumb to the side
//   • which finger is active (any finger highlightable, or animated in sequence
//     for a "watch this" demonstration)
//   • how the two hands mirror, thumbs toward the centre (both-hands view)
//
// Clean and diagrammatic by design: it reads clearly at large sizes on a phone
// or tablet and stays original and lightweight.
// =============================================================================

const W = 260;
const H = 300;

// Right-hand geometry (palm-down, fingers up). Each finger: numbered-disc tip
// point + rounded-capsule body. The left hand mirrors every x across the centre
// line; finger NUMBERS never mirror — the thumb is finger 1 in either hand.
const RH_FINGERS = [
  { n: 1, tipX: 36,  tipY: 184, x: 44,  y: 176, w: 30, h: 80, rot: -42, rcx: 59,  rcy: 212 }, // thumb
  { n: 2, tipX: 94,  tipY: 62,  x: 78,  y: 64,  w: 32, h: 112 },
  { n: 3, tipX: 132, tipY: 42,  x: 116, y: 44,  w: 32, h: 132 },
  { n: 4, tipX: 170, tipY: 58,  x: 154, y: 60,  w: 32, h: 116 },
  { n: 5, tipX: 206, tipY: 92,  x: 190, y: 94,  w: 32, h: 86  },
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

function handSvg(hand, highlight, showNumbers, idSuffix) {
  const mirror = (hand === 'left');
  const fingers = mirror ? RH_FINGERS.map(mirrorFinger) : RH_FINGERS;
  const gid = `kmHandGrad-${idSuffix}`;

  const defs =
    `<defs>`
    + `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0%" stop-color="var(--km-hand-hi, #efe7d6)"/>`
    + `<stop offset="100%" stop-color="var(--km-hand-lo, #cfc4ad)"/>`
    + `</linearGradient></defs>`;

  // wrist + palm read as a single solid mass under the fingers
  const wrist = '<rect class="km-hand__palm" x="96" y="240" width="68" height="52" rx="24"/>';
  const palm  = '<rect class="km-hand__palm" x="64" y="158" width="150" height="96" rx="44"/>';

  const shapes = fingers.map((f) => {
    const on = highlight.includes(f.n) ? ' is-on' : '';
    const transform = (f.rot != null && f.rcx != null)
      ? ` transform="rotate(${f.rot} ${f.rcx} ${f.rcy})"` : '';
    return `<rect class="km-finger${on}" data-finger="${f.n}" x="${f.x}" y="${f.y}" `
      + `width="${f.w}" height="${f.h}" rx="16"${transform}/>`;
  }).join('');

  const labels = showNumbers ? fingers.map((f) => {
    const on = highlight.includes(f.n) ? ' is-on' : '';
    return `<g class="km-fingernum${on}" data-finger="${f.n}">`
      + `<circle cx="${f.tipX}" cy="${f.tipY}" r="17"/>`
      + `<text x="${f.tipX}" y="${f.tipY + 6}" text-anchor="middle">${f.n}</text>`
      + '</g>';
  }).join('') : '';

  const tag = (hand === 'left') ? 'L' : 'R';
  const tagX = mirror ? (W - 26) : 26;
  const aria = `${hand === 'left' ? 'Left' : 'Right'} hand, fingers numbered 1 to 5`;

  return `<svg class="km-hand__svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}" style="--km-grad:url(#${gid})">`
    + defs
    + `<g class="km-hand__shapes" fill="url(#${gid})">${wrist}${palm}${shapes}</g>`
    + `<g class="km-hand__labels">${labels}</g>`
    + `<text class="km-hand__tag" x="${tagX}" y="284" text-anchor="middle">${tag}</text>`
    + '</svg>';
}

/**
 * Build a hand diagram.
 * @param {object} opts
 *   hand       'right' | 'left' | 'both'   (default 'right')
 *   highlight  number[]  fingers to mark active                 (default [])
 *   numbers    boolean   show the 1–5 discs                     (default true)
 * @returns {HTMLDivElement} <div class="km-hand km-hand--{hand}">
 */
export function buildHandSvg(opts = {}) {
  const hand = (opts.hand === 'left' || opts.hand === 'both') ? opts.hand : 'right';
  const showNumbers = opts.numbers !== false;
  const highlight = Array.isArray(opts.highlight) ? opts.highlight : [];

  const wrap = document.createElement('div');
  wrap.className = `km-hand km-hand--${hand}`;
  if (hand === 'both') {
    // Left hand on the left, right hand on the right — as the player sees their
    // own hands at the keyboard, thumbs toward the centre.
    wrap.innerHTML = handSvg('left', highlight, showNumbers, 'l') + handSvg('right', highlight, showNumbers, 'r');
  } else {
    wrap.innerHTML = handSvg(hand, highlight, showNumbers, hand[0]);
  }
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
