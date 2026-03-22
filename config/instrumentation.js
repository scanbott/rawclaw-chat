/**
 * Next.js instrumentation hook for rawclaw-chat.
 * This file is loaded by Next.js on server start when instrumentationHook is enabled.
 */

let initialized = false;

export async function register() {
  // Only run on the server, and only once
  if (typeof window !== 'undefined' || initialized) return;
  initialized = true;

  // Load .env from project root
  const dotenv = await import('dotenv');
  dotenv.config();

  // Skip during `next build`
  if (process.argv.includes('build')) return;

  // Set AUTH_URL from APP_URL so NextAuth redirects to the correct host
  if (process.env.APP_URL && !process.env.AUTH_URL) {
    process.env.AUTH_URL = process.env.APP_URL;
  }

  // Validate AUTH_SECRET is set (required by Auth.js for session encryption)
  if (!process.env.AUTH_SECRET) {
    console.error('\n  ERROR: AUTH_SECRET is not set in your .env file.');
    console.error('  This is required for session encryption.');
    console.error('  Run "npm run setup" to generate it automatically, or add manually:');
    console.error('  openssl rand -base64 32\n');
    throw new Error('AUTH_SECRET environment variable is required');
  }

  console.log('rawclaw-chat initialized');
}
