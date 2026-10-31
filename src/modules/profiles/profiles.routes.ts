/**
 * HTTP layer for /api/profiles/:username: GET (auth optional) and POST / DELETE /follow (auth).
 */

import { Router } from 'express';
import { pathParam } from '../../lib/http';
import { currentUserId, optionalAuth, requireAuth } from '../../middleware/auth';
import { profilesService } from './profiles.service';

export const profilesRouter = Router();

profilesRouter.get('/profiles/:username', optionalAuth, async (req, res) => {
  res.json({ profile: await profilesService.get(pathParam(req, 'username'), req.userId) });
});

profilesRouter.post('/profiles/:username/follow', requireAuth, async (req, res) => {
  res.json({ profile: await profilesService.follow(pathParam(req, 'username'), currentUserId(req)) });
});

profilesRouter.delete('/profiles/:username/follow', requireAuth, async (req, res) => {
  res.json({ profile: await profilesService.unfollow(pathParam(req, 'username'), currentUserId(req)) });
});
