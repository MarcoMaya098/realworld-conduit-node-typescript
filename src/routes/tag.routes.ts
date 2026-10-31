/** Routes for tags: GET /tags. */

import { Router } from 'express';
import type { TagController } from '../controllers/tag.controller';

export function tagRoutes(controller: TagController): Router {
  const router = Router();
  router.get('/tags', controller.list);
  return router;
}
