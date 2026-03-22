/**
 * Fathom API integration.
 * Handles OAuth flow and transcript retrieval.
 */

import { getConnection, upsertConnection } from '../db/connections.js';

const FATHOM_AUTH_URL = 'https://app.fathom.video/oauth/authorize';
const FATHOM_TOKEN_URL = 'https://app.fathom.video/oauth/token';
const FATHOM_API_URL = 'https://api.fathom.video/v1';

function getCredentials() {
  const clientId = process.env.FATHOM_CLIENT_ID;
  const clientSecret = process.env.FATHOM_CLIENT_SECRET;
  const redirectUri = process.env.FATHOM_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/connections/fathom?callback=1`;
  if (!clientId || !clientSecret) {
    throw new Error('FATHOM_CLIENT_ID and FATHOM_CLIENT_SECRET must be set');
  }
  return { clientId, clientSecret, redirectUri };
}

/**
 * Generate the Fathom OAuth authorization URL.
 * @param {string} userId - User ID to encode in state
 * @returns {string} Authorization URL
 */
export function getAuthUrl(userId) {
  const { clientId, redirectUri } = getCredentials();
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });
  return `${FATHOM_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens and store them.
 * @param {string} code - Authorization code from callback
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function handleCallback(code, userId) {
  const { clientId, clientSecret, redirectUri } = getCredentials();

  const res = await fetch(FATHOM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await res.json();
  if (tokens.error) {
    throw new Error(`Fathom token exchange failed: ${tokens.error_description || tokens.error}`);
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  await upsertConnection({
    userId,
    provider: 'fathom',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    tokenExpiresAt: expiresAt,
    metadata: {},
  });
}

/**
 * Fetch meeting transcripts from Fathom.
 * @param {string} userId - User ID
 * @param {object} [options]
 * @param {number} [options.limit=20] - Number of transcripts to fetch
 * @param {string} [options.after] - Cursor for pagination
 * @returns {Promise<Array>} Transcripts
 */
export async function getTranscripts(userId, options = {}) {
  const conn = await getConnection(userId, 'fathom');
  if (!conn) throw new Error('Fathom not connected');

  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.after) params.set('after', options.after);

  const res = await fetch(`${FATHOM_API_URL}/transcripts?${params.toString()}`, {
    headers: { Authorization: `Bearer ${conn.access_token}` },
  });

  if (!res.ok) {
    throw new Error(`Fathom API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.transcripts || data.data || [];
}
