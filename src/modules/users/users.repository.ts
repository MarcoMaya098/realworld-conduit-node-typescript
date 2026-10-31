/**
 * DATA layer for users: lookups by id and email, the uniqueness check used for 409s
 * (reports username and email together), create and update.
 */

import type { Prisma, User } from '@prisma/client';
import { prisma } from '../../db';

export const usersRepository = {
  async existsById(id: number): Promise<boolean> {
    return (await prisma.user.count({ where: { id } })) > 0;
  },

  findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  /** Which of `email` / `username` already belong to a user other than `excludeId`. */
  async takenFields(
    candidate: { email?: string; username?: string },
    excludeId?: number,
  ): Promise<('email' | 'username')[]> {
    const or: Prisma.UserWhereInput[] = [];
    if (candidate.email !== undefined) or.push({ email: candidate.email });
    if (candidate.username !== undefined) or.push({ username: candidate.username });
    if (or.length === 0) return [];

    const clashes = await prisma.user.findMany({
      where: { OR: or, ...(excludeId !== undefined && { NOT: { id: excludeId } }) },
      select: { email: true, username: true },
    });
    const taken: ('email' | 'username')[] = [];
    if (clashes.some((u) => u.username === candidate.username)) taken.push('username');
    if (clashes.some((u) => u.email === candidate.email)) taken.push('email');
    return taken;
  },

  create(data: { email: string; username: string; passwordHash: string }): Promise<User> {
    return prisma.user.create({ data });
  },

  update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },
};
