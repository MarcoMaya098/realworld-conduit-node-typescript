import type { Request, RequestHandler } from 'express';
import { unauthorized } from '../errors';
import { verifyToken } from '../lib/jwt';
import { usersRepository } from '../modules/users/users.repository';

declare global {
  namespace Express {
    interface Request {
      /** Id of the authenticated user, set by `requireAuth` / `optionalAuth`. */
      userId?: number;
    }
  }
}

/**
 * Reads `Authorization: Token <jwt>` (the spec's scheme; `Bearer` is also accepted).
 * Returns `undefined` when no header is sent; throws 401 when one is sent but is not valid,
 * including a well-formed token for a user that no longer exists.
 */
async function authenticate(req: Request): Promise<number | undefined> {
  const header = req.get('authorization');
  if (!header) return undefined;

  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (!token || rest.length > 0 || !/^(token|bearer)$/i.test(scheme ?? '')) {
    throw unauthorized('is invalid');
  }

  const userId = verifyToken(token);
  if (userId === null || !(await usersRepository.existsById(userId))) {
    throw unauthorized('is invalid');
  }
  return userId;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const userId = await authenticate(req);
  if (userId === undefined) throw unauthorized('is missing');
  req.userId = userId;
  next();
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  req.userId = await authenticate(req);
  next();
};

/** For handlers mounted behind `requireAuth`. */
export function currentUserId(req: Request): number {
  if (req.userId === undefined) throw unauthorized('is missing');
  return req.userId;
}
