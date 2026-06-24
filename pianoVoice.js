// pianoVoice.js — free-play / learner-keypress voice for the KeyMaster Pro Course.
// =============================================================================
// rc2-163 — WARMER, fuller Course piano voice. Still PURE SYNTHESIS (no samples),
// so zero licensing / file-size / load-failure risk, and synth.js stays untouched.
//
// History worth keeping in mind: an earlier rich version (harmonic wave + detuned
// twin + filter-envelope SWEEP + filtered-noise HAMMER) read brittle/clicky on
// tablet speakers and was reverted (rc2-104) to a bare triangle — stable, but
// plinky. This version recovers warmth while deliberately avoiding BOTH documented
// failure causes:
//   • NO noise hammer and NO filter sweep            → no clicks / pops
//   • a WARM, gently rolled-off spectrum + low-pass  → full, not brittle
//   • same modest node count (osc → low-pass → gain) → dense play stays stable
//   • TRUE-zero start AND release preserved          → click-free onset / release
// Each note: ONE oscillator on a cached warm piano PeriodicWave → a static (per-note,
// velocity-brightened) low-pass → a two-stage decay (quick "ping", then slow tail).
//
// Interface unchanged (drop-in): noteOn / noteOff / allNotesOff / panic / setVolume,
// plus a `ctx` field. app.js routes this engine into the shared safety bus
// (audioBus.js); synth.js — Scales / Chord / Sight-Reading — is NOT touched.
// =============================================================================

import { getAudioContext } from './audioContext.js';

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// Cached warm piano spectrum — built once (the AudioContext is a singleton, so one
// cache entry serves every note; a PeriodicWave is bound to the context that made it).
// Both even AND odd partials (fuller than a triangle's odd-only series) with a gentle
// roll-off; the per-note low-pass tames the top so it reads warm, not bright/brittle.
let _pianoWave = null;
function getPianoWave(ctx) {
  if (_pianoWave) return _pianoWave;
  const imag = new Float32Array([0, 1.0, 0.5, 0.28, 0.16, 0.10, 0.06, 0.038, 0.024, 0.015, 0.009, 0.005]);
  const real = new Float32Array(imag.length);          // sine-phase partials; real = zeros
  _pianoWave = ctx.createPeriodicWave(real, imag);     // normalized by default → peak ±1, as the triangle was
  return _pianoWave;
}

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
    const level = 0.058 + v * 0.165;   // richer spectrum carries more energy → a hair lower than before

    this.osc = ctx.createOscillator();
    this.osc.setPeriodicWave(getPianoWave(ctx));          // warm piano spectrum (cached) — replaces 'triangle'
    this.osc.frequency.value = f;

    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    // STATIC per note (NO sweep — a filter sweep was a documented brittleness cause).
    // Brighter on harder hits for natural dynamics; pitch-tracked so high notes keep life.
    this.lp.frequency.value = clamp(f * 3.4 + v * 1500, 1300, 4200);
    this.lp.Q.value = 0.4;

    this.gain = ctx.createGain();
    const g = this.gain.gain;
    g.setValueAtTime(0, t0);                              // TRUE zero start → no click
    g.linearRampToValueAtTime(level, t0 + 0.008);         // fast, clean attack
    // Two-stage decay: a quick initial drop (the piano-like "ping"), then a slow tail
    // while the key is held — closer to a real decay than one straight slope.
    g.exponentialRampToValueAtTime(Math.max(level * 0.62, 0.004), t0 + 0.090);
    g.exponentialRampToValueAtTime(Math.max(level * 0.20, 0.0006), t0 + 3.6);

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
