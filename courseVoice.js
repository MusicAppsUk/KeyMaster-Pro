// courseVoice.js — Course-only audio voice for KeyMaster PRO.
// =============================================================================
// A small, ORIGINAL Web-Audio voice used ONLY by the Course (Master Training)
// for two jobs:
//   1. the tutor's note DEMONSTRATION tone (the "watch this" playback), and
//   2. a soft METRONOME tick during pulse / count-in exercises.
//
// Why this exists (rc2-81): the Course previously borrowed the shared Scales
// synth's 'demo' voice. That synth (synth.js) is the protected Scales audio and
// must not be modified. This module gives the Course its own warmer, clearer,
// less "plinky" demonstration tone WITHOUT touching synth.js at all. It reuses
// the app's existing AudioContext (passed in) — it does NOT open a second
// context, so there is no extra latency or audio-routing risk.
//
// Boundaries:
//   • synth.js / scaleEngine.js (Scales audio) are NOT imported or touched here.
//   • The learner's own key-press tone still comes from the shared keyboard synth;
//     aligning that timbre is deferred to the later premium-sound package, since
//     it would mean changing the protected keyboard/synth routing.
//   • A true sampled piano is deferred to the premium-sound package (size/risk).
//
// Design goals for the demo tone: warm attack (no click), clear pitch identity,
// gentle piano-like decay, soft separation between repeated notes (tiny per-note
// variation so identical notes don't sound mechanical), and conservative gain so
// overlapping notes never clip.
// =============================================================================

const A4 = 440;
const midiToFreq = (m) => A4 * Math.pow(2, (m - 69) / 12);

export function createCourseVoice(ctx, opts = {}) {
  // No context → a silent no-op object, so callers never need to guard.
  if (!ctx || typeof ctx.createGain !== 'function') {
    return {
      note() { return { release() {} }; },
      tick() {},
      get ctx() { return null; },
    };
  }

  const master = ctx.createGain();
  master.gain.value = (typeof opts.volume === 'number') ? opts.volume : 0.85;
  // A gentle ceiling keeps overlapping demo notes well clear of clipping.
  master.connect(ctx.destination);

  const rand = (a, b) => a + Math.random() * (b - a);

  /**
   * Play one demonstration note.
   * @param {number} midi
   * @param {object} o   { when?:sec, dur?:sec, velocity?:0..127 }
   * @returns {{release:(t?:number)=>void}}
   */
  function note(midi, o = {}) {
    const t0 = (typeof o.when === 'number') ? o.when : ctx.currentTime;
    const dur = Math.max(0.18, (typeof o.dur === 'number') ? o.dur : 0.6);
    const vel = Math.max(1, Math.min(127, o.velocity ?? 58));
    const level = 0.10 + (vel / 127) * 0.16;   // conservative per-note level

    const f = midiToFreq(midi);

    // ---- Three quiet partials make a warm, clear-pitched, un-plinky tone ----
    // osc1: triangle fundamental (warm body)
    // osc2: triangle, a few cents detuned (subtle chorus → less sterile/repetitive)
    // osc3: sine an octave up, low gain (pitch clarity without harsh edge)
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const o3 = ctx.createOscillator();
    o1.type = 'triangle'; o2.type = 'triangle'; o3.type = 'sine';
    const detune = rand(-4, 4);            // tiny per-note variation
    o1.frequency.value = f;
    o2.frequency.value = f;
    o2.detune.value = 6 + detune;          // gentle warmth
    o3.frequency.value = f * 2;
    o1.detune.value = detune;

    const o3gain = ctx.createGain();
    o3gain.gain.value = 0.22;              // octave shimmer kept subtle

    // ---- Gentle low-pass with a small "bloom" envelope → piano-like opening ---
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.7;
    const openHz = Math.min(4200, Math.max(1400, f * 6));
    const settleHz = Math.min(2600, Math.max(900, f * 3));
    lp.frequency.setValueAtTime(openHz, t0);
    lp.frequency.exponentialRampToValueAtTime(settleHz, t0 + 0.28);

    // ---- Amplitude envelope: soft attack (no click), natural decay ----------
    const amp = ctx.createGain();
    const peak = level * rand(0.94, 1.0);  // ±a touch of level variation
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);     // ~12ms warm attack
    amp.gain.exponentialRampToValueAtTime(peak * 0.34, t0 + dur * 0.9); // piano-like decay

    o1.connect(lp); o2.connect(lp); o3.connect(o3gain); o3gain.connect(lp);
    lp.connect(amp); amp.connect(master);

    o1.start(t0); o2.start(t0); o3.start(t0);
    let stopped = false;
    const stopAt = (t) => {
      if (stopped) return; stopped = true;
      try { o1.stop(t); o2.stop(t); o3.stop(t); } catch (_) { /* already stopped */ }
    };
    // natural end if never explicitly released
    stopAt(t0 + dur + 0.4);

    return {
      release(at) {
        const r = (typeof at === 'number') ? Math.max(at, ctx.currentTime) : ctx.currentTime;
        try {
          amp.gain.cancelScheduledValues(r);
          const cur = Math.max(0.0002, amp.gain.value);
          amp.gain.setValueAtTime(cur, r);
          amp.gain.exponentialRampToValueAtTime(0.0006, r + 0.10); // clean fade → no end click
        } catch (_) { /* no-op */ }
        stopAt(r + 0.14);
      },
    };
  }

  /**
   * Soft metronome click. Pitched (not noise) so it stays clean, never harsh.
   * @param {boolean} accent  downbeat → a touch higher/louder
   * @param {number}  when    schedule time (default now)
   */
  function tick(accent = false, when) {
    const t0 = (typeof when === 'number') ? when : ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = accent ? 1850 : 1320;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = accent ? 3200 : 2400; lp.Q.value = 0.6;
    const g = ctx.createGain();
    const peak = accent ? 0.16 : 0.11;     // unobtrusive
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);   // quick but not clicky
    g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.075); // short, soft decay
    o.connect(lp); lp.connect(g); g.connect(master);
    o.start(t0);
    try { o.stop(t0 + 0.10); } catch (_) { /* no-op */ }
  }

  return { note, tick, get ctx() { return ctx; } };
}
