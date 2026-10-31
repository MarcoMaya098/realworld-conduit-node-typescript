import type { Prisma } from '@prisma/client';
import { prisma } from '../../db';

// Ids start at 1, so -1 matches no follower when the request is anonymous.
const ANONYMOUS = -1;

/** Include for a user rendered as a Profile: loads at most the viewer's own follow row. */
export const profileInclude = (viewerId: number | undefined) =>
  ({
    followers: { where: { followerId: viewerId ?? ANONYMOUS }, select: { followerId: true } },
  }) satisfies Prisma.UserInclude;

export type ProfileRow = Prisma.UserGetPayload<{ include: ReturnType<typeof profileInclude> }>;

export const profilesRepository = {
  findByUsername(username: string, viewerId: number | undefined): Promise<ProfileRow | null> {
    return prisma.user.findUnique({ where: { username }, include: profileInclude(viewerId) });
  },

  async follow(followerId: number, followedId: number): Promise<void> {
    await prisma.follow.upsert({
      where: { followerId_followedId: { followerId, followedId } },
      create: { followerId, followedId },
      update: {},
    });
  },

  async unfollow(followerId: number, followedId: number): Promise<void> {
    await prisma.follow.deleteMany({ where: { followerId, followedId } });
  },
};
