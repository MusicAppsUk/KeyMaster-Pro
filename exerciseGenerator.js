// exerciseGenerator.js
//
// Procedural sight-reading exercise generator (RC2).
//
// DOMAIN: standard Middle-C notation ONLY. This module is deliberately decoupled
// from the B-Major motor/anchor system used by the keyboard/scales view. It emits
// plain note-name sequences (e.g. ['C4','E4','D4']); the sight-reading engine maps
// those to MIDI + staff coordinates. No transposition happens here or there.
//
// Each tier is defined by the 3-Variable Constraint Matrix so that every retry is
// a FRESH but EQUIVALENT-difficulty exercise:
//   1. Note Pool        — the bounded set of notes (a scale range, white keys).
//   2. Max Interval Jump — max distance between consecutive notes, measured in
//                          pool steps (1 = 2nd, 2 = 3rd, 3 = 4th, …).
//   3. Direction Cap     — max number of up/down direction changes (zig-zags).

const WHITE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Ordered inclusive white-key pool between two note names, e.g. 'C4'→'G4'. */
export function whiteKeyPool(lowName, highName) {
  const lo = /^([A-G])(\d)$/.exec(lowName);
  const hi = /^([A-G])(\d)$/.exec(highName);
  if (!lo || !hi) throw new Error(`whiteKeyPool: bad range ${lowName}..${highName}`);
  const lowDia = WHITE.indexOf(lo[1]) + 7 * Number(lo[2]);
  const highDia = WHITE.indexOf(hi[1]) + 7 * Number(hi[2]);
  const pool = [];
  for (let d = lowDia; d <= highDia; d++) {
    pool.push(`${WHITE[((d % 7) + 7) % 7]}${Math.floor(d / 7)}`);
  }
  return pool;
}

// Helper: a white-key pool with specific letters swapped for an accidental,
// e.g. accidentalPool('C4','C5', { F4: 'F#4' }) introduces F♯.
function withAccidentals(pool, swaps) {
  return pool.map((n) => swaps[n] ?? n);
}

// The 7-level progression ladder (RC2 §2.1). Difficulty is fixed per level by
// the 3-variable matrix so every retry is a fresh, equivalent exercise.
//   pool         — bounded note set for the level
//   maxStep      — max distance between consecutive notes, in POOL steps
//                  (1 = 2nd, 2 = 3rd, 3 = 4th …)
//   maxDirChanges— max up/down direction changes (zig-zags) per pattern
//   length       — notes per exercise
export const LEVELS = [
  { level: 1, name: 'Three-note reading',        pool: whiteKeyPool('C4', 'G4'), maxStep: 2, maxDirChanges: 1, length: 3 },
  { level: 2, name: 'Five-finger position',      pool: whiteKeyPool('C4', 'G4'), maxStep: 2, maxDirChanges: 2, length: 5 },
  { level: 3, name: 'Five up & five down',       pool: whiteKeyPool('C4', 'G4'), maxStep: 2, maxDirChanges: 2, length: 9 },
  { level: 4, name: 'Full C major scale',        pool: whiteKeyPool('C4', 'C5'), maxStep: 2, maxDirChanges: 2, length: 8 },
  { level: 5, name: 'Cross-staff reading',       pool: whiteKeyPool('G3', 'E4'), maxStep: 2, maxDirChanges: 2, length: 6 },
  { level: 6, name: 'First accidental (F♯)',     pool: withAccidentals(whiteKeyPool('C4', 'C5'), { F4: 'F#4' }), maxStep: 2, maxDirChanges: 2, length: 7 },
  { level: 7, name: 'Bass-to-treble expansion',  pool: whiteKeyPool('C3', 'C5'), maxStep: 3, maxDirChanges: 3, length: 8 },
];

export function levelAt(index) {
  const i = ((index % LEVELS.length) + LEVELS.length) % LEVELS.length;
  return LEVELS[i];
}

/**
 * Generate a constraint-valid note-name sequence for a tier config.
 * @param {object} cfg     a TIERS entry
 * @param {Set<string>} recent  signatures to avoid (guarantees no exact repeat)
 * @param {() => number} rng    injectable RNG (for tests); defaults to Math.random
 * @returns {{ names: string[], signature: string }}
 */
export function generateExercise(cfg, recent = new Set(), rng = Math.random) {
  for (let attempt = 0; attempt < 250; attempt++) {
    const idx = buildSequence(cfg, rng);
    if (!idx) continue;
    const names = idx.map((i) => cfg.pool[i]);
    const signature = names.join(' ');
    if (!recent.has(signature)) return { names, signature };
  }
  // Fallback (pool too tight for uniqueness): return a valid sequence anyway.
  const idx = buildSequence(cfg, rng) || cfg.pool.map((_, i) => i).slice(0, cfg.length);
  const names = idx.map((i) => cfg.pool[i]);
  return { names, signature: names.join(' ') };
}

/** Walk the pool by index, enforcing max-interval and direction-change caps. */
function buildSequence(cfg, rng) {
  const { pool, maxStep, maxDirChanges, length } = cfg;
  const n = pool.length;
  const seq = [Math.floor(rng() * n)];
  let dirChanges = 0;
  let lastDir = 0; // -1 down, +1 up, 0 none yet

  for (let k = 1; k < length; k++) {
    const cands = [];
    for (let step = 1; step <= maxStep; step++) {
      for (const dir of [1, -1]) {
        const next = seq[k - 1] + dir * step;
        if (next < 0 || next >= n) continue;
        const changes = lastDir !== 0 && dir !== lastDir;
        if (changes && dirChanges + 1 > maxDirChanges) continue;
        cands.push({ next, dir });
      }
    }
    if (cands.length === 0) return null; // dead end; caller retries
    const pick = cands[Math.floor(rng() * cands.length)];
    if (lastDir !== 0 && pick.dir !== lastDir) dirChanges += 1;
    lastDir = pick.dir;
    seq.push(pick.next);
  }
  return seq;
}

/** Validate a sequence of pool indices against a config (used by tests). */
export function validateSequence(cfg, names) {
  const idx = names.map((nm) => cfg.pool.indexOf(nm));
  if (idx.some((i) => i < 0)) return { ok: false, reason: 'note outside pool' };
  let dirChanges = 0, lastDir = 0;
  for (let k = 1; k < idx.length; k++) {
    const d = idx[k] - idx[k - 1];
    const step = Math.abs(d);
    if (step < 1 || step > cfg.maxStep) return { ok: false, reason: `interval ${step} > maxStep ${cfg.maxStep}` };
    const dir = Math.sign(d);
    if (lastDir !== 0 && dir !== lastDir) dirChanges += 1;
    lastDir = dir;
  }
  if (dirChanges > cfg.maxDirChanges) return { ok: false, reason: `dirChanges ${dirChanges} > ${cfg.maxDirChanges}` };
  return { ok: true, dirChanges };
}
