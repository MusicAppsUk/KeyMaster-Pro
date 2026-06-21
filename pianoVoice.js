// pianoVoice.js
//
// Richer, piano-flavoured polyphonic voice used for FREE-PLAY ONLY — the
// on-screen keyboard and live MIDI. It is deliberately a SEPARATE module from
// synth.js so the protected Scales audio engine stays byte-for-byte frozen.
//
// Interface-compatible with Synth (drop-in): noteOn / noteOff / allNotesOff /
// panic / setVolume, plus a `ctx` field. app.js routes only the free-play
// keyboard press/release here; everything else (Scales "Listen", the scheduler,
// the startup flourish) still uses synth.js.
//
// Why this exists — the default synth voice is a triangle+sine pair, which is
// harmonically thin and tends to read as weak/plasticky on small speakers. This
// voice targets the three things that were wrong at once:
//   • THIN  → a custom harmonic PeriodicWave (a full stack of partials) plus a
//             faint detuned unison twin, so it has body and a bit of shimmer
//             like real strings rather than an organ tone.
//   • CHEAP → a short filtered-noise "knock" at the very onset supplies the
//             hammer transient a phone speaker leans on to hear "piano".
//   • CHOPPY/CUT-OUT → a fast attack into a continuous, pitch-dependent decay
//             (low notes ring longer) that mellows as it fades, instead of a
//             held plateau that stops abruptly.
//   • CRACKLY → every gain change is a ramp from/to a small epsilon, the tail
//             always fades to true zero before an oscillator stops, and a master
//             limiter catches dense-chord clipping.
//
// NOTE: the actual SOUND is judged on-device; this is built from acoustic
// principles, not auditioned in the build environment.

import { getAudioContext } from './audioContext.js';

const MIDI_A4 = 69;
const FREQ_A4 = 440;
const midiToFreq = (m) => FREQ_A4 * Math.pow(2, (m - MIDI_A4) / 12);

// Sine-phase partial magnitudes for the body oscillator (index 0 = DC = 0).
// A gently rolling series: strong fundamental, present low harmonics, soft top.
const PARTIALS = [0, 1.0, 0.60, 0.40, 0.26, 0.17, 0.11, 0.07, 0.045, 0.03, 0.02];

function buildPianoWave(ctx) {
  const imag = new Float32Array(PARTIALS);          // sine-phase partials
  const real = new Float32Array(PARTIALS.length);   // cosine terms all zero
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

// One shared short white-noise buffer; per-note BufferSources are spawned from it.
function buildNoise(ctx) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * 0.05)); // ~50ms
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** A single struck piano note: body oscillators + filter + envelope + attack knock. */
class PianoNote {
  constructor(ctx, dest, wave, noiseBuf, midi, velocity, when) {
    this.ctx = ctx;
    this.midi = midi;
    this.releasing = false;
    this.onended = null;

    const freq = midiToFreq(midi);
    const v = Math.min(127, Math.max(1, velocity)) / 127;
    const t0 = Math.max(when, ctx.currentTime);
    const p = Math.min(1, Math.max(0, (midi - 21) / 87)); // 0 (low) … 1 (high)

    // --- body: rich periodic wave + a faint detuned unison twin for warmth ---
    this.gain = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 0.5;

    this.oscA = ctx.createOscillator();
    this.oscA.setPeriodicWave(wave);
    this.oscA.frequency.value = freq;

    this.oscB = ctx.createOscillator();
    this.oscB.setPeriodicWave(wave);
    this.oscB.frequency.value = freq;
    this.oscB.detune.value = 3; // a few cents → gentle unison warmth

    const twin = ctx.createGain();
    twin.gain.value = 0.40;
    this.oscA.connect(this.gain);
    this.oscB.connect(twin);
    twin.connect(this.gain);
    this.gain.connect(this.filter);
    this.filter.connect(dest);

    // --- brightness: bright at the strike, mellowing as it decays; softer up high ---
    const fOpen = Math.max(520, 2300 + v * 3200 - p * 1100);
    const fClose = Math.max(360, 560 + v * 720);
    const cutClose = Math.min(fOpen, fClose);
    this.filter.frequency.setValueAtTime(cutClose, t0);
    this.filter.frequency.linearRampToValueAtTime(fOpen, t0 + 0.006);
    this.filter.frequency.exponentialRampToValueAtTime(cutClose, t0 + 0.35);

    // --- amplitude: fast attack → continuous pitch-dependent decay (no plateau) ---
    const peak = 0.05 + v * 0.30;
    const decayTo = Math.max(peak * 0.02, 0.0002);
    const decayLen = 4.5 - p * 3.0;            // low notes ring longer than high
    const g = this.gain.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + 0.007);                       // ~7ms attack — softer onset
    g.exponentialRampToValueAtTime(decayTo, t0 + 0.004 + decayLen);
    this._releaseTime = 0.22;

    // --- attack "knock": brief band-passed noise → the hammer transient ---
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 1100 + p * 1400;
    nf.Q.value = 0.5;
    const ng = ctx.createGain();
    const nPeak = (0.015 + v * 0.04) * (1 - p * 0.5); // gentle felt thud, not a click
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.linearRampToValueAtTime(nPeak, t0 + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0002, t0 + 0.045);
    noise.connect(nf); nf.connect(ng); ng.connect(dest);
    noise.start(t0);
    noise.stop(t0 + 0.06);
    this._noiseNodes = [noise, nf, ng];

    this.oscA.start(t0);
    this.oscB.start(t0);
  }

  /** Smooth release tail, then a guaranteed fade to true zero before stop. */
  release(when) {
    if (this.releasing) return;
    this.releasing = true;
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const g = this.gain.gain;
    const rel = this._releaseTime;
    if (typeof g.cancelAndHoldAtTime === 'function') {
      g.cancelAndHoldAtTime(t);
    } else {
      const held = Math.max(g.value, 0.0002);
      g.cancelScheduledValues(t);
      g.setValueAtTime(held, t);
    }
    const tailEnd = t + rel;
    const stopAt = tailEnd + 0.03;
    g.exponentialRampToValueAtTime(0.0008, tailEnd);
    g.linearRampToValueAtTime(0, stopAt);          // never stop on a non-zero sample
    this.oscA.stop(stopAt);
    this.oscB.stop(stopAt);
    this.oscA.onended = () => this._teardown();
  }

  /** Fast forced release for voice-stealing / retrigger / panic. */
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
      this._noiseNodes?.forEach((n) => { try { n.disconnect(); } catch { /* gone */ } });
    } catch { /* already gone */ }
    this.onended?.(this);
  }
}

export class PianoSynth {
  /**
   * @param {AudioContext} [ctx]  Shared context; defaults to the app singleton.
   * @param {object} [options]
   * @param {number} [options.maxPolyphony=32]
   * @param {number} [options.volume=0.8]  Master 0–1.
   */
  constructor(ctx = getAudioContext(), options = {}) {
    this.ctx = ctx;
    this.maxPolyphony = options.maxPolyphony ?? 32;

    this.master = ctx.createGain();
    this.master.gain.value = options.volume ?? 0.8;

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -8;
    this.limiter.knee.value = 8;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.2;

    this.master.connect(this.limiter);
    this.limiter.connect(ctx.destination);

    this._wave = buildPianoWave(ctx);
    this._noise = buildNoise(ctx);
    /** @type {PianoNote[]} live voices, oldest first. */
    this._voices = [];
  }

  noteOn(midi, velocity = 100, when = this.ctx.currentTime) {
    // Retrigger: gently steal a still-sounding copy of the SAME note first.
    for (let i = this._voices.length - 1; i >= 0; i--) {
      const vc = this._voices[i];
      if (vc.midi === midi && !vc.releasing) { vc.steal(this.ctx.currentTime); break; }
    }
    // Polyphony ceiling.
    while (this._voices.length >= this.maxPolyphony) {
      const victim = this._voices.shift();
      victim?.steal(this.ctx.currentTime);
    }
    const voice = new PianoNote(this.ctx, this.master, this._wave, this._noise, midi, velocity, when);
    voice.onended = (v) => {
      const i = this._voices.indexOf(v);
      if (i !== -1) this._voices.splice(i, 1);
    };
    this._voices.push(voice);
    return voice;
  }

  noteOff(midi, when = this.ctx.currentTime) {
    for (let i = this._voices.length - 1; i >= 0; i--) {
      const voice = this._voices[i];
      if (voice.midi === midi && !voice.releasing) { voice.release(when); return; }
    }
  }

  allNotesOff() {
    const now = this.ctx.currentTime;
    for (const voice of [...this._voices]) voice.release(now);
  }

  panic() {
    const now = this.ctx.currentTime;
    for (const voice of [...this._voices]) voice.steal(now);
  }

  setVolume(value) {
    const v = Math.min(1, Math.max(0, value));
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }
}

export { midiToFreq };
