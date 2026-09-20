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
// rc2-213: `shift` moves the whole note area right to clear a key signature.
function noteXs(n, shift) {
  const L = NOTE_L + (Number.isFinite(shift) ? shift : 0);
  if (n <= 0) return [];
  if (n === 1) return [Math.round((L + NOTE_R) / 2)];
  const span = NOTE_R - L;
  const spacing = Math.min(NOTE_SPACING, span / (n - 1));
  const groupW = spacing * (n - 1);
  const start = L + (span - groupW) / 2;
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
// rc2-213: `x` defaults to TS_X, but shifts right when a key signature is drawn.
function timeSigMark(num, den, topY, x) {
  const tx = Number.isFinite(x) ? x : TS_X;
  const ny = topY + Math.round(1.55 * GAP);
  const dy = topY + Math.round(3.62 * GAP);
  return `<text class="km-staff__timesig" x="${tx}" y="${ny}" text-anchor="middle">${num}</text>`
    + `<text class="km-staff__timesig" x="${tx}" y="${dy}" text-anchor="middle">${den}</text>`;
}

// ---------------------------------------------------------------------------
// rc2-213: ACCIDENTALS + KEY SIGNATURES.
// Standard Unicode music symbols (notation, not art), drawn in the same music
// font stack as the clefs/rests. staffStep() already maps a sharpened pitch to
// its natural letter's staff position (F#4 sits on the F line), so an accidental
// is purely an added glyph to the LEFT of the head — no vertical maths changes.
const ACCIDENTAL_GLYPH = {
  sharp: '\u266F', flat: '\u266D', natural: '\u266E',
};
const ACC_DX = 15;         // glyph centre offset left of the note-head centre

// ENHARMONIC SPELLING. A MIDI number is ambiguous: 70 is both A# and Bb, and
// they occupy DIFFERENT staff positions (A-space vs B-line). staffStep()'s
// LETTER table spells everything sharpwards, which is right for A# and wrong
// for Bb. A flattened note is the letter ABOVE, lowered — so for placement
// purposes (and placement only) we read it one semitone higher. The sounding
// pitch is never altered; this affects the drawn line/space alone.
function spellingMidi(midi, accidental) {
  return (accidental === 'flat') ? (midi + 1) : midi;
}
function accidentalMark(kind, cx, y, rx) {
  const g = ACCIDENTAL_GLYPH[kind];
  if (!g) return '';
  const x = cx - rx - ACC_DX;
  return `<text class="km-staff__acc" x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" text-anchor="middle">${g}</text>`;
}

// Key signatures. Order of sharps (F C G D A E B) and flats (B E A D G C F),
// with the standard engraving octave for each clef. Values are MIDI pitches
// chosen purely for staff PLACEMENT via noteY(); they are never sounded.
const KEYSIG_SHARP_PITCHES = { treble: [77, 72, 79, 74, 69, 76, 71], bass: [56, 51, 58, 53, 48, 55, 50] };
const KEYSIG_FLAT_PITCHES  = { treble: [71, 76, 69, 74, 67, 72, 65], bass: [50, 55, 48, 53, 46, 51, 44] };
const KS_X0 = 44;          // first accidental x, just right of the clef
const KS_DX = 11;          // horizontal step between key-signature accidentals
// resolveKeySig: accepts a signed integer (+n sharps / -n flats) or a key name.
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
function keySigMark(sig, clef, topY) {
  if (!sig) return '';
  const sharps = sig > 0;
  const n = Math.min(Math.abs(sig), 7);
  const pitches = (sharps ? KEYSIG_SHARP_PITCHES : KEYSIG_FLAT_PITCHES)[clef] || [];
  const glyph = sharps ? ACCIDENTAL_GLYPH.sharp : ACCIDENTAL_GLYPH.flat;
  let out = '';
  for (let i = 0; i < n; i += 1) {
    const p = pitches[i];
    if (!Number.isFinite(p)) continue;
    const y = noteY(p, clef, topY);
    out += `<text class="km-staff__acc km-staff__acc--ks" x="${KS_X0 + i * KS_DX}" y="${(y + 6).toFixed(1)}" text-anchor="middle">${glyph}</text>`;
  }
  return out;
}
// How far the note area must shift right to clear a rendered key signature.
function keySigWidth(sig) {
  const n = Math.min(Math.abs(resolveKeySig(sig)), 7);
  return n ? (n * KS_DX + 12) : 0;
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
// rc2-212: 'dotted-half' (dotted minim) shares the half-note footprint; the
// augmentation dot itself is drawn in noteHead(). Additive — unknown values
// still fall through to the quarter default exactly as before.
function noteHeadGeom(value) {
  if (value === 'whole') return { rx: 0.64 * GAP, ry: 0.45 * GAP, rot: 0, open: true, stem: false };
  if (value === 'half' || value === 'dotted-half') return { rx: 0.58 * GAP, ry: 0.42 * GAP, rot: -20, open: true, stem: true };
  return { rx: 0.58 * GAP, ry: 0.42 * GAP, rot: -20, open: false, stem: true };   // quarter (crotchet) default
}

// rc2-213: which values carry an augmentation dot, and which carry a quaver flag.
const DOTTED_VALUES = new Set(['dotted-half', 'dotted-quarter', 'dotted-eighth']);
const FLAGGED_VALUES = new Set(['eighth', 'dotted-eighth']);
const KNOWN_VALUES = new Set(['whole', 'half', 'dotted-half', 'quarter', 'dotted-quarter', 'eighth', 'dotted-eighth']);

// A quaver flag, drawn as an original SVG path (not a font glyph) so it always
// attaches exactly to the stem end at this staff size. Mirrored for stem-down.
function quaverFlag(sx, yEnd, stemUp) {
  const d = stemUp
    ? `M ${sx} ${yEnd} c 10 6 15 14 13 25 c 6 -13 2 -24 -13 -33 z`
    : `M ${sx} ${yEnd} c 10 -6 15 -14 13 -25 c 6 13 2 24 -13 33 z`;
  return `<path class="km-staff__flag" d="${d}"/>`;
}

function noteHead(midi, clef, topY, cx, state, finger, value, letter, accidental, beamDir, inBeam, hideAcc, artic, orn) {
  // Placement uses the SPELLED pitch so a flat lands on the correct letter.
  const sm = spellingMidi(midi, accidental);
  const y = noteY(sm, clef, topY);
  const g = noteHeadGeom(value);
  const cls = 'km-staff__note' + (g.open ? ' km-staff__note--open' : '') + stateClass(state);
  let out = ledgersFor(sm, clef, topY, cx);
  // rc2-213: accidental glyph, left of the head. staffStep() already places a
  // sharpened/flattened pitch on its natural letter's line or space, so this is
  // purely additive — no vertical maths changes.
  if (accidental && !hideAcc) out += accidentalMark(accidental, cx, y, g.rx);
  out += `<ellipse class="${cls}" cx="${cx}" cy="${y}" rx="${g.rx.toFixed(2)}" ry="${g.ry.toFixed(2)}" transform="rotate(${g.rot} ${cx} ${y})"/>`;
  // Augmentation dot. Engraving rule: the dot sits just right of the head — in
  // the SAME space for space-notes, in the space ABOVE for line-notes. A note is
  // on a line when its step offset from the bottom line is an even number of
  // half-gaps. rc2-213: generalised from 'dotted-half' to every dotted value.
  if (DOTTED_VALUES.has(value)) {
    const k = Math.round((topY + 4 * GAP - y) / HALF);
    const dotY = (k % 2 === 0) ? (y - HALF) : y;
    out += `<circle class="km-staff__dot" cx="${(cx + g.rx + 7).toFixed(1)}" cy="${dotY.toFixed(1)}" r="3.1"/>`;
  }
  let stemUp = true;
  if (g.stem) {
    const midLineY = topY + 2 * GAP;     // middle (3rd) line
    // rc2-213: inside a beam group every stem must point the SAME way, so the
    // group's shared direction (beamDir) overrides the per-note rule.
    stemUp = (beamDir === 'up') ? true : (beamDir === 'down') ? false : (y >= midLineY);
    const sx = stemUp ? (cx + g.rx - 1.6) : (cx - g.rx + 1.6);
    const y2 = stemUp ? (y - STEM) : (y + STEM);
    // rc2-218: a BEAMED note's stem is drawn by beamLines instead, which
    // extends every stem in the group to the shared beam edge. Drawing it here
    // as well would lay a second, shorter stroke underneath the first.
    if (!inBeam) out += `<line class="km-staff__stem" x1="${sx.toFixed(2)}" y1="${y}" x2="${sx.toFixed(2)}" y2="${y2}"/>`;
    // A flag is drawn only on an UNBEAMED quaver — beamed quavers get the beam
    // instead, which is what the flag would otherwise duplicate.
    if (FLAGGED_VALUES.has(value) && !inBeam) out += quaverFlag(sx, y2, stemUp);
  }
  // rc2-217: articulation sits opposite the stem. A stemless note (semibreve)
  // is treated as stem-up so the mark lands below the head, as engraving does.
  if (artic) out += articulationMark(artic, cx, y, g, g.stem ? stemUp : true);
  // rc2-218: an ornament sits above the staff, clear of notes and stems alike.
  if (orn) out += ornamentMark(orn, cx, topY);
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
function noteBounds(midi, clef, topY, value, hasFinger, hasLetter, beamDir, accidental, orn) {
  const y = noteY(spellingMidi(midi, accidental), clef, topY);
  const g = noteHeadGeom(value);
  let top = y - g.ry - 4;
  let bot = y + g.ry + 4;
  let stemUp = true;
  if (g.stem) {
    const midLineY = topY + 2 * GAP;
    stemUp = (beamDir === 'up') ? true : (beamDir === 'down') ? false : (y >= midLineY);
    // rc2-213: a beam sits just beyond the stem end, and a flag curls past it —
    // reserve a little extra so neither is ever clipped by the auto-fit viewBox.
    const extra = (FLAGGED_VALUES.has(value) || beamDir) ? 12 : 4;
    if (stemUp) top = y - STEM - extra; else bot = y + STEM + extra;
  }
  if (hasFinger) top = Math.min(top, ((g.stem && stemUp) ? (y - STEM) : (y - g.ry)) - 22);
  if (hasLetter) bot = Math.max(bot, y + g.ry + 24);
  // rc2-218: reserve space for an ornament drawn above the staff.
  if (orn) top = Math.min(top, topY - 30);
  return [top, bot];
}

// ---------------------------------------------------------------------------
// rc2-216: CHORDS — two or more notes sounding TOGETHER.
//
// Until now the renderer laid every note out sequentially along the x-axis, so
// simultaneous pitches could not be drawn at all. That blocked Key Level 4
// (Musical Independence) and everything after it, since two hands doing
// different things at once is the whole subject.
//
// A chord is one entry in opts.notes:  { chord: [60, 64, 67], value: 'half' }
// The members may be bare MIDI numbers or objects carrying their own
// accidental / finger / letter.
//
// Four engraving rules are implemented, because a chord drawn naively is not
// merely ugly — it is unreadable, and teaching from it would be dishonest:
//
//   1. SHARED STEM. One stem serves the whole chord. Its direction is decided
//      by the note FURTHEST from the middle line, which is the standard rule;
//      a chord straddling the middle therefore stems away from its extreme.
//   2. SECONDS DISPLACE. Two notes a diatonic step apart cannot both sit on
//      the same side of the stem — the heads would overlap. Standard
//      resolution: with the stem up, the UPPER note of the pair moves to the
//      right of the stem; with the stem down, the LOWER note moves left.
//   3. ACCIDENTALS STACK. Accidentals sit in columns left of the chord,
//      highest note nearest, stepping outward only when a column would
//      collide. Without this, a chord of sharps draws them on top of
//      each other.
//   4. Ledger lines are drawn per member, exactly as for single notes.
//
// Additive: a `chord` entry is a NEW shape. Every existing single-note path is
// untouched, so previously-rendered cards stay byte-identical.

const CHORD_ACC_COL = 15;        // horizontal step between accidental columns
const CHORD_ACC_CLEAR = 1.4 * GAP; // vertical clearance two accidentals need

// Lay a chord out. Returns the stem direction, each member's vertical position
// and horizontal displacement, and each accidental's column.
function chordLayout(members, clef, topY, value) {
  const g = noteHeadGeom(value);
  // Sort LOW pitch first. Lower pitch = larger y (further down the canvas).
  const rows = members
    .map((m) => ({ m, y: noteY(spellingMidi(m.midi, m.accidental), clef, topY) }))
    .sort((a, b) => b.y - a.y);

  const midLineY = topY + 2 * GAP;
  const lowestY = rows[0].y;
  const highestY = rows[rows.length - 1].y;
  // Rule 1: the note furthest from the middle line chooses the direction.
  const stemUp = Math.abs(lowestY - midLineY) >= Math.abs(highestY - midLineY);

  // Rule 2: walk outward from the stem-attached end and displace seconds.
  // A note is displaced only if its neighbour was NOT — otherwise a cluster of
  // three steps would zig-zag instead of alternating correctly.
  const order = stemUp ? rows : rows.slice().reverse();
  let prevDisplaced = false;
  let prevY = null;
  order.forEach((r) => {
    const isSecond = prevY !== null && Math.abs(r.y - prevY) <= HALF + 0.01;
    if (isSecond && !prevDisplaced) {
      r.dx = stemUp ? (2 * g.rx - 1.6) : (-2 * g.rx + 1.6);
      prevDisplaced = true;
    } else {
      r.dx = 0;
      prevDisplaced = false;
    }
    prevY = r.y;
  });

  // Rule 3: accidental columns, highest note first (nearest the chord).
  const accRows = rows.filter((r) => r.m.accidental && !r.m.hideAcc).sort((a, b) => a.y - b.y);
  const columns = [];   // columns[i] = array of y already placed in that column
  accRows.forEach((r) => {
    let col = 0;
    while (columns[col] && columns[col].some((y) => Math.abs(y - r.y) < CHORD_ACC_CLEAR)) col += 1;
    if (!columns[col]) columns[col] = [];
    columns[col].push(r.y);
    r.accCol = col;
  });

  return { rows, stemUp, geom: g, lowestY, highestY };
}

// Draw a complete chord at x = cx.
function chordHead(members, clef, topY, cx, state, value) {
  const { rows, stemUp, geom } = chordLayout(members, clef, topY, value);
  let out = '';

  rows.forEach((r) => {
    const x = cx + r.dx;
    const y = r.y;
    const sm = spellingMidi(r.m.midi, r.m.accidental);
    out += ledgersFor(sm, clef, topY, x);
    if (r.m.accidental && !r.m.hideAcc) {
      // Columns step further left as they stack; column 0 sits where a single
      // note's accidental would.
      const ax = cx - geom.rx - ACC_DX - (r.accCol || 0) * CHORD_ACC_COL;
      const gl = ACCIDENTAL_GLYPH[r.m.accidental];
      if (gl) out += `<text class="km-staff__acc" x="${ax.toFixed(1)}" y="${(y + 6).toFixed(1)}" text-anchor="middle">${gl}</text>`;
    }
    const cls = 'km-staff__note' + (geom.open ? ' km-staff__note--open' : '') + stateClass(r.m.state === undefined ? state : r.m.state);
    out += `<ellipse class="${cls}" cx="${x.toFixed(2)}" cy="${y}" rx="${geom.rx.toFixed(2)}" ry="${geom.ry.toFixed(2)}" transform="rotate(${geom.rot} ${x.toFixed(2)} ${y})"/>`;
    if (DOTTED_VALUES.has(value)) {
      const k = Math.round((topY + 4 * GAP - y) / HALF);
      const dotY = (k % 2 === 0) ? (y - HALF) : y;
      out += `<circle class="km-staff__dot" cx="${(x + geom.rx + 7).toFixed(1)}" cy="${dotY.toFixed(1)}" r="3.1"/>`;
    }
    if (Number.isFinite(r.m.finger)) {
      // Fingering sits outside the chord on the side away from the stem, so it
      // never collides with the stem or with another member's number.
      const fy = stemUp ? (y + geom.ry + 16) : (y - geom.ry - 10);
      out += `<text class="km-staff__finger" x="${(x - geom.rx - 12).toFixed(1)}" y="${fy.toFixed(1)}" text-anchor="middle">${r.m.finger}</text>`;
    }
  });

  // Rule 1: ONE stem, spanning the whole chord and extending past its far end.
  if (geom.stem) {
    const sx = stemUp ? (cx + geom.rx - 1.6) : (cx - geom.rx + 1.6);
    const from = stemUp ? rows[0].y : rows[rows.length - 1].y;              // attached end
    const to = stemUp ? (rows[rows.length - 1].y - STEM) : (rows[0].y + STEM);
    out += `<line class="km-staff__stem" x1="${sx.toFixed(2)}" y1="${from}" x2="${sx.toFixed(2)}" y2="${to.toFixed(2)}"/>`;
    if (FLAGGED_VALUES.has(value)) out += quaverFlag(sx, to, stemUp);
  }
  return out;
}

// Vertical extent of a chord, for the auto-fit viewBox.
function chordBounds(members, clef, topY, value, hasFinger) {
  const { rows, stemUp, geom } = chordLayout(members, clef, topY, value);
  const lowY = rows[0].y;
  const highY = rows[rows.length - 1].y;
  let top = highY - geom.ry - 4;
  let bot = lowY + geom.ry + 4;
  if (geom.stem) {
    const extra = FLAGGED_VALUES.has(value) ? 12 : 4;
    if (stemUp) top = Math.min(top, highY - STEM - extra);
    else bot = Math.max(bot, lowY + STEM + extra);
  }
  if (hasFinger) {
    if (stemUp) bot = Math.max(bot, lowY + geom.ry + 20);
    else top = Math.min(top, highY - geom.ry - 16);
  }
  return [top, bot];
}

// ---------------------------------------------------------------------------
// rc2-217: ARTICULATION, SLURS, HAIRPINS AND PEDAL — the marks that turn
// correct notes into music. Key Level 6 is about HOW a note is played rather
// than WHICH note, and none of that can be taught without the signs for it.
//
// All original geometry (small SVG shapes and paths), consistent with the rest
// of this module: no imported glyph art.

// Per-note articulation. Placed on the side of the note-head AWAY from the
// stem, which is the engraving convention and also keeps it clear of beams.
function articulationMark(kind, cx, y, geom, stemUp) {
  const away = stemUp ? 1 : -1;                 // +1 = below the head
  const dy = away * (geom.ry + 11);
  const ay = y + dy;
  if (kind === 'staccato') {
    return `<circle class="km-staff__artic" cx="${cx.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.8"/>`;
  }
  if (kind === 'tenuto') {
    return `<line class="km-staff__artic-line" x1="${(cx - 7).toFixed(1)}" y1="${ay.toFixed(1)}" x2="${(cx + 7).toFixed(1)}" y2="${ay.toFixed(1)}"/>`;
  }
  if (kind === 'accent') {
    // A horizontal wedge, opening towards the note.
    const t = ay - 5, b = ay + 5;
    return `<path class="km-staff__artic-line" fill="none" d="M ${(cx - 8).toFixed(1)} ${t.toFixed(1)} L ${(cx + 8).toFixed(1)} ${ay.toFixed(1)} L ${(cx - 8).toFixed(1)} ${b.toFixed(1)}"/>`;
  }
  return '';
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
function restGlyph(type, cx, topY) {
  const g = REST_GLYPH[type] || REST_GLYPH.quarter;
  const y = topY + 2 * GAP + 7;
  return `<text class="km-staff__rest" x="${cx}" y="${y}" text-anchor="middle">${g}</text>`;
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
// rc2-213: BEAMS. opts.beams is a list of [startIndex, endIndex] pairs (1-based,
// inclusive — the same convention as opts.bars and opts.marks) naming runs of
// quavers to join with a beam rather than flag individually. Real engraving
// beams quavers within a beat, so a course piece reads far more like true sheet
// music with these than without.
function resolveBeams(beams, seq, clefAt, topAt) {
  const map = new Map();
  const groups = [];
  if (!Array.isArray(beams)) return { map, groups };
  beams.forEach((b, gi) => {
    if (!Array.isArray(b) || b.length < 2) return;
    const a = Math.round(b[0]) - 1;
    const z = Math.round(b[1]) - 1;
    if (!Number.isInteger(a) || !Number.isInteger(z)) return;
    if (a < 0 || z >= seq.length || z <= a) return;
    // Every note in the run must be a pitched, flaggable note. A rest or a minim
    // inside a beam group is a data error, so the group is skipped whole rather
    // than drawn wrongly.
    let ok = true;
    for (let i = a; i <= z; i += 1) {
      const it = seq[i];
      // rc2-216: a chord (or a blank slot) inside a beam group is refused too.
      // Beamed chords are a legitimate engraving form but are not needed by the
      // curriculum yet, and drawing one wrongly is worse than flagging it.
      if (!it || it.rest || it.chord || it.blank || !FLAGGED_VALUES.has(it.value)) { ok = false; break; }
    }
    if (!ok) return;
    // Shared stem direction from the group's average head height, so a beam
    // never has stems fighting each other.
    let sum = 0;
    // rc2-215: a beam may not span a system break — the notes must share a row.
    let sameRow = true;
    for (let i = a; i <= z; i += 1) if (topAt(i) !== topAt(a)) { sameRow = false; break; }
    if (!sameRow) return;
    for (let i = a; i <= z; i += 1) sum += noteY(spellingMidi(seq[i].midi, seq[i].accidental), clefAt(i), topAt(i));
    const midLineY = topAt(a) + 2 * GAP;
    const dir = ((sum / (z - a + 1)) >= midLineY) ? 'up' : 'down';
    for (let i = a; i <= z; i += 1) map.set(i, dir);
    groups.push({ a, z, dir });
  });
  return { map, groups };
}

function beamLines(groups, seq, xs, clefAt, topAt) {
  let out = '';
  groups.forEach(({ a, z, dir }) => {
    const up = dir === 'up';
    // The beam sits at the far end of the stems: use the most extreme stem end
    // in the group so it clears every note-head under it.
    let edge = up ? Infinity : -Infinity;
    for (let i = a; i <= z; i += 1) {
      const y = noteY(spellingMidi(seq[i].midi, seq[i].accidental), clefAt(i), topAt(i));
      const end = up ? (y - STEM) : (y + STEM);
      edge = up ? Math.min(edge, end) : Math.max(edge, end);
    }
    const ga = noteHeadGeom(seq[a].value);
    const gz = noteHeadGeom(seq[z].value);
    const x1 = up ? (xs[a] + ga.rx - 1.6) : (xs[a] - ga.rx + 1.6);
    const x2 = up ? (xs[z] + gz.rx - 1.6) : (xs[z] - gz.rx + 1.6);
    // Re-draw each stem to reach the shared beam edge, then lay the beam across.
    for (let i = a; i <= z; i += 1) {
      const y = noteY(spellingMidi(seq[i].midi, seq[i].accidental), clefAt(i), topAt(i));
      const gi = noteHeadGeom(seq[i].value);
      const sx = up ? (xs[i] + gi.rx - 1.6) : (xs[i] - gi.rx + 1.6);
      out += `<line class="km-staff__stem" x1="${sx.toFixed(2)}" y1="${y}" x2="${sx.toFixed(2)}" y2="${edge.toFixed(2)}"/>`;
    }
    out += `<line class="km-staff__beam" x1="${x1.toFixed(2)}" y1="${edge.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${edge.toFixed(2)}"/>`;
  });
  return out;
}

// ---------------------------------------------------------------------------
// rc2-215: MULTI-SYSTEM (WRAPPING) NOTATION.
// KL3 reads passages longer than a single line can hold legibly. opts.systems
// is a list of 1-based note indices at which a NEW LINE begins — the same
// index convention as opts.bars/marks/beams. Absent (the default) means one
// system, and the renderer behaves exactly as before.
//
// Returns inclusive 0-based [start, end] ranges, one per system.
const SYSTEM_DY = 8 * GAP;   // vertical distance between successive systems
function resolveSystems(systemsOpt, n) {
  if (n <= 0) return [[0, -1]];
  if (!Array.isArray(systemsOpt) || !systemsOpt.length) return [[0, n - 1]];
  const cuts = systemsOpt
    .map((x) => Math.round(x) - 1)
    .filter((k) => Number.isInteger(k) && k > 0 && k < n)
    .sort((a, b) => a - b)
    .filter((k, i, arr) => i === 0 || k !== arr[i - 1]);   // de-duplicate
  if (!cuts.length) return [[0, n - 1]];
  const out = [];
  let start = 0;
  cuts.forEach((c) => { out.push([start, c - 1]); start = c; });
  out.push([start, n - 1]);
  return out.filter(([a, z]) => a <= z);
}

/**
 * Build a staff diagram.
 * @param {object} opts
 *   clef       'treble' | 'bass' | 'grand'   (default 'treble')
 *   highlight  'lines' | 'spaces' | null      (default null)
 *   notes      Array of MIDI numbers, or { midi, state, finger, value, accidental }
 *              objects, or { rest: 'quarter'|'half'|'whole'|'eighth' } entries.
 *              value: 'whole' | 'half' | 'dotted-half' | 'quarter' |
 *                     'dotted-quarter' | 'eighth' | 'dotted-eighth'
 *                     (rc2-212 added the dotted minim; rc2-213 added the quaver,
 *                      the dotted crotchet and the dotted quaver).
 *              accidental: rc2-213, 'sharp' | 'flat' | 'natural' — drawn to the
 *                     left of the head. Unknown values are ignored.
 *   middleC    boolean   mark Middle C on the grand staff   (default false)
 *   timeSig    '4/4' | '3/4' | [n,d] | false  (optional; see resolveTimeSig)
 *   keySig     rc2-213, optional: a signed integer (+n sharps / −n flats) or a
 *              key name ('G', 'F', 'Bb', 'Em', …). Drawn after the clef; the
 *              note area shifts right to clear it. Default 0 (no key signature),
 *              so every existing card is byte-identical.
 *   beams      rc2-213, optional: [[start, end], …] 1-based inclusive index
 *              pairs naming runs of quavers to beam together instead of
 *              flagging. A group containing a rest or a non-quaver is ignored.
 *              rc2-216: an entry may instead be a CHORD —
 *                { chord: [60, 64, 67], value: 'half', hand: 'L'|'R' }
 *              whose members are bare MIDI numbers or objects carrying their
 *              own { midi, accidental, finger, letter, state }. The chord
 *              shares one stem, displaces seconds to the far side of it, and
 *              stacks colliding accidentals into columns. A one-member chord
 *              degrades to an ordinary note; an empty one keeps its slot so
 *              bars/marks/beams indices never shift.
 *   hand       rc2-216, optional per note or chord: 'L' | 'R'. On a GRAND
 *              staff this decides which staff the entry is drawn on,
 *              overriding the pitch guess — necessary as soon as a left hand
 *              plays above middle C.
 *   systems    rc2-215, optional: [n, …] 1-based note indices at which a NEW
 *              LINE (system) begins, for passages too long to read on one
 *              line. Out-of-range, zero and duplicate entries are ignored;
 *              order does not matter. Absent = one system, byte-identical to
 *              earlier builds. The time signature is stated on the first
 *              system only; the key signature repeats on every system, as in
 *              real engraving. A beam may not span a system break and is
 *              refused if it tries.
 *              rc2-217: `artic` per note — 'staccato' | 'accent' | 'tenuto'.
 *              rc2-218: `orn` per note — 'trill' | 'mordent' | 'mordent-lower'
 *              | 'turn', drawn above the staff.
 *   slurs      rc2-217, optional: [[start, end], …] phrase arcs.
 *   hairpins   rc2-217, optional: [{ from, to, dir: 'cresc'|'dim' }].
 *   pedal      rc2-217, optional: [{ from, to }] sustain-pedal lines.
 *   analysis   rc2-216, optional: harmonic labels (Roman numerals) on their
 *              own line below the dynamics, e.g. [{ at: 1, text: 'I' }].
 *              Digits are allowed so figures such as V7 can be written.
 *   marks      rc2-212, optional: dynamics under the staff, e.g.
 *              [{ at: 1, text: 'p' }] — `at` is the 1-based note index (same
 *              convention as opts.bars). Invalid entries are silently ignored;
 *              text is whitelisted (letters + dot, max 8 chars). Additive —
 *              absent by default, so existing cards render byte-identically.
 * @returns {HTMLDivElement} <div class="km-staff km-staff--{clef}">
 */
// ---------------------------------------------------------------------------
// rc2-216: TWO-VOICE, TIME-ALIGNED NOTATION.
//
// The flat opts.notes path gives every entry an equal share of the width, which
// is correct for a single line but wrong the moment two hands play different
// rhythms: a crotchet in the left hand must line up with the FIRST of the two
// quavers above it, not with a slot of its own. Without that alignment the
// learner cannot see which notes coincide — and seeing that is the entire
// subject of Key Level 4.
//
// So a card may instead supply:
//   voices: { treble: [ … ], bass: [ … ] }
// and each entry is placed by its cumulative position in MUSICAL TIME. Bar
// lines are then derived from the time signature automatically, which also
// removes the hand-counted `bars` index — a repeated source of real errors.
//
// Entirely separate from the paths above: a card without `voices` never enters
// this code, so all earlier cards render byte-identically.

const BEATS = {
  whole: 4, half: 2, 'dotted-half': 3, quarter: 1,
  'dotted-quarter': 1.5, eighth: 0.5, 'dotted-eighth': 0.75,
};
function entryBeats(it) {
  const v = it.rest ? it.rest : (it.value || 'quarter');
  return (BEATS[v] !== undefined) ? BEATS[v] : 1;
}

const GRAND_H = 4 * GAP + 3 * GAP + 8 + 4 * GAP;   // treble top to bass bottom
const VOICED_SYSTEM_DY = GRAND_H + 3 * GAP;        // gap between stacked systems

function buildVoicedStaff(opts, ctx) {
  const { highlight, ksig, ksShift, tsig } = ctx;

  const voices = [
    { key: 'treble', clefName: 'treble', seq: normaliseSeq(Array.isArray(opts.voices.treble) ? opts.voices.treble : [], ksig) },
    { key: 'bass', clefName: 'bass', seq: normaliseSeq(Array.isArray(opts.voices.bass) ? opts.voices.bass : [], ksig) },
  ];

  // Cumulative onset time for every entry, and the total span.
  let totalBeats = 0;
  voices.forEach((v) => {
    let t = 0;
    v.times = v.seq.map((it) => { const at = t; t += entryBeats(it); return at; });
    v.endsAt = t;
    totalBeats = Math.max(totalBeats, t);
  });

  const beatsPerBar = tsig ? (tsig[0] * (4 / tsig[1])) : 0;

  // rc2-216: system wrapping, measured in BARS. Real piano music always wraps,
  // and cramming eight bars of two-part writing onto one line would make the
  // quavers overlap — unreadable, and useless to teach from.
  const bpsRaw = Math.round(Number(opts.barsPerSystem));
  const barsPerSystem = (Number.isFinite(bpsRaw) && bpsRaw > 0) ? bpsRaw : 0;
  const spanBeats = (barsPerSystem > 0 && beatsPerBar > 0)
    ? barsPerSystem * beatsPerBar : totalBeats;
  const systemCount = Math.max(1, Math.ceil((totalBeats - 0.001) / spanBeats));

  const xL = NOTE_L + ksShift;
  const xR = NOTE_R - 14;
  // Time -> x WITHIN a system. Each system covers spanBeats of music, so the
  // spacing stays constant from line to line, as engraving expects.
  const xAt = (t, si) => {
    const local = t - si * spanBeats;
    return (spanBeats > 0) ? (xL + (local / spanBeats) * (xR - xL)) : ((xL + xR) / 2);
  };
  const systemOf = (t) => Math.min(systemCount - 1, Math.floor((t + 0.001) / spanBeats));

  let body = '';
  const ys = [];
  const mark = (y) => { if (Number.isFinite(y)) ys.push(y); };

  const trebleTopOf = (si) => 34 + si * VOICED_SYSTEM_DY;
  const bassTopOf = (si) => trebleTopOf(si) + 4 * GAP + 3 * GAP + 8;

  for (let si = 0; si < systemCount; si += 1) {
    const tt = trebleTopOf(si), bt = bassTopOf(si);
    body += staffLines(tt, highlight) + clefMark('treble', tt);
    body += staffLines(bt, highlight) + clefMark('bass', bt);
    if (ksig) body += keySigMark(ksig, 'treble', tt) + keySigMark(ksig, 'bass', bt);
    // Engraving: the time signature is stated once, on the first system only.
    if (tsig && si === 0) body += timeSigMark(tsig[0], tsig[1], tt, TS_X + ksShift) + timeSigMark(tsig[0], tsig[1], bt, TS_X + ksShift);
    body += `<line class="km-staff__brace" x1="${LEFT}" y1="${tt}" x2="${LEFT}" y2="${bt + 4 * GAP}"/>`;
    body += `<line class="km-staff__endbar" x1="${RIGHT}" y1="${tt}" x2="${RIGHT}" y2="${bt + 4 * GAP}"/>`;
    mark(tt - 14);
    mark(bt + 5 * GAP + 18);
  }

  // Bar lines, derived from the metre rather than hand-counted indices — which
  // also removes a whole class of miscounted-bar errors at source.
  if (beatsPerBar > 0) {
    for (let t = beatsPerBar; t < totalBeats - 0.001; t += beatsPerBar) {
      const si = systemOf(t);
      // A bar boundary that falls exactly on a system break is already drawn as
      // that system's end barline.
      if (Math.abs(t - si * spanBeats) < 0.001) continue;
      const bx = Math.round(xAt(t, si) - 12);
      const tt = trebleTopOf(si), bt = bassTopOf(si);
      body += `<line class="km-staff__endbar" x1="${bx}" y1="${tt}" x2="${bx}" y2="${tt + 4 * GAP}"/>`;
      body += `<line class="km-staff__endbar" x1="${bx}" y1="${bt}" x2="${bx}" y2="${bt + 4 * GAP}"/>`;
    }
  }

  // Notes, chords and rests, each at its own point in musical time.
  voices.forEach((v) => {
    const beamSpec = (opts.beams && Array.isArray(opts.beams[v.key])) ? opts.beams[v.key] : null;
    const sysOf = v.times.map((t) => systemOf(t));
    const topFor = (i) => ((v.key === 'treble') ? trebleTopOf(sysOf[i]) : bassTopOf(sysOf[i]));
    const clefAt = () => v.clefName;
    const topAt = (i) => topFor(i);
    const { map: beamDir, groups } = resolveBeams(beamSpec, v.seq, clefAt, topAt);
    const xs = v.times.map((t, i) => xAt(t, sysOf[i]));
    v.seq.forEach((it, i) => {
      const cx = xs[i];
      const top = topFor(i);
      if (it.blank) return;
      if (it.rest) { body += restGlyph(it.rest, cx, top); mark(top + REST_TOP_MARK); return; }
      if (it.chord) {
        body += chordHead(it.chord, v.clefName, top, cx, it.state, it.value);
        const hasF = it.chord.some((m) => Number.isFinite(m.finger));
        const [a, b] = chordBounds(it.chord, v.clefName, top, it.value, hasF); mark(a); mark(b);
        return;
      }
      const dir = beamDir.get(i);
      body += noteHead(it.midi, v.clefName, top, cx, it.state, it.finger, it.value, it.letter, it.accidental, dir, !!dir, it.hideAcc, it.artic, it.orn);
      const [a, b] = noteBounds(it.midi, v.clefName, top, it.value, Number.isFinite(it.finger), !!it.letter, dir, it.accidental, it.orn);
      mark(a); mark(b);
    });
    if (groups.length) body += beamLines(groups, v.seq, xs, clefAt, topAt);
  });

  // Dynamics, positioned by BEAT rather than by note index.
  if (Array.isArray(opts.marks)) {
    opts.marks.forEach((m) => {
      const t = m && Number(m.beat);
      if (!Number.isFinite(t) || t < 0 || t > totalBeats) return;
      if (typeof m.text !== 'string' || !/^[A-Za-z.]{1,8}$/.test(m.text)) return;
      const si = systemOf(t);
      const my = bassTopOf(si) + 5 * GAP + 26;
      body += `<text class="km-staff__mark" x="${xAt(t, si).toFixed(1)}" y="${my}" text-anchor="middle">${m.text}</text>`;
      mark(my + 12);
    });
  }

  const PAD = 8;
  const yTop = Math.floor(Math.min(0, ...ys) - PAD);
  const yBot = Math.ceil(Math.max(...ys) + PAD);
  const vbH = Math.max(1, yBot - yTop);
  const svg = `<svg class="km-staff__svg" viewBox="0 ${yTop} ${W} ${vbH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Grand staff">${body}</svg>`;
  const wrap = document.createElement('div');
  // A multi-system score is TALL. The ordinary max-height would scale it down
  // to fit, shrinking the notation until it is unreadable — so a score gets its
  // own class and keeps full width, letting the page scroll instead.
  wrap.className = 'km-staff km-staff--grand' + ((systemCount > 1) ? ' km-staff--score' : '');
  wrap.innerHTML = svg;
  scheduleHandDemotion();
  return wrap;
}

export function buildStaff(opts = {}) {
  injectStaffStyles();
  const clef = (opts.clef === 'bass' || opts.clef === 'grand') ? opts.clef : 'treble';
  const highlight = (opts.highlight === 'lines' || opts.highlight === 'spaces') ? opts.highlight : null;
  // rc2-213: key signature. ksShift moves the time signature and the whole note
  // area right so nothing collides with the drawn accidentals.
  // rc2-216: it is resolved FIRST because note spelling depends on it.
  const ksig = resolveKeySig(opts.keySig);
  const seq = normaliseSeq(Array.isArray(opts.notes) ? opts.notes : [], ksig);
  const middleC = !!opts.middleC;
  const tsig = resolveTimeSig(opts.timeSig, seq);
  const ksShift = keySigWidth(ksig);
  const tsX = TS_X + ksShift;

  // rc2-216: a card supplying `voices` wants TIME-ALIGNED two-stave notation
  // and takes a wholly separate path, so nothing below is affected.
  if (opts.voices && (Array.isArray(opts.voices.treble) || Array.isArray(opts.voices.bass))) {
    return buildVoicedStaff(opts, { highlight, ksig, ksShift, tsig });
  }

  let body = '';
  const ys = [];
  const mark = (y) => { if (Number.isFinite(y)) ys.push(y); };

  if (clef === 'grand') {
    const trebleTop = 34;
    const bassTop = trebleTop + 4 * GAP + 3 * GAP + 8;
    body += staffLines(trebleTop, highlight) + clefMark('treble', trebleTop);
    body += staffLines(bassTop, highlight) + clefMark('bass', bassTop);
    if (ksig) { body += keySigMark(ksig, 'treble', trebleTop) + keySigMark(ksig, 'bass', bassTop); }
    if (tsig) { body += timeSigMark(tsig[0], tsig[1], trebleTop, tsX) + timeSigMark(tsig[0], tsig[1], bassTop, tsX); }
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
    const gxs = noteXs(seq.length, ksShift);
    // rc2-213: on the grand staff a note's clef/top depend on its own pitch.
    // rc2-216: an explicit `hand` OVERRIDES that guess. A left hand playing
    // above middle C is ordinary from KL4 onward, and guessing would put it on
    // the wrong staff — which would teach the learner to read it wrongly.
    const gStaffAt = (i) => {
      const it = seq[i];
      if (it.hand === 'L') return 'bass';
      if (it.hand === 'R') return 'treble';
      const pitch = it.chord ? Math.max(...it.chord.map((m) => m.midi)) : it.midi;
      return (pitch >= 60) ? 'treble' : 'bass';
    };
    const gClefAt = (i) => gStaffAt(i);
    const gTopAt = (i) => ((gStaffAt(i) === 'treble') ? trebleTop : bassTop);
    const { map: gBeamDir, groups: gBeamGroups } = resolveBeams(opts.beams, seq, gClefAt, gTopAt);
    seq.forEach((it, i) => {
      const cx = gxs[i];
      if (it.blank) return;
      if (it.rest) { body += restGlyph(it.rest, cx, trebleTop); mark(trebleTop + REST_TOP_MARK); return; }
      const useClef = gClefAt(i);
      const top = gTopAt(i);
      if (it.chord) {
        body += chordHead(it.chord, useClef, top, cx, it.state, it.value);
        const hasF = it.chord.some((m) => Number.isFinite(m.finger));
        const [t, b] = chordBounds(it.chord, useClef, top, it.value, hasF); mark(t); mark(b);
        return;
      }
      const dir = gBeamDir.get(i);
      body += noteHead(it.midi, useClef, top, cx, it.state, it.finger, it.value, it.letter, it.accidental, dir, !!dir, it.hideAcc, it.artic, it.orn);
      const [t, b] = noteBounds(it.midi, useClef, top, it.value, Number.isFinite(it.finger), !!it.letter, dir, it.accidental, it.orn); mark(t); mark(b);
    });
    if (gBeamGroups.length) body += beamLines(gBeamGroups, seq, gxs, gClefAt, gTopAt);
    // rc2-212: optional dynamics marks — grand staff places them below the bass
    // staff. Same validation and viewBox tracking as the single-staff branch.
    if (Array.isArray(opts.marks) && opts.marks.length) {
      const my = bassTop + 5 * GAP + 26;
      opts.marks.forEach((m) => {
        const k = m && Math.round(m.at) - 1;
        const ok = Number.isInteger(k) && k >= 0 && k < gxs.length
          && typeof m.text === 'string' && /^[A-Za-z.]{1,8}$/.test(m.text);
        if (!ok) return;
        body += `<text class="km-staff__mark" x="${gxs[k]}" y="${my}" text-anchor="middle">${m.text}</text>`;
        mark(my + 12);
      });
    }
  } else {
    // rc2-215: one or more systems (lines). With no opts.systems this loop runs
    // exactly once with topY = 34, producing byte-identical output to rc2-214.
    const systems = resolveSystems(opts.systems, seq.length);
    const xs = new Array(seq.length);
    const tops = new Array(seq.length);

    systems.forEach(([a, z], si) => {
      const topY = 34 + si * SYSTEM_DY;
      body += staffLines(topY, highlight) + clefMark(clef, topY);
      if (ksig) { body += keySigMark(ksig, clef, topY); }
      // Engraving convention: the time signature is stated once, on the first
      // system only. A reader carries it; restating it would imply a change.
      if (tsig && si === 0) { body += timeSigMark(tsig[0], tsig[1], topY, tsX); }
      mark(topY - 14);
      mark(topY + 5 * GAP + 18);
      const rowXs = noteXs(z - a + 1, ksShift);
      for (let i = a; i <= z; i += 1) { xs[i] = rowXs[i - a]; tops[i] = topY; }
    });

    const sClefAt = () => clef;
    const sTopAt = (i) => tops[i];
    const { map: sBeamDir, groups: sBeamGroups } = resolveBeams(opts.beams, seq, sClefAt, sTopAt);
    seq.forEach((it, i) => {
      const topY = tops[i];
      if (it.blank) return;
      if (it.rest) { body += restGlyph(it.rest, xs[i], topY); mark(topY + REST_TOP_MARK); return; }
      if (it.chord) {
        body += chordHead(it.chord, clef, topY, xs[i], it.state, it.value);
        const hasF = it.chord.some((m) => Number.isFinite(m.finger));
        const [t, b] = chordBounds(it.chord, clef, topY, it.value, hasF); mark(t); mark(b);
        return;
      }
      const dir = sBeamDir.get(i);
      body += noteHead(it.midi, clef, topY, xs[i], it.state, it.finger, it.value, it.letter, it.accidental, dir, !!dir, it.hideAcc, it.artic, it.orn);
      const [t, b] = noteBounds(it.midi, clef, topY, it.value, Number.isFinite(it.finger), !!it.letter, dir, it.accidental, it.orn); mark(t); mark(b);
    });
    if (sBeamGroups.length) body += beamLines(sBeamGroups, seq, xs, sClefAt, sTopAt);
    // rc2-178: proper manuscript barlines. opts.bars is a list of 1-based note
    // indices after which an internal barline falls; an end barline closes the
    // line. Additive — only renders when a step requests bars, so existing
    // diagram-style staffs are untouched. Reuses the endbar stroke.
    // rc2-215: barlines are drawn per system, and each system is closed at its
    // right edge, so a wrapped passage reads like real manuscript.
    const bars = Array.isArray(opts.bars) ? opts.bars : [];
    if (bars.length) {
      bars.forEach((b) => {
        const k = Math.round(b) - 1;
        // A barline is only drawn between two notes on the SAME system; a bar
        // that ends a system is closed by that system's end barline instead.
        if (k >= 0 && k < xs.length - 1 && tops[k] === tops[k + 1]) {
          const bx = Math.round((xs[k] + xs[k + 1]) / 2);
          body += `<line class="km-staff__endbar" x1="${bx}" y1="${tops[k]}" x2="${bx}" y2="${tops[k] + 4 * GAP}"/>`;
        }
      });
      systems.forEach(([, z], si) => {
        const topY = 34 + si * SYSTEM_DY;
        if (z >= 0) body += `<line class="km-staff__endbar" x1="${RIGHT}" y1="${topY}" x2="${RIGHT}" y2="${topY + 4 * GAP}"/>`;
      });
    }
    // rc2-212: optional dynamics marks under the staff (see JSDoc). Placed well
    // below note letters/ledger territory; every drawn mark extends the viewBox
    // via mark() so nothing is ever clipped. Invalid entries fail harmlessly.
    if (Array.isArray(opts.marks) && opts.marks.length) {
      opts.marks.forEach((m) => {
        const k = m && Math.round(m.at) - 1;
        const ok = Number.isInteger(k) && k >= 0 && k < xs.length
          && typeof m.text === 'string' && /^[A-Za-z.]{1,8}$/.test(m.text);
        if (!ok) return;
        const my = tops[k] + 5 * GAP + 26;
        body += `<text class="km-staff__mark" x="${xs[k]}" y="${my}" text-anchor="middle">${m.text}</text>`;
        mark(my + 12);
      });
    }
    // rc2-217: SLURS / phrase marks. opts.slurs is [[start, end], …] over
    // 1-based note indices. The arc is drawn on the side away from the stems,
    // and a slur may not span a system break (the halves would not join).
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
        const above = ((ya + yz) / 2) >= midLineY;   // stems up -> slur below? no:
        // Engraving: the slur goes on the side away from the stems. Low notes
        // stem up, so their slur sits BELOW; high notes stem down, slur above.
        const arcAbove = !above;
        const off = 13;
        const y1 = arcAbove ? (ya - off) : (ya + off);
        const y2 = arcAbove ? (yz - off) : (yz + off);
        body += slurPath(xs[a], y1, xs[z], y2, arcAbove);
        mark(arcAbove ? Math.min(y1, y2) - 30 : Math.max(y1, y2) + 30);
      });
    }
    // rc2-217: HAIRPINS. [{ from, to, dir: 'cresc' | 'dim' }] over note indices.
    if (Array.isArray(opts.hairpins)) {
      opts.hairpins.forEach((hp) => {
        const a = Math.round(hp && hp.from) - 1, z = Math.round(hp && hp.to) - 1;
        if (!(a >= 0 && z < xs.length && z > a)) return;
        if (tops[a] !== tops[z]) return;
        const hy = tops[a] + 5 * GAP + 30;
        body += hairpinPath(xs[a], xs[z], hy, hp.dir !== 'dim');
        mark(hy + 14);
      });
    }
    // rc2-217: PEDAL lines. [{ from, to }] over note indices.
    if (Array.isArray(opts.pedal)) {
      opts.pedal.forEach((pd) => {
        const a = Math.round(pd && pd.from) - 1, z = Math.round(pd && pd.to) - 1;
        if (!(a >= 0 && z < xs.length && z > a)) return;
        if (tops[a] !== tops[z]) return;
        const py = tops[a] + 5 * GAP + 62;
        body += pedalMark(xs[a], xs[z], py);
        mark(py + 12);
      });
    }
    // rc2-216: HARMONIC ANALYSIS labels (Roman numerals). Kept separate from
    // dynamics: they mean something different, are set upright rather than
    // italic, and sit on their own line below. The whitelist allows digits so
    // that figures such as V7 and I6 can be written.
    if (Array.isArray(opts.analysis) && opts.analysis.length) {
      opts.analysis.forEach((m) => {
        const k = m && Math.round(m.at) - 1;
        const ok = Number.isInteger(k) && k >= 0 && k < xs.length
          && typeof m.text === 'string' && /^[A-Za-z0-9\u00B0\u2205/+-]{1,8}$/.test(m.text);
        if (!ok) return;
        const ay = tops[k] + 5 * GAP + 48;
        body += `<text class="km-staff__analysis" x="${xs[k]}" y="${ay}" text-anchor="middle">${m.text}</text>`;
        mark(ay + 12);
      });
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
/* rc2-216: a multi-system SCORE keeps its natural aspect ratio at full width.
   Capping its height would scale the whole page of music down until the
   note-heads were too small to read, which defeats the point of printing it. */
.view[data-view="learn"] .km-staff--score .km-staff__svg{max-height:none;}
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
.view[data-view="learn"] .km-staff__dot{fill:${INK};}
.view[data-view="learn"] .km-staff__acc{fill:${INK};font-family:${MUSIC_FONT};font-size:32px;}
.view[data-view="learn"] .km-staff__acc--ks{font-size:30px;}
.view[data-view="learn"] .km-staff__flag{fill:${INK};stroke:none;}
.view[data-view="learn"] .km-staff__beam{stroke:${INK};stroke-width:6.5;stroke-linecap:butt;}
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
