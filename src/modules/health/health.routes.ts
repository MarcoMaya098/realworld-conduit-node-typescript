/**
 * GET /api/health: liveness and database check for load balancers, monitors and CI.
 * 200 {status: "ok", database: "ok", uptimeSeconds} or 503 when the database is unreachable.
 * Not part of the RealWorld spec; excluded from request logs and from the HTTPS redirect.
 */

import { Router } from 'express';
import { prisma } from '../../db';

export const healthRouter = Router();

healthRouter.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  } catch (err) {
    req.log.error({ err }, 'health check: database unreachable');
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});
