/** Controller for profiles: read the username from the path, call ProfileService. */

import type { RequestHandler } from 'express';
import { currentUserId, pathParam } from '../utils/http';
import type { ProfileService } from '../services/profile.service';
import { toProfileDto } from '../utils/response';

export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  get: RequestHandler = async (req, res) => {
    res.json({ profile: toProfileDto(await this.profileService.get(pathParam(req, 'username'), req.userId)) });
  };

  follow: RequestHandler = async (req, res) => {
    res.json({ profile: toProfileDto(await this.profileService.follow(pathParam(req, 'username'), currentUserId(req))) });
  };

  unfollow: RequestHandler = async (req, res) => {
    res.json({ profile: toProfileDto(await this.profileService.unfollow(pathParam(req, 'username'), currentUserId(req))) });
  };
}
