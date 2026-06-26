// pwaUpdate.js — installable-PWA update experience (no Android wrapper).
// =============================================================================
// Registers the service worker, detects when a newly deployed build is ready,
// and shows a clear "Update available — Update now" banner. The new service
// worker WAITS (it no longer auto-activates); only the user's "Update now" tap
// tells it to take over, after which the page reloads once cleanly so old and
// new files are never mixed. "Later" dismisses the banner.
//
// GitHub Pages compatible (no server changes). Does not touch voice/en-GB/,
// the Course routes, or any audio system. Side-effect import: it self-registers
// on window load and adds no UI unless an update is actually available.
// =============================================================================

const BUILD = 'rc2-192';
let userInitiated = false;

function showBanner(reg) {
  if (typeof document === 'undefined' || document.getElementById('km-update-banner')) return;
  const bar = document.createElement('div');
  bar.id = 'km-update-banner';
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:2147483647;'
    + 'background:#14110B;color:#f3efe6;font:14px/1.4 system-ui,sans-serif;'
    + 'padding:12px 14px;display:flex;gap:12px;align-items:center;justify-content:space-between;'
    + 'box-shadow:0 2px 10px rgba(0,0,0,.35);border-bottom:1px solid rgba(154,148,136,.3)';
  bar.innerHTML =
    '<div style="min-width:0"><strong>Update available</strong> — '
    + 'A new KeyMaster PRO build is ready. Update now to continue with the latest lessons, voice and fixes.</div>'
    + '<div style="display:flex;gap:8px;flex:0 0 auto">'
    + '<button data-later style="background:transparent;color:#cfc9bd;border:1px solid rgba(154,148,136,.4);border-radius:8px;padding:8px 12px">Later</button>'
    + '<button data-upd style="background:#3b6b4a;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:600">Update now</button>'
    + '</div>';
  bar.querySelector('[data-later]').addEventListener('click', () => bar.remove());
  bar.querySelector('[data-upd]').addEventListener('click', () => {
    userInitiated = true;
    const w = reg.waiting;
    if (w) { try { w.postMessage({ type: 'SKIP_WAITING' }); } catch (_) { window.location.reload(); } }
    else { window.location.reload(); }
  });
  document.body.appendChild(bar);
}

function watch(reg) {
  // An update may already be waiting (installed behind the active page).
  if (reg.waiting && navigator.serviceWorker.controller) showBanner(reg);
  // Or one may arrive while the app is open.
  reg.addEventListener('updatefound', () => {
    const nw = reg.installing;
    if (!nw) return;
    nw.addEventListener('statechange', () => {
      if (nw.state === 'installed' && navigator.serviceWorker.controller) showBanner(reg);
    });
  });
}

function init() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // Capture whether a worker already controlled this page at load. If so, a later
  // controllerchange means a NEW build just took over -> reload once automatically
  // so the fix lands without a banner tap. First-ever install (no prior controller)
  // does NOT force a reload, avoiding a first-load refresh loop.
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    watch(reg);
    // Re-check for a new build when the user returns to the app, and periodically.
    const recheck = () => { try { reg.update(); } catch (_) { /* no-op */ } };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) recheck(); });
    setInterval(recheck, 30 * 60 * 1000);
  }).catch((err) => console.info('[KeyMaster] SW registration skipped:', err && err.message ? err.message : err));

  // The new worker has taken control after the user chose "Update now" — reload
  // once so the page is wholly on the new build. (Ignored on first install.)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    if (!hadController && !userInitiated) return;   // skip on first install only
    refreshing = true;
    window.location.reload();
  });
}

if (typeof window !== 'undefined') {
  window.__kmBuild = BUILD;
  try { (window.__kmVer = window.__kmVer || {}).pwaUpdate = BUILD; } catch (_) { /* no-op */ }
  window.addEventListener('load', init);
}
