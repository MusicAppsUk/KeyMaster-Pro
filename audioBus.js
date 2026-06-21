// audioBus.js
//
// ONE shared output chain for every sound engine in the app.
//
// Before this, three engines each connected straight to ctx.destination:
//   • Synth (Course demos, Scales Listen/Practice, scheduler)  → destination
//   • PianoSynth (free-play keypress)                          → destination
//   • Metronome (count-in / pulse click)                       → destination
// Their signals summed at the speaker with no shared ceiling, so dense chords
// or an overlap (demo + keypress, flourish + first note, click + note) could
// push the sum past 0 dBFS and DIGITALLY CLIP — heard as crackle/pop.
//
// Now every engine feeds this single bus, which passes through ONE transparent
// safety limiter before the speakers. Below ~-1.5 dBFS it does nothing; only the
// rare summed peak is caught, so normal tone is unchanged but clipping can't occur.
//
// IMPORTANT: this does NOT modify any engine. app.js reconnects each engine's
// existing output node to this bus from the outside (synth.js stays byte-frozen).

import { getAudioContext } from './audioContext.js';

let _bus = null;
let _ctx = null;

/** Lazily build (once per context) the shared bus → safety limiter → destination. */
export function getMasterBus(ctx = getAudioContext()) {
  if (_bus && _ctx === ctx) return _bus;
  _ctx = ctx;

  const bus = ctx.createGain();
  bus.gain.value = 1.0;

  // Transparent brick-wall-ish safety limiter: engages only near full scale.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1.5;   // only the top ~1.5 dB is touched
  limiter.knee.value = 0;           // hard knee — a true safety ceiling, not tone-shaping
  limiter.ratio.value = 20;         // effectively a limiter
  limiter.attack.value = 0.002;     // catch transients
  limiter.release.value = 0.10;

  bus.connect(limiter);
  limiter.connect(ctx.destination);

  _bus = bus;
  return bus;
}

/**
 * Reconnect an engine's output node so it feeds the shared bus instead of the
 * destination. Safe to call once per engine after construction.
 * @param {AudioNode} node  the engine's final output node (e.g. synth.limiter)
 */
export function routeToMasterBus(node, ctx = getAudioContext()) {
  if (!node) return false;
  const bus = getMasterBus(ctx);
  try { node.disconnect(); } catch { /* had no connections */ }
  try { node.connect(bus); return true; } catch { return false; }
}

/** For diagnostics: is the shared bus built yet? */
export function masterBusReady() { return !!_bus; }
