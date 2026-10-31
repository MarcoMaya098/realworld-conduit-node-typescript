/** Health check: the database must answer. Rejects (with the cause) when it does not. */

import type { HealthRepository } from '../types/repository.types';
import type { HealthReport } from '../types/health.types';

export class HealthService {
  constructor(
    private readonly health: HealthRepository,
    private readonly uptimeSeconds: () => number = () => process.uptime(),
  ) {}

  async check(): Promise<HealthReport> {
    await this.health.ping();
    return { status: 'ok', database: 'ok', uptimeSeconds: Math.round(this.uptimeSeconds()) };
  }
}
