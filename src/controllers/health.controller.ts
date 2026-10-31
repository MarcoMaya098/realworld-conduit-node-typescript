/**
 * GET /api/health: liveness and database check for load balancers, monitors and CI.
 * 200 {status: "ok", database: "ok", uptimeSeconds} or 503 when the database is unreachable.
 * Not part of the RealWorld spec; excluded from request logs and from the HTTPS redirect.
 */

import type { RequestHandler } from 'express';
import type { HealthService } from '../services/health.service';

export class HealthController {
  constructor(private readonly health: HealthService) {}

  check: RequestHandler = async (req, res) => {
    try {
      res.json(await this.health.check());
    } catch (err) {
      req.log.error({ err }, 'health check: database unreachable');
      res.status(503).json({ status: 'error', database: 'unreachable' });
    }
  };
}
