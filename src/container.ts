/**
 * Composition root: the only place that chooses implementations. It builds the repositories
 * (Prisma), the credential services (scrypt, JWT), then injects them into the services and
 * the services into the controllers. Everything else depends on interfaces, so tests or
 * another database only need a different container.
 */

import type { PrismaClient } from '@prisma/client';
import { config } from './config';
import { ArticlesController } from './controllers/articles.controller';
import { CommentsController } from './controllers/comments.controller';
import { HealthController } from './controllers/health.controller';
import { ProfilesController } from './controllers/profiles.controller';
import { TagsController } from './controllers/tags.controller';
import { UsersController } from './controllers/users.controller';
import { JwtTokenService } from './infrastructure/jwt-token-service';
import { prisma } from './infrastructure/prisma';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher';
import { createAuthMiddleware } from './middleware/auth';
import { PrismaArticleRepository } from './repositories/prisma-article.repository';
import { PrismaCommentRepository } from './repositories/prisma-comment.repository';
import { PrismaHealthRepository } from './repositories/prisma-health.repository';
import { PrismaProfileRepository } from './repositories/prisma-profile.repository';
import { PrismaTagRepository } from './repositories/prisma-tag.repository';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { ArticlesService } from './services/articles.service';
import { CommentsService } from './services/comments.service';
import { HealthService } from './services/health.service';
import { ProfilesService } from './services/profiles.service';
import { TagsService } from './services/tags.service';
import { UsersService } from './services/users.service';
import type { Container } from './types/container.types';

export function createContainer(db: PrismaClient = prisma): Container {
  const users = new PrismaUserRepository(db);
  const profiles = new PrismaProfileRepository(db);
  const articles = new PrismaArticleRepository(db);
  const comments = new PrismaCommentRepository(db);
  const tags = new PrismaTagRepository(db);
  const health = new PrismaHealthRepository(db);

  const passwords = new ScryptPasswordHasher();
  const tokens = new JwtTokenService({
    secret: config.jwtSecret,
    expiresInSeconds: config.jwtExpiresInSeconds,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });

  return {
    controllers: {
      users: new UsersController(new UsersService(users, passwords, tokens)),
      profiles: new ProfilesController(new ProfilesService(profiles)),
      articles: new ArticlesController(new ArticlesService(articles)),
      comments: new CommentsController(new CommentsService(comments, articles)),
      tags: new TagsController(new TagsService(tags)),
      health: new HealthController(new HealthService(health)),
    },
    auth: createAuthMiddleware(tokens, users),
  };
}
