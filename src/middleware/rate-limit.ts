import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { AuthRateLimitConfig } from '../config';
import { HttpError } from '../errors';

const passThrough: RequestHandler = (_req, _res, next) => next();

const tooManyRequests: RequestHandler = (_req, _res, next) =>
  next(new HttpError(429, { requests: ['too many, try again later'] }));

function loginEmail(req: Request): string {
  const email: unknown = req.body?.user?.email;
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/**
 * In-memory limiters for the unauthenticated auth endpoints. Each call creates its own
 * store, so every app instance (and every test) starts with a clean budget.
 * With several server instances a shared store (e.g. Redis) would be needed.
 */
export function authRateLimiters(options: AuthRateLimitConfig): { register: RequestHandler; login: RequestHandler } {
  const common = {
    windowMs: options.windowMs,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: tooManyRequests,
  } as const;

  return {
    // Mass sign-ups from one IP.
    register:
      options.registerMax === 0 ? passThrough : rateLimit({ ...common, limit: options.registerMax }),

    // Password guessing: only failures count, keyed by IP + target account, so a user who
    // logs in normally is never throttled and one attacker cannot lock out everybody.
    login:
      options.loginFailuresMax === 0
        ? passThrough
        : rateLimit({
            ...common,
            limit: options.loginFailuresMax,
            skipSuccessfulRequests: true,
            keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|${loginEmail(req)}`,
          }),
  };
}
