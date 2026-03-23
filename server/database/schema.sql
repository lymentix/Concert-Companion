
DROP TABLE IF EXISTS saved_concerts CASCADE;
DROP TABLE IF EXISTS user_artists CASCADE;
DROP TABLE IF EXISTS concerts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- user account information
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    spotify_id VARCHAR(255) UNIQUE,
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    profile_image_url TEXT,
    country VARCHAR(10),
    auth_provider VARCHAR(50) DEFAULT 'spotify',
    spotify_access_token TEXT,
    spotify_refresh_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_has_provider CHECK (spotify_id IS NOT NULL OR google_id IS NOT NULL)
);

-- top artists from Spotify
CREATE TABLE user_artists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    artist_name VARCHAR(255) NOT NULL,
    artist_spotify_id VARCHAR(255) NOT NULL,
    artist_image_url TEXT,
    genres TEXT[], -- Array of genre strings
    popularity INTEGER,
    rank INTEGER, -- User's ranking (1 = top artist)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, artist_spotify_id)
);

-- Concerts/Events from Ticketmaster
CREATE TABLE concerts (
    id SERIAL PRIMARY KEY,
    ticketmaster_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    artist_name VARCHAR(255),
    venue_name VARCHAR(255),
    venue_address TEXT,
    venue_city VARCHAR(100),
    venue_state VARCHAR(50),
    venue_country VARCHAR(50),
    venue_latitude DECIMAL(10, 8),
    venue_longitude DECIMAL(11, 8),
    event_date TIMESTAMP,
    ticket_url TEXT,
    price_min DECIMAL(10, 2),
    price_max DECIMAL(10, 2),
    image_url TEXT,
    genre VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User's saved/favorited concerts
CREATE TABLE saved_concerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    concert_id INTEGER REFERENCES concerts(id) ON DELETE CASCADE,
    notes TEXT,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, concert_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_users_spotify_id ON users(spotify_id);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_artists_user_id ON user_artists(user_id);
CREATE INDEX idx_user_artists_artist_name ON user_artists(artist_name);
CREATE INDEX idx_concerts_artist_name ON concerts(artist_name);
CREATE INDEX idx_concerts_event_date ON concerts(event_date);
CREATE INDEX idx_concerts_venue_city ON concerts(venue_city);
CREATE INDEX idx_saved_concerts_user_id ON saved_concerts(user_id);

-- automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT 'Database schema created successfully!' as message;