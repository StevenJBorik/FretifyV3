const express = require('express');
const request = require('request');
const dotenv = require('dotenv');
const SpotifyWebApi = require('spotify-web-api-node');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const cheerio = require('cheerio');

dotenv.config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const spotifyRedirectUri = 'http://localhost:3000/auth/callback';

const spotifyApi = new SpotifyWebApi({
  clientId: spotifyClientId,
  clientSecret: spotifyClientSecret,
  redirectUri: spotifyRedirectUri,
});

let accessToken = '';
let refreshToken = '';

const generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

app.get('/auth/login', (req, res) => {
  var scope = 'streaming user-read-email user-read-private';
  var state = generateRandomString(16);

  var authQueryParameters = new URLSearchParams({
    response_type: 'code',
    client_id: spotifyClientId,
    scope: scope,
    redirect_uri: spotifyRedirectUri,
    state: state,
  });

  res.redirect('https://accounts.spotify.com/authorize/?' + authQueryParameters.toString());
});

app.get('/auth/callback', (req, res) => {
  var code = req.query.code;

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: spotifyRedirectUri,
      grant_type: 'authorization_code',
    },
    headers: {
      Authorization: 'Basic ' + Buffer.from(spotifyClientId + ':' + spotifyClientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    console.log('Response Body:', body);
    if (!error && response.statusCode === 200) {
      accessToken = body.access_token;
      refreshToken = body.refresh_token;
      res.redirect('/'); // Redirect to '/'
    } else {
      res.status(response.statusCode).json(body); // Send the error response as JSON
    }
  });
});

app.get('/auth/token', (req, res) => {
  res.json({ access_token: accessToken, refresh_token: refreshToken });
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
      Authorization: 'Basic ' + Buffer.from(spotifyClientId + ':' + spotifyClientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      accessToken = body.access_token;
      res.json({ access_token: accessToken });
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

app.get('/get-track/:id', async (req, res) => {
  const { id } = req.params;

  try {
    spotifyApi.setAccessToken(accessToken);

    const response = await spotifyApi.getTrack(id);
    const track = response.body;
    const trackName = track.name;
    const artistName = track.artists[0].name;

    const songDataResponse = await axios.get(`http://localhost:5000/songdata/${encodeURIComponent(trackName)}/${encodeURIComponent(artistName)}`);
    const songData = songDataResponse.data;

    res.json(songData);
  } catch (error) {
    console.log('Error retrieving track:', error);
    res.status(500).json({ error: 'Failed to retrieve track' });
  }
});


app.get('/songdata/:song/:artist', async (req, res) => {
  const { song, artist } = req.params;
  const url = `https://www.songdata.io/search?query=${encodeURIComponent(`${song} ${artist}`)}`;

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const songData = {
      track: $('table.tracklist tbody tr td:nth-child(2)').text(),
      artist: $('table.tracklist tbody tr td:nth-child(3)').text(),
      key: $('table.tracklist tbody tr td:nth-child(4)').text(),
      camelot: $('table.tracklist tbody tr td:nth-child(5)').text(),
      bpm: $('table.tracklist tbody tr td:nth-child(6)').text(),
    };
    
    res.json(songData);
  } catch (error) {
    console.log('Error retrieving song data:', error);
    res.status(500).json({ error: 'Failed to retrieve song data' });
  }
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
