/** Controller for GET /api/tags. */

import type { RequestHandler } from 'express';
import type { TagService } from '../services/tag.service';

export class TagController {
  constructor(private readonly tagService: TagService) {}

  list: RequestHandler = async (_req, res) => {
    res.json({ tags: await this.tagService.list() });
  };
}
