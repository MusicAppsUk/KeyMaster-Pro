// learnApp.js — "Learn the App" onboarding (rc2-138).
//
// A small, self-contained guided tour: how KeyMaster works + connecting a MIDI
// keyboard. It is authored as a short stepper (app-teaching screens, NOT musical
// lessons). It uses the EXISTING MIDI plumbing strictly READ-ONLY via the
// injected ctx.midi / ctx.store — it never touches midiRouter / noteInput /
// eventBridge internals, the Jack voice pack or line IDs, or any Course data
// (step titles / ids / order / progress). The only progress key it writes is the
// new, separate `appOnboarded` flag. Original KeyMaster material.

const PITCH = ['C', 'C\u266F', 'D', 'D\u266F', 'E', 'F', 'F\u266F', 'G', 'G\u266F', 'A', 'A\u266F', 'B'];
const noteName = (m) => `${PITCH[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

const STYLE_ID = 'km-learnapp-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  // Scoped under .km-la, with hex fallbacks so it renders correctly regardless
  // of the host theme variables. theme.css is never modified.
  s.textContent = `
  .km-la{max-width:46rem;margin:0 auto;padding:1.1rem 1.1rem 2rem;color:var(--ivory,#f3eee4);}
  .km-la__dots{display:flex;gap:.4rem;justify-content:center;margin:.1rem 0 1.1rem;}
  .km-la__dot{width:.5rem;height:.5rem;border-radius:50%;background:var(--ivory-faint,#6b6557);opacity:.45;transition:.2s;}
  .km-la__dot.is-on{opacity:1;background:var(--gold,#E0A94B);transform:scale(1.2);}
  .km-la__card{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.09);border-radius:1rem;padding:1.4rem;}
  .km-la__eyebrow{font-size:.72rem;letter-spacing:.13em;text-transform:uppercase;color:var(--gold,#E0A94B);margin:0 0 .4rem;}
  .km-la__title{font-size:1.45rem;line-height:1.2;margin:0 0 .8rem;color:var(--ivory,#f3eee4);}
  .km-la__p{font-size:1rem;line-height:1.55;margin:0 0 .8rem;color:var(--ivory-dim,#d7d1c5);}
  .km-la__p:last-child{margin-bottom:0;}
  .km-la__btn{display:inline-flex;align-items:center;gap:.45rem;border:none;border-radius:.6rem;padding:.7rem 1.15rem;font:inherit;font-weight:600;cursor:pointer;background:var(--gold,#E0A94B);color:#1a1505;text-decoration:none;}
  .km-la__btn:disabled{opacity:.5;cursor:default;}
  .km-la__btn--ghost{background:transparent;border:1px solid rgba(255,255,255,.22);color:var(--ivory,#f3eee4);font-weight:500;}
  .km-la__nav{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-top:1.1rem;}
  .km-la__row{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;}
  .km-la__skip{background:none;border:none;color:var(--ivory-faint,#9a9182);font:inherit;cursor:pointer;text-decoration:underline;padding:.35rem;}
  .km-la__status{display:flex;align-items:center;gap:.55rem;margin:1rem 0 .2rem;padding:.7rem .9rem;border-radius:.6rem;background:rgba(255,255,255,.05);font-size:.96rem;}
  .km-la__status .dot{width:.7rem;height:.7rem;border-radius:50%;background:var(--ivory-faint,#9a9182);flex:none;transition:.2s;}
  .km-la__status.is-ok .dot{background:var(--good,#16A34A);box-shadow:0 0 0 4px rgba(22,163,74,.2);}
  .km-la__status.is-bad .dot{background:var(--bad,#DC2626);}
  .km-la__hint{font-size:.92rem;line-height:1.5;color:var(--ivory-dim,#d7d1c5);background:rgba(255,255,255,.035);border-left:3px solid var(--gold,#E0A94B);padding:.6rem .8rem;border-radius:.35rem;margin:.7rem 0 0;}
  .km-la__hint.is-ok{border-left-color:var(--good,#16A34A);}
  `;
  document.head.appendChild(s);
}

const CARDS = [
  {
    eyebrow: 'Welcome', title: 'Welcome to KeyMaster PRO',
    body: [
      'This quick tour shows how the app works \u2014 it takes about a minute.',
      'You can skip it any time and learn by ear with the on-screen keyboard at the bottom of the screen.',
    ],
  },
  {
    eyebrow: 'Your path', title: 'The Foundation Course is your path',
    body: [
      'Start the Foundation Course from the home screen, and pick up exactly where you left off whenever you come back.',
      'The Practice Rooms \u2014 Scales, Sight-Reading and Chords \u2014 are optional specialist areas. The tutor guides you into them at the right time, or you can step into one directly.',
    ],
  },
  {
    eyebrow: 'Finding your way', title: 'Getting around',
    body: [
      'Open the Course Map to see every stage and jump to any chapter.',
      'As you learn, Jack talks you through each step. Use the on-screen captions, and the repeat and pause controls, to go at your own pace.',
      'The keyboard along the bottom is always there \u2014 tap any key to hear it.',
    ],
  },
  {
    kind: 'midi', eyebrow: 'Your instrument', title: 'Connect your keyboard',
    body: [
      'A real MIDI keyboard gives you proper touch and feel. The on-screen keyboard works too, so this step is optional \u2014 but worth it if you have one.',
    ],
  },
  {
    kind: 'finish', eyebrow: 'Ready', title: 'You\u2019re all set',
    body: [
      'That\u2019s the tour. Start the Foundation Course whenever you\u2019re ready \u2014 Jack will take it from here.',
    ],
  },
];

export default function createLearnApp(ctx) {
  const { mount, progress, store, midi } = ctx || {};
  let idx = 0;
  let unsubNote = null;
  let unsubState = null;
  let confirmed = false;

  const markOnboarded = () => { try { progress?.set?.('appOnboarded', true); } catch { /* ignore */ } };
  const dropNote = () => { if (unsubNote) { try { unsubNote(); } catch { /* */ } unsubNote = null; } };
  const dropState = () => { if (unsubState) { try { unsubState(); } catch { /* */ } unsubState = null; } };
  const teardown = () => { dropNote(); dropState(); };

  function go(n) {
    idx = Math.max(0, Math.min(CARDS.length - 1, n));
    teardown();
    if (idx === CARDS.length - 1) markOnboarded();   // reaching the end completes onboarding
    render();
  }

  // ---- MIDI card: read-only over ctx.midi / ctx.store --------------------
  function buildMidiCard() {
    const wrap = document.createElement('div');

    const status = document.createElement('div'); status.className = 'km-la__status';
    const dot = document.createElement('span'); dot.className = 'dot';
    const label = document.createElement('span'); label.textContent = 'Not connected yet.';
    status.append(dot, label);

    const row = document.createElement('div'); row.className = 'km-la__row';
    const connectBtn = document.createElement('button');
    connectBtn.type = 'button'; connectBtn.className = 'km-la__btn'; connectBtn.textContent = 'Connect MIDI keyboard';
    row.appendChild(connectBtn);

    const guide = document.createElement('div');

    const skipKb = document.createElement('button');
    skipKb.type = 'button'; skipKb.className = 'km-la__skip';
    skipKb.textContent = 'Use on-screen keyboard for now';
    skipKb.addEventListener('click', () => go(idx + 1));

    const setStatus = (kind, text) => {
      status.classList.toggle('is-ok', kind === 'ok');
      status.classList.toggle('is-bad', kind === 'bad');
      label.textContent = text;
    };

    function awaitKeypress() {
      guide.innerHTML = '';
      const h = document.createElement('p'); h.className = 'km-la__hint';
      h.textContent = 'Now press any key on your MIDI keyboard\u2026';
      guide.appendChild(h);
      dropNote();
      if (midi && typeof midi.on === 'function') {
        unsubNote = midi.on('noteon', ({ midi: m }) => {
          if (confirmed) return;
          confirmed = true;
          setStatus('ok', 'KeyMaster heard your keyboard.');
          h.classList.add('is-ok');
          h.textContent = `\u2713 Heard ${noteName(m)} \u2014 your keyboard is working. You\u2019re all set.`;
          dropNote();
        });
      }
    }

    async function doConnect() {
      connectBtn.disabled = true; setStatus('', 'Connecting\u2026'); guide.innerHTML = '';
      let st = { ok: false, reason: 'error', inputs: [] };
      try { if (midi && typeof midi.connect === 'function') st = await midi.connect(); } catch { st = { ok: false, reason: 'error', inputs: [] }; }
      connectBtn.disabled = false;
      const has = !!(st && st.ok && Array.isArray(st.inputs) && st.inputs.length > 0);
      // Keep the global status pill in sync (same shape the app uses).
      try { store?.setState?.({ midi: { ok: has, label: has ? st.inputs[0] : (st && st.ok ? 'No device' : 'No MIDI') } }); } catch { /* ignore */ }
      if (has) {
        setStatus('ok', `Connected: ${st.inputs[0]}`);
        confirmed = false; connectBtn.textContent = 'Reconnect';
        awaitKeypress();
      } else {
        connectBtn.textContent = 'Try again';
        setStatus('bad', 'No keyboard connected yet.');
        const tip = document.createElement('p'); tip.className = 'km-la__hint';
        const reason = st && typeof st.reason === 'string' ? st.reason : '';
        if (reason === 'unsupported') {
          tip.textContent = 'This browser doesn\u2019t support MIDI keyboards. Try Chrome on this device, or simply use the on-screen keyboard below.';
        } else if (reason.startsWith('denied')) {
          tip.textContent = 'MIDI access was blocked. Allow it in your browser\u2019s site settings, then tap Try again.';
        } else {
          tip.textContent = 'No keyboard detected. Check it\u2019s switched on and connected by USB, try another cable or port, then tap Try again \u2014 it can take a moment after plugging in.';
        }
        guide.appendChild(tip);
      }
    }
    connectBtn.addEventListener('click', doConnect);

    // Reflect any already-known connection (e.g. the boot auto-connect).
    try {
      const cur = store?.getState?.().midi;
      if (cur && cur.ok && cur.label && cur.label !== 'No device') {
        setStatus('ok', `Connected: ${cur.label}`); confirmed = false; connectBtn.textContent = 'Reconnect'; awaitKeypress();
      }
    } catch { /* ignore */ }

    // Live hot-plug updates while this card is open.
    if (midi && typeof midi.on === 'function') {
      unsubState = midi.on('statechange', () => {
        try {
          const names = [...(midi.inputs?.values?.() ?? [])].map((i) => i.name ?? i.id);
          if (names.length && !confirmed) { setStatus('ok', `Connected: ${names[0]}`); connectBtn.textContent = 'Reconnect'; awaitKeypress(); }
        } catch { /* ignore */ }
      });
    }

    wrap.append(status, row, guide, skipKb);
    return wrap;
  }

  function render() {
    if (!mount) return;
    injectStyle();
    const card = CARDS[idx];
    mount.innerHTML = '';
    const root = document.createElement('div'); root.className = 'km-la';

    const dots = document.createElement('div'); dots.className = 'km-la__dots';
    CARDS.forEach((_, i) => { const d = document.createElement('span'); d.className = 'km-la__dot' + (i === idx ? ' is-on' : ''); dots.appendChild(d); });
    root.appendChild(dots);

    const cardEl = document.createElement('div'); cardEl.className = 'km-la__card';
    const eb = document.createElement('p'); eb.className = 'km-la__eyebrow'; eb.textContent = card.eyebrow; cardEl.appendChild(eb);
    const ti = document.createElement('h2'); ti.className = 'km-la__title'; ti.textContent = card.title; cardEl.appendChild(ti);
    (card.body || []).forEach((t) => { const p = document.createElement('p'); p.className = 'km-la__p'; p.textContent = t; cardEl.appendChild(p); });

    if (card.kind === 'midi') cardEl.appendChild(buildMidiCard());

    if (card.kind === 'finish') {
      const fr = document.createElement('div'); fr.className = 'km-la__row'; fr.style.marginTop = '1.1rem';
      const start = document.createElement('a'); start.className = 'km-la__btn'; start.href = '#/learn'; start.textContent = 'Start the Foundation Course';
      start.addEventListener('click', markOnboarded);
      const home = document.createElement('a'); home.className = 'km-la__btn km-la__btn--ghost'; home.href = '#/'; home.textContent = 'Back to home';
      home.addEventListener('click', markOnboarded);
      fr.append(start, home); cardEl.appendChild(fr);
    }
    root.appendChild(cardEl);

    const nav = document.createElement('div'); nav.className = 'km-la__nav';
    const back = document.createElement('button'); back.type = 'button'; back.className = 'km-la__btn km-la__btn--ghost'; back.textContent = 'Back';
    back.disabled = idx === 0; back.addEventListener('click', () => go(idx - 1));
    const right = document.createElement('div'); right.className = 'km-la__row';
    if (card.kind !== 'finish') {
      const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'km-la__skip'; skip.textContent = 'Skip tour';
      skip.addEventListener('click', () => { markOnboarded(); location.hash = '#/'; });
      const next = document.createElement('button'); next.type = 'button'; next.className = 'km-la__btn'; next.textContent = (idx === CARDS.length - 1 ? 'Finish' : 'Next');
      next.addEventListener('click', () => go(idx + 1));
      right.append(skip, next);
    }
    nav.append(back, right);
    root.appendChild(nav);

    mount.appendChild(root);
  }

  return {
    enter() { idx = 0; confirmed = false; render(); },
    exit() { teardown(); },
  };
}
