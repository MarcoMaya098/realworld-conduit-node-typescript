/**
 * Entry point: loads .env, starts the HTTP(S) server and handles graceful shutdown. On
 * SIGINT/SIGTERM it stops accepting connections, lets in-flight requests finish, then closes
 * the database; if that takes too long it exits anyway. A crash (uncaught exception or
 * unhandled rejection) is logged and goes through the same shutdown with exit code 1.
 */

import './config/env';
import { readFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { createApp } from './app';
import { config } from './config';
import { closeDatabase } from './config/database';
import { logger } from './utils/logger';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const app = createApp();

// Native TLS when a certificate is configured; otherwise plain HTTP, expected to sit behind
// a TLS-terminating proxy (REQUIRE_HTTPS then rejects anything that did not arrive over TLS).
const tls = config.tlsCertFile && config.tlsKeyFile;
const server = tls
  ? createHttpsServer({ cert: readFileSync(config.tlsCertFile!), key: readFileSync(config.tlsKeyFile!) }, app)
  : createHttpServer(app);

if (config.isProduction && !tls && !config.requireHttps) {
  logger.warn('serving plain HTTP in production with REQUIRE_HTTPS=false');
}

server.listen(config.port, () => {
  const scheme = tls ? 'https' : 'http';
  logger.info(
    { port: config.port, tls: Boolean(tls), requireHttps: config.requireHttps },
    `Conduit API listening on ${scheme}://localhost:${config.port}/api`,
  );
});

let shuttingDown = false;

function shutdown(reason: string, exitCode: number): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'shutting down');

  setTimeout(() => {
    logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  server.close(() => {
    closeDatabase()
      .catch((err: unknown) => logger.error({ err }, 'error closing the database'))
      .finally(() => process.exit(exitCode));
  });
  // Keep-alive connections would otherwise hold server.close() open until they time out.
  server.closeIdleConnections();
}

process.on('SIGINT', () => shutdown('SIGINT', 0));
process.on('SIGTERM', () => shutdown('SIGTERM', 0));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  shutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'unhandled promise rejection');
  shutdown('unhandledRejection', 1);
});
