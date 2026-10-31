import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse as parseYaml } from 'yaml';

// The official contract from the pinned `spec` submodule (same path from src/routes/ and dist/routes/).
const SPEC_PATH = join(__dirname, '..', '..', 'spec', 'specs', 'api', 'openapi.yml');

/**
 * Swagger UI over the official RealWorld OpenAPI document. Only `servers` is overridden,
 * so "Try it out" calls this server instead of the public demo API.
 * Returns null when the spec submodule is not checked out.
 */
export function docsRouter(): Router | null {
  if (!existsSync(SPEC_PATH)) return null;

  const document = { ...parseYaml(readFileSync(SPEC_PATH, 'utf8')), servers: [{ url: '/api' }] };
  const router = Router();
  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(document, { customSiteTitle: 'Conduit API' }));
  return router;
}
