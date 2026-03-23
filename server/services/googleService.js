const axios = require('axios');
const { query } = require('../config/database');

/**
 * Exchange a Google authorization code for access/id tokens.
 */
const exchangeCodeForTokens = async (code, redirectUri) => {
  const response = await axios.post(
    'https://oauth2.googleapis.com/token',
    {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data; // { access_token, id_token, expires_in, ... }
};

/**
 * Fetch the authenticated user's profile from Google.
 */
const getUserInfo = async (accessToken) => {
  const response = await axios.get(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data; // { id, email, name, picture, ... }
};

/**
 * Upsert a user based on their Google profile.
 *
 * Priority:
 *  1. Match by google_id  → update profile fields
 *  2. Match by email      → link Google to the existing account (e.g. a Spotify user)
 *  3. No match            → create a new user
 */
const createOrUpdateUser = async (googleProfile) => {
  const { id: google_id, email, name, picture } = googleProfile;

  // 1. Existing Google user
  let result = await query('SELECT * FROM users WHERE google_id = $1', [google_id]);
  if (result.rows.length > 0) {
    result = await query(
      `UPDATE users
          SET email = $1,
              display_name = $2,
              profile_image_url = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE google_id = $4
    RETURNING *`,
      [email, name, picture, google_id]
    );
    return result.rows[0];
  }

  // 2. Existing user with the same email (e.g. registered via Spotify)
  result = await query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length > 0) {
    const existing = result.rows[0];
    result = await query(
      `UPDATE users
          SET google_id = $1,
              profile_image_url = COALESCE(profile_image_url, $2),
              auth_provider = CASE
                                WHEN spotify_id IS NOT NULL THEN 'both'
                                ELSE 'google'
                              END,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
    RETURNING *`,
      [google_id, picture, existing.id]
    );
    return result.rows[0];
  }

  // 3. Brand-new user
  result = await query(
    `INSERT INTO users (google_id, email, display_name, profile_image_url, auth_provider)
     VALUES ($1, $2, $3, $4, 'google')
     RETURNING *`,
    [google_id, email, name, picture]
  );
  return result.rows[0];
};

module.exports = { exchangeCodeForTokens, getUserInfo, createOrUpdateUser };
