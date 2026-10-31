/** HTTP layer for GET /api/tags. */

import type { RequestHandler } from 'express';
import type { TagsService } from '../services/tags.service';

export class TagsController {
  constructor(private readonly tags: TagsService) {}

  list: RequestHandler = async (_req, res) => {
    res.json({ tags: await this.tags.list() });
  };
}
