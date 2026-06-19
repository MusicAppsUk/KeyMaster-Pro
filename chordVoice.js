// chordVoice.js
//
// Thin re-export. The tutor-voice implementation was generalised into the shared
// tutorVoice.js in rc2-47 so the Master Training / Learn path and Chord Masterclass
// use ONE implementation. Chord keeps importing createChordVoice from here, so its
// rc2-46 behaviour is unchanged.
import { createTutorVoice } from './tutorVoice.js';

export const createChordVoice = createTutorVoice;
