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
//
// LAYOUT ROBUSTNESS (rc2-86): two guarantees, enforced here for every Course
// staff view regardless of how many notes or how high/low they sit:
//   1. HORIZONTAL — notes always lay out inside the drawn staff lines. They use
//      a comfortable spacing when there is room and compress to fit when there
//      are many; they never run past the lines or off the canvas.
//   2. VERTICAL — the SVG viewBox auto-fits to contain every note-head and its
//      ledger lines (plus the clef and labels). A note can therefore never
//      "float" off the staff background: the canvas always grows to hold it.
// =============================================================================

const GAP = 16;            // vertical distance between adjacent staff lines
const HALF = GAP / 2;      // one diatonic step = half a line gap

// Wider staff (rc2-86): more presence, and room for a full octave of notes to
// breathe like real sheet music instead of crowding.
const W = 400;             // canvas width
const LEFT = 56;           // x where the five lines begin (after the clef)
const RIGHT = 384;         // x where the lines end

// Horizontal note layout. Notes must always sit WITHIN the drawn staff (never
// float past RIGHT or off-canvas), for any number of notes. We lay them out in
// the span [NOTE_L, NOTE_R] with a comfortable spacing when there is room, and
// compress to fit when there are many — always centred, always inside the lines.
// This is the single source of horizontal positioning for every staff view.
const NOTE_L = 112;             // first note sits clear of the clef
const NOTE_R = RIGHT - 18;      // last note stays inside the staff + ledger width
const NOTE_SPACING = 40;        // preferred gap between note centres
function noteXs(n) {
  if (n <= 0) return [];
  if (n === 1) return [Math.round((NOTE_L + NOTE_R) / 2)];
  const span = NOTE_R - NOTE_L;
  const spacing = Math.min(NOTE_SPACING, span / (n - 1)); // compress only if needed
  const groupW = spacing * (n - 1);
  const start = NOTE_L + (span - groupW) / 2;             // centre the group
  return Array.from({ length: n }, (_, i) => Math.round(start + i * spacing));
}

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
    return `<text class="km-staff__clef" x="24" y="${topY + 3.4 * GAP}" text-anchor="middle">\uD834\uDD1E</text>`
      + `<text class="km-staff__cleflabel" x="24" y="${topY + 5 * GAP + 14}" text-anchor="middle">treble</text>`;
  }
  return `<text class="km-staff__clef km-staff__clef--bass" x="24" y="${topY + 1.7 * GAP}" text-anchor="middle">\uD834\uDD22</text>`
    + `<text class="km-staff__cleflabel" x="24" y="${topY + 5 * GAP + 14}" text-anchor="middle">bass</text>`;
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

// state: 'on' (amber teaching target) | 'correct' (green) | 'wrong' (rose) | null.
// A truthy non-string is treated as 'on' for backward compatibility.
function stateClass(state) {
  const s = (state === true) ? 'on' : (typeof state === 'string' ? state : null);
  return s ? ` is-${s}` : '';
}
function noteHead(midi, clef, topY, cx, state, finger) {
  const y = noteY(midi, clef, topY);
  const cls = 'km-staff__note' + stateClass(state);
  let out = ledgersFor(midi, clef, topY, cx)
    + `<ellipse class="${cls}" cx="${cx}" cy="${y}" rx="9.5" ry="7.2" transform="rotate(-18 ${cx} ${y})"/>`;
  // Fingering number, sat clear above the note-head. Always drawn; the app's
  // existing fingering toggle (html[data-fingering="hidden"]) hides it in CSS,
  // so the staff respects the same preference as the hand and keyboard.
  if (Number.isFinite(finger)) {
    out += `<text class="km-staff__finger" x="${cx}" y="${y - 15}" text-anchor="middle">${finger}</text>`;
  }
  return out;
}

// Original rest glyphs (standard Unicode music symbols — notation, not art),
// centred on the middle line so rhythm lessons can show silence beside sound.
const REST_GLYPH = {
  whole: '\uD834\uDD3B', half: '\uD834\uDD3C', quarter: '\uD834\uDD3D', eighth: '\uD834\uDD3E',
};
function restGlyph(type, cx, topY) {
  const g = REST_GLYPH[type] || REST_GLYPH.quarter;
  const y = topY + 2 * GAP + 6;   // sit around the middle line
  return `<text class="km-staff__rest" x="${cx}" y="${y}" text-anchor="middle">${g}</text>`;
}

// Normalise a notes array: each entry may be a MIDI number, a { midi, state,
// finger } object, or a { rest: 'quarter'|... } object. Always returns objects.
function normaliseSeq(notes) {
  return notes.map((n) => {
    if (typeof n === 'number') return { midi: n, state: 'on' };
    if (n && typeof n === 'object') {
      if (n.rest) return { rest: String(n.rest) };
      return { midi: n.midi, state: (n.state === undefined ? 'on' : n.state), finger: n.finger };
    }
    return { midi: n, state: 'on' };
  });
}

// Half-height of a note-head's visual footprint (head + a little air), used for
// the vertical auto-fit so a note is never clipped at the canvas edge.
const NOTE_PAD = 11;

/**
 * Build a staff diagram.
 * @param {object} opts
 *   clef       'treble' | 'bass' | 'grand'        (default 'treble')
 *   highlight  'lines' | 'spaces' | null          (default null)
 *   notes      Array of MIDI numbers, or { midi, state, finger } objects, or
 *              { rest: 'quarter'|'half'|'whole'|'eighth' } entries. state is
 *              'on' (amber target) | 'correct' (green) | 'wrong' (rose).   (default [])
 *   middleC    boolean   mark Middle C on the grand staff      (default false)
 * @returns {HTMLDivElement} <div class="km-staff km-staff--{clef}">
 */
export function buildStaff(opts = {}) {
  const clef = (opts.clef === 'bass' || opts.clef === 'grand') ? opts.clef : 'treble';
  const highlight = (opts.highlight === 'lines' || opts.highlight === 'spaces') ? opts.highlight : null;
  const seq = normaliseSeq(Array.isArray(opts.notes) ? opts.notes : []);
  const middleC = !!opts.middleC;

  let body = '';
  // Track the vertical extent of everything drawn, so the viewBox can grow to
  // contain it. Seed with nothing; structural + note bounds are added below.
  const ys = [];
  const mark = (y) => { if (Number.isFinite(y)) ys.push(y); };

  if (clef === 'grand') {
    const trebleTop = 30;
    const bassTop = trebleTop + 4 * GAP + 3 * GAP + 6;   // gap holds Middle C
    body += staffLines(trebleTop, highlight) + clefMark('treble', trebleTop);
    body += staffLines(bassTop, highlight) + clefMark('bass', bassTop);
    // brace + connecting barlines
    body += `<line class="km-staff__brace" x1="${LEFT}" y1="${trebleTop}" x2="${LEFT}" y2="${bassTop + 4 * GAP}"/>`;
    body += `<line class="km-staff__brace" x1="${RIGHT}" y1="${trebleTop}" x2="${RIGHT}" y2="${bassTop + 4 * GAP}"/>`;
    mark(trebleTop - 12);                  // clef curl above the treble staff
    mark(bassTop + 5 * GAP + 16);          // bass clef label below
    if (middleC) {
      const cx = (LEFT + RIGHT) / 2;
      body += noteHead(60, 'treble', trebleTop, cx, 'on');   // Middle C: ledger below treble
      body += `<text class="km-staff__mc" x="${cx + 18}" y="${noteY(60, 'treble', trebleTop) + 4}">Middle C</text>`;
      mark(noteY(60, 'treble', trebleTop) + NOTE_PAD);
    }
    const gxs = noteXs(seq.length);
    seq.forEach((it, i) => {
      const cx = gxs[i];
      if (it.rest) { body += restGlyph(it.rest, cx, trebleTop); mark(trebleTop + 2 * GAP + 10); return; }
      const useClef = (it.midi >= 60) ? 'treble' : 'bass';
      const top = (useClef === 'treble') ? trebleTop : bassTop;
      body += noteHead(it.midi, useClef, top, cx, it.state, it.finger);
      const ny = noteY(it.midi, useClef, top);
      mark(ny - NOTE_PAD - (Number.isFinite(it.finger) ? 14 : 0)); mark(ny + NOTE_PAD);
    });
  } else {
    const topY = 30;
    body += staffLines(topY, highlight) + clefMark(clef, topY);
    mark(topY - 12);                       // clef curl / top air
    mark(topY + 5 * GAP + 16);             // clef label below the staff
    const xs = noteXs(seq.length);
    seq.forEach((it, i) => {
      if (it.rest) { body += restGlyph(it.rest, xs[i], topY); mark(topY + 2 * GAP + 10); return; }
      body += noteHead(it.midi, clef, topY, xs[i], it.state, it.finger);
      const ny = noteY(it.midi, clef, topY);
      mark(ny - NOTE_PAD - (Number.isFinite(it.finger) ? 14 : 0)); mark(ny + NOTE_PAD);
    });
  }

  // Vertical auto-fit: the viewBox spans from the highest to the lowest thing
  // drawn, with a little padding. A note (however high or low) is therefore
  // always inside the canvas, sitting on its line/space/ledger — never floating.
  const PAD = 6;
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
