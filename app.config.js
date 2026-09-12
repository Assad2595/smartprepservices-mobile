const path = require('path');

/**
 * Environment selection for the Expo config. `APP_ENV` picks the file under
 * `env/`; see env/example.env for every supported setting.
 *
 *   npm run start:local  -> env/local.env        (phone on the same WiFi as Laravel)
 *   npm run start:dev    -> env/development.env  (shared dev/staging server)
 *   npm run start:prod   -> env/production.env   (live server)
 *
 * These deliberately do NOT live in root-level `.env.*` files: Expo CLI
 * auto-loads `.env.local` for every command regardless of APP_ENV, which would
 * silently leak local values into a production build. Keeping them in `env/`
 * means this explicit load is the only source, and `override: true` makes the
 * selected file authoritative.
 */
const APP_ENV = process.env.APP_ENV || 'local';

const result = require('dotenv').config({
  path: path.resolve(__dirname, `env/${APP_ENV}.env`),
  override: true,
});

if (result.error) {
  throw new Error(
    `Missing env file: env/${APP_ENV}.env — copy env/example.env to create it. (APP_ENV=${APP_ENV})`,
  );
}

const bool = (value, fallback) =>
  value === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());

const API_URL = process.env.API_URL || 'http://10.0.2.2:8000/api';

// Release Android builds block cleartext HTTP. Local/dev testing talks to
// `php artisan serve` over plain http on the LAN, so allow it whenever the
// configured API URL is not https (never silently allow it in production).
const usesCleartextTraffic = bool(process.env.ANDROID_ALLOW_CLEARTEXT, !API_URL.startsWith('https://'));

module.exports = ({ config }) => ({
  ...config,
  name: process.env.APP_DISPLAY_NAME || config.name,
  extra: {
    ...config.extra,
    appEnv: APP_ENV,
    envLabel: process.env.ENV_LABEL || APP_ENV.toUpperCase(),
    apiUrl: API_URL,
    requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 20000),
    showEnvBadge: bool(process.env.SHOW_ENV_BADGE, APP_ENV !== 'production'),
    eas: config.extra?.eas,
  },
  android: {
    ...config.android,
    usesCleartextTraffic,
  },
});
