/**
 * DTOs for articles: what ArticleService accepts (already validated by
 * validators/article.validator.ts) and the JSON Article shapes of the RealWorld spec.
 */

import type { Pagination } from '../models/pagination.model';
import type { ProfileDto } from './profile.types';

export interface ListArticlesQuery extends Pagination {
  tag?: string;
  author?: string;
  favorited?: string;
}

export interface CreateArticleInput {
  title: string;
  description: string;
  body: string;
  tagList?: string[];
}

export type UpdateArticleInput = Partial<CreateArticleInput>;

/** Response shape: `{ "article": ArticleDto }`. */
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

/** Response shape of GET /articles and GET /articles/feed. */
export interface ArticleListDto {
  articles: ArticleSummaryDto[];
  articlesCount: number;
}

/** Request bodies, as parsed by validators/article.validator.ts. */
export interface CreateArticleBody {
  article: CreateArticleInput;
}

export interface UpdateArticleBody {
  article: UpdateArticleInput;
}
