/**
 * DATA layer types: the shape Prisma returns for each include in prisma-includes.ts.
 * Private to src/repositories/; everything outside sees models only.
 */

import type { Prisma } from '@prisma/client';
import type { articleInclude, commentInclude, profileInclude } from '../repositories/prisma-includes';

export type ProfileRow = Prisma.UserGetPayload<{ include: ReturnType<typeof profileInclude> }>;

export type ArticleRow = Prisma.ArticleGetPayload<{ include: ReturnType<typeof articleInclude> }>;

export type CommentRow = Prisma.CommentGetPayload<{ include: ReturnType<typeof commentInclude> }>;
