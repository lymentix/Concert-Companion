// client/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [topArtists, setTopArtists] = useState([]);
  const [error, setError] = useState(null);
  const [concertGroups, setConcertGroups] = useState([]);
  const [concertsLoading, setConcertsLoading] = useState(false);
  const [concertsError, setConcertsError] = useState(null);
  const [concertMeta, setConcertMeta] = useState(null);

  const formatEventDate = (dateString) => {
    if (!dateString) {
      return 'Date TBA';
    }

    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return dateString;
    }

    return parsed.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatEventLocation = (venue) => {
    if (!venue) {
      return 'Location TBA';
    }

    const parts = [venue.city, venue.state, venue.country].filter(Boolean);

    if (parts.length) {
      return parts.join(', ');
    }

    if (venue.address) {
      return venue.address;
    }

    return 'Location TBA';
  };

  const formatPriceRange = (price) => {
    if (!price || (!price.min && !price.max)) {
      return 'Price info coming soon';
    }

    const currencyCode = (price.currency || 'USD').toUpperCase();
    let formatter;

    try {
      formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0
      });
    } catch (formatError) {
      formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      });
    }

    const hasMin = typeof price.min === 'number';
    const hasMax = typeof price.max === 'number';

    if (hasMin && hasMax) {
      return `${formatter.format(price.min)} – ${formatter.format(price.max)}`;
    }

    if (hasMin) {
      return `From ${formatter.format(price.min)}`;
    }

    return `Up to ${formatter.format(price.max)}`;
  };

  const fetchConcertsForUser = async (spotifyIdParam) => {
    if (!spotifyIdParam) {
      setConcertGroups([]);
      setConcertMeta(null);
      return;
    }

    try {
      setConcertsLoading(true);
      setConcertsError(null);
      setConcertGroups([]);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/concerts/top-artists/${spotifyIdParam}`);

      if (!response.ok) {
        throw new Error('Failed to fetch concerts');
      }

      const data = await response.json();

      setConcertGroups(data.results || []);
      setConcertMeta({
        generatedAt: data.generatedAt,
        countryCode: data.countryCode,
        totalEvents: data.totalEvents,
        artistCount: data.artistCount
      });
    } catch (error) {
      console.error('Error fetching concerts:', error);
      setConcertsError(error.message);
      setConcertGroups([]);
      setConcertMeta(null);
    } finally {
      setConcertsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Get stored user data from localStorage
      const spotifyId = localStorage.getItem('spotify_user_id');
      
      if (!spotifyId) {
        // Not logged in, redirect to home
        setConcertGroups([]);
        setConcertMeta(null);
        setConcertsLoading(false);
        navigate('/');
        return;
      }

      console.log('Fetching user profile for:', spotifyId);

      // Fetch user profile and top artists from backend
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/profile/${spotifyId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      console.log('User data received:', data);

      setUser(data.user);
      setTopArtists(data.top_artists);
      setConcertsError(null);

      if (Array.isArray(data.top_artists) && data.top_artists.length > 0) {
        fetchConcertsForUser(spotifyId);
      } else {
        setConcertGroups([]);
        setConcertMeta(null);
      }

      setLoading(false);

    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error.message);
      setConcertsLoading(false);
      setConcertGroups([]);
      setConcertMeta(null);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_user_id');
    navigate('/');
  };

  const handleRefreshArtists = async () => {
    try {
      setLoading(true);
      const spotifyId = localStorage.getItem('spotify_user_id');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/refresh-artists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spotifyId })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh artists');
      }

      // Reload the data
      await fetchUserData();
    } catch (error) {
      console.error('Error refreshing artists:', error);
      alert('Failed to refresh artists. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your music taste...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-container">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <h1>Concert Companion</h1>
          <button onClick={handleLogout} className="btn btn-logout">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="container">
          {/* User Profile Section */}
          <section className="profile-section">
            <div className="profile-card">
              {user.profile_image_url && (
                <img 
                  src={user.profile_image_url} 
                  alt={user.display_name}
                  className="profile-image"
                />
              )}
              <div className="profile-info">
                <h2>Welcome back, {user.display_name}!</h2>
                <p className="profile-email">{user.email}</p>
                {user.country && (
                  <p className="profile-country">📍 {user.country}</p>
                )}
              </div>
            </div>
          </section>

          {/* Top Artists Section */}
          <section className="artists-section">
            <div className="section-header">
              <h2>Your Top Artists</h2>
              <button 
                onClick={handleRefreshArtists} 
                className="btn btn-secondary"
                disabled={loading}
              >
                🔄 Refresh
              </button>
            </div>

            {topArtists.length === 0 ? (
              <p className="no-artists">No artists found. Listen to more music on Spotify!</p>
            ) : (
              <div className="artists-grid">
                {topArtists.map((artist, index) => (
                  <div key={artist.id} className="artist-card">
                    <div className="artist-rank">#{artist.rank}</div>
                    {artist.artist_image_url && (
                      <img 
                        src={artist.artist_image_url} 
                        alt={artist.artist_name}
                        className="artist-image"
                      />
                    )}
                    <div className="artist-info">
                      <h3 className="artist-name">{artist.artist_name}</h3>
                      {artist.genres && artist.genres.length > 0 && (
                        <div className="artist-genres">
                          {artist.genres.slice(0, 2).map((genre, i) => (
                            <span key={i} className="genre-tag">{genre}</span>
                          ))}
                        </div>
                      )}
                      <div className="artist-popularity">
                        <span className="popularity-label">Popularity:</span>
                        <div className="popularity-bar">
                          <div 
                            className="popularity-fill" 
                            style={{ width: `${artist.popularity}%` }}
                          ></div>
                        </div>
                        <span className="popularity-value">{artist.popularity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Concerts Section */}
          <section className="concerts-section">
            <div className="section-header concerts-header">
              <h2>Upcoming Concerts</h2>
              {concertMeta?.countryCode && (
                <span className="concerts-meta">
                  Showing events in {concertMeta.countryCode}
                </span>
              )}
            </div>

            {concertsLoading && (
              <div className="concerts-state">
                <div className="spinner small"></div>
                <p>Scanning Ticketmaster for your favorite artists...</p>
              </div>
            )}

            {concertsError && !concertsLoading && (
              <div className="concerts-state error">
                <p>Could not load concerts: {concertsError}</p>
              </div>
            )}

            {!concertsLoading && !concertsError && concertGroups.length === 0 && (
              <div className="concerts-state empty">
                <p>No upcoming concerts found for your top artists. Check back soon!</p>
              </div>
            )}

            {!concertsLoading && !concertsError && concertGroups.length > 0 && (
              <div className="concerts-groups">
                {concertGroups.map((group) => (
                  <div
                    key={group.artist.spotifyId || group.artist.id}
                    className="concert-group-card"
                  >
                    <div className="concert-group-header">
                      {group.artist.imageUrl && (
                        <img
                          src={group.artist.imageUrl}
                          alt={group.artist.name}
                          className="concert-artist-image"
                        />
                      )}
                      <div className="concert-group-info">
                        <h3>{group.artist.name}</h3>
                        {group.artist.rank && (
                          <p>Top Artist #{group.artist.rank}</p>
                        )}
                      </div>
                    </div>

                    {group.events.length === 0 ? (
                      <div className="concerts-state artist-empty">
                        <p>No upcoming shows found on Ticketmaster.</p>
                      </div>
                    ) : (
                      <ul className="concert-events-list">
                        {group.events.map((event) => (
                          <li key={event.id} className="concert-event-card">
                            {event.imageUrl && (
                              <div className="concert-event-image">
                                <img src={event.imageUrl} alt={event.name} />
                              </div>
                            )}
                            <div className="concert-event-details">
                              <h4>{event.name}</h4>
                              <div className="event-meta">
                                <span>{formatEventDate(event.date)}</span>
                                <span>{formatEventLocation(event.venue)}</span>
                              </div>
                              <p className="event-price">{formatPriceRange(event.price)}</p>
                              <a
                                href={event.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary btn-small"
                              >
                                View Tickets
                              </a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Next Steps Section */}
          <section className="next-steps">
            <div className="next-steps-card">
              <h2>What's Next?</h2>
              <p>Soon you'll be able to:</p>
              <ul>
                <li>🎫 Find concerts for your favorite artists</li>
                <li>📍 Search by location and distance</li>
                <li>🗺️ Get hotel and restaurant recommendations</li>
                <li>💾 Save and track your concert plans</li>
              </ul>
              <p className="coming-soon">Coming soon...</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
