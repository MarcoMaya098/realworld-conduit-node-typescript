/**
 * BUSINESS LOGIC for profiles: read a profile (404 profile if unknown), follow and unfollow
 * (idempotent; following yourself is a 422).
 */

import type { Profile } from '../models/profile.model';
import { NotFoundError, ValidationError } from '../utils/errors';
import type { ProfileRepository } from '../types/repository.types';

export class ProfileService {
  constructor(private readonly profiles: ProfileRepository) {}

  get(username: string, viewerId: number | undefined): Promise<Profile> {
    return this.findOrThrow(username, viewerId);
  }

  // Follow / unfollow are idempotent: repeating them returns the same profile.
  async follow(username: string, viewerId: number): Promise<Profile> {
    const target = await this.findOrThrow(username, viewerId);
    if (target.id === viewerId) throw new ValidationError({ profile: ['cannot follow yourself'] });
    await this.profiles.follow(viewerId, target.id);
    return { ...target, following: true };
  }

  async unfollow(username: string, viewerId: number): Promise<Profile> {
    const target = await this.findOrThrow(username, viewerId);
    await this.profiles.unfollow(viewerId, target.id);
    return { ...target, following: false };
  }

  private async findOrThrow(username: string, viewerId: number | undefined): Promise<Profile> {
    const profile = await this.profiles.findByUsername(username, viewerId);
    if (!profile) throw new NotFoundError('profile');
    return profile;
  }
}
