/**
 * HTTP layer for /api/articles/:slug/comments:
 * GET (auth optional), POST (auth, 201) and DELETE /:id (auth, 204).
 */

import { Router } from 'express';
import { pathParam } from '../../lib/http';
import { parse } from '../../lib/validation';
import { currentUserId, optionalAuth, requireAuth } from '../../middleware/auth';
import { createCommentSchema, parseCommentId } from './comments.schemas';
import { commentsService } from './comments.service';

export const commentsRouter = Router();

commentsRouter.get('/articles/:slug/comments', optionalAuth, async (req, res) => {
  res.json({ comments: await commentsService.list(pathParam(req, 'slug'), req.userId) });
});

commentsRouter.post('/articles/:slug/comments', requireAuth, async (req, res) => {
  const { comment } = parse(createCommentSchema, req.body);
  res.status(201).json({ comment: await commentsService.create(pathParam(req, 'slug'), comment, currentUserId(req)) });
});

commentsRouter.delete('/articles/:slug/comments/:id', requireAuth, async (req, res) => {
  await commentsService.delete(pathParam(req, 'slug'), parseCommentId(pathParam(req, 'id')), currentUserId(req));
  res.status(204).end();
});
