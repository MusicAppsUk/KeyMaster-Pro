// staffViz.js — original KeyMaster PRO music-staff teaching diagrams.
// =============================================================================
// Built entirely from geometry here. No scraped images, no stock notation art,
// no method-book or competitor graphics. Original SVG: staff lines drawn from
// scratch; clef indicators use standard Unicode music symbols (notation, not
// art) with a plain-text label fallback so the lesson reads even if a font
// lacks the glyph.
//
// Renders, for teaching:
//   • a treble staff, a bass staff, or the grand staff (both joined)
//   • the five lines and four spaces (highlightable)
//   • note-heads at real pitch positions, with ledger lines when needed
//   • Middle C between the staves
//   • the convention KeyMaster uses elsewhere: treble ≈ right hand (≥ C4),
//     bass ≈ left hand (≤ B3)
// =============================================================================

const GAP = 16;            // vertical distance between adjacent staff lines
const HALF = GAP / 2;      // one diatonic step = half a line gap
const LEFT = 54;           // x where the five lines begin (after the clef)
const RIGHT = 340;         // x where the lines end
const W = 360;

// Diatonic "staff step" of a MIDI pitch: 7 per octave, C=0 … B=6. Sharps/flats
// share their natural letter's position (fine for white-key foundations).
const LETTER = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // C C# D D# E F F# G G# A A# B
function staffStep(midi) {
  const octave = Math.floor(midi / 12) - 1;   // MIDI 60 (C4) -> octave 4
  return 7 * octave + LETTER[midi % 12];
}

// Bottom line of each staff (reference): treble bottom = E4 (64), bass = G2 (43).
const REF = {
  treble: { midi: 64, step: staffStep(64) },
  bass:   { midi: 43, step: staffStep(43) },
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
    return `<text class="km-staff__clef" x="22" y="${topY + 3.4 * GAP}" text-anchor="middle">\uD834\uDD1E</text>`
      + `<text class="km-staff__cleflabel" x="22" y="${topY + 5 * GAP + 14}" text-anchor="middle">treble</text>`;
  }
  return `<text class="km-staff__clef km-staff__clef--bass" x="22" y="${topY + 1.7 * GAP}" text-anchor="middle">\uD834\uDD22</text>`
    + `<text class="km-staff__cleflabel" x="22" y="${topY + 5 * GAP + 14}" text-anchor="middle">bass</text>`;
}

// y for a pitch on a given staff block (topY = its top line's y).
function noteY(midi, clef, topY) {
  const bottomLineY = topY + 4 * GAP;
  const ref = REF[clef];
  return bottomLineY - (staffStep(midi) - ref.step) * HALF;
}

// Ledger lines for notes sitting outside a staff block.
function ledgersFor(midi, clef, topY, cx) {
  const ref = REF[clef];
  const step = staffStep(midi);
  const topLineStep = ref.step + 8;   // 5 lines span 8 diatonic steps
  let out = '';
  const half = 12;
  if (step < ref.step) {              // below the staff
    for (let s = ref.step - 2; s >= step; s -= 2) {
      const y = topY + 4 * GAP - (s - ref.step) * HALF;
      out += `<line class="km-staff__ledger" x1="${cx - half}" y1="${y}" x2="${cx + half}" y2="${y}"/>`;
    }
  } else if (step > topLineStep) {     // above the staff
    for (let s = topLineStep + 2; s <= step; s += 2) {
      const y = topY - (s - topLineStep) * HALF;
      out += `<line class="km-staff__ledger" x1="${cx - half}" y1="${y}" x2="${cx + half}" y2="${y}"/>`;
    }
  }
  return out;
}

function noteHead(midi, clef, topY, cx, on) {
  const y = noteY(midi, clef, topY);
  const cls = on ? 'km-staff__note is-on' : 'km-staff__note';
  return ledgersFor(midi, clef, topY, cx)
    + `<ellipse class="${cls}" cx="${cx}" cy="${y}" rx="8.5" ry="6.5" transform="rotate(-18 ${cx} ${y})"/>`;
}

/**
 * Build a staff diagram.
 * @param {object} opts
 *   clef       'treble' | 'bass' | 'grand'        (default 'treble')
 *   highlight  'lines' | 'spaces' | null          (default null)
 *   notes      number[]  MIDI pitches to draw as note-heads   (default [])
 *   middleC    boolean   mark Middle C on the grand staff      (default false)
 * @returns {HTMLDivElement} <div class="km-staff km-staff--{clef}">
 */
export function buildStaff(opts = {}) {
  const clef = (opts.clef === 'bass' || opts.clef === 'grand') ? opts.clef : 'treble';
  const highlight = (opts.highlight === 'lines' || opts.highlight === 'spaces') ? opts.highlight : null;
  const notes = Array.isArray(opts.notes) ? opts.notes : [];
  const middleC = !!opts.middleC;

  let body = '';
  let H;
  if (clef === 'grand') {
    const trebleTop = 24;
    const bassTop = trebleTop + 4 * GAP + 3 * GAP + 6;   // gap holds Middle C
    body += staffLines(trebleTop, highlight) + clefMark('treble', trebleTop);
    body += staffLines(bassTop, highlight) + clefMark('bass', bassTop);
    // brace + connecting barlines
    body += `<line class="km-staff__brace" x1="${LEFT}" y1="${trebleTop}" x2="${LEFT}" y2="${bassTop + 4 * GAP}"/>`;
    body += `<line class="km-staff__brace" x1="${RIGHT}" y1="${trebleTop}" x2="${RIGHT}" y2="${bassTop + 4 * GAP}"/>`;
    if (middleC) {
      const cx = (LEFT + RIGHT) / 2;
      body += noteHead(60, 'treble', trebleTop, cx, true);   // Middle C: ledger below treble
      body += `<text class="km-staff__mc" x="${cx + 18}" y="${noteY(60, 'treble', trebleTop) + 4}">Middle C</text>`;
    }
    notes.forEach((m, i) => {
      const cx = 120 + i * 46;
      const useClef = (m >= 60) ? 'treble' : 'bass';
      const top = (useClef === 'treble') ? trebleTop : bassTop;
      body += noteHead(m, useClef, top, cx, true);
    });
    H = bassTop + 4 * GAP + 30;
  } else {
    const topY = 26;
    body += staffLines(topY, highlight) + clefMark(clef, topY);
    notes.forEach((m, i) => { body += noteHead(m, clef, topY, 120 + i * 46, true); });
    H = topY + 4 * GAP + 34;
  }

  const aria = clef === 'grand' ? 'Grand staff' : (clef === 'bass' ? 'Bass staff' : 'Treble staff');
  const svg = `<svg class="km-staff__svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${body}</svg>`;
  const wrap = document.createElement('div');
  wrap.className = `km-staff km-staff--${clef}`;
  wrap.innerHTML = svg;
  return wrap;
}
