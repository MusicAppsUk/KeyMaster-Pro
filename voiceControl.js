// voiceControl.js — the single GLOBAL authority for Jack narration.
// =============================================================================
// rc2-122 recovery: the guard state lives on ONE window-level singleton
// (window.__kmVoiceGuard), shared by every controller and every Course instance.
// This is the fix for the device double-start: even if the Course component is
// instantiated more than once (two routes, a prefetch, a stale un-left view),
// each instance wraps tutorAudio with its own facade — but they all consult the
// SAME guard, so only ONE Jack voice can ever play.
//
// Rules (global):
//   - one active Jack playback at a time;
//   - a request for the line already playing is ignored ("already-playing");
//   - a request for the same line inside a short debounce window is ignored;
//   - a "once" line (the welcome) plays at most once per session ("once-done");
//   - an explicit replay ("Hear it again", opts.explicit) always plays;
//   - a genuinely different line stops the old and plays — never two at once.
//
// tutorAudio.js is wrapped, never modified. Diagnostics are exposed on
// window.__kmVoice for the in-app Voice Self-Test (#voice-test) — no console.
// =============================================================================

function sharedGuard(build) {
  const w = (typeof window !== 'undefined') ? window : globalThis;
  if (!w.__kmVoiceGuard) {
    w.__kmVoiceGuard = {
      build,
      activeKey: null, activeToken: 0, lastKey: null, lastAt: 0,
      oncePlayed: {}, controllers: 0, requests: 0, blocked: 0, recent: [],
    };
  }
  if (build) w.__kmVoiceGuard.build = build;
  return w.__kmVoiceGuard;
}

export function createVoiceControl(audio, opts = {}) {
  if (!audio) return audio;
  const build = opts.build || 'dev';
  const DEBOUNCE_MS = Number.isFinite(opts.debounceMs) ? opts.debounceMs : 2500;
  const G = sharedGuard(build);
  G.controllers += 1;
  let diagPack = null;
  let diagLang = opts.lang || 'en-GB';

  function record(rec) {
    G.requests += 1;
    if (rec.result === 'blocked') G.blocked += 1;
    G.recent.push(rec);
    if (G.recent.length > 12) G.recent.shift();
    try {
      const w = (typeof window !== 'undefined') ? window : globalThis;
      const t = (w.__kmVoiceTrace = w.__kmVoiceTrace || []);
      t.push(rec);
      if (t.length > 50) t.shift();
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

  function run(fn, key, payload, options) {
    const explicit = !!options.explicit;
    const once = !!options.once;
    const source = options.source || (explicit ? 'repeat' : 'auto');
    const d = decide(key, explicit, once);
    record({ t: Date.now(), build, fn: options._fn || 'say', id: key, src: source, result: d.ok ? 'play' : 'blocked', reason: d.reason });
    if (!d.ok) { if (typeof options.onDone === 'function') { try { options.onDone(); } catch (_) {} } return undefined; }
    const tok = begin(key, once);
    const userDone = options.onDone;
    const wrapped = { ...options };
    delete wrapped._fn;
    wrapped.onDone = () => { endIf(tok); if (typeof userDone === 'function') { try { userDone(); } catch (_) {} } };
    return fn(key, payload, wrapped);
  }

  const facade = {
    say(lineId, text, options = {}) { return run((id, t, o) => audio.say(id, t, o), lineId, text, { ...options, _fn: 'say' }); },
    sayBeats(baseId, beats, options = {}) { return run((id, b, o) => audio.sayBeats(id, b, o), baseId, beats, { ...options, _fn: 'sayBeats' }); },
    setPack(map, lang) { diagPack = (map && typeof map === 'object') ? map : null; if (lang) diagLang = lang; return audio.setPack?.(map, lang); },
    cancel() { G.activeKey = null; G.activeToken += 1; return audio.cancel?.(); },
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
          voiceEnabled: !!(diagPack && Object.keys(diagPack).length),
          controllers: G.controllers,
          requests: G.requests,
          blocked: G.blocked,
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
      window.addEventListener('pagehide', () => facade.cancel(), { once: false });
    }
  } catch (_) { /* no-op */ }

  return facade;
}
