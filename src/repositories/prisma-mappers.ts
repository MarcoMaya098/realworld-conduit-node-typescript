/**
 * DATA layer: mappers from Prisma rows to models. Nothing outside src/repositories/
 * sees a Prisma type.
 */

import type { Article } from '../models/article.model';
import type { Comment } from '../models/comment.model';
import type { Profile } from '../models/profile.model';
import type { ArticleRow, CommentRow, ProfileRow } from '../types/prisma.types';

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    bio: row.bio,
    image: row.image,
    following: row.followers.length > 0,
  };
}

export function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    body: row.body,
    tagList: row.tags.map(({ tag }) => tag.name),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    favorited: row.favorites.length > 0,
    favoritesCount: row._count.favorites,
    author: toProfile(row.author),
  };
}

export function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: toProfile(row.author),
  };
}
