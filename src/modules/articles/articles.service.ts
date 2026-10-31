import { forbidden, notFound } from '../../errors';
import { slugify, withRandomSuffix } from '../../lib/slug';
import { type ProfileDto, toProfileDto } from '../profiles/profiles.service';
import { type ArticleRef, type ArticleRow, articlesRepository } from './articles.repository';
import type { CreateArticleInput, ListArticlesQuery, Pagination, UpdateArticleInput } from './articles.schemas';

export interface ArticleDto {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: ProfileDto;
}

/** List endpoints omit `body` (spec change of 2024-08-16). */
export type ArticleSummaryDto = Omit<ArticleDto, 'body'>;

export interface ArticleListDto {
  articles: ArticleSummaryDto[];
  articlesCount: number;
}

export function toArticleDto(row: ArticleRow): ArticleDto {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    body: row.body,
    tagList: row.tags.map(({ tag }) => tag.name),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    favorited: row.favorites.length > 0,
    favoritesCount: row._count.favorites,
    author: toProfileDto(row.author),
  };
}

export function toArticleSummaryDto(row: ArticleRow): ArticleSummaryDto {
  const { body: _body, ...summary } = toArticleDto(row);
  return summary;
}

const SLUG_ATTEMPTS = 5;

/**
 * Kebab-cased title; duplicate titles get a random suffix. `excludeId` lets an article
 * keep its own slug when its title changes to one that slugifies the same way.
 */
async function generateSlug(title: string, excludeId?: number): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    if (!(await articlesRepository.slugTaken(candidate, excludeId))) return candidate;
    candidate = withRandomSuffix(base);
  }
  throw new Error(`Could not generate a unique slug for "${title}"`);
}

async function findRefOrThrow(slug: string): Promise<ArticleRef> {
  const ref = await articlesRepository.findRefBySlug(slug);
  if (!ref) throw notFound('article');
  return ref;
}

async function findOwnedOrThrow(slug: string, userId: number): Promise<ArticleRef> {
  const ref = await findRefOrThrow(slug);
  if (ref.authorId !== userId) throw forbidden('article');
  return ref;
}

async function reload(id: number, viewerId: number): Promise<ArticleDto> {
  const row = await articlesRepository.findById(id, viewerId);
  if (!row) throw notFound('article');
  return toArticleDto(row);
}

function toListDto({ rows, count }: { rows: ArticleRow[]; count: number }): ArticleListDto {
  return { articles: rows.map(toArticleSummaryDto), articlesCount: count };
}

export const articlesService = {
  async list(query: ListArticlesQuery, viewerId: number | undefined): Promise<ArticleListDto> {
    const { limit, offset, tag, author, favorited } = query;
    return toListDto(
      await articlesRepository.list({ tag, author, favoritedBy: favorited }, { limit, offset }, viewerId),
    );
  },

  async feed(page: Pagination, viewerId: number): Promise<ArticleListDto> {
    return toListDto(await articlesRepository.list({ followedBy: viewerId }, page, viewerId));
  },

  async get(slug: string, viewerId: number | undefined): Promise<ArticleDto> {
    const row = await articlesRepository.findBySlug(slug, viewerId);
    if (!row) throw notFound('article');
    return toArticleDto(row);
  },

  async create(input: CreateArticleInput, authorId: number): Promise<ArticleDto> {
    const row = await articlesRepository.create(authorId, {
      slug: await generateSlug(input.title),
      title: input.title,
      description: input.description,
      body: input.body,
      tagList: input.tagList ?? [],
    });
    return toArticleDto(row);
  },

  async update(slug: string, input: UpdateArticleInput, userId: number): Promise<ArticleDto> {
    const ref = await findOwnedOrThrow(slug, userId);
    const titleChanged = input.title !== undefined && input.title !== ref.title;
    const row = await articlesRepository.update(
      ref.id,
      { ...input, ...(titleChanged && { slug: await generateSlug(input.title!, ref.id) }) },
      userId,
    );
    return toArticleDto(row);
  },

  async delete(slug: string, userId: number): Promise<void> {
    const ref = await findOwnedOrThrow(slug, userId);
    await articlesRepository.delete(ref.id);
  },

  // Favorite / unfavorite are idempotent.
  async favorite(slug: string, userId: number): Promise<ArticleDto> {
    const ref = await findRefOrThrow(slug);
    await articlesRepository.favorite(userId, ref.id);
    return reload(ref.id, userId);
  },

  async unfavorite(slug: string, userId: number): Promise<ArticleDto> {
    const ref = await findRefOrThrow(slug);
    await articlesRepository.unfavorite(userId, ref.id);
    return reload(ref.id, userId);
  },
};
