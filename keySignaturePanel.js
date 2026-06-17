// keySignaturePanel.js — a small, visual-only Key Signature Preview Panel for
// Scales Masterclass. It draws a miniature grand staff (treble + bass clefs) with
// ONLY the key signature — no notes, time signature, barlines (beyond the system
// line), fingering, or text. The goal is repeated visual exposure so the learner
// comes to recognise "B major = five sharps" by sight, the way it appears at the
// opening of a printed score.
//
// Fully self-contained: it does NOT touch staffView.js, the evaluator, or any
// shared notation logic. It only renders an SVG from (tonic, type).

// Engraver's order of accidentals.
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER  = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

// Circle-of-fifths value of each natural major tonic (sharps +, flats −).
const BASE_FIFTHS = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };

// Canonical engraved pitch for each accidental, per clef. These are the exact
// staff positions used in printed music (e.g. the first sharp F♯ sits on the top
// line in treble clef and the 4th line in bass clef).
const POS = {
  sharp: {
    treble: { F: 'F5', C: 'C5', G: 'G5', D: 'D5', A: 'A4', E: 'E5', B: 'B4' },
    bass:   { F: 'F3', C: 'C3', G: 'G3', D: 'D3', A: 'A2', E: 'E3', B: 'B2' },
  },
  flat: {
    treble: { B: 'B4', E: 'E5', A: 'A4', D: 'D5', G: 'G4', C: 'C5', F: 'F4' },
    bass:   { B: 'B2', E: 'E3', A: 'A2', D: 'D3', G: 'G2', C: 'C3', F: 'F3' },
  },
};

const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
function diaOf(name) {
  const m = /^([A-G])(-?\d+)$/.exec(name);
  return LETTER_INDEX[m[1]] + 7 * Number(m[2]);
}

/**
 * Resolve a (tonic, type) to its printed key signature.
 * Minor keys use the relative-major signature (the actual printed one); the extra
 * accidentals of harmonic/melodic minor are note-level, not part of the signature.
 * @returns {{ kind:'sharp'|'flat'|'none', count:number, letters:string[] }}
 */
export function keySignature(tonic, type) {
  const letter = tonic[0].toUpperCase();
  const acc = tonic.slice(1);
  const accVal = acc === '#' ? 1 : acc === 'b' ? -1 : acc === 'x' ? 2 : acc === 'bb' ? -2 : 0;
  let fifths = (BASE_FIFTHS[letter] ?? 0) + 7 * accVal;
  if (/minor/i.test(type || '')) fifths -= 3;          // relative major
  const kind = fifths === 0 ? 'none' : fifths > 0 ? 'sharp' : 'flat';
  const count = Math.min(7, Math.abs(fifths));
  const order = kind === 'flat' ? FLAT_ORDER : SHARP_ORDER;
  return { kind, count, letters: order.slice(0, count) };
}

export function createKeySignaturePanel() {
  const el = document.createElement('div');
  el.className = 'smc__kspanel';
  el.setAttribute('role', 'img');

  // Geometry (SVG user units; 1 unit ≈ 1px at base scale, CSS scales the whole SVG).
  const SP = 9;                     // staff space (line-to-line)
  const padTop = SP * 1.7, padBottom = SP * 1.7, padLeft = SP * 0.6, padRight = SP * 1.0;
  const trebleTop = padTop;
  const trebleBottom = trebleTop + 4 * SP;
  const bassTop = trebleBottom + 2 * SP;           // true grand-staff gap (C4 centred)
  const bassBottom = bassTop + 4 * SP;

  const trebleY = (d) => trebleBottom - (d - diaOf('E4')) * (SP / 2);
  const bassY   = (d) => bassBottom   - (d - diaOf('G2')) * (SP / 2);

  function update(tonic, type) {
    const sig = keySignature(tonic, type);
    el.setAttribute('aria-label',
      sig.kind === 'none' ? 'Key signature: no sharps or flats'
        : `Key signature: ${sig.count} ${sig.kind}${sig.count > 1 ? 's' : ''}`);

    const leftX = padLeft;
    const clefX = leftX + SP * 0.6;
    const clefW = SP * 2.5;
    const accStart = clefX + clefW + SP * 0.3;
    const accStep = sig.kind === 'flat' ? SP * 0.92 : SP * 1.0;
    const accEnd = accStart + sig.count * accStep;
    const rightX = Math.max(accEnd + SP * 0.5, clefX + clefW + SP * 0.8);
    const width = rightX + padRight;
    const height = bassBottom + padBottom;

    const lines = [];
    // Five lines per staff.
    for (let k = 0; k < 5; k++) {
      const ty = trebleTop + k * SP;
      const by = bassTop + k * SP;
      lines.push(`<line x1="${leftX}" y1="${ty}" x2="${rightX}" y2="${ty}"/>`);
      lines.push(`<line x1="${leftX}" y1="${by}" x2="${rightX}" y2="${by}"/>`);
    }
    // System barline joining both staves at the left.
    lines.push(`<line x1="${leftX}" y1="${trebleTop}" x2="${leftX}" y2="${bassBottom}" stroke-width="1.6"/>`);

    // Clefs (Unicode musical symbols, matching the main staff's glyph set).
    const glyphFont = "'Bravura','Noto Music',serif";
    const clefs = [
      `<text x="${clefX}" y="${trebleBottom}" font-family="${glyphFont}" font-size="${SP * 4}" fill="#14110B">&#x1D11E;</text>`,
      `<text x="${clefX}" y="${bassTop + SP * 3}" font-family="${glyphFont}" font-size="${SP * 3.1}" fill="#14110B">&#x1D122;</text>`,
    ];

    // Accidentals at their engraved positions, treble + bass, in engraver order.
    const accGlyph = sig.kind === 'flat' ? '&#x266D;' : '&#x266F;';   // ♭ / ♯
    const flatDy = sig.kind === 'flat' ? SP * 0.16 : 0;               // flat loop sits a touch lower
    const accs = [];
    sig.letters.forEach((L, i) => {
      const x = accStart + i * accStep;
      const tPitch = POS[sig.kind].treble[L];
      const bPitch = POS[sig.kind].bass[L];
      accs.push(`<text x="${x}" y="${trebleY(diaOf(tPitch)) + flatDy}" text-anchor="middle" dominant-baseline="central" font-family="${glyphFont}" font-size="${SP * 2.1}" fill="#14110B">${accGlyph}</text>`);
      accs.push(`<text x="${x}" y="${bassY(diaOf(bPitch)) + flatDy}" text-anchor="middle" dominant-baseline="central" font-family="${glyphFont}" font-size="${SP * 2.1}" fill="#14110B">${accGlyph}</text>`);
    });

    el.innerHTML =
      `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ` +
      `preserveAspectRatio="xMinYMid meet" aria-hidden="true" ` +
      `style="display:block">` +
      `<g stroke="#14110B" stroke-width="1" stroke-linecap="square">${lines.join('')}</g>` +
      clefs.join('') + accs.join('') +
      `</svg>`;
  }

  return { el, update };
}
