import { writeFileSync, existsSync, mkdirSync } from 'node:fs';

const VOICE_ID = 'RL2gbGArFsmr05q4aJLj';
const KEY = process.env.ELEVENLABS_API_KEY;
const DRY = process.env.DRY !== 'false';

const LINES = [["welcome.0","Welcome to the KeyMaster PRO Course."],["welcome.1","I'm your tutor. We'll go step by step, and you'll always know what to do next."],["welcome.2","Sit comfortably — both feet down, shoulders easy, hands relaxed over the keys. Natural, supported, never forced."],["welcome.3","When you're ready, we'll begin by orienting the keyboard."],["meet-keyboard.0","Let's orient the keyboard first."],["meet-keyboard.1","Lower notes live to your left, higher notes to your right."],["meet-keyboard.2","Play any key, and listen to where its sound sits."],["meet-keyboard.correct","Good. That is your first landmark: sound moves across the keyboard, low to high."],["low-high.0","The keyboard is laid out by pitch."],["low-high.1","Keys to the left sound lower; keys to the right sound higher."],["low-high.2","Play a low note on the left — then a high note on the right."],["low-high.correct","Good — low on the left, high on the right. You're hearing the shape of the keyboard."],["find-c.0","Find a group of two black keys."],["find-c.1","The white key just to their left is C."],["find-c.2","Because the pattern repeats, C is everywhere."],["find-c.3","Now you try — find a C."],["find-c.correct","Exactly — that's C, just left of the two black keys."]];

if (!DRY && !KEY) { console.error('Missing ELEVENLABS_API_KEY'); process.exit(1); }
if (!DRY) mkdirSync('voice/en-GB', { recursive: true });

let chars = 0, made = 0;
for (const [id, text] of LINES) {
  const file = 'voice/en-GB/' + id.replace(/\./g, '-') + '.mp3';
  chars += text.length;
  if (DRY) { console.log('would generate ' + id + ' -> ' + file + ' (' + text.length + ' chars)'); continue; }
  if (existsSync(file)) { console.log('skip (exists) ' + file); continue; }
  const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOICE_ID + '?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  });
  if (res.status === 401 || res.status === 403) { console.error('API key rejected (HTTP ' + res.status + ')'); process.exit(1); }
  if (!res.ok) { console.error(id + ': HTTP ' + res.status); process.exit(1); }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  made++; console.log('wrote ' + file);
}
console.log(DRY ? ('DRY RUN: ' + LINES.length + ' lines, ' + chars + ' characters (no files written)') : ('Done: ' + made + ' file(s) generated'));
