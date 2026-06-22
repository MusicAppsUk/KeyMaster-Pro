// voiceControl.js — the single GLOBAL authority + single audio ENGINE for Jack.
// =============================================================================
// rc2-125 recovery: this is now a true singleton. The FIRST call binds one
// tutorAudio engine and one guard to window.__kmVoice; every later call (e.g. a
// second Course instance) gets that SAME controller back and its own tutorAudio
// is discarded, unused. Because tutorAudio keeps a single `current` Audio element
// and pauses it before each new one, sharing ONE engine makes overlapping Jack
// voices structurally impossible — there is only ever one audio element.
//
// Guarantees (global, cross-instance):
//   • exactly one Jack narration plays at a time (one engine, one element);
//   • before any new line, the active audio is stopped/disposed (stop-before-start);
//   • a request for the line already playing is ignored ("already-playing");
//   • a same-line request inside a short window is ignored ("debounce");
//   • a "once" line (the welcome) plays at most once per session ("once-done");
//   • an explicit replay ("Hear it again") always plays;
//   • cancel() stops everything (used on route exit / session reset).
//
// tutorAudio.js is wrapped, never modified. Diagnostics on window.__kmVoice feed
// the in-app Voice Self-Test (#voice-test) — no console needed.
// =============================================================================

function sharedGuard(build) {
  const w = (typeof window !== 'undefined') ? window : globalThis;
  if (!w.__kmVoiceGuard) {
    w.__kmVoiceGuard = {
      build, activeKey: null, activeToken: 0, lastKey: null, lastAt: 0,
      oncePlayed: {}, controllers: 0, requests: 0, blocked: 0, stops: 0, recent: [],
    };
  }
  if (build) w.__kmVoiceGuard.build = build;
  return w.__kmVoiceGuard;
}

export function createVoiceControl(audio, opts = {}) {
  if (!audio) return audio;
  const w = (typeof window !== 'undefined') ? window : globalThis;
  const G = sharedGuard(opts.build || 'dev');
  G.controllers += 1;

  // SINGLETON: reuse the one shared controller/engine if it already exists, so the
  // whole app shares a single audio element. The extra tutorAudio passed here is
  // discarded (never played) — that is what prevents two voices at once.
  if (w.__kmVoice && w.__kmVoiceEngineBound) return w.__kmVoice;

  const build = opts.build || 'dev';
  const DEBOUNCE_MS = Number.isFinite(opts.debounceMs) ? opts.debounceMs : 2500;
  let diagPack = null;
  let diagLang = opts.lang || 'en-GB';

  function record(rec) {
    G.requests += 1;
    if (rec.result === 'blocked') G.blocked += 1;
    G.recent.push(rec);
    if (G.recent.length > 12) G.recent.shift();
    try {
      const t = (w.__kmVoiceTrace = w.__kmVoiceTrace || []);
      t.push(rec); if (t.length > 50) t.shift();
    } catch (_) { /* no-op */ }
  }
  function decide(key, explicit, once) {
    if (explicit) return { ok: true, reason: 'explicit' };
    if (once && G.oncePlayed[key]) return { ok: false, reason: 'once-done' };
    if (G.activeKey !== null && G.activeKey === key) return { ok: false, reason: 'already-playing' };
    if (key === G.lastKey && (Date.now() - G.lastAt) < DEBOUNCE_MS) return { ok: false, reason: 'debounce' };
    return { ok: true, reason: 'allowed' };
  }
  function begin(key, once) { G.activeToken += 1; const tok = G.activeToken; G.activeKey = key; G.lastKey = key; G.lastAt = Date.now(); if (once) G.oncePlayed[key] = true; return tok; }
  function endIf(tok) { if (tok === G.activeToken) G.activeKey = null; }
  function hardStop() { try { audio.cancel?.(); G.stops += 1; } catch (_) { /* no-op */ } G.activeKey = null; G.activeToken += 1; }

  function run(fnName, fn, key, payload, options) {
    const explicit = !!options.explicit;
    const once = !!options.once;
    const source = options.source || (explicit ? 'repeat' : 'auto');
    const d = decide(key, explicit, once);
    record({ t: Date.now(), build, fn: fnName, id: key, src: source, result: d.ok ? 'play' : 'blocked', reason: d.reason, stoppedPrev: false });
    if (!d.ok) { if (typeof options.onDone === 'function') { try { options.onDone(); } catch (_) {} } return undefined; }
    // STOP-BEFORE-START: dispose any active Jack audio before the new line.
    const hadActive = G.activeKey != null;
    hardStop();
    if (hadActive) { const r = G.recent[G.recent.length - 1]; if (r) r.stoppedPrev = true; }
    const tok = begin(key, once);
    const userDone = options.onDone;
    const wrapped = { ...options };
    delete wrapped._fn;
    wrapped.onDone = () => { endIf(tok); if (typeof userDone === 'function') { try { userDone(); } catch (_) {} } };
    return fn(key, payload, wrapped);
  }

  const facade = {
    say(lineId, text, options = {}) { return run('say', (id, t, o) => audio.say(id, t, o), lineId, text, options); },
    sayBeats(baseId, beats, options = {}) { return run('sayBeats', (id, b, o) => audio.sayBeats(id, b, o), baseId, beats, options); },
    setPack(map, lang) { diagPack = (map && typeof map === 'object') ? map : null; if (lang) diagLang = lang; return audio.setPack?.(map, lang); },
    cancel() { hardStop(); return undefined; },
    hasPremium(id) { return audio.hasPremium?.(id); },
    isPremiumActive() { return audio.isPremiumActive?.(); },
    lang() { return audio.lang?.() ?? diagLang; },
    diag: {
      build,
      voiceEnabled: () => !!(diagPack && Object.keys(diagPack).length),
      resolved(lineId) { const f = diagPack ? diagPack[lineId] : null; return { lineId, file: f || null, url: f ? `voice/${diagLang}/${f}` : null }; },
      state() {
        return {
          build: G.build,
          engine: 'shared-singleton',
          voiceEnabled: !!(diagPack && Object.keys(diagPack).length),
          controllers: G.controllers,
          requests: G.requests,
          blocked: G.blocked,
          stops: G.stops,
          activeKey: G.activeKey,
          activeCount: G.activeKey ? 1 : 0,
          lastKey: G.lastKey,
          oncePlayed: Object.keys(G.oncePlayed),
          recent: G.recent.slice(-5),
        };
      },
    },
  };

  try {
    if (typeof window !== 'undefined') {
      window.__kmVoice = facade;
      window.__kmVoiceEngineBound = true;   // marks the singleton engine as bound
      window.addEventListener('pagehide', () => facade.cancel(), { once: false });
    }
  } catch (_) { /* no-op */ }

  return facade;
}
