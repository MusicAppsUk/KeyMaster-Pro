// staffViz.js — KeyMaster PRO Course music-staff teaching diagrams.
// =============================================================================
// Original geometry only: no scraped images, no stock notation art, no method-
// book or competitor graphics. Staff lines, note-heads, stems, ledgers and rests
// are all drawn from scratch as SVG; clefs/rests/time-signatures use standard
// Unicode music symbols (notation, not art) with text fallbacks.
//
// rc2-135 — COURSE NOTATION LAYOUT FIXES (on top of the rc2-134 premium staff):
//   1. BASS CLEF alignment. The bass clef now shares the treble clef's exact
//      baseline + size. In a SMuFL music font every clef is registered to print
//      correctly at the same baseline, so the F-clef dots land on the F line
//      when it sits where the (confirmed-correct) treble clef sits. The earlier
//      heuristic baseline placed the bass clef ~1.5 staff-spaces too high.
//   2. HAND vs STAFF priority. When a Course step shows BOTH a hand diagram and
//      a staff (the staff-reading exercises), notation wins: the hand shrinks to
//      a compact reference badge so the grand staff is fully visible. Pure hand-
//      teaching steps carry no staff and are untouched (full-size hand kept).
//      Done in this module's injected stylesheet via :has(), with a JS
//      `is-aside` fallback — no change to the frozen theme stylesheet.
//
// rc2-134 — PREMIUM COURSE NOTATION v2. Closes the gap to Scales Masterclass /
// Cognitive Sight Reading (staffView.js + notation.css), which are the in-app
// reference standard. Those files are NOT touched; their proven values are
// re-used here in this module's own injected stylesheet:
//   • LARGER, tablet-readable staff (GAP 20, fluid full-width canvas, generous
//     vertical room so the grand staff is no longer squashed)
//   • PROPER BLACK ENGRAVING INK on note-heads (was a brown/amber "target"
//     tint — the most-reported issue). Resting/target notes are now true black
//     (#14110B, the masterclass --ink); the staff only takes on colour for
//     feedback. "Success glows. Mistakes guide."
//   • CRISP CLEFS / RESTS via the same music-font stack the masterclass uses
//     ('Bravura','Noto Music',serif) — on Android 'Noto Music' is a system
//     font, so the Course clef now renders like the masterclass instead of in a
//     dull default glyph.
//   • a real TIME SIGNATURE (stacked serif digits), shown where rhythm is being
//     taught and kept off plain single-note Foundation moments (conservative
//     heuristic, overridable via opts.timeSig).
//   • REST glyphs (whole/half/quarter/eighth) for silence/rhythm.
//   • TREBLE / BASS / GRAND staff with correct pitch placement + ledger lines.
//   • FEEDBACK bound to the SAME tokens the keyboard uses: correct → var(--good)
//     glow, wrong → soft var(--bad) rose. Staff and keyboard therefore always
//     agree, and a wrong note keeps the intended note VISIBLE (recolour, never
//     hidden, never a harsh/arcade flash) then settles back to black.
//   • FINGERING numbers bound to the existing toggle (html[data-fingering=
//     hidden]) in the masterclass's premium gold — rendered ONLY where the step
//     supplies a finger (no invented fingering).
// The premium look ships as a <style> injected by THIS module, scoped exactly
// like the Course staff (.view[data-view="learn"] .km-staff*), so it overrides
// the older Course staff CSS by cascade order WITHOUT editing the large theme
// stylesheet — the whole upgrade deploys as one small file. Class names and the
// buildStaff() signature are unchanged, so the Course's flashStaff() feedback
// and fingering preference keep working verbatim.
// =============================================================================

const GAP = 20;            // vertical distance between adjacent staff lines (larger = more readable)
const HALF = GAP / 2;      // one diatonic step = half a line gap
const STEM = Math.round(3.4 * GAP);   // stem length (matches masterclass 3.4 staff-spaces)
const LEDGER_HALF = Math.round(0.72 * GAP);   // half-width of a ledger line

// Wider canvas so the Course staff reads like real sheet music across the width.
const W = 720;
const LEFT = 64;           // x where the five lines begin (after the clef + meter)
const RIGHT = 700;         // x where the lines end

// Time-signature column (after the clef, before the first note).
const TS_X = 66;

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
    return `<text class="km-staff__clef" x="30" y="${topY + 3.35 * GAP}" text-anchor="middle">\uD834\uDD1E</text>`
      + `<text class="km-staff__cleflabel" x="30" y="${topY + 5 * GAP + 16}" text-anchor="middle">treble</text>`;
  }
  // Bass clef shares the treble's baseline + size: in a SMuFL music font
  // (Bravura / Noto Music) every clef is registered to print correctly at the
  // SAME baseline, so the F-clef dots land on the F line when it sits exactly
  // where the (confirmed-correct) treble clef sits. The earlier 1.75*GAP guess
  // placed it ~1.5 spaces too high — that was the off-centre bass clef.
  return `<text class="km-staff__clef km-staff__clef--bass" x="30" y="${topY + 3.35 * GAP}" text-anchor="middle">\uD834\uDD22</text>`
    + `<text class="km-staff__cleflabel" x="30" y="${topY + 5 * GAP + 16}" text-anchor="middle">bass</text>`;
}

// Stacked time-signature digits (serif, like the masterclass — NOT the music
// font). numerator sits in the upper half of the staff, denominator in the lower.
function timeSigMark(num, den, topY) {
  const ny = topY + Math.round(1.55 * GAP);
  const dy = topY + Math.round(3.62 * GAP);
  return `<text class="km-staff__timesig" x="${TS_X}" y="${ny}" text-anchor="middle">${num}</text>`
    + `<text class="km-staff__timesig" x="${TS_X}" y="${dy}" text-anchor="middle">${den}</text>`;
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
  if (step < ref.step) {
    for (let s = ref.step - 2; s >= step; s -= 2) {
      const y = topY + 4 * GAP - (s - ref.step) * HALF;
      out += `<line class="km-staff__ledger" x1="${cx - LEDGER_HALF}" y1="${y}" x2="${cx + LEDGER_HALF}" y2="${y}"/>`;
    }
  } else if (step > topLineStep) {
    for (let s = topLineStep + 2; s <= step; s += 2) {
      const y = topY - (s - topLineStep) * HALF;
      out += `<line class="km-staff__ledger" x1="${cx - LEDGER_HALF}" y1="${y}" x2="${cx + LEDGER_HALF}" y2="${y}"/>`;
    }
  }
  return out;
}

// state: 'on' (target) | 'correct' | 'wrong' | null. NOTE: 'on' now renders as
// black engraving ink (see CSS) — colour is reserved for correct/wrong feedback.
function stateClass(state) {
  const s = (state === true) ? 'on' : (typeof state === 'string' ? state : null);
  return s ? ` is-${s}` : '';
}

// A note's head footprint (scaled to GAP), used for drawing + vertical auto-fit.
function noteHeadGeom(value) {
  if (value === 'whole') return { rx: 0.64 * GAP, ry: 0.45 * GAP, rot: 0, open: true, stem: false };
  if (value === 'half') return { rx: 0.58 * GAP, ry: 0.42 * GAP, rot: -20, open: true, stem: true };
  return { rx: 0.58 * GAP, ry: 0.42 * GAP, rot: -20, open: false, stem: true };   // quarter (crotchet) default
}

function noteHead(midi, clef, topY, cx, state, finger, value, letter) {
  const y = noteY(midi, clef, topY);
  const g = noteHeadGeom(value);
  const cls = 'km-staff__note' + (g.open ? ' km-staff__note--open' : '') + stateClass(state);
  let out = ledgersFor(midi, clef, topY, cx)
    + `<ellipse class="${cls}" cx="${cx}" cy="${y}" rx="${g.rx.toFixed(2)}" ry="${g.ry.toFixed(2)}" transform="rotate(${g.rot} ${cx} ${y})"/>`;
  let stemUp = true;
  if (g.stem) {
    const midLineY = topY + 2 * GAP;     // middle (3rd) line
    stemUp = y >= midLineY;              // note on/below middle line -> stem up
    const sx = stemUp ? (cx + g.rx - 1.6) : (cx - g.rx + 1.6);
    const y2 = stemUp ? (y - STEM) : (y + STEM);
    out += `<line class="km-staff__stem" x1="${sx.toFixed(2)}" y1="${y}" x2="${sx.toFixed(2)}" y2="${y2}"/>`;
  }
  if (Number.isFinite(finger)) {
    const fy = (g.stem && stemUp) ? (y - STEM - 8) : (y - g.ry - 12);
    out += `<text class="km-staff__finger" x="${cx}" y="${fy.toFixed(1)}" text-anchor="middle">${finger}</text>`;
  }
  if (typeof letter === 'string' && letter) {
    const ly = y + g.ry + 15;
    out += `<text class="km-staff__letter" x="${cx}" y="${ly.toFixed(1)}" text-anchor="middle">${letter}</text>`;
  }
  return out;
}

// Vertical extent [top, bottom] of a note + stem + fingering, for auto-fit.
function noteBounds(midi, clef, topY, value, hasFinger, hasLetter) {
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
  if (hasFinger) top = Math.min(top, ((g.stem && stemUp) ? (y - STEM) : (y - g.ry)) - 22);
  if (hasLetter) bot = Math.max(bot, y + g.ry + 24);
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
        letter: (typeof n.letter === 'string' ? n.letter : undefined),
      };
    }
    return { midi: n, state: 'on', value: 'quarter' };
  });
}

// Decide the time signature to engrave.
//   • explicit opts.timeSig: '4/4' | '3/4' | [n, d] | false (force off)  → honoured
//   • otherwise (undefined): show common time ONLY when the staff is clearly a
//     RHYTHM exercise — ≥2 sounding notes AND (a rest is present OR a note uses a
//     value other than a plain quarter). Plain single notes / pitch-reading rows
//     stay clean (no meter), so early Foundation moments are uncluttered.
function resolveTimeSig(opt, seq) {
  if (opt === false) return null;
  if (typeof opt === 'string') {
    const m = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(opt.trim());
    if (m) return [m[1], m[2]];
    return null;
  }
  if (Array.isArray(opt) && opt.length === 2) return [String(opt[0]), String(opt[1])];
  // Heuristic default.
  const sounding = seq.filter((it) => !it.rest);
  const hasRest = seq.some((it) => it.rest);
  const hasRhythm = seq.some((it) => !it.rest && it.value && it.value !== 'quarter');
  if (sounding.length >= 2 && (hasRest || hasRhythm)) return ['4', '4'];
  return null;
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
 *   timeSig    '4/4' | '3/4' | [n,d] | false  (optional; see resolveTimeSig)
 * @returns {HTMLDivElement} <div class="km-staff km-staff--{clef}">
 */
export function buildStaff(opts = {}) {
  injectStaffStyles();
  const clef = (opts.clef === 'bass' || opts.clef === 'grand') ? opts.clef : 'treble';
  const highlight = (opts.highlight === 'lines' || opts.highlight === 'spaces') ? opts.highlight : null;
  const seq = normaliseSeq(Array.isArray(opts.notes) ? opts.notes : []);
  const middleC = !!opts.middleC;
  const tsig = resolveTimeSig(opts.timeSig, seq);

  let body = '';
  const ys = [];
  const mark = (y) => { if (Number.isFinite(y)) ys.push(y); };

  if (clef === 'grand') {
    const trebleTop = 34;
    const bassTop = trebleTop + 4 * GAP + 3 * GAP + 8;
    body += staffLines(trebleTop, highlight) + clefMark('treble', trebleTop);
    body += staffLines(bassTop, highlight) + clefMark('bass', bassTop);
    if (tsig) { body += timeSigMark(tsig[0], tsig[1], trebleTop) + timeSigMark(tsig[0], tsig[1], bassTop); }
    body += `<line class="km-staff__brace" x1="${LEFT}" y1="${trebleTop}" x2="${LEFT}" y2="${bassTop + 4 * GAP}"/>`;
    body += `<line class="km-staff__endbar" x1="${RIGHT}" y1="${trebleTop}" x2="${RIGHT}" y2="${bassTop + 4 * GAP}"/>`;
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
      body += noteHead(it.midi, useClef, top, cx, it.state, it.finger, it.value, it.letter);
      const [t, b] = noteBounds(it.midi, useClef, top, it.value, Number.isFinite(it.finger), !!it.letter); mark(t); mark(b);
    });
  } else {
    const topY = 34;
    body += staffLines(topY, highlight) + clefMark(clef, topY);
    if (tsig) { body += timeSigMark(tsig[0], tsig[1], topY); }
    mark(topY - 14);
    mark(topY + 5 * GAP + 18);
    const xs = noteXs(seq.length);
    seq.forEach((it, i) => {
      if (it.rest) { body += restGlyph(it.rest, xs[i], topY); mark(topY + REST_TOP_MARK); return; }
      body += noteHead(it.midi, clef, topY, xs[i], it.state, it.finger, it.value, it.letter);
      const [t, b] = noteBounds(it.midi, clef, topY, it.value, Number.isFinite(it.finger), !!it.letter); mark(t); mark(b);
    });
    // rc2-178: proper manuscript barlines. opts.bars is a list of 1-based note
    // indices after which an internal barline falls; an end barline closes the
    // line. Additive — only renders when a step requests bars, so existing
    // diagram-style staffs are untouched. Reuses the endbar stroke.
    const bars = Array.isArray(opts.bars) ? opts.bars : [];
    if (bars.length) {
      bars.forEach((b) => {
        const k = Math.round(b) - 1;
        if (k >= 0 && k < xs.length - 1) {
          const bx = Math.round((xs[k] + xs[k + 1]) / 2);
          body += `<line class="km-staff__endbar" x1="${bx}" y1="${topY}" x2="${bx}" y2="${topY + 4 * GAP}"/>`;
        }
      });
      body += `<line class="km-staff__endbar" x1="${RIGHT}" y1="${topY}" x2="${RIGHT}" y2="${topY + 4 * GAP}"/>`;
    }
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
  scheduleHandDemotion();
  return wrap;
}

// Fallback for the "notation has priority" layout when :has() is unavailable.
// A Course step that shows BOTH a hand and a staff should demote the hand to a
// compact badge so the staff is fully visible. The CSS does this via :has();
// this JS belt-and-suspenders sets an `is-aside` class on the (per-step) .km-hand
// when its .mf__show also contains a staff, and clears it otherwise. It runs on
// the next frame, after the Course has rendered both slots, and targets the
// freshly-created .km-hand each step, so no stale state can linger. Pure hand-
// teaching steps (no staff) never get the class, so the full hand is preserved.
function scheduleHandDemotion() {
  if (typeof document === 'undefined') return;
  const raf = (typeof requestAnimationFrame === 'function')
    ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
  raf(() => {
    try {
      document.querySelectorAll('.view[data-view="learn"] .mf__show').forEach((show) => {
        const hasStaff = !!show.querySelector('.km-staff');
        const hand = show.querySelector('.km-hand');
        if (hand) hand.classList.toggle('is-aside', hasStaff);
      });
    } catch (_) { /* layout assist only, never required */ }
  });
}

// Premium Course-staff styling, injected once and scoped exactly like the Course
// stylesheet (.view[data-view="learn"] .km-staff*) so it overrides the older
// rules by cascade order without touching the large theme stylesheet. Ink colours
// are the masterclass engraving black; feedback is bound to the SAME --good /
// --bad tokens the keyboard uses, so staff and keyboard always agree; the
// fingering toggle rule is restated so it works regardless of theme version.
let stylesInjected = false;
function injectStaffStyles() {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById('km-staff-premium-css')) { stylesInjected = true; return; }
  const INK = '#14110B';        // note-heads / stems / clefs / time-sig (masterclass --ink)
  const INK_DIM = '#2E2A22';    // staff lines / ledgers / barlines (masterclass --ink-dim)
  const PAPER = '#FCFAF5';      // open note-head fill
  const MUSIC_FONT = "'Bravura','Noto Music',serif";
  const SERIF = "var(--font-display,'Iowan Old Style','Palatino Linotype',Georgia,serif)";
  const css = `
.view[data-view="learn"] .km-staff{display:block;width:min(720px,100%);margin-inline:auto;padding:clamp(.85rem,2.6vw,1.35rem) clamp(.9rem,3vw,1.5rem);background:linear-gradient(176deg,#FCFAF5 0%,#F1ECE0 100%);border-radius:14px;border:1px solid rgba(20,17,11,.16);box-shadow:0 16px 34px -12px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.72);}
.view[data-view="learn"] .km-staff__svg{display:block;width:100%;max-width:100%;height:auto;max-height:min(46vh,420px);overflow:visible;}
.view[data-view="learn"] .km-staff--grand .km-staff__svg{max-height:min(58vh,520px);}
.view[data-view="learn"] .km-staff--grand{padding-top:.5rem;padding-bottom:.45rem;}
.view[data-view="learn"] .km-staff__line{stroke:${INK_DIM};stroke-width:1.9;}
.view[data-view="learn"] .km-staff__ledger{stroke:${INK_DIM};stroke-width:1.9;}
.view[data-view="learn"] .km-staff__brace{stroke:${INK};stroke-width:3;stroke-linecap:round;}
.view[data-view="learn"] .km-staff__endbar{stroke:${INK_DIM};stroke-width:1.8;}
.view[data-view="learn"] .km-staff__stem{stroke:${INK};stroke-width:2;stroke-linecap:round;}
.view[data-view="learn"] .km-staff__clef{fill:${INK};font-family:${MUSIC_FONT};font-size:68px;font-weight:400;}
.view[data-view="learn"] .km-staff__clef--bass{font-size:68px;}
.view[data-view="learn"] .km-staff__cleflabel{fill:#857C6B;font-size:12px;letter-spacing:.06em;font-family:var(--font-ui,system-ui,sans-serif);}
.view[data-view="learn"] .km-staff__timesig{fill:${INK};font-family:${SERIF};font-weight:700;font-size:40px;}
.view[data-view="learn"] .km-staff__note{fill:${INK};stroke:none;transition:fill .18s ease,filter .2s ease,stroke .18s ease;}
.view[data-view="learn"] .km-staff__note--open{fill:${PAPER};stroke:${INK};stroke-width:2.6;}
.view[data-view="learn"] .km-staff__note.is-on{fill:${INK};}
.view[data-view="learn"] .km-staff__note--open.is-on{fill:${PAPER};stroke:${INK};stroke-width:2.6;}
.view[data-view="learn"] .km-staff__mc{fill:${INK};font-size:14px;font-weight:700;font-family:var(--font-ui,system-ui,sans-serif);}
.view[data-view="learn"] .km-staff__rest{fill:${INK_DIM};font-family:${MUSIC_FONT};font-size:38px;}
.view[data-view="learn"] .km-staff__finger{fill:var(--brass-deep,#9A7330);font-size:16px;font-weight:700;font-family:var(--font-mono,ui-monospace,monospace);}
html[data-fingering="hidden"] .view[data-view="learn"] .km-staff__finger{display:none;}
.view[data-view="learn"] .km-staff__letter{fill:${INK};font-size:15px;font-weight:700;font-family:var(--font-ui,system-ui,sans-serif);}
.view[data-view="learn"] .km-staff__line.is-hl{stroke:#E0A94B;stroke-width:3.2;}
.view[data-view="learn"] .km-staff__space.is-hl{fill:rgba(224,169,75,.28);}
.view[data-view="learn"] .km-staff__note.is-correct{fill:var(--good,#36c46a);stroke:none;filter:drop-shadow(0 0 5px color-mix(in srgb,var(--good,#36c46a) 55%,transparent));}
.view[data-view="learn"] .km-staff__note--open.is-correct{fill:var(--good,#36c46a);stroke:none;}
.view[data-view="learn"] .km-staff__note.is-wrong{fill:color-mix(in srgb,var(--bad,#e0566a) 86%,#F4EFE6);stroke:none;}
.view[data-view="learn"] .km-staff__note--open.is-wrong{fill:color-mix(in srgb,var(--bad,#e0566a) 86%,#F4EFE6);stroke:none;}
/* HAND vs STAFF priority. When a step shows BOTH a hand diagram and a staff
   (the staff-reading exercises), notation wins: the hand shrinks to a compact
   reference badge so the grand staff stays fully visible. Pure hand-teaching
   steps carry no staff, so they never match and keep the full-size hand. Two
   delivery paths in SEPARATE rule blocks (a browser without :has() must still
   honour the .is-aside fallback set by JS, so they are not comma-joined). */
.view[data-view="learn"] .mf__show:has(.km-staff) .mf__hand{margin:.15rem 0 .5rem;}
.view[data-view="learn"] .mf__show:has(.km-staff) .km-hand__svg{width:118px;max-width:34%;max-height:min(22vh,168px);filter:drop-shadow(0 5px 12px rgba(0,0,0,.4));}
.view[data-view="learn"] .mf__show:has(.km-staff) .km-hand--both .km-hand__svg{width:94px;max-width:40%;}
.view[data-view="learn"] .km-hand.is-aside .km-hand__svg{width:118px;max-width:34%;max-height:min(22vh,168px);filter:drop-shadow(0 5px 12px rgba(0,0,0,.4));}
.view[data-view="learn"] .km-hand--both.is-aside .km-hand__svg{width:94px;max-width:40%;}
@media (prefers-reduced-motion:reduce){.view[data-view="learn"] .km-staff__note{transition:none;}.view[data-view="learn"] .km-staff__note.is-correct{filter:none;}}
`;
  const style = document.createElement('style');
  style.id = 'km-staff-premium-css';
  style.textContent = css;
  document.head.appendChild(style);
  stylesInjected = true;
}

// ---------------------------------------------------------------------------
// rc2-157: transient WRONG-NOTE GHOST.
// Draws "the note you actually played" at its real pitch over an already-rendered
// staff, so the learner sees the spatial relationship to the (neutral) target.
// ADDITIVE: buildStaff and all existing drawing are untouched — every existing
// staff renders byte-identically; this only runs on a wrong attempt and removes
// itself. The target note is never coloured red by this path.
//   staffWrap : the .km-staff element returned by buildStaff (found in the DOM)
//   midi      : the wrong MIDI the learner played
//   ms        : lifetime in milliseconds (default ~900)
export function flashPlayed(staffWrap, midi, ms) {
  try {
    if (!staffWrap || !Number.isFinite(midi)) return;
    const svg = staffWrap.querySelector('.km-staff__svg');
    if (!svg) return;

    const clef = staffWrap.classList.contains('km-staff--bass')  ? 'bass'
               : staffWrap.classList.contains('km-staff--grand') ? 'grand' : 'treble';
    // top-Y mirrors buildStaff exactly (treble/bass single = 34; grand picks a clef)
    let useClef = clef, topY = 34;
    if (clef === 'grand') {
      useClef = (midi >= 60) ? 'treble' : 'bass';
      topY = (useClef === 'treble') ? 34 : (34 + 4 * GAP + 3 * GAP + 8);
    }

    const cx = Math.round((NOTE_L + NOTE_R) / 2);   // same x a single target sits at
    let y = noteY(midi, useClef, topY);

    // soft clamp: a wildly-off note rides the viewBox edge instead of blowing out
    // the fixed layout; still clearly shows "you played far in this direction".
    const vb = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
    let clamped = false;
    if (vb.length === 4) {
      const top = vb[1] + 12, bot = vb[1] + vb[3] - 12;
      if (y < top) { y = top; clamped = true; }
      else if (y > bot) { y = bot; clamped = true; }
    }

    const NS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'km-staff__ghost' + (clamped ? ' is-clamped' : ''));
    const e = document.createElementNS(NS, 'ellipse');
    e.setAttribute('class', 'km-staff__ghost-head');
    e.setAttribute('cx', String(cx));
    e.setAttribute('cy', y.toFixed(2));
    e.setAttribute('rx', (0.58 * GAP).toFixed(2));
    e.setAttribute('ry', (0.42 * GAP).toFixed(2));
    e.setAttribute('transform', `rotate(-20 ${cx} ${y.toFixed(2)})`);
    g.appendChild(e);
    svg.appendChild(g);

    const life = (Number.isFinite(ms) && ms > 0) ? ms : 900;
    setTimeout(() => { try { g.remove(); } catch (_) {} }, life);
  } catch (_) { /* feedback flourish, never required */ }
}
