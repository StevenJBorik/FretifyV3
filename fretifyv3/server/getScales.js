const tonal = require('tonal');

const tuning = ['E', 'A', 'D', 'G', 'B', 'E'];
const scales = ['major', 'harmonic minor', 'melodic minor', 'natural minor', 'pentatonic major', 'pentatonic minor', 'pentatonic blues', 'pentatonic neutral', 'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian', 'diatonic', 'diminished', 'half diminished', 'whole diminished', 'whole tone', 'dominant 7th', 'lydian augmented', 'lydian minor', 'lydian diminished'];   
const keyRelativeMinorPairs = {
    "C": "A",
    "C#": "A#",
    "Db": "Bb",
    "D": "B",
    "D#": "C",
    "Eb": "C#",
    "E": "D",
    "F": "D#",
    "F#": "E",
    "Gb": "F",
    "G": "F#",
    "G#": "G",
    "Ab": "G#",
    "A": "G",
    "A#": "G#",
    "Bb": "A",
    "B": "A#"
  };
  
  const scaleCombinations = {};

  for (const key in keyRelativeMinorPairs) {
    const relativeMinor = keyRelativeMinorPairs[key];
    const scaleCombination = {};
  
    for (const scale of scales) {
      const scaleNotes = tonal.scale.notes(`${key} ${scale}`);
      const positions = tonal.guitar.scalePositions(scaleNotes, tuning);
      scaleCombination[scale] = positions;
    }
  
    scaleCombinations[key] = scaleCombination;
    scaleCombinations[relativeMinor] = scaleCombination;
  }
  
  console.log(scaleCombinations);