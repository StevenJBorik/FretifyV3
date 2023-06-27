  import React, { useState, useRef, useEffect } from 'react';
  import Fretboard from '../server/drawFretboard'

  const track = {
    name: '',
    album: {
      images: [{ url: '' }]
    },
    artists: [{ name: '' }]
  };

  const relativeKeys = {
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
  
  function convertToNumericValue(key) {
    const letterValues = {
      E: 0,
      F: 1,
      'F#': 2,
      Gb: 2,
      G: 3,
      'G#': 4,
      Ab: 4,
      A: 5,
      'A#': 6,
      Bb: 6,
      B: 7,
      C: 8,
      'C#': 9,
      Db: 9,
      D: 10,
      'D#': 11,
      Eb: 11
    };
  
    const letter = key.charAt(0).toUpperCase();
    const octave = parseInt(key.charAt(key.length - 1));
  
    if (letter in letterValues) {
      return octave * 12 + letterValues[letter];
    }
    return null;
  }
  

  function WebPlayback({ token }) {
    const [player, setPlayer] = useState(undefined);
    const [is_paused, setPaused] = useState(false);
    const [is_active, setActive] = useState(false);
    const [current_track, setTrack] = useState(track);
    const playerRef = useRef(null);
    const [selectedScale, setSelectedScale] = useState(null); //state for selected scale
    const isSDKInitialized = useRef(false);
    const pollRef = useRef(null); // Ref for the interval
    const [numericValue, setNumericValue] = useState(null); // Store the numeric value in state


    useEffect(() => {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
    
      document.body.appendChild(script);
    
      const readyListener = ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
      };
    
      window.onSpotifyWebPlaybackSDKReady = async () => {
        if (!isSDKInitialized.current) {
          const player = new window.Spotify.Player({
            name: 'Web Playback SDK',
            getOAuthToken: (cb) => {
              cb(token);
            },
            volume: 0.5
          });
    
          setPlayer(player);
    
          player.addListener('ready', readyListener);
    
          player.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
          });
    
          player.addListener('player_state_changed', async (state) => {
            console.log('player_state_changed event triggered');
            if (!state) {
              return;
            }
    
            // Update the track and pau ed state
            setTrack(state.track_window.current_track);
            setPaused(state.paused);
    
            // Define track id and sections array to be passed to FretiFlow
            const trackSections = state.track_window.current_track.sections;
            const trackId = state.track_window.current_track.id;
      
            try {
              const response = await fetch(`http://localhost:5000/audio-analysis/${trackId}`);
              const data = await response.json();
              const sections = data.sections;
              const currentTimestamp = state.position / 1000; // Use the exact current timestamp without rounding
              
              const responseTrackDetails = await fetch(`http://localhost:5000/tracks/${trackId}`);
              if (responseTrackDetails.ok) {
                const trackData = await responseTrackDetails.json();
                const trackDataArtist = trackData.artist;
                const trackDataTitle = trackData.name;
                console.log(trackDataArtist, trackDataTitle);

                const songDataResponse = await fetch(`http://localhost:5000/songdata/${encodeURIComponent(trackDataArtist)}/${encodeURIComponent(trackDataTitle)}`);
                const songData = await songDataResponse.json();
                console.log('Song Data:', songData);  

                const key = songData.key;
                const numericValue = convertToNumericValue(key);
                const relativeNumericValue = convertToNumericValue(relativeKeys[key]);
                setNumericValue(numericValue);
                
                // Use the fretboard.drawScale function from the provided scales.js library to display the scale
                // fretboard.drawScale(scale.dorian, numericValue);
                // fretboard.drawScale(scale.dorian, relativeNumericValue); 

              }
              else {
                console.log('Error retrieving track details:', responseTrackDetails.status);

              }

              // Set up the interval for checking the timestamp
              if (pollRef.current) {
                clearInterval(pollRef.current);
              }
              
              const poll = setInterval(async () => {
                try {
                  const playerStateResponse = await fetch('http://localhost:5000/player-state');
                  const playerStateData = await playerStateResponse.json();
                  const currentTimestamp = playerStateData.progress_ms / 1000;
                
                  console.log('Current Timestamp:', currentTimestamp);
                
                  const predictResponse = await fetch('http://localhost:5000/predict-scale-change', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ currentTimestamp }),
                  });
                
                  const predictData = await predictResponse.json();
                  console.log('Has Match:', predictData.hasMatch);
                
                  // Set prediction state here if needed
                } catch (error) {
                  console.log('Error retrieving prediction:', error);
                }
              }, 1000); // Poll every 1 second
      
              pollRef.current = poll;
              setActive(true); 
            } catch (error) {
              console.log('Error retrieving track analysis:', error);
            }          
          });
      
          const handleScaleSelection = (event) => {
            const selectedScaleName = event.target.value;
            const selectedScaleObject = scale[selectedScaleName];
        
            setSelectedScale(selectedScaleObject);
          };

          player.connect();
          isSDKInitialized.current = true;
        }
      };
    
      return () => {
        script.remove();
        window.onSpotifyWebPlaybackSDKReady = null;
        if (player) {
          player.removeListener('ready', readyListener);
          player.disconnect();
        }
      };
    }, [token, current_track]);
    
    if (!is_active) {
      return (
        <div className="container">
          <h2>Loading...</h2>
        </div>
      );
    }

    return (
    <div className="container">
      <div className="main-wrapper">
        <img src={current_track.album.images[0].url} className="now-playing__cover" alt="" />
        <div className="now-playing__side">
          <div className="now-playing__name">{current_track.name}</div>
          <div className="now-playing__artist">{current_track.artists[0].name}</div>
          <button className="btn-spotify" onClick={() => { player.previousTrack() }}>
            &lt;&lt;
          </button>
          <button className="btn-spotify" onClick={() => { player.togglePlay() }}>
            {is_paused ? 'PLAY' : 'PAUSE'}
          </button>
          <button className="btn-spotify" onClick={() => { player.nextTrack() }}>
            &gt;&gt;
          </button>
          <select onChange={handleScaleSelection}>
            <option value="">Select a Scale</option>
            <option value="major">Major</option>
            <option value="jonian">Jonian</option>
            <option value="dorian">Dorian</option>
            <option value="phrygian">Dorian</option>
            <option value="lydian">Dorian</option>
            <option value="mixolydian">Dorian</option>
            <option value="eolian">Dorian</option>
            <option value="locrian">Dorian</option>
            <option value="hexatonic">Dorian</option>
            <option value="minor">Dorian</option>
            <option value="jazz_minor">Dorian</option>

          </select>
          {selectedScale && (
            <button className="btn-spotify" onClick={() => { Fretboard.drawScale(selectedScale, numericValue) }}>
              Draw Scale
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
  export default WebPlayback;
