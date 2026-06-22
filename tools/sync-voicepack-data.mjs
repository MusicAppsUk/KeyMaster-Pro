// tools/sync-voicepack-data.mjs — regenerate the runtime resolver map
// (voicePackData.js) from the SINGLE SOURCE OF TRUTH: tools/voice-lines.json.
//
// Run this whenever lines are added to the manifest so the app's VOICE_PACK
// never misses an ID and never drifts from the filenames the generator writes.
//   node tools/sync-voicepack-data.mjs    ->    writes ../voicePackData.js
//
// (Shipping the updated voicePackData.js in an app build still needs its usual
// cache-bust version bump; this tool produces the correct content to ship.)

import { readFileSync, writeFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('./voice-lines.json', import.meta.url), 'utf8'));
const header = [
  '// voicePackData.js — GENERATED. Every spoken line ID -> local MP3, matched to the lesson code.',
  '// Shared source of truth with the Jack generator (tools/voice-lines.json). Do not hand-edit;',
  '// regenerated whenever lines are added so the runtime resolver never misses an ID.',
];
let out = header.join('\n') + '\nexport const VOICE_PACK = {\n';
for (const { id, file } of manifest.lines) {
  out += '  ' + JSON.stringify(id) + ': ' + JSON.stringify(file) + ',\n';
}
out += '};\n';
writeFileSync(new URL('../voicePackData.js', import.meta.url), out);
console.log('voicePackData.js synced: ' + manifest.lines.length + ' entries from voice-lines.json');
