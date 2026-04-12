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

  const [savedConcerts, setSavedConcerts] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);

  const [searchCity, setSearchCity] = useState('');
  const [searchGenre, setSearchGenre] = useState('');
  const [searchArtist, setSearchArtist] = useState('');

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

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const getUberLink = (venue, eventName) => {
    const parts = [venue?.address, venue?.city, venue?.state, venue?.country].filter(Boolean);
    const address = parts.join(', ');

    const params = new URLSearchParams({
      action: 'setPickup',
      pickup: 'my_location',
      'dropoff[formatted_address]': address,
      'dropoff[nickname]': eventName || 'Concert Venue',
    });

    if (venue?.latitude && venue?.longitude) {
      params.set('dropoff[latitude]', venue.latitude);
      params.set('dropoff[longitude]', venue.longitude);
    }

    return `https://m.uber.com/ul/?${params.toString()}`;
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

      const appToken = localStorage.getItem('app_token');
      const response = await fetch(`http://localhost:5001/api/concerts/top-artists/${spotifyIdParam}`, {
        headers: { 'Authorization': `Bearer ${appToken}` },
      });

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

  const fetchSavedConcerts = async () => {
    try {
      const appToken = localStorage.getItem('app_token');
      const response = await fetch('http://localhost:5001/api/concerts/saved', {
        headers: { 'Authorization': `Bearer ${appToken}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setSavedConcerts(data.events || []);
      setSavedIds(new Set((data.events || []).map((e) => e.id)));
    } catch (err) {
      console.error('Error fetching saved concerts:', err);
    }
  };

  const handleSaveConcert = async (event, artistName) => {
    const appToken = localStorage.getItem('app_token');
    setSavingId(event.id);

    try {
      if (savedIds.has(event.id)) {
        await fetch(`http://localhost:5001/api/concerts/save/${event.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${appToken}` },
        });
      } else {
        await fetch('http://localhost:5001/api/concerts/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${appToken}`,
          },
          body: JSON.stringify({ event: { ...event, artistName } }),
        });
      }
      await fetchSavedConcerts();
    } catch (err) {
      console.error('Error toggling saved concert:', err);
    } finally {
      setSavingId(null);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchSavedConcerts();
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
      const appToken = localStorage.getItem('app_token');
      const response = await fetch(`http://localhost:5001/api/user/profile/${spotifyId}`, {
        headers: { 'Authorization': `Bearer ${appToken}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/');
          return;
        }
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchCity.trim() && !searchGenre.trim() && !searchArtist.trim()) return;
    const params = new URLSearchParams();
    if (searchCity.trim()) params.append('city', searchCity.trim());
    if (searchGenre.trim()) params.append('genre', searchGenre.trim());
    if (searchArtist.trim()) params.append('artist', searchArtist.trim());
    navigate(`/search?${params}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_user_id');
    localStorage.removeItem('app_token');
    navigate('/');
  };

  const handleRefreshArtists = async () => {
    try {
      setLoading(true);
      const spotifyId = localStorage.getItem('spotify_user_id');

      const appToken = localStorage.getItem('app_token');
      const response = await fetch('http://localhost:5001/api/user/refresh-artists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appToken}`,
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
          <h1>Concert <span>Companion</span></h1>
          <form className="header-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="header-search-input"
              placeholder="City"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
            />
            <input
              type="text"
              className="header-search-input"
              placeholder="Genre"
              value={searchGenre}
              onChange={(e) => setSearchGenre(e.target.value)}
            />
            <input
              type="text"
              className="header-search-input"
              placeholder="Artist"
              value={searchArtist}
              onChange={(e) => setSearchArtist(e.target.value)}
            />
            <button
              type="submit"
              className="header-search-btn"
              disabled={!searchCity.trim() && !searchGenre.trim() && !searchArtist.trim()}
            >
              Search
            </button>
          </form>
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
                              <div className="event-actions">
                                <a
                                  href={event.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-primary btn-small"
                                >
                                  View Tickets
                                </a>
                                <button
                                  className={`btn btn-small ${savedIds.has(event.id) ? 'btn-saved' : 'btn-save'}`}
                                  onClick={() => handleSaveConcert(event, group.artist.name)}
                                  disabled={savingId === event.id}
                                >
                                  {savedIds.has(event.id) ? '✓ Saved' : '💾 Save'}
                                </button>
                                {event.venue && isMobile && (
                                  <a
                                    href={getUberLink(event.venue, event.name)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-uber btn-small"
                                  >
                                    🚗 Get a Ride
                                  </a>
                                )}
                              </div>
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

          {/* Saved Concerts Section */}
          {savedConcerts.length > 0 && (
            <section className="saved-section">
              <div className="section-header">
                <h2>Your Concert Plans</h2>
                <span className="saved-count">{savedConcerts.length} saved</span>
              </div>

              <ul className="saved-list">
                {savedConcerts.map((event) => (
                  <li key={event.id} className="saved-event-card">
                    {event.imageUrl && (
                      <div className="saved-event-image">
                        <img src={event.imageUrl} alt={event.name} />
                      </div>
                    )}
                    <div className="saved-event-details">
                      <h4>{event.name}</h4>
                      {event.artistName && (
                        <p className="saved-artist-name">{event.artistName}</p>
                      )}
                      <div className="event-meta">
                        <span>{formatEventDate(event.date)}</span>
                        <span>{formatEventLocation(event.venue)}</span>
                      </div>
                      <p className="event-price">{formatPriceRange(event.price)}</p>
                      <div className="event-actions">
                        {event.url && (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary btn-small"
                          >
                            View Tickets
                          </a>
                        )}
                        {event.venue && isMobile && (
                          <a
                            href={getUberLink(event.venue, event.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-uber btn-small"
                          >
                            🚗 Get a Ride
                          </a>
                        )}
                        <button
                          className="btn btn-small btn-remove"
                          onClick={() => handleSaveConcert(event)}
                          disabled={savingId === event.id}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Next Steps Section */}
          <section className="next-steps">
            <div className="next-steps-card">
              <h2>What's Next?</h2>
              <p>Coming soon:</p>
              <ul>
                <li>🗺️ Hotel and restaurant recommendations near venues</li>
              </ul>
              <p className="coming-soon">Stay tuned...</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
