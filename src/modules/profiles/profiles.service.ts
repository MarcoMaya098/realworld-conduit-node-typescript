import { notFound, unprocessable } from '../../errors';
import { type ProfileRow, profilesRepository } from './profiles.repository';

export interface ProfileDto {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
}

export function toProfileDto(user: ProfileRow): ProfileDto {
  return {
    username: user.username,
    bio: user.bio,
    image: user.image,
    following: user.followers.length > 0,
  };
}

async function findOrThrow(username: string, viewerId: number | undefined): Promise<ProfileRow> {
  const user = await profilesRepository.findByUsername(username, viewerId);
  if (!user) throw notFound('profile');
  return user;
}

export const profilesService = {
  async get(username: string, viewerId: number | undefined): Promise<ProfileDto> {
    return toProfileDto(await findOrThrow(username, viewerId));
  },

  // Follow / unfollow are idempotent: repeating them returns the same profile.
  async follow(username: string, viewerId: number): Promise<ProfileDto> {
    const target = await findOrThrow(username, viewerId);
    if (target.id === viewerId) throw unprocessable({ profile: ['cannot follow yourself'] });
    await profilesRepository.follow(viewerId, target.id);
    return { ...toProfileDto(target), following: true };
  },

  async unfollow(username: string, viewerId: number): Promise<ProfileDto> {
    const target = await findOrThrow(username, viewerId);
    await profilesRepository.unfollow(viewerId, target.id);
    return { ...toProfileDto(target), following: false };
  },
};
