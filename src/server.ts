import './env';
import { readFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { createApp } from './app';
import { config } from './config';
import { prisma } from './db';
import { logger } from './logger';

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

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
