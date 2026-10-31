/**
 * DATA layer for articles (Prisma): the only code that queries articles, their tags and
 * favorites. Loads the viewer-dependent fields (favorited, author.following) in the same query
 * as the article, so a page of results is one query plus its count. No business rules here.
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import type { Article, ArticleChanges, ArticleFilters, ArticleRef, NewArticle } from '../domain/entities/article';
import type { Page, Pagination } from '../domain/entities/pagination';
import type { ArticleRepository } from '../domain/repositories';
import { articleInclude } from './prisma-includes';
import { toArticle } from './prisma-mappers';

function toWhere(filters: ArticleFilters): Prisma.ArticleWhereInput {
  const conditions: Prisma.ArticleWhereInput[] = [];
  if (filters.tag !== undefined) conditions.push({ tags: { some: { tag: { name: filters.tag } } } });
  if (filters.author !== undefined) conditions.push({ author: { username: filters.author } });
  if (filters.favoritedBy !== undefined) {
    conditions.push({ favorites: { some: { user: { username: filters.favoritedBy } } } });
  }
  if (filters.followedBy !== undefined) {
    conditions.push({ author: { followers: { some: { followerId: filters.followedBy } } } });
  }
  return { AND: conditions };
}

const createTags = (tagList: string[]) =>
  tagList.map((name, position) => ({
    position,
    tag: { connectOrCreate: { where: { name }, create: { name } } },
  }));

export class PrismaArticleRepository implements ArticleRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(filters: ArticleFilters, page: Pagination, viewerId: number | undefined): Promise<Page<Article>> {
    const where = toWhere(filters);
    const [rows, count] = await this.db.$transaction([
      this.db.article.findMany({
        where,
        include: articleInclude(viewerId),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: page.limit,
        skip: page.offset,
      }),
      this.db.article.count({ where }),
    ]);
    return { items: rows.map(toArticle), count };
  }

  async findBySlug(slug: string, viewerId: number | undefined): Promise<Article | null> {
    const row = await this.db.article.findUnique({ where: { slug }, include: articleInclude(viewerId) });
    return row && toArticle(row);
  }

  async findById(id: number, viewerId: number | undefined): Promise<Article | null> {
    const row = await this.db.article.findUnique({ where: { id }, include: articleInclude(viewerId) });
    return row && toArticle(row);
  }

  findRefBySlug(slug: string): Promise<ArticleRef | null> {
    return this.db.article.findUnique({ where: { slug }, select: { id: true, authorId: true, title: true } });
  }

  async slugTaken(slug: string, excludeId?: number): Promise<boolean> {
    const count = await this.db.article.count({
      where: { slug, ...(excludeId !== undefined && { NOT: { id: excludeId } }) },
    });
    return count > 0;
  }

  async create(authorId: number, data: NewArticle): Promise<Article> {
    const { tagList, ...fields } = data;
    const row = await this.db.article.create({
      data: { ...fields, author: { connect: { id: authorId } }, tags: { create: createTags(tagList) } },
      include: articleInclude(authorId),
    });
    return toArticle(row);
  }

  async update(id: number, changes: ArticleChanges, viewerId: number): Promise<Article> {
    const { tagList, ...fields } = changes;
    const row = await this.db.article.update({
      where: { id },
      data: {
        ...fields,
        ...(tagList !== undefined && { tags: { deleteMany: {}, create: createTags(tagList) } }),
      },
      include: articleInclude(viewerId),
    });
    return toArticle(row);
  }

  async delete(id: number): Promise<void> {
    await this.db.article.delete({ where: { id } });
  }

  async favorite(userId: number, articleId: number): Promise<void> {
    await this.db.favorite.upsert({
      where: { userId_articleId: { userId, articleId } },
      create: { userId, articleId },
      update: {},
    });
  }

  async unfavorite(userId: number, articleId: number): Promise<void> {
    await this.db.favorite.deleteMany({ where: { userId, articleId } });
  }
}
