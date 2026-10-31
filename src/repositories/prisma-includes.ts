/**
 * DATA layer: the Prisma `include` clauses shared by the repositories. They load the
 * viewer-dependent fields (following, favorited) in the same query as the row.
 */

import type { Prisma } from '@prisma/client';

// Ids start at 1, so -1 matches no row when the request is anonymous.
const ANONYMOUS = -1;

/** Include for a user rendered as a Profile: loads at most the viewer's own follow row. */
export const profileInclude = (viewerId: number | undefined) =>
  ({
    followers: { where: { followerId: viewerId ?? ANONYMOUS }, select: { followerId: true } },
  }) satisfies Prisma.UserInclude;

export const articleInclude = (viewerId: number | undefined) =>
  ({
    author: { include: profileInclude(viewerId) },
    tags: { orderBy: { position: 'asc' as const }, select: { tag: { select: { name: true } } } },
    favorites: { where: { userId: viewerId ?? ANONYMOUS }, select: { userId: true } },
    _count: { select: { favorites: true } },
  }) satisfies Prisma.ArticleInclude;

export const commentInclude = (viewerId: number | undefined) =>
  ({ author: { include: profileInclude(viewerId) } }) satisfies Prisma.CommentInclude;
