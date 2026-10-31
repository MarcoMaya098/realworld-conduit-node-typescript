/** Configuration types: app options (overridable in tests), rate limits, CORS and JWT settings. */

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

export interface AppOptions {
  authRateLimit: AuthRateLimitConfig;
  corsOrigins: CorsOrigins;
  requireHttps: boolean;
  trustProxyHops: number;
  docsEnabled: boolean;
}

export interface JwtOptions {
  secret: string;
  expiresInSeconds: number;
  issuer: string;
  audience: string;
}
