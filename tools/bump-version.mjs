// tools/bump-version.mjs — surgically bump the KeyMaster cache/version token.
//
// Usage:  node tools/bump-version.mjs <new-token>      e.g.  node tools/bump-version.mjs rc2-211
//
// Reads the CURRENT token from foundations.js (KM_BUILD), then replaces ONLY the
// cache-bust strings — never the historical `// rc2-NNN:` code comments — across the
// seven shell files, and verifies the result. The target is given manually; this
// script NEVER auto-increments. Designed to run in CI (an ephemeral checkout): if any
// verification fails it exits non-zero, so the workflow commits nothing.
//
// Surgical targets (the only strings changed):
//   v=<token>            in app.js, index.html        (import / link cache-busters)
//   = '<token>'          in foundations.js (KM_BUILD), pwaUpdate.js, voiceTest.js (BUILD)
//   keymaster-<token>    in sw.js (CACHE)
//   "<token>·            in cockpit.css (build badge — note the trailing space)
//
// Verification (any failure -> non-zero exit):
//   • zero old cache-bust strings remain; every shell file carries the new token
//   • every bumped .js still parses (ESM check, node-version independent)
//   • cockpit.css braces stay balanced
//   • the protected audio/content files are byte-for-byte unchanged (md5 tripwire)

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url);          // repo root, relative to tools/
const p = (name) => new URL(name, ROOT);
const read = (name) => readFileSync(p(name), 'utf8');
const md5_12 = (name) => createHash('md5').update(readFileSync(p(name))).digest('hex').slice(0, 12);

// The seven shell files that carry the cache/version token.
const SHELL = ['app.js', 'foundations.js', 'sw.js', 'cockpit.css', 'index.html', 'voiceTest.js', 'pwaUpdate.js'];

// Protected files this bump must NOT change (md5 tripwire — first 12 hex of md5).
// Update these ONLY if a protected file is ever deliberately, separately changed.
const PROTECTED = {
  'coursePianoSampler.js': 'd0835e23bd1a',
  'pianoVoice.js':         '884bab6ea5d9',
  'synth.js':              '4d4f08db1b88',
  'pianoEngine.js':        'ef7038f08177',
  'courseKeyLevel1.js':    '87b0cc522c00',
  'theme.css':             '9e81987a5ead',
};

function die(msg) { console.error('bump-version: ' + msg); process.exit(1); }

// Target token (manual).
const TO = (process.argv[2] || '').trim();
if (!TO) die('no target token. Usage: node tools/bump-version.mjs <new-token>  (e.g. rc2-211)');
if (!/^[A-Za-z0-9._-]+$/.test(TO)) die('target token "' + TO + '" has unexpected characters.');

// Current token, read from the canonical source (KM_BUILD in foundations.js).
const fromMatch = read('foundations.js').match(/KM_BUILD\s*=\s*'([^']+)'/);
if (!fromMatch) die('could not find KM_BUILD in foundations.js to read the current token.');
const FROM = fromMatch[1];
if (FROM === TO) { console.log('bump-version: already at ' + TO + ' — nothing to do.'); process.exit(0); }
console.log('bump-version: ' + FROM + ' -> ' + TO);

// The four surgical replacements (FROM escaped for regex).
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const F = esc(FROM);
const patterns = [
  [new RegExp('v=' + F, 'g'),         'v=' + TO],
  [new RegExp("= '" + F + "'", 'g'),  "= '" + TO + "'"],
  [new RegExp('keymaster-' + F, 'g'), 'keymaster-' + TO],
  [new RegExp('"' + F + ' ', 'g'),    '"' + TO + ' '],
];

// Snapshot protected md5s before (must be identical after).
const beforeMd5 = {};
for (const name of Object.keys(PROTECTED)) beforeMd5[name] = md5_12(name);

// Apply.
let total = 0;
for (const name of SHELL) {
  let txt = read(name);
  let n = 0;
  for (const [re, to] of patterns) txt = txt.replace(re, () => { n++; return to; });
  if (n > 0) { writeFileSync(p(name), txt); total += n; }
  console.log('  ' + name + ': ' + n + ' string(s) bumped');
}
if (total === 0) die('no cache-bust strings matched "' + FROM + '" — nothing changed (wrong current token?).');

// Verify: no old cache-bust strings remain; new token present in every shell file.
const oldPats = ['v=' + FROM, "= '" + FROM + "'", 'keymaster-' + FROM, '"' + FROM + ' '];
for (const name of SHELL) {
  const txt = read(name);
  for (const op of oldPats) if (txt.includes(op)) die('verify failed: old cache-bust string still in ' + name + ': ' + op);
  if (!txt.includes(TO)) die('verify failed: new token ' + TO + ' not found in ' + name);
}

// Verify: every bumped .js parses (force ESM via a .mjs temp copy).
for (const name of SHELL.filter((f) => f.endsWith('.js'))) {
  const tmp = join(tmpdir(), 'km-bumpchk.mjs');
  writeFileSync(tmp, read(name));
  try { execFileSync('node', ['--check', tmp], { stdio: 'pipe' }); }
  catch { die('verify failed: ' + name + ' does not parse after bump.'); }
}

// Verify: cockpit.css braces balanced.
const css = read('cockpit.css');
const open = (css.match(/{/g) || []).length;
const close = (css.match(/}/g) || []).length;
if (open !== close) die('verify failed: cockpit.css braces unbalanced (' + open + '/' + close + ').');

// Verify: protected files unchanged (and at the known baseline).
for (const [name, want] of Object.entries(PROTECTED)) {
  const now = md5_12(name);
  if (now !== beforeMd5[name]) die('verify failed: protected file changed during bump: ' + name);
  if (now !== want) die('verify failed: protected file md5 mismatch (' + name + ': ' + now + ' != expected ' + want + '). If this change was deliberate, update PROTECTED in tools/bump-version.mjs.');
}

console.log('bump-version: OK — ' + total + ' string(s) -> ' + TO + ' (parse ok, braces ' + open + '/' + close + ', protected files unchanged).');
