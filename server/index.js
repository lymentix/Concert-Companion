require('dotenv').config({ path: './server/.env' });
console.log('Starting Concert Companion Server...');

const spotifyService = require('./services/spotifyService');
const ticketmasterService = require('./services/ticketmasterService');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');

const { pool, query } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5001;


app.use(helmet()); 
app.use(morgan('dev')); 

// CORS configuration for production and development
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3000'
];

// Add production frontend URL if in production
if (process.env.NODE_ENV === 'production' && process.env.VERCEL_URL) {
  allowedOrigins.push(process.env.VERCEL_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  res.json({
    message: 'Concert Companion API is running!',
    version: '1.0.0',
    database: 'Connected',
    endpoints: {
      health: '/api/health',
      users: '/api/users',
      'test-db': '/api/test-db'
    }
  });
});


app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected'
  });
});


app.get('/api/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    

    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    

    const usersResult = await query('SELECT COUNT(*) as user_count FROM users');
    
    res.json({
      message: 'Database test successful!',
      database_time: result.rows[0].current_time,
      postgresql_version: result.rows[0].pg_version,
      total_users: parseInt(usersResult.rows[0].user_count),
      status: 'Connected'
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      error: 'Database test failed',
      message: error.message,
      status: 'Error'
    });
  }
});

// Get all users endpoint
app.get('/api/users', async (req, res) => {
  try {
    console.log('Fetching all users...');
    
    const result = await query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC');
    
    res.json({
      message: 'Users retrieved successfully',
      count: result.rows.length,
      users: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});


app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    

    if (!name || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'email']
      });
    }
    
    console.log(`Creating new user: ${name} (${email})`);
    
    const result = await query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at',
      [name, email]
    );
    
    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating user:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'A user with this email already exists'
      });
    }
    
    res.status(500).json({
      error: 'Failed to create user',
      message: error.message
    });
  }
});

app.post('/api/spotify/token', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        error: 'Missing authorization code'
      });
    }

    console.log('Exchanging Spotify authorization code...');

    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
    const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

    if (!CLIENT_SECRET) {
      return res.status(500).json({
        error: 'Spotify Client Secret not configured'
      });
    }

    const data = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    // Exchange code for tokens
    const tokenResponse = await axios.post(tokenUrl, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    console.log('Got access token, now fetching user data...');

    // Use the Spotify service to complete authentication
    const { user, topArtists } = await spotifyService.completeSpotifyAuth(
      access_token,
      refresh_token,
      expires_in
    );

    console.log('User authenticated and data saved!');

    // Return tokens and user info
    res.json({
      access_token,
      refresh_token,
      expires_in,
      user: {
        id: user.id,
        spotify_id: user.spotify_id,
        display_name: user.display_name,
        email: user.email,
        profile_image_url: user.profile_image_url
      },
      top_artists_count: topArtists.length
    });

  } catch (error) {
    console.error('Spotify token exchange failed:', error.response?.data || error.message);
    
    res.status(500).json({
      error: 'Failed to complete Spotify authentication',
      message: error.message
    });
  }
});

app.get('/api/user/profile/:spotifyId', async (req, res) => {
  try {
    const { spotifyId } = req.params;
    
    // Get user from database
    const user = await spotifyService.getUserBySpotifyId(spotifyId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Get user's top artists
    const artists = await spotifyService.getUserArtistsFromDB(user.id);
    
    res.json({
      user: {
        id: user.id,
        spotify_id: user.spotify_id,
        display_name: user.display_name,
        email: user.email,
        profile_image_url: user.profile_image_url,
        country: user.country
      },
      top_artists: artists
    });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile',
      message: error.message
    });
  }
});

app.post('/api/user/refresh-artists', async (req, res) => {
  try {
    const { spotifyId } = req.body;
    
    if (!spotifyId) {
      return res.status(400).json({
        error: 'Missing spotify_id'
      });
    }
    
    // Get user from database
    const user = await spotifyService.getUserBySpotifyId(spotifyId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Check if token is still valid
    if (new Date(user.token_expires_at) < new Date()) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please log in again'
      });
    }
    
    // Fetch fresh data from Spotify
    const topArtists = await spotifyService.getUserTopArtists(user.spotify_access_token);
    await spotifyService.saveUserArtists(user.id, topArtists);
    
    res.json({
      message: 'Top artists refreshed successfully',
      artists_count: topArtists.length
    });
    
  } catch (error) {
    console.error('Error refreshing artists:', error);
    res.status(500).json({
      error: 'Failed to refresh artists',
      message: error.message
    });
  }
});

app.get('/api/concerts/top-artists/:spotifyId', async (req, res) => {
  const { spotifyId } = req.params;
  const eventsPerArtist = Math.min(parseInt(req.query.limit, 10) || 3, 10);
  const artistLimit = Math.min(parseInt(req.query.artists, 10) || 5, 20);
  const explicitCountryCode = req.query.countryCode;

  try {
    const user = await spotifyService.getUserBySpotifyId(spotifyId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const artists = await spotifyService.getUserArtistsFromDB(user.id);

    if (!artists.length) {
      return res.json({
        generatedAt: new Date().toISOString(),
        artistCount: 0,
        results: [],
      });
    }

    const selectedArtists = artists.slice(0, artistLimit);
    const countryCode = explicitCountryCode || (user.country ? user.country.toUpperCase() : undefined);

    const results = await Promise.all(
      selectedArtists.map(async (artist) => {
        const artistSummary = {
          id: artist.id,
          name: artist.artist_name,
          spotifyId: artist.artist_spotify_id,
          rank: artist.rank,
          imageUrl: artist.artist_image_url,
        };

        try {
          const events = await ticketmasterService.getEventsForArtist(artist.artist_name, {
            size: eventsPerArtist,
            countryCode,
          });

          return {
            artist: artistSummary,
            events,
          };
        } catch (error) {
          console.error(`Failed to fetch concerts for ${artist.artist_name}:`, error.message);
          return {
            artist: artistSummary,
            events: [],
            error: error.message,
          };
        }
      })
    );

    const totalEvents = results.reduce((sum, item) => sum + item.events.length, 0);

    res.json({
      generatedAt: new Date().toISOString(),
      artistCount: selectedArtists.length,
      totalEvents,
      countryCode: countryCode || null,
      results,
    });
  } catch (error) {
    console.error('Error fetching concerts for top artists:', error);
    res.status(500).json({
      error: 'Failed to fetch concerts for top artists',
      message: error.message,
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  
  res.status(err.status || 500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});


app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/test-db',
      'GET /api/users',
      'POST /api/users',
      'POST /api/spotify/token'
    ]
  });
});


app.listen(PORT, () => {
  console.log('Concert Companion Server is running!');
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_NAME || 'concert_companion'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /              - API info');
  console.log('  GET  /api/health    - Health check');
  console.log('  GET  /api/test-db   - Database test');
  console.log('  GET  /api/users     - List all users');
  console.log('  POST /api/users     - Create new user');
  console.log('  POST /api/spotify/token - Exchange Spotify code for token');
  console.log('  GET /api/user/profile/:spotifyId - Get user profile and artist');
  console.log('  POST /api/user/refresh-artists  - refresh user\'s top artists');
  console.log('');
  console.log('🔍 Test with: curl http://localhost:' + PORT + '/api/test-db');
});


process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
