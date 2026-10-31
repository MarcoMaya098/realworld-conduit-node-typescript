/**
 * HTTP hardening applied to every request, configured from config (overridable per app in
 * tests):
 * - securityHeaders: helmet (HSTS, CSP, nosniff, framing protection).
 * - strictCors: allow-list CORS, no credentials, only the API's methods and headers.
 * - requireHttps: redirects plain-HTTP reads to https and refuses plain-HTTP writes.
 */

import cors from 'cors';
import type { RequestHandler } from 'express';
import helmet from 'helmet';
import type { CorsOrigins } from '../config';
import { HttpError } from '../errors';

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * Allow-list CORS. Auth is a bearer-style header, not cookies, so credentials are never
 * allowed. A disallowed origin simply gets no CORS headers and the browser blocks it.
 */
export function strictCors(origins: CorsOrigins): RequestHandler {
  const isAllowed = (origin: string) =>
    origins === 'localhost' ? LOCALHOST_ORIGIN.test(origin) : origins.includes(origin);

  return cors({
    origin: (origin, callback) => callback(null, origin !== undefined && isAllowed(origin)),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
    credentials: false,
    maxAge: 600,
  });
}

/**
 * Helmet's defaults: HSTS, nosniff, frame-ancestors 'self', no referrer leaks, a CSP that
 * Swagger UI (served from this origin, no inline scripts) works under, etc.
 * `upgrade-insecure-requests` only when HTTPS is enforced: over plain-HTTP localhost it
 * would make the browser fetch Swagger UI's assets over https and fail.
 */
export const securityHeaders = (httpsOnly: boolean): RequestHandler =>
  helmet({
    contentSecurityPolicy: { directives: { upgradeInsecureRequests: httpsOnly ? [] : null } },
  });

/**
 * Plain HTTP is not allowed: GET/HEAD are redirected to https, anything else is refused
 * (redirecting a POST would mean the password already crossed the network in clear text,
 * and silently retrying it would hide that from the client). Behind a TLS-terminating
 * proxy, set TRUST_PROXY_HOPS so `req.secure` honours X-Forwarded-Proto.
 * The health check stays reachable over HTTP for load balancers inside the network.
 */
export const requireHttps: RequestHandler = (req, res, next) => {
  if (req.secure || req.path === '/api/health') return next();
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
    return;
  }
  next(new HttpError(403, { https: ['required'] }));
};
