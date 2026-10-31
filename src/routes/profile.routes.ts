/** Routes for profiles: GET /profiles/:username, POST|DELETE /profiles/:username/follow. */

import { Router } from 'express';
import type { ProfileController } from '../controllers/profile.controller';
import type { AuthMiddleware } from '../types/container.types';

export function profileRoutes(controller: ProfileController, { requireAuth, optionalAuth }: AuthMiddleware): Router {
  const router = Router();
  router.get('/profiles/:username', optionalAuth, controller.get);
  router.post('/profiles/:username/follow', requireAuth, controller.follow);
  router.delete('/profiles/:username/follow', requireAuth, controller.unfollow);
  return router;
}
