  import React, { useState, useRef, useEffect } from 'react';

  const track = {
    name: '',
    album: {
      images: [{ url: '' }]
    },
    artists: [{ name: '' }]
  };

  function WebPlayback({ token }) {
    const [player, setPlayer] = useState(undefined);
    const [is_paused, setPaused] = useState(false);
    const [is_active, setActive] = useState(false);
    const [current_track, setTrack] = useState(track);
    const playerRef = useRef(null);
    const isSDKInitialized = useRef(false);
    const pollRef = useRef(null); // Ref for the interval

    useEffect(() => {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;

      document.body.appendChild(script);

      const readyListener = ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
      };

      window.onSpotifyWebPlaybackSDKReady = () => {
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

            // Update the track and paused state
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
            
              
            if (is_paused) {
              if (pollRef.current) {
                clearInterval(pollRef.current);
              }
              return;
            }

            if (pollRef.current) {
              clearInterval(pollRef.current);
            }

            const poll = setInterval(async () => {
              try {
                const playerStateResponse = await fetch('http://localhost:5000/player-state');
                const playerStateData = await playerStateResponse.json();
                const currentTimestamp = playerStateData.progress_ms / 1000;

                const predictResponse = await fetch('http://localhost:5000/predict-scale-change', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ trackSections, currentTimestamp }),
                });

                const predictData = await predictResponse.json();
                console.log(predictData);
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
    }, [token]);

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
          </div>
        </div>
      </div>
    );
  }

  export default WebPlayback;
