// courseData.js
// Shared musical constants referenced by Course step data. Kept in one small
// module (rather than inside foundations.js) so the stage content modules can
// import them WITHOUT a circular dependency back into the engine. Original KeyMaster material; no third-party, method-book, or competitor content.

import { buildScale } from './scaleEngine.js';

// B major from B3 = [59, 61, 63] = B, C#, D# — a recurring teaching fragment.
const B_MAJOR_SCALE = buildScale({ letter: 'B' }, 'major');
export const B_FRAGMENT = B_MAJOR_SCALE.midiAt(3).slice(0, 3);
export const B_FRAGMENT_NAMES = B_MAJOR_SCALE.degrees.slice(0, 3).map((d) => d.name);
