// scheduler.js
//
// High-precision pulse scheduler built on the Web Audio clock (the "two clocks"
// pattern: a coarse setInterval *ticker* that looks ahead and schedules precise
// events against ctx.currentTime). Main-thread jitter never reaches the audio —
// it only affects how far ahead we schedule, not when things actually sound.
// That guarantee is the foundation the Resilience Index metrics stand on.
//
// METRICS HOOKS (consumed by resilienceEngine / sight-reading later)
//   onPulse / onBeat / onBar  — fire at schedule time, carrying the exact ctx
//                               time each pulse will sound, so a listener can
//                               line up audio (metronome) or visuals (playhead).
//   beatPositionAt(time)      — fractional beats elapsed at any ctx time; the
//                               continuous timeline used to measure deviation.
//   nearestBeat(time)         — closest beat + signed deviation in seconds,
//                               i.e. "how early/late was this input?".
//   These are tempo-change-safe via an anchored phase (see _reanchor).
//
// The scheduler emits at SUBDIVISION resolution (pulses per beat). With the
// default subdivision of 1, every pulse is a beat. Higher subdivisions let the
// metronome click eighths/triplets without changing the beat math.

const MIN_TEMPO = 30;
const MAX_TEMPO = 300;

export class Scheduler {
  /**
   * @param {AudioContext} ctx  Shared audio context.
   * @param {object} [options]
   * @param {number} [options.tempo=90]        BPM.
   * @param {number} [options.beatsPerBar=4]
   * @param {number} [options.subdivision=1]   Pulses per beat.
   * @param {number} [options.lookahead=0.025] Ticker interval (s).
   * @param {number} [options.scheduleAhead=0.1] How far ahead to schedule (s).
   */
  constructor(ctx, options = {}) {
    if (!ctx) throw new TypeError('Scheduler requires an AudioContext');
    this.ctx = ctx;

    this._tempo = clampTempo(options.tempo ?? 90);
    this.beatsPerBar = options.beatsPerBar ?? 4;
    this.subdivision = Math.max(1, options.subdivision ?? 1);
    this.lookahead = options.lookahead ?? 0.025;
    this.scheduleAhead = options.scheduleAhead ?? 0.1;

    this.running = false;
    this._timer = null;

    // Counters advance as pulses are scheduled.
    this._pulse = 0;        // total pulses scheduled
    this._nextPulseTime = 0; // ctx time of the next pulse to schedule

    // Anchored phase for tempo-safe position queries.
    this._anchorTime = 0;   // ctx time at the anchor
    this._anchorBeats = 0;  // fractional beats elapsed at the anchor

    /** @type {Record<string, Set<Function>>} */
    this._listeners = { pulse: new Set(), beat: new Set(), bar: new Set(), tempo: new Set() };

    this._tick = this._tick.bind(this);
  }

  /* ---- Tempo ---------------------------------------------------------- */

  get tempo() { return this._tempo; }
  get secondsPerBeat() { return 60 / this._tempo; }
  get secondsPerPulse() { return this.secondsPerBeat / this.subdivision; }

  /**
   * Change tempo. Safe to call while running — the beat timeline stays
   * continuous because we re-anchor the phase at the moment of change.
   * @param {number} bpm
   */
  setTempo(bpm) {
    const next = clampTempo(bpm);
    if (next === this._tempo) return;
    this._reanchor();
    this._tempo = next;
    emit(this._listeners.tempo, this._tempo);   // notify UI (two-way binding)
  }

  /**
   * Tempo Climb: nudge tempo up (or down) by a step, clamped. Returns the new
   * tempo so the caller can reflect it in the UI.
   * @param {number} [delta=5]
   * @returns {number}
   */
  bumpTempo(delta = 5) {
    this.setTempo(this._tempo + delta);
    return this._tempo;
  }

  /* ---- Transport ------------------------------------------------------ */

  /** Start (or restart) the pulse train from beat 0. */
  start() {
    if (this.running) return;
    this.running = true;
    const t0 = this.ctx.currentTime + 0.06; // small offset so the first pulse isn't late
    this._pulse = 0;
    this._nextPulseTime = t0;
    this._anchorTime = t0;
    this._anchorBeats = 0;
    this._timer = setInterval(this._tick, this.lookahead * 1000);
    this._tick(); // schedule the leading edge immediately
  }

  /** Stop the pulse train. Does not affect the synth. */
  stop() {
    this.running = false;
    if (this._timer != null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  toggle() { this.running ? this.stop() : this.start(); }

  /* ---- Subscriptions -------------------------------------------------- */

  /** Every pulse (subdivision tick). @returns unsubscribe */
  onPulse(fn) { return this._sub('pulse', fn); }
  /** Beats only. @returns unsubscribe */
  onBeat(fn) { return this._sub('beat', fn); }
  /** Bar downbeats only. @returns unsubscribe */
  onBar(fn) { return this._sub('bar', fn); }
  /** Tempo changes (from any source: slider, steppers, Tempo Climb). @returns unsubscribe */
  onTempo(fn) { return this._sub('tempo', fn); }

  _sub(kind, fn) {
    this._listeners[kind].add(fn);
    return () => this._listeners[kind].delete(fn);
  }

  /* ---- Timeline queries (metrics) ------------------------------------ */

  /**
   * Fractional beats elapsed since start at a given ctx time. Continuous and
   * tempo-change-safe. Negative before start; grows at the current rate.
   * @param {number} [time=ctx.currentTime]
   * @returns {number}
   */
  beatPositionAt(time = this.ctx.currentTime) {
    return this._anchorBeats + (time - this._anchorTime) / this.secondsPerBeat;
  }

  /** Inverse of beatPositionAt: ctx time at a fractional beat position. */
  timeAtBeat(beats) {
    return this._anchorTime + (beats - this._anchorBeats) * this.secondsPerBeat;
  }

  /**
   * The beat nearest a given time, with how far off the time was. Deviation is
   * signed seconds: negative = early (ahead of the beat), positive = late.
   * This is the primitive the Resilience Index uses for Pulse Stability and to
   * count "Beats to Re-Sync".
   * @param {number} [time=ctx.currentTime]
   * @returns {{ beat:number, beatTime:number, deviation:number, deviationBeats:number }}
   */
  nearestBeat(time = this.ctx.currentTime) {
    const pos = this.beatPositionAt(time);
    const beat = Math.round(pos);
    const beatTime = this.timeAtBeat(beat);
    const deviation = time - beatTime;
    return { beat, beatTime, deviation, deviationBeats: pos - beat };
  }

  /* ---- The look-ahead loop -------------------------------------------- */

  _tick() {
    if (!this.running) return;
    const horizon = this.ctx.currentTime + this.scheduleAhead;
    // Schedule every pulse that falls inside the look-ahead window. Recomputing
    // the step each iteration means a mid-window tempo change applies cleanly.
    while (this._nextPulseTime < horizon) {
      this._dispatch(this._pulse, this._nextPulseTime);
      this._pulse += 1;
      this._nextPulseTime += this.secondsPerPulse;
    }
  }

  /**
   * Build the pulse descriptor and notify listeners. Listeners receive the
   * precise ctx time the pulse will sound — they should schedule against it,
   * not against currentTime.
   */
  _dispatch(pulseIndex, time) {
    const sub = this.subdivision;
    const beatIndex = Math.floor(pulseIndex / sub);
    const subdivisionIndex = pulseIndex % sub;
    const isBeat = subdivisionIndex === 0;
    const beatInBar = ((beatIndex % this.beatsPerBar) + this.beatsPerBar) % this.beatsPerBar;
    const barIndex = Math.floor(beatIndex / this.beatsPerBar);
    const isDownbeat = isBeat && beatInBar === 0;

    const info = {
      time,
      tempo: this._tempo,
      pulseIndex,
      subdivisionIndex,
      beatIndex,
      beatInBar,
      barIndex,
      isBeat,
      isDownbeat,
      secondsPerBeat: this.secondsPerBeat,
    };

    emit(this._listeners.pulse, info);
    if (isBeat) emit(this._listeners.beat, info);
    if (isDownbeat) emit(this._listeners.bar, info);
  }

  /** Snapshot current phase into the anchor so a rate change stays continuous. */
  _reanchor() {
    const now = this.ctx.currentTime;
    this._anchorBeats = this.beatPositionAt(now);
    this._anchorTime = now;
  }
}

/* --------------------------------------------------------------------------- */

function emit(set, info) {
  for (const fn of set) {
    try { fn(info); } catch (err) { console.error('Scheduler listener threw:', err); }
  }
}

function clampTempo(bpm) {
  const n = Number(bpm);
  if (!Number.isFinite(n)) return 90;
  return Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, Math.round(n)));
}

export { MIN_TEMPO, MAX_TEMPO };
