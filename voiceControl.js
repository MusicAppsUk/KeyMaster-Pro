// voiceControl.js — the single authority for Jack narration.
// =============================================================================
// Wraps the (frozen) tutorAudio instance so EVERY narration request — from any
// caller or render path — passes through ONE guard before any audio starts:
//
//   • one active Jack playback at a time;
//   • a duplicate request for the line already playing is ignored;
//   • a duplicate request for the same line inside a short debounce window is
//     ignored;
//   • an explicit replay ("Hear it again", opts.explicit) always plays;
//   • a genuinely different line stops the old one and plays (tutorAudio already
//     cancels prior playback) — never two voices at once.
//
// This sits at the central voice-control level, NOT in one render path, so even
// if two callers accidentally request the same line, only one plays. tutorAudio.js
// itself is never modified. A live diagnostic is exposed on window.__kmVoice for
// the in-app Voice Self-Test (#voice-test), so no console work is needed.
// =============================================================================

export function createVoiceControl(audio, opts = {}) {
  if (!audio) return audio;
  const build = opts.build || 'dev';
  const DEBOUNCE_MS = Number.isFinite(opts.debounceMs) ? opts.debounceMs : 2500;

  let activeKey = null;   // key of the playback currently sounding (null = idle)
  let activeToken = 0;    // bumps on every start; identifies the live playback
  let lastKey = null;     // last key we started
  let lastAt = 0;         // when we started it (ms)
  let diagPack = null;    // captured from setPack, for diagnostic URL resolution
  let diagLang = opts.lang || 'en-GB';
  const recent = [];      // last requests, for the self-test panel

  function record(rec) {
    recent.push(rec);
    if (recent.length > 12) recent.shift();
    try {
      if (typeof window !== 'undefined') {
        const g = (window.__kmVoiceTrace = window.__kmVoiceTrace || []);
        g.push(rec);
        if (g.length > 40) g.shift();
      }
    } catch (_) { /* no-op */ }
  }

  function decide(key, explicit) {
    if (explicit) return { ok: true, reason: 'explicit' };
    if (activeKey !== null && activeKey === key) return { ok: false, reason: 'already-playing' };
    if (key === lastKey && (Date.now() - lastAt) < DEBOUNCE_MS) return { ok: false, reason: 'debounce' };
    return { ok: true, reason: 'allowed' };
  }
  function begin(key) { activeToken += 1; const tok = activeToken; activeKey = key; lastKey = key; lastAt = Date.now(); return tok; }
  function endIf(tok) { if (tok === activeToken) activeKey = null; }

  function run(fn, key, beatsOrText, options) {
    const explicit = !!options.explicit;
    const source = options.source || (explicit ? 'repeat' : 'auto');
    const d = decide(key, explicit);
    record({ t: Date.now(), build, fn, id: key, src: source, result: d.ok ? 'play' : 'blocked', reason: d.reason });
    if (!d.ok) { if (typeof options.onDone === 'function') { try { options.onDone(); } catch (_) {} } return undefined; }
    const tok = begin(key);
    const wrapped = { ...options };
    const userDone = options.onDone;
    wrapped.onDone = () => { endIf(tok); if (typeof userDone === 'function') { try { userDone(); } catch (_) {} } };
    return fn(key, beatsOrText, wrapped);
  }

  const facade = {
    // ---- mirror of tutorAudio's interface, guarded ----
    say(lineId, text, options = {}) { return run((id, t, o) => audio.say(id, t, o), lineId, text, options); },
    sayBeats(baseId, beats, options = {}) { return run((id, b, o) => audio.sayBeats(id, b, o), baseId, beats, options); },
    setPack(map, lang) { diagPack = (map && typeof map === 'object') ? map : null; if (lang) diagLang = lang; return audio.setPack?.(map, lang); },
    cancel() { activeKey = null; activeToken += 1; return audio.cancel?.(); },
    hasPremium(id) { return audio.hasPremium?.(id); },
    isPremiumActive() { return audio.isPremiumActive?.(); },
    lang() { return audio.lang?.() ?? diagLang; },

    // ---- diagnostics for the Voice Self-Test (#voice-test) ----
    diag: {
      build,
      voiceEnabled: () => !!(diagPack && Object.keys(diagPack).length),
      resolved(lineId) {
        const file = diagPack ? diagPack[lineId] : null;
        return { lineId, file: file || null, url: file ? `voice/${diagLang}/${file}` : null };
      },
      state() {
        return {
          build,
          voiceEnabled: !!(diagPack && Object.keys(diagPack).length),
          activeKey,
          activeCount: activeKey ? 1 : 0,
          lastKey,
          lastAt,
          recent: recent.slice(-5),
        };
      },
    },
  };

  // Stop cleanly when the page/app is hidden or closed (route exit and session
  // reset already call cancel() explicitly in the Course controller).
  try {
    if (typeof window !== 'undefined') {
      window.__kmVoice = facade;
      window.addEventListener('pagehide', () => facade.cancel(), { once: false });
    }
  } catch (_) { /* no-op */ }

  return facade;
}
