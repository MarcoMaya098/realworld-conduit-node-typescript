import express, { type Express } from 'express';
import { type AuthRateLimitConfig, type CorsOrigins, config } from './config';
import { docsRouter } from './docs';
import { errorHandler, routeNotFound } from './middleware/error-handler';
import { authRateLimiters } from './middleware/rate-limit';
import { requestLogger } from './middleware/request-logger';
import { requireHttps, securityHeaders, strictCors } from './middleware/security';
import { articlesRouter } from './modules/articles/articles.routes';
import { commentsRouter } from './modules/comments/comments.routes';
import { healthRouter } from './modules/health/health.routes';
import { profilesRouter } from './modules/profiles/profiles.routes';
import { tagsRouter } from './modules/tags/tags.routes';
import { usersRouter } from './modules/users/users.routes';

export interface AppOptions {
  authRateLimit: AuthRateLimitConfig;
  corsOrigins: CorsOrigins;
  requireHttps: boolean;
  trustProxyHops: number;
  docsEnabled: boolean;
}

export function createApp(overrides: Partial<AppOptions> = {}): Express {
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
  app.use(express.json({ limit: '1mb' }));

  const limiters = authRateLimiters(options.authRateLimit);
  const api = express.Router();
  api.post('/users', limiters.register);
  api.post('/users/login', limiters.login);
  api.use(healthRouter, usersRouter, profilesRouter, articlesRouter, commentsRouter, tagsRouter);
  app.use('/api', api);

  const docs = options.docsEnabled ? docsRouter() : null;
  if (docs) app.use('/api', docs);

  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
}
