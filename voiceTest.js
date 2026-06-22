// voiceTest.js — visible in-app Voice Self-Test, reachable at #voice-test.
// =============================================================================
// A discreet diagnostic so Tim never needs the browser console. It reports the
// running build, the resolver result for the welcome line, the live fetch status
// of its MP3, and the central controller's state (active playbacks, last
// requests). Buttons exercise the guard directly:
//   • Play welcome once       -> expect 1 play
//   • Play welcome twice quickly -> expect 1 play + 1 "duplicate blocked"
//   • Stop Jack
//   • Check Stage 1 voice file -> fetch welcome-0.mp3, show 200/404
//   • Reset cache / reload     -> clears caches + service workers, hard reload
//
// Self-contained: it uses the app's controller (window.__kmVoice) if the Course
// has been opened; otherwise it builds its own from the same modules so the test
// works standalone. Importing this file just registers a hash listener — it adds
// no UI unless #voice-test is open, so it is safe to leave in and easy to remove.
// =============================================================================

import { createTutorAudio } from './tutorAudio.js?v=rc2-107';
import { createVoiceControl } from './voiceControl.js?v=rc2-122';
import { VOICE_PACK } from './voicePackData.js?v=rc2-116';

const BUILD = 'rc2-122';
const WELCOME_ID = 'welcome.say.0';
const WELCOME_FILE = (VOICE_PACK && VOICE_PACK[WELCOME_ID]) || 'welcome-0.mp3';
const WELCOME_URL = `voice/en-GB/${WELCOME_FILE}`;
const WELCOME_TEXT = 'Welcome to the KeyMaster PRO Course.';

let panel = null;
let lastExtra = {};

function controller() {
  if (typeof window === 'undefined') return null;
  if (window.__kmVoice) return window.__kmVoice;
  // Standalone fallback so the test works without opening the Course first.
  try {
    const raw = createTutorAudio({ voice: null, lang: 'en-GB', ttsFallback: false });
    const ctrl = createVoiceControl(raw, { build: BUILD, lang: 'en-GB' });
    ctrl.setPack(VOICE_PACK, 'en-GB');
    return ctrl;     // createVoiceControl also assigns window.__kmVoice
  } catch (_) { return null; }
}

function row(label, value) {
  return `<div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0;border-bottom:1px solid #2a2620">
    <span style="color:#9a9488">${label}</span><span style="color:#f3efe6;font-weight:600;text-align:right;word-break:break-word">${value}</span></div>`;
}

function refresh(extra) {
  if (!panel) return;
  lastExtra = Object.assign({}, lastExtra, extra || {});
  extra = lastExtra;
  const c = controller();
  const st = c && c.diag ? c.diag.state() : null;
  const res = c && c.diag ? c.diag.resolved(WELCOME_ID) : { file: WELCOME_FILE, url: WELCOME_URL };
  const body = panel.querySelector('[data-body]');
  body.innerHTML =
    row('Build / version', `<b>${(st && st.build) || (window.__kmBuild) || BUILD}</b>`) +
    row('Active cache', extra && extra.cache != null ? extra.cache : '… (loading)') +
    row('Voice enabled', st ? String(st.voiceEnabled) : 'n/a (open Course once)') +
    row('Controllers (instances)', st ? String(st.controllers) : '—') +
    row('Speak requests (total)', st ? String(st.requests) : '—') +
    row('Duplicates blocked (total)', st ? String(st.blocked) : '—') +
    row('Welcome line ID', WELCOME_ID) +
    row('Resolved MP3', res.file || '—') +
    row('Resolved URL', res.url || '—') +
    row('Fetch status', extra && extra.fetch != null ? extra.fetch : '— (tap “Check Stage 1 file”)') +
    row('Playback started', extra && extra.started != null ? String(extra.started) : '—') +
    row('Duplicate blocked', extra && extra.blocked != null ? String(extra.blocked) : '—') +
    row('Active narrations', st ? String(st.activeCount) : '—') +
    `<div style="margin-top:8px;color:#9a9488">Last 5 requests</div>` +
    `<pre style="margin:4px 0 0;white-space:pre-wrap;color:#cfc9bd;font-size:12px">${
      (st && st.recent && st.recent.length)
        ? st.recent.map((r) => `${new Date(r.t).toLocaleTimeString()}  ${r.fn} ${r.id}  <${r.src}>  ${r.result}${r.reason ? ' (' + r.reason + ')' : ''}`).join('\n')
        : '—'
    }</pre>`;
  if (lastExtra.cache == null) {
    try {
      if (window.caches && caches.keys) caches.keys().then((ks) => {
        const km = ks.filter((k) => /keymaster/i.test(k));
        const lbl = (km.length ? km.join(', ') : (ks[0] || 'none')) + (km.length > 1 ? '  ** MULTIPLE — stale mix **' : '');
        if (lastExtra.cache !== lbl) refresh({ cache: lbl });
      });
    } catch (_) { /* no-op */ }
  }
}

function build() {
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'km-voice-test';
  panel.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#16130d;color:#f3efe6;'
    + 'font:14px/1.4 system-ui,sans-serif;overflow:auto;padding:18px;max-width:520px;margin:0 auto;';
  panel.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
    + '<strong style="font-size:16px">Jack Voice Self-Test</strong>'
    + '<button data-close style="background:#2a2620;color:#f3efe6;border:0;border-radius:8px;padding:8px 12px">Close</button></div>'
    + '<div data-body></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">'
    + '<button data-act="once"  style="padding:12px;border:0;border-radius:10px;background:#3b6b4a;color:#fff;font-weight:600">Play welcome once</button>'
    + '<button data-act="twice" style="padding:12px;border:0;border-radius:10px;background:#6b5a3b;color:#fff;font-weight:600">Play welcome twice quickly</button>'
    + '<button data-act="stop"  style="padding:12px;border:0;border-radius:10px;background:#6b3b3b;color:#fff;font-weight:600">Stop Jack</button>'
    + '<button data-act="check" style="padding:12px;border:0;border-radius:10px;background:#3b556b;color:#fff;font-weight:600">Check Stage 1 voice file</button>'
    + '<button data-act="reset" style="grid-column:1 / -1;padding:12px;border:0;border-radius:10px;background:#2a2620;color:#f3efe6;font-weight:600">Reset cache / reload latest build</button>'
    + '</div>'
    + '<p style="color:#9a9488;margin-top:12px">“Play welcome twice quickly” should report one playback and one <b>duplicate blocked</b>.</p>';

  panel.querySelector('[data-close]').addEventListener('click', () => { try { location.hash = ''; } catch (_) {} hide(); });

  panel.addEventListener('click', async (e) => {
    const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
    if (!act) return;
    const c = controller();
    if (act === 'once') {
      const before = (window.__kmVoiceTrace || []).length;
      c && c.say(WELCOME_ID, WELCOME_TEXT, { source: 'selftest' });
      const after = (window.__kmVoiceTrace || []).slice(before);
      refresh({ started: after.some((r) => r.result === 'play'), blocked: after.some((r) => r.result === 'blocked') });
    } else if (act === 'twice') {
      const before = (window.__kmVoiceTrace || []).length;
      c && c.say(WELCOME_ID, WELCOME_TEXT, { source: 'selftest' });
      c && c.say(WELCOME_ID, WELCOME_TEXT, { source: 'selftest' });   // immediate duplicate
      const after = (window.__kmVoiceTrace || []).slice(before);
      const plays = after.filter((r) => r.result === 'play').length;
      const blocked = after.filter((r) => r.result === 'blocked').length;
      refresh({ started: plays === 1 ? 'yes (exactly 1)' : `** ${plays} **`, blocked: blocked >= 1 ? `yes (${blocked})` : '** none **' });
    } else if (act === 'stop') {
      c && c.cancel();
      refresh({ started: 'stopped' });
    } else if (act === 'check') {
      refresh({ fetch: 'checking…' });
      try {
        const r = await fetch(WELCOME_URL, { cache: 'no-store' });
        refresh({ fetch: `${r.status} ${r.ok ? 'OK' : '(missing)'}` });
      } catch (err) {
        refresh({ fetch: 'network error' });
      }
    } else if (act === 'reset') {
      try {
        if ('serviceWorker' in navigator) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map((r) => r.unregister())); }
        if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); }
      } catch (_) { /* no-op */ }
      try { location.hash = ''; } catch (_) {}
      location.reload();
    }
  });

  document.body.appendChild(panel);
  return panel;
}

function show() { lastExtra = {}; build().style.display = 'block'; refresh(); }
function hide() { if (panel) panel.style.display = 'none'; }

function check() {
  if (typeof location === 'undefined') return;
  if ((location.hash || '').toLowerCase() === '#voice-test') show(); else hide();
}

// Discreet always-visible build badge → instantly reveals a stale/mixed deploy,
// and is a one-tap route to the Voice Self-Test. Deliberately tiny and muted.
function badge() {
  if (typeof document === 'undefined' || document.getElementById('km-build-badge')) return;
  const b = document.createElement('button');
  b.id = 'km-build-badge';
  b.textContent = BUILD;
  b.title = 'KeyMaster build — tap for Voice Self-Test';
  b.style.cssText = 'position:fixed;right:6px;bottom:6px;z-index:2147483646;'
    + 'font:11px/1 system-ui,sans-serif;color:#9a9488;background:rgba(22,19,13,.55);'
    + 'border:1px solid rgba(154,148,136,.3);border-radius:6px;padding:3px 6px;opacity:.6;';
  b.addEventListener('click', () => { try { location.hash = '#voice-test'; } catch (_) {} });
  document.body.appendChild(b);
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', check);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { badge(); check(); });
  else { badge(); check(); }
}
