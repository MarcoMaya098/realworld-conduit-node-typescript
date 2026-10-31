/** Mounts every resource's routes under /api. No logic here. */

import { Router } from 'express';
import type { AuthMiddleware, Controllers, RateLimiters } from '../types/container.types';
import { articleRoutes } from './article.routes';
import { commentRoutes } from './comment.routes';
import { healthRoutes } from './health.routes';
import { profileRoutes } from './profile.routes';
import { tagRoutes } from './tag.routes';
import { userRoutes } from './user.routes';

export function apiRouter(controllers: Controllers, auth: AuthMiddleware, limiters: RateLimiters): Router {
  return Router().use(
    healthRoutes(controllers.health),
    userRoutes(controllers.users, auth, limiters),
    profileRoutes(controllers.profiles, auth),
    articleRoutes(controllers.articles, auth),
    commentRoutes(controllers.comments, auth),
    tagRoutes(controllers.tags),
  );
}
