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
import { createKeyboardCompass } from './keyboardCompass.js?v=rc2-139';
import { MidiRouter } from './midiRouter.js';
import { getAudioContext, unlockAudio, isAudioSupported } from './audioContext.js';
import { routeToMasterBus, getMasterBus } from './audioBus.js';
import { runWelcomeExperience, getDisplayName } from './welcomeExperience.js';
import { Synth } from './synth.js';
import { PianoSynth } from './pianoVoice.js';
import { createCoursePiano } from './coursePianoSampler.js';
import { Scheduler } from './scheduler.js';
import { Metronome } from './metronome.js';
import './voiceTest.js?v=rc2-127';  // visible Voice Self-Test at #voice-test (no console needed)
import './pwaUpdate.js?v=rc2-127';  // installable-PWA "Update available" flow
import { NoteInput } from './noteInput.js';
import { createMidiEvaluator } from './midiEvaluator.js';
import { createDevReadout, isDevMode } from './devReadout.js';
import { createProgressStore } from './progressStore.js';
import { STAGES, COURSE_NAME } from './courseMap.js?v=rc2-83';

// rc2-61: discreet build tag, sourced from this module's own cache token (?v=).
const BUILD = (() => { try { return new URL(import.meta.url).searchParams.get('v') || 'dev'; } catch { return 'dev'; } })();

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
  'learn-app': {
    slot: 'learn-app',
    src: './learnApp.js?v=rc2-138',
    load: () => import('./learnApp.js?v=rc2-138'),
  },
  foundations: {
    slot: 'foundations',
    src: './foundations.js?v=rc2-189',
    load: () => import('./foundations.js?v=rc2-189'),
  },
  scales: {
    slot: 'scales',
    src: './scalesMasterclass.js?v=rc2-83',
    load: () => import('./scalesMasterclass.js?v=rc2-83'),
  },
  sightreading: {
    slot: 'sightreading',
    src: './sightReading.js?v=rc2-83',
    load: () => import('./sightReading.js?v=rc2-83'),
  },
  chords: {
    slot: 'chords',
    src: './chordMasterclass.js?v=rc2-83',
    load: () => import('./chordMasterclass.js?v=rc2-83'),
  },
  // Master Training reuses the Foundations engine in "learn mode" (ctx.route).
  learn: {
    slot: 'learn',
    src: './foundations.js?v=rc2-189',
    load: () => import('./foundations.js?v=rc2-189'),
  },
};

/** Routes that map a hash to a view id. Unknown hashes fall back to home. */
const ROUTES = {
  '': 'home',
  '/': 'home',
  '/learn-app': 'learn-app',
  '/foundations': 'foundations',
  '/scales': 'scales',
  '/sightreading': 'sightreading',
  '/chords': 'chords',
  '/learn': 'learn',
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
  home: true,
  'learn-app': false,
  foundations: false,
  scales: true,
  sightreading: true,
  chords: false,
  learn: false,
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
  'learn-app': false,
  foundations: false,
  scales: false,
  sightreading: false,
  chords: false,
  learn: false,
};

/**
 * Human module names for the breadcrumb. Adding a future module here (plus its
 * ROUTES entry) gives it a "Modules › <Name>" crumb automatically — no module
 * code required. A module with internal levels can publish a deeper trail via
 * the optional `ctx.nav` helper.
 */
const MODULE_NAME = {
  'learn-app': 'Learn the App',
  foundations: 'Musical Foundations',
  scales: 'Scales Masterclass',
  sightreading: 'Cognitive Sight-Reading',
  chords: 'Chord Masterclass',
  learn: 'Foundation Course',
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

    // Local learning memory (musical progress only). Construction never throws;
    // on private-mode / corrupt storage it degrades to in-memory for the session.
    this.progress = createProgressStore();

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

    // Arrival. On a home landing, the full-screen front door is the arrival
    // experience and opens the Course. On a deep link into a module, skip it
    // and use the lightweight legacy welcome flourish instead. Fire-and-forget;
    // neither path may ever block or break boot.
    const onHome = (this.store.getState().view ?? 'home') === 'home';
    if (!(onHome && this._mountFrontDoor())) this._runWelcome();
    try { this._mountShell(); } catch (err) { console.info('[KeyMaster] shell wiring skipped:', err?.message ?? err); }
    // Register the service worker so the app is installable (standalone / full
    // screen) and works offline. Non-blocking; failure never affects the app.
    try {
      if ('serviceWorker' in navigator) {
        // Service-worker registration + the "Update available" flow live in
        // pwaUpdate.js (imported at top). Nothing to register here.
      }
    } catch { /* ignore */ }
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

  /**
   * Front door — a full-screen arrival shown on a home landing. NOT a sign-in:
   * there is no account system; it greets the learner (by stored display name
   * if one exists, else "Tim") and opens the Course. All wiring is defensive —
   * any failure returns false so boot falls back to the legacy welcome. Motion
   * is transform/opacity only and is skipped under prefers-reduced-motion.
   * @returns {boolean} true if the front door was shown.
   */
  _mountFrontDoor() {
    try {
      const fd = document.getElementById('frontdoor');
      if (!fd) return false;
      const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      let name = 'Tim';
      try { name = (getDisplayName && getDisplayName()) || window.localStorage.getItem('km_name') || 'Tim'; } catch { /* ignore */ }
      const h = new Date().getHours();
      const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
      const greetEl = document.getElementById('fd-greeting');
      if (greetEl) greetEl.textContent = `${part}, ${name}.`;
      const buildEl = document.getElementById('fd-build');
      if (buildEl) buildEl.textContent = `KeyMaster PRO \u00B7 Flagship Front Door \u00B7 Stages 1\u20134 \u00B7 ${BUILD}`;

      const enterEl = document.getElementById('fd-enter');
      // Primary action is always "Continue" — it routes into the Course via the
      // existing resume logic (returning learners resume their last step, new
      // learners start the Foundation Course). The markup already sets this label.
      if (enterEl) enterEl.textContent = 'Continue';

      const leave = (toHash) => {
        const finish = () => {
          fd.hidden = true;
          fd.classList.remove('is-leaving');
          document.documentElement.classList.remove('fd-open');   // re-enable scroll
          if (toHash) location.hash = toHash;
        };
        fd.classList.add('is-leaving');
        if (reduce) finish(); else window.setTimeout(finish, 480);
      };

      document.getElementById('fd-fullscreen')?.addEventListener('click', () => {
        this._requestImmersiveFullscreen();
      });
      enterEl?.addEventListener('click', () => {
        // Ordering (Android/Chrome): audio unlocks on the pointerdown that precedes
        // this click (the once-only ensureAudio), so the resume-aware flourish is
        // already in flight. Fullscreen is best-effort and must not block entry; it
        // is wrapped so any failure cannot stop the route, and leave() runs
        // unconditionally to carry us into #/learn.
        try { this._requestImmersiveFullscreen(); } catch { /* never blocks routing */ }
        leave('#/learn');
      });
      document.getElementById('fd-rooms')?.addEventListener('click', () => leave(null));

      fd.hidden = false;
      document.documentElement.classList.add('fd-open');   // lock scroll on splash
      return true;
    } catch { return false; }
  }

  /** Light, defensive check: has the learner any saved Course progress? */
  _hasCourseProgress() {
    try {
      const raw = window.localStorage.getItem('keymaster.progress.v1');
      if (!raw) return false;
      const o = JSON.parse(raw);
      return !!(o && typeof o === 'object' && Object.keys(o).length);
    } catch { return false; }
  }

  /**
   * PWA / full-screen launch. If already running installed (standalone /
   * fullscreen display-mode), drop the in-page full-screen + install
   * affordances — it is already app-like. Otherwise, when the browser offers an
   * install (beforeinstallprompt), reveal an honest install button wired to the
   * real prompt. Never forces fullscreen; the full-screen button stays a manual,
   * gesture-driven option for in-browser use.
   */
  _setupAppLaunch() {
    const fd = document.getElementById('frontdoor');
    let standalone = false;
    try {
      standalone = !!(window.matchMedia?.('(display-mode: standalone)')?.matches
        || window.matchMedia?.('(display-mode: fullscreen)')?.matches
        || window.navigator?.standalone);
    } catch { /* ignore */ }
    if (standalone) { fd?.classList.add('is-standalone'); return; }

    // No broken affordance: where the Fullscreen API is unavailable (e.g. iPhone
    // Safari) hide the full-screen link instead of showing a dead button.
    try {
      const fsBtn = document.getElementById('fd-fullscreen');
      const fsOK = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
      if (fsBtn && !fsOK) fsBtn.hidden = true;
    } catch { /* ignore */ }

    const installBtn = document.getElementById('fd-install');
    let deferred = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      try { e.preventDefault(); deferred = e; if (installBtn) installBtn.hidden = false; } catch { /* ignore */ }
    });
    installBtn?.addEventListener('click', async () => {
      if (!deferred) return;
      try { deferred.prompt(); await deferred.userChoice; } catch { /* ignore */ }
      deferred = null;
      if (installBtn) installBtn.hidden = true;
    });
    window.addEventListener('appinstalled', () => { if (installBtn) installBtn.hidden = true; });

    // iOS Safari has no install event and no Fullscreen API for web pages — show
    // the honest Add-to-Home-Screen route instead of a dead button.
    try {
      const ua = navigator.userAgent || '';
      const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
      const fsOK2 = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
      const hint = document.getElementById('fd-ioshint');
      if (isIOS && !fsOK2 && hint) hint.hidden = false;
    } catch { /* ignore */ }
  }

  /**
   * Premium app shell: the side-menu / course hub, the Course Map overlay, and
   * the DEFERRED trusted sign-in seam. Wired once. Every action is defensive and
   * non-critical — a failure here never affects the Course or the instrument.
   * No account system is created: sign-in shows only the safe UI seam.
   */
  _mountShell() {
    const $ = (id) => document.getElementById(id);
    try { this._setupAppLaunch(); } catch (err) { console.info('[KeyMaster] app-launch wiring skipped:', err?.message ?? err); }
    const resumeIndex = () => {
      const li = this.progress?.get?.('learnLesson');
      return Number.isInteger(li) && li > 0 ? li : 0;
    };
    const resumeAt = (idx) => {
      try { if (Number.isInteger(idx)) this.progress?.set?.('learnLesson', Math.max(0, idx)); } catch { /* ignore */ }
      location.hash = '#/learn';
    };

    // ---- Side menu ----------------------------------------------------------
    const menu = $('km-menu');
    const openMenu = () => {
      if (!menu) return;
      // refresh the "continue" label + build each open
      try {
        const started = this._hasCourseProgress();
        const lbl = $('km-menu-continue-label'); const sub = $('km-menu-continue-sub');
        if (lbl) lbl.textContent = started ? 'Continue the Course' : 'Start the Course';
        if (sub) sub.textContent = started ? 'Pick up where you left off' : 'Begin the Foundation Course';
        const b = $('km-menu-build'); if (b) b.textContent = `KeyMaster PRO \u00B7 ${BUILD}`;
      } catch { /* ignore */ }
      // Sampler status indicator — shows the Course voice state plainly so it
      // never has to be guessed by ear. Reads the engine's getStatus().
      try {
        const ps = $('km-menu-piano-status');
        if (ps) {
          const st = (this.coursePiano && this.coursePiano.getStatus) ? this.coursePiano.getStatus() : null;
          let label;
          if (!st || st.code === 'idle') label = 'Grand piano: tap a key to load';
          else if (st.code === 'loading') label = 'Grand piano: loading...';
          else if (st.code === 'ready') label = 'Grand piano: ready (' + st.loaded + ' samples)';
          else if (st.code === 'missing') label = st.manifest ? 'Grand piano: sample files missing - using synth' : 'Grand piano: manifest not found - using synth';
          else label = 'Grand piano: load error - using synth';
          ps.textContent = label;
          ps.setAttribute('data-state', st ? st.code : 'idle');
        }
      } catch { /* ignore */ }
      menu.hidden = false;
      $('app-menu-btn')?.setAttribute('aria-expanded', 'true');
    };
    const closeMenu = () => { if (menu) menu.hidden = true; $('app-menu-btn')?.setAttribute('aria-expanded', 'false'); };
    $('app-menu-btn')?.addEventListener('click', openMenu);
    $('km-menu-close')?.addEventListener('click', closeMenu);
    $('km-menu-backdrop')?.addEventListener('click', closeMenu);
    menu?.querySelectorAll('[data-menu]')?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-menu');
        closeMenu();
        if (action === 'continue') { location.hash = '#/learn'; }
        else if (action === 'learn-app') { location.hash = '#/learn-app'; }
        else if (action === 'map') { this._openCourseMap(); }
        else if (action === 'review') { resumeAt(Math.max(0, resumeIndex() - 1)); }
        else if (action === 'rooms') { location.hash = '#/'; setTimeout(() => { this.root.querySelector('#practice-rooms-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }
        else if (action === 'settings') { this._openSignin('Settings \u2014 MIDI, sound and accessibility options are coming in a future release.'); }
        else if (action === 'signin') { this._openSignin(); }
        else if (action === 'reset') {
          const ok = (typeof window !== 'undefined' && typeof window.confirm === 'function')
            ? window.confirm('Reset your course progress on this device? This clears your saved lessons and restarts from the beginning.')
            : true;
          if (ok) {
            try { window.localStorage.removeItem('keymaster.progress.v1'); const p = loadPrefs(); delete p.lastView; savePrefs(p); } catch { /* ignore */ }
            try { location.hash = '#/'; } catch { /* ignore */ }
            try { location.reload(); } catch { /* ignore */ }
          }
        }
      });
    });

    // ---- Hub chips on home --------------------------------------------------
    $('hub-map')?.addEventListener('click', () => this._openCourseMap());
    $('hub-learnapp')?.addEventListener('click', () => { location.hash = '#/learn-app'; });
    // First-run nudge: emphasise the Learn-the-App chip until the tour is done.
    try {
      const onboarded = !!this.progress?.get?.('appOnboarded');
      const laLbl = $('hub-learnapp')?.querySelector('.hub-chip__label');
      if (laLbl && !onboarded) laLbl.textContent = 'Start here \u2014 Learn the App';
    } catch { /* ignore */ }
    $('hub-review')?.addEventListener('click', () => resumeAt(Math.max(0, resumeIndex() - 1)));
    // Primary launch from the home hub also requests immersive fullscreen on the
    // tap (synchronously, before the anchor navigates). Never blocks navigation.
    $('learn-cta')?.addEventListener('click', () => { this._requestImmersiveFullscreen(); });

    // ---- Course Map overlay -------------------------------------------------
    $('km-map-close')?.addEventListener('click', () => this._closeCourseMap());
    $('km-map-backdrop')?.addEventListener('click', () => this._closeCourseMap());
    $('km-map-continue')?.addEventListener('click', () => { this._closeCourseMap(); location.hash = '#/learn'; });

    // ---- Deferred sign-in seam ---------------------------------------------
    $('signin-open')?.addEventListener('click', () => this._openSignin());
    $('fd-signin')?.addEventListener('click', () => this._openSignin());
    $('km-signin-close')?.addEventListener('click', () => this._closeSignin());
    $('km-signin-backdrop')?.addEventListener('click', () => this._closeSignin());
    $('km-signin')?.querySelectorAll('[data-provider]')?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const who = btn.getAttribute('data-provider');
        const note = $('km-signin-note');
        if (note) {
          note.textContent = `${who} sign-in is being finished for a future release. Your progress is saved safely on this device for now \u2014 nothing is lost.`;
          note.classList.add('is-clicked');
        }
      });
    });

    // Escape closes any open shell overlay.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!$('km-signin')?.hidden) this._closeSignin();
      else if (!$('km-coursemap')?.hidden) this._closeCourseMap();
      else if (!menu?.hidden) closeMenu();
    });
  }

  _openSignin(noteText) {
    const m = document.getElementById('km-signin'); if (!m) return;
    const note = document.getElementById('km-signin-note');
    if (note) {
      note.classList.remove('is-clicked');
      note.textContent = noteText || 'Secure sign-in is being finished for a future release. For now, your progress is saved safely on this device.';
    }
    m.hidden = false;
  }
  _closeSignin() { const m = document.getElementById('km-signin'); if (m) m.hidden = true; }
  _closeCourseMap() { const m = document.getElementById('km-coursemap'); if (m) m.hidden = true; }

  /** Build the Course Map from the live Course data and show it. */
  _openCourseMap() {
    const overlay = document.getElementById('km-coursemap');
    const body = document.getElementById('km-map-body');
    if (!overlay || !body) return;
    overlay.hidden = false;
    body.innerHTML = '<p style="color:var(--ivory-faint);padding:1rem;text-align:center">Loading the journey\u2026</p>';
    import('./foundations.js?v=rc2-189').then((F) => {
      const steps = Array.isArray(F.LEARN_STEPS) ? F.LEARN_STEPS : [];
      const chapterAt = (typeof F.chapterAtIndex === 'function') ? F.chapterAtIndex : null;
      if (!steps.length || !chapterAt) { body.innerHTML = '<p style="color:var(--ivory-faint);padding:1rem;text-align:center">Course map unavailable right now.</p>'; return; }
      // Derive the chapter list (name, stage, first-step index) from live data.
      const seen = new Set(); const chapters = [];
      for (let i = 0; i < steps.length; i += 1) {
        const c = chapterAt(i);
        if (c && c.name && !seen.has(c.chIdx)) { seen.add(c.chIdx); chapters.push({ chIdx: c.chIdx, name: c.name, stage: c.stage, course: c.course || 'foundation', start: i }); }
      }
      const li = this.progress?.get?.('learnLesson');
      const curIdx = Number.isInteger(li) ? li : 0;
      const curChIdx = chapterAt(curIdx).chIdx;
      body.innerHTML = '';
      // Name maps for stage/level headers + the locked future Key Levels (single
      // source = foundations.js); degrade gracefully if a map is absent.
      const FND = Array.isArray(F.FOUNDATION_STAGES) ? F.FOUNDATION_STAGES : [];
      const KML = Array.isArray(F.KEYMASTER_LEVELS) ? F.KEYMASTER_LEVELS : [];
      const fndName = (n) => (FND.find((x) => x.stage === n) || {}).name || '';
      const kmlName = (n) => (KML.find((x) => x.level === n) || {}).name || '';
      let lastStage = null, lastCourse = null, sawKeymaster = false;
      chapters.forEach((ch) => {
        const course = ch.course || 'foundation';
        // A new top-level course (the KeyMaster Course) gets its own section header.
        // Foundation keeps its original appearance (no course header), so the existing
        // map is unchanged; only the appended KeyMaster section is labelled differently.
        if (course !== lastCourse) {
          lastCourse = course; lastStage = null;
          if (course === 'keymaster') sawKeymaster = true;
          const ch2 = document.createElement('p'); ch2.className = 'km-map__course-name';
          ch2.textContent = (course === 'keymaster') ? 'KeyMaster Course' : 'Foundation Course';
          body.appendChild(ch2);
        }
        if (ch.stage !== lastStage) {
          lastStage = ch.stage;
          const wrap = document.createElement('div'); wrap.className = 'km-map__stage';
          const sh = document.createElement('p'); sh.className = 'km-map__stage-name';
          if (course === 'keymaster') {
            const nm = kmlName(ch.stage); sh.textContent = `Key Level ${ch.stage}` + (nm ? ` \u2014 ${nm}` : '');
          } else {
            const nm = fndName(ch.stage); sh.textContent = `Foundation Stage ${ch.stage}` + (nm ? ` \u2014 ${nm}` : '');
          }
          wrap.appendChild(sh); body.appendChild(wrap);
        }
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'km-map__chapter' + (ch.chIdx === curChIdx ? ' is-current' : (ch.chIdx < curChIdx ? ' is-done' : ''));
        const dot = document.createElement('span'); dot.className = 'km-map__dot'; dot.setAttribute('aria-hidden', 'true');
        const nm = document.createElement('span'); nm.className = 'km-map__chapter-name'; nm.textContent = ch.name;
        row.append(dot, nm);
        if (ch.chIdx === curChIdx) { const here = document.createElement('span'); here.className = 'km-map__here'; here.textContent = 'You are here'; row.appendChild(here); }
        row.addEventListener('click', () => {
          try { this.progress?.set?.('learnLesson', ch.start); } catch { /* ignore */ }
          this._closeCourseMap();
          location.hash = '#/learn';
        });
        body.lastChild.appendChild(row);
      });
      // Future Key Levels (2-8): locked "coming soon" bands under KeyMaster Course.
      // Presentation only - not clickable, no progress interaction, no lessons.
      const locked = KML.filter((l) => l.status !== 'available');
      if (locked.length) {
        if (!sawKeymaster) {
          const ch2 = document.createElement('p'); ch2.className = 'km-map__course-name';
          ch2.textContent = 'KeyMaster Course'; body.appendChild(ch2);
        }
        locked.forEach((l) => {
          const wrap = document.createElement('div'); wrap.className = 'km-map__stage is-locked';
          const sh = document.createElement('p'); sh.className = 'km-map__stage-name';
          sh.textContent = `Key Level ${l.level} \u2014 ${l.name}`;
          const soon = document.createElement('span'); soon.className = 'km-map__soon'; soon.textContent = 'Coming soon';
          sh.appendChild(soon);
          wrap.appendChild(sh); body.appendChild(wrap);
        });
      }
    }).catch((err) => {
      body.innerHTML = '<p style="color:var(--ivory-faint);padding:1rem;text-align:center">Course map unavailable right now.</p>';
      console.info('[KeyMaster] course map skipped:', err?.message ?? err);
    });
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
      octaves: 5,                                   // rc2-160: show more of the keybed (was 4) — Piano-Marvel-style wider, thinner keys
      startMidi: clampStart(prefs.startMidi ?? 48), // C3 default
    });
    // Orientation overlay: marks the C keys (Middle C most prominent). Decorates
    // existing key elements only — no engine/viewport/mapping/pitch changes.
    // Visibility is gated to the Foundation Course via html[data-view="learn"].
    try { this.compass = createKeyboardCompass({ keyboard: this.keyboard }); this.compass.mount(); }
    catch (err) { console.info('[KeyMaster] keyboard compass skipped:', err?.message ?? err); }
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
      // Free-play only: a richer piano voice for on-screen/MIDI key presses.
      // The protected synth above still drives Scales and the scheduler; the
      // front-door flourish uses this.piano (Salamander-or-pianoVoice) instead.
      // Course voice: a real sampled grand (Salamander, CC-BY) once its samples
      // have loaded, with the rc2-163 synth voice (pianoVoice) as the always-ready
      // fallback. `this.piano` is a thin ROUTER over both; every call is guarded so
      // a sampler fault can NEVER break a keypress or demo. The sampler lazy-loads
      // after the audio-unlock gesture (see _wireSound); until it is ready, the
      // engine's noteOn() returns false and the router uses the synth. Course-only:
      // nothing else in the app calls this.piano.
      const pianoFallback = new PianoSynth(ctx, { volume: 0.8 });
      const coursePiano = createCoursePiano({ basePath: 'assets/piano/salamander-lite', volume: 0.85 });
      this.coursePiano = coursePiano;   // kept so _wireSound can lazy-init after unlock
      this.pianoFallback = pianoFallback;   // splash flourish plays through this directly (short 0.18s release)
      this.piano = {
        limiter: pianoFallback.limiter,                 // routed to the master bus below
        noteOn: (m, v, t) => {
          try { if (coursePiano.isReady() && coursePiano.noteOn(m, v, t)) return; } catch (_) { /* fall through */ }
          pianoFallback.noteOn(m, v, t);
        },
        noteOff: (m, t) => {
          try { coursePiano.noteOff(m, t); } catch (_) { /* no-op */ }
          try { pianoFallback.noteOff(m, t); } catch (_) { /* no-op */ }
        },
        allNotesOff: () => {
          try { coursePiano.allNotesOff(); } catch (_) { /* no-op */ }
          try { pianoFallback.allNotesOff(); } catch (_) { /* no-op */ }
        },
        panic: () => {
          try { coursePiano.panic(); } catch (_) { /* no-op */ }
          try { pianoFallback.panic(); } catch (_) { /* no-op */ }
        },
        setVolume: (x) => {
          try { coursePiano.setVolume(x); } catch (_) { /* no-op */ }
          try { pianoFallback.setVolume(x); } catch (_) { /* no-op */ }
        },
      };
      this.scheduler = new Scheduler(ctx, { tempo: 90, beatsPerBar: 4 });
      this.metronome = new Metronome(this.scheduler, { volume: 0.55, enabled: false });
      // ONE shared output chain: every engine feeds a single safety-limited bus
      // so overlapping/dense passages can't sum past 0 dBFS (the crackle cause).
      // Non-invasive — each engine's existing output node is reconnected; the
      // protected Synth is NOT modified.
      routeToMasterBus(this.synth.limiter, ctx);
      routeToMasterBus(this.piano.limiter, ctx);
      routeToMasterBus(this.metronome.bus, ctx);
      this._wireSound();
    } else {
      // Silent fallback: the keyboard still works visually.
      this.synth = this.scheduler = this.metronome = null;
      this.piano = null;
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
    // App-shell long-press hardening: suppress the Android/Chrome context menu
    // (Download / Share / Print) on lesson/instrument/visual surfaces, while
    // leaving form fields and links with their native behaviour. Scoped to the
    // shell — clicks, sliders, buttons and accessibility are unaffected.
    const shell = document.getElementById('app-shell') || document.body;
    const exempt = (t) => t && t.closest && t.closest('input, textarea, [contenteditable], a[href]');
    shell.addEventListener('contextmenu', (e) => { if (!exempt(e.target)) e.preventDefault(); });
    shell.addEventListener('dragstart', (e) => { if (!exempt(e.target)) e.preventDefault(); });

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
      if (!unlocked) {
        unlockAudio(); unlocked = true; this._playFlourish();
        // (rc2-187) No TTS prime here: the browser TTS path is disabled, so the speech
        // engine is never touched on entry — no chance of a stray browser voice.
        // Lazy-load the Course sampled grand now that the context is unlocked.
        // Fire-and-forget: any failure (missing samples / decode error) simply
        // leaves the rc2-163 synth fallback in place. Routes into the shared bus.
        try {
          const ac = getAudioContext();
          this.coursePiano?.init(ac, { destination: getMasterBus(ac) }).catch(() => {});
        } catch (_) { /* keep the synth voice */ }
      }
    };
    // Any first gesture is enough to unlock; key presses are the common one.
    window.addEventListener('pointerdown', ensureAudio, { once: true });
    window.addEventListener('keydown', ensureAudio, { once: true });

    this._unsubs.push(
      this.keyboard.on('press', (midi, detail) => {
        this._suppressFlourish = true;   // a real keypress — don't also sound the flourish
        ensureAudio();
        this.piano?.noteOn(midi, detail.velocity ?? 100);
      }),
      this.keyboard.on('release', (midi) => {
        this.piano?.noteOff(midi);
      })
    );
  }

  /**
   * The front-door flourish — D4 → A4, a soft rising fifth, like a pianist gently
   * touching two keys before practice. Played through this.piano: the rc2-166
   * sampled Salamander grand when its samples are ready, and the safe pianoVoice
   * synth otherwise — never a bespoke beep. Idempotent and self-gating: it sounds
   * once, only when the AudioContext is actually running (browser autoplay keeps it
   * suspended until a gesture, so a cold-load attempt simply waits for the first
   * interaction to retry), and only when the flourish setting is enabled.
   */
  _playFlourish() {
    // Splash flourish DISABLED (rc2-186 stabilisation). Pressing Continue plays no
    // note of any kind: no D4/A4, no B-major motif, no Salamander note, no pianoVoice
    // synth note. The audio unlock itself is silent (a one-sample silent buffer).
    // Kept as a no-op so its call sites (ensureAudio, legacy onFlourish) stay valid;
    // reinstate a body here to restore a welcome flourish later.
    return;
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
   * Immersive fullscreen, fired directly from a launch tap. Must be called
   * synchronously inside the click handler (before any await/timer) so the user
   * activation is still valid. Never throws, never blocks entry; returns whether
   * fullscreen was entered. Honest: if the browser declines, the app proceeds.
   */
  async _requestImmersiveFullscreen() {
    try {
      const root = document.documentElement;
      if (document.fullscreenElement || document.webkitFullscreenElement) return true;
      if (root.requestFullscreen && document.fullscreenEnabled) {
        await root.requestFullscreen({ navigationUI: 'hide' });
        return true;
      }
      if (root.webkitRequestFullscreen) {            // older Android/Safari WebKit path
        root.webkitRequestFullscreen();
        return true;
      }
      return false;
    } catch (err) {
      console.info('[KeyMaster] fullscreen request not accepted:', err?.message ?? err);
      return false;
    }
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

    if (viewId === 'home') this._updateDashboardHero();
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
        // Controller failed to load. Keep the instrument playable AND surface a
        // readable on-screen diagnostic so the failure can be reported without
        // browser dev tools.
        console.info(`[KeyMaster] "${viewId}" controller unavailable:`, err?.message ?? err);
        renderPlaceholder(slot, viewId, { err, src: def.src });
        return;
      }
    }

    if (!record.factory) { renderPlaceholder(slot, viewId); return; }

    try {
      if (!record.instance) {
        record.instance = record.factory({
          mount: slot,
          route: viewId,
          progress: this.progress,
          store: this.store,
          keyboard: this.keyboard,
          viewport: this.viewport,
          midi: this.midi,
          input: this.input,
          evaluator: this.evaluator,
          synth: this.synth,
          piano: this.piano,   // the proven keypress engine — Course demo fallback
          scheduler: this.scheduler,
          metronome: this.metronome,
          nav: this._makeNav(viewId),
          // Course Focus Mode: lets the Course collapse/show the on-screen
          // keyboard per step via the existing data-keyboard mechanism. It does
          // NOT persist, so the manual keyboard toggle's saved preference is left
          // intact and the toggle button label stays in sync.
          setKeyboardVisible: (visible) => this._applyKeyboardPref(!visible),
        });
      }
      record.instance.enter?.();
    } catch (err) {
      console.info(`[KeyMaster] "${viewId}" controller failed to mount:`, err?.message ?? err);
      renderPlaceholder(slot, viewId, { err, src: def.src, phase: 'mount' });
    }
  }

  async _exitView(viewId) {
    const record = this.views.get(viewId);
    record?.instance?.exit?.();
    // Always reset any per-exercise decoration the controller may have left.
    this.keyboard.clearFingers();
    this.keyboard.clearHighlight('target');
    this.keyboard.allNotesOff();
  }

  /**
   * Fill the dashboard hero from learning memory + the existing local-time greeting.
   * The Course is the centre: greeting, course title, next step, one primary action,
   * subtle progress, and a discreet build tag. Fully isolated — any failure leaves the
   * static fallbacks in place. Foundations is imported lazily (non-blocking) so the
   * dashboard never eager-loads the lesson chain.
   */
  _updateDashboardHero() {
    try {
      const set = (sel, txt) => { const e = this.root.querySelector(sel); if (e && txt != null) e.textContent = txt; };
      set('#build-tag', `KeyMaster PRO \u00B7 Flagship Front Door \u00B7 Stages 1\u20134 \u00B7 ${BUILD}`);
      const lesson = this.progress?.get?.('learnLesson');
      const completed = this.progress?.get?.('learnCompleted');
      const started = (Number.isInteger(lesson) && lesson > 0)
        || (Array.isArray(completed) && completed.length > 0);
      const cta = this.root.querySelector('#learn-cta');
      if (cta) cta.textContent = started ? 'Continue the Foundation Course' : 'Start the Foundation Course';
      set('#course-hero-title', started ? 'Continue the Foundation Course' : COURSE_NAME);
      import('./foundations.js?v=rc2-189').then((F) => {
        const name = (typeof getDisplayName === 'function' && getDisplayName()) || F.LEARNER_NAME || '';
        set('#hero-greeting', F.greetingFor(new Date(), name));
        const steps = Array.isArray(F.LEARN_STEPS) ? F.LEARN_STEPS : [];
        let idx = Number.isInteger(lesson) ? lesson : 0;
        if (idx < 0 || idx > steps.length - 1) idx = 0;
        const stepTitle = (steps[idx] && steps[idx].title) ? steps[idx].title : '';
        const lead = started ? 'Your next step' : 'Your first step';
        const ch = (typeof F.chapterAtIndex === 'function') ? F.chapterAtIndex(idx) : null;
        if (ch && ch.name) {
          const stageTag = ch.stage ? `Stage ${ch.stage} \u00B7 ` : '';
          set('#hero-next', stepTitle ? `${stageTag}${ch.name} \u00B7 ${lead}: ${stepTitle}` : `${stageTag}${ch.name} \u00B7 ${lead}.`);
          set('#hero-progress', steps.length
            ? `Chapter ${ch.chIdx} of ${ch.chTotal} \u00B7 Lesson ${idx + 1} of ${steps.length}`
            : '');
        } else {
          set('#hero-next', stepTitle ? `${lead}: ${stepTitle}` : `${lead}.`);
          set('#hero-progress', steps.length ? `Lesson ${idx + 1} of ${steps.length}` : '');
        }
        // Hub: reveal "Review previous lesson" + the progress bar once begun.
        try {
          const reviewBtn = this.root.querySelector('#hub-review');
          if (reviewBtn) reviewBtn.hidden = !started;
          const bar = this.root.querySelector('#hero-bar');
          const fill = this.root.querySelector('#hero-bar-fill');
          if (bar && fill && steps.length) {
            const pct = Math.max(2, Math.min(100, Math.round((idx / steps.length) * 100)));
            bar.hidden = !started;
            if (started) fill.style.width = pct + '%';
          }
        } catch { /* ignore */ }
      }).catch((err) => { console.info('[KeyMaster] hero enrich skipped:', err?.message ?? err); });
    } catch (err) {
      console.info('[KeyMaster] dashboard hero update skipped:', err?.message ?? err);
    }
  }
}

/* ===========================================================================
 * 5. Helpers
 * ========================================================================= */

/** Render a graceful panel for an unbuilt view, or — when a load/mount error is
 *  supplied — an on-screen diagnostic so failures can be reported without dev tools. */
function renderPlaceholder(slot, viewId, info = {}) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const label = MODULE_NAME[viewId] ?? viewId;          // correct per-route label
  slot.replaceChildren();
  const panel = document.createElement('div');
  panel.className = 'placeholder';

  if (info.err) {
    const err = info.err;
    const src = info.src ? info.src.replace(/^\.\//, '') : '(unknown module)';
    const token = (src.match(/\?v=([^&]+)/) || [])[1] || '(none)';
    const phase = info.phase === 'mount' ? 'while starting (after download)' : 'while loading (download/parse)';
    const msg = String(err && err.message ? err.message : err);
    const name = err && err.name ? err.name : 'Error';
    const kind = classifyLoadError(err);
    const diag =
      `Route:     #/${viewId}\n` +
      `Requested: ${src}\n` +
      `Version:   ${token}\n` +
      `Failed:    ${phase}\n` +
      `Cause:     ${kind}\n` +
      `Error:     ${name}: ${msg}`;
    panel.classList.add('placeholder--error');
    panel.innerHTML =
      `<p class="placeholder__title">${esc(label)} failed to load.</p>` +
      `<pre style="text-align:left;white-space:pre-wrap;word-break:break-word;` +
      `font-family:var(--font-mono,monospace);font-size:.82rem;line-height:1.55;` +
      `background:rgba(0,0,0,.28);color:var(--ivory,#eee);padding:.75rem .85rem;` +
      `border-radius:8px;max-width:100%;overflow-x:auto;margin:.6rem 0">${esc(diag)}</pre>` +
      `<p class="placeholder__note">The keyboard below is still live. ` +
      `Please report the lines above — other lessons are unaffected.</p>`;
  } else {
    panel.innerHTML =
      `<p class="placeholder__title">${esc(label)}</p>` +
      `<p class="placeholder__note">This vector is being wired up. ` +
      `The keyboard below is live — play freely.</p>`;
  }
  slot.appendChild(panel);
}

/** Best-effort, dev-tools-free classification of a dynamic-import failure. */
function classifyLoadError(err) {
  const name = err && err.name ? err.name : '';
  const m = String(err && err.message ? err.message : err).toLowerCase();
  if (name === 'SyntaxError' || m.includes('unexpected') || m.includes('syntax')) return 'Syntax error in the module (server copy differs from source).';
  if (m.includes('does not provide an export') || m.includes('export named')) return 'Missing/mismatched export in the module or a dependency.';
  if (m.includes('failed to fetch') || m.includes('dynamically imported module') || m.includes('404') || m.includes('not found') || m.includes('network')) return 'Module file not served (likely 404 — not deployed, wrong case, or stale cache).';
  return 'Unrecognised load error — read the Error line below.';
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
