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

// =============================================================================
// rc2-231 — THE ENGRAVER'S PASS.
// The notation was correct but did not LOOK like printed music: the clef hung
// in the margin off the end of the staff, key signatures crowded the clef,
// every note got the same width whatever its length, beams were all flat with
// stems stretched to meet them, a 30-bar Minuet had no barlines, accidentals
// were small font glyphs, and fingering sat inside beams. A pianist reads
// shape before symbol, so badly-set music is harder to READ, not just plainer.
// This pass re-sets the page to the conventions of a good printed edition:
//   1. STAFF FRAME. Every staff starts at the system's left edge; the clef,
//      key signature and time signature sit ON the staff, in that order, with
//      real engraving gaps. Grand staves get a curly brace and a system line.
//   2. SPACING. In music (anything with a metre, bars or beams) the space after
//      a note grows with its length — non-linearly, as in print (a minim gets
//      about 1.4× a crotchet, not 2×) — and each line is justified. Diagram
//      cards (single notes, the lines-and-spaces lessons) keep calm, even,
//      centred spacing.
//   3. BARLINES. Derived from the time signature when a card does not list
//      them, so every bar of a piece is marked; a system always closes with a
//      barline; the barline gets proper space either side.
//   4. STEMS + BEAMS. Stems are 3½ spaces and always reach the middle line.
//      The middle-line note stems down. Beams slope with the melody (never more
//      than a space), go flat for concave shapes, are half a space thick, and
//      their direction follows the note furthest from the middle line.
//   5. GLYPHS. Accidentals are drawn as full-size original SVG shapes (a sharp
//      spans nearly three spaces, as printed); hollow heads are real minim and
//      semibreve shapes with a slanted hole; a fuller quaver flag.
//   6. COLLISIONS. Fingering clears beams and stems; dynamics drop below the
//      lowest note of the line; grand-staff dynamics sit between the staves.
// Pitch, spelling, data, playback and every card's content are untouched —
// this is a drawing change only. Element class names are kept so the Course's
// feedback colouring (flashStaff) and the fingering toggle work unchanged.
// Rollback: tools/rollback/staffViz.rc2-230.rollback.js.
// =============================================================================

const GAP = 20;            // vertical distance between adjacent staff lines
const HALF = GAP / 2;      // one diatonic step = half a line gap
const STEM = Math.round(3.5 * GAP);   // standard stem: three and a half spaces

const W = 720;             // viewBox width
const SYS_L = 22;          // x where every staff begins (room for a brace to its left)
const RIGHT = 704;         // furthest x a staff may reach
const CLEF_X = SYS_L + 33; // clef glyph centre, ON the staff
const CLEF_R = CLEF_X + 28;// right edge of the widest clef (bass clef with its dots)

// Legacy reference points, kept for flashPlayed's transient ghost note.
const NOTE_L = 138;
const NOTE_R = 674;
const NOTE_SPACING = 58;   // diagram cards: even spacing, at most this far apart

// Note-head proportions (a printed black head is ~1.18 spaces wide, ~0.96 tall).
const HEAD_RX = 0.6 * GAP;
const HEAD_RY = 0.46 * GAP;
const HEAD_ROT = -20;
const BEAM_T = 0.5 * GAP;  // beam thickness: half a space

const LETTER = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // C C# D D# E F F# G G# A A# B
function staffStep(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return 7 * octave + LETTER[midi % 12];
}
const REF = {
  treble: { midi: 64, step: staffStep(64) },   // bottom line E4
  bass:   { midi: 43, step: staffStep(43) },   // bottom line G2
};

const f1 = (n) => n.toFixed(1);

function staffLines(topY, highlight, x1, x2) {
  const a = Number.isFinite(x1) ? x1 : SYS_L;
  const b = Number.isFinite(x2) ? x2 : RIGHT;
  let out = '';
  for (let i = 0; i < 5; i += 1) {
    const y = topY + i * GAP;
    const hl = (highlight === 'lines') ? ' is-hl' : '';
    out += `<line class="km-staff__line${hl}" x1="${f1(a)}" y1="${y}" x2="${f1(b)}" y2="${y}"/>`;
  }
  if (highlight === 'spaces') {
    for (let i = 0; i < 4; i += 1) {
      const y = topY + i * GAP + HALF;
      out += `<rect class="km-staff__space is-hl" x="${f1(a + 2)}" y="${y - HALF + 1}" width="${f1(b - a - 4)}" height="${GAP - 2}" rx="3"/>`;
    }
  }
  return out;
}

// The clef sits ON the staff, at its start. Baseline and size are unchanged
// from rc2-135 (device-confirmed: the F-clef dots straddle the F line). The
// small "treble"/"bass" label is a teaching aid for diagram cards only — real
// music never labels its clefs, and on a score it collided with the next line.
function clefMark(clef, topY, withLabel, dx) {
  const x = CLEF_X + (dx || 0);
  const glyph = (clef === 'treble') ? '𝄞' : '𝄢';
  const cls = (clef === 'treble') ? 'km-staff__clef' : 'km-staff__clef km-staff__clef--bass';
  let out = `<text class="${cls}" x="${f1(x)}" y="${topY + 3.35 * GAP}" text-anchor="middle">${glyph}</text>`;
  if (withLabel) out += `<text class="km-staff__cleflabel" x="${f1(x)}" y="${topY + 5 * GAP + 16}" text-anchor="middle">${clef}</text>`;
  return out;
}

// Stacked time-signature digits; numerator in the upper half of the staff.
function timeSigMark(num, den, topY, x) {
  const ny = topY + Math.round(1.55 * GAP);
  const dy = topY + Math.round(3.62 * GAP);
  return `<text class="km-staff__timesig" x="${f1(x)}" y="${ny}" text-anchor="middle">${num}</text>`
    + `<text class="km-staff__timesig" x="${f1(x)}" y="${dy}" text-anchor="middle">${den}</text>`;
}

// ---------------------------------------------------------------------------
// ACCIDENTALS — original SVG shapes in staff-space units, origin at the glyph's
// LEFT edge and the note's vertical centre. Drawn rather than typeset so that
// they are full printed size on every device and never fall back to a
// missing-glyph box.
const ACCIDENTAL_GLYPH = {   // kept: the set of valid accidental names
  sharp: '♯', flat: '♭', natural: '♮',
};
const ACC_SHAPE = {
  sharp: {
    w: 1.0,
    polys: [
      [[0.2, -1.05], [0.32, -1.05], [0.32, 1.38], [0.2, 1.38]],
      [[0.68, -1.38], [0.8, -1.38], [0.8, 1.05], [0.68, 1.05]],
      [[0, -0.17], [1, -0.47], [1, -0.83], [0, -0.53]],
      [[0, 0.83], [1, 0.53], [1, 0.17], [0, 0.47]],
    ],
  },
  natural: {
    w: 0.72,
    polys: [
      [[0, -1.38], [0.12, -1.38], [0.12, 0.62], [0, 0.62]],
      [[0.6, -0.62], [0.72, -0.62], [0.72, 1.38], [0.6, 1.38]],
      [[0, -0.16], [0.72, -0.36], [0.72, -0.72], [0, -0.52]],
      [[0, 0.72], [0.72, 0.52], [0.72, 0.16], [0, 0.36]],
    ],
  },
  flat: {
    w: 0.86,
    // Outer outline then the bowl's hole (even-odd fill).
    path: [
      ['M', 0, -1.75], ['L', 0.13, -1.75], ['L', 0.13, -0.18],
      ['C', 0.34, -0.46, 0.9, -0.52, 0.86, -0.04], ['C', 0.83, 0.28, 0.42, 0.42, 0, 0.62], ['Z'],
      ['M', 0.13, 0.0], ['L', 0.13, 0.4], ['C', 0.46, 0.24, 0.66, 0.06, 0.64, -0.1],
      ['C', 0.62, -0.31, 0.34, -0.27, 0.13, 0.0], ['Z'],
    ],
  },
};
const accWidth = (kind) => (ACC_SHAPE[kind] ? ACC_SHAPE[kind].w * GAP : 0);
function accidentalPath(kind, xRight, y, extraClass) {
  const sh = ACC_SHAPE[kind];
  if (!sh) return '';
  const x0 = xRight - sh.w * GAP;
  const X = (u) => f1(x0 + u * GAP);
  const Y = (v) => f1(y + v * GAP);
  let d = '';
  if (sh.polys) {
    // Every sub-shape is wound the same way, so where a bar crosses a stem
    // the ink stays solid (opposite windings would cancel into a hole).
    sh.polys.forEach((p0) => {
      let area = 0;
      p0.forEach((q, i) => { const r = p0[(i + 1) % p0.length]; area += q[0] * r[1] - r[0] * q[1]; });
      const p = area < 0 ? p0.slice().reverse() : p0;
      d += `M${X(p[0][0])} ${Y(p[0][1])}` + p.slice(1).map((q) => `L${X(q[0])} ${Y(q[1])}`).join('') + 'Z';
    });
  } else {
    sh.path.forEach((c) => {
      if (c[0] === 'Z') d += 'Z';
      else if (c[0] === 'C') d += `C${X(c[1])} ${Y(c[2])} ${X(c[3])} ${Y(c[4])} ${X(c[5])} ${Y(c[6])}`;
      else d += `${c[0]}${X(c[1])} ${Y(c[2])}`;
    });
  }
  const rule = sh.polys ? '' : ' fill-rule="evenodd"';
  return `<path class="km-staff__acc${extraClass ? ' ' + extraClass : ''}" data-acc="${kind}" data-x="${f1(x0)}"${rule} d="${d}"/>`;
}

// ENHARMONIC SPELLING. A flattened note is the letter ABOVE, lowered, so for
// placement (and placement only) it is read one semitone higher.
function spellingMidi(midi, accidental) {
  return (accidental === 'flat') ? (midi + 1) : midi;
}

// Key signatures: order of sharps (F C G D A E B) and flats (B E A D G C F) at
// the standard engraving octave for each clef. Placement-only pitches.
const KEYSIG_SHARP_PITCHES = { treble: [77, 72, 79, 74, 69, 76, 71], bass: [56, 51, 58, 53, 48, 55, 50] };
const KEYSIG_FLAT_PITCHES  = { treble: [71, 76, 69, 74, 67, 72, 65], bass: [50, 55, 48, 53, 46, 51, 44] };
const KEY_NAME_TO_SIG = {
  'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5,
  'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5,
  'Am': 0, 'Em': 1, 'Bm': 2, 'Dm': -1, 'Gm': -2, 'Cm': -3,
};
function resolveKeySig(opt) {
  if (typeof opt === 'number' && Number.isInteger(opt)) return Math.max(-7, Math.min(7, opt));
  if (typeof opt === 'string' && Object.prototype.hasOwnProperty.call(KEY_NAME_TO_SIG, opt)) return KEY_NAME_TO_SIG[opt];
  return 0;
}

// The opening of a system: clef, key signature, (time signature). Returns the
// x positions so every staff of a system lines up exactly.
function headerGeom(ksig, withTime, dx) {
  const o = dx || 0;
  const n = Math.min(Math.abs(ksig), 7);
  const kind = ksig > 0 ? 'sharp' : 'flat';
  const step = (ksig > 0 ? 1.12 : 0.98) * GAP;
  const ksX0 = CLEF_R + 0.6 * GAP + o;                // left edge of the first accidental
  const ksEnd = n ? (ksX0 + (n - 1) * step + accWidth(kind)) : (CLEF_R + o);
  const tsX = ksEnd + (n ? 0.9 : 0.75) * GAP + 13;    // centre of the digits
  const end = withTime ? (tsX + 13) : ksEnd;
  return { n, kind, step, ksX0, tsX, end };
}
function keySigMark(sig, clef, topY, hg) {
  if (!sig) return '';
  const pitches = (sig > 0 ? KEYSIG_SHARP_PITCHES : KEYSIG_FLAT_PITCHES)[clef] || [];
  let out = '';
  for (let i = 0; i < hg.n; i += 1) {
    const p = pitches[i];
    if (!Number.isFinite(p)) continue;
    const xr = hg.ksX0 + i * hg.step + accWidth(hg.kind);
    out += accidentalPath(hg.kind, xr, noteY(p, clef, topY), 'km-staff__acc--ks');
  }
  return out;
}

function noteY(midi, clef, topY) {
  const bottomLineY = topY + 4 * GAP;
  const ref = REF[clef];
  return bottomLineY - (staffStep(midi) - ref.step) * HALF;
}

function ledgersFor(midi, clef, topY, cx, halfW) {
  const ref = REF[clef];
  const step = staffStep(midi);
  const topLineStep = ref.step + 8;
  const hw = Number.isFinite(halfW) ? halfW : (HEAD_RX + 0.4 * GAP);
  let out = '';
  if (step < ref.step) {
    for (let s = ref.step - 2; s >= step; s -= 2) {
      const y = topY + 4 * GAP - (s - ref.step) * HALF;
      out += `<line class="km-staff__ledger" x1="${f1(cx - hw)}" y1="${y}" x2="${f1(cx + hw)}" y2="${y}"/>`;
    }
  } else if (step > topLineStep) {
    for (let s = topLineStep + 2; s <= step; s += 2) {
      const y = topY - (s - topLineStep) * HALF;
      out += `<line class="km-staff__ledger" x1="${f1(cx - hw)}" y1="${y}" x2="${f1(cx + hw)}" y2="${y}"/>`;
    }
  }
  return out;
}

// state: 'on' (target) | 'correct' | 'wrong' | null. 'on' renders as black ink.
function stateClass(state) {
  const s = (state === true) ? 'on' : (typeof state === 'string' ? state : null);
  return s ? ` is-${s}` : '';
}

// Head shapes. `ex`/`ey` are the visual half-extents of the (rotated) head.
function headGeom(value) {
  let g;
  if (value === 'whole') g = { rx: 0.8 * GAP, ry: 0.5 * GAP, rot: 0, hollow: true, stem: false, hole: { rx: 0.34 * GAP, ry: 0.41 * GAP, rot: 25 } };
  else if (value === 'half' || value === 'dotted-half') g = { rx: HEAD_RX, ry: HEAD_RY, rot: HEAD_ROT, hollow: true, stem: true, hole: { rx: 0.5 * GAP, ry: 0.25 * GAP, rot: -36 } };
  else g = { rx: HEAD_RX, ry: HEAD_RY, rot: HEAD_ROT, hollow: false, stem: true };
  const t = (g.rot * Math.PI) / 180;
  g.ex = Math.sqrt((g.rx * Math.cos(t)) ** 2 + (g.ry * Math.sin(t)) ** 2);
  g.ey = Math.sqrt((g.rx * Math.sin(t)) ** 2 + (g.ry * Math.cos(t)) ** 2);
  return g;
}
const BLACK_EX = headGeom('quarter').ex;

function ellipseSub(cx, cy, rx, ry, rotDeg) {
  const t = (rotDeg * Math.PI) / 180;
  const ax = rx * Math.cos(t), ay = rx * Math.sin(t);
  return `M${f1(cx + ax)} ${f1(cy + ay)}A${f1(rx)} ${f1(ry)} ${rotDeg} 1 0 ${f1(cx - ax)} ${f1(cy - ay)}`
    + `A${f1(rx)} ${f1(ry)} ${rotDeg} 1 0 ${f1(cx + ax)} ${f1(cy + ay)}Z`;
}
// One note-head. Black heads stay <ellipse> (as before); hollow heads are a
// single even-odd path — the outer head with its slanted hole — so the staff
// line shows through the hole exactly as in print.
function headSvg(g, cx, y, cls) {
  if (!g.hollow) {
    return `<ellipse class="${cls}" cx="${f1(cx)}" cy="${f1(y)}" rx="${g.rx.toFixed(2)}" ry="${g.ry.toFixed(2)}" transform="rotate(${g.rot} ${f1(cx)} ${f1(y)})"/>`;
  }
  const d = ellipseSub(cx, y, g.rx, g.ry, g.rot) + ellipseSub(cx, y, g.hole.rx, g.hole.ry, g.hole.rot);
  return `<path class="${cls} km-staff__note--hollow" data-cx="${f1(cx)}" data-cy="${f1(y)}" fill-rule="evenodd" d="${d}"/>`;
}

// rc2-213: which values carry an augmentation dot, and which carry a flag.
const DOTTED_VALUES = new Set(['dotted-half', 'dotted-quarter', 'dotted-eighth']);
const FLAGGED_VALUES = new Set(['eighth', 'dotted-eighth']);

// A fuller quaver flag (original path, in staff spaces from the stem end).
function quaverFlag(sx, yEnd, stemUp) {
  const s = stemUp ? 1 : -1;
  const P = (u, v) => `${f1(sx + u * GAP)} ${f1(yEnd + s * v * GAP)}`;
  const d = `M${P(0, 0)}C${P(0.12, 0.6)} ${P(1.42, 1.0)} ${P(1.02, 2.72)}`
    + `C${P(0.99, 2.82)} ${P(0.9, 2.8)} ${P(0.92, 2.68)}`
    + `C${P(1.12, 1.75)} ${P(0.42, 1.3)} ${P(0, 1.2)}Z`;
  return `<path class="km-staff__flag" d="${d}"/>`;
}
const FLAG_W = 1.25 * GAP;

// Stem direction for a lone note: below the middle line stems up; on or
// above it stems down (the printed convention for the middle line).
function lonelyStemUp(y, topY) { return y > topY + 2 * GAP + 0.01; }

// Geometry of one note: head position, stem side and stem end. `beam` (from
// beamGeometry) overrides direction and stem end for a beamed note.
function noteGeo(midi, accidental, value, clef, topY, cx, beam) {
  const y = noteY(spellingMidi(midi, accidental), clef, topY);
  const g = headGeom(value);
  const mid = topY + 2 * GAP;
  let stemUp = true, stemX = null, stemEnd = null;
  if (g.stem) {
    stemUp = beam ? beam.dir === 'up' : lonelyStemUp(y, topY);
    stemX = stemUp ? (cx + g.ex - 1.1) : (cx - g.ex + 1.1);
    if (beam) stemEnd = beam.endAt(stemX);
    else {
      stemEnd = stemUp ? (y - STEM) : (y + STEM);
      if (stemUp && stemEnd > mid) stemEnd = mid;       // stems always reach the middle line
      if (!stemUp && stemEnd < mid) stemEnd = mid;
    }
  }
  return { y, g, stemUp, stemX, stemEnd };
}

// Space a note needs to the RIGHT of its centre (head, dot, unbeamed flag).
function rightExtent(it) {
  if (!it || it.blank) return BLACK_EX;
  if (it.rest) return 0.7 * GAP;
  const g = headGeom(it.value);
  let r = g.ex;
  if (DOTTED_VALUES.has(it.value)) r += 0.75 * GAP;
  if (!it.chord && FLAGGED_VALUES.has(it.value) && !it.inBeam) r = Math.max(r, g.ex + FLAG_W);
  return r;
}
// Space a note needs to the LEFT of its head for accidentals.
function accExtent(it) {
  if (!it || it.rest || it.blank) return 0;
  if (it.chord) {
    const cols = chordLayout(it.chord, 'treble', 0, it.value).accCols;
    return cols ? (cols * 1.15 * GAP + 0.25 * GAP) : 0;
  }
  return (it.accidental && !it.hideAcc) ? (accWidth(it.accidental) + 0.3 * GAP) : 0;
}

// Draw one note. Returns { svg, top, bot } (bounds for the auto-fit viewBox
// and the annotation rows).
function drawNote(it, clef, topY, cx, beam) {
  const G = noteGeo(it.midi, it.accidental, it.value, clef, topY, cx, beam);
  const { y, g, stemUp, stemX, stemEnd } = G;
  const sm = spellingMidi(it.midi, it.accidental);
  const cls = 'km-staff__note' + stateClass(it.state);
  let out = ledgersFor(sm, clef, topY, cx, g.ex + 0.4 * GAP);
  if (it.accidental && !it.hideAcc) out += accidentalPath(it.accidental, cx - g.ex - 0.25 * GAP, y);
  out += headSvg(g, cx, y, cls);
  let top = y - g.ey - 2, bot = y + g.ey + 2;
  if (DOTTED_VALUES.has(it.value)) {
    const k = Math.round((topY + 4 * GAP - y) / HALF);
    const dotY = (k % 2 === 0) ? (y - HALF) : y;
    const flagged = FLAGGED_VALUES.has(it.value) && !beam && stemUp;
    out += `<circle class="km-staff__dot" cx="${f1(cx + g.ex + 0.45 * GAP + (flagged ? FLAG_W : 0))}" cy="${f1(dotY)}" r="3.2"/>`;
  }
  if (g.stem) {
    // A beamed note's stem is drawn with its beam.
    if (!beam) out += `<line class="km-staff__stem" x1="${f1(stemX)}" y1="${f1(y)}" x2="${f1(stemX)}" y2="${f1(stemEnd)}"/>`;
    if (FLAGGED_VALUES.has(it.value) && !beam) out += quaverFlag(stemX, stemEnd, stemUp);
    if (stemUp) top = Math.min(top, stemEnd - (beam ? 2 : 4)); else bot = Math.max(bot, stemEnd + (beam ? 2 : 4));
    if (FLAGGED_VALUES.has(it.value) && !beam && !stemUp) bot = Math.max(bot, stemEnd + 6);
  }
  if (it.artic) {
    const r = articulationMark(it.artic, cx, y, g, g.stem ? stemUp : true);
    out += r.svg; top = Math.min(top, r.top); bot = Math.max(bot, r.bot);
  }
  if (it.orn) { out += ornamentMark(it.orn, cx, topY); top = Math.min(top, topY - 26); }
  // Fingering: above the note, clear of the stem end (and so of any beam) and
  // of the head. Read with the note, never on top of it.
  let letterFloor = -Infinity;
  if (Number.isFinite(it.finger) && clef === 'bass') {
    // Left-hand (bass-staff) fingering goes BELOW the note, as in printed
    // piano music, so it never climbs into the right hand's space.
    let inkBot = y + g.ey;
    if (g.stem && !stemUp) inkBot = Math.max(inkBot, stemEnd + (beam ? 1 : 0));
    if (beam && !stemUp) inkBot = Math.max(inkBot, beam.endAt(cx - 9), beam.endAt(cx + 9));
    if (it.artic && (g.stem ? stemUp : true)) inkBot = Math.max(inkBot, y + g.ey + 16);
    const fy = Math.max(inkBot + 15, Number.isFinite(it.fingerRow) ? it.fingerRow : -Infinity);
    out += `<text class="km-staff__finger" x="${f1(cx)}" y="${f1(fy)}" text-anchor="middle">${it.finger}</text>`;
    bot = Math.max(bot, fy + 4);
    letterFloor = fy + 17;
  } else if (Number.isFinite(it.finger)) {
    let inkTop = y - g.ey;
    if (g.stem && stemUp) inkTop = Math.min(inkTop, stemEnd - (beam ? 1 : 0));
    // A sloping beam is higher on one side of the stem than the other.
    if (beam && stemUp) inkTop = Math.min(inkTop, beam.endAt(cx - 9), beam.endAt(cx + 9));
    if (it.artic && !(g.stem ? stemUp : true)) inkTop = Math.min(inkTop, y - g.ey - 16);
    const fy = inkTop - 5;
    out += `<text class="km-staff__finger" x="${f1(cx)}" y="${f1(fy)}" text-anchor="middle">${it.finger}</text>`;
    top = Math.min(top, fy - 14);
  }
  if (typeof it.letter === 'string' && it.letter) {
    const ly = Math.max(y + g.ey + 15, (g.stem && !stemUp) ? stemEnd + 15 : -Infinity, letterFloor);
    out += `<text class="km-staff__letter" x="${f1(cx)}" y="${f1(ly)}" text-anchor="middle">${it.letter}</text>`;
    bot = Math.max(bot, ly + 4);
  }
  return { svg: out, top, bot };
}

// ---------------------------------------------------------------------------
// rc2-216: CHORDS — shared stem (direction from the note furthest from the
// middle line), seconds displaced to the far side of the stem, accidentals
// stacked into columns, ledgers per member.
const CHORD_ACC_CLEAR = 1.6 * GAP;   // vertical clearance two accidentals need

function chordLayout(members, clef, topY, value) {
  const g = headGeom(value);
  const rows = members
    .map((m) => ({ m, y: noteY(spellingMidi(m.midi, m.accidental), clef, topY) }))
    .sort((a, b) => b.y - a.y);    // LOW pitch first
  const midLineY = topY + 2 * GAP;
  const lowestY = rows[0].y;
  const highestY = rows[rows.length - 1].y;
  const stemUp = Math.abs(lowestY - midLineY) > Math.abs(highestY - midLineY);
  const order = stemUp ? rows : rows.slice().reverse();
  let prevDisplaced = false;
  let prevY = null;
  order.forEach((r) => {
    const isSecond = prevY !== null && Math.abs(r.y - prevY) <= HALF + 0.01;
    if (isSecond && !prevDisplaced) {
      r.dx = stemUp ? (2 * g.ex - 2.2) : (-2 * g.ex + 2.2);
      prevDisplaced = true;
    } else {
      r.dx = 0;
      prevDisplaced = false;
    }
    prevY = r.y;
  });
  const accRows = rows.filter((r) => r.m.accidental && !r.m.hideAcc).sort((a, b) => a.y - b.y);
  const columns = [];
  accRows.forEach((r) => {
    let col = 0;
    while (columns[col] && columns[col].some((y) => Math.abs(y - r.y) < CHORD_ACC_CLEAR)) col += 1;
    if (!columns[col]) columns[col] = [];
    columns[col].push(r.y);
    r.accCol = col;
  });
  const leftDisp = rows.some((r) => r.dx < 0);
  return { rows, stemUp, geom: g, lowestY, highestY, accCols: columns.length, leftDisp };
}

function drawChord(it, clef, topY, cx) {
  const members = it.chord;
  const { rows, stemUp, geom, leftDisp } = chordLayout(members, clef, topY, it.value);
  const mid = topY + 2 * GAP;
  let out = '';
  const accRight = cx - geom.ex - 0.25 * GAP - (leftDisp ? (2 * geom.ex - 2.2) : 0);
  let top = Infinity, bot = -Infinity;
  rows.forEach((r) => {
    const x = cx + r.dx;
    const y = r.y;
    const sm = spellingMidi(r.m.midi, r.m.accidental);
    out += ledgersFor(sm, clef, topY, x, geom.ex + 0.4 * GAP);
    if (r.m.accidental && !r.m.hideAcc) {
      out += accidentalPath(r.m.accidental, accRight - (r.accCol || 0) * 1.15 * GAP, y);
    }
    const cls = 'km-staff__note' + stateClass(r.m.state === undefined ? it.state : r.m.state);
    out += headSvg(geom, x, y, cls);
    if (DOTTED_VALUES.has(it.value)) {
      const k = Math.round((topY + 4 * GAP - y) / HALF);
      const dotY = (k % 2 === 0) ? (y - HALF) : y;
      out += `<circle class="km-staff__dot" cx="${f1(cx + geom.ex + 0.45 * GAP + (rows.some((q) => q.dx > 0) ? 2 * geom.ex : 0))}" cy="${f1(dotY)}" r="3.2"/>`;
    }
    top = Math.min(top, y - geom.ey - 2);
    bot = Math.max(bot, y + geom.ey + 2);
  });
  let stemEnd = null;
  if (geom.stem) {
    const sx = stemUp ? (cx + geom.ex - 1.1) : (cx - geom.ex + 1.1);
    const from = stemUp ? rows[0].y : rows[rows.length - 1].y;
    stemEnd = stemUp ? (rows[rows.length - 1].y - STEM) : (rows[0].y + STEM);
    if (stemUp && stemEnd > mid) stemEnd = mid;
    if (!stemUp && stemEnd < mid) stemEnd = mid;
    out += `<line class="km-staff__stem" x1="${f1(sx)}" y1="${f1(from)}" x2="${f1(sx)}" y2="${f1(stemEnd)}"/>`;
    if (FLAGGED_VALUES.has(it.value)) out += quaverFlag(sx, stemEnd, stemUp);
    if (stemUp) top = Math.min(top, stemEnd - 4); else bot = Math.max(bot, stemEnd + 4);
  }
  // Chord fingering: one column, highest note's finger on top, set on the
  // side of the chord away from the stem (above a stem-down chord, below a
  // stem-up one) — the printed convention, and clear of ledgers and stem.
  const fingered = rows.filter((r) => Number.isFinite(r.m.finger)).sort((a, b) => a.y - b.y);
  if (fingered.length) {
    const lh = 15;
    const placeAbove = (clef === 'bass') ? false : !(geom.stem && stemUp);
    if (placeAbove) {
      const base = Math.min(top, ...rows.map((r) => r.y - geom.ey)) - 5;
      fingered.slice().reverse().forEach((r, i) => {
        const fy = base - i * lh;
        out += `<text class="km-staff__finger" x="${f1(cx)}" y="${f1(fy)}" text-anchor="middle">${r.m.finger}</text>`;
        top = Math.min(top, fy - 14);
      });
    } else {
      const base = Math.max(Math.max(bot, ...rows.map((r) => r.y + geom.ey)) + 15, Number.isFinite(it.fingerRow) ? it.fingerRow : -Infinity);
      fingered.forEach((r, i) => {
        const fy = base + i * lh;
        out += `<text class="km-staff__finger" x="${f1(cx)}" y="${f1(fy)}" text-anchor="middle">${r.m.finger}</text>`;
        bot = Math.max(bot, fy + 4);
      });
    }
  }
  return { svg: out, top, bot };
}

// ---------------------------------------------------------------------------
// rc2-217: ARTICULATION, placed on the side of the head away from the stem.
function articulationMark(kind, cx, y, geom, stemUp) {
  const away = stemUp ? 1 : -1;                 // +1 = below the head
  const ay = y + away * (geom.ey + 11);
  const box = { top: ay - 7, bot: ay + 7 };
  if (kind === 'staccato') {
    return { svg: `<circle class="km-staff__artic" cx="${f1(cx)}" cy="${f1(ay)}" r="2.9"/>`, ...box };
  }
  if (kind === 'tenuto') {
    return { svg: `<line class="km-staff__artic-line" x1="${f1(cx - 7)}" y1="${f1(ay)}" x2="${f1(cx + 7)}" y2="${f1(ay)}"/>`, ...box };
  }
  if (kind === 'accent') {
    const t = ay - 5, b = ay + 5;
    return { svg: `<path class="km-staff__artic-line" fill="none" d="M ${f1(cx - 8)} ${f1(t)} L ${f1(cx + 8)} ${f1(ay)} L ${f1(cx - 8)} ${f1(b)}"/>`, ...box };
  }
  return { svg: '', top: Infinity, bot: -Infinity };
}

// ---------------------------------------------------------------------------
// rc2-218: ORNAMENTS — trill, mordent and turn.
// Drawn as original SVG rather than font glyphs on purpose: the Unicode music
// block's ornament characters have patchy coverage on Android, and an ornament
// that renders as a missing-glyph box teaches nothing. Only "tr" uses text,
// because those two letters exist in every font.
// An ornament always sits ABOVE the staff, clear of the notes, which is where
// engraving puts it regardless of stem direction.
function ornamentMark(kind, cx, topY) {
  const y = topY - 12;
  if (kind === 'trill') {
    return `<text class="km-staff__orn-text" x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">tr</text>`;
  }
  if (kind === 'mordent' || kind === 'mordent-lower') {
    // A short zigzag; the lower mordent adds the vertical stroke through it.
    const w = 7, h = 4;
    let d = `M ${(cx - 2 * w).toFixed(1)} ${y.toFixed(1)}`;
    for (let i = 0; i < 2; i += 1) {
      const x0 = cx - 2 * w + i * 2 * w;
      d += ` L ${(x0 + w / 2).toFixed(1)} ${(y - h).toFixed(1)} L ${(x0 + w).toFixed(1)} ${y.toFixed(1)}`
        + ` L ${(x0 + 1.5 * w).toFixed(1)} ${(y - h).toFixed(1)} L ${(x0 + 2 * w).toFixed(1)} ${y.toFixed(1)}`;
    }
    let out = `<path class="km-staff__orn" fill="none" d="${d}"/>`;
    if (kind === 'mordent-lower') {
      out += `<line class="km-staff__orn" x1="${cx.toFixed(1)}" y1="${(y - h - 3).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(y + 4).toFixed(1)}"/>`;
    }
    return out;
  }
  if (kind === 'turn') {
    // A sideways S: up over the first note, down under the second.
    return `<path class="km-staff__orn" fill="none" d="M ${(cx - 9).toFixed(1)} ${y.toFixed(1)} `
      + `c 0 -6 8 -6 9 -1 c 1 5 8 5 9 -1"/>`;
  }
  return '';
}

// A slur or phrase mark: one arc spanning a group of notes, drawn on the side
// away from the stems so it never collides with them.
function slurPath(x1, y1, x2, y2, above) {
  const mx = (x1 + x2) / 2;
  const span = Math.abs(x2 - x1);
  const lift = Math.min(26, 8 + span * 0.14);
  const my = (above ? Math.min(y1, y2) - lift : Math.max(y1, y2) + lift);
  return `<path class="km-staff__slur" fill="none" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`;
}

// A crescendo or diminuendo hairpin, drawn below the staff.
function hairpinPath(x1, x2, y, growing) {
  const open = 5.5;
  return growing
    ? `<path class="km-staff__hairpin" fill="none" d="M ${x1.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${(y - open).toFixed(1)} M ${x1.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${(y + open).toFixed(1)}"/>`
    : `<path class="km-staff__hairpin" fill="none" d="M ${x1.toFixed(1)} ${(y - open).toFixed(1)} L ${x2.toFixed(1)} ${y.toFixed(1)} M ${x1.toFixed(1)} ${(y + open).toFixed(1)} L ${x2.toFixed(1)} ${y.toFixed(1)}"/>`;
}

// The sustain-pedal line: down at the start, a bracket along, up at the end.
function pedalMark(x1, x2, y) {
  return `<path class="km-staff__pedal" fill="none" d="M ${x1.toFixed(1)} ${(y - 8).toFixed(1)} L ${x1.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${(y - 8).toFixed(1)}"/>`;
}

// Original rest glyphs (standard Unicode music symbols — notation, not art).
const REST_GLYPH = {
  whole: '\uD834\uDD3B', half: '\uD834\uDD3C', quarter: '\uD834\uDD3D', eighth: '\uD834\uDD3E',
};
// rc2-231: rests at full printed size (the same music-font scale as the
// clefs), each registered where print puts it: the semibreve rest hangs from
// the fourth line, the minim rest sits on the middle line, the crotchet and
// quaver rests are centred on the staff. Offsets are the Noto Music ink box.
const REST_PLACE = {
  whole:   { dy: GAP + 35, dx: 26.5 },
  half:    { dy: 2 * GAP + 16, dx: 26.5 },
  quarter: { dy: 2 * GAP + 34, dx: 12 },
  eighth:  { dy: 2 * GAP + 34, dx: 12.5 },
};
function restGlyph(type, cx, topY) {
  const k = REST_GLYPH[type] ? type : 'quarter';
  const pl = REST_PLACE[k];
  return `<text class="km-staff__rest" x="${f1(cx - pl.dx)}" y="${f1(topY + pl.dy)}">${REST_GLYPH[k]}</text>`;
}

// Normalise: entries may be a MIDI number, { midi, state, finger, value }, or
// { rest: 'quarter'|'half'|'whole'|'eighth' }. value defaults to 'quarter'.
// rc2-216: normalise one member of a chord. Members may be bare MIDI numbers
// or objects with their own accidental / finger / letter / state.
function normaliseMember(m) {
  if (typeof m === 'number') return { midi: m };
  if (m && typeof m === 'object' && Number.isFinite(m.midi)) {
    return {
      midi: m.midi,
      finger: m.finger,
      state: m.state,
      letter: (typeof m.letter === 'string' ? m.letter : undefined),
      accidental: (Object.prototype.hasOwnProperty.call(ACCIDENTAL_GLYPH, m.accidental) ? m.accidental : undefined),
    };
  }
  return null;
}

// rc2-216: SPELLING IN FLAT KEYS. A black key is ambiguous — MIDI 70 is both
// A sharp and B flat, and they sit on DIFFERENT staff positions. An unmarked
// black key has so far been spelled sharpwards, which is right in C and in
// sharp keys but wrong in a flat one: in G minor, E flat would be drawn on the
// D line. So in a flat key an unmarked black key is spelled as a flat, and the
// glyph is suppressed because the key signature has already supplied it.
const BLACK_PC = new Set([1, 3, 6, 8, 10]);
function applyKeySpelling(item, sig) {
  if (!item || sig >= 0 || item.rest || item.blank) return item;
  const fix = (o) => {
    if (!o || !Number.isFinite(o.midi) || o.accidental) return o;
    if (!BLACK_PC.has(((o.midi % 12) + 12) % 12)) return o;
    o.accidental = 'flat';
    o.hideAcc = true;       // placement only — the key signature draws the sign
    return o;
  };
  if (Array.isArray(item.chord)) { item.chord.forEach(fix); return item; }
  return fix(item);
}

function normaliseSeq(notes, keySig) {
  const sig = Number.isFinite(keySig) ? keySig : 0;
  return notes.map((n) => applyKeySpelling(normaliseEntry(n), sig));
}

function normaliseEntry(n) {
    if (typeof n === 'number') return { midi: n, state: 'on', value: 'quarter' };
    if (n && typeof n === 'object') {
      if (n.rest) return { rest: String(n.rest) };
      // rc2-216: a chord entry. Members are validated and bad ones dropped; a
      // chord left with a single member degrades to an ordinary note, and one
      // left empty is dropped entirely, so malformed data never breaks a staff.
      if (Array.isArray(n.chord)) {
        const members = n.chord.map(normaliseMember).filter(Boolean);
        const value = (typeof n.value === 'string' ? n.value : 'quarter');
        const hand = (n.hand === 'L' || n.hand === 'R') ? n.hand : undefined;
        // An empty chord keeps its SLOT (drawing nothing) rather than being
        // removed, so opts.bars / marks / beams indices never silently shift.
        if (members.length === 0) return { blank: true };
        if (members.length === 1) {
          return {
            midi: members[0].midi,
            state: (n.state === undefined ? 'on' : n.state),
            finger: (members[0].finger !== undefined ? members[0].finger : n.finger),
            value, hand,
            letter: members[0].letter,
            accidental: members[0].accidental,
          };
        }
        return { chord: members, value, hand, state: (n.state === undefined ? 'on' : n.state) };
      }
      return {
        // rc2-216: `hand` explicitly assigns a note to a staff of the grand
        // staff. Without it the renderer guesses from pitch, which is wrong the
        // moment a left hand plays above middle C — routine from KL4 onward.
        hand: ((n.hand === 'L' || n.hand === 'R') ? n.hand : undefined),
        midi: n.midi,
        state: (n.state === undefined ? 'on' : n.state),
        finger: n.finger,
        value: (typeof n.value === 'string' ? n.value : 'quarter'),
        letter: (typeof n.letter === 'string' ? n.letter : undefined),
        // rc2-213: 'sharp' | 'flat' | 'natural'. Anything else is ignored, so a
        // typo degrades to "no accidental drawn" rather than breaking the staff.
        accidental: (Object.prototype.hasOwnProperty.call(ACCIDENTAL_GLYPH, n.accidental) ? n.accidental : undefined),
        // rc2-217: 'staccato' | 'accent' | 'tenuto'. Anything else is ignored.
        artic: (['staccato', 'accent', 'tenuto'].includes(n.artic) ? n.artic : undefined),
        // rc2-218: 'trill' | 'mordent' | 'mordent-lower' | 'turn'.
        orn: (['trill', 'mordent', 'mordent-lower', 'turn'].includes(n.orn) ? n.orn : undefined),
      };
    }
    return { midi: n, state: 'on', value: 'quarter' };
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

// ---------------------------------------------------------------------------
// BEAMS. opts.beams is a list of [startIndex, endIndex] pairs (1-based,
// inclusive) naming runs of quavers to join. rc2-231: the group's direction
// comes from the note FURTHEST from the middle line (the printed rule).
function resolveBeams(beams, seq, clefAt, topAt) {
  const map = new Map();
  const groups = [];
  if (!Array.isArray(beams)) return { map, groups };
  beams.forEach((b) => {
    if (!Array.isArray(b) || b.length < 2) return;
    const a = Math.round(b[0]) - 1;
    const z = Math.round(b[1]) - 1;
    if (!Number.isInteger(a) || !Number.isInteger(z)) return;
    if (a < 0 || z >= seq.length || z <= a) return;
    for (let i = a; i <= z; i += 1) {
      const it = seq[i];
      // A rest, chord, blank slot or non-quaver inside a beam group is a data
      // error: the group is skipped whole rather than drawn wrongly.
      if (!it || it.rest || it.chord || it.blank || !FLAGGED_VALUES.has(it.value)) return;
    }
    for (let i = a; i <= z; i += 1) if (topAt(i) !== topAt(a)) return;   // never across a system break
    const midLineY = topAt(a) + 2 * GAP;
    let far = 0;
    for (let i = a; i <= z; i += 1) {
      const dev = noteY(spellingMidi(seq[i].midi, seq[i].accidental), clefAt(i), topAt(i)) - midLineY;
      if (Math.abs(dev) > Math.abs(far) + 0.01) far = dev;
    }
    const dir = (far > 0.01) ? 'up' : 'down';
    for (let i = a; i <= z; i += 1) map.set(i, dir);
    groups.push({ a, z, dir });
  });
  return { map, groups };
}

// Beam geometry: a sloped beam following the melody, at most one space of
// rise across the group, flat when an inner note is more extreme than both
// ends (a concave shape), placed so the shortest stem is 3½ spaces and every
// stem reaches the middle line. Returns per-index beam info and the drawing.
function beamGeometry(groups, seq, xs, clefAt, topAt) {
  const per = new Map();
  const byStart = new Map();
  let svg = '';
  groups.forEach(({ a, z, dir }) => {
    const before = svg.length;
    const up = dir === 'up';
    const pts = [];
    for (let i = a; i <= z; i += 1) {
      const g = headGeom(seq[i].value);
      const y = noteY(spellingMidi(seq[i].midi, seq[i].accidental), clefAt(i), topAt(i));
      pts.push({ i, y, sx: up ? (xs[i] + g.ex - 1.1) : (xs[i] - g.ex + 1.1) });
    }
    const first = pts[0], last = pts[pts.length - 1];
    const mid = topAt(a) + 2 * GAP;
    const span = Math.max(1, last.sx - first.sx);
    let rise = 0;
    const inner = pts.slice(1, -1);
    const concave = up
      ? inner.some((p) => p.y < Math.min(first.y, last.y) - 0.01)
      : inner.some((p) => p.y > Math.max(first.y, last.y) + 0.01);
    if (!concave && Math.abs(last.y - first.y) > 0.01) {
      const steps = Math.abs(last.y - first.y) / HALF;
      rise = Math.sign(last.y - first.y) * Math.min(steps * 0.25, 1) * GAP;
    }
    const m = rise / span;
    // c = beam's OUTER edge at first.sx.
    let c = up ? Infinity : -Infinity;
    pts.forEach((p) => {
      const off = m * (p.sx - first.sx);
      if (up) c = Math.min(c, p.y - STEM - off, mid - off);
      else c = Math.max(c, p.y + STEM - off, mid - off);
    });
    const endAt = (x) => c + m * (x - first.sx);
    pts.forEach((p) => per.set(p.i, { dir, endAt }));
    pts.forEach((p) => {
      svg += `<line class="km-staff__stem" x1="${f1(p.sx)}" y1="${f1(p.y)}" x2="${f1(p.sx)}" y2="${f1(endAt(p.sx))}"/>`;
    });
    const x1 = first.sx - 1, x2 = last.sx + 1;
    const y1 = endAt(x1), y2 = endAt(x2);
    const t = up ? BEAM_T : -BEAM_T;
    svg += `<path class="km-staff__beam" d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}L${f1(x2)} ${f1(y2 + t)}L${f1(x1)} ${f1(y1 + t)}Z"/>`;
    byStart.set(a, svg.slice(before));
  });
  return { per, svg, byStart };
}

// ---------------------------------------------------------------------------
// HORIZONTAL SPACING.
// Each column (a note, chord or rest — or, on a grand staff, everything that
// starts at one moment) gets a "spring" that grows with the square root of its
// length, which is how printed music is spaced: a minim takes ~1.4× the room
// of a crotchet, a quaver ~0.7×. Accidentals, dots, flags and barlines add
// fixed room that never stretches. The line is then justified by solving for
// the spring constant that makes it end exactly at the right margin.
const U_NAT = 3.4 * GAP;           // natural room after a crotchet
const U_MAX = 2.6 * U_NAT;         // never stretch a line beyond this
function rowRun(cols, barAfter, xStart, U) {
  {
    const xs = [];
    const bars = [];
    let x = xStart + 1.3 * GAP + cols[0].acc + BLACK_EX;
    for (let i = 0; i < cols.length; i += 1) {
      xs.push(x);
      const c = cols[i];
      const spring = Math.sqrt(Math.max(c.d, 0.25)) * U;
      if (i === cols.length - 1) {
        return { xs, bars, end: x + Math.max(spring * 0.72, c.right + 1.2 * GAP) };
      }
      const nx = cols[i + 1];
      if (barAfter.has(i)) {
        const bx = x + Math.max(spring * 0.72, c.right + 0.8 * GAP);
        bars.push(bx);
        x = bx + 1.3 * GAP + nx.acc + BLACK_EX;
      } else {
        x += Math.max(spring, c.right + 0.55 * GAP + nx.acc + BLACK_EX);
      }
    }
    return { xs, bars, end: x };
  }
}
function placeRow(cols, barAfter, xStart, xEnd) {
  if (!cols.length) return { xs: [], bars: [], end: xStart, justified: false };
  const run = (U) => rowRun(cols, barAfter, xStart, U);
  const top = run(U_MAX);
  if (top.end <= xEnd) return { ...top, justified: false };
  let lo = 0.2 * GAP, hi = U_MAX;
  for (let k = 0; k < 40; k += 1) {
    const mid = (lo + hi) / 2;
    if (run(mid).end > xEnd) hi = mid; else lo = mid;
  }
  const r = run(lo);
  if (r.end > xEnd + 0.5) {
    // Too many notes for one line even at minimum spacing: scale the whole
    // line to fit rather than run off the page. (A card this dense should be
    // wrapped with opts.systems; the engraving audit reports any that are.)
    const k = (xEnd - xStart) / (r.end - xStart);
    const sc = (x) => xStart + (x - xStart) * k;
    return { xs: r.xs.map(sc), bars: r.bars.map(sc), end: xEnd, justified: true, compressed: k };
  }
  return { ...r, justified: true };
}

// Automatic line breaks for a passage too long for one line: greedy, at
// barlines only, never inside a beam, slur, hairpin or pedal mark, each line
// set no tighter than 80% of natural spacing.
function autoBreaks(seq, cols, barSet, ksig, tsig, opts) {
  const ranges = [];
  const add = (a, z) => { if (Number.isFinite(a) && Number.isFinite(z)) ranges.push([Math.round(a) - 1, Math.round(z) - 1]); };
  (Array.isArray(opts.slurs) ? opts.slurs : []).forEach((r) => Array.isArray(r) && add(r[0], r[1]));
  (Array.isArray(opts.beams) ? opts.beams : []).forEach((r) => Array.isArray(r) && add(r[0], r[1]));
  (Array.isArray(opts.hairpins) ? opts.hairpins : []).forEach((r) => r && add(r.from, r.to));
  (Array.isArray(opts.pedal) ? opts.pedal : []).forEach((r) => r && add(r.from, r.to));
  const allowed = (k) => !ranges.some(([a, z]) => a <= k && k < z);
  const cands = [...barSet].filter(allowed).sort((a, b) => a - b);
  const fits = (a, z, first) => {
    const local = new Set([...barSet].filter((k) => k >= a && k < z).map((k) => k - a));
    return rowRun(cols.slice(a, z + 1), local, headerGeom(ksig, !!tsig && first).end, 0.8 * U_NAT).end <= RIGHT;
  };
  const breaks = [];
  let start = 0;
  let last = -1;
  for (const k of cands) {
    if (k < start) continue;
    if (fits(start, k, breaks.length === 0)) { last = k; continue; }
    const cut = (last >= start) ? last : k;
    breaks.push(cut + 1);
    start = cut + 1;
    last = (k >= start && fits(start, k, false)) ? k : -1;
  }
  if (!fits(start, seq.length - 1, breaks.length === 0) && last >= start && last < seq.length - 1) breaks.push(last + 1);
  return breaks;   // 0-based index of the first note of each new line
}

// Diagram cards: calm, even, centred spacing (the pre-rc2-231 behaviour, now
// measured from the end of the clef/key-signature header).
function diagramXs(n, L, R, accRoom) {
  if (n <= 0) return [];
  if (n === 1) return [Math.round((L + R) / 2)];
  const span = R - L;
  const spacing = Math.min(NOTE_SPACING + (accRoom || 0), span / (n - 1));
  const groupW = spacing * (n - 1);
  const start = L + (span - groupW) / 2;
  return Array.from({ length: n }, (_, i) => Math.round(start + i * spacing));
}

// Column descriptors for a flat sequence.
function columnsFor(seq, beamMap) {
  return seq.map((it, i) => {
    const probe = it && !it.rest && !it.blank ? { ...it, inBeam: beamMap.has(i) } : it;
    let acc = accExtent(it);
    if (it && it.chord) {
      const L = chordLayout(it.chord, 'treble', 0, it.value);
      if (L.leftDisp) acc += 2 * headGeom(it.value).ex;
      if (L.rows.some((r) => r.dx > 0)) probe.rightExtra = 2 * headGeom(it.value).ex;
    }
    return { d: entryBeats(it || {}), acc, right: rightExtent(probe) + ((probe && probe.rightExtra) || 0) };
  });
}

// Barlines from the metre: indices (0-based) after which a bar ends.
function metreBars(seq, beatsPerBar) {
  const set = new Set();
  if (!(beatsPerBar > 0)) return set;
  let acc = 0;
  seq.forEach((it, i) => {
    acc += entryBeats(it || {});
    const q = acc / beatsPerBar;
    if (i < seq.length - 1 && Math.abs(q - Math.round(q)) < 1e-6) set.add(i);
  });
  return set;
}

function barLine(x, y1, y2) {
  return `<line class="km-staff__endbar" x1="${f1(x)}" y1="${y1}" x2="${f1(x)}" y2="${y2}"/>`;
}

// A curly brace for the grand staff, drawn as an original filled path.
function braceMark(y1, y2) {
  const x = SYS_L - 5, h = y2 - y1, m = (y1 + y2) / 2, w = 12;
  const P = (u, v) => `${f1(u)} ${f1(v)}`;
  const d = `M${P(x, y1)}`
    + `C${P(x - w * 0.95, y1 + h * 0.07)} ${P(x + 1.5, m - h * 0.24)} ${P(x - w, m)}`
    + `C${P(x + 1.5, m + h * 0.24)} ${P(x - w * 0.95, y2 - h * 0.07)} ${P(x, y2)}`
    + `C${P(x - w * 0.5, y2 - h * 0.1)} ${P(x + 6.5, m + h * 0.19)} ${P(x - w + 3, m)}`
    + `C${P(x + 6.5, m - h * 0.19)} ${P(x - w * 0.5, y1 + h * 0.1)} ${P(x, y1)}Z`;
  return `<path class="km-staff__bracket" d="${d}"/>`;
}

// Roman-numeral analysis with figured inversions: I6 → I⁶, I64 → I with 6
// over 4, V7 → V⁷. Anything else is printed as given.
function analysisText(x, y, text) {
  const m = /^([IViv]+|[IViv]+°)(6|64|7|65|43|42)?$/.exec(text);
  if (!m || !m[2]) return `<text class="km-staff__analysis" x="${f1(x)}" y="${f1(y)}" text-anchor="middle">${text}</text>`;
  const fig = m[2];
  const base = m[1];
  if (fig.length === 1) {
    return `<text class="km-staff__analysis" x="${f1(x)}" y="${f1(y)}" text-anchor="middle">${base}<tspan class="km-staff__figure" dy="-7">${fig}</tspan></text>`;
  }
  return `<text class="km-staff__analysis" x="${f1(x - 4)}" y="${f1(y)}" text-anchor="middle">${base}</text>`
    + `<text class="km-staff__analysis km-staff__figure" x="${f1(x + 4 + base.length * 4)}" y="${f1(y - 8)}" text-anchor="start">${fig[0]}</text>`
    + `<text class="km-staff__analysis km-staff__figure" x="${f1(x + 4 + base.length * 4)}" y="${f1(y + 3)}" text-anchor="start">${fig[1]}</text>`;
}

// ---------------------------------------------------------------------------
// rc2-215: MULTI-SYSTEM (WRAPPING) NOTATION. opts.systems lists 1-based note
// indices at which a new line begins. Returns inclusive 0-based ranges.
const SYSTEM_DY = 8 * GAP;   // vertical distance between successive systems
function resolveSystems(systemsOpt, n) {
  if (n <= 0) return [[0, -1]];
  if (!Array.isArray(systemsOpt) || !systemsOpt.length) return [[0, n - 1]];
  const cuts = systemsOpt
    .map((x) => Math.round(x) - 1)
    .filter((k) => Number.isInteger(k) && k > 0 && k < n)
    .sort((a, b) => a - b)
    .filter((k, i, arr) => i === 0 || k !== arr[i - 1]);
  if (!cuts.length) return [[0, n - 1]];
  const out = [];
  let start = 0;
  cuts.forEach((c) => { out.push([start, c - 1]); start = c; });
  out.push([start, n - 1]);
  return out.filter(([a, z]) => a <= z);
}

const BEATS = {
  whole: 4, half: 2, 'dotted-half': 3, quarter: 1,
  'dotted-quarter': 1.5, eighth: 0.5, 'dotted-eighth': 0.75,
};
function entryBeats(it) {
  const v = it.rest ? it.rest : (it.value || 'quarter');
  return (BEATS[v] !== undefined) ? BEATS[v] : 1;
}

// Left-hand fingering below the staff is set on ONE row per line (just
// clear of the lowest stem or head), so the numbers read as a steady line
// instead of jumping between the head and the stem end.
function assignFingerRows(list) {
  const rows = new Map();
  list.forEach((e) => {
    const it = e.it;
    if (!it || it.rest || it.blank) return;
    const fingered = it.chord ? it.chord.some((m) => Number.isFinite(m.finger)) : Number.isFinite(it.finger);
    if (!fingered) return;
    const bare = it.chord
      ? { ...it, chord: it.chord.map((m) => ({ ...m, finger: undefined })) }
      : { ...it, finger: undefined, letter: undefined };
    const r = drawEntry(bare, 'bass', e.top, e.cx, e.beam);
    rows.set(e.key, Math.max(rows.has(e.key) ? rows.get(e.key) : -Infinity, r.bot + 13));
  });
  list.forEach((e) => { if (e.it && rows.has(e.key)) e.it.fingerRow = rows.get(e.key); });
}

// Draw one entry (note, chord or rest) on a staff.
function drawEntry(it, clef, topY, cx, beam) {
  if (!it || it.blank) return { svg: '', top: Infinity, bot: -Infinity };
  if (it.rest) return { svg: restGlyph(it.rest, cx, topY), top: topY + GAP, bot: topY + REST_TOP_MARK };
  if (it.chord) return drawChord(it, clef, topY, cx);
  return drawNote(it, clef, topY, cx, beam);
}

/**
 * Build a staff diagram.
 * @param {object} opts
 *   clef       'treble' | 'bass' | 'grand'   (default 'treble')
 *   highlight  'lines' | 'spaces' | null      (default null)
 *   notes      MIDI numbers, { midi, state, finger, value, accidental, letter,
 *              artic, orn, hand } objects, { chord: [...], value, hand } chords,
 *              or { rest: 'quarter'|'half'|'whole'|'eighth' } entries.
 *   middleC    boolean   mark Middle C on the grand staff
 *   timeSig    '4/4' | '3/4' | [n,d] | false  (see resolveTimeSig)
 *   keySig     signed integer (+n sharps / −n flats) or key name ('G', 'Bb', 'Em' …)
 *   beams      [[start, end], …] 1-based runs of quavers to beam
 *   bars       [n, …] 1-based indices after which a barline falls. When absent
 *              and a time signature is shown, rc2-231 derives them from the metre.
 *   systems    [n, …] 1-based indices at which a new line begins
 *   slurs      [[start, end], …] phrase arcs
 *   hairpins   [{ from, to, dir: 'cresc'|'dim' }]
 *   pedal      [{ from, to }]
 *   analysis   [{ at, text }] Roman numerals (I6, I64, V7 are set as figures)
 *   marks      [{ at, text }] dynamics under the staff
 *   voices     { treble: [...], bass: [...] } time-aligned two-stave notation
 *              (with beams: { treble: [...], bass: [...] }, barsPerSystem,
 *              marks: [{ beat, text }])
 * @returns {HTMLDivElement} <div class="km-staff km-staff--{clef}">
 */

// ---------------------------------------------------------------------------
// rc2-216: TWO-VOICE, TIME-ALIGNED NOTATION (opts.voices). rc2-231: columns
// are built from every moment at which either hand starts a note, and spaced
// with the same non-linear springs as single-staff music, so quavers in one
// hand against a minim in the other get room to read, and both hands align.
const GRAND_GAP = 3 * GAP + 8;                      // between treble bottom and bass top
const GRAND_H = 4 * GAP + GRAND_GAP + 4 * GAP;      // treble top to bass bottom
const VOICED_SYSTEM_DY = GRAND_H + 4 * GAP;         // between stacked systems

// Grand-staff dynamics sit BETWEEN the staves (the piano convention). If a
// note, ledger or fingering already occupies that spot, the mark is nudged
// sideways; only if that fails does it drop below the bass staff.
function dynamicPos(boxes, x, trebleTop, bassTop) {
  const between = trebleTop + 4 * GAP + GRAND_GAP / 2 + 6;
  const clashAt = (xx, yy) => boxes.some((b) => Number.isFinite(b.top)
    && Math.abs(b.x - xx) < 24 && b.top < yy + 5 && b.bot > yy - 15);
  for (const dx of [0, -1.4 * GAP, 1.4 * GAP, -2.2 * GAP, 2.2 * GAP]) {
    if (!clashAt(x + dx, between)) return { x: x + dx, y: between };
  }
  const near = boxes.filter((b) => Math.abs(b.x - x) < 26 && Number.isFinite(b.bot));
  return { x, y: Math.max(bassTop + 4 * GAP, ...near.map((b) => b.bot)) + 22 };
}

function buildVoicedStaff(opts, ctx) {
  const { highlight, ksig, tsig } = ctx;
  const voices = [
    { key: 'treble', clefName: 'treble', seq: normaliseSeq(Array.isArray(opts.voices.treble) ? opts.voices.treble : [], ksig) },
    { key: 'bass', clefName: 'bass', seq: normaliseSeq(Array.isArray(opts.voices.bass) ? opts.voices.bass : [], ksig) },
  ];
  let totalBeats = 0;
  voices.forEach((v) => {
    let t = 0;
    v.times = v.seq.map((it) => { const at = t; t += entryBeats(it); return at; });
    totalBeats = Math.max(totalBeats, t);
  });
  const beatsPerBar = tsig ? (tsig[0] * (4 / tsig[1])) : 0;
  const bpsRaw = Math.round(Number(opts.barsPerSystem));
  const barsPerSystem = (Number.isFinite(bpsRaw) && bpsRaw > 0) ? bpsRaw : 0;
  const spanBeats = (barsPerSystem > 0 && beatsPerBar > 0) ? barsPerSystem * beatsPerBar : Math.max(totalBeats, 0.001);
  const systemCount = Math.max(1, Math.ceil((totalBeats - 0.001) / spanBeats));
  const systemOf = (t) => Math.min(systemCount - 1, Math.floor((t + 0.001) / spanBeats));
  const trebleTopOf = (si) => 34 + si * VOICED_SYSTEM_DY;
  const bassTopOf = (si) => trebleTopOf(si) + 4 * GAP + GRAND_GAP;

  let body = '';
  const ys = [];
  const mark = (y) => { if (Number.isFinite(y)) ys.push(y); };
  // One buffer per system, stacked at the end (see the single-staff path).
  const sb = Array.from({ length: systemCount }, () => '');
  const sMin = sb.map((_, si) => trebleTopOf(si) - 14);
  const sMax = sb.map((_, si) => bassTopOf(si) + 4 * GAP + 14);
  const markS = (si, y) => { if (Number.isFinite(y)) { sMin[si] = Math.min(sMin[si], y); sMax[si] = Math.max(sMax[si], y); } };

  // Beam groups first (they decide stem directions and flag-free spacing).
  voices.forEach((v) => {
    const spec = (opts.beams && Array.isArray(opts.beams[v.key])) ? opts.beams[v.key] : null;
    v.sysOf = v.times.map((t) => systemOf(t));
    v.topAt = (i) => ((v.key === 'treble') ? trebleTopOf(v.sysOf[i]) : bassTopOf(v.sysOf[i]));
    v.clefAt = () => v.clefName;
    v.beams = resolveBeams(spec, v.seq, v.clefAt, v.topAt);
    v.cols = columnsFor(v.seq, v.beams.map);
  });

  const xsByVoice = voices.map((v) => new Array(v.seq.length));
  const inkBoxes = [];
  const xOfTime = new Map();
  for (let si = 0; si < systemCount; si += 1) {
    const t0 = si * spanBeats, t1 = Math.min(totalBeats, (si + 1) * spanBeats);
    const onsets = [...new Set(voices.flatMap((v) => v.times.filter((t) => t >= t0 - 0.001 && t < t1 - 0.001)).map((t) => Math.round(t * 1000) / 1000))].sort((a, b) => a - b);
    const cols = onsets.map((t, k) => {
      const next = (k + 1 < onsets.length) ? onsets[k + 1] : t1;
      let acc = 0, right = BLACK_EX;
      voices.forEach((v) => v.times.forEach((vt, i) => {
        if (Math.abs(vt - t) < 0.001) { acc = Math.max(acc, v.cols[i].acc); right = Math.max(right, v.cols[i].right); }
      }));
      return { t, d: Math.max(0.25, next - t), acc, right };
    });
    const barAfter = new Set();
    if (beatsPerBar > 0) {
      cols.forEach((c, k) => {
        if (k + 1 >= cols.length) return;
        const nt = cols[k + 1].t;
        const q = nt / beatsPerBar;
        if (Math.abs(q - Math.round(q)) < 1e-6) barAfter.add(k);
      });
    }
    const hg = headerGeom(ksig, !!tsig && si === 0);
    const row = placeRow(cols, barAfter, hg.end, RIGHT);
    const tt = trebleTopOf(si), bt = bassTopOf(si);
    const xEnd = row.end;
    sb[si] += staffLines(tt, highlight, SYS_L, xEnd) + staffLines(bt, highlight, SYS_L, xEnd);
    sb[si] += clefMark('treble', tt, false) + clefMark('bass', bt, false);
    if (ksig) sb[si] += keySigMark(ksig, 'treble', tt, hg) + keySigMark(ksig, 'bass', bt, hg);
    if (tsig && si === 0) sb[si] += timeSigMark(tsig[0], tsig[1], tt, hg.tsX) + timeSigMark(tsig[0], tsig[1], bt, hg.tsX);
    sb[si] += braceMark(tt, bt + 4 * GAP);
    sb[si] += `<line class="km-staff__brace" x1="${SYS_L}" y1="${tt}" x2="${SYS_L}" y2="${bt + 4 * GAP}"/>`;
    row.bars.forEach((bx) => { sb[si] += barLine(bx, tt, bt + 4 * GAP); });
    sb[si] += barLine(xEnd, tt, bt + 4 * GAP);
    cols.forEach((c, k) => xOfTime.set(Math.round(c.t * 1000), row.xs[k]));
    voices.forEach((v, vi) => v.times.forEach((t, i) => {
      if (v.sysOf[i] === si) xsByVoice[vi][i] = row.xs[cols.findIndex((c) => Math.abs(c.t - t) < 0.001)];
    }));
  }

  voices.forEach((v, vi) => {
    const xs = xsByVoice[vi];
    const bg = beamGeometry(v.beams.groups, v.seq, xs, v.clefAt, v.topAt);
    if (v.key === 'bass') assignFingerRows(v.seq.map((it, i) => ({ it, top: v.topAt(i), cx: xs[i], beam: bg.per.get(i), key: v.sysOf[i] })));
    v.seq.forEach((it, i) => {
      const r = drawEntry(it, v.clefName, v.topAt(i), xs[i], bg.per.get(i));
      sb[v.sysOf[i]] += r.svg; markS(v.sysOf[i], r.top); markS(v.sysOf[i], r.bot);
      inkBoxes.push({ x: xs[i], top: r.top, bot: r.bot, si: v.sysOf[i], staff: v.key });
    });
    bg.byStart.forEach((svg, a) => { sb[v.sysOf[a]] += svg; });
  });

  // Dynamics, positioned by BEAT, between the staves (piano convention).
  if (Array.isArray(opts.marks)) {
    opts.marks.forEach((m) => {
      const t = m && Number(m.beat);
      if (!Number.isFinite(t) || t < 0 || t > totalBeats) return;
      if (typeof m.text !== 'string' || !/^[A-Za-z.]{1,8}$/.test(m.text)) return;
      const si = systemOf(t);
      let x = xOfTime.get(Math.round(t * 1000));
      if (!Number.isFinite(x)) {
        const keys = [...xOfTime.keys()].filter((k) => systemOf(k / 1000) === si).sort((a, b) => a - b);
        const k = keys.filter((q) => q <= t * 1000).pop();
        x = Number.isFinite(k) ? xOfTime.get(k) : headerGeom(ksig, false).end + 2 * GAP;
      }
      const pos = dynamicPos(inkBoxes.filter((b) => b.si === si), x, trebleTopOf(si), bassTopOf(si));
      sb[si] += `<text class="km-staff__mark" x="${f1(pos.x)}" y="${f1(pos.y)}" text-anchor="middle">${m.text}</text>`;
      markS(si, pos.y + 8);
    });
  }

  const shifts = [];
  sb.forEach((svg, si) => {
    let sh = si ? shifts[si - 1] : 0;
    if (si) {
      const need = (sMax[si - 1] + shifts[si - 1] + 1.0 * GAP) - (sMin[si] + sh);
      if (need > 0) sh += need;
    }
    shifts.push(sh);
    body += sh ? `<g transform="translate(0 ${f1(sh)})">${svg}</g>` : svg;
    mark(sMin[si] + sh); mark(sMax[si] + sh);
  });

  const PAD = 8;
  const yTop = Math.floor(Math.min(0, ...ys) - PAD);
  const yBot = Math.ceil(Math.max(...ys) + PAD);
  const vbH = Math.max(1, yBot - yTop);
  const svg = `<svg class="km-staff__svg" viewBox="0 ${yTop} ${W} ${vbH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Grand staff">${body}</svg>`;
  const wrap = document.createElement('div');
  wrap.className = 'km-staff km-staff--grand' + ((systemCount > 1) ? ' km-staff--score' : '');
  wrap.innerHTML = svg;
  scheduleHandDemotion();
  return wrap;
}

export function buildStaff(opts = {}) {
  injectStaffStyles();
  const clef = (opts.clef === 'bass' || opts.clef === 'grand') ? opts.clef : 'treble';
  const highlight = (opts.highlight === 'lines' || opts.highlight === 'spaces') ? opts.highlight : null;
  const ksig = resolveKeySig(opts.keySig);
  const seq = normaliseSeq(Array.isArray(opts.notes) ? opts.notes : [], ksig);
  const middleC = !!opts.middleC;
  const tsig = resolveTimeSig(opts.timeSig, seq);

  if (opts.voices && (Array.isArray(opts.voices.treble) || Array.isArray(opts.voices.bass))) {
    return buildVoicedStaff(opts, { highlight, ksig, tsig });
  }

  // MUSIC or DIAGRAM? Music (a metre, bars or beams) is spaced by note length,
  // barred and justified; a diagram keeps even, centred spacing.
  const explicitBars = Array.isArray(opts.bars) ? opts.bars.map((b) => Math.round(b) - 1).filter((k) => Number.isInteger(k) && k >= 0) : [];
  const isMusic = !!tsig || explicitBars.length > 0 || (Array.isArray(opts.beams) && opts.beams.length > 0);
  const beatsPerBar = tsig ? (Number(tsig[0]) * (4 / Number(tsig[1]))) : 0;
  const barSet = explicitBars.length ? new Set(explicitBars.filter((k) => k < seq.length - 1)) : metreBars(seq, beatsPerBar);

  let body = '';
  const ys = [];
  const mark = (y) => { if (Number.isFinite(y)) ys.push(y); };
  let scoreLayout = false;

  if (clef === 'grand') {
    const trebleTop = 34;
    const bassTop = trebleTop + 4 * GAP + GRAND_GAP;
    const gStaffAt = (i) => {
      const it = seq[i];
      if (it.hand === 'L') return 'bass';
      if (it.hand === 'R') return 'treble';
      const pitch = it.chord ? Math.max(...it.chord.map((m) => m.midi)) : it.midi;
      return (pitch >= 60) ? 'treble' : 'bass';
    };
    const gClefAt = (i) => (seq[i].rest ? 'treble' : gStaffAt(i));
    const gTopAt = (i) => ((gClefAt(i) === 'treble') ? trebleTop : bassTop);
    const { map: gBeamDir, groups: gBeamGroups } = resolveBeams(opts.beams, seq, gClefAt, gTopAt);
    const hg = headerGeom(ksig, !!tsig);
    let xs, xEnd = RIGHT, bars = [];
    if (isMusic) {
      const row = placeRow(columnsFor(seq, gBeamDir), barSet, hg.end, RIGHT);
      xs = row.xs; xEnd = row.end; bars = row.bars;
    } else {
      xs = diagramXs(seq.length, hg.end + 1.4 * GAP + BLACK_EX + Math.max(0, ...seq.map(accExtent)), RIGHT - 1.8 * GAP, Math.max(0, ...seq.map(accExtent)));
    }
    body += staffLines(trebleTop, highlight, SYS_L, xEnd) + staffLines(bassTop, highlight, SYS_L, xEnd);
    body += clefMark('treble', trebleTop, !isMusic) + clefMark('bass', bassTop, !isMusic);
    if (ksig) body += keySigMark(ksig, 'treble', trebleTop, hg) + keySigMark(ksig, 'bass', bassTop, hg);
    if (tsig) body += timeSigMark(tsig[0], tsig[1], trebleTop, hg.tsX) + timeSigMark(tsig[0], tsig[1], bassTop, hg.tsX);
    body += braceMark(trebleTop, bassTop + 4 * GAP);
    body += `<line class="km-staff__brace" x1="${SYS_L}" y1="${trebleTop}" x2="${SYS_L}" y2="${bassTop + 4 * GAP}"/>`;
    bars.forEach((bx) => { body += barLine(bx, trebleTop, bassTop + 4 * GAP); });
    body += barLine(xEnd, trebleTop, bassTop + 4 * GAP);
    mark(trebleTop - 14);
    mark(bassTop + 4 * GAP + 14);
    if (!isMusic) mark(bassTop + 5 * GAP + 18);   // room for the clef label
    if (middleC) {
      const cx = Math.round((hg.end + RIGHT) / 2);
      const r = drawNote({ midi: 60, value: 'quarter', state: 'on' }, 'treble', trebleTop, cx);
      body += r.svg; mark(r.top); mark(r.bot);
      body += `<text class="km-staff__mc" x="${cx + 22}" y="${noteY(60, 'treble', trebleTop) + 4}">Middle C</text>`;
    }
    const bg = beamGeometry(gBeamGroups, seq, xs, gClefAt, gTopAt);
    const gBoxes = [];
    assignFingerRows(seq.map((it, i) => ({ it: gClefAt(i) === 'bass' ? it : null, top: gTopAt(i), cx: xs[i], beam: bg.per.get(i), key: 0 })));
    seq.forEach((it, i) => {
      const r = drawEntry(it, gClefAt(i), gTopAt(i), xs[i], bg.per.get(i));
      body += r.svg; mark(r.top); mark(r.bot);
      gBoxes.push({ x: xs[i], top: r.top, bot: r.bot });
    });
    body += bg.svg;
    if (Array.isArray(opts.marks) && opts.marks.length) {
      opts.marks.forEach((m) => {
        const k = m && Math.round(m.at) - 1;
        const ok = Number.isInteger(k) && k >= 0 && k < xs.length
          && typeof m.text === 'string' && /^[A-Za-z.]{1,8}$/.test(m.text);
        if (!ok) return;
        const pos = dynamicPos(gBoxes, xs[k], trebleTop, bassTop);
        body += `<text class="km-staff__mark" x="${f1(pos.x)}" y="${f1(pos.y)}" text-anchor="middle">${m.text}</text>`;
        mark(pos.y + 8);
      });
    }
  } else {
    // Line breaks: the card's own opts.systems, or — rc2-231 — automatic
    // breaks at barlines when a passage is too long to set on one line
    // without the notes colliding (never inside a slur, hairpin or pedal mark).
    let systems = resolveSystems(opts.systems, seq.length);
    let autoWrapped = false;
    const sClefAt = () => clef;
    if (isMusic && !(Array.isArray(opts.systems) && opts.systems.length) && seq.length > 1) {
      const probeCols = columnsFor(seq, resolveBeams(opts.beams, seq, sClefAt, () => 34).map);
      const fit = placeRow(probeCols, barSet, headerGeom(ksig, !!tsig).end, RIGHT);
      if (fit.compressed) {
        const brk = autoBreaks(seq, probeCols, barSet, ksig, tsig, opts);
        if (brk.length) { systems = resolveSystems(brk.map((k) => k + 1), seq.length); autoWrapped = systems.length > 1; }
      }
    }
    const xs = new Array(seq.length);
    const tops = new Array(seq.length);
    const sysOfIdx = new Array(seq.length);
    systems.forEach(([a, z], si) => { for (let i = a; i <= z; i += 1) { tops[i] = 34 + si * SYSTEM_DY; sysOfIdx[i] = si; } });
    const sTopAt = (i) => tops[i];
    const { map: sBeamDir, groups: sBeamGroups } = resolveBeams(opts.beams, seq, sClefAt, sTopAt);
    const allCols = columnsFor(seq, sBeamDir);
    const single = systems.length === 1;
    // Each line is drawn into its own buffer so that, if one line's content
    // reaches down into the next, the following lines can be moved apart.
    const sb = systems.map(() => '');
    const sMin = systems.map((_, si) => 34 + si * SYSTEM_DY - 14);
    const sMax = systems.map((_, si) => 34 + si * SYSTEM_DY + 4 * GAP + 14);
    const markS = (si, y) => { if (Number.isFinite(y)) { sMin[si] = Math.min(sMin[si], y); sMax[si] = Math.max(sMax[si], y); } };
    systems.forEach(([a, z], si) => {
      const topY = 34 + si * SYSTEM_DY;
      const hg0 = headerGeom(ksig, !!tsig && si === 0);
      let rowXs, xEnd = RIGHT, bars = [], dx = 0;
      if (isMusic && z >= a) {
        const local = new Set([...barSet].filter((k) => k >= a && k < z).map((k) => k - a));
        const row = placeRow(allCols.slice(a, z + 1), local, hg0.end, RIGHT);
        rowXs = row.xs; xEnd = row.end; bars = row.bars;
        // A short single line is centred, like a printed incipit, rather than
        // over-stretched. (Multi-line scores keep a common left edge.)
        if (!row.justified && single) dx = Math.max(0, (RIGHT - xEnd) / 2);
      } else {
        rowXs = diagramXs(z - a + 1, hg0.end + 1.4 * GAP + BLACK_EX + Math.max(0, ...seq.slice(a, z + 1).map(accExtent)), RIGHT - 1.8 * GAP, Math.max(0, ...seq.slice(a, z + 1).map(accExtent)));
      }
      const hg = dx ? headerGeom(ksig, !!tsig && si === 0, dx) : hg0;
      sb[si] += staffLines(topY, highlight, SYS_L + dx, xEnd + dx) + clefMark(clef, topY, !isMusic && si === 0, dx);
      if (ksig) sb[si] += keySigMark(ksig, clef, topY, hg);
      if (tsig && si === 0) sb[si] += timeSigMark(tsig[0], tsig[1], topY, hg.tsX);
      if (isMusic) {
        bars.forEach((bx) => { sb[si] += barLine(bx + dx, topY, topY + 4 * GAP); });
        sb[si] += barLine(xEnd + dx, topY, topY + 4 * GAP);
      }
      if (!isMusic && si === 0) markS(si, topY + 5 * GAP + 18);   // clef label
      for (let i = a; i <= z; i += 1) xs[i] = rowXs[i - a] + dx;
    });

    const bg = beamGeometry(sBeamGroups, seq, xs, sClefAt, sTopAt);
    const sysBot = systems.map((_, si) => 34 + si * SYSTEM_DY + 4 * GAP);
    if (clef === 'bass') assignFingerRows(seq.map((it, i) => ({ it, top: tops[i], cx: xs[i], beam: bg.per.get(i), key: sysOfIdx[i] })));
    seq.forEach((it, i) => {
      const si = sysOfIdx[i];
      const r = drawEntry(it, clef, tops[i], xs[i], bg.per.get(i));
      sb[si] += r.svg; markS(si, r.top); markS(si, r.bot);
      if (Number.isFinite(r.bot)) sysBot[si] = Math.max(sysBot[si], r.bot);
    });
    bg.byStart.forEach((svg, a) => { sb[sysOfIdx[a]] += svg; });

    // ANNOTATION ROWS below the staff, in engraving order and only for the
    // kinds present — starting below the lowest ink of that line.
    const rowOrder = [
      ['marks', Array.isArray(opts.marks) && opts.marks.length, 22],
      ['hairpins', Array.isArray(opts.hairpins) && opts.hairpins.length, 20],
      ['analysis', Array.isArray(opts.analysis) && opts.analysis.length, 26],
      ['pedal', Array.isArray(opts.pedal) && opts.pedal.length, 26],
    ];
    const rowY = {};
    let rowCursor = 0;
    rowOrder.forEach(([key, present, height]) => {
      if (!present) return;
      rowY[key] = rowCursor;
      rowCursor += height;
    });
    const rowBase = (k) => Math.max(tops[k] + 5 * GAP + 26, sysBot[sysOfIdx[k]] + 22);

    if (Array.isArray(opts.marks) && opts.marks.length) {
      opts.marks.forEach((m) => {
        const k = m && Math.round(m.at) - 1;
        const ok = Number.isInteger(k) && k >= 0 && k < xs.length
          && typeof m.text === 'string' && /^[A-Za-z.]{1,8}$/.test(m.text);
        if (!ok) return;
        const my = rowBase(k) + rowY.marks;
        sb[sysOfIdx[k]] += `<text class="km-staff__mark" x="${f1(xs[k])}" y="${f1(my)}" text-anchor="middle">${m.text}</text>`;
        markS(sysOfIdx[k], my + 12);
      });
    }
    // rc2-217: SLURS — on the side away from the stems; never across a break.
    if (Array.isArray(opts.slurs)) {
      opts.slurs.forEach((sl) => {
        if (!Array.isArray(sl) || sl.length < 2) return;
        const a = Math.round(sl[0]) - 1, z = Math.round(sl[1]) - 1;
        if (!(a >= 0 && z < seq.length && z > a)) return;
        if (tops[a] !== tops[z]) return;
        const ia = seq[a], iz = seq[z];
        if (!ia || !iz || ia.rest || iz.rest || ia.blank || iz.blank) return;
        const pitchA = ia.chord ? Math.max(...ia.chord.map((m) => m.midi)) : ia.midi;
        const pitchZ = iz.chord ? Math.max(...iz.chord.map((m) => m.midi)) : iz.midi;
        const ya = noteY(spellingMidi(pitchA, ia.accidental), clef, tops[a]);
        const yz = noteY(spellingMidi(pitchZ, iz.accidental), clef, tops[z]);
        const midLineY = tops[a] + 2 * GAP;
        const arcAbove = !(((ya + yz) / 2) > midLineY);
        const off = 14;
        const y1 = arcAbove ? (ya - off) : (ya + off);
        const y2 = arcAbove ? (yz - off) : (yz + off);
        sb[sysOfIdx[a]] += slurPath(xs[a], y1, xs[z], y2, arcAbove);
        markS(sysOfIdx[a], arcAbove ? Math.min(y1, y2) - 30 : Math.max(y1, y2) + 30);
      });
    }
    if (Array.isArray(opts.hairpins)) {
      opts.hairpins.forEach((hp) => {
        const a = Math.round(hp && hp.from) - 1, z = Math.round(hp && hp.to) - 1;
        if (!(a >= 0 && z < xs.length && z > a)) return;
        if (tops[a] !== tops[z]) return;
        const hy = rowBase(a) + rowY.hairpins - 6;
        sb[sysOfIdx[a]] += hairpinPath(xs[a], xs[z], hy, hp.dir !== 'dim');
        markS(sysOfIdx[a], hy + 14);
      });
    }
    if (Array.isArray(opts.pedal)) {
      opts.pedal.forEach((pd) => {
        const a = Math.round(pd && pd.from) - 1, z = Math.round(pd && pd.to) - 1;
        if (!(a >= 0 && z < xs.length && z > a)) return;
        if (tops[a] !== tops[z]) return;
        const py = rowBase(a) + rowY.pedal;
        sb[sysOfIdx[a]] += pedalMark(xs[a], xs[z], py);
        markS(sysOfIdx[a], py + 12);
      });
    }
    if (Array.isArray(opts.analysis) && opts.analysis.length) {
      opts.analysis.forEach((m) => {
        const k = m && Math.round(m.at) - 1;
        const ok = Number.isInteger(k) && k >= 0 && k < xs.length
          && typeof m.text === 'string' && /^[A-Za-z0-9°∅/+-]{1,8}$/.test(m.text);
        if (!ok) return;
        const ay = rowBase(k) + rowY.analysis;
        sb[sysOfIdx[k]] += analysisText(xs[k], ay, m.text);
        markS(sysOfIdx[k], ay + 12);
      });
    }
    // Stack the lines: keep the standard distance, and open it up only where
    // one line's content would otherwise touch the next.
    const shifts = [];
    sb.forEach((svg, si) => {
      let sh = si ? shifts[si - 1] : 0;
      if (si) {
        const need = (sMax[si - 1] + shifts[si - 1] + 0.8 * GAP) - (sMin[si] + sh);
        if (need > 0) sh += need;
      }
      shifts.push(sh);
      body += sh ? `<g transform="translate(0 ${f1(sh)})">${svg}</g>` : svg;
      mark(sMin[si] + sh); mark(sMax[si] + sh);
    });
    scoreLayout = systems.length > 1;
  }

  const PAD = 8;
  const yTop = Math.floor(Math.min(0, ...ys) - PAD);
  const yBot = Math.ceil(Math.max(...ys) + PAD);
  const vbH = Math.max(1, yBot - yTop);
  const aria = clef === 'grand' ? 'Grand staff' : (clef === 'bass' ? 'Bass staff' : 'Treble staff');
  const svg = `<svg class="km-staff__svg" viewBox="0 ${yTop} ${W} ${vbH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${aria}">${body}</svg>`;
  const wrap = document.createElement('div');
  const isScore = scoreLayout || (Array.isArray(opts.systems) && opts.systems.length > 0 && clef !== 'grand');
  wrap.className = `km-staff km-staff--${clef}` + (isScore ? ' km-staff--score' : '');
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
/* rc2-216: a multi-system SCORE keeps its natural aspect ratio at full width.
   Capping its height would scale the whole page of music down until the
   note-heads were too small to read, which defeats the point of printing it. */
.view[data-view="learn"] .km-staff--score .km-staff__svg{max-height:none;}
.view[data-view="learn"] .km-staff--grand{padding-top:.5rem;padding-bottom:.45rem;}
.view[data-view="learn"] .km-staff__line{stroke:${INK_DIM};stroke-width:1.8;}
.view[data-view="learn"] .km-staff__ledger{stroke:${INK_DIM};stroke-width:2.3;}
.view[data-view="learn"] .km-staff__brace{stroke:${INK};stroke-width:3;stroke-linecap:round;}
.view[data-view="learn"] .km-staff__endbar{stroke:${INK_DIM};stroke-width:2.4;}
.view[data-view="learn"] .km-staff__bracket{fill:${INK};stroke:none;}
.view[data-view="learn"] .km-staff__stem{stroke:${INK};stroke-width:2.1;stroke-linecap:butt;}
.view[data-view="learn"] .km-staff__clef{fill:${INK};font-family:${MUSIC_FONT};font-size:68px;font-weight:400;}
.view[data-view="learn"] .km-staff__clef--bass{font-size:68px;}
.view[data-view="learn"] .km-staff__cleflabel{fill:#857C6B;font-size:12px;letter-spacing:.06em;font-family:var(--font-ui,system-ui,sans-serif);}
.view[data-view="learn"] .km-staff__timesig{fill:${INK};font-family:${SERIF};font-weight:700;font-size:40px;}
.view[data-view="learn"] .km-staff__note{fill:${INK};stroke:none;transition:fill .18s ease,filter .2s ease,stroke .18s ease;}
.view[data-view="learn"] .km-staff__note--open{fill:${PAPER};stroke:${INK};stroke-width:2.6;}
.view[data-view="learn"] .km-staff__note.is-on{fill:${INK};stroke:none;}
.view[data-view="learn"] .km-staff__note--open.is-on{fill:${PAPER};stroke:${INK};stroke-width:2.6;}
.view[data-view="learn"] .km-staff__mc{fill:${INK};font-size:14px;font-weight:700;font-family:var(--font-ui,system-ui,sans-serif);}
.view[data-view="learn"] .km-staff__rest{fill:${INK};font-family:'Noto Music',${MUSIC_FONT};font-size:68px;}
.view[data-view="learn"] .km-staff__finger{fill:var(--brass-deep,#9A7330);font-size:16px;font-weight:700;font-family:var(--font-mono,ui-monospace,monospace);}
html[data-fingering="hidden"] .view[data-view="learn"] .km-staff__finger{display:none;}
.view[data-view="learn"] .km-staff__letter{fill:${INK};font-size:15px;font-weight:700;font-family:var(--font-ui,system-ui,sans-serif);}
.view[data-view="learn"] .km-staff__dot{fill:${INK};}
.view[data-view="learn"] .km-staff__acc{fill:${INK};stroke:none;}
.view[data-view="learn"] .km-staff__flag{fill:${INK};stroke:none;}
.view[data-view="learn"] .km-staff__beam{fill:${INK};stroke:none;}
/* rc2-231: hollow heads are one even-odd path (head + slanted hole). */
.view[data-view="learn"] .km-staff__note--hollow{fill:${INK};stroke:none;}
.view[data-view="learn"] .km-staff__figure{font-size:12px;}
.view[data-view="learn"] .km-staff__artic{fill:${INK};}
.view[data-view="learn"] .km-staff__artic-line{stroke:${INK};stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round;}
.view[data-view="learn"] .km-staff__orn{stroke:${INK};stroke-width:2.1;fill:none;stroke-linecap:round;stroke-linejoin:round;}
.view[data-view="learn"] .km-staff__orn-text{fill:${INK};font-size:19px;font-style:italic;font-weight:700;font-family:Georgia,"Times New Roman",serif;}
.view[data-view="learn"] .km-staff__slur{stroke:${INK};stroke-width:2.1;stroke-linecap:round;}
.view[data-view="learn"] .km-staff__hairpin{stroke:${INK};stroke-width:1.9;stroke-linecap:round;}
.view[data-view="learn"] .km-staff__pedal{stroke:${INK_DIM};stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}
.view[data-view="learn"] .km-staff__analysis{fill:#6B5F49;font-size:17px;font-weight:700;letter-spacing:.02em;font-family:var(--font-ui,system-ui,sans-serif);}
.view[data-view="learn"] .km-staff__mark{fill:${INK};font-size:19px;font-style:italic;font-weight:700;font-family:Georgia,'Times New Roman',serif;}
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
/* rc2-220 FEEDBACK SWITCH: the Course staff obeys the same html[data-feedback]
   attribute as the keyboard and the practice-room staves, so "feedback off"
   means off everywhere rather than in two places out of three. Display only —
   the evaluator still runs and still decides correctness. */
html[data-feedback="hidden"] .view[data-view="learn"] .km-staff__note.is-correct,
html[data-feedback="hidden"] .view[data-view="learn"] .km-staff__note.is-wrong{fill:${INK};stroke:none;filter:none;}
html[data-feedback="hidden"] .view[data-view="learn"] .km-staff__note--open.is-correct,
html[data-feedback="hidden"] .view[data-view="learn"] .km-staff__note--open.is-wrong{fill:${PAPER};stroke:${INK};stroke-width:2.6;filter:none;}
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
    e.setAttribute('rx', HEAD_RX.toFixed(2));
    e.setAttribute('ry', HEAD_RY.toFixed(2));
    e.setAttribute('transform', `rotate(-20 ${cx} ${y.toFixed(2)})`);
    g.appendChild(e);
    svg.appendChild(g);

    const life = (Number.isFinite(ms) && ms > 0) ? ms : 900;
    setTimeout(() => { try { g.remove(); } catch (_) {} }, life);
  } catch (_) { /* feedback flourish, never required */ }
}
