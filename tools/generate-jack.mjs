// tools/generate-jack.mjs — generate the FULL KeyMaster PRO Jack voice pack.
//
// SINGLE SOURCE OF TRUTH: tools/voice-lines.json (every { id, text, file }).
// This script does NOT embed its own copy of the lines — it reads the manifest,
// so the manifest, this generator, and the runtime map (voicePackData.js,
// regenerated from the same manifest via tools/sync-voicepack-data.mjs) can
// never drift apart. Add new lines in ONE place — voice-lines.json — and this
// generator and the workflow automatically cover them next run.
//
// Behaviour:
//   • Additive: existing voice/en-GB/*.mp3 are skipped, never re-billed.
//   • Filenames come straight from the manifest `file` field — the canonical
//     no-say convention (e.g. welcome.say.0 -> welcome-0.mp3).
//   • Writes a clear summary to the GitHub Actions run page ($GITHUB_STEP_SUMMARY)
//     and the console: total / existing / missing / generated / skipped / failed.
//   • DRY=true (default): preview only — no API calls, no files, no cost.
//   • SCOPE (optional): comma-separated id-prefixes (e.g. "kl1-" or
//     "kl1-eveningbell,kl2-"). When set, ONLY lines whose id starts with one of
//     those prefixes are eligible this run — the write-allowlist. Unset => whole
//     manifest, unchanged behaviour.
//   • MAX_NEW (optional): hard cap on NEW files per run. A real run aborts before
//     any API call if exceeded; a dry run completes but flags it. Cost insurance.

import { writeFileSync, existsSync, mkdirSync, appendFileSync, readFileSync } from 'node:fs';

const VOICE_ID = 'RL2gbGArFsmr05q4aJLj';
const KEY = process.env.ELEVENLABS_API_KEY;
const DRY = String(process.env.DRY ?? '').trim().toLowerCase() !== 'false';
const OUT_DIR = 'voice/en-GB';

// Optional SCOPE: comma-separated id-prefixes (e.g. "kl1-" or "kl1-eveningbell,kl2-").
// When set, ONLY lines whose id starts with one of these prefixes are eligible this
// run — the write-allowlist. Unset/empty => whole manifest (unchanged behaviour).
const SCOPE = String(process.env.SCOPE ?? '').trim();
const SCOPE_PREFIXES = SCOPE ? SCOPE.split(',').map((s) => s.trim()).filter(Boolean) : [];

// Optional MAX_NEW: hard cap on how many NEW (missing) files one run may generate.
// Unset => no cap. A real run aborts BEFORE any API call if exceeded; a dry run
// completes but flags it. Guards against an unexpectedly large paid run.
const MAX_NEW_RAW = String(process.env.MAX_NEW ?? '').trim();
if (MAX_NEW_RAW !== '' && !Number.isFinite(Number(MAX_NEW_RAW))) {
  console.error('MAX_NEW must be a number (got "' + MAX_NEW_RAW + '").'); process.exit(1);
}
const MAX_NEW = MAX_NEW_RAW === '' ? null : Number(MAX_NEW_RAW);

// Read every current line from the manifest (resolved next to this script, so
// the working directory does not matter).
const MANIFEST = new URL('./voice-lines.json', import.meta.url);
let LINES;
try {
  LINES = JSON.parse(readFileSync(MANIFEST, 'utf8')).lines;
} catch (e) {
  console.error('Cannot read tools/voice-lines.json: ' + e.message);
  process.exit(1);
}
if (!Array.isArray(LINES) || !LINES.length) { console.error('Manifest has no lines.'); process.exit(1); }

// Apply optional scope (the write-allowlist). Keep the full manifest count for reporting.
const TOTAL_MANIFEST = LINES.length;
if (SCOPE_PREFIXES.length) {
  LINES = LINES.filter((l) => SCOPE_PREFIXES.some((p) => String(l.id).startsWith(p)));
  if (!LINES.length) {
    console.error('SCOPE "' + SCOPE + '" matched 0 of ' + TOTAL_MANIFEST + ' manifest lines. Aborting.');
    process.exit(1);
  }
}

// Pre-scan: which lines already have an MP3, which are missing (dry run too).
const existing = [];
const missing = [];
for (const line of LINES) {
  (existsSync(OUT_DIR + '/' + line.file) ? existing : missing).push(line);
}
const missingChars = missing.reduce((n, l) => n + l.text.length, 0);
const overCap = MAX_NEW !== null && missing.length > MAX_NEW;

let made = 0;
const skipped = existing.length;
const failed = [];

if (DRY) {
  console.log('DRY RUN — no API calls, no files written.');
  console.log('  manifest lines : ' + TOTAL_MANIFEST + (SCOPE_PREFIXES.length ? '  (scope "' + SCOPE + '" -> ' + LINES.length + ' in scope)' : ''));
  console.log('  already present: ' + existing.length);
  console.log('  missing (to do): ' + missing.length + '  (' + missingChars + ' characters)');
  if (MAX_NEW !== null) console.log('  MAX_NEW cap    : ' + MAX_NEW + (overCap ? '  ** EXCEEDED — a real run would ABORT **' : '  (ok)'));
} else {
  if (overCap) {
    console.error('MAX_NEW=' + MAX_NEW + ' exceeded: ' + missing.length + ' new file(s) would be generated. Aborting before any API call. Raise MAX_NEW or narrow SCOPE.');
    writeSummary('MAX_NEW exceeded (' + missing.length + ' > ' + MAX_NEW + ')');
    process.exit(1);
  }
  if (!KEY) { console.error('Missing ELEVENLABS_API_KEY'); writeSummary('Missing ELEVENLABS_API_KEY'); process.exit(1); }
  mkdirSync(OUT_DIR, { recursive: true });
  for (const { id, text, file } of missing) {
    const path = OUT_DIR + '/' + file;
    let res;
    try {
      res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOICE_ID + '?output_format=mp3_44100_192', {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      });
    } catch (e) { failed.push(id + ' (network: ' + e.message + ')'); continue; }
    if (res.status === 401 || res.status === 403) {
      console.error('API key rejected (HTTP ' + res.status + ') — aborting.');
      writeSummary('API key rejected (HTTP ' + res.status + ')');
      process.exit(1);
    }
    if (!res.ok) { failed.push(id + ' (HTTP ' + res.status + ')'); continue; }  // transient: retried next run
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    made += 1; if (made % 25 === 0) console.log('… ' + made + ' generated');
  }
  console.log('Done: ' + made + ' generated, ' + skipped + ' already present, ' + failed.length + ' failed (' + LINES.length + ' total).');
}

writeSummary(null);

// Markdown summary to the Actions run page (visible without opening step logs).
function writeSummary(aborted) {
  const out = [
    '## Jack voice pack — ' + (DRY ? 'DRY RUN (preview only)' : 'GENERATION'),
    '',
    '_Source of truth: `tools/voice-lines.json`_',
    '',
    '| Field | Value |',
    '| --- | --- |',
    '| Mode | ' + (DRY ? 'dry run — no cost, no files written' : 'real generation') + ' |',
    '| Manifest lines | ' + TOTAL_MANIFEST + ' |',
    '| Scope | ' + (SCOPE_PREFIXES.length ? '`' + SCOPE + '` (' + LINES.length + ' in scope)' : 'whole manifest') + ' |',
    '| Existing MP3s | ' + existing.length + ' |',
    '| Missing MP3s | ' + missing.length + ' |',
    '| MAX_NEW cap | ' + (MAX_NEW === null ? 'none' : (MAX_NEW + (overCap ? ' — EXCEEDED' : ''))) + ' |',
    '| Generated this run | ' + (DRY ? '0 (preview)' : made) + ' |',
    '| Skipped (existing) | ' + (DRY ? '0' : skipped) + ' |',
    '| Failures | ' + failed.length + ' |',
    '| Output folder | `' + OUT_DIR + '` |',
    '| Voice ID | ' + VOICE_ID + ' |',
  ];
  if (aborted) out.push('| Aborted | ' + aborted + ' |');
  if (failed.length) { out.push('', '**Failures:**'); failed.forEach((f) => out.push('- ' + f)); }
  if (DRY && missing.length) out.push('', '_Run again with **dry_run = false** to generate the ' + missing.length + ' missing file(s)._');
  if (DRY && !missing.length) out.push('', '_All ' + LINES.length + ' lines already have an MP3 — nothing to generate._');
  if (!DRY && made > 0) out.push('', '_Generated ' + made + ' new MP3(s) into `' + OUT_DIR + '`._');
  const md = out.join('\n') + '\n';
  console.log('\n' + md);
  const sumPath = process.env.GITHUB_STEP_SUMMARY;
  if (sumPath) { try { appendFileSync(sumPath, md); } catch (e) { console.error('summary write failed: ' + e.message); } }
}
