import type { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import { profileInclude } from '../profiles/profiles.repository';

const commentInclude = (viewerId: number | undefined) =>
  ({ author: { include: profileInclude(viewerId) } }) satisfies Prisma.CommentInclude;

export type CommentRow = Prisma.CommentGetPayload<{ include: ReturnType<typeof commentInclude> }>;

export const commentsRepository = {
  /** Oldest first, i.e. reading order. */
  listByArticle(articleId: number, viewerId: number | undefined): Promise<CommentRow[]> {
    return prisma.comment.findMany({
      where: { articleId },
      include: commentInclude(viewerId),
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  },

  findInArticle(id: number, articleId: number): Promise<{ id: number; authorId: number } | null> {
    return prisma.comment.findFirst({ where: { id, articleId }, select: { id: true, authorId: true } });
  },

  create(data: { body: string; articleId: number; authorId: number }): Promise<CommentRow> {
    return prisma.comment.create({ data, include: commentInclude(data.authorId) });
  },

  async delete(id: number): Promise<void> {
    await prisma.comment.delete({ where: { id } });
  },
};
