/** Wiring types: the DI container's registry and what it hands to the app and the routes. */

import type { PrismaClient } from '@prisma/client';
import type { RequestHandler } from 'express';
import type { ArticleController } from '../controllers/article.controller';
import type { CommentController } from '../controllers/comment.controller';
import type { HealthController } from '../controllers/health.controller';
import type { ProfileController } from '../controllers/profile.controller';
import type { TagController } from '../controllers/tag.controller';
import type { UserController } from '../controllers/user.controller';
import type { ArticleService } from '../services/article.service';
import type { CommentService } from '../services/comment.service';
import type { HealthService } from '../services/health.service';
import type { ProfileService } from '../services/profile.service';
import type { TagService } from '../services/tag.service';
import type { UserService } from '../services/user.service';
import type {
  ArticleRepository,
  CommentRepository,
  HealthRepository,
  ProfileRepository,
  TagRepository,
  UserRepository,
} from './repository.types';
import type { PasswordHasher, TokenService } from './security.types';

export interface AuthMiddleware {
  /** 401 unless a valid token is sent. */
  requireAuth: RequestHandler;
  /** Anonymous without a header; a bad token is still a 401. */
  optionalAuth: RequestHandler;
}

/** Every dependency the DI container can resolve, by key. */
export interface ServiceRegistry {
  db: PrismaClient;

  userRepository: UserRepository;
  profileRepository: ProfileRepository;
  articleRepository: ArticleRepository;
  commentRepository: CommentRepository;
  tagRepository: TagRepository;
  healthRepository: HealthRepository;

  passwordService: PasswordHasher;
  tokenService: TokenService;
  userService: UserService;
  profileService: ProfileService;
  articleService: ArticleService;
  commentService: CommentService;
  tagService: TagService;
  healthService: HealthService;

  userController: UserController;
  profileController: ProfileController;
  articleController: ArticleController;
  commentController: CommentController;
  tagController: TagController;
  healthController: HealthController;

  authMiddleware: AuthMiddleware;
}

export interface Controllers {
  users: UserController;
  profiles: ProfileController;
  articles: ArticleController;
  comments: CommentController;
  tags: TagController;
  health: HealthController;
}

/** What createApp() needs from the container. */
export interface Container {
  controllers: Controllers;
  auth: AuthMiddleware;
}

export interface RateLimiters {
  register: RequestHandler;
  login: RequestHandler;
}
