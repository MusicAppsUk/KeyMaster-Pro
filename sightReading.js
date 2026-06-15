// sightReading.js
//
// View controller for the Cognitive Sight-Reading vector. Interim build: a
// "coming soon" header plus two live checks — it renders the grand-staff
// scaffold (verifying notation.css) and offers a metronome toggle (verifying
// the scheduler + metronome are live and rock-solid).
//
// Loaded lazily by app.js via import('./sightReading.js'). Default-exports a
// factory matching the orchestrator contract:
//   createView({ mount, store, keyboard, viewport, midi, synth, scheduler, metronome })
//     → { enter(), exit(), destroy() }

export default function createView(ctx) {
  const { mount, scheduler, metronome } = ctx;
  let running = false;

  const ui = document.createElement('div');
  ui.innerHTML = `
    <p class="vector__eyebrow">02 — Cognition · live module check</p>
    <p class="placeholder__note" style="margin:.25rem 0 1rem">
      Full Cognitive Sight-Reading coming soon. This confirms the dual-staff
      renderer and the high-precision pulse are live:
    </p>
    <div class="notation">
      <div class="grand-staff">
        <div class="grand-staff__brace"></div>
        <div class="grand-staff__spine"></div>
        <div class="staff staff--treble"><span class="clef clef--treble">&#x1D11E;</span></div>
        <div class="staff staff--bass"><span class="clef clef--bass">&#x1D122;</span></div>
        <div class="playhead" style="left:42%"></div>
      </div>
    </div>`;

  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;gap:.5rem;margin-top:1rem;align-items:center';

  const metroBtn = document.createElement('button');
  metroBtn.type = 'button';
  metroBtn.className = 'btn';

  const status = document.createElement('span');
  status.style.cssText =
    'font-family:var(--font-mono);font-size:var(--step-sm);color:var(--ivory-dim)';

  if (scheduler && metronome) {
    metroBtn.textContent = '▶ Start metronome';
    status.textContent = '90 BPM · 4/4';
    metroBtn.addEventListener('click', () => {
      running = !running;
      if (running) {
        scheduler.start();
        metronome.setEnabled(true);
        metroBtn.textContent = '◼ Stop metronome';
      } else {
        metronome.setEnabled(false);
        scheduler.stop();
        metroBtn.textContent = '▶ Start metronome';
      }
    });
  } else {
    metroBtn.textContent = 'Audio unavailable';
    metroBtn.disabled = true;
    status.textContent = 'Web Audio not supported in this browser';
  }

  controls.append(metroBtn, status);
  ui.appendChild(controls);

  function stopPulse() {
    if (!running) return;
    metronome?.setEnabled(false);
    scheduler?.stop();
    running = false;
    metroBtn.textContent = '▶ Start metronome';
  }

  return {
    enter() {
      mount.replaceChildren(ui);
    },
    exit() {
      stopPulse(); // never leave the metronome ticking behind the launcher
    },
    destroy() {
      stopPulse();
    },
  };
}
