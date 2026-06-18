// app.js
//
// Central orchestrator for KeyMaster PRO.
//
// Responsibilities (and deliberately nothing more):
//   • own global application state via a tiny observable store
//   • boot the shared instrument once (PianoEngine → Viewport → MidiRouter)
//   • route between the two entry points (Scales / Sight-Reading) + launcher
//   • own the chrome that is common to every view (register readout, octave
//     shift, MIDI pill)
//
// Pedagogy and rendering for each vector live in their own domain controllers,
// which this file lazy-loads. The orchestrator never imports scale logic,
// notation, or harmony directly — it hands each controller the instrument and
// the store and lets the domain own its screen.

import { PianoEngine, PIANO_MIN_MIDI, PIANO_MAX_MIDI } from './pianoEngine.js';
import { Viewport } from './viewport.js';
import { MidiRouter } from './midiRouter.js';
import { getAudioContext, unlockAudio, isAudioSupported } from './audioContext.js';
import { runWelcomeExperience, getDisplayName, flourishEnabled } from './welcomeExperience.js';
import { Synth } from './synth.js';
import { Scheduler } from './scheduler.js';
import { Metronome } from './metronome.js';
import { NoteInput } from './noteInput.js';
import { createMidiEvaluator } from './midiEvaluator.js';
import { createDevReadout, isDevMode } from './devReadout.js';

/* ===========================================================================
 * 1. Observable store
 * ========================================================================= */

/**
 * Minimal reactive store. setState shallow-merges and notifies subscribers.
 * Kept tiny on purpose: no framework, no dependencies, fully inspectable.
 * @template T
 * @param {T} initial
 */
function createStore(initial) {
  let state = { ...initial };
  const subscribers = new Set();

  return {
    getState: () => state,
    /**
     * @param {Partial<T> | ((s: T) => Partial<T>)} patch
     */
    setState(patch) {
      const delta = typeof patch === 'function' ? patch(state) : patch;
      const next = { ...state, ...delta };
      // Skip notification if nothing actually changed (shallow compare).
      let changed = false;
      for (const k in delta) {
        if (state[k] !== next[k]) { changed = true; break; }
      }
      state = next;
      if (changed) for (const fn of subscribers) safe(fn, state);
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}

/** Run a callback without letting one throw break the others. */
function safe(fn, arg) {
  try { fn(arg); } catch (err) { console.error('store subscriber threw:', err); }
}

/* ===========================================================================
 * 2. Lightweight persistence (preferences only)
 * ========================================================================= */

const PREFS_KEY = 'keymaster.prefs.v1';

/** Load persisted prefs, tolerating private-mode / disabled storage. */
function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Persist a whitelisted subset of state. */
function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — preferences simply won't persist this session */
  }
}

/* ===========================================================================
 * 3. View registry (lazy-loaded domain controllers)
 * ========================================================================= */

/**
 * Each vector points to a controller module loaded on first entry. A controller
 * default-exports a factory:
 *
 *   export default function createView({ mount, store, keyboard, viewport }) {
 *     return { enter() {}, exit() {}, destroy() {} };
 *   }
 *
 * Until a controller exists, the orchestrator renders a calm placeholder so the
 * shell stays usable and the keyboard remains playable.
 */
const VIEW_REGISTRY = {
  scales: {
    slot: 'scales',
    load: () => import('./scalesMasterclass.js?v=rc2-29'),
  },
  sightreading: {
    slot: 'sightreading',
    load: () => import('./sightReading.js?v=rc2-29'),
  },
  chords: {
    slot: 'chords',
    load: () => import('./chordMasterclass.js?v=rc2-29'),
  },
};

/** Routes that map a hash to a view id. Unknown hashes fall back to home. */
const ROUTES = {
  '': 'home',
  '/': 'home',
  '/scales': 'scales',
  '/sightreading': 'sightreading',
  '/chords': 'chords',
};

/**
 * Per-module on-screen-keyboard DEFAULT visibility (presentation only).
 * Sight-Reading and Scales favour a focused view (keyboard hidden so the staff
 * fills the screen); Chord Trainer shows the keyboard guide by default so chord
 * shapes, spacing and construction are visible. `true` = hidden by default.
 * A module's manual toggle is remembered independently under localStorage
 * `kbHidden:<viewId>` and overrides its default.
 */
const KEYBOARD_HIDDEN_DEFAULT = {
  home: false,
  scales: true,
  sightreading: true,
  chords: false,
};

/**
 * Per-module fingering-number DEFAULT visibility (presentation only). `true` =
 * hidden by default. Every module defaults to fingering ON (shown) so current
 * behaviour is preserved; the learner can hide it per module and the choice is
 * remembered under localStorage `fingerHidden:<viewId>`. The fingering engine,
 * assigned data, scoring and MIDI are never affected — only painting.
 */
const FINGERING_HIDDEN_DEFAULT = {
  home: false,
  scales: false,
  sightreading: false,
  chords: false,
};

/**
 * Human module names for the breadcrumb. Adding a future module here (plus its
 * ROUTES entry) gives it a "Modules › <Name>" crumb automatically — no module
 * code required. A module with internal levels can publish a deeper trail via
 * the optional `ctx.nav` helper.
 */
const MODULE_NAME = {
  scales: 'Scales Masterclass',
  sightreading: 'Cognitive Sight-Reading',
  chords: 'Chord Masterclass',
};

/* ===========================================================================
 * 4. The application
 * ========================================================================= */

class KeyMasterApp {
  constructor(root = document) {
    this.root = root;
    this.store = createStore({
      view: 'home',
      midi: { ok: false, label: 'No MIDI' },
      register: '',
      ...pickPrefs(loadPrefs()),
    });

    /** @type {Map<string, {controller?: object, instance?: object}>} */
    this.views = new Map();
    this._unsubs = [];
  }

  /* --------------------------------------------------------------------- */

  async boot() {
    this._cacheDom();
    this._bootInstrument();
    this._wireChrome();
    this._wireRouter();
    // Apply the per-module keyboard default for the INITIAL route before reveal
    // (avoids a flash of the wrong layout on deep links / reload).
    try {
      const initialView = ROUTES[location.hash.replace(/^#/, '')] ?? 'home';
      this._applyKeyboardPref(this._resolveKeyboardHidden(initialView));
      document.documentElement.setAttribute('data-view', initialView);
      this._applyFingeringPref(this._resolveFingeringHidden(initialView));
    } catch { /* ignore */ }
    await this._connectMidiSilently();

    // Reveal the shell now that everything is wired.
    document.documentElement.setAttribute('data-boot', 'ready');

    // Enter whatever route the URL points at (deep links work on first load).
    await this._handleRoute();

    // Experience layer: brief synchronized welcome over the dashboard. Fire and
    // forget — it must never block or break boot.
    this._runWelcome();
  }

  /**
   * Show the opening welcome (visual greeting + B-major flourish), then dissolve
   * into the dashboard. The flourish is attempted at the synchronized moment; if
   * audio is still autoplay-locked, the first user gesture plays it instead.
   */
  _runWelcome() {
    try {
      runWelcomeExperience({
        displayName: getDisplayName(),
        onFlourish: () => { try { unlockAudio(); } catch { /* ignore */ } this._playFlourish(); },
      });
    } catch { /* experience layer must never break boot */ }
  }

  /* ---- DOM ------------------------------------------------------------- */

  _cacheDom() {
    this.dom = {
      viewRoot: this.root.getElementById('view-root'),
      keyboardMount: this.root.getElementById('keyboard-mount'),
      register: this.root.getElementById('register-readout'),
      midiPill: this.root.getElementById('midi-pill'),
      breadcrumb: this.root.getElementById('breadcrumb'),
      views: new Map(
        [...this.root.querySelectorAll('[data-view]')].map((el) => [el.dataset.view, el])
      ),
      slots: new Map(
        [...this.root.querySelectorAll('[data-slot]')].map((el) => [el.dataset.slot, el])
      ),
    };
  }

  /* ---- Instrument ------------------------------------------------------ */

  _bootInstrument() {
    const prefs = loadPrefs();
    this.keyboard = new PianoEngine(this.dom.keyboardMount, {
      accidental: prefs.accidental === 'flat' ? 'flat' : 'sharp',
      showLabels: Boolean(prefs.showLabels),
    });
    this.viewport = new Viewport(this.keyboard, {
      octaves: 4,
      startMidi: clampStart(prefs.startMidi ?? 48), // C3 default
    });
    this.midi = new MidiRouter(this.keyboard);

    // ---- Input hub: one normalized note stream for every device ----
    this.input = new NoteInput();
    this._wireInput();

    // ---- Centralized MIDI evaluation controller (single source of truth for
    //      note correctness; paints keyboard + active staff in lock-step). ----
    this.evaluator = createMidiEvaluator({ input: this.input, keyboard: this.keyboard });

    // ---- TEMPORARY dev validation tooling (no-op unless ?dev / km_dev) ----
    if (isDevMode()) {
      this.devReadout = createDevReadout({ evaluator: this.evaluator });
    }

    // ---- Audio layer (shared context → synth + transport) ----
    if (isAudioSupported()) {
      const ctx = getAudioContext();
      this.synth = new Synth(ctx, { volume: 0.8 });
      this.scheduler = new Scheduler(ctx, { tempo: 90, beatsPerBar: 4 });
      this.metronome = new Metronome(this.scheduler, { volume: 0.55, enabled: false });
      this._wireSound();
    } else {
      // Silent fallback: the keyboard still works visually.
      this.synth = this.scheduler = this.metronome = null;
    }

    // Reflect the live window into the header readout.
    this._refreshRegister();
  }

  /**
   * Feed concrete devices into the normalized input hub. Each physical action
   * must produce exactly one event:
   *  • on-screen keyboard → forward 'press' events that did NOT originate from
   *    MIDI (the router drives the on-screen keys for MIDI input, so those would
   *    otherwise double-fire).
   *  • Web MIDI → forward the router's own note-on, which carries real velocity.
   */
  _wireInput() {
    this._unsubs.push(
      this.keyboard.on('press', (midi, detail) => {
        if (detail.source === 'midi') return; // counted via the MIDI path below
        this.input.emit({
          midiNote: midi,
          velocity: detail.velocity ?? 100,
          timestamp: performance.now(),
          source: 'screen',
        });
      }),
      this.midi.on('noteon', ({ midi, velocity, timeStamp }) => {
        this.input.emit({
          midiNote: midi,
          velocity,
          timestamp: typeof timeStamp === 'number' ? timeStamp : performance.now(),
          source: 'midi',
        });
      }),
      // Releases: same one-event-per-physical-action dedup as note-on. The router
      // drives the on-screen keys for MIDI, so skip screen releases of MIDI origin.
      this.keyboard.on('release', (midi, detail) => {
        if (detail?.source === 'midi') return;
        this.input.emitRelease({ midiNote: midi, timestamp: performance.now(), source: 'screen' });
      }),
      this.midi.on('noteoff', ({ midi, timeStamp }) => {
        this.input.emitRelease({
          midiNote: midi,
          timestamp: typeof timeStamp === 'number' ? timeStamp : performance.now(),
          source: 'midi',
        });
      })
    );
  }

  /**
   * Connect the instrument to the synth. Browsers keep the AudioContext
   * suspended until a gesture, so the first press also unlocks it.
   */
  _wireSound() {
    let unlocked = false;
    const ensureAudio = () => {
      if (!unlocked) { unlockAudio(); unlocked = true; this._playFlourish(); }
    };
    // Any first gesture is enough to unlock; key presses are the common one.
    window.addEventListener('pointerdown', ensureAudio, { once: true });
    window.addEventListener('keydown', ensureAudio, { once: true });

    this._unsubs.push(
      this.keyboard.on('press', (midi, detail) => {
        ensureAudio();
        this.synth?.noteOn(midi, detail.velocity ?? 100);
      }),
      this.keyboard.on('release', (midi) => {
        this.synth?.noteOff(midi);
      })
    );
  }

  /**
   * The B-major startup flourish — B–D♯–F♯(–B), soft, lightly rolled, with a
   * little natural velocity variation and a warm decay, like a pianist gently
   * touching the keys before practice. Idempotent and self-gating: it only sounds
   * once, only when the AudioContext is actually running (browser autoplay keeps
   * it suspended until a gesture, so a cold-load attempt simply waits for the
   * first interaction to retry), and only when the flourish setting is enabled.
   */
  _playFlourish() {
    if (!this.synth || this._flourishPlayed) return;
    if (!flourishEnabled()) return;
    const ctx = this.synth.ctx;
    if (!ctx || ctx.state !== 'running') return;     // not yet unlocked → a later gesture retries
    this._flourishPlayed = true;
    try {
      // Schedule well in the future so each voice's envelope ramps up from silence
      // cleanly (a near-"now" start collapses the attack ramp into an onset click).
      const t = ctx.currentTime + 0.12;
      // [midi, velocity, offAtSec]. B3, D#4, F#4, B4 — soft, gently rolled, with
      // STAGGERED releases (no coincident stops). The shared release decays a voice
      // to ~1% before its oscillator stops, and the LAST voice to stop is unmasked,
      // so its tiny residual is what ticks. We therefore make the last voice to stop
      // the SOFTEST (the root, lingering quietly) and keep every velocity low, which
      // pushes that final stop step down to the synth's floor (~-65 dB). Onsets roll
      // low→high; the soft top B lifts first, the quiet root rings out last and fades.
      const NOTES = [
        [59, 14, 1.34],   // B3  (root) — softest, rings out LAST → quietest final stop
        [63, 28, 1.06],   // D#4        — body
        [66, 32, 1.20],   // F#4        — body
        [71, 18, 0.92],   // B4  (top)  — soft shimmer, lifts first
      ];
      NOTES.forEach(([m, v, off], i) => {
        this.synth.noteOn(m, v, t + i * 0.085);       // ~85ms roll between onsets
        this.synth.noteOff(m, t + off);               // staggered release → no end click
      });
    } catch { /* audio not ready; ignore */ }
  }

  /** Toggle the browser Fullscreen API to hide tablet UI chrome. */
  _toggleFullscreen() {
    try {
      const doc = document;
      const root = doc.documentElement;
      if (!doc.fullscreenElement) {
        root.requestFullscreen?.();
      } else {
        doc.exitFullscreen?.();
      }
    } catch { /* unsupported; ignore */ }
  }

  /**
   * Convenience "leave" control. If browser fullscreen is active, drop out of it;
   * otherwise return to the dashboard. Never tries to close the tab/window (blocked
   * by browsers) and never destroys state — it's pure navigation.
   */
  _exit() {
    try {
      const doc = document;
      const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
      if (fsEl) {
        (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
        return;
      }
      const hash = location.hash;
      if (hash && hash !== '#/' && hash !== '#') location.hash = '#/';
    } catch { /* unsupported; ignore */ }
  }

  /** Collapse/expand the on-screen keyboard footer; the staff grows to fill. */
  _toggleKeyboard() {
    const hidden = document.documentElement.getAttribute('data-keyboard') !== 'hidden';
    this._applyKeyboardPref(hidden);
    // Remember the choice PER MODULE, not globally.
    const viewId = this.store.getState().view ?? 'home';
    try { window.localStorage.setItem(`kbHidden:${viewId}`, hidden ? '1' : '0'); } catch { /* ignore */ }
  }

  /** Resolve a module's keyboard-hidden state: remembered choice, else default. */
  _resolveKeyboardHidden(viewId) {
    try {
      const stored = window.localStorage.getItem(`kbHidden:${viewId}`);
      if (stored === '1') return true;
      if (stored === '0') return false;
    } catch { /* ignore */ }
    return KEYBOARD_HIDDEN_DEFAULT[viewId] ?? false;
  }

  _applyKeyboardPref(hidden) {
    document.documentElement.setAttribute('data-keyboard', hidden ? 'hidden' : 'shown');
    const btn = this.root.querySelector('[data-action="toggle-keyboard"]');
    if (btn) {
      btn.setAttribute('aria-pressed', String(hidden));
      btn.textContent = hidden ? '⌨ Show Keyboard' : '⌨ Hide Keyboard';
    }
  }

  /** Show/hide fingering numbers (display only); remembered per module. */
  _toggleFingering() {
    const hidden = document.documentElement.getAttribute('data-fingering') !== 'hidden';
    this._applyFingeringPref(hidden);
    const viewId = this.store.getState().view ?? 'home';
    try { window.localStorage.setItem(`fingerHidden:${viewId}`, hidden ? '1' : '0'); } catch { /* ignore */ }
  }

  /** Resolve a module's fingering-hidden state: remembered choice, else default. */
  _resolveFingeringHidden(viewId) {
    try {
      const stored = window.localStorage.getItem(`fingerHidden:${viewId}`);
      if (stored === '1') return true;
      if (stored === '0') return false;
    } catch { /* ignore */ }
    return FINGERING_HIDDEN_DEFAULT[viewId] ?? false;
  }

  _applyFingeringPref(hidden) {
    document.documentElement.setAttribute('data-fingering', hidden ? 'hidden' : 'shown');
    const btn = this.root.querySelector('[data-action="toggle-fingering"]');
    if (btn) {
      btn.setAttribute('aria-pressed', String(hidden));
      btn.textContent = hidden ? '① Show Fingering' : '① Hide Fingering';
    }
  }

  /* ---- Breadcrumb / back navigation ------------------------------------ *
   * The chrome owns a "Modules › … " breadcrumb and a Back control. Modules
   * are optional participants: any module can call ctx.nav.set([...]) to add
   * deeper crumbs and define what "one level up" means; modules that say
   * nothing get a clean two-level crumb with Back returning to the dashboard.
   * Pure navigation — no module state, scoring, or engine is involved. */

  /** Build the optional nav helper handed to a view (guarded to the active view). */
  _makeNav(viewId) {
    return {
      set: (trail) => {
        try {
          if (this.store.getState().view === viewId) this._setModuleTrail(trail || []);
        } catch (err) { console.info('[KeyMaster] breadcrumb update skipped:', err?.message ?? err); }
      },
    };
  }

  /** Return to the dashboard via the router (never destroys state). */
  _goHome() {
    try {
      if (location.hash && location.hash !== '#/' && location.hash !== '#') location.hash = '#/';
    } catch { /* ignore */ }
  }

  /** Compose the full trail (Modules + module crumbs) and wire the Back target. */
  _setModuleTrail(moduleTrail) {
    const full = [{ label: 'Modules', go: () => this._goHome() }, ...moduleTrail];
    this._renderBreadcrumb(full);
    const up = full[full.length - 2];               // one level up from current
    this._backFn = up?.go ?? (() => this._goHome());
  }

  _clearBreadcrumb() {
    this._backFn = () => this._goHome();
    if (this.dom.breadcrumb) this.dom.breadcrumb.replaceChildren();
  }

  _renderBreadcrumb(full) {
    const host = this.dom.breadcrumb;
    if (!host) return;
    const frag = document.createDocumentFragment();
    full.forEach((crumb, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb__sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '›';
        frag.appendChild(sep);
      }
      const last = i === full.length - 1;
      if (!last && typeof crumb.go === 'function') {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'breadcrumb__crumb';
        b.textContent = crumb.label;
        b.addEventListener('click', crumb.go);
        frag.appendChild(b);
      } else {
        const s = document.createElement('span');
        s.className = `breadcrumb__crumb${last ? ' is-current' : ''}`;
        if (last) s.setAttribute('aria-current', 'page');
        s.textContent = crumb.label;
        frag.appendChild(s);
      }
    });
    host.replaceChildren(frag);
  }

  /* ---- Common chrome --------------------------------------------------- */

  _wireChrome() {
    // Delegate all chrome button clicks from the shell.
    document.addEventListener('click', (ev) => {
      const actionEl = ev.target.closest?.('[data-action]');
      if (!actionEl) return;
      switch (actionEl.dataset.action) {
        case 'octave-up':   this._shiftOctaves(+1); break;
        case 'octave-down': this._shiftOctaves(-1); break;
        case 'connect-midi': this._connectMidi(); break;
        case 'toggle-keyboard': this._toggleKeyboard(); break;
        case 'toggle-fingering': this._toggleFingering(); break;
        case 'back': (this._backFn ?? (() => this._goHome()))(); break;
        case 'fullscreen': this._toggleFullscreen(); break;
        case 'exit': this._exit(); break;
      }
    });

    // Hardware shortcuts: arrow keys shift the viewport.
    document.addEventListener('keydown', (ev) => {
      if (ev.target.matches?.('input, textarea')) return;
      if (ev.key === 'ArrowUp')   { ev.preventDefault(); this._shiftOctaves(+1); }
      if (ev.key === 'ArrowDown') { ev.preventDefault(); this._shiftOctaves(-1); }
    });

    // Keep the MIDI pill and register readout in sync with state.
    this._unsubs.push(
      this.store.subscribe((s) => this._renderMidiPill(s.midi)),
      this.store.subscribe((s) => { if (this.dom.register) this.dom.register.textContent = s.register; }),
      // Hot-plug: re-evaluate the indicator whenever devices come or go.
      this.midi.on('statechange', () => this._refreshMidiState())
    );
  }

  _shiftOctaves(n) {
    this.viewport.shiftOctaves(n);
    this._refreshRegister();
    savePrefs({ ...loadPrefs(), startMidi: this.viewport.startMidi });
  }

  _refreshRegister() {
    const { low, high } = this.viewport.window;
    this.store.setState({ register: `${short(low)}–${short(high)}` });
  }

  /* ---- MIDI ------------------------------------------------------------ */

  /** Attempt connection quietly at boot; never blocks or errors the UI. */
  async _connectMidiSilently() {
    if (!MidiRouter.isSupported()) {
      console.info('[KeyMaster MIDI] Web MIDI API not available in this browser (navigator.requestMIDIAccess missing).');
      this.store.setState({ midi: { ok: false, label: 'No MIDI' } });
      return;
    }
    // Some browsers grant without a prompt; if it needs a gesture, the pill
    // click will retry. We attempt once here and swallow the outcome.
    await this._connectMidi({ silent: true });
  }

  async _connectMidi({ silent = false } = {}) {
    const status = await this.midi.connect();
    console.info('[KeyMaster MIDI] connect attempt', { silent, ok: status.ok, reason: status.reason, inputs: status.inputs?.length ?? 0 });
    if (status.ok) {
      // Bright green ONLY when an actual device handshake is verified.
      const hasDevice = status.inputs.length > 0;
      this.store.setState({ midi: { ok: hasDevice, label: hasDevice ? status.inputs[0] : 'No device' } });
    } else if (!silent) {
      const label = status.reason === 'unsupported' ? 'No MIDI' : 'MIDI blocked';
      this.store.setState({ midi: { ok: false, label } });
    }
  }

  /** Recompute the indicator from the live input list (used on hot-plug). */
  _refreshMidiState() {
    const names = [...this.midi.inputs.values()].map((i) => i.name ?? i.id);
    const ok = names.length > 0;
    console.info('[KeyMaster MIDI] device statechange — inputs:', names.length, names);
    this.store.setState({ midi: { ok, label: ok ? names[0] : 'No device' } });
  }

  _renderMidiPill(midi) {
    const pill = this.dom.midiPill;
    if (!pill) return;
    pill.classList.toggle('is-connected', midi.ok);
    pill.querySelector('.midi-pill__label').textContent = midi.label;
  }

  /* ---- Routing --------------------------------------------------------- */

  _wireRouter() {
    window.addEventListener('hashchange', () => this._handleRoute());
  }

  async _handleRoute() {
    const path = location.hash.replace(/^#/, '');
    const viewId = ROUTES[path] ?? 'home';

    // Leave the current view (if any).
    const prev = this.store.getState().view;
    if (prev !== viewId) await this._exitView(prev);

    // Toggle section visibility.
    for (const [id, el] of this.dom.views) {
      const active = id === viewId;
      el.classList.toggle('is-active', active);
      el.hidden = !active;
    }

    this.store.setState({ view: viewId });
    savePrefs({ ...loadPrefs(), lastView: viewId });

    // Presentation: apply this module's on-screen-keyboard preference (the
    // remembered manual choice if any, otherwise the module's default).
    this._applyKeyboardPref(this._resolveKeyboardHidden(viewId));

    // Reflect the active view for chrome (hides module-only controls on home)
    // and apply this module's fingering-number preference (display only).
    document.documentElement.setAttribute('data-view', viewId);
    this._applyFingeringPref(this._resolveFingeringHidden(viewId));

    // Seed the breadcrumb. A module with internal levels (e.g. Sight-Reading)
    // overrides this with a deeper trail via ctx.nav during _enterView.
    // Navigation is non-critical and must NEVER abort routing — a throw here
    // would stop the instrument/view from mounting. Fully isolated.
    try {
      if (viewId === 'home') this._clearBreadcrumb();
      else this._setModuleTrail([{ label: MODULE_NAME[viewId] ?? viewId }]);
    } catch (err) { console.info('[KeyMaster] breadcrumb seed skipped:', err?.message ?? err); }

    if (viewId !== 'home') await this._enterView(viewId);
  }

  async _enterView(viewId) {
    const def = VIEW_REGISTRY[viewId];
    const slot = this.dom.slots.get(def?.slot);
    if (!def || !slot) return;

    let record = this.views.get(viewId);
    if (!record) {
      record = {};
      this.views.set(viewId, record);
      try {
        const mod = await def.load();
        record.factory = mod.default;
      } catch (err) {
        // Controller not built yet (or failed to load): show a placeholder
        // and keep the instrument playable.
        console.info(`[KeyMaster] "${viewId}" controller unavailable:`, err?.message ?? err);
        renderPlaceholder(slot, viewId);
        return;
      }
    }

    if (!record.factory) { renderPlaceholder(slot, viewId); return; }

    if (!record.instance) {
      record.instance = record.factory({
        mount: slot,
        store: this.store,
        keyboard: this.keyboard,
        viewport: this.viewport,
        midi: this.midi,
        input: this.input,
        evaluator: this.evaluator,
        synth: this.synth,
        scheduler: this.scheduler,
        metronome: this.metronome,
        nav: this._makeNav(viewId),
      });
    }
    record.instance.enter?.();
  }

  async _exitView(viewId) {
    const record = this.views.get(viewId);
    record?.instance?.exit?.();
    // Always reset any per-exercise decoration the controller may have left.
    this.keyboard.clearFingers();
    this.keyboard.clearHighlight('target');
    this.keyboard.allNotesOff();
  }
}

/* ===========================================================================
 * 5. Helpers
 * ========================================================================= */

/** Render a graceful "coming online" panel for an unbuilt view. */
function renderPlaceholder(slot, viewId) {
  const label = viewId === 'scales' ? 'Scales Masterclass' : 'Cognitive Sight-Reading';
  slot.replaceChildren();
  const panel = document.createElement('div');
  panel.className = 'placeholder';
  panel.innerHTML =
    `<p class="placeholder__title">${label}</p>` +
    `<p class="placeholder__note">This vector is being wired up. ` +
    `The keyboard below is live — play freely.</p>`;
  slot.appendChild(panel);
}

/** Only persist known-safe preference keys back into the store at boot. */
function pickPrefs(prefs) {
  const out = {};
  if (prefs.lastView && prefs.lastView in VIEW_REGISTRY) out.view = prefs.lastView;
  return out;
}

function clampStart(midi) {
  return Math.min(PIANO_MAX_MIDI - 1, Math.max(PIANO_MIN_MIDI, midi | 0));
}

/** Compact note label like "C3" (sharp spelling) for chrome readouts. */
function short(midi) {
  const N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${N[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/* ===========================================================================
 * 6. Bootstrap
 * ========================================================================= */

const app = new KeyMasterApp(document);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.boot());
} else {
  app.boot();
}

// Expose for debugging / controller tooling without polluting modules.
window.KeyMaster = app;

export { KeyMasterApp, createStore };
