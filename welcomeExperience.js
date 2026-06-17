// welcomeExperience.js — a brief, elegant opening: a premium fade-in greeting
// coordinated with the B-major startup flourish so the visual and musical
// greetings begin and end as one event, then dissolve into the dashboard.
//
// Experience-layer only: it owns a fixed full-screen overlay on document.body and
// reads local settings. It does NOT touch any training module, MIDI, the Event
// Bridge, or feedback. The actual sound is produced by the app's synth via the
// onFlourish callback (kept here decoupled), so this file never imports audio.
//
// RC2 has no accounts. A display name, if present, is a purely local value.
// Future: Settings → Display Name writes `km_display_name`; no auth, no cloud.

const LS = {
  name: 'km_display_name',
  showWelcome: 'km_show_welcome',
  playFlourish: 'km_play_flourish',
};

function lsGet(key) { try { return window.localStorage.getItem(key); } catch { return null; } }
// A toggle defaults ON unless explicitly stored as '0'.
function flag(key, dflt) { const v = lsGet(key); return v === null ? dflt : v !== '0'; }

/** The local display name, or null. Never returns "Guest"/"Anonymous"/etc. */
export function getDisplayName() {
  const n = (lsGet(LS.name) || '').trim();
  return n.length ? n : null;
}

/**
 * Experience toggles. Welcome screen defaults ON; the startup flourish defaults
 * OFF for RC2 (the synth's voice-stop tail tick needs piano-voice refinement
 * first). The code path is fully intact — set localStorage `km_play_flourish`
 * to '1' (or via a future Settings toggle) to re-enable it for tuning.
 */
export function welcomeSettings() {
  return { showWelcome: flag(LS.showWelcome, true), playFlourish: flag(LS.playFlourish, false) };
}
export function flourishEnabled() { return flag(LS.playFlourish, false); }

// Coordinated timeline (ms). Visual fade-out and the flourish's decay are tuned
// to land together near the 2s mark.
const T = { fadeIn: 240, greetAt: 200, fadeOutAt: 1650, done: 2000 };

let styleInjected = false;
function injectStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const s = document.createElement('style');
  s.id = 'kmwelcome-style';
  s.textContent = `
    .kmwelcome{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;
      background:radial-gradient(120% 90% at 50% 35%, #1a1712 0%, #0e0c0a 70%, #090807 100%);
      opacity:0;transition:opacity ${T.fadeIn}ms ease;pointer-events:none}
    .kmwelcome.is-in{opacity:1}
    .kmwelcome.is-out{opacity:0;transition:opacity 350ms ease}
    .kmwelcome__inner{text-align:center;padding:2rem;transform:translateY(8px);
      transition:transform 600ms cubic-bezier(.22,.61,.36,1)}
    .kmwelcome.is-in .kmwelcome__inner{transform:translateY(0)}
    .kmwelcome__brand{margin:0;font-family:var(--font-display,Georgia,serif);
      font-weight:600;letter-spacing:.2em;font-size:clamp(1.7rem,5.2vw,2.7rem);
      color:var(--ivory,#f3ead6)}
    .kmwelcome__tag{margin:.55rem 0 0;font-family:var(--font-mono,ui-monospace,monospace);
      letter-spacing:.32em;text-transform:uppercase;font-size:.66rem;
      color:var(--brass-bright,#caa15a)}
    .kmwelcome__greet{margin:1.5rem 0 0;font-family:var(--font-display,Georgia,serif);
      font-size:clamp(1rem,3vw,1.35rem);color:var(--ivory-dim,#cfc4ad);
      opacity:0;transition:opacity 520ms ease}
    .kmwelcome.is-greeted .kmwelcome__greet{opacity:1}
    @media (prefers-reduced-motion: reduce){
      .kmwelcome,.kmwelcome__inner,.kmwelcome__greet{transition-duration:1ms}
    }`;
  document.head.appendChild(s);
}

function buildOverlay(displayName) {
  const root = document.createElement('div');
  root.className = 'kmwelcome';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  const inner = document.createElement('div');
  inner.className = 'kmwelcome__inner';
  const brand = document.createElement('h1');
  brand.className = 'kmwelcome__brand';
  brand.textContent = 'KEYMASTER PRO';
  const tag = document.createElement('p');
  tag.className = 'kmwelcome__tag';
  tag.textContent = 'Professional Piano Training';
  const greet = document.createElement('p');
  greet.className = 'kmwelcome__greet';
  greet.textContent = displayName ? `Welcome back, ${displayName}` : 'Welcome to KeyMaster PRO';
  inner.append(brand, tag, greet);
  root.append(inner);
  return root;
}

/**
 * Run the opening experience. Resolves when the overlay has fully dissolved (or
 * immediately if the welcome screen is disabled). `onFlourish` is invoked once at
 * the synchronized moment; the caller decides whether audio can actually sound.
 * @returns {Promise<boolean>} whether the visual welcome was shown
 */
export function runWelcomeExperience({ displayName = null, onFlourish } = {}) {
  const { showWelcome, playFlourish } = welcomeSettings();

  // If the screen is off, still honour the flourish toggle (the app's gesture
  // unlock path will sound it); nothing visual to do here.
  if (!showWelcome) {
    if (playFlourish) { try { onFlourish?.(); } catch { /* ignore */ } }
    return Promise.resolve(false);
  }

  injectStyle();
  return new Promise((resolve) => {
    let root;
    try { root = buildOverlay(displayName); document.body.appendChild(root); }
    catch { resolve(false); return; }

    const timers = [];
    const finish = () => { timers.forEach(clearTimeout); try { root.remove(); } catch { /* ignore */ } resolve(true); };

    // Fade in on the next frame so the transition runs.
    requestAnimationFrame(() => root.classList.add('is-in'));
    // Greeting appears + flourish begins, together.
    timers.push(setTimeout(() => {
      root.classList.add('is-greeted');
      if (playFlourish) { try { onFlourish?.(); } catch { /* ignore */ } }
    }, T.greetAt));
    // Visual fade-out begins as the flourish decays.
    timers.push(setTimeout(() => root.classList.add('is-out'), T.fadeOutAt));
    // Remove + reveal the dashboard.
    timers.push(setTimeout(finish, T.done));
  });
}
