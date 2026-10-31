/**
 * Database connection: the process-wide Prisma client (Prisma keeps its own connection pool;
 * its size can be tuned with `connection_limit` in DATABASE_URL). Database warnings and errors
 * go to the structured logger. closeDatabase() is called on graceful shutdown.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const client = new PrismaClient({
  log: [
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

client.$on('warn', (event) => logger.warn({ target: event.target }, `database: ${event.message}`));
client.$on('error', (event) => logger.error({ target: event.target }, `database: ${event.message}`));

export const prisma: PrismaClient = client;

export async function closeDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('database connection closed');
}
