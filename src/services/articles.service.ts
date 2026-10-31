/**
 * BUSINESS LOGIC for articles:
 * - slugs: kebab-cased title, random suffix on collision, regenerated when the title changes;
 * - ownership: only the author may update or delete (404 if missing, then 403);
 * - updatedAt: bumped on every update, including tag-only changes;
 * - feed, favorites (idempotent) and filtered, paginated lists.
 */

import type { Article, ArticleRef } from '../domain/entities/article';
import type { Page, Pagination } from '../domain/entities/pagination';
import { forbidden, notFound } from '../domain/errors';
import type { ArticleRepository } from '../domain/repositories';
import type { CreateArticleInput, ListArticlesQuery, UpdateArticleInput } from '../dtos/articles.dto';
import { slugify, withRandomSuffix } from '../lib/slug';

const SLUG_ATTEMPTS = 5;

export class ArticlesService {
  constructor(private readonly articles: ArticleRepository) {}

  list(query: ListArticlesQuery, viewerId: number | undefined): Promise<Page<Article>> {
    const { limit, offset, tag, author, favorited } = query;
    return this.articles.list({ tag, author, favoritedBy: favorited }, { limit, offset }, viewerId);
  }

  feed(page: Pagination, viewerId: number): Promise<Page<Article>> {
    return this.articles.list({ followedBy: viewerId }, page, viewerId);
  }

  async get(slug: string, viewerId: number | undefined): Promise<Article> {
    const article = await this.articles.findBySlug(slug, viewerId);
    if (!article) throw notFound('article');
    return article;
  }

  async create(input: CreateArticleInput, authorId: number): Promise<Article> {
    return this.articles.create(authorId, {
      slug: await this.generateSlug(input.title),
      title: input.title,
      description: input.description,
      body: input.body,
      tagList: input.tagList ?? [],
    });
  }

  async update(slug: string, input: UpdateArticleInput, userId: number): Promise<Article> {
    const ref = await this.findOwnedOrThrow(slug, userId);
    const titleChanged = input.title !== undefined && input.title !== ref.title;
    return this.articles.update(
      ref.id,
      {
        ...input,
        ...(titleChanged && { slug: await this.generateSlug(input.title!, ref.id) }),
        updatedAt: new Date(),
      },
      userId,
    );
  }

  async delete(slug: string, userId: number): Promise<void> {
    const ref = await this.findOwnedOrThrow(slug, userId);
    await this.articles.delete(ref.id);
  }

  // Favorite / unfavorite are idempotent.
  async favorite(slug: string, userId: number): Promise<Article> {
    const ref = await this.findRefOrThrow(slug);
    await this.articles.favorite(userId, ref.id);
    return this.reload(ref.id, userId);
  }

  async unfavorite(slug: string, userId: number): Promise<Article> {
    const ref = await this.findRefOrThrow(slug);
    await this.articles.unfavorite(userId, ref.id);
    return this.reload(ref.id, userId);
  }

  /**
   * Kebab-cased title; duplicate titles get a random suffix. `excludeId` lets an article
   * keep its own slug when its title changes to one that slugifies the same way.
   */
  private async generateSlug(title: string, excludeId?: number): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
      if (!(await this.articles.slugTaken(candidate, excludeId))) return candidate;
      candidate = withRandomSuffix(base);
    }
    throw new Error(`Could not generate a unique slug for "${title}"`);
  }

  private async findRefOrThrow(slug: string): Promise<ArticleRef> {
    const ref = await this.articles.findRefBySlug(slug);
    if (!ref) throw notFound('article');
    return ref;
  }

  private async findOwnedOrThrow(slug: string, userId: number): Promise<ArticleRef> {
    const ref = await this.findRefOrThrow(slug);
    if (ref.authorId !== userId) throw forbidden('article');
    return ref;
  }

  private async reload(id: number, viewerId: number): Promise<Article> {
    const article = await this.articles.findById(id, viewerId);
    if (!article) throw notFound('article');
    return article;
  }
}
