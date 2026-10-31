import { Router } from 'express';
import { pathParam } from '../../lib/http';
import { parse } from '../../lib/validation';
import { currentUserId, optionalAuth, requireAuth } from '../../middleware/auth';
import {
  createArticleSchema,
  listArticlesQuerySchema,
  paginationSchema,
  updateArticleSchema,
} from './articles.schemas';
import { articlesService } from './articles.service';

export const articlesRouter = Router();

articlesRouter.get('/articles', optionalAuth, async (req, res) => {
  const query = parse(listArticlesQuerySchema, req.query);
  res.json(await articlesService.list(query, req.userId));
});

// Must be registered before `/articles/:slug`.
articlesRouter.get('/articles/feed', requireAuth, async (req, res) => {
  const page = parse(paginationSchema, req.query);
  res.json(await articlesService.feed(page, currentUserId(req)));
});

articlesRouter.post('/articles', requireAuth, async (req, res) => {
  const { article } = parse(createArticleSchema, req.body);
  res.status(201).json({ article: await articlesService.create(article, currentUserId(req)) });
});

articlesRouter.get('/articles/:slug', optionalAuth, async (req, res) => {
  res.json({ article: await articlesService.get(pathParam(req, 'slug'), req.userId) });
});

articlesRouter.put('/articles/:slug', requireAuth, async (req, res) => {
  const { article } = parse(updateArticleSchema, req.body);
  res.json({ article: await articlesService.update(pathParam(req, 'slug'), article, currentUserId(req)) });
});

articlesRouter.delete('/articles/:slug', requireAuth, async (req, res) => {
  await articlesService.delete(pathParam(req, 'slug'), currentUserId(req));
  res.status(204).end();
});

articlesRouter.post('/articles/:slug/favorite', requireAuth, async (req, res) => {
  res.json({ article: await articlesService.favorite(pathParam(req, 'slug'), currentUserId(req)) });
});

articlesRouter.delete('/articles/:slug/favorite', requireAuth, async (req, res) => {
  res.json({ article: await articlesService.unfavorite(pathParam(req, 'slug'), currentUserId(req)) });
});
