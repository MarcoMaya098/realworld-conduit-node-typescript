/**
 * Response formatting: models -> the JSON shapes defined by the RealWorld OpenAPI spec.
 * Internal fields (ids, password hashes) never get past this file.
 */

import type { Article } from '../models/article.model';
import type { Comment } from '../models/comment.model';
import type { Page } from '../models/pagination.model';
import type { Profile } from '../models/profile.model';
import type { ArticleDto, ArticleListDto } from '../types/article.types';
import type { CommentDto } from '../types/comment.types';
import type { ProfileDto } from '../types/profile.types';
import type { AuthenticatedUser, UserDto } from '../types/user.types';

export function toUserDto({ user, token }: AuthenticatedUser): UserDto {
  return { email: user.email, token, username: user.username, bio: user.bio, image: user.image };
}

export function toProfileDto(profile: Profile): ProfileDto {
  return { username: profile.username, bio: profile.bio, image: profile.image, following: profile.following };
}

export function toArticleDto(article: Article): ArticleDto {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    body: article.body,
    tagList: article.tagList,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    favorited: article.favorited,
    favoritesCount: article.favoritesCount,
    author: toProfileDto(article.author),
  };
}

export function toArticleListDto({ items, count }: Page<Article>): ArticleListDto {
  return {
    articles: items.map((article) => {
      const { body: _body, ...summary } = toArticleDto(article);
      return summary;
    }),
    articlesCount: count,
  };
}

export function toCommentDto(comment: Comment): CommentDto {
  return {
    id: comment.id,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    body: comment.body,
    author: toProfileDto(comment.author),
  };
}
