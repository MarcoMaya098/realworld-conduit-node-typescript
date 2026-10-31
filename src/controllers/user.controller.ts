/** Controller for authentication and the current user: call UserService, pick the status code. */

import type { RequestHandler } from 'express';
import type { UserService } from '../services/user.service';
import type { LoginBody, RegisterBody, UpdateUserBody } from '../types/user.types';
import { currentUserId, validatedBody } from '../utils/http';
import { toUserDto } from '../utils/response';

export class UserController {
  constructor(private readonly userService: UserService) {}

  register: RequestHandler = async (req, res) => {
    const { user } = validatedBody<RegisterBody>(req);
    res.status(201).json({ user: toUserDto(await this.userService.register(user)) });
  };

  login: RequestHandler = async (req, res) => {
    const { user } = validatedBody<LoginBody>(req);
    res.json({ user: toUserDto(await this.userService.login(user)) });
  };

  current: RequestHandler = async (req, res) => {
    res.json({ user: toUserDto(await this.userService.current(currentUserId(req))) });
  };

  update: RequestHandler = async (req, res) => {
    const { user } = validatedBody<UpdateUserBody>(req);
    res.json({ user: toUserDto(await this.userService.update(currentUserId(req), user)) });
  };
}
