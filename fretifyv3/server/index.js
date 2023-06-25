const axios = require('axios'); 
const cheerio = require('cheerio');
const express = require('express');
const request = require('request');
const dotenv = require('dotenv');
const SpotifyWebApi = require('spotify-web-api-node');
const cors = require('cors');
const bodyParser = require('body-parser');
const port = 5000;

dotenv.config();

const startServer = async () => {
  var spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
  var spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  var spotify_redirect_uri = 'http://localhost:3000/auth/callback';

  const spotifyApi = new SpotifyWebApi({
    clientId: spotify_client_id,
    clientSecret: spotify_client_secret,
    redirectUri: spotify_redirect_uri
  });

  var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(bodyParser.json());

  let access_token = '';
  let refresh_token = '';

  app.get('/auth/login', (req, res) => {
    var scope = 'streaming user-read-email user-read-private';
    var state = generateRandomString(16);

    var auth_query_parameters = new URLSearchParams({
      response_type: 'code',
      client_id: spotify_client_id,
      scope: scope,
      redirect_uri: spotify_redirect_uri,
      state: state,
    });

    res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
  });

  app.get('/auth/callback', (req, res) => {
    var code = req.query.code;

    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: spotify_redirect_uri,
        grant_type: 'authorization_code',
      },
      headers: {
        Authorization: 'Basic ' + Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      console.log('Response Body:', body); // Add this line
      if (!error && response.statusCode === 200) {
        access_token = body.access_token;
        refresh_token = body.refresh_token;
        res.redirect('/'); // Redirect to '/'
      } else {
        res.status(response.statusCode).json(body); // Send the error response as JSON
      }
    });
  });

  app.get('/auth/token', (req, res) => {
    res.json({ access_token: access_token, refresh_token: refresh_token });
  });

  let currentTimestamp = 0; // Initialize currentTimestamp variable
  let sections = []; // Declare sections array

  app.get('/audio-analysis/:id', async (req, res) => {
    const { id } = req.params;

    try {
      console.log('Before audio analysis request');
      spotifyApi.setAccessToken(access_token);

      const response = await spotifyApi.getAudioAnalysisForTrack(id);
      sections = response.body.sections; // Assign the value to the sections array
      console.log('Sections:', sections);

      // Get the current timestamp of the playing track
      const playerState = await spotifyApi.getMyCurrentPlaybackState();
      if (playerState.body && playerState.body.progress_ms) {
        currentTimestamp = playerState.body.progress_ms / 1000; // Convert progress in milliseconds to seconds
      }

      // Send the current timestamp and sections in the response
      res.json({ sections, currentTimestamp });
    } catch (error) {
      console.log('Error retrieving track analysis:', error);
      res.status(500).json({ error: 'Failed to retrieve track analysis' });
    }
  });

  app.get('/tracks/:id', async (req, res) => {
    const { id } = req.params;
    spotifyApi.setAccessToken(access_token);
  
    try {
      console.log('Before track data request');
      const response = await spotifyApi.getTrack(id);
      const trackDataArtist = response.body.artists[0].name;
      console.log('Artist name:', trackDataArtist);
      const trackDataName = response.body.name;
      console.log('Track name:', trackDataName);
  
      res.json({ artist: trackDataArtist, name: trackDataName });
    } catch (error) {
      console.log('Error retrieving track data details:', error);
      res.status(500).json({ error: 'Failed to retrieve track data details' });
    }
  });
  

  app.post('/auth/refresh', (req, res) => {
    const { refresh_token } = req.body;

    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      },
      headers: {
        Authorization: 'Basic ' + Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        access_token = body.access_token;
        res.json({ access_token: access_token });
      }
    });
  });

  app.get('/player-state', async (req, res) => {
    try {
      const playerState = await spotifyApi.getMyCurrentPlaybackState();
      res.json(playerState.body);
    } catch (error) {
      console.log('Error retrieving player state:', error);
      res.status(500).json({ error: 'Failed to retrieve player state' });
    }
  });

  app.get('/songdata/:song/:artist', async (req, res) => {
  const { song, artist } = req.params;
  const url = `https://www.songdata.io/search?query=${encodeURIComponent(`${song} ${artist}`)}`;

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const key = $('tbody#table_body tr.table_object:first-child td.table_key').text();

    if (key) {
      console.log('Key:', key);
      res.json({ key });
    } else {
      console.log('Key element not found on songdata.io');
      res.status(500).json({ error: 'Failed to retrieve key from songdata.io' });
    }
  } catch (error) {
    console.log('Error retrieving song data:', error);
    res.status(500).json({ error: 'Failed to retrieve song data' });
  }
  });


  app.post('/predict-scale-change', async (req, res) => {
    const { currentTimestamp } = req.body;
  
    try {
      await analyzeTrackAndCheckTimestamp(currentTimestamp);
      console.log('Server - Current Timestamp:', currentTimestamp);
      console.log('Server - Start Values:', sections.map((section) => section.start));
      
      const hasMatch = checkTimeStamp(currentTimestamp);
      const hasConsecutiveMatch = hasMatch && previousMatch;
      previousMatch = hasMatch;
  
      res.json({ hasMatch, hasConsecutiveMatch });
    } catch (error) {
      console.error('Error checking timestamp:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

  async function analyzeTrackAndCheckTimestamp(currentTimestamp) {
    if (sections.length === 0) {
      // If sections array is empty, analyze the track and retrieve sections
      console.log('Analyzing track...');
      const playerState = await spotifyApi.getMyCurrentPlaybackState();
      if (playerState.body && playerState.body.item && playerState.body.item.id) {
        const trackId = playerState.body.item.id;
        const response = await spotifyApi.getAudioAnalysisForTrack(trackId);
        sections = response.body.sections;
        console.log('Sections:', sections);
      }
    }
  }

  let previousMatch = false; // Flag to track previous match

  function checkTimeStamp(currentTimestamp) {
    console.log('Start Values:', sections.map((section) => section.start)); // Log the start values in the sections array

    const matchingSection = sections.find((section) => Math.abs(section.start - currentTimestamp) < 1);

    const hasMatch = matchingSection !== undefined;
    const result = hasMatch && !previousMatch;

    previousMatch = hasMatch;

    return result;
  }

  

  app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
  });
};

startServer();