import type { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import { profileInclude } from '../profiles/profiles.repository';
import type { Pagination } from './articles.schemas';

const ANONYMOUS = -1;

/** Everything needed to render an Article for `viewerId` (favorited / following flags). */
const articleInclude = (viewerId: number | undefined) =>
  ({
    author: { include: profileInclude(viewerId) },
    tags: { orderBy: { position: 'asc' as const }, select: { tag: { select: { name: true } } } },
    favorites: { where: { userId: viewerId ?? ANONYMOUS }, select: { userId: true } },
    _count: { select: { favorites: true } },
  }) satisfies Prisma.ArticleInclude;

export type ArticleRow = Prisma.ArticleGetPayload<{ include: ReturnType<typeof articleInclude> }>;

/** The minimum needed for existence / ownership checks. */
export interface ArticleRef {
  id: number;
  authorId: number;
  title: string;
}

export interface ArticleFilters {
  tag?: string;
  author?: string;
  favoritedBy?: string;
  /** Feed: only articles whose author this user follows. */
  followedBy?: number;
}

export interface ArticleWrite {
  slug?: string;
  title?: string;
  description?: string;
  body?: string;
  tagList?: string[];
}

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

export const articlesRepository = {
  async list(
    filters: ArticleFilters,
    page: Pagination,
    viewerId: number | undefined,
  ): Promise<{ rows: ArticleRow[]; count: number }> {
    const where = toWhere(filters);
    const [rows, count] = await prisma.$transaction([
      prisma.article.findMany({
        where,
        include: articleInclude(viewerId),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: page.limit,
        skip: page.offset,
      }),
      prisma.article.count({ where }),
    ]);
    return { rows, count };
  },

  findBySlug(slug: string, viewerId: number | undefined): Promise<ArticleRow | null> {
    return prisma.article.findUnique({ where: { slug }, include: articleInclude(viewerId) });
  },

  findById(id: number, viewerId: number | undefined): Promise<ArticleRow | null> {
    return prisma.article.findUnique({ where: { id }, include: articleInclude(viewerId) });
  },

  findRefBySlug(slug: string): Promise<ArticleRef | null> {
    return prisma.article.findUnique({ where: { slug }, select: { id: true, authorId: true, title: true } });
  },

  async slugTaken(slug: string, excludeId?: number): Promise<boolean> {
    const count = await prisma.article.count({
      where: { slug, ...(excludeId !== undefined && { NOT: { id: excludeId } }) },
    });
    return count > 0;
  },

  create(
    authorId: number,
    data: Required<Omit<ArticleWrite, 'tagList'>> & { tagList: string[] },
  ): Promise<ArticleRow> {
    const { tagList, ...fields } = data;
    return prisma.article.create({
      data: { ...fields, author: { connect: { id: authorId } }, tags: { create: createTags(tagList) } },
      include: articleInclude(authorId),
    });
  },

  update(id: number, data: ArticleWrite, viewerId: number): Promise<ArticleRow> {
    const { tagList, ...fields } = data;
    return prisma.article.update({
      where: { id },
      data: {
        ...fields,
        updatedAt: new Date(),
        ...(tagList !== undefined && { tags: { deleteMany: {}, create: createTags(tagList) } }),
      },
      include: articleInclude(viewerId),
    });
  },

  async delete(id: number): Promise<void> {
    await prisma.article.delete({ where: { id } });
  },

  async favorite(userId: number, articleId: number): Promise<void> {
    await prisma.favorite.upsert({
      where: { userId_articleId: { userId, articleId } },
      create: { userId, articleId },
      update: {},
    });
  },

  async unfavorite(userId: number, articleId: number): Promise<void> {
    await prisma.favorite.deleteMany({ where: { userId, articleId } });
  },
};
