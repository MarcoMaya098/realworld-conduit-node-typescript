/**
 * DATA layer for comments (Prisma): list an article's comments with each author's profile as
 * seen by the viewer, look a comment up within an article, create and delete.
 */

import type { PrismaClient } from '@prisma/client';
import type { Comment, CommentRef, NewComment } from '../models/comment.model';
import type { CommentRepository } from '../types/repository.types';
import { commentInclude } from './prisma-includes';
import { toComment } from './prisma-mappers';

export class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly db: PrismaClient) {}

  async listByArticle(articleId: number, viewerId: number | undefined): Promise<Comment[]> {
    const rows = await this.db.comment.findMany({
      where: { articleId },
      include: commentInclude(viewerId),
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toComment);
  }

  findInArticle(id: number, articleId: number): Promise<CommentRef | null> {
    return this.db.comment.findFirst({ where: { id, articleId }, select: { id: true, authorId: true } });
  }

  async create(data: NewComment): Promise<Comment> {
    return toComment(await this.db.comment.create({ data, include: commentInclude(data.authorId) }));
  }

  async delete(id: number): Promise<void> {
    await this.db.comment.delete({ where: { id } });
  }
}
