/**
 * Google OAuth flow helper.
 * Handles authorization URL generation, code exchange, token storage, and refresh.
 */

import { getConnection, upsertConnection } from '../db/connections.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

function getCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/connections/google?callback=1`;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  }
  return { clientId, clientSecret, redirectUri };
}

/**
 * Generate the Google OAuth authorization URL.
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
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens and store them.
 * @param {string} code - Authorization code from callback
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function handleCallback(code, userId) {
  const { clientId, clientSecret, redirectUri } = getCredentials();

  const res = await fetch(GOOGLE_TOKEN_URL, {
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
    throw new Error(`Google token exchange failed: ${tokens.error_description || tokens.error}`);
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  await upsertConnection({
    userId,
    provider: 'google',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    tokenExpiresAt: expiresAt,
    metadata: { scope: tokens.scope },
  });
}

/**
 * Get an authenticated fetch wrapper for Google APIs.
 * Handles token refresh automatically.
 * @param {string} userId - User ID
 * @returns {Promise<{accessToken: string}|null>}
 */
export async function getClient(userId) {
  const conn = await getConnection(userId, 'google');
  if (!conn) return null;

  // Check if token needs refresh
  if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
    if (!conn.refresh_token) return null;

    const { clientId, clientSecret } = getCredentials();
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: conn.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await res.json();
    if (tokens.error) return null;

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await upsertConnection({
      userId,
      provider: 'google',
      accessToken: tokens.access_token,
      refreshToken: conn.refresh_token,
      tokenExpiresAt: expiresAt,
      metadata: conn.metadata,
    });

    return { accessToken: tokens.access_token };
  }

  return { accessToken: conn.access_token };
}
