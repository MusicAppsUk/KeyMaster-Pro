// staffViz.js — KeyMaster PRO Course music-staff teaching diagrams.
// =============================================================================
// Original geometry only: no scraped images, no stock notation art, no method-
// book or competitor graphics. Staff lines, note-heads, stems, ledgers and rests
// are all drawn from scratch as SVG; clefs/rests use standard Unicode music
// symbols (notation, not art) with text fallbacks.
//
// rc2-129 — PREMIUM COURSE NOTATION. Brings the Course staff up to the standard
// of Scales Masterclass / Cognitive Sight Reading:
//   • a larger, full-width staff (wider canvas, tablet-readable sizing)
//   • proper BLACK engraving ink (note-heads, stems, lines) — not brown/placeholder
//   • real note-heads WITH STEMS, and note-value support: crotchet (quarter,
//     filled + stem), minim (half, open + stem), semibreve (whole, open, no stem)
//   • rests (whole/half/quarter/eighth) for rhythm/silence
//   • treble / bass / grand staff with correct pitch placement + ledger lines
//   • feedback that mirrors the keyboard: correct → emerald glow, wrong → soft
//     rose (state lives on the SAME `km-staff__note` class the Course already
//     toggles, so existing feedback wiring lights up with no Course change)
//   • fingering numbers bound to the existing toggle (html[data-fingering=hidden])
// The premium look ships as a <style> injected by THIS module, so it overrides
// the older Course staff CSS without editing the large theme stylesheet, and the
// whole upgrade deploys as one small file. Class names are unchanged, so the
// Course's flashStaff() feedback and fingering preference keep working verbatim.
// =============================================================================

const GAP = 18;            // vertical distance between adjacent staff lines (larger = more readable)
const HALF = GAP / 2;      // one diatonic step = half a line gap
const STEM = Math.round(3.4 * GAP);   // stem length

// Wider canvas so the Course staff reads like real sheet music across the width.
const W = 720;
const LEFT = 64;           // x where the five lines begin (after the clef)
const RIGHT = 700;         // x where the lines end

// Horizontal note layout: always inside [NOTE_L, NOTE_R], comfortable when there
// is room, compressing to fit when there are many — centred, never past the lines.
const NOTE_L = 138;
const NOTE_R = RIGHT - 26;
const NOTE_SPACING = 58;
function noteXs(n) {
  if (n <= 0) return [];
  if (n === 1) return [Math.round((NOTE_L + NOTE_R) / 2)];
  const span = NOTE_R - NOTE_L;
  const spacing = Math.min(NOTE_SPACING, span / (n - 1));
  const groupW = spacing * (n - 1);
  const start = NOTE_L + (span - groupW) / 2;
  return Array.from({ length: n }, (_, i) => Math.round(start + i * spacing));
}

const LETTER = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // C C# D D# E F F# G G# A A# B
function staffStep(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return 7 * octave + LETTER[midi % 12];
}
const REF = {
  treble: { midi: 64, step: staffStep(64) },   // bottom line E4
  bass:   { midi: 43, step: staffStep(43) },   // bottom line G2
};

function staffLines(topY, highlight) {
  let out = '';
  for (let i = 0; i < 5; i += 1) {
    const y = topY + i * GAP;
    const hl = (highlight === 'lines') ? ' is-hl' : '';
    out += `<line class="km-staff__line${hl}" x1="${LEFT}" y1="${y}" x2="${RIGHT}" y2="${y}"/>`;
  }
  if (highlight === 'spaces') {
    for (let i = 0; i < 4; i += 1) {
      const y = topY + i * GAP + HALF;
      out += `<rect class="km-staff__space is-hl" x="${LEFT + 2}" y="${y - HALF + 1}" width="${RIGHT - LEFT - 4}" height="${GAP - 2}" rx="3"/>`;
    }
  }
  return out;
}

function clefMark(clef, topY) {
  if (clef === 'treble') {
    return `<text class="km-staff__clef" x="28" y="${topY + 3.4 * GAP}" text-anchor="middle">\uD834\uDD1E</text>`
      + `<text class="km-staff__cleflabel" x="28" y="${topY + 5 * GAP + 15}" text-anchor="middle">treble</text>`;
  }
  return `<text class="km-staff__clef km-staff__clef--bass" x="28" y="${topY + 1.7 * GAP}" text-anchor="middle">\uD834\uDD22</text>`
    + `<text class="km-staff__cleflabel" x="28" y="${topY + 5 * GAP + 15}" text-anchor="middle">bass</text>`;
}

function noteY(midi, clef, topY) {
  const bottomLineY = topY + 4 * GAP;
  const ref = REF[clef];
  return bottomLineY - (staffStep(midi) - ref.step) * HALF;
}

function ledgersFor(midi, clef, topY, cx) {
  const ref = REF[clef];
  const step = staffStep(midi);
  const topLineStep = ref.step + 8;
  let out = '';
  const half = 13;
  if (step < ref.step) {
    for (let s = ref.step - 2; s >= step; s -= 2) {
      const y = topY + 4 * GAP - (s - ref.step) * HALF;
      out += `<line class="km-staff__ledger" x1="${cx - half}" y1="${y}" x2="${cx + half}" y2="${y}"/>`;
    }
  } else if (step > topLineStep) {
    for (let s = topLineStep + 2; s <= step; s += 2) {
      const y = topY - (s - topLineStep) * HALF;
      out += `<line class="km-staff__ledger" x1="${cx - half}" y1="${y}" x2="${cx + half}" y2="${y}"/>`;
    }
  }
  return out;
}

// state: 'on' (amber target) | 'correct' (emerald) | 'wrong' (rose) | null.
function stateClass(state) {
  const s = (state === true) ? 'on' : (typeof state === 'string' ? state : null);
  return s ? ` is-${s}` : '';
}

// One value of a note's footprint, used for the vertical auto-fit so nothing clips.
function noteHeadGeom(value) {
  if (value === 'whole') return { rx: 11.6, ry: 8.2, rot: 0, open: true, stem: false };
  if (value === 'half') return { rx: 10.4, ry: 7.6, rot: -20, open: true, stem: true };
  return { rx: 10.4, ry: 7.6, rot: -20, open: false, stem: true };   // quarter (crotchet) default
}

function noteHead(midi, clef, topY, cx, state, finger, value) {
  const y = noteY(midi, clef, topY);
  const g = noteHeadGeom(value);
  const cls = 'km-staff__note' + (g.open ? ' km-staff__note--open' : '') + stateClass(state);
  let out = ledgersFor(midi, clef, topY, cx)
    + `<ellipse class="${cls}" cx="${cx}" cy="${y}" rx="${g.rx}" ry="${g.ry}" transform="rotate(${g.rot} ${cx} ${y})"/>`;
  let stemUp = true;
  if (g.stem) {
    const midLineY = topY + 2 * GAP;     // middle (3rd) line
    stemUp = y >= midLineY;              // note on/below middle line -> stem up
    const sx = stemUp ? (cx + g.rx - 1.6) : (cx - g.rx + 1.6);
    const y2 = stemUp ? (y - STEM) : (y + STEM);
    out += `<line class="km-staff__stem" x1="${sx}" y1="${y}" x2="${sx}" y2="${y2}"/>`;
  }
  if (Number.isFinite(finger)) {
    const fy = (g.stem && stemUp) ? (y - STEM - 7) : (y - g.ry - 11);
    out += `<text class="km-staff__finger" x="${cx}" y="${fy}" text-anchor="middle">${finger}</text>`;
  }
  return out;
}

// Vertical extent [top, bottom] of a note + stem + fingering, for auto-fit.
function noteBounds(midi, clef, topY, value, hasFinger) {
  const y = noteY(midi, clef, topY);
  const g = noteHeadGeom(value);
  let top = y - g.ry - 4;
  let bot = y + g.ry + 4;
  let stemUp = true;
  if (g.stem) {
    const midLineY = topY + 2 * GAP;
    stemUp = y >= midLineY;
    if (stemUp) top = y - STEM - 4; else bot = y + STEM + 4;
  }
  if (hasFinger) top = Math.min(top, ((g.stem && stemUp) ? (y - STEM) : (y - g.ry)) - 20);
  return [top, bot];
}

// Original rest glyphs (standard Unicode music symbols — notation, not art).
const REST_GLYPH = {
  whole: '\uD834\uDD3B', half: '\uD834\uDD3C', quarter: '\uD834\uDD3D', eighth: '\uD834\uDD3E',
};
function restGlyph(type, cx, topY) {
  const g = REST_GLYPH[type] || REST_GLYPH.quarter;
  const y = topY + 2 * GAP + 7;
  return `<text class="km-staff__rest" x="${cx}" y="${y}" text-anchor="middle">${g}</text>`;
}

// Normalise: entries may be a MIDI number, { midi, state, finger, value }, or
// { rest: 'quarter'|'half'|'whole'|'eighth' }. value defaults to 'quarter'.
function normaliseSeq(notes) {
  return notes.map((n) => {
    if (typeof n === 'number') return { midi: n, state: 'on', value: 'quarter' };
    if (n && typeof n === 'object') {
      if (n.rest) return { rest: String(n.rest) };
      return {
        midi: n.midi,
        state: (n.state === undefined ? 'on' : n.state),
        finger: n.finger,
        value: (typeof n.value === 'string' ? n.value : 'quarter'),
      };
    }
    return { midi: n, state: 'on', value: 'quarter' };
  });
}

const REST_TOP_MARK = 2 * GAP + 12;

/**
 * Build a staff diagram.
 * @param {object} opts
 *   clef       'treble' | 'bass' | 'grand'   (default 'treble')
 *   highlight  'lines' | 'spaces' | null      (default null)
 *   notes      Array of MIDI numbers, or { midi, state, finger, value } objects,
 *              or { rest: 'quarter'|'half'|'whole'|'eighth' } entries.
 *   middleC    boolean   mark Middle C on the grand staff   (default false)
 * @returns {HTMLDivElement} <div class="km-staff km-staff--{clef}">
 */
export function buildStaff(opts = {}) {
  injectStaffStyles();
  const clef = (opts.clef === 'bass' || opts.clef === 'grand') ? opts.clef : 'treble';
  const highlight = (opts.highlight === 'lines' || opts.highlight === 'spaces') ? opts.highlight : null;
  const seq = normaliseSeq(Array.isArray(opts.notes) ? opts.notes : []);
  const middleC = !!opts.middleC;

  let body = '';
  const ys = [];
  const mark = (y) => { if (Number.isFinite(y)) ys.push(y); };

  if (clef === 'grand') {
    const trebleTop = 34;
    const bassTop = trebleTop + 4 * GAP + 3 * GAP + 8;
    body += staffLines(trebleTop, highlight) + clefMark('treble', trebleTop);
    body += staffLines(bassTop, highlight) + clefMark('bass', bassTop);
    body += `<line class="km-staff__brace" x1="${LEFT}" y1="${trebleTop}" x2="${LEFT}" y2="${bassTop + 4 * GAP}"/>`;
    body += `<line class="km-staff__brace" x1="${RIGHT}" y1="${trebleTop}" x2="${RIGHT}" y2="${bassTop + 4 * GAP}"/>`;
    mark(trebleTop - 14);
    mark(bassTop + 5 * GAP + 18);
    if (middleC) {
      const cx = Math.round((LEFT + RIGHT) / 2);
      body += noteHead(60, 'treble', trebleTop, cx, 'on', undefined, 'quarter');
      body += `<text class="km-staff__mc" x="${cx + 20}" y="${noteY(60, 'treble', trebleTop) + 4}">Middle C</text>`;
      const [t, b] = noteBounds(60, 'treble', trebleTop, 'quarter', false); mark(t); mark(b);
    }
    const gxs = noteXs(seq.length);
    seq.forEach((it, i) => {
      const cx = gxs[i];
      if (it.rest) { body += restGlyph(it.rest, cx, trebleTop); mark(trebleTop + REST_TOP_MARK); return; }
      const useClef = (it.midi >= 60) ? 'treble' : 'bass';
      const top = (useClef === 'treble') ? trebleTop : bassTop;
      body += noteHead(it.midi, useClef, top, cx, it.state, it.finger, it.value);
      const [t, b] = noteBounds(it.midi, useClef, top, it.value, Number.isFinite(it.finger)); mark(t); mark(b);
    });
  } else {
    const topY = 34;
    body += staffLines(topY, highlight) + clefMark(clef, topY);
    mark(topY - 14);
    mark(topY + 5 * GAP + 18);
    const xs = noteXs(seq.length);
    seq.forEach((it, i) => {
      if (it.rest) { body += restGlyph(it.rest, xs[i], topY); mark(topY + REST_TOP_MARK); return; }
      body += noteHead(it.midi, clef, topY, xs[i], it.state, it.finger, it.value);
      const [t, b] = noteBounds(it.midi, clef, topY, it.value, Number.isFinite(it.finger)); mark(t); mark(b);
    });
  }

  const PAD = 8;
  const yTop = Math.floor(Math.min(0, ...ys) - PAD);
  const yBot = Math.ceil(Math.max(...ys) + PAD);
  const vbH = Math.max(1, yBot - yTop);

  const aria = clef === 'grand' ? 'Grand staff' : (clef === 'bass' ? 'Bass staff' : 'Treble staff');
  const svg = `<svg class="km-staff__svg" viewBox="0 ${yTop} ${W} ${vbH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${aria}">${body}</svg>`;
  const wrap = document.createElement('div');
  wrap.className = `km-staff km-staff--${clef}`;
  wrap.innerHTML = svg;
  return wrap;
}

// Premium Course-staff styling, injected once and scoped exactly like the Course
// stylesheet (.view[data-view="learn"] .km-staff*) so it overrides the older
// rules by cascade order without touching the large theme stylesheet. Note-head
// colours are true engraving black; feedback mirrors the keyboard (emerald/rose);
// the fingering toggle rule is restated so it works regardless of theme version.
let stylesInjected = false;
function injectStaffStyles() {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById('km-staff-premium-css')) { stylesInjected = true; return; }
  const css = `
.view[data-view="learn"] .km-staff{display:block;width:min(720px,100%);margin-inline:auto;padding:clamp(.8rem,2.4vw,1.25rem) clamp(.9rem,3vw,1.5rem);background:linear-gradient(176deg,#FCFAF5 0%,#F2EDE2 100%);border-radius:14px;border:1px solid rgba(20,17,11,.14);box-shadow:0 14px 30px -10px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.7);}
.view[data-view="learn"] .km-staff__svg{display:block;width:100%;max-width:100%;height:auto;max-height:min(34vh,300px);overflow:visible;}
.view[data-view="learn"] .km-staff--grand{padding-top:.55rem;padding-bottom:.5rem;}
.view[data-view="learn"] .km-staff__line{stroke:#1b1814;stroke-width:1.9;}
.view[data-view="learn"] .km-staff__ledger{stroke:#1b1814;stroke-width:1.9;}
.view[data-view="learn"] .km-staff__brace{stroke:#141210;stroke-width:2.8;stroke-linecap:round;}
.view[data-view="learn"] .km-staff__stem{stroke:#141210;stroke-width:2;stroke-linecap:round;}
.view[data-view="learn"] .km-staff__clef{fill:#141210;font-size:66px;font-weight:400;}
.view[data-view="learn"] .km-staff__clef--bass{font-size:52px;}
.view[data-view="learn"] .km-staff__cleflabel{fill:#6b6456;font-size:12.5px;letter-spacing:.05em;}
.view[data-view="learn"] .km-staff__note{fill:#141210;stroke:none;transition:fill .18s ease,filter .2s ease,stroke .18s ease;}
.view[data-view="learn"] .km-staff__note--open{fill:#FCFAF5;stroke:#141210;stroke-width:2.4;}
.view[data-view="learn"] .km-staff__mc{fill:#141210;font-size:13.5px;font-weight:700;}
.view[data-view="learn"] .km-staff__rest{fill:#141210;font-size:36px;}
.view[data-view="learn"] .km-staff__finger{fill:#4a4436;font-size:15px;font-weight:700;font-family:var(--font-ui,system-ui,sans-serif);}
html[data-fingering="hidden"] .view[data-view="learn"] .km-staff__finger{display:none;}
.view[data-view="learn"] .km-staff__line.is-hl{stroke:#E0A94B;stroke-width:3.2;}
.view[data-view="learn"] .km-staff__space.is-hl{fill:rgba(224,169,75,.28);}
.view[data-view="learn"] .km-staff__note.is-on{fill:#E0A94B;stroke:color-mix(in srgb,#E0A94B 60%,#3a2a08);stroke-width:1.6;}
.view[data-view="learn"] .km-staff__note--open.is-on{fill:#FCFAF5;stroke:#E0A94B;stroke-width:2.6;}
.view[data-view="learn"] .km-staff__note.is-correct{fill:#46C08A;stroke:none;filter:drop-shadow(0 0 5px rgba(70,192,138,.5));}
.view[data-view="learn"] .km-staff__note--open.is-correct{fill:#46C08A;stroke:none;}
.view[data-view="learn"] .km-staff__note.is-wrong{fill:#D98A92;stroke:rgba(217,138,146,.55);stroke-width:1.4;}
.view[data-view="learn"] .km-staff__note--open.is-wrong{fill:#D98A92;}
@media (prefers-reduced-motion:reduce){.view[data-view="learn"] .km-staff__note{transition:none;}.view[data-view="learn"] .km-staff__note.is-correct{filter:none;}}
`;
  const style = document.createElement('style');
  style.id = 'km-staff-premium-css';
  style.textContent = css;
  document.head.appendChild(style);
  stylesInjected = true;
}
