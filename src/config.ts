const isProduction = process.env.NODE_ENV === 'production';

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer, got "${raw}"`);
  }
  return value;
}

function boolFromEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (raw !== 'true' && raw !== 'false') throw new Error(`${name} must be "true" or "false", got "${raw}"`);
  return raw === 'true';
}

function listFromEnv(name: string): string[] | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const JWT_SECRET_MIN_LENGTH = 32;

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!isProduction) return secret || 'dev-only-insecure-secret';
  if (!secret || secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(`JWT_SECRET must be set to at least ${JWT_SECRET_MIN_LENGTH} characters in production`);
  }
  return secret;
}

export interface AuthRateLimitConfig {
  windowMs: number;
  /** Registrations per IP per window. 0 disables the limit. */
  registerMax: number;
  /** Failed logins per IP + email per window (successful ones are not counted). 0 disables it. */
  loginFailuresMax: number;
}

/**
 * Allowed browser origins. Non-production defaults to any localhost port so a local frontend
 * just works; production defaults to none (same-origin only) until CORS_ORIGINS is set.
 */
export type CorsOrigins = string[] | 'localhost';

export const config = {
  isProduction,
  port: intFromEnv('PORT', 3000),

  jwtSecret: jwtSecret(),
  jwtExpiresInSeconds: 60 * 60 * 24 * 30,
  jwtIssuer: 'conduit-api',
  jwtAudience: 'conduit',

  logLevel: process.env.LOG_LEVEL ?? 'info',

  /** Plain-HTTP requests are redirected (GET/HEAD) or refused (others). */
  requireHttps: boolFromEnv('REQUIRE_HTTPS', isProduction),
  /** Optional native TLS; usually TLS ends at a reverse proxy instead. */
  tlsCertFile: process.env.TLS_CERT_FILE,
  tlsKeyFile: process.env.TLS_KEY_FILE,
  /** Reverse proxies in front of the app; needed to see the client IP and the original protocol. */
  trustProxyHops: intFromEnv('TRUST_PROXY_HOPS', 0),

  corsOrigins: (listFromEnv('CORS_ORIGINS') ?? (isProduction ? [] : 'localhost')) as CorsOrigins,
  /** Swagger UI at /api/docs. Off in production unless enabled. */
  docsEnabled: boolFromEnv('DOCS_ENABLED', !isProduction),

  authRateLimit: {
    windowMs: intFromEnv('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    registerMax: intFromEnv('REGISTER_RATE_LIMIT_MAX', 100),
    loginFailuresMax: intFromEnv('LOGIN_RATE_LIMIT_MAX', 10),
  } satisfies AuthRateLimitConfig,
} as const;
