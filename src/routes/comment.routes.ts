/** Routes for an article's comments: GET, POST and DELETE /articles/:slug/comments[/:id]. */

import { Router } from 'express';
import type { CommentController } from '../controllers/comment.controller';
import { validate } from '../middleware/validation.middleware';
import type { AuthMiddleware } from '../types/container.types';
import { createCommentSchema } from '../validators/comment.validator';

export function commentRoutes(controller: CommentController, { requireAuth, optionalAuth }: AuthMiddleware): Router {
  const router = Router();
  router.get('/articles/:slug/comments', optionalAuth, controller.list);
  router.post('/articles/:slug/comments', requireAuth, validate({ body: createCommentSchema }), controller.create);
  router.delete('/articles/:slug/comments/:id', requireAuth, controller.delete);
  return router;
}
