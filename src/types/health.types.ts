/** DTO for GET /api/health when the database answers. */

export interface HealthReport {
  status: 'ok';
  database: 'ok';
  uptimeSeconds: number;
}
