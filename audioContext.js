// audioContext.js
//
// One shared AudioContext for the whole app. The synth and the scheduler MUST
// run on the same context: their timing is only comparable because they read
// the same hardware clock (ctx.currentTime). Two contexts = two clocks = the
// pulse-stability and re-sync metrics become meaningless. So everything audio
// pulls its context from here.
//
// Also centralises the autoplay rule: browsers start an AudioContext in the
// "suspended" state until a user gesture. unlockAudio() is safe to call on any
// gesture (pointerdown, keydown, the first key press) and is idempotent.

/** @type {AudioContext | null} */
let ctx = null;

/**
 * Get (lazily creating) the shared AudioContext.
 * @param {AudioContextOptions} [options]
 * @returns {AudioContext}
 */
export function getAudioContext(options = { latencyHint: 'interactive' }) {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) {
    throw new Error('Web Audio API is not available in this browser.');
  }
  ctx = new Ctor(options);
  return ctx;
}

/** @returns {boolean} whether Web Audio exists at all. */
export function isAudioSupported() {
  return Boolean(window.AudioContext || window.webkitAudioContext);
}

/**
 * Resume the context from within a user gesture. Returns a promise that
 * resolves once running (or immediately if already running / unsupported).
 * @returns {Promise<boolean>} true if the context is running afterwards.
 */
export async function unlockAudio() {
  if (!isAudioSupported()) return false;
  const context = getAudioContext();
  if (context.state === 'running') return true;
  try {
    await context.resume();
  } catch {
    /* gesture wasn't sufficient yet; the next one will retry */
  }
  return context.state === 'running';
}

/**
 * Map a performance.now() timestamp (as DOM/MIDI events report) onto the audio
 * clock, so input-timing metrics can be measured against scheduled beats.
 * Uses getOutputTimestamp() when available for an accurate cross-clock anchor,
 * falling back to a direct offset.
 * @param {number} perfMs  A performance.now()-based timestamp in milliseconds.
 * @returns {number} The equivalent ctx.currentTime value (seconds).
 */
export function perfToContextTime(perfMs) {
  const context = getAudioContext();
  const ts = context.getOutputTimestamp?.();
  if (ts && ts.performanceTime != null && ts.contextTime != null) {
    return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
  }
  // Fallback: assume now() and currentTime were sampled together.
  return context.currentTime + (perfMs - performance.now()) / 1000;
}
