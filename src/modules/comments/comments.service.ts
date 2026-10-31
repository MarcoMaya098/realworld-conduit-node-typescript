import { forbidden, notFound } from '../../errors';
import { articlesRepository } from '../articles/articles.repository';
import { type ProfileDto, toProfileDto } from '../profiles/profiles.service';
import { type CommentRow, commentsRepository } from './comments.repository';
import type { CreateCommentInput } from './comments.schemas';

export interface CommentDto {
  id: number;
  createdAt: string;
  updatedAt: string;
  body: string;
  author: ProfileDto;
}

export function toCommentDto(row: CommentRow): CommentDto {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    body: row.body,
    author: toProfileDto(row.author),
  };
}

async function articleIdOrThrow(slug: string): Promise<number> {
  const article = await articlesRepository.findRefBySlug(slug);
  if (!article) throw notFound('article');
  return article.id;
}

export const commentsService = {
  async list(slug: string, viewerId: number | undefined): Promise<CommentDto[]> {
    const articleId = await articleIdOrThrow(slug);
    return (await commentsRepository.listByArticle(articleId, viewerId)).map(toCommentDto);
  },

  async create(slug: string, input: CreateCommentInput, authorId: number): Promise<CommentDto> {
    const articleId = await articleIdOrThrow(slug);
    return toCommentDto(await commentsRepository.create({ body: input.body, articleId, authorId }));
  },

  /** Only the comment's author may delete it. `commentId` is null when the path id is not numeric. */
  async delete(slug: string, commentId: number | null, userId: number): Promise<void> {
    const articleId = await articleIdOrThrow(slug);
    const comment = commentId === null ? null : await commentsRepository.findInArticle(commentId, articleId);
    if (!comment) throw notFound('comment');
    if (comment.authorId !== userId) throw forbidden('comment');
    await commentsRepository.delete(comment.id);
  },
};
