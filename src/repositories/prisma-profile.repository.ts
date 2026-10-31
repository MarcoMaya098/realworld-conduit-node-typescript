/** DATA layer for profiles and follows (Prisma). */

import type { PrismaClient } from '@prisma/client';
import type { Profile } from '../domain/entities/profile';
import type { ProfileRepository } from '../domain/repositories';
import { profileInclude } from './prisma-includes';
import { toProfile } from './prisma-mappers';

export class PrismaProfileRepository implements ProfileRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByUsername(username: string, viewerId: number | undefined): Promise<Profile | null> {
    const row = await this.db.user.findUnique({ where: { username }, include: profileInclude(viewerId) });
    return row && toProfile(row);
  }

  async follow(followerId: number, followedId: number): Promise<void> {
    await this.db.follow.upsert({
      where: { followerId_followedId: { followerId, followedId } },
      create: { followerId, followedId },
      update: {},
    });
  }

  async unfollow(followerId: number, followedId: number): Promise<void> {
    await this.db.follow.deleteMany({ where: { followerId, followedId } });
  }
}
