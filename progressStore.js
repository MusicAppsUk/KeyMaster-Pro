// progressStore.js
//
// Local, best-effort LEARNING MEMORY for KeyMaster PRO. This is the foundation of
// the tutor relationship: it lets the app remember where a learner is, so the
// Master Training path can say "welcome back" and resume rather than restart.
//
// Principles (held as product doctrine):
//   • Musical-learning memory ONLY — no personal data, no cloud, no sign-in, no
//     hidden model. Everything stored here is a plain, legible fact about the
//     learning (which lesson, which cards done, voice on/off, what to review).
//   • Versioned + namespaced ('keymaster.progress.v1') so future updates migrate
//     forward instead of breaking on old data.
//   • Best-effort: localStorage may be unavailable (private mode, disabled) or
//     corrupt. The store then runs in memory for the session and NEVER throws into
//     a lesson. available() reports honestly whether anything will persist.
//
// Pure module: no DOM, no audio, no imports. Safe to construct anywhere. Nothing in
// the app reads it yet — it is the foundation the /learn route (Stage 2) builds on.

const STORAGE_KEY = 'keymaster.progress.v1';
const SCHEMA_VERSION = 1;

// The full shape of stored state. Fields default to safe, empty values so a brand
// new learner and a learner with cleared storage behave identically.
function freshState() {
  return {
    schema: SCHEMA_VERSION,
    route: null,                  // last main route/module the learner was on
    learnLesson: 0,               // current Master Training lesson index
    learnCompleted: [],           // ids of completed Learn lessons
    foundationsCompleted: [],     // ids of completed Foundations cards
    heardNarration: [],           // narration ids already spoken (no repeats)
    voiceOn: true,                // tutor voice preference
    voicePrefMigrated: false,     // one-time: legacy 'voice off' migrated to Jack-on default
    preambleStepMigrated: false,  // one-time: resume index shifted for the rc2-162 preamble step
    keyboardVisible: true,        // keyboard-visible preference
    fingeringVisible: true,       // fingering-visible preference
    scales: null,                 // opaque Scales settings (set by that module later)
    chord: null,                  // opaque Chord progress (set later)
    sightReadingLevel: null,      // Sight-Reading level (set later)
    supportLevel: null,           // labels/hints fade level (future)
    attempts: {},                 // per-item attempt counts (future, keyed by id)
    updatedAt: 0,                 // last write time (ms)
  };
}

// Probe whether localStorage is actually usable (existence is not enough — Safari
// private mode throws on write). Done once per store.
function hasLocalStorage() {
  try {
    if (typeof localStorage === 'undefined' || localStorage === null) return false;
    const probe = '__km_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch (_) {
    return false;
  }
}

// Bring any parsed object up to the current schema. For v1 there is no prior
// schema, so current data is merged onto fresh defaults (filling missing fields,
// dropping unknown ones) and anything else starts fresh. Future schema bumps add
// real step-by-step migrations here instead of discarding data.
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return freshState();
  if (raw.schema === SCHEMA_VERSION) {
    const base = freshState();
    for (const k of Object.keys(base)) {
      if (k in raw && raw[k] !== undefined) base[k] = raw[k];
    }
    base.schema = SCHEMA_VERSION;
    return base;
  }
  return freshState();
}

export function createProgressStore() {
  const persistent = hasLocalStorage();
  let state;

  function load() {
    if (!persistent) return freshState();
    try {
      const txt = localStorage.getItem(STORAGE_KEY);
      if (!txt) return freshState();
      return migrate(JSON.parse(txt));
    } catch (_) {
      return freshState();   // corrupt JSON → fresh, never throw
    }
  }

  function persist() {
    if (!persistent) return;
    try {
      state.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      /* quota / availability changed mid-session — keep going in memory */
    }
  }

  state = load();

  return {
    // Honest report: does anything written here actually survive a reload?
    available: () => persistent,

    // Read a shallow copy of everything (callers must not mutate internal state).
    getAll: () => ({ ...state }),

    // Read one field.
    get: (field) => state[field],

    // Write one field.
    set(field, value) {
      state[field] = value;
      persist();
      return value;
    },

    // Merge several fields at once.
    update(partial) {
      if (partial && typeof partial === 'object') {
        for (const [k, v] of Object.entries(partial)) state[k] = v;
        persist();
      }
      return { ...state };
    },

    // Add an id to a list field once (deduped). Used for completed lessons,
    // completed cards, heard-narration ids.
    addToSet(field, id) {
      let arr = state[field];
      if (!Array.isArray(arr)) arr = state[field] = [];
      if (!arr.includes(id)) {
        arr.push(id);
        persist();
      }
      return arr.slice();
    },

    // Is an id present in a list field?
    has(field, id) {
      return Array.isArray(state[field]) && state[field].includes(id);
    },

    // Increment a counter inside a map field (e.g. attempts[noteId]).
    incr(mapField, id, by = 1) {
      let map = state[mapField];
      if (!map || typeof map !== 'object' || Array.isArray(map)) {
        map = state[mapField] = {};
      }
      map[id] = (map[id] || 0) + by;
      persist();
      return map[id];
    },

    // Wipe everything back to a fresh state (the "reset progress" action).
    reset() {
      state = freshState();
      persist();
      return { ...state };
    },
  };
}

// Exposed for tests / callers that need the constants without constructing a store.
export const PROGRESS_STORAGE_KEY = STORAGE_KEY;
export const PROGRESS_SCHEMA_VERSION = SCHEMA_VERSION;
