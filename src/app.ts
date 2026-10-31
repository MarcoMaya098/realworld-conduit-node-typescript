/**
 * Builds the Express app: global middleware (logs, HTTPS, security headers, CORS, compression, JSON body),
 * the /api routes wired to the controllers from the container, Swagger UI, then the 404 and
 * error handlers. `overrides` and `container` let tests change settings or implementations.
 */

import compression from 'compression';
import express, { type Express } from 'express';
import { config } from './config';
import { createContainer } from './di-container';
import { docsRouter } from './routes/docs.routes';
import { errorHandler, routeNotFound } from './middleware/error-handler';
import { authRateLimiters } from './middleware/rate-limit.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { requireHttps, securityHeaders, strictCors } from './middleware/security.middleware';
import { apiRouter } from './routes';
import type { AppOptions } from './types/app.types';
import type { Container } from './types/container.types';

export function createApp(overrides: Partial<AppOptions> = {}, container: Container = createContainer()): Express {
  const options: AppOptions = {
    authRateLimit: config.authRateLimit,
    corsOrigins: config.corsOrigins,
    requireHttps: config.requireHttps,
    trustProxyHops: config.trustProxyHops,
    docsEnabled: config.docsEnabled,
    ...overrides,
  };

  const app = express();
  app.disable('x-powered-by');
  if (options.trustProxyHops > 0) app.set('trust proxy', options.trustProxyHops);

  app.use(requestLogger);
  if (options.requireHttps) app.use(requireHttps);
  app.use(securityHeaders(options.requireHttps));
  app.use(strictCors(options.corsOrigins));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter(container.controllers, container.auth, authRateLimiters(options.authRateLimit)));

  const docs = options.docsEnabled ? docsRouter() : null;
  if (docs) app.use('/api', docs);

  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
}
