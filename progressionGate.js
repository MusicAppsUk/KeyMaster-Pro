// progressionGate.js
//
// DETERMINISTIC stage-unlocking system (RC2 gating).
//
// Progression is controlled by HARD THRESHOLDS only — no adaptive scoring, no
// hidden weighting, no probabilistic "fluency" model. A stage either meets the
// explicit numeric requirements or it does not.
//
//   Stage 1 → 2  (single 20-note Recognition block)
//       accuracy ≥ 95%  AND  average response latency ≤ 1200 ms
//       latency = (timestamp of correct MIDI input) − (moment the note became
//                 the active expected target)
//
//   Stage 2 → 3  (two consecutive 4-bar Guided-Reading phrases)
//       rhythm accuracy ≥ 90% within a ±150 ms tolerance window
//       AND no inactivity gap > 2000 ms during an active phrase (a "halt")
//       AND 2 consecutive passing phrases
//
// Unlock state persists in localStorage and survives refresh / restart.

const KEYS = { s2: 'km_stage2_unlocked', s3: 'km_stage3_unlocked' };

export const THRESHOLDS = Object.freeze({
  stage1: Object.freeze({ block: 20, minAccuracy: 0.95, maxLatencyMs: 1200 }),
  stage2: Object.freeze({ phrases: 2, minRhythmAccuracy: 0.90, toleranceMs: 150, haltMs: 2000 }),
});

function read(key) { try { return localStorage.getItem(key) === '1'; } catch (_) { return false; } }
function write(key, on) { try { localStorage.setItem(key, on ? '1' : '0'); } catch (_) {} }

export function createProgressionGate() {
  let s2Streak = 0;   // consecutive passing Stage-2 phrases (in-session)

  return {
    THRESHOLDS,

    /** Stage 1 is always open; 2 and 3 read their persisted unlock flag. */
    isUnlocked(stage) {
      if (stage <= 1) return true;
      if (stage === 2) return read(KEYS.s2);
      if (stage === 3) return read(KEYS.s3);
      return false;
    },

    /** Explicit, user-facing requirement message for a locked stage. */
    requirementText(stage) {
      const a = THRESHOLDS.stage1, b = THRESHOLDS.stage2;
      if (stage === 2) {
        return `Complete a ${a.block}-note Recognition block at ≥ ${Math.round(a.minAccuracy * 100)}% accuracy ` +
               `with an average response under ${a.maxLatencyMs} ms.`;
      }
      if (stage === 3) {
        return `Pass ${b.phrases} consecutive Guided-Reading phrases at ≥ ${Math.round(b.minRhythmAccuracy * 100)}% ` +
               `rhythm accuracy (±${b.toleranceMs} ms), with no pause longer than ${b.haltMs} ms.`;
      }
      return '';
    },

    /**
     * Evaluate one completed 20-note Recognition block (Stage 1 → 2).
     * Deterministic: both thresholds must be met. Returns the verdict and, on a
     * pass, persists the Stage 2 unlock.
     * @param {{targets:number, correct:number, latencySumMs:number, latencyCount:number}} block
     */
    evaluateStage1Block(block) {
      const t = THRESHOLDS.stage1;
      if (!block || block.targets < t.block) return { complete: false };
      const accuracy = block.correct / block.targets;
      const avgLatency = block.latencyCount ? block.latencySumMs / block.latencyCount : Infinity;
      const pass = accuracy >= t.minAccuracy && avgLatency <= t.maxLatencyMs;
      if (pass) write(KEYS.s2, true);
      return { complete: true, pass, accuracy, avgLatency };
    },

    /**
     * Record one Guided-Reading phrase result (Stage 2 → 3). Tracks the
     * consecutive-pass streak; unlocks Stage 3 on the 2nd consecutive pass.
     * (Consumed by the future Stage 2 engine — not exercised while Stage 2 is a
     * placeholder.)
     * @param {{rhythmAccuracy:number, maxGapMs:number}} phrase
     */
    recordStage2Phrase(phrase) {
      const t = THRESHOLDS.stage2;
      const ok = phrase.rhythmAccuracy >= t.minRhythmAccuracy && phrase.maxGapMs <= t.haltMs;
      s2Streak = ok ? s2Streak + 1 : 0;
      const pass = s2Streak >= t.phrases;
      if (pass) write(KEYS.s3, true);
      return { ok, streak: s2Streak, pass };
    },

    // No unlock bypass exists by design: Stage 2 is written ONLY by a genuine
    // evaluateStage1Block pass, and Stage 3 ONLY by recordStage2Phrase reaching
    // the consecutive-pass streak. reset() can only RE-LOCK (write false), never
    // grant progression.
    reset() { write(KEYS.s2, false); write(KEYS.s3, false); s2Streak = 0; },
  };
}
