/** Routes for articles: list, feed, CRUD by slug and favorites. */

import { Router } from 'express';
import type { ArticleController } from '../controllers/article.controller';
import { validate } from '../middleware/validation.middleware';
import type { AuthMiddleware } from '../types/container.types';
import {
  createArticleSchema,
  listArticlesQuerySchema,
  paginationSchema,
  updateArticleSchema,
} from '../validators/article.validator';

export function articleRoutes(controller: ArticleController, { requireAuth, optionalAuth }: AuthMiddleware): Router {
  const router = Router();
  router.get('/articles', optionalAuth, validate({ query: listArticlesQuerySchema }), controller.list);
  // Must be registered before `/articles/:slug`.
  router.get('/articles/feed', requireAuth, validate({ query: paginationSchema }), controller.feed);
  router.post('/articles', requireAuth, validate({ body: createArticleSchema }), controller.create);
  router.get('/articles/:slug', optionalAuth, controller.get);
  router.put('/articles/:slug', requireAuth, validate({ body: updateArticleSchema }), controller.update);
  router.delete('/articles/:slug', requireAuth, controller.delete);
  router.post('/articles/:slug/favorite', requireAuth, controller.favorite);
  router.delete('/articles/:slug/favorite', requireAuth, controller.unfavorite);
  return router;
}
