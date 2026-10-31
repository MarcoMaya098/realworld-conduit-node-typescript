/** The process-wide Prisma client. Only src/container.ts and the server's shutdown use it directly. */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
