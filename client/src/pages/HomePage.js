import spotifyLogo from './Spotify_Primary_Logo_RGB_White.png';
import React, { useState, useEffect } from 'react';
import './HomePage.css';

const HomePage = () => {
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/health');
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
  const CLIENT_ID = 'd88d11f594d146b6a607b0b02f6cf2a3';
  const REDIRECT_URI = 'http://127.0.0.1:3000/callback';
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