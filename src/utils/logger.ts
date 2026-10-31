import pino from 'pino';
import { config } from '../config';

/** JSON logs on stdout (one object per line). `npm run dev` pipes them through pino-pretty. */
export const logger = pino({
  level: config.logLevel,
  base: { service: 'conduit-api' },
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
