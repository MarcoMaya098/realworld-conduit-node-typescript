/** DATA layer for tags (Prisma): tags in use, most used first, then alphabetically. */

import type { PrismaClient } from '@prisma/client';
import type { TagRepository } from '../domain/repositories';

export class PrismaTagRepository implements TagRepository {
  constructor(private readonly db: PrismaClient) {}

  async listInUse(): Promise<string[]> {
    const tags = await this.db.tag.findMany({
      where: { articles: { some: {} } },
      orderBy: [{ articles: { _count: 'desc' } }, { name: 'asc' }],
      select: { name: true },
    });
    return tags.map((tag) => tag.name);
  }
}
