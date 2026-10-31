/**
 * BUSINESS LOGIC for comments: the article must exist (404 article), the comment must belong
 * to that article (404 comment), and only the comment's own author may delete it (403).
 */

import type { Comment } from '../domain/entities/comment';
import { forbidden, notFound } from '../domain/errors';
import type { ArticleRepository, CommentRepository } from '../domain/repositories';
import type { CreateCommentInput } from '../dtos/comments.dto';

export class CommentsService {
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
    if (!comment) throw notFound('comment');
    if (comment.authorId !== userId) throw forbidden('comment');
    await this.comments.delete(comment.id);
  }

  private async articleIdOrThrow(slug: string): Promise<number> {
    const article = await this.articles.findRefBySlug(slug);
    if (!article) throw notFound('article');
    return article.id;
  }
}
