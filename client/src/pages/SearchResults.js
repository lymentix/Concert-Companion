import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './SearchResults.css';

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [city, setCity] = useState(searchParams.get('city') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    const c = searchParams.get('city');
    const g = searchParams.get('genre');
    if (c || g) {
      fetchResults(c || '', g || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchResults = async (c, g) => {
    if (!c && !g) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const params = new URLSearchParams();
      if (c) params.append('city', c);
      if (g) params.append('genre', g);

      const response = await fetch(`http://localhost:5001/api/concerts/search?${params}`);
      if (!response.ok) throw new Error('Search failed. Please try again.');

      const data = await response.json();
      setResults(data.events || []);
      setMeta({ city: data.city, genre: data.genre, total: data.total });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!city.trim() && !genre.trim()) return;

    const params = {};
    if (city.trim()) params.city = city.trim();
    if (genre.trim()) params.genre = genre.trim();
    setSearchParams(params);
    fetchResults(city.trim(), genre.trim());
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return 'Date TBA';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return dateString;
    return parsed.toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  const formatEventLocation = (venue) => {
    if (!venue) return 'Location TBA';
    const parts = [venue.city, venue.state, venue.country].filter(Boolean);
    if (parts.length) return parts.join(', ');
    if (venue.address) return venue.address;
    return 'Location TBA';
  };

  const formatPriceRange = (price) => {
    if (!price || (!price.min && !price.max)) return null;
    const currencyCode = (price.currency || 'USD').toUpperCase();
    let formatter;
    try {
      formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, minimumFractionDigits: 0 });
    } catch {
      formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
    }
    if (price.min && price.max) return `${formatter.format(price.min)} – ${formatter.format(price.max)}`;
    if (price.min) return `From ${formatter.format(price.min)}`;
    return `Up to ${formatter.format(price.max)}`;
  };

  const getUberLink = (venue, eventName) => {
    const parts = [venue?.address, venue?.city, venue?.state, venue?.country].filter(Boolean);
    const address = parts.join(', ');
    return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(address)}&dropoff[nickname]=${encodeURIComponent(eventName || 'Concert Venue')}`;
  };

  const buildHeading = () => {
    if (!meta) return 'Search Results';
    const parts = [];
    if (meta.genre) parts.push(meta.genre);
    if (meta.city) parts.push(`in ${meta.city}`);
    return parts.length ? `${parts.join(' ')} concerts` : 'Search Results';
  };

  return (
    <div className="sr-page">
      <header className="sr-header">
        <div className="sr-header-inner">
          <button className="sr-back-btn" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <h1 className="sr-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            Concert <span>Companion</span>
          </h1>
          <form className="sr-header-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="sr-input"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <input
              type="text"
              className="sr-input"
              placeholder="Genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            />
            <button
              type="submit"
              className="sr-search-btn"
              disabled={loading || (!city.trim() && !genre.trim())}
            >
              Search
            </button>
          </form>
        </div>
      </header>

      <main className="sr-main">
        <div className="sr-container">

          {loading && (
            <div className="sr-state">
              <div className="sr-spinner"></div>
              <p>Searching Ticketmaster...</p>
            </div>
          )}

          {error && !loading && (
            <div className="sr-state sr-state--error">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && results.length === 0 && meta && (
            <div className="sr-state">
              <p>No concerts found. Try a different city or genre.</p>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <>
              <div className="sr-results-header">
                <h2 className="sr-results-heading">{buildHeading()}</h2>
                <span className="sr-results-count">{results.length} results</span>
              </div>

              <ul className="sr-results-list">
                {results.map((event) => (
                  <li key={event.id} className="sr-event-card">
                    {event.imageUrl && (
                      <div className="sr-event-image">
                        <img src={event.imageUrl} alt={event.name} />
                      </div>
                    )}
                    <div className="sr-event-details">
                      <h3 className="sr-event-name">{event.name}</h3>
                      <div className="sr-event-meta">
                        <span>{formatEventDate(event.date)}</span>
                        {event.venue?.name && <span>{event.venue.name}</span>}
                        <span>{formatEventLocation(event.venue)}</span>
                      </div>
                      {formatPriceRange(event.price) && (
                        <p className="sr-event-price">{formatPriceRange(event.price)}</p>
                      )}
                      <div className="sr-event-actions">
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sr-btn sr-btn--primary"
                        >
                          View Tickets
                        </a>
                        {event.venue && (
                          <a
                            href={getUberLink(event.venue, event.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sr-btn sr-btn--uber"
                          >
                            🚗 Get a Ride
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchResults;
