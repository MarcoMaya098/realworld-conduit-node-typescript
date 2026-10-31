/**
 * Repository interfaces: what the services need from storage, with no mention of
 * Prisma or SQL. Implementations live in src/repositories/ and are wired in src/di-container.ts;
 * tests can swap in fakes. `viewerId` is the authenticated user, used to compute the
 * viewer-dependent flags (`following`, `favorited`); undefined means anonymous.
 */

import type { Article, ArticleChanges, ArticleFilters, ArticleRef, NewArticle } from '../models/article.model';
import type { Comment, CommentRef, NewComment } from '../models/comment.model';
import type { Page, Pagination } from '../models/pagination.model';
import type { Profile } from '../models/profile.model';
import type { NewUser, User, UserChanges } from '../models/user.model';

export type UniqueUserField = 'email' | 'username';

export interface UserRepository {
  existsById(id: number): Promise<boolean>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** Which of `email` / `username` already belong to a user other than `excludeId`. */
  takenFields(candidate: { email?: string; username?: string }, excludeId?: number): Promise<UniqueUserField[]>;
  create(data: NewUser): Promise<User>;
  update(id: number, changes: UserChanges): Promise<User>;
}

export interface ProfileRepository {
  findByUsername(username: string, viewerId: number | undefined): Promise<Profile | null>;
  /** Idempotent. */
  follow(followerId: number, followedId: number): Promise<void>;
  /** Idempotent. */
  unfollow(followerId: number, followedId: number): Promise<void>;
}

export interface ArticleRepository {
  /** Newest first. */
  list(filters: ArticleFilters, page: Pagination, viewerId: number | undefined): Promise<Page<Article>>;
  findBySlug(slug: string, viewerId: number | undefined): Promise<Article | null>;
  findById(id: number, viewerId: number | undefined): Promise<Article | null>;
  findRefBySlug(slug: string): Promise<ArticleRef | null>;
  slugTaken(slug: string, excludeId?: number): Promise<boolean>;
  create(authorId: number, data: NewArticle): Promise<Article>;
  update(id: number, changes: ArticleChanges, viewerId: number): Promise<Article>;
  delete(id: number): Promise<void>;
  /** Idempotent. */
  favorite(userId: number, articleId: number): Promise<void>;
  /** Idempotent. */
  unfavorite(userId: number, articleId: number): Promise<void>;
}

export interface CommentRepository {
  /** Oldest first, i.e. reading order. */
  listByArticle(articleId: number, viewerId: number | undefined): Promise<Comment[]>;
  findInArticle(id: number, articleId: number): Promise<CommentRef | null>;
  create(data: NewComment): Promise<Comment>;
  delete(id: number): Promise<void>;
}

export interface TagRepository {
  /** Tags attached to at least one article, most used first. */
  listInUse(): Promise<string[]>;
}

export interface HealthRepository {
  /** Resolves when the database answers; rejects otherwise. */
  ping(): Promise<void>;
}
