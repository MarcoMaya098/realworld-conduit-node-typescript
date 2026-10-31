/**
 * BUSINESS LOGIC for comments: the article must exist (404 article), the comment must belong
 * to that article (404 comment), and only the comment's own author may delete it (403).
 */

import type { Comment } from '../models/comment.model';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import type { ArticleRepository, CommentRepository } from '../types/repository.types';
import type { CreateCommentInput } from '../types/comment.types';

export class CommentService {
  constructor(
    private readonly comments: CommentRepository,
    private readonly articles: ArticleRepository,
  ) {}

  async list(slug: string, viewerId: number | undefined): Promise<Comment[]> {
    const articleId = await this.articleIdOrThrow(slug);
    return this.comments.listByArticle(articleId, viewerId);
  }

  async create(slug: string, input: CreateCommentInput, authorId: number): Promise<Comment> {
    const articleId = await this.articleIdOrThrow(slug);
    return this.comments.create({ body: input.body, articleId, authorId });
  }

  /** Only the comment's author may delete it. `commentId` is null when the path id is not numeric. */
  async delete(slug: string, commentId: number | null, userId: number): Promise<void> {
    const articleId = await this.articleIdOrThrow(slug);
    const comment = commentId === null ? null : await this.comments.findInArticle(commentId, articleId);
    if (!comment) throw new NotFoundError('comment');
    if (comment.authorId !== userId) throw new ForbiddenError('comment');
    await this.comments.delete(comment.id);
  }

  private async articleIdOrThrow(slug: string): Promise<number> {
    const article = await this.articles.findRefBySlug(slug);
    if (!article) throw new NotFoundError('article');
    return article.id;
  }
}
