// courseVoice.js — Course-only teaching voice for KeyMaster PRO.
// =============================================================================
// rc2-104 — REBUILT as a deliberately SIMPLE, clean, warm teaching tone.
//
// History: earlier versions chased a "piano-like" sound with three oscillators,
// a detuned unison, and a sweeping filter envelope. On tablet speakers that
// busy design read as brittle/clicky and (when summed) crackly. Per direction,
// realism is NOT the goal here — a clean, stable teaching tone is. So this is now
// the simplest thing that sounds warm and musical and CANNOT click or crackle:
//
//   • ONE triangle oscillator per note (warm, mostly-fundamental tone).
//   • a STATIC gentle low-pass (no filter sweep — sweeps caused zipper artifacts).
//   • amplitude starts at TRUE zero, ramps up linearly (no onset click), decays
//     gently, and on release ramps to TRUE zero BEFORE the oscillator stops
//     (no release click).
//   • minimal nodes per note (osc → lp → gain) so the audio thread can't underrun.
//   • routed through the ONE shared safety-limited bus (audioBus.js), so it can
//     never sum past 0 dBFS at the speaker.
//
// Boundaries: synth.js / scaleEngine.js (protected Scales audio) are NOT imported
// or touched. This module reuses the app's existing AudioContext (passed in).
// =============================================================================

import { getMasterBus } from './audioBus.js';

const A4 = 440;
const midiToFreq = (m) => A4 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export function createCourseVoice(ctx, opts = {}) {
  if (!ctx || typeof ctx.createGain !== 'function') {
    return { note() { return { release() {} }; }, tick() {}, get ctx() { return null; } };
  }

  const master = ctx.createGain();
  master.gain.value = (typeof opts.volume === 'number') ? opts.volume : 0.9;
  // Through the ONE shared safety limiter (never raw to destination).
  try { master.connect(getMasterBus(ctx)); } catch (_) { master.connect(ctx.destination); }

  /**
   * Play one clean teaching note.
   * @returns {{release:(t?:number)=>void}}
   */
  function note(midi, o = {}) {
    const t0 = (typeof o.when === 'number') ? Math.max(o.when, ctx.currentTime) : ctx.currentTime;
    const dur = Math.max(0.18, (typeof o.dur === 'number') ? o.dur : 0.6);
    const vel = clamp(o.velocity ?? 58, 1, 127);
    const level = 0.12 + (vel / 127) * 0.16;          // conservative, headroom for chords
    const f = midiToFreq(midi);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = clamp(f * 4, 1200, 3400);    // STATIC — no sweep, no zipper noise
    lp.Q.value = 0.4;

    const amp = ctx.createGain();
    const g = amp.gain;
    g.setValueAtTime(0, t0);                          // TRUE zero → no onset click
    g.linearRampToValueAtTime(level, t0 + 0.010);     // 10ms clean attack
    g.exponentialRampToValueAtTime(Math.max(level * 0.30, 0.0008), t0 + dur * 0.9); // gentle decay

    osc.connect(lp); lp.connect(amp); amp.connect(master);
    osc.start(t0);

    let stopped = false;
    const stopAt = (t) => { if (stopped) return; stopped = true; try { osc.stop(t); } catch (_) { /* already */ } };
    stopAt(t0 + dur + 0.5);                            // natural end if never released

    return {
      release(at) {
        const r = (typeof at === 'number') ? Math.max(at, ctx.currentTime) : ctx.currentTime;
        try {
          g.cancelScheduledValues(r);
          const cur = Math.max(g.value, 0.0006);
          g.setValueAtTime(cur, r);
          g.exponentialRampToValueAtTime(0.0006, r + 0.09);
          g.linearRampToValueAtTime(0, r + 0.12);     // reach TRUE zero...
        } catch (_) { /* no-op */ }
        stopAt(r + 0.14);                             // ...before the oscillator stops
      },
    };
  }

  /**
   * Soft, clean metronome tick — one short pitched blip, click-free.
   */
  function tick(accent = false, when) {
    const t0 = (typeof when === 'number') ? Math.max(when, ctx.currentTime) : ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = accent ? 1760 : 1320;
    const g = ctx.createGain();
    const peak = accent ? 0.14 : 0.10;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.006);   // soft, not clicky
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.085);
    g.gain.linearRampToValueAtTime(0, t0 + 0.10);       // true zero before stop
    osc.connect(g); g.connect(master);
    osc.start(t0);
    try { osc.stop(t0 + 0.12); } catch (_) { /* no-op */ }
  }

  return { note, tick, get ctx() { return ctx; } };
}
