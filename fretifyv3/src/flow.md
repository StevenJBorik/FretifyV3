key of song -- > get relative minor/major --> create mapping between drawScale Root note and major and minor keys. --> pass keys to UI -> Create UI options for song section frequency (2x = midpoint between each section, trigger scale change), Ascending/Descending Scale order, Number of frets to display per switch, , Fretboard Range, String range, -- > Web Audio API for lighting up scale note --> UI development --> Different Tuning logic/impelimentation

1) Compare key received from following call:
       const songDataResponse = await fetch(`http://localhost:5000/songdata/${encodeURIComponent(trackDataArtist)}/${encodeURIComponent(trackDataTitle)}`);
                const songData = await songDataResponse.json();
                console.log('Song Data:', songData);  

        grab its corresponding relative key here in our json file:
                    {
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
        }
        pass both the key and its relative key above to a function that computes what the letter values we are getting above to the root the fretboard.drawScale method, but as a number that corresponds to the root note. Ive linked the relevant javascript file for us to utilize. 
            https://github.com/michelecos/Scales/blob/master/js/scales.js
            
            fretboard.drawScale(scale.dorian, 12);
        so in this case we would use the function described a moment ago to convert E to 12, and then pass it to the draw function to display the the scale. 
        
ok nice, got that implemented. so lets take a look at the draw scale functionality and think about what we are trying to do within the context of the application. We have the following logic:

    drawScale(scale, fromFret, fromString = 6, span = 8) {
        var pos = fromFret;
        var string = fromString - 1;
        var step = 0;

        do {
            if (step == 0) {
                this.frets[pos].mark(string, theme.fundamental);
            } else {
                this.frets[pos].mark(string);
            }
            pos += scale[step];
            step++;
            if (step >= scale.length) {
                step = 0;
            }
            if (pos > fromFret + 3) {
                pos -= (string == 2 ? 4 : 5);
                string--;
            }
        } while(string >= 0 && --span > 0);
    }

Lets talk about the parameters first. for the scale parameter, we want the user to be able to select the type of scale they want to play along for the particular song. Or, they can select to have a random scale. the second parameter, fromFret, we want to caculate based on our mapping of the k