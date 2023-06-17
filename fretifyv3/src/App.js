import React, { useState, useEffect } from 'react';
import WebPlayback from './Webplayback';
import Login from './Login';
import './App.css';

function App() {
  const [token, setToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [expiresInMilliseconds, setExpiresInMilliseconds] = useState(0);
  const [isDOMLoaded, setDOMLoaded] = useState(false); // New state to track DOM load status

  const refreshAccessToken = async () => {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const json = await response.json();
    setToken(json.access_token);
    setExpiresInMilliseconds(json.expires_in * 1000); // Convert seconds to milliseconds
  };

  useEffect(() => {
    async function getToken() {
      const response = await fetch('/auth/token');
      const json = await response.json();
      setToken(json.access_token);
      setRefreshToken(json.refresh_token);
      setExpiresInMilliseconds(json.expires_in * 1000); // Convert seconds to milliseconds
      setDOMLoaded(true); // Mark DOM as loaded
    }

    getToken();
  }, []);

  useEffect(() => {
    if (!isDOMLoaded) return; // Check if DOM is loaded before manipulating it

    const expirationTimeout = setTimeout(refreshAccessToken, expiresInMilliseconds);

    return () => clearTimeout(expirationTimeout);
  }, [refreshToken, expiresInMilliseconds, isDOMLoaded]); // Include isDOMLoaded as a dependency

  return (
    <>
      {isDOMLoaded && (token === '' ? <Login /> : <WebPlayback token={token} />)}
    </>
  );
}

export default App;
