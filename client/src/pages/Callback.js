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
      
      // Check if we already have a token
      const existingToken = localStorage.getItem('spotify_access_token');
      if (existingToken) {
        console.log('Token already exists, redirecting...');
        setStatus('Already authenticated! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1000);
        return;
      }
      
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const errorParam = params.get('error');
        
        if (errorParam) {
          setError(`Spotify authorization error: ${errorParam}`);
          return;
        }
        
        if (!code) {
          setError('No authorization code found in callback URL');
          return;
        }

        console.log('Authorization code received:', code);
        setStatus('Exchanging code for access token...');

        // Send code to backend
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/spotify/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to exchange code for token');
        }

        const tokenData = await response.json();
        console.log('✅ Authentication successful!', tokenData);

        // Store tokens and user info
        localStorage.setItem('spotify_access_token', tokenData.access_token);
        localStorage.setItem('spotify_refresh_token', tokenData.refresh_token);
        localStorage.setItem('spotify_user_id', tokenData.user.spotify_id);

        setStatus('Success! Fetching your music data...');
        
        // Redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);

      } catch (error) {
        console.error('❌ Token exchange failed:', error);
        setError(error.message);
        setStatus('Authentication failed');
      }
    };

    exchangeCodeForToken();
  }, [location, navigate]);

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
        <h2 style={{ marginBottom: '1rem', color: '#333' }}>Spotify Authentication</h2>
        
        {!error && (
          <div style={{ margin: '2rem 0' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #1db954',
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
                background: '#1db954',
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