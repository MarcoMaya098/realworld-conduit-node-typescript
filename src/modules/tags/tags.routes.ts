/**
 * GET /api/tags: tags attached to at least one article, most used first.
 * A single read-only query, so it skips the schema/service/repository layers on purpose.
 */

import { Router } from 'express';
import { prisma } from '../../db';

export const tagsRouter = Router();

tagsRouter.get('/tags', async (_req, res) => {
  const tags = await prisma.tag.findMany({
    where: { articles: { some: {} } },
    orderBy: [{ articles: { _count: 'desc' } }, { name: 'asc' }],
    select: { name: true },
  });
  res.json({ tags: tags.map((tag) => tag.name) });
});
