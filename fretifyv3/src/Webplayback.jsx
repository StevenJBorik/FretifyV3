    import React, { useState, useRef, useEffect } from 'react';

    const track = {
    name: '',
    album: {
        images: [
        { url: '' }
        ]
    },
    artists: [
        { name: '' }
    ]
    };

    function WebPlayback({ token }) {
      const [player, setPlayer] = useState(undefined);
      const [is_paused, setPaused] = useState(false);
      const [is_active, setActive] = useState(false);
      const [current_track, setTrack] = useState(track);
      const playerRef = useRef(null);
      const isSDKInitialized = useRef(false);

    
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
              if (!state) {
                return;
              }
      
              // Update the track and paused state
              setTrack(state.track_window.current_track);
              setPaused(state.paused);
      
              const trackId = state.track_window.current_track.id;
              console.log(trackId);
      
              try {
                const response = await fetch(`/audio-analysis/${trackId}`);
                const data = await response.json();
                // eslint-disable-next-line no-unused-vars
                const trackAnalysis = data; // Save track analysis data to variable
                setActive(true);
              } catch (error) {
                console.log('Error retrieving track analysis:', error);
              }
            });
      
            player.connect();
            isSDKInitialized.current = true;
          }
        };
      
        script.addEventListener('load', window.onSpotifyWebPlaybackSDKReady);
      
        return () => {
          if (player) {
            // Cleanup function to remove the event listener
            player.removeListener('ready', readyListener);
          }
          script.removeEventListener('load', window.onSpotifyWebPlaybackSDKReady);
        };
      }, [token]);
      

    if (!is_active) {
        return (
        <div className="container">
            <div className="main-wrapper">
            <b>Instance not active. Transfer your playback using your Spotify app</b>
            </div>
        </div>
        );
    } else {
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
    }

    export default WebPlayback;
