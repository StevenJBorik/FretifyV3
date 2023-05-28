const express = require('express');
const request = require('request');
const dotenv = require('dotenv');
const SpotifyWebApi = require('spotify-web-api-node');
const cors = require('cors'); 


const port = 5000;

dotenv.config();

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
app.use(cors()); // Add this line

app.use(express.json());


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

app.get('/audio-analysis/:id', async (req, res) => {
  const { id } = req.params;
  console.log('REEE', access_token);

  try {
    console.log('Before audio analysis request')
    spotifyApi.setAccessToken(access_token);
    console.log('REEE', access_token);

    const response = await spotifyApi.getAudioAnalysisForTrack(id);
    const data = response.body;
    console.log('Response:', response);
    console.log('Data:', data);

    res.json(data);
  } catch (error) {
    console.log('Error retrieving track analysis:', error);
    res.status(500).json({ error: 'Failed to retrieve track analysis' });
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

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
