/** HTTP layer for profiles: read the username from the path, call ProfilesService. */

import type { RequestHandler } from 'express';
import { pathParam } from '../lib/http';
import { currentUserId } from '../middleware/auth';
import type { ProfilesService } from '../services/profiles.service';
import { toProfileDto } from './presenters';

export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  get: RequestHandler = async (req, res) => {
    res.json({ profile: toProfileDto(await this.profiles.get(pathParam(req, 'username'), req.userId)) });
  };

  follow: RequestHandler = async (req, res) => {
    res.json({ profile: toProfileDto(await this.profiles.follow(pathParam(req, 'username'), currentUserId(req))) });
  };

  unfollow: RequestHandler = async (req, res) => {
    res.json({ profile: toProfileDto(await this.profiles.unfollow(pathParam(req, 'username'), currentUserId(req))) });
  };
}
