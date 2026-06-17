// fingeringTests.mjs — regression guard for the Sight-Reading fingering engine.
//
// Why this shape: sightReading.js imports DOM-bound modules (staffView, etc.),
// so it can't be `import`ed under Node. Instead this test READS the source and
// extracts the real `assignFingering` function by brace-matching, then runs it.
// That means the test always exercises the actual shipped algorithm — it cannot
// silently drift from the code the way a hand-copied duplicate would.
//
// Run headlessly:  node fingeringTests.mjs
//
// Guards the musicality rules:
//  • no nearby lower note gets finger 5 unless a genuine hand shift is required;
//  • a phrase within a fifth stays in one five-finger position;
//  • RH: position-low -> 1, position-high -> 5;  LH: position-low -> 5, high -> 1;
//  • shifts are only opened when the music truly exceeds a fifth.

import { readFileSync } from 'node:fs';

// --- Extract the real assignFingering from sightReading.js -------------------
const src = readFileSync(new URL('./sightReading.js', import.meta.url), 'utf8');
const sig = 'function assignFingering(dia, hands, opts = {}) {';
const start = src.indexOf(sig);
if (start < 0) { console.error('FAIL: assignFingering not found in sightReading.js'); process.exit(1); }
let depth = 0, end = -1;
const bodyOpen = start + sig.length - 1; // the '{' opening the body = last char of sig
for (let i = bodyOpen; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const fnText = src.slice(start, end);
// eslint-disable-next-line no-eval
const assignFingering = eval('(' + fnText + ')');

// --- Mirror handModel's dia / hands derivation (stable, simple) --------------
const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
function parseName(name) {
  const m = /^([A-G])(#|b)?(-?\d+)$/.exec(String(name).trim());
  return m ? { letter: m[1], octave: parseInt(m[3], 10) } : { letter: 'C', octave: 4 };
}
function fingerOf(names, clef = 'treble', fixed = false) {
  const parsed = names.map(parseName);
  const dia = parsed.map((p) => LETTER_INDEX[p.letter] + 7 * p.octave);
  const hands = dia.map(() => (clef === 'bass' ? 'L' : 'R'));
  return assignFingering(dia, hands, { fixedPosition: fixed });
}

// Frame-anchored fixed-position mode (Stage 1). Mirrors handModel: the anchor is
// the LESSON FRAME low note, and fingering is hidden when the frame is wider than
// a fifth or the clef is grand. C4 → diatonic 28; grand splits hands at C4.
const C4_DIA = LETTER_INDEX.C + 7 * 4;
function diaOf(name) { const p = parseName(name); return LETTER_INDEX[p.letter] + 7 * p.octave; }
function fingerOfFrame(names, frame, clef = 'treble') {
  const dia = names.map(diaOf);
  const hands = dia.map((d) => (clef === 'treble' ? 'R' : clef === 'bass' ? 'L' : d >= C4_DIA ? 'R' : 'L'));
  const anchorDia = diaOf(frame.low);
  const span = diaOf(frame.high) - anchorDia;
  const hideFingering = clef === 'grand' || span > 4;
  return assignFingering(dia, hands, { fixedPosition: true, anchorDia, hideFingering });
}

// --- Assertions --------------------------------------------------------------
let pass = 0, fail = 0;
const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
function expect(names, clef, expected, fixed = false) {
  const { fingers } = fingerOf(names, clef, fixed);
  const ok = eq(fingers, expected);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${(fixed ? '[fixed] ' : '').padEnd(8)}${names.join(' ').padEnd(22)} -> ${fingers.join(' ')}` +
    (ok ? '' : `   (expected ${expected.join(' ')})`));
  ok ? pass++ : fail++;
}
function expectNoShift(names, clef, fixed = true) {
  const { shifts } = fingerOf(names, clef, fixed);
  const ok = !shifts.some(Boolean);
  console.log(`${ok ? 'PASS' : 'FAIL'}  no-shift(fixed): ${names.join(' ')}`);
  ok ? pass++ : fail++;
}
function expectNoLowPinky(names, clef = 'treble') {
  // The final note is the phrase's lowest here; it must never be finger 5.
  const { fingers } = fingerOf(names, clef);
  const last = fingers[fingers.length - 1];
  const ok = clef === 'bass' ? last !== 1 : last !== 5;
  console.log(`${ok ? 'PASS' : 'FAIL'}  no-pinky-on-low: ${names.join(' ').padEnd(20)} last finger ${last}`);
  ok ? pass++ : fail++;
}

console.log('--- user examples (must NOT end in RH finger 5 on the low note) ---');
expect(['E4', 'G4', 'F4', 'E4', 'C4'], 'treble', [3, 5, 4, 3, 1]);
expect(['F4', 'A4', 'G4', 'F4', 'D4'], 'treble', [3, 5, 4, 3, 1]);
expect(['G4', 'B4', 'A4', 'G4', 'E4'], 'treble', [3, 5, 4, 3, 1]);
expectNoLowPinky(['E4', 'G4', 'F4', 'E4', 'C4']);
expectNoLowPinky(['F4', 'A4', 'G4', 'F4', 'D4']);
expectNoLowPinky(['G4', 'B4', 'A4', 'G4', 'E4']);

console.log('\n--- descend 1-2 notes after higher notes: one position, no shift ---');
expect(['C4', 'E4', 'G4', 'F4'], 'treble', [1, 3, 5, 4]);
expect(['C4', 'E4', 'G4', 'F4', 'E4'], 'treble', [1, 3, 5, 4, 3]);
expect(['D4', 'G4', 'F4', 'E4'], 'treble', [1, 4, 3, 2]);

console.log('\n--- genuine shifts past a fifth (reseat to finger 1, marked) ---');
expect(['C4', 'D4', 'E4', 'F4', 'G4', 'A4'], 'treble', [1, 2, 3, 4, 5, 1]);
expect(['G4', 'F4', 'E4', 'D4', 'C4', 'B3'], 'treble', [5, 4, 3, 2, 1, 1]);

console.log('\n--- left hand anatomy: low -> 5, high -> 1 ---');
expect(['C3', 'E3', 'G3', 'F3', 'E3'], 'bass', [5, 3, 1, 2, 3]);

console.log('\n--- COGNITIVE fixed-position (Stage 1): FRAME-ANCHORED, stable within the frame ---');
function expectFrame(names, frame, clef, expected) {
  const { fingers } = fingerOfFrame(names, frame, clef);
  const ok = eq(fingers, expected);
  console.log(`${ok ? 'PASS' : 'FAIL'}  [frame ${frame.low}-${frame.high}] ${names.join(' ').padEnd(20)} -> ${fingers.join(' ')}` +
    (ok ? '' : `   (expected ${expected.join(' ')})`));
  ok ? pass++ : fail++;
}
function expectHidden(names, frame, clef) {
  const { fingers } = fingerOfFrame(names, frame, clef);
  const ok = fingers.every((f) => f === null);
  console.log(`${ok ? 'PASS' : 'FAIL'}  hidden(${clef} ${frame.low}-${frame.high}): ${names.join(' ')} -> ${fingers.join(' ')}`);
  ok ? pass++ : fail++;
}
function expectNoShiftFrame(names, frame, clef) {
  const { shifts } = fingerOfFrame(names, frame, clef);
  const ok = !shifts.some(Boolean);
  console.log(`${ok ? 'PASS' : 'FAIL'}  no-shift(frame): ${names.join(' ')}`);
  ok ? pass++ : fail++;
}
// C4-G4 frame (a fifth): always 1 2 3 4 5; the SAME note keeps the SAME finger
// regardless of which notes the exercise actually contains, finger 5 only on G4.
expectFrame(['C4', 'D4', 'E4', 'F4', 'G4'], { low: 'C4', high: 'G4' }, 'treble', [1, 2, 3, 4, 5]);
expectFrame(['E4', 'G4', 'F4', 'E4', 'C4'], { low: 'C4', high: 'G4' }, 'treble', [3, 5, 4, 3, 1]);
expectFrame(['D4', 'E4', 'F4', 'G4'],       { low: 'C4', high: 'G4' }, 'treble', [2, 3, 4, 5]);  // no C4 → still anchored on C4 (was 1 2 3 4)
expectFrame(['E4', 'F4', 'G4'],             { low: 'C4', high: 'G4' }, 'treble', [3, 4, 5]);      // stable (was 1 2 3)
expectFrame(['G4', 'E4', 'G4', 'E4'],       { low: 'C4', high: 'G4' }, 'treble', [5, 3, 5, 3]);   // repeats show the SAME finger, no drift
expectNoShiftFrame(['E4', 'G4', 'F4', 'E4', 'C4'], { low: 'C4', high: 'G4' }, 'treble');
// Frames WIDER than a fifth → fingering hidden entirely (no clamped/repeated 5s).
expectHidden(['C4', 'D4', 'E4', 'F4', 'G4', 'A4'], { low: 'C4', high: 'A4' }, 'treble');           // a 6th
expectHidden(['C4', 'E4', 'G4', 'A5', 'C6'],       { low: 'C4', high: 'C6' }, 'treble');           // ledger/register
// Grand-staff fixed lessons → hidden (coordination/reading, not technique).
expectHidden(['G3', 'C4', 'D4'], { low: 'G3', high: 'D4' }, 'grand');
// Left-hand frame (bass within a fifth): low → 5, high → 1, anchored on frame low.
expectFrame(['C3', 'E3', 'G3', 'F3', 'E3'], { low: 'C3', high: 'G3' }, 'bass', [5, 3, 1, 2, 3]);
// CONTRAST — range-aware (advanced, Stage 2/3) path is UNCHANGED and still shifts:
expect(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'A4'], 'treble', [1, 2, 3, 4, 5, 1, 2, 1], false);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES PRESENT'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
