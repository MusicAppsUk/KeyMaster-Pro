// staffView.js
//
// Shared STANDARD Middle-C notation renderer (RC2). Used by both the
// sight-reading engine and the Scale Masterclass compact staff. It knows nothing
// about the B-Major motor/anchor system — it only draws standard notation and
// highlights note indices. No labels are painted on notes (no-crutch rule); the
// single exception is an optional letter anchor under the FIRST note, used by
// sight-reading's Assisted mode.
//
//   const sv = createStaffView({ compact: true });
//   container.appendChild(sv.el);
//   sv.setSequence(['C4','E4','G4']);   // → model [{name,midi,off,staff,el}]
//   sv.mark(0, 'current');              // is-current | is-correct | is-missed | is-next
//   sv.setAnchor('C');                  // letter under first note (or null)
//   sv.clear();

import { toMidi } from './notes.js';

const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const TREBLE_TOP = 38; // F5 — top line of treble
const BASS_TOP = 26;   // A3 — top line of bass

export function createStaffView({ compact = false } = {}) {
  const el = document.createElement('div');
  el.className = `notation${compact ? ' notation--compact' : ''}`;
  el.innerHTML = `
    <div class="grand-staff">
      <div class="grand-staff__brace"></div>
      <div class="grand-staff__spine"></div>
      <div class="staff staff--treble"><span class="clef clef--treble">&#x1D11E;</span></div>
      <div class="staff staff--bass"><span class="clef clef--bass">&#x1D122;</span></div>
    </div>`;

  const treble = el.querySelector('.staff--treble');
  const bass = el.querySelector('.staff--bass');
  drawStaffLines(treble);
  drawStaffLines(bass);

  let model = [];

  function place(name) {
    const m = /^([A-Ga-g])(##|bb|[#b]|x)?(-?\d+)$/.exec(String(name).trim());
    if (!m) throw new Error(`staffView: unparseable note "${name}"`);
    const letter = m[1].toUpperCase();
    const accidental = { '#': 1, '##': 2, x: 2, b: -1, bb: -2 }[m[2]] ?? 0;
    const octave = parseInt(m[3], 10);
    const diatonic = LETTER_INDEX[letter] + 7 * octave;
    const midi = toMidi(letter, accidental, octave);
    const staff = midi >= 60 ? 'treble' : 'bass';
    const topLine = staff === 'treble' ? TREBLE_TOP : BASS_TOP;
    return { staff, off: (topLine - diatonic) / 2, accidental, midi };
  }

  function ledgerOffsets(off) {
    const out = []; const EPS = 1e-9;
    if (off >= 5 - EPS) for (let k = 5; k <= Math.floor(off + EPS); k++) out.push(k);
    if (off <= -1 + EPS) for (let k = -1; k >= Math.ceil(off - EPS); k--) out.push(k);
    return out;
  }

  function clearNotes() {
    [treble, bass].forEach((s) =>
      s.querySelectorAll('.note, .ledger').forEach((n) => n.remove()));
  }

  function setSequence(names) {
    clearNotes();
    const n = names.length;
    const START = 22, END = 90;
    model = names.map((name, i) => {
      const leftPct = n <= 1 ? 50 : START + ((END - START) * i) / (n - 1);
      const p = place(name);
      const node = engrave(p, leftPct);
      return { name, midi: p.midi, off: p.off, staff: p.staff, el: node };
    });
    return model;
  }

  function engrave(p, leftPct) {
    const staffEl = p.staff === 'treble' ? treble : bass;
    for (const k of ledgerOffsets(p.off)) {
      const led = document.createElement('div');
      led.className = 'ledger';
      led.style.left = `calc(${leftPct}% - var(--note-head) * 0.4)`;
      led.style.top = `calc(var(--staff-space) * ${k} - var(--staff-line) / 2)`;
      staffEl.appendChild(led);
    }
    const note = document.createElement('div');
    note.className = `note ${p.off < 2 ? 'note--stem-down' : ''}`.trim();
    note.style.left = `${leftPct}%`;
    note.style.top = `calc(var(--staff-space) * ${p.off} - var(--note-head) / 2)`;
    if (p.accidental) {
      const a = document.createElement('span');
      a.className = 'note__accidental';
      a.textContent = p.accidental > 0 ? '\u266F' : '\u266D';
      note.appendChild(a);
    }
    const head = document.createElement('div'); head.className = 'note__head'; note.appendChild(head);
    const stem = document.createElement('div'); stem.className = 'note__stem'; note.appendChild(stem);
    staffEl.appendChild(note);
    return note;
  }

  const STATES = ['is-current', 'is-correct', 'is-missed', 'is-next'];
  function mark(i, state) {
    const m = model[i]; if (!m) return;
    m.el.classList.add(`is-${state}`);
  }
  function unmark(i, state) {
    const m = model[i]; if (!m) return;
    if (state) m.el.classList.remove(`is-${state}`);
    else STATES.forEach((c) => m.el.classList.remove(c));
  }
  function clearMarks() { model.forEach((_, i) => unmark(i)); }

  function setAnchor(letter) {
    treble.querySelectorAll('.note__anchor').forEach((n) => n.remove());
    bass.querySelectorAll('.note__anchor').forEach((n) => n.remove());
    if (letter == null || !model[0]) return;
    const tag = document.createElement('span');
    tag.className = 'note__anchor';
    tag.textContent = letter;
    model[0].el.appendChild(tag);
  }

  function clear() { clearNotes(); model = []; }

  return { el, treble, bass, setSequence, mark, unmark, clearMarks, setAnchor, clear, get model() { return model; } };
}

function drawStaffLines(staffEl) {
  for (let k = 0; k <= 4; k++) {
    const line = document.createElement('div');
    line.className = 'staff__line';
    line.style.top = `calc(var(--staff-space) * ${k} - var(--staff-line) / 2)`;
    staffEl.appendChild(line);
  }
}
