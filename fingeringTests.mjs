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
const sig = 'function assignFingering(dia, hands) {';
const start = src.indexOf(sig);
if (start < 0) { console.error('FAIL: assignFingering not found in sightReading.js'); process.exit(1); }
let depth = 0, end = -1;
for (let i = src.indexOf('{', start); i < src.length; i++) {
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
function fingerOf(names, clef = 'treble') {
  const parsed = names.map(parseName);
  const dia = parsed.map((p) => LETTER_INDEX[p.letter] + 7 * p.octave);
  const hands = dia.map(() => (clef === 'bass' ? 'L' : 'R'));
  return assignFingering(dia, hands);
}

// --- Assertions --------------------------------------------------------------
let pass = 0, fail = 0;
const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
function expect(names, clef, expected) {
  const { fingers } = fingerOf(names, clef);
  const ok = eq(fingers, expected);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${names.join(' ').padEnd(22)} -> ${fingers.join(' ')}` +
    (ok ? '' : `   (expected ${expected.join(' ')})`));
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

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES PRESENT'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
