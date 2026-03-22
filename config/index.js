/**
 * Next.js config wrapper for rawclaw.
 * Enables instrumentation hook for cron scheduling on server start.
 *
 * Usage in user's next.config.mjs:
 *   import { withRawclaw } from '@/config/index';
 *   export default withRawclaw({});
 *
 * @param {Object} nextConfig - User's Next.js config
 * @returns {Object} Enhanced Next.js config
 */
export function withRawclaw(nextConfig = {}) {
  return {
    ...nextConfig,
    distDir: process.env.NEXT_BUILD_DIR || '.next',
    transpilePackages: [
      'rawclaw',
      ...(nextConfig.transpilePackages || []),
    ],
serverExternalPackages: [
      ...(nextConfig.serverExternalPackages || []),
    ],
  };
}

// Keep backward compat alias
export const withThepopebot = withRawclaw;
