/**
 * Dependency injection. DiContainer maps keys to factories (`register`: new instance per
 * resolve; `singleton`: built once, on first use). createContainer() is the composition root:
 * the only place that chooses implementations (Prisma repositories, scrypt, JWT). Everything
 * else receives its dependencies through the constructor and depends on interfaces, so tests
 * or another database only need different registrations.
 */

import type { PrismaClient } from '@prisma/client';
import { config } from './config';
import { prisma } from './config/database';
import { ArticleController } from './controllers/article.controller';
import { CommentController } from './controllers/comment.controller';
import { HealthController } from './controllers/health.controller';
import { ProfileController } from './controllers/profile.controller';
import { TagController } from './controllers/tag.controller';
import { UserController } from './controllers/user.controller';
import { createAuthMiddleware } from './middleware/auth.middleware';
import { PrismaArticleRepository } from './repositories/article.repository';
import { PrismaCommentRepository } from './repositories/comment.repository';
import { PrismaHealthRepository } from './repositories/health.repository';
import { PrismaProfileRepository } from './repositories/profile.repository';
import { PrismaTagRepository } from './repositories/tag.repository';
import { PrismaUserRepository } from './repositories/user.repository';
import { ArticleService } from './services/article.service';
import { CommentService } from './services/comment.service';
import { HealthService } from './services/health.service';
import { ScryptPasswordService } from './services/password.service';
import { ProfileService } from './services/profile.service';
import { TagService } from './services/tag.service';
import { JwtTokenService } from './services/token.service';
import { UserService } from './services/user.service';
import type { Container, ServiceRegistry } from './types/container.types';

export class DiContainer<Registry extends object> {
  private readonly factories = new Map<keyof Registry, () => unknown>();

  /** A new instance on every resolve. */
  register<K extends keyof Registry>(key: K, factory: () => Registry[K]): this {
    this.factories.set(key, factory);
    return this;
  }

  /** One shared instance, created on first resolve. */
  singleton<K extends keyof Registry>(key: K, factory: () => Registry[K]): this {
    let instance: Registry[K] | undefined;
    this.factories.set(key, () => (instance ??= factory()));
    return this;
  }

  resolve<K extends keyof Registry>(key: K): Registry[K] {
    const factory = this.factories.get(key);
    if (!factory) throw new Error(`No factory registered for "${String(key)}"`);
    return factory() as Registry[K];
  }
}

export function buildContainer(db: PrismaClient = prisma): DiContainer<ServiceRegistry> {
  const c = new DiContainer<ServiceRegistry>();

  c.singleton('db', () => db);

  // Data access
  c.singleton('userRepository', () => new PrismaUserRepository(c.resolve('db')));
  c.singleton('profileRepository', () => new PrismaProfileRepository(c.resolve('db')));
  c.singleton('articleRepository', () => new PrismaArticleRepository(c.resolve('db')));
  c.singleton('commentRepository', () => new PrismaCommentRepository(c.resolve('db')));
  c.singleton('tagRepository', () => new PrismaTagRepository(c.resolve('db')));
  c.singleton('healthRepository', () => new PrismaHealthRepository(c.resolve('db')));

  // Business logic
  c.singleton('passwordService', () => new ScryptPasswordService());
  c.singleton(
    'tokenService',
    () =>
      new JwtTokenService({
        secret: config.jwtSecret,
        expiresInSeconds: config.jwtExpiresInSeconds,
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      }),
  );
  c.singleton(
    'userService',
    () => new UserService(c.resolve('userRepository'), c.resolve('passwordService'), c.resolve('tokenService')),
  );
  c.singleton('profileService', () => new ProfileService(c.resolve('profileRepository')));
  c.singleton('articleService', () => new ArticleService(c.resolve('articleRepository')));
  c.singleton('commentService', () => new CommentService(c.resolve('commentRepository'), c.resolve('articleRepository')));
  c.singleton('tagService', () => new TagService(c.resolve('tagRepository')));
  c.singleton('healthService', () => new HealthService(c.resolve('healthRepository')));

  // HTTP
  c.register('userController', () => new UserController(c.resolve('userService')));
  c.register('profileController', () => new ProfileController(c.resolve('profileService')));
  c.register('articleController', () => new ArticleController(c.resolve('articleService')));
  c.register('commentController', () => new CommentController(c.resolve('commentService')));
  c.register('tagController', () => new TagController(c.resolve('tagService')));
  c.register('healthController', () => new HealthController(c.resolve('healthService')));
  c.singleton('authMiddleware', () => createAuthMiddleware(c.resolve('tokenService'), c.resolve('userRepository')));

  return c;
}

/** Resolves what createApp() needs. */
export function createContainer(c: DiContainer<ServiceRegistry> = buildContainer()): Container {
  return {
    controllers: {
      users: c.resolve('userController'),
      profiles: c.resolve('profileController'),
      articles: c.resolve('articleController'),
      comments: c.resolve('commentController'),
      tags: c.resolve('tagController'),
      health: c.resolve('healthController'),
    },
    auth: c.resolve('authMiddleware'),
  };
}
