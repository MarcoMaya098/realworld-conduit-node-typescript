/**
 * Authentication: who is calling?
 * - requireAuth: 401 {token: ["is missing"]} without a header, 401 {token: ["is invalid"]}
 *   for a malformed, tampered, expired or orphaned token.
 * - optionalAuth: anonymous without a header, but a bad token is still a 401.
 * Both set req.userId. Authorization (may this user edit that article?) is not decided
 * here: it lives in the services, which must load the resource first (404 before 403).
 * The token service and user repository are injected by the container.
 */

import type { Request } from 'express';
import { UnauthorizedError } from '../utils/errors';
import type { UserRepository } from '../types/repository.types';
import type { TokenService } from '../types/security.types';
import type { AuthMiddleware } from '../types/container.types';

export function createAuthMiddleware(tokens: TokenService, users: UserRepository): AuthMiddleware {
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
      throw UnauthorizedError.token('is invalid');
    }

    const userId = tokens.verify(token);
    if (userId === null || !(await users.existsById(userId))) {
      throw UnauthorizedError.token('is invalid');
    }
    return userId;
  }

  return {
    requireAuth: async (req, _res, next) => {
      const userId = await authenticate(req);
      if (userId === undefined) throw UnauthorizedError.token('is missing');
      req.userId = userId;
      next();
    },

    optionalAuth: async (req, _res, next) => {
      req.userId = await authenticate(req);
      next();
    },
  };
}
