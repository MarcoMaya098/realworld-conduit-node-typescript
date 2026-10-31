/** Routes for authentication and the current user: POST /users, POST /users/login, GET|PUT /user. */

import { Router } from 'express';
import type { UserController } from '../controllers/user.controller';
import { validate } from '../middleware/validation.middleware';
import type { AuthMiddleware, RateLimiters } from '../types/container.types';
import { loginSchema, registerSchema, updateUserSchema } from '../validators/user.validator';

export function userRoutes(controller: UserController, { requireAuth }: AuthMiddleware, limiters: RateLimiters): Router {
  const router = Router();
  router.post('/users', limiters.register, validate({ body: registerSchema }), controller.register);
  router.post('/users/login', limiters.login, validate({ body: loginSchema }), controller.login);
  router.get('/user', requireAuth, controller.current);
  router.put('/user', requireAuth, validate({ body: updateUserSchema }), controller.update);
  return router;
}
