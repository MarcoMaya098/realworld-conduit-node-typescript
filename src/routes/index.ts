/**
 * Route table for /api: method + path -> authentication middleware -> controller handler.
 * No logic here; it only states which endpoints exist and which need a token.
 */

import { Router } from 'express';
import type { AuthMiddleware, Controllers, RateLimiters } from '../types/container.types';

export function apiRouter(c: Controllers, { requireAuth, optionalAuth }: AuthMiddleware, limiters: RateLimiters): Router {
  const router = Router();

  router.get('/health', c.health.check);

  // Users and authentication
  router.post('/users', limiters.register, c.users.register);
  router.post('/users/login', limiters.login, c.users.login);
  router.get('/user', requireAuth, c.users.current);
  router.put('/user', requireAuth, c.users.update);

  // Profiles
  router.get('/profiles/:username', optionalAuth, c.profiles.get);
  router.post('/profiles/:username/follow', requireAuth, c.profiles.follow);
  router.delete('/profiles/:username/follow', requireAuth, c.profiles.unfollow);

  // Articles (`/articles/feed` must come before `/articles/:slug`)
  router.get('/articles', optionalAuth, c.articles.list);
  router.get('/articles/feed', requireAuth, c.articles.feed);
  router.post('/articles', requireAuth, c.articles.create);
  router.get('/articles/:slug', optionalAuth, c.articles.get);
  router.put('/articles/:slug', requireAuth, c.articles.update);
  router.delete('/articles/:slug', requireAuth, c.articles.delete);
  router.post('/articles/:slug/favorite', requireAuth, c.articles.favorite);
  router.delete('/articles/:slug/favorite', requireAuth, c.articles.unfavorite);

  // Comments
  router.get('/articles/:slug/comments', optionalAuth, c.comments.list);
  router.post('/articles/:slug/comments', requireAuth, c.comments.create);
  router.delete('/articles/:slug/comments/:id', requireAuth, c.comments.delete);

  // Tags
  router.get('/tags', c.tags.list);

  return router;
}
