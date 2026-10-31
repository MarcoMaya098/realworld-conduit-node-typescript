/** DATA layer for the health check (Prisma): a trivial query proves the database answers. */

import type { PrismaClient } from '@prisma/client';
import type { HealthRepository } from '../types/repository.types';

export class PrismaHealthRepository implements HealthRepository {
  constructor(private readonly db: PrismaClient) {}

  async ping(): Promise<void> {
    await this.db.$queryRaw`SELECT 1`;
  }
}
