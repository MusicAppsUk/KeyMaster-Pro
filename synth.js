// synth.js
//
// Polyphonic Web Audio synthesizer. Takes MIDI note numbers in, makes sound.
// It knows nothing about scales, scheduling, or the keyboard UI — the app wires
// keyboard/MIDI presses to noteOn/noteOff.
//
// Signal path per voice:
//   [oscA triangle] ┐
//                   ├─► [voice gain / ADSR] ─► [lowpass] ─► master bus
//   [oscB sine -1c] ┘
//
// Master bus: [master gain] ─► [compressor/limiter] ─► destination. The limiter
// keeps dense chords from clipping without us having to ride the gain.
//
// Tone target: a clean, slightly bell-like electric-piano voice — responsive
// attack, natural decay — rather than a harsh raw oscillator. Velocity shapes
// both loudness and brightness (filter cutoff), which is what makes dynamics
// feel real under the fingers.

import { getAudioContext } from './audioContext.js';

const MIDI_A4 = 69;
const FREQ_A4 = 440;

/** Equal-tempered frequency for a MIDI note. */
function midiToFreq(midi) {
  return FREQ_A4 * Math.pow(2, (midi - MIDI_A4) / 12);
}

/**
 * A single sounding voice. Owns its oscillators, envelope, and filter, and
 * tears itself down when the release tail finishes.
 */
class Voice {
  /**
   * @param {AudioContext} ctx
   * @param {AudioNode} destination  Master bus input.
   * @param {number} midi
   * @param {number} velocity  1–127.
   * @param {number} when      ctx time to start.
   * @param {object} env       Envelope settings.
   */
  constructor(ctx, destination, midi, velocity, when, env, tone) {
    this.ctx = ctx;
    this.midi = midi;
    this.releasing = false;
    this.onended = null;

    const freq = midiToFreq(midi);
    const v = Math.min(127, Math.max(1, velocity)) / 127;
    const demo = tone === 'demo';

    // --- Nodes ---
    this.gain = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';

    this.oscA = ctx.createOscillator();
    this.oscB = ctx.createOscillator();
    this.oscA.frequency.value = freq;
    this.oscB.frequency.value = freq;
    this.oscA.connect(this.gain);
    this.oscB.connect(this.gain);
    this.gain.connect(this.filter);
    this.filter.connect(destination);

    const t0 = Math.max(when, ctx.currentTime);
    const g = this.gain.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);

    if (demo) {
      // Scales-Listen demonstration voice (scoped — only used when tone==='demo').
      // Warmer + more piano-like than the default: a brighter onset that quickly
      // settles via a filter envelope, over a triangle+sine core, with a faster
      // piano-ish decay and a lower sustain so notes don't drone or overlap muddily.
      this.oscA.type = 'triangle';
      this.oscB.type = 'sine';
      this.oscB.detune.value = -4;
      this.filter.Q.value = 0.7;
      const fPeak = 1700 + v * 3200;   // bright at onset
      const fTail = 650 + v * 900;     // mellow once settled
      this.filter.frequency.setValueAtTime(fPeak, t0);
      this.filter.frequency.exponentialRampToValueAtTime(Math.max(fTail, 200), t0 + 0.26);
      const peak = 0.06 + v * 0.32;    // ~matches default level — no loudness jump
      const sustain = peak * 0.22;     // piano-ish: decays rather than holding
      g.linearRampToValueAtTime(peak, t0 + 0.004);              // clean, not sharp
      g.exponentialRampToValueAtTime(Math.max(sustain, 0.0002), t0 + 0.004 + 0.5);
      this._releaseTime = 0.30;
    } else {
      // --- Default voice (unchanged) ---
      this.oscA.type = 'triangle';
      this.oscB.type = 'sine';
      this.oscB.detune.value = -6; // a few cents under for gentle beating/warmth
      this.filter.frequency.value = 800 + v * 6000; // brighter when struck harder
      this.filter.Q.value = 0.6;
      const peak = 0.06 + v * 0.34;        // keep per-voice level modest for polyphony
      const sustain = peak * env.sustain;
      g.linearRampToValueAtTime(peak, t0 + env.attack);
      // Exponential decay reads as more natural than linear.
      g.exponentialRampToValueAtTime(Math.max(sustain, 0.0002), t0 + env.attack + env.decay);
      this._releaseTime = env.release;
    }

    this.oscA.start(t0);
    this.oscB.start(t0);
  }

  /**
   * Begin the release tail and schedule teardown.
   * @param {number} when ctx time to release.
   */
  release(when) {
    if (this.releasing) return;
    this.releasing = true;
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const g = this.gain.gain;
    const rel = this._releaseTime;
    // Anchor to the CURRENT automation value without a discontinuity. The old
    // cancelScheduledValues + setValueAtTime(g.value) could read a stale value and
    // jump (an audible blip); cancelAndHoldAtTime holds the live curve value.
    if (typeof g.cancelAndHoldAtTime === 'function') {
      g.cancelAndHoldAtTime(t);
    } else {
      // Fallback for browsers without cancelAndHoldAtTime (older/mobile): cancel and
      // re-anchor to the best-known current value.
      const held = Math.max(g.value, 0.0002);
      g.cancelScheduledValues(t);
      g.setValueAtTime(held, t);
    }
    // Natural exponential tail, then a short GUARANTEED linear fade to TRUE zero so
    // the oscillators never stop on a non-zero sample (the old end-click / "doot").
    const tailEnd = t + rel;
    const stopAt = tailEnd + 0.03;
    g.exponentialRampToValueAtTime(0.0008, tailEnd);
    g.linearRampToValueAtTime(0, stopAt);

    this.oscA.stop(stopAt);
    this.oscB.stop(stopAt);
    this.oscA.onended = () => this._teardown();
  }

  /** Fast forced release used by voice stealing / panic. */
  steal(when) {
    this._releaseTime = Math.min(this._releaseTime, 0.05);
    this.release(when);
  }

  _teardown() {
    try {
      this.oscA.disconnect();
      this.oscB.disconnect();
      this.gain.disconnect();
      this.filter.disconnect();
    } catch { /* already gone */ }
    this.onended?.(this);
  }
}

export class Synth {
  /**
   * @param {AudioContext} [ctx]  Shared context; defaults to the app singleton.
   * @param {object} [options]
   * @param {number} [options.maxPolyphony=32]
   * @param {number} [options.volume=0.8]   Master 0–1.
   * @param {object} [options.envelope]     { attack, decay, sustain, release }.
   */
  constructor(ctx = getAudioContext(), options = {}) {
    this.ctx = ctx;
    this.maxPolyphony = options.maxPolyphony ?? 32;
    this.env = {
      attack: 0.006,
      decay: 0.9,
      sustain: 0.55,
      release: 0.35,
      ...(options.envelope ?? {}),
    };

    // Master bus: gain → limiter → out.
    this.master = ctx.createGain();
    this.master.gain.value = options.volume ?? 0.8;

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.18;

    this.master.connect(this.limiter);
    this.limiter.connect(ctx.destination);

    /** @type {Voice[]} live voices, oldest first (for stealing). */
    this._voices = [];
  }

  /**
   * Start a note.
   * @param {number} midi
   * @param {number} [velocity=100] 1–127.
   * @param {number} [when]         ctx time; defaults to now.
   * @param {string} [tone]         'demo' for the warmer Scales-Listen voice; omit for default.
   * @returns {Voice}
   */
  noteOn(midi, velocity = 100, when = this.ctx.currentTime, tone) {
    // Voice stealing if we're at the polyphony ceiling.
    while (this._voices.length >= this.maxPolyphony) {
      const victim = this._voices.shift();
      victim?.steal(this.ctx.currentTime);
    }
    const voice = new Voice(this.ctx, this.master, midi, velocity, when, this.env, tone);
    voice.onended = (v) => {
      const i = this._voices.indexOf(v);
      if (i !== -1) this._voices.splice(i, 1);
    };
    this._voices.push(voice);
    return voice;
  }

  /**
   * Release the most recent held voice for a note.
   * @param {number} midi
   * @param {number} [when] ctx time; defaults to now.
   */
  noteOff(midi, when = this.ctx.currentTime) {
    for (let i = this._voices.length - 1; i >= 0; i--) {
      const voice = this._voices[i];
      if (voice.midi === midi && !voice.releasing) {
        voice.release(when);
        return;
      }
    }
  }

  /** Release every voice immediately (e.g. on view change). */
  allNotesOff() {
    const now = this.ctx.currentTime;
    for (const voice of [...this._voices]) voice.release(now);
  }

  /** Hard stop — kill all sound fast. */
  panic() {
    const now = this.ctx.currentTime;
    for (const voice of [...this._voices]) voice.steal(now);
  }

  /**
   * Set master volume (0–1), smoothly to avoid clicks.
   * @param {number} value
   */
  setVolume(value) {
    const v = Math.min(1, Math.max(0, value));
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }
}

export { midiToFreq };
