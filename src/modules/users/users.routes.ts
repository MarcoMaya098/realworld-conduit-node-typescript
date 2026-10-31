import { Router } from 'express';
import { parse } from '../../lib/validation';
import { currentUserId, requireAuth } from '../../middleware/auth';
import { loginSchema, registerSchema, updateUserSchema } from './users.schemas';
import { usersService } from './users.service';

export const usersRouter = Router();

usersRouter.post('/users', async (req, res) => {
  const { user } = parse(registerSchema, req.body);
  res.status(201).json({ user: await usersService.register(user) });
});

usersRouter.post('/users/login', async (req, res) => {
  const { user } = parse(loginSchema, req.body);
  res.json({ user: await usersService.login(user) });
});

usersRouter.get('/user', requireAuth, async (req, res) => {
  res.json({ user: await usersService.current(currentUserId(req)) });
});

usersRouter.put('/user', requireAuth, async (req, res) => {
  const { user } = parse(updateUserSchema, req.body);
  res.json({ user: await usersService.update(currentUserId(req), user) });
});
