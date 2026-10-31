import { Router } from 'express';
import { prisma } from '../../db';

export const tagsRouter = Router();

// Too small for its own service/repository layers: a single read-only query.
// Only tags still attached to an article, most used first.
tagsRouter.get('/tags', async (_req, res) => {
  const tags = await prisma.tag.findMany({
    where: { articles: { some: {} } },
    orderBy: [{ articles: { _count: 'desc' } }, { name: 'asc' }],
    select: { name: true },
  });
  res.json({ tags: tags.map((tag) => tag.name) });
});
