// courseVoice.js — Course-only SAMPLED teaching voice for KeyMaster PRO.
// =============================================================================
// rc2-105 — REBUILT as a small sampled piano layer (buffer playback).
//
// Why this replaces the oscillator version: after clean single-oscillator
// attempts still crackled and "doubled" on tablet during demo sequences, the
// fault was the live per-note node graph (oscillator + filter + envelope, ×N
// overlapping notes) underrunning the audio thread, plus notes summing. This
// engine removes all of that:
//
//   • Each note is ONE AudioBufferSourceNode playing a pre-rendered sample.
//     No live oscillator, no per-note filter, no filter sweep → nothing to
//     underrun and nothing to zipper.
//   • The samples are pre-rendered with a soft attack and a baked final fade to
//     TRUE zero, so onset and tail are click-free by construction.
//   • Nearest-sample selection + small repitch (≤2 semitones) via playbackRate.
//   • Polyphony with hard, immediate cancellation for "Hear it again".
//   • Routed through the ONE shared safety-limited bus (audioBus.js).
//
// The samples (audio/course/note-*.mp3) are 100% original — rendered offline by
// KeyMaster's own tooling, no third-party library — so there is no licensing
// constraint. synth.js / scaleEngine.js (protected Scales) are NOT touched.
// =============================================================================

import { getMasterBus } from './audioBus.js';

const SAMPLE_MIDIS = [36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96];
const SAMPLE_PATH = (m) => `audio/course/note-${m}.mp3`;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const nearestSample = (midi) =>
  SAMPLE_MIDIS.reduce((best, m) => (Math.abs(m - midi) < Math.abs(best - midi) ? m : best), SAMPLE_MIDIS[0]);

export function createCourseVoice(ctx, opts = {}) {
  if (!ctx || typeof ctx.createBufferSource !== 'function') {
    return { note() { return { release() {} }; }, tick() {}, preload() {}, get ready() { return false; }, get ctx() { return null; } };
  }

  const master = ctx.createGain();
  master.gain.value = (typeof opts.volume === 'number') ? opts.volume : 0.9;
  try { master.connect(getMasterBus(ctx)); } catch (_) { master.connect(ctx.destination); }

  /** @type {Map<number, AudioBuffer>} decoded sample buffers keyed by sample midi */
  const buffers = new Map();
  /** @type {Set<{stop:(t:number)=>void}>} live voices, for hard cancellation */
  const active = new Set();
  let loadStarted = false;
  let loadDone = false;

  async function loadOne(m) {
    try {
      const res = await fetch(SAMPLE_PATH(m));
      if (!res.ok) return;
      const arr = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);
      buffers.set(m, buf);
    } catch (_) { /* leave missing; note() falls back to nearest loaded */ }
  }

  function preload() {
    if (loadStarted) return;
    loadStarted = true;
    Promise.all(SAMPLE_MIDIS.map(loadOne)).then(() => { loadDone = true; });
  }
  preload(); // kick off immediately on construction

  // pick the loaded buffer nearest to the requested midi
  function pickBuffer(midi) {
    if (buffers.has(nearestSample(midi))) return nearestSample(midi);
    let best = null, bestD = Infinity;
    for (const m of buffers.keys()) { const d = Math.abs(m - midi); if (d < bestD) { bestD = d; best = m; } }
    return best;
  }

  function note(midi, o = {}) {
    const t0 = (typeof o.when === 'number') ? Math.max(o.when, ctx.currentTime) : ctx.currentTime;
    const vel = clamp(o.velocity ?? 58, 1, 127);
    const level = 0.30 + (vel / 127) * 0.55;
    const sampleMidi = pickBuffer(midi);
    if (sampleMidi == null) return { release() {} }; // not loaded yet → silent (no robot fallback)

    const src = ctx.createBufferSource();
    src.buffer = buffers.get(sampleMidi);
    src.playbackRate.value = Math.pow(2, (midi - sampleMidi) / 12);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(level, t0 + 0.004);   // 4ms ramp-in (sample already has soft attack)

    src.connect(g); g.connect(master);
    src.start(t0);

    let stopped = false;
    const voice = {
      stop(at) {
        if (stopped) return; stopped = true;
        const r = Math.max(at ?? ctx.currentTime, ctx.currentTime);
        try {
          g.gain.cancelScheduledValues(r);
          const cur = Math.max(g.gain.value, 0.0006);
          g.gain.setValueAtTime(cur, r);
          g.gain.linearRampToValueAtTime(0, r + 0.05);   // 50ms fade-out → no tail click
          src.stop(r + 0.06);
        } catch (_) { try { src.stop(); } catch (__) {} }
        active.delete(voice);
      },
      release(at) { this.stop(at); },
    };
    src.onended = () => { active.delete(voice); try { src.disconnect(); g.disconnect(); } catch (_) {} };
    active.add(voice);
    return voice;
  }

  // Immediately silence every sounding note (used before re-playing a demo).
  function cancelAll() {
    const now = ctx.currentTime;
    for (const v of [...active]) v.stop(now);
  }

  // Clean metronome tick — one short pre-shaped blip (kept tiny; not the source
  // of the demo crackle). Single triangle, true-zero start/stop.
  function tick(accent = false, when) {
    const t0 = (typeof when === 'number') ? Math.max(when, ctx.currentTime) : ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = accent ? 1760 : 1320;
    const g = ctx.createGain();
    const peak = accent ? 0.12 : 0.09;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.085);
    g.gain.linearRampToValueAtTime(0, t0 + 0.10);
    osc.connect(g); g.connect(master);
    osc.start(t0);
    try { osc.stop(t0 + 0.12); } catch (_) {}
  }

  return { note, tick, preload, cancelAll, get ready() { return loadDone; }, get ctx() { return ctx; } };
}
