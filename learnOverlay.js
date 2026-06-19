// learnOverlay.js
//
// Premium visual teaching cues for The KeyMaster PRO Course: brackets around
// black-key groups, a pointer/arrow from one key to another, and small amber
// labels. It draws NOTHING from hardcoded pixels — every shape is computed from the
// ACTUAL rendered key geometry, measured via getBoundingClientRect relative to the
// overlay's own layer. The layer lives inside `.piano` (which is position:relative and
// self-centres via a CSS transform), so the keys and the overlay translate together:
// the difference between a key's rect and the layer's rect is transform-independent and
// stays correct even during the centring animation, at any screen size.
//
// The geometry (overlayGeometry) is a PURE function, unit-tested headlessly; the DOM
// drawing is a thin layer, device-verified. Cues never block interaction
// (pointer-events:none) and only exist in learn mode.

const SVGNS = 'http://www.w3.org/2000/svg';

// Tunables (px). Kept here so the look can be adjusted from device feedback without
// touching geometry logic.
export const OVL = {
  bracketGap: 7,   // gap below a group before the bracket line
  tickLen: 9,      // length of the bracket's end ticks (point up toward the keys)
  arrowGap: 7,     // gap before an arrow leaves its source
  arrowHead: 9,    // arrowhead arm length
  labelGap: 7,     // gap between an anchor and its label
};

// Resolve a target (a single midi, or an array of midis treated as a group) to a box
// in layer coordinates: { left, right, top, bottom, cx }. Returns null if unresolved.
function boxFor(target, rectOf) {
  const midis = Array.isArray(target) ? target : [target];
  const rs = midis.map(rectOf).filter(Boolean);
  if (!rs.length) return null;
  const left = Math.min(...rs.map((r) => r.x));
  const right = Math.max(...rs.map((r) => r.x + r.w));
  const top = Math.min(...rs.map((r) => r.y));
  const bottom = Math.max(...rs.map((r) => r.y + r.h));
  return { left, right, top, bottom, cx: (left + right) / 2 };
}

/**
 * PURE geometry: given cues and a rectOf(midi) -> {x,y,w,h} lookup, return drawable
 * primitives in layer-pixel coordinates. No DOM. This is the error-prone part, so it is
 * isolated and unit-tested.
 */
export function overlayGeometry(cues, rectOf) {
  const out = { strokes: [], labels: [] };
  if (!cues) return out;

  // Brackets — sit just BELOW a group (black keys start at the top, so there is no room
  // above), with short ticks pointing up toward the keys, and an optional label below.
  for (const b of (cues.brackets || [])) {
    const g = boxFor(b.midis, rectOf);
    if (!g) continue;
    const y = g.bottom + OVL.bracketGap;
    out.strokes.push({ kind: 'bracket', x1: g.left, y1: y, x2: g.right, y2: y, tick: OVL.tickLen });
    if (b.label) out.labels.push({ cx: g.cx, y: y + OVL.labelGap, text: b.label, anchor: 'top' });
  }

  // Pointer/arrow — from a source key/group to a destination key.
  if (cues.arrow && cues.arrow.from != null && cues.arrow.to != null) {
    const from = boxFor(cues.arrow.from, rectOf);
    const to = boxFor(cues.arrow.to, rectOf);
    if (from && to) {
      const x1 = from.cx;
      const y1 = from.bottom + OVL.arrowGap;
      const x2 = to.cx;
      const y2 = to.top + (to.bottom - to.top) * 0.42;   // aim into the upper-middle of the target
      out.strokes.push({ kind: 'arrow', x1, y1, x2, y2, head: OVL.arrowHead });
    }
  }

  // Labels anchored to a single key, above or below it.
  for (const l of (cues.labels || [])) {
    const r = rectOf(l.midi);
    if (!r) continue;
    const cx = r.x + r.w / 2;
    if (l.place === 'above') out.labels.push({ cx, y: r.y - OVL.labelGap, text: l.text, anchor: 'bottom' });
    else out.labels.push({ cx, y: r.y + r.h + OVL.labelGap, text: l.text, anchor: 'top' });
  }
  return out;
}

export function createLearnOverlay(keyboard) {
  const piano = (keyboard && keyboard.mountEl) || null;
  let layer = null;
  let svg = null;
  let current = null;
  let raf = 0;

  function ensure() {
    if (!piano || typeof document === 'undefined') return null;
    if (layer && layer.isConnected) return layer;
    layer = document.createElement('div');
    layer.className = 'mf-ovl';
    svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'mf-ovl__svg');
    layer.appendChild(svg);
    piano.appendChild(layer);
    return layer;
  }

  // rectOf in LAYER coordinates (transform-independent: both rects share the transform).
  function rectOf(midi) {
    const rec = keyboard.keys && keyboard.keys.get ? keyboard.keys.get(midi) : null;
    const el = rec && rec.el;
    if (!el || !layer) return null;
    const b = layer.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
  }

  function path(d, cls) {
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', cls);
    return p;
  }
  function clear() {
    if (svg) while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (layer) for (const n of [...layer.querySelectorAll('.mf-ovl__label')]) n.remove();
  }

  function draw() {
    if (!ensure()) return;
    clear();
    if (!current) return;
    const lb = layer.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${lb.width} ${lb.height}`);
    svg.setAttribute('width', String(lb.width));
    svg.setAttribute('height', String(lb.height));

    const g = overlayGeometry(current, rectOf);
    for (const s of g.strokes) {
      if (s.kind === 'bracket') {
        svg.appendChild(path(`M${s.x1} ${s.y1} L${s.x2} ${s.y2}`, 'mf-ovl__stroke'));
        svg.appendChild(path(`M${s.x1} ${s.y1} L${s.x1} ${s.y1 - s.tick}`, 'mf-ovl__stroke'));
        svg.appendChild(path(`M${s.x2} ${s.y1} L${s.x2} ${s.y1 - s.tick}`, 'mf-ovl__stroke'));
      } else if (s.kind === 'arrow') {
        svg.appendChild(path(`M${s.x1} ${s.y1} L${s.x2} ${s.y2}`, 'mf-ovl__arrow'));
        const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        const h = s.head;
        svg.appendChild(path(`M${s.x2} ${s.y2} L${s.x2 - h * Math.cos(a - 0.4)} ${s.y2 - h * Math.sin(a - 0.4)}`, 'mf-ovl__arrow'));
        svg.appendChild(path(`M${s.x2} ${s.y2} L${s.x2 - h * Math.cos(a + 0.4)} ${s.y2 - h * Math.sin(a + 0.4)}`, 'mf-ovl__arrow'));
      }
    }
    for (const l of g.labels) {
      const d = document.createElement('div');
      d.className = 'mf-ovl__label';
      d.textContent = l.text;
      d.style.left = `${l.cx}px`;
      d.style.top = `${l.y}px`;
      d.style.transform = l.anchor === 'bottom' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';
      layer.appendChild(d);
    }
  }

  function schedule() {
    if (typeof requestAnimationFrame === 'undefined') { draw(); return; }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  }

  return {
    render(cues) { current = cues || null; schedule(); },
    reflow() { if (current) schedule(); },
    clear() { current = null; clear(); },
    destroy() {
      current = null;
      if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf);
      if (layer) { layer.remove(); layer = null; svg = null; }
    },
  };
}
