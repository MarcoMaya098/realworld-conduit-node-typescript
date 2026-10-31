/**
 * MODEL for articles: the full Article as seen by a viewer (`favorited` and
 * `author.following` depend on who is asking), the minimal reference used for existence and
 * ownership checks, and the shapes used to filter, create and change articles.
 */

import type { Profile } from './profile.model';

export interface Article {
  id: number;
  slug: string;
  title: string;
  description: string;
  body: string;
  /** In the order the client sent them. */
  tagList: string[];
  createdAt: Date;
  updatedAt: Date;
  favorited: boolean;
  favoritesCount: number;
  author: Profile;
}

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

export interface NewArticle {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
}

export interface ArticleChanges {
  slug?: string;
  title?: string;
  description?: string;
  body?: string;
  /** Replaces all tags when present. */
  tagList?: string[];
  updatedAt: Date;
}
