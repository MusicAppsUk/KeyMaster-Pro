// metronome.js
//
// The metronome listens to the Scheduler's pulse stream and renders a click at
// each scheduled time. It does NOT keep its own clock — it trusts the
// scheduler's look-ahead times, which is exactly why the click is rock-solid.
//
// Clicks are synthesized (no samples to load): a short enveloped oscillator,
// pitched higher and louder on the bar downbeat so the player can feel "one".
// Subdivision pulses (when subdivision > 1) tick quieter still.
//
// It runs on its own gain bus straight to the destination, independent of the
// instrument synth, so muting one never affects the other.

import { getAudioContext } from './audioContext.js';

export class Metronome {
  /**
   * @param {import('./scheduler.js').Scheduler} scheduler
   * @param {object} [options]
   * @param {AudioContext} [options.ctx]
   * @param {number} [options.volume=0.6]   0–1.
   * @param {boolean} [options.enabled=false]
   * @param {{down:number, beat:number, sub:number}} [options.freqs]
   */
  constructor(scheduler, options = {}) {
    if (!scheduler) throw new TypeError('Metronome requires a Scheduler');
    this.scheduler = scheduler;
    this.ctx = options.ctx ?? getAudioContext();
    this.enabled = Boolean(options.enabled);

    this.freqs = options.freqs ?? { down: 1600, beat: 1100, sub: 900 };

    this.bus = this.ctx.createGain();
    this.bus.gain.value = options.volume ?? 0.6;
    this.bus.connect(this.ctx.destination);

    // Subscribe once; we gate on `enabled` inside the handler so toggling is
    // instant and doesn't churn subscriptions.
    this._unsub = this.scheduler.onPulse((pulse) => {
      if (!this.enabled) return;
      if (pulse.isDownbeat) this._click(pulse.time, this.freqs.down, 1.0, 0.045);
      else if (pulse.isBeat) this._click(pulse.time, this.freqs.beat, 0.7, 0.035);
      else this._click(pulse.time, this.freqs.sub, 0.4, 0.025);
    });
  }

  /* ---- Controls ------------------------------------------------------- */

  setEnabled(on) { this.enabled = Boolean(on); }
  toggle() { this.enabled = !this.enabled; return this.enabled; }

  /** @param {number} value 0–1 */
  setVolume(value) {
    const v = Math.min(1, Math.max(0, value));
    this.bus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  /** Detach from the scheduler. */
  dispose() {
    this._unsub?.();
    try { this.bus.disconnect(); } catch { /* already gone */ }
  }

  /* ---- Click synthesis ------------------------------------------------ */

  /**
   * One click scheduled at an exact ctx time.
   * @param {number} when      ctx time (from the scheduler, not currentTime).
   * @param {number} freq
   * @param {number} amp       0–1, relative to the bus gain.
   * @param {number} duration  seconds.
   */
  _click(when, freq, amp, duration) {
    const t = Math.max(when, this.ctx.currentTime);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;

    // Percussive envelope: near-instant attack, fast exponential decay.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(amp, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(this.bus);
    osc.start(t);
    osc.stop(t + duration + 0.02);
    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect(); } catch { /* gone */ }
    };
  }
}
