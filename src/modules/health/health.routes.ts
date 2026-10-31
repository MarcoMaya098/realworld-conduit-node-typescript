import { Router } from 'express';
import { prisma } from '../../db';

export const healthRouter = Router();

// Not part of the RealWorld spec: liveness + database check for load balancers and CI.
healthRouter.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  } catch (err) {
    req.log.error({ err }, 'health check: database unreachable');
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});
