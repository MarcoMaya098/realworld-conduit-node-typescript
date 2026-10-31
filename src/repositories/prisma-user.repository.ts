/**
 * DATA layer for users (Prisma): lookups by id and email, the uniqueness check used for 409s
 * (reports username and email together), create and update.
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import type { NewUser, User, UserChanges } from '../domain/entities/user';
import type { UniqueUserField, UserRepository } from '../domain/repositories';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async existsById(id: number): Promise<boolean> {
    return (await this.db.user.count({ where: { id } })) > 0;
  }

  findById(id: number): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  async takenFields(candidate: { email?: string; username?: string }, excludeId?: number): Promise<UniqueUserField[]> {
    const or: Prisma.UserWhereInput[] = [];
    if (candidate.email !== undefined) or.push({ email: candidate.email });
    if (candidate.username !== undefined) or.push({ username: candidate.username });
    if (or.length === 0) return [];

    const clashes = await this.db.user.findMany({
      where: { OR: or, ...(excludeId !== undefined && { NOT: { id: excludeId } }) },
      select: { email: true, username: true },
    });
    const taken: UniqueUserField[] = [];
    if (clashes.some((u) => u.username === candidate.username)) taken.push('username');
    if (clashes.some((u) => u.email === candidate.email)) taken.push('email');
    return taken;
  }

  create(data: NewUser): Promise<User> {
    return this.db.user.create({ data });
  }

  update(id: number, changes: UserChanges): Promise<User> {
    return this.db.user.update({ where: { id }, data: changes });
  }
}
