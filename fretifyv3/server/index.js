const express = require('express');
const request = require('request');
const dotenv = require('dotenv');
const SpotifyWebApi = require('spotify-web-api-node');
const cors = require('cors'); 
const bodyParser = require('body-parser');
const tf = require('@tensorflow/tfjs');
const port = 5000;


dotenv.config();

const modelPath = './model.h5';

// Load the model
const loadModel = async () => {
  try {
    const model = await tf.loadLayersModel('http://127.0.0.1:5500/server/model.h5');
    console.log('Model loaded successfully');
    return model;
  } catch (error) {
    console.error('Error loading the model:', error);
    process.exit(1);
  }
};
  const startServer = async () => {
    // Load the model
    const model = await loadModel();

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

  let responseSent = false;

  app.get('/audio-analysis/:id', async (req, res) => {
    if (responseSent) {
      return; // If the response has already been sent, don't process the request again
    }

    const { id } = req.params;

    
    try {
      console.log('Before audio analysis request');
      spotifyApi.setAccessToken(access_token);

      const response = await spotifyApi.getAudioAnalysisForTrack(id);
      const { sections } = response.body; // Extract the "sections" property from the response body
      console.log('Sections:', sections);

      //console.log('Re+-*-+ata:', data);
      res.json({ sections })
      // res.json(data);
      responseSent = true; 
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


  app.post('/predict-scale-change', (req, res) => {
    const { trackSections } = req.body;

    // Extract the start values and sort them
    const startValues = trackSections.map(section => section.start);

    // Convert the start values to a tensor
    const startValuesTensor = tf.tensor(startValues).expandDims(1);

    // Reshape the start values tensor
    const max_length = startValues.length;
    const reshapedStartValuesTensor = tf.reshape(startValuesTensor, [startValuesTensor.shape[0], 1, max_length]);

    try {
      // Make predictions using the model
      const predictions = predictScaleChange(model, reshapedStartValuesTensor);

      // Process and send the predictions as the response
      res.json({ predictions });
    } catch (error) {
      console.error('Error predicting scale change:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  function predictScaleChange(model, trackSections) {
    // Reshape the input features
    trackSections = tf.reshape(trackSections, [trackSections.length, 1, trackSections[0].length]);

    // Make predictions
    const predictions = model.predict([trackSections]);

    return predictions;
  }

  app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
  });
}; 

startServer(); 
