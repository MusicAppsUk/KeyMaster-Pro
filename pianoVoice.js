// pianoVoice.js — free-play / learner-keypress voice for KeyMaster PRO.
// =============================================================================
// rc2-104 — REBUILT as a clean, simple, warm tone to match courseVoice.
//
// The previous version layered a harmonic PeriodicWave, a detuned twin, a filter
// envelope and a filtered-noise hammer "knock". On tablet speakers that read as
// brittle/clicky. Realism is not the goal — a clean stable teaching tone is. So
// each note is now: ONE triangle oscillator → a STATIC gentle low-pass → a gain
// envelope that starts and ends at TRUE zero (no onset or release click). Minimal
// nodes per voice, so dense playing can't underrun the audio thread.
//
// Interface unchanged (drop-in for the keyboard): noteOn / noteOff / allNotesOff /
// panic / setVolume, plus a `ctx` field. app.js routes this engine's output into
// the shared safety bus (audioBus.js) — synth.js (protected Scales) is untouched.
// =============================================================================

import { getAudioContext } from './audioContext.js';

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

class PianoNote {
  constructor(ctx, dest, midi, velocity, when) {
    this.ctx = ctx;
    this.midi = midi;
    this.releasing = false;
    this.onended = null;
    this._releaseTime = 0.18;

    const f = midiToFreq(midi);
    const v = clamp(velocity, 1, 127) / 127;
    const t0 = Math.max(when, ctx.currentTime);
    const level = 0.06 + v * 0.17;

    this.osc = ctx.createOscillator();
    this.osc.type = 'triangle';
    this.osc.frequency.value = f;

    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = clamp(f * 4, 1300, 3600);   // static, no sweep
    this.lp.Q.value = 0.4;

    this.gain = ctx.createGain();
    const g = this.gain.gain;
    g.setValueAtTime(0, t0);                              // TRUE zero start → no click
    g.linearRampToValueAtTime(level, t0 + 0.010);         // 10ms clean attack
    g.exponentialRampToValueAtTime(Math.max(level * 0.28, 0.0006), t0 + 3.2); // slow natural decay while held

    this.osc.connect(this.lp); this.lp.connect(this.gain); this.gain.connect(dest);
    this.osc.start(t0);
  }

  release(when) {
    if (this.releasing) return;
    this.releasing = true;
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const g = this.gain.gain;
    if (typeof g.cancelAndHoldAtTime === 'function') {
      g.cancelAndHoldAtTime(t);
    } else {
      const held = Math.max(g.value, 0.0004);
      g.cancelScheduledValues(t);
      g.setValueAtTime(held, t);
    }
    const end = t + this._releaseTime;
    g.exponentialRampToValueAtTime(0.0005, end);
    g.linearRampToValueAtTime(0, end + 0.03);             // true zero before stop
    this.osc.stop(end + 0.04);
    this.osc.onended = () => this._teardown();
  }

  steal(when) { this._releaseTime = Math.min(this._releaseTime, 0.04); this.release(when); }

  _teardown() {
    try { this.osc.disconnect(); this.lp.disconnect(); this.gain.disconnect(); } catch (_) { /* gone */ }
    this.onended?.(this);
  }
}

export class PianoSynth {
  constructor(ctx = getAudioContext(), options = {}) {
    this.ctx = ctx;
    this.maxPolyphony = options.maxPolyphony ?? 24;

    this.master = ctx.createGain();
    this.master.gain.value = options.volume ?? 0.8;

    // Per-engine soft limiter retained; app.js reconnects THIS node into the
    // shared master bus so all engines share one ceiling.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.2;

    this.master.connect(this.limiter);
    this.limiter.connect(ctx.destination);   // app.js reroutes this to the shared bus

    /** @type {PianoNote[]} */
    this._voices = [];
  }

  noteOn(midi, velocity = 100, when = this.ctx.currentTime) {
    // Retrigger: gently steal a still-sounding copy of the SAME note first.
    for (let i = this._voices.length - 1; i >= 0; i--) {
      const vc = this._voices[i];
      if (vc.midi === midi && !vc.releasing) { vc.steal(this.ctx.currentTime); break; }
    }
    while (this._voices.length >= this.maxPolyphony) {
      const victim = this._voices.shift();
      victim?.steal(this.ctx.currentTime);
    }
    const voice = new PianoNote(this.ctx, this.master, midi, velocity, when);
    voice.onended = (v) => { const i = this._voices.indexOf(v); if (i !== -1) this._voices.splice(i, 1); };
    this._voices.push(voice);
    return voice;
  }

  noteOff(midi, when = this.ctx.currentTime) {
    for (let i = this._voices.length - 1; i >= 0; i--) {
      const voice = this._voices[i];
      if (voice.midi === midi && !voice.releasing) { voice.release(when); return; }
    }
  }

  allNotesOff() { const now = this.ctx.currentTime; for (const v of [...this._voices]) v.release(now); }
  panic() { const now = this.ctx.currentTime; for (const v of [...this._voices]) v.steal(now); }
  setVolume(value) { this.master.gain.setTargetAtTime(clamp(value, 0, 1), this.ctx.currentTime, 0.02); }
}

export { midiToFreq };
