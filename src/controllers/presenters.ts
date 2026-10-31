/**
 * HTTP layer: domain entities -> the JSON shapes defined by the RealWorld OpenAPI spec.
 * Internal fields (ids, password hashes) never get past this file.
 */

import type { Article } from '../domain/entities/article';
import type { Comment } from '../domain/entities/comment';
import type { Page } from '../domain/entities/pagination';
import type { Profile } from '../domain/entities/profile';
import type { ArticleDto, ArticleListDto } from '../dtos/articles.dto';
import type { CommentDto } from '../dtos/comments.dto';
import type { ProfileDto } from '../dtos/profiles.dto';
import type { AuthenticatedUser, UserDto } from '../dtos/users.dto';

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
