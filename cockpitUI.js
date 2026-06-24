/* cockpitUI.js — rc2-155
   Adds ONE reveal affordance (the ⋯ button) to the top bar so the keyboard
   control row can collapse in the learning cockpit and expand on tap.

   Deliberately additive and reversible:
   • no existing file is modified — removing the <script> tag fully reverts;
   • it only creates a button and toggles a data attribute on <html>;
   • all show/hide rules live in cockpit.css (scoped to the learn view);
   • the MIDI / device status pill is never hidden (handled in CSS), so the
     learner always knows whether hardware is connected.

   It touches no engine, no MIDI, no NoteInput/Event Bridge, no course logic. */
(function () {
  'use strict';

  function init() {
    var root = document.documentElement;
    var controls = document.querySelector('.app__controls');
    if (!controls) return;                                   // nothing to manage
    if (document.querySelector('.cockpit-ctrl-toggle')) return; // already added

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cockpit-ctrl-toggle';
    toggle.setAttribute('aria-label', 'Show or hide keyboard controls');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span aria-hidden="true">\u22EF</span>'; /* ⋯ */

    toggle.addEventListener('click', function (e) {
      if (e && e.stopPropagation) e.stopPropagation();   // contain the tap — reveal controls only, never touch the lesson or voice
      var open = root.getAttribute('data-controls') === 'open';
      if (open) { root.removeAttribute('data-controls'); }
      else { root.setAttribute('data-controls', 'open'); }
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });

    if (controls.parentNode) { controls.parentNode.appendChild(toggle); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
