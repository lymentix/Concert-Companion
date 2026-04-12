const axios = require('axios');

const TICKETMASTER_API_BASE = 'https://app.ticketmaster.com/discovery/v2';

/**
 * Structure the relevant Ticketmaster event fields the client needs.
 * @param {object} event - Raw Ticketmaster event payload.
 * @returns {object} normalized event object.
 */
function transformEvent(event) {
  if (!event) {
    return null;
  }

  const venue = event._embedded?.venues?.[0] || {};
  const priceRange = event.priceRanges?.[0] || {};
  const image = (event.images || []).find((img) => img.width >= 640) || event.images?.[0];

  const start = event.dates?.start || {};
  const dateTime = start.dateTime || (start.localDate ? `${start.localDate}${start.localTime ? `T${start.localTime}` : ''}` : null);

  return {
    id: event.id,
    name: event.name,
    url: event.url,
    date: dateTime,
    saleStart: event.sales?.public?.startDateTime || null,
    saleEnd: event.sales?.public?.endDateTime || null,
    status: event.dates?.status?.code || null,
    imageUrl: image?.url || null,
    price: {
      min: priceRange.min || null,
      max: priceRange.max || null,
      currency: priceRange.currency || null,
    },
    venue: {
      name: venue.name || null,
      city: venue.city?.name || null,
      state: venue.state?.name || venue.state?.stateCode || null,
      country: venue.country?.countryCode || null,
      address: venue.address?.line1 || null,
      latitude: venue.location?.latitude ? Number(venue.location.latitude) : null,
      longitude: venue.location?.longitude ? Number(venue.location.longitude) : null,
    },
    classifications: event.classifications?.map((classification) => ({
      genre: classification.genre?.name || null,
      subGenre: classification.subGenre?.name || null,
      segment: classification.segment?.name || null,
    })) || [],
  };
}

/**
 * Fetch upcoming events for the supplied artist from Ticketmaster's Discovery API.
 * The API key must be available via process.env.TICKETMASTER_API_KEY.
 *
 * @param {string} artistName - Artist keyword to search for.
 * @param {object} [options]
 * @param {number} [options.size=5] - Number of events to fetch.
 * @param {string} [options.countryCode] - Optional ISO country code filter.
 * @returns {Promise<object[]>} A list of normalized event objects.
 */
async function getEventsForArtist(artistName, options = {}) {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    throw new Error('Ticketmaster API key not configured. Set TICKETMASTER_API_KEY in the environment.');
  }

  if (!artistName) {
    return [];
  }

  const { size = 5, countryCode } = options;

  try {
    const params = {
      apikey: apiKey,
      keyword: artistName,
      size,
      sort: 'date,asc',
      segmentName: 'Music',
      locale: '*',
    };

    if (countryCode) {
      params.countryCode = countryCode;
    }

    const response = await axios.get(`${TICKETMASTER_API_BASE}/events.json`, {
      params,
    });

    const events = response.data?._embedded?.events || [];

    return events.map(transformEvent).filter(Boolean);
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.fault?.faultstring || error.response?.data?.message || error.message;
    console.error(`Ticketmaster API error for artist "${artistName}":`, message);

    if (status === 404) {
      return [];
    }

    throw new Error(`Failed to fetch concerts for ${artistName}: ${message}`);
  }
}

/**
 * Search for upcoming music events by city and/or genre.
 *
 * @param {object} [options]
 * @param {string} [options.city] - City name to search within.
 * @param {string} [options.genre] - Music genre / classification name.
 * @param {number} [options.size=20] - Number of events to return.
 * @returns {Promise<object[]>} A list of normalized event objects.
 */
async function searchConcerts(options = {}) {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    throw new Error('Ticketmaster API key not configured. Set TICKETMASTER_API_KEY in the environment.');
  }

  const { city, genre, artist, size = 20 } = options;

  const params = {
    apikey: apiKey,
    size,
    sort: 'date,asc',
    segmentName: 'Music',
    locale: '*',
  };

  if (city) params.city = city;
  if (genre) params.classificationName = genre;
  if (artist) params.keyword = artist;

  try {
    const response = await axios.get(`${TICKETMASTER_API_BASE}/events.json`, { params });
    const events = response.data?._embedded?.events || [];
    return events.map(transformEvent).filter(Boolean);
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.fault?.faultstring || error.response?.data?.message || error.message;
    console.error('Ticketmaster search error:', message);

    if (status === 404) return [];

    throw new Error(`Concert search failed: ${message}`);
  }
}

module.exports = {
  getEventsForArtist,
  searchConcerts,
};
