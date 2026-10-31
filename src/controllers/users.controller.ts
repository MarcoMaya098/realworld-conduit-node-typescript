/** HTTP layer for authentication: validate the body, call UsersService, pick the status code. */

import type { RequestHandler } from 'express';
import { parse } from '../lib/validation';
import { currentUserId } from '../middleware/auth';
import type { UsersService } from '../services/users.service';
import { loginSchema, registerSchema, updateUserSchema } from '../validators/users.schemas';
import { toUserDto } from './presenters';

export class UsersController {
  constructor(private readonly users: UsersService) {}

  register: RequestHandler = async (req, res) => {
    const { user } = parse(registerSchema, req.body);
    res.status(201).json({ user: toUserDto(await this.users.register(user)) });
  };

  login: RequestHandler = async (req, res) => {
    const { user } = parse(loginSchema, req.body);
    res.json({ user: toUserDto(await this.users.login(user)) });
  };

  current: RequestHandler = async (req, res) => {
    res.json({ user: toUserDto(await this.users.current(currentUserId(req))) });
  };

  update: RequestHandler = async (req, res) => {
    const { user } = parse(updateUserSchema, req.body);
    res.json({ user: toUserDto(await this.users.update(currentUserId(req), user)) });
  };
}
