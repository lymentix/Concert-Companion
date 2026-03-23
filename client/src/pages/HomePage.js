import spotifyLogo from './Spotify_Primary_Logo_RGB_White.png';
import React, { useState, useEffect } from 'react';
import './HomePage.css';

const HomePage = () => {
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/health`);
      if (response.ok) {
        console.log('Backend connected successfully');
      } else {
        console.warn('Backend responded with error:', response.status);
      }
    } catch (error) {
      console.error('Backend connection failed:', error.message);
    }
  };

  // Spotify Auth details
  const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
  const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI;
  const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
  const SCOPES = [
    'user-top-read',
    'user-read-email',
    'user-read-private'
  ];

  const handleSpotifyLogin = () => {
    const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES.join(' '))}&show_dialog=true`;
    window.location.href = authUrl;
  };

  const handleGoogleLogin = () => {
    const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const authUrl = [
      'https://accounts.google.com/o/oauth2/v2/auth',
      `?client_id=${GOOGLE_CLIENT_ID}`,
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
      '&response_type=code',
      `&scope=${encodeURIComponent('openid email profile')}`,
      '&state=google',
      '&access_type=offline',
      '&prompt=select_account',
    ].join('');
    window.location.href = authUrl;
  };

  return (
    <div className="homepage">
      <header className="header">
        <div className="container">
          <h1>Concert Companion</h1>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <section className="hero">
            <h1>Find Concerts Based on Your Music Taste</h1>
            <p>Connect your Spotify account to discover concerts you'll love</p>
          </section>

          <section id="connect" className="connect-section">
            <div className="connect-card">
              <h2>Connect Your Spotify</h2>
              <p>We'll analyze your music taste to recommend concerts</p>
              <button className="btn btn-spotify" onClick={handleSpotifyLogin}>
                <img src={spotifyLogo} alt="Spotify" className="spotify-logo"
                  style={{
                    width: '25px',
                    height: '25px',
                    objectFit: 'contain'
                  }}
                />
                Connect Spotify Account
              </button>

              <div className="auth-divider">
                <span>or sign in with</span>
              </div>

              <button className="btn btn-google" onClick={handleGoogleLogin}>
                <svg className="google-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                Continue with Google
              </button>

              <div className="features-list">
                <div className="feature">✓ Analyze your top artists</div>
                <div className="feature">✓ Find nearby concerts</div>
                <div className="feature">✓ Get travel recommendations</div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>Concert Companion - Built by Landon, Addan, and Rose</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;