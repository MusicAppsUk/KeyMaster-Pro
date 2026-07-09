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

import { createTutorAudio } from './tutorAudio.js?v=rc2-195';
import { createVoiceControl } from './voiceControl.js?v=rc2-191';
import { VOICE_PACK } from './voicePackData.js?v=rc2-191';

const BUILD = 'rc2-210';
const WELCOME_ID = 'welcome.say.0';
const WELCOME_FILE = (VOICE_PACK && VOICE_PACK[WELCOME_ID]) || 'welcome-0.mp3';
const WELCOME_URL = `voice/en-GB/${WELCOME_FILE}`;
const WELCOME_TEXT = 'Welcome to the KeyMaster PRO Course.';
try { if (typeof window !== 'undefined') (window.__kmVer = window.__kmVer || {}).voiceTest = BUILD; } catch (_) { /* no-op */ }

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
  const ver = (window.__kmVer || {});
  const te = (typeof window !== 'undefined') ? (window.__kmTutorEngine || null) : null;
  const taVer = ver.tutorAudio || (te && te.version) || null;
  const cacheStr = (extra && extra.cache != null) ? String(extra.cache) : '';
  // The live service-worker cache name is the single source of truth for the build that
  // is ACTUALLY deployed on this device (e.g. "keymaster-rc2-191" -> "rc2-191"). The
  // per-module versions further down are when each FILE last changed — they are not, and
  // are not meant to match, the app build.
  const appBuildM = cacheStr.match(/rc2-\d+/);
  const appBuild = appBuildM ? appBuildM[0]
    : ((typeof window !== 'undefined' && window.__kmBuild) ? String(window.__kmBuild) : '(waiting for service worker\u2026)');
  const cacheReady = !!appBuildM;
  const engineLoaded = !!te;
  // rc2-193 truth-status: the single honest Jack-voice line, computed by foundations from the
  // ACTUAL last engine outcome. Plus the raw device-voice pick so silence is never ambiguous.
  const jackLine = (typeof window !== 'undefined' && typeof window.__kmJackVoiceLine === 'function')
    ? window.__kmJackVoiceLine()
    : 'Jack voice: (open the Course once so the tutor engine loads)';
  const pick = (typeof window !== 'undefined') ? window.__kmVoicePick : null;
  const pickStr = pick
    ? `${pick.name} [${pick.lang}]  male=${pick.male}  female=${pick.female}`
    : 'null \u2014 no positively-male device voice selected (text only)';
  const jackColor = /playing/.test(jackLine) ? '#7fd68a' : (/error/.test(jackLine) ? '#e2675f' : '#e6a96b');
  // rc2-196 PROOF: exactly what the entry greeting did on this device.
  const sp = (typeof window !== 'undefined') ? window.__kmSpeakPending : null;
  // rc2-198 PROOF: did the Welcome card narrate ITSELF on first render (the new flow)? This is
  // the primary indicator now; the audio probe below confirms the play() actually sounded.
  const wr = (typeof window !== 'undefined') ? window.__kmWelcomeRender : null;
  const wrBlock = wr ? (
    `<div style="margin-top:10px;padding:9px 10px;border:1px solid ${wr.narrated ? '#3a4a32' : '#4a3a24'};border-radius:8px;background:${wr.narrated ? '#192014' : '#201a10'}">` +
    `<div style="color:#cfc9bd;font-size:12px;margin-bottom:5px;letter-spacing:.3px">WELCOME ON RENDER \\u2014 did the welcome card narrate itself (window.__kmWelcomeRender)</div>` +
    row('&nbsp;&nbsp;· code build that ran', `<span style="color:${wr.build===BUILD?'#7fd68a':'#e2675f'}">${wr.build}${wr.build===BUILD?'':' (STALE \\u2014 deploy not live)'}</span>`) +
    row('&nbsp;&nbsp;· welcome narrated on render', `<span style="color:${wr.narrated?'#7fd68a':'#e6a96b'};font-weight:700">${wr.narrated?'YES':'no'}</span>`) +
    row('&nbsp;&nbsp;· line ID', wr.lineId || '\\u2014') +
    row('&nbsp;&nbsp;· recorded MP3 in pack', wr.hasMp3?'yes':'no') +
    `<div style="color:#9a9488;font-size:11px;margin-top:5px">If this says YES but the audio probe below shows play() rejected / playing:no, autoplay blocked the line \\u2014 that is the only remaining gap.</div>` +
    `</div>`
  ) : `<div style="margin-top:10px;padding:9px 10px;border:1px solid #4a3a24;border-radius:8px;background:#201a10;color:#e6a96b">WELCOME ON RENDER: not captured yet \\u2014 Reset, then press Continue Foundation Course. The welcome card narrating itself sets this.</div>`;
  const spRows = sp ? (
    `<div style="margin-top:10px;padding:9px 10px;border:1px solid #3a4250;border-radius:8px;background:#1d2530">` +
    `<div style="color:#cfc9bd;font-size:12px;margin-bottom:5px;letter-spacing:.3px">ENTRY GREETING — what speakPending did (window.__kmSpeakPending)</div>` +
    row('&nbsp;&nbsp;· code build that ran', `<span style="color:${sp.build===BUILD?'#7fd68a':'#e2675f'}">${sp.build}${sp.build===BUILD?'':' (STALE — deploy not live)'}</span>`) +
    row('&nbsp;&nbsp;· speakPending called', sp.called ? 'yes' : 'no') +
    row('&nbsp;&nbsp;· branch taken', `<span style="color:${sp.branch==='welcome-card'?'#7fd68a':'#e6a96b'}">${sp.branch}</span>`) +
    row('&nbsp;&nbsp;· line ID attempted', sp.lineId || '\u2014') +
    row('&nbsp;&nbsp;· resuming', `${sp.resuming}  (learnLesson=${sp.learnLesson}, completed=${sp.learnCompletedLen})`) +
    row('&nbsp;&nbsp;· card on entry', `#${sp.cardIndex} ${sp.cardId || ''}`) +
    `</div>`
  ) : `<div style="margin-top:10px;padding:9px 10px;border:1px solid #3a4250;border-radius:8px;background:#1d2530;color:#e6a96b">ENTRY GREETING: speakPending has NOT run yet \u2014 Reset, press Continue, then tap once inside the course, then reopen this panel.</div>`;
  const apRows = ap ? (
    `<div style="margin-top:8px;color:#9a9488">Last audio element (window.__kmJackAudioProbe)</div>` +
    row('&nbsp;&nbsp;· line ID', ap.lineId || '\u2014') +
    row('&nbsp;&nbsp;· resolved URL', ap.url || '\u2014') +
    row('&nbsp;&nbsp;· play() promise', `<span style="color:${ap.playPromise==='resolved'?'#7fd68a':(/rejected/.test(ap.playPromise||'')?'#e2675f':'#e6a96b')}">${ap.playPromise || '\u2014'}</span>`) +
    row('&nbsp;&nbsp;· playing event', `<span style="color:${ap.playing?'#7fd68a':'#e6a96b'}">${ap.playing ? 'yes' : 'no'}</span>`) +
    row('&nbsp;&nbsp;· currentTime', `${ap.timeupdates} updates, t=${(ap.lastCurrentTime||0).toFixed(2)}s ${ap.timeupdates>0?'(advancing)':'(not advancing)'}`) +
    row('&nbsp;&nbsp;· readyState / duration', `${ap.readyState} / ${ap.duration!=null ? ap.duration.toFixed(2)+'s' : '\u2014'}`) +
    row('&nbsp;&nbsp;· muted / volume / paused', `${ap.muted} / ${ap.volume} / ${ap.paused}`) +
    row('&nbsp;&nbsp;· ended / error', `${ap.ended?'yes':'no'} / ${ap.error||'none'}`) +
    row('&nbsp;&nbsp;· cancelled by engine', `<span style="color:${ap.cancelledByEngine?'#e2675f':'#9a9488'}">${ap.cancelledByEngine ? 'YES \u2014 element torn down' : 'no'}</span>`)
  ) : `<div style="margin-top:8px;color:#9a9488">Last audio element: none yet \u2014 tap a play button (or open the Course) to capture it</div>`;
  const instances = te ? String(te.instances) : '—';
  const enginesLive = te ? '1 (shared singleton)' : '— (open Course once)';
  const curLine = te ? (te.lastId || '(idle)') : '—';
  const curUrl = (te && te.lastId && te.pack && te.pack[te.lastId]) ? `voice/${te.lang}/${te.pack[te.lastId]}` : '—';
  const seqId = te ? (te.seqActive ? (te.lastId || 'active') : 'none') : '—';
  const teRecent = (te && te.recent && te.recent.length) ? te.recent : null;
  const lastEv = teRecent ? teRecent[teRecent.length - 1] : null;
  // rc2-198: "How this Course works" (course-opening) narration — does the voice pack have
  // recorded Jack MP3s for it yet? If not, the card is correctly text-only and we say so plainly.
  const CO_ID0 = 'course-opening.say.0';
  const CO_ID1 = 'course-opening.say.1';
  const coHas0 = !!(VOICE_PACK && VOICE_PACK[CO_ID0]);
  const coHas1 = !!(VOICE_PACK && VOICE_PACK[CO_ID1]);
  const coOk = coHas0 && coHas1;
  const coBlock =
    `<div style="margin-top:10px;padding:9px 10px;border:1px solid ${coOk ? '#3a4a32' : '#4a3a24'};border-radius:8px;background:${coOk ? '#192014' : '#201a10'}">` +
    `<div style="color:#cfc9bd;font-size:12px;margin-bottom:5px;letter-spacing:.3px">HOW THIS COURSE WORKS \\u2014 recorded narration</div>` +
    (coOk
      ? `<div style="color:#7fd68a;font-weight:600;font-size:13px">Recorded Jack audio present for ${CO_ID0} / ${CO_ID1}.</div>`
      : `<div style="color:#e6a96b;font-weight:700;font-size:13px;line-height:1.4">How this Course works: recorded Jack audio missing for ${CO_ID0} / ${CO_ID1}<br>` +
        `<span style="color:#9a9488;font-weight:400;font-size:12px">\\u2014 this card narrates as text-only (no female / random device TTS) until the two MP3s are recorded and added to the voice pack.</span></div>`) +
    `</div>`;
  body.innerHTML =
    row('App build (live \u2014 from service worker)', `<b style="color:${cacheReady ? '#7fd68a' : '#e6a96b'}">${appBuild}</b>`) +
    row('Audio engine loaded', engineLoaded ? '<span style="color:#7fd68a">yes (shared singleton)</span>' : '<span style="color:#e6a96b">no \u2014 open the Course once</span>') +
    row('&nbsp;&nbsp;· service-worker cache name', `<span style="color:${cacheReady ? '#7fd68a' : '#e6a96b'}">${cacheStr || '\u2026 (loading)'}</span>`) +
    `<div style="margin-top:10px;padding:9px 10px;border:1px solid #3a3424;border-radius:7px;background:#1c1810">` +
      `<div style="color:#cfc9bd;font-size:12px;margin-bottom:5px;letter-spacing:.3px">JACK VOICE \u2014 what is actually happening</div>` +
      `<div style="color:${jackColor};font-weight:700;font-size:14px;line-height:1.35">${jackLine}</div>` +
      `<div style="color:#9a9488;font-size:12px;margin-top:6px;word-break:break-word">Selected device voice (window.__kmVoicePick): <span style="color:#cfc9bd">${pickStr}</span></div>` +
    `</div>` +
    wrBlock +
    spRows +
    apRows +
    `<div style="margin-top:8px;color:#9a9488">Live audio engine — what Jack actually uses</div>` +
    row('Voice engines active', enginesLive) +
    row('tutorAudio instances', instances + (te ? '  (all share 1 engine)' : '')) +
    row('Current voice line', curLine) +
    row('Current resolved URL', curUrl) +
    row('Active sequence ID', seqId) +
    row('Last engine event', lastEv ? `${lastEv.fn} ${lastEv.id == null ? '' : lastEv.id} → ${lastEv.action}` : '—') +
    `<div style="margin-top:8px;color:#9a9488">Welcome line</div>` +
    row('Line ID', WELCOME_ID) +
    row('Resolved MP3', res.file || '—') +
    row('Resolved URL', res.url || '—') +
    coBlock +
    row('MP3 fetch (200/404)', extra && extra.fetch != null ? extra.fetch : '— (tap “Check Stage 1 file”)') +
    `<div style="margin-top:8px;color:#9a9488">Last self-test action</div>` +
    row('Playback started', extra && extra.started != null ? String(extra.started) : '—') +
    row('Duplicate suppressed', extra && extra.blocked != null ? String(extra.blocked) : '—') +
    row('Previous cancelled', extra && extra.stopped != null ? String(extra.stopped) : '—') +
    `<div style="margin-top:8px;color:#9a9488">Module code versions \u2014 when each file last changed (informational; these are NOT the app build above)</div>` +
    row('&nbsp;&nbsp;· tutorAudio.js', ver.tutorAudio || '(loads with Course)') +
    row('&nbsp;&nbsp;· voiceControl.js', ver.voiceControl || '(loads with Course)') +
    row('&nbsp;&nbsp;· voiceTest.js', ver.voiceTest || BUILD) +
    row('&nbsp;&nbsp;· pwaUpdate.js', ver.pwaUpdate || '(not reporting)') +
    row('&nbsp;&nbsp;· foundations.js', ver.foundations || '(loads when Course opens)') +
    `<div style="margin-top:8px;color:#9a9488">Last 5 voice requests (live engine)</div>` +
    `<pre style="margin:4px 0 0;white-space:pre-wrap;color:#cfc9bd;font-size:12px">${
      teRecent
        ? teRecent.slice(-5).map((r) => `${new Date(r.t).toLocaleTimeString()}  ${r.fn} ${r.id == null ? '' : r.id}  ${r.action}`).join('\n')
        : '— (open the Course or tap a button below)'
    }</pre>`
    // rc2-200 TEMP DIAGNOSTIC: KL1 AUDIO VERDICT -- self-interpreting. Three plain answers:
    // (1) is the real Salamander grand loaded, or did we fall back to the thin synth? (2) did any
    // note double-trigger within 50ms? (3) why is KL1 Jack silent? Reads __kmCoursePianoStatus,
    // __kmAudioTrace, the voice pack, and __kmVoicePick.
    + (() => {
      const cps = (typeof window !== 'undefined' && typeof window.__kmCoursePianoStatus === 'function') ? window.__kmCoursePianoStatus() : null;
      const tr = (typeof window !== 'undefined' && Array.isArray(window.__kmAudioTrace)) ? window.__kmAudioTrace : null;
      // (1) PIANO ENGINE -- is the real grand loaded?
      let engLine, engColor;
      if (!cps) { engLine = 'unknown -- open Key Level 1 and play a note first, then reopen this panel'; engColor = '#e6a96b'; }
      else if (cps.ready) { engLine = 'Salamander grand LOADED (' + (cps.status ? cps.status.loaded : '?') + ' samples) -- the real piano is active'; engColor = '#7fd68a'; }
      else { const st = cps.status || {}; engLine = 'Salamander NOT loaded (' + (st.code || 'unknown') + (st.manifest ? '' : ', manifest missing') + ') -- you are hearing the BACKUP SYNTH, which sounds thin/plinky'; engColor = '#e2675f'; }
      // (2) DUPLICATE REACHING THE ENGINE -- was the SAME demo pitch struck twice within
      // 220ms? The trace is logged at piano.noteOn, so this counts ACTUAL duplicate
      // triggers that reached the engine. Restricted to src='demo' so playing along on the
      // keys never false-flags. If the guards caught the double, it never reaches here.
      let dupLine, dupColor, traceTxt = '', demoDup = 0;
      if (!tr || !tr.length) { dupLine = 'no notes captured yet -- play a phrase in Key Level 1, then reopen this panel'; dupColor = '#e6a96b'; }
      else {
        const engines = Array.from(new Set(tr.map((e) => e.engine)));
        const demoDupList = [];
        for (let i = 0; i < tr.length; i++) {
          if (tr[i].src !== 'demo') continue;
          for (let j = i + 1; j < tr.length; j++) {
            const dt = tr[j].t - tr[i].t;        // ms; the trace is time-ordered
            if (dt > 220) break;
            if (tr[j].src === 'demo' && tr[j].note === tr[i].note && dt > 4) {
              demoDup++; demoDupList.push((tr[i].name || '?') + ' x2 @' + Math.round(dt) + 'ms');
              break;
            }
          }
        }
        dupLine = demoDup
          ? ('YES -- ' + demoDup + ' demo note(s) struck twice within 220ms: ' + demoDupList.slice(-4).join(', ') + ' (a duplicate trigger slipped the guards)')
          : 'NO -- no demo pitch struck twice within 220ms reached the engine';
        dupColor = demoDup ? '#e2675f' : '#7fd68a';
        traceTxt = 'last notes [' + engines.join(' + ') + ']:\n' + tr.slice(-12).map((e) =>
          (e.name + '    ').slice(0, 4) + ' src=' + ((e.src || '?') + '        ').slice(0, 8) + ' ' + (e.engine === 'salamander' ? 'SALAMANDER' : 'pianoVoice') + ' rp=' + (e.repitch == null ? '-' : (e.repitch > 0 ? '+' : '') + e.repitch) + ' gap=' + (e.gapMs == null ? '-' : e.gapMs + 'ms') + (e.dup50 ? '  >>> <50' : '')
        ).join('\n');
      }
      // (2a/2b) DEMO GUARDS -- two SEPARATE counters so the cause is named, not guessed.
      const reHits = (typeof window !== 'undefined' && typeof window.__kmDemoReentryHits === 'number') ? window.__kmDemoReentryHits : null;
      const pdHits = (typeof window !== 'undefined' && typeof window.__kmDemoPitchHits   === 'number') ? window.__kmDemoPitchHits   : null;
      const reLine = (reHits == null) ? 'not initialised' : (reHits + (reHits > 0 ? ' -- a second WHOLE demo was blocked' : ' -- no second whole demo fired'));
      const reColor = (reHits == null) ? '#e6a96b' : (reHits > 0 ? '#7fd68a' : '#9a9488');
      const pdLine = (pdHits == null) ? 'not initialised' : (pdHits + (pdHits > 0 ? ' -- a second SAME-PITCH trigger was blocked' : ' -- no same-pitch re-strike fired'));
      const pdColor = (pdHits == null) ? '#e6a96b' : (pdHits > 0 ? '#7fd68a' : '#9a9488');
      // (2c) KL1 FINAL-BOUNDARY GUARD (rc2-210) -- the chokepoint suppressor right at the
      // piano output. This is the PRIMARY KL1 fix: it catches a duplicate from ANY source.
      const klSup = (typeof window !== 'undefined' && typeof window.__kmKL1SuppressCount === 'number') ? window.__kmKL1SuppressCount : null;
      const klLog = (typeof window !== 'undefined' && Array.isArray(window.__kmKL1SuppressLog)) ? window.__kmKL1SuppressLog : [];
      const klLine = (klSup == null) ? 'not armed yet -- play the KL1 demo ("Hear it again"), then reopen this panel'
        : (klSup > 0 ? (klSup + ' duplicate KL1 strike(s) suppressed at the output -- each intended note sounded ONCE') : '0 -- no duplicate reached the KL1 output (each intended note output once)');
      const klColor = (klSup == null) ? '#e6a96b' : '#7fd68a';
      const klLogTxt = klLog.length ? ('suppressed:\n' + klLog.slice(-6).join('\n')) : '';
      // CONCLUSION -- lead with the boundary guard (the KL1 fix), so a tired reader gets ONE answer.
      const haveTrace = !!(tr && tr.length);
      let concl, conclColor;
      if (klSup == null || !haveTrace) { concl = 'open Key Level 1 and press "Hear it again", then reopen this panel'; conclColor = '#e6a96b'; }
      else if (klSup > 0) { concl = klSup + ' duplicate KL1 strike(s) were SUPPRESSED at the piano output -- the phrase now plays each note once' + (klLog.length ? ' (' + klLog[klLog.length - 1] + ')' : ''); conclColor = '#7fd68a'; }
      else if (demoDup > 0) { concl = 'a duplicate reached the engine OUTSIDE the armed KL1 window -- copy the trace line below and report it'; conclColor = '#e2675f'; }
      else { concl = 'each intended KL1 note output exactly ONCE at the piano boundary -- a clean single phrase. Any remaining thickness is the grand\u2019s natural sustain, not a repeated strike'; conclColor = '#7fd68a'; }
      // (3) KL1 JACK CHAIN -- why silent?
      const kl1Id = 'kl1-first-phrase.say.0';
      const kl1InPack = !!(VOICE_PACK && VOICE_PACK[kl1Id]);
      const pickNow = (typeof window !== 'undefined') ? window.__kmVoicePick : null;
      const jackStatic = kl1InPack ? ('MP3 mapped (' + VOICE_PACK[kl1Id] + ')') : (pickNow ? ('no MP3; would speak via male TTS voice ' + pickNow.name) : 'no recorded MP3 mapped for this line; no recognised male device voice; TEXT-ONLY');
      const jackLive = (extra && extra.kl1jack) ? ('<div style="color:#ffd9a0;font-size:15px;margin-top:6px;font-weight:600">&nbsp;&nbsp;last test: ' + extra.kl1jack + '</div>') : '';
      return '<div style="margin-top:10px;padding:10px;border:1px solid #4a4030;border-radius:8px;background:#1b1810">'
        + '<div style="color:#f3efe6;font-size:16px;font-weight:700;margin-bottom:9px;letter-spacing:.3px">KEY LEVEL 1 AUDIO VERDICT</div>'
        + '<div style="font-size:15px;margin-bottom:7px">1 &mdash; Piano engine: <span style="color:' + engColor + '">' + engLine + '</span></div>'
        + '<div style="font-size:15px;margin-bottom:7px">2 &mdash; KL1 output guard: <span style="color:' + klColor + ';font-weight:600">' + klLine + '</span></div>'
        + '<div style="font-size:15px;margin:9px 0 7px;padding:7px 9px;border-radius:6px;background:#241f14"><b>&rarr; CONCLUSION:</b> <span style="color:' + conclColor + ';font-weight:600">' + concl + '</span></div>'
        + (klLogTxt ? ('<pre style="margin:2px 0 7px;white-space:pre-wrap;color:#7fd68a;font-size:11px;line-height:1.5">' + klLogTxt + '</pre>') : '')
        + '<div style="font-size:12px;color:#8a847a;margin-bottom:4px">detail &mdash; duplicate reaching engine (&le;220ms): <span style="color:' + dupColor + '">' + dupLine + '</span></div>'
        + '<div style="font-size:12px;color:#8a847a;margin-bottom:4px">detail &mdash; re-entry guard: <span style="color:' + reColor + '">' + reLine + '</span> &middot; pitch guard: <span style="color:' + pdColor + '">' + pdLine + '</span></div>'
        + '<div style="font-size:15px;margin:7px 0">3 &mdash; KL1 Jack voice: <span style="color:#e6a96b">' + jackStatic + '</span></div>'
        + jackLive
        + (traceTxt ? ('<pre style="margin:6px 0 0;white-space:pre-wrap;color:#9a9488;font-size:10px;line-height:1.5">' + traceTxt + '</pre>') : '')
      + '</div>';
    })();
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
    + 'font:15px/1.45 system-ui,sans-serif;overflow:auto;padding:18px;max-width:560px;margin:0 auto;';
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
    + '<button data-act="kl1jack" style="grid-column:1 / -1;padding:12px;border:0;border-radius:10px;background:#4a3b6b;color:#fff;font-weight:600">Test KL1 Jack voice</button>'
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
      refresh({ started: after.some((r) => r.result === 'play'), blocked: after.some((r) => r.result === 'blocked'), stopped: after.some((r) => r.stoppedPrev) });
    } else if (act === 'twice') {
      const before = (window.__kmVoiceTrace || []).length;
      c && c.say(WELCOME_ID, WELCOME_TEXT, { source: 'selftest' });
      c && c.say(WELCOME_ID, WELCOME_TEXT, { source: 'selftest' });   // immediate duplicate
      const after = (window.__kmVoiceTrace || []).slice(before);
      const plays = after.filter((r) => r.result === 'play').length;
      const blocked = after.filter((r) => r.result === 'blocked').length;
      refresh({ started: plays === 1 ? 'yes (exactly 1)' : `** ${plays} — investigate **`, blocked: blocked >= 1 ? `yes (${blocked})` : '** none **', stopped: after.some((r) => r.stoppedPrev) });
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
    } else if (act === 'kl1jack') {
      // KL1 Jack chain, reported live so the button never just does nothing.
      const kl1Id = 'kl1-first-phrase.say.0';
      const kl1Text = 'This is the first phrase. Read the shape, then play it back.';
      const inPack = !!(VOICE_PACK && VOICE_PACK[kl1Id]);
      const pickNow = (typeof window !== 'undefined') ? window.__kmVoicePick : null;
      const before = (window.__kmVoiceTrace || []).length;
      try { c && c.say(kl1Id, kl1Text, { source: 'selftest-kl1' }); } catch (_) { /* no-op */ }
      const after = (window.__kmVoiceTrace || []).slice(before);
      const played = after.some((r) => r.result === 'play');
      const results = after.map((r) => r.result).filter(Boolean).join(',') || 'no engine response';
      let verdict;
      if (inPack) verdict = played ? ('MP3 played (' + VOICE_PACK[kl1Id] + ')') : ('MP3 mapped but did NOT play -- engine said: ' + results);
      else if (pickNow) verdict = played ? ('no MP3; spoke via male TTS voice ' + pickNow.name) : ('no MP3; tried male TTS ' + pickNow.name + ' -- engine said: ' + results);
      else verdict = 'no recorded MP3 mapped; no recognised male device voice; TEXT-ONLY (nothing audible -- expected until KL1 voice is recorded)';
      refresh({ kl1jack: verdict });
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
// rc2-212: moved LEFT (same height) so it no longer covers the transport strip's
// Stay/Continue cluster on phones, and shrunk to the tiny/muted size the comment
// above always promised. right:218px clears Stay+Continue at phone widths; on
// wider screens it simply sits in empty space.
function badge() {
  if (typeof document === 'undefined' || document.getElementById('km-build-badge')) return;
  const b = document.createElement('button');
  b.id = 'km-build-badge';
  b.textContent = BUILD;
  b.title = 'KeyMaster build — tap for Voice Self-Test';
  b.style.cssText = 'position:fixed;right:218px;bottom:16px;z-index:2147483646;'
    + 'font:600 11px/1 system-ui,sans-serif;color:#fff;background:#285FA6;'
    + 'border:1px solid rgba(255,255,255,.7);border-radius:9px;padding:6px 10px;opacity:.8;'
    + 'box-shadow:0 1px 5px rgba(0,0,0,.25);text-align:center;';
  b.addEventListener('click', () => { try { location.hash = '#voice-test'; } catch (_) {} });
  document.body.appendChild(b);
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', check);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { badge(); check(); });
  else { badge(); check(); }
}
