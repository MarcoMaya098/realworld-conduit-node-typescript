/** Wiring types: what the composition root (container.ts) hands to the app and the routes. */

import type { RequestHandler } from 'express';
import type { ArticlesController } from '../controllers/articles.controller';
import type { CommentsController } from '../controllers/comments.controller';
import type { HealthController } from '../controllers/health.controller';
import type { ProfilesController } from '../controllers/profiles.controller';
import type { TagsController } from '../controllers/tags.controller';
import type { UsersController } from '../controllers/users.controller';

export interface Controllers {
  users: UsersController;
  profiles: ProfilesController;
  articles: ArticlesController;
  comments: CommentsController;
  tags: TagsController;
  health: HealthController;
}

export interface AuthMiddleware {
  /** 401 unless a valid token is sent. */
  requireAuth: RequestHandler;
  /** Anonymous without a header; a bad token is still a 401. */
  optionalAuth: RequestHandler;
}

export interface Container {
  controllers: Controllers;
  auth: AuthMiddleware;
}

export interface RateLimiters {
  register: RequestHandler;
  login: RequestHandler;
}
