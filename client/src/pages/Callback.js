import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Callback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState(null);
  const hasAttemptedExchange = useRef(false);

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      if (hasAttemptedExchange.current) return;
      hasAttemptedExchange.current = true;

      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorParam = params.get('error');
      const isGoogle = state === 'google';

      // Check if we already have a valid session
      const existingToken = localStorage.getItem('spotify_access_token');
      const existingUserId = localStorage.getItem('user_id');
      if (existingToken || existingUserId) {
        setStatus('Already authenticated! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1000);
        return;
      }

      try {
        if (errorParam) {
          setError(`Authorization error: ${errorParam}`);
          return;
        }

        if (!code) {
          setError('No authorization code found in callback URL');
          return;
        }

        if (isGoogle) {
          // ── Google OAuth flow ──────────────────────────────────────────
          setStatus('Signing in with Google...');

          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/google/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to complete Google sign-in');
          }

          const data = await response.json();
          console.log('✅ Google authentication successful!', data);

          localStorage.setItem('user_id', String(data.user.id));
          localStorage.setItem('auth_provider', 'google');

          setStatus('Success! Loading your dashboard...');
          setTimeout(() => navigate('/dashboard'), 1500);

        } else {
          // ── Spotify OAuth flow ─────────────────────────────────────────
          setStatus('Exchanging code for access token...');

          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/spotify/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to exchange code for token');
          }

          const tokenData = await response.json();
          console.log('✅ Spotify authentication successful!', tokenData);

          localStorage.setItem('spotify_access_token', tokenData.access_token);
          localStorage.setItem('spotify_refresh_token', tokenData.refresh_token);
          localStorage.setItem('spotify_user_id', tokenData.user.spotify_id);
          localStorage.setItem('auth_provider', 'spotify');

          setStatus('Success! Fetching your music data...');
          setTimeout(() => navigate('/dashboard'), 1500);
        }

      } catch (err) {
        console.error('❌ Token exchange failed:', err);
        setError(err.message);
        setStatus('Authentication failed');
      }
    };

    exchangeCodeForToken();
  }, [location, navigate]);

  const isGoogle = new URLSearchParams(location.search).get('state') === 'google';
  const accentColor = isGoogle ? '#4285F4' : '#1db954';
  const providerLabel = isGoogle ? 'Google' : 'Spotify';

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(-45deg, #0f3443, #34e89e, #1db954, #0a2f3a, #2dd4aa)',
      backgroundSize: '400% 400%',
      animation: 'gradientFlow 15s ease infinite',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '3rem',
        borderRadius: '12px',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: '#333' }}>{providerLabel} Authentication</h2>
        
        {!error && (
          <div style={{ margin: '2rem 0' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f3f3f3',
              borderTop: `4px solid ${accentColor}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
        )}
        
        <p style={{ color: '#666', fontSize: '1.1rem' }}>{status}</p>
        
        {error && (
          <div style={{ 
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#fee',
            borderRadius: '8px',
            border: '1px solid #fcc'
          }}>
            <p style={{ color: '#c33', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
              Error
            </p>
            <p style={{ color: '#c33', margin: 0 }}>{error}</p>
            <button 
              onClick={() => navigate('/')} 
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: accentColor,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Return to Home
            </button>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default Callback;