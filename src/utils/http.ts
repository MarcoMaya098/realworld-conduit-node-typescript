/** Typed accessors for request data that the middleware has already checked. */

import type { Request } from 'express';
import { UnauthorizedError } from './errors';

/** The authenticated user's id, for handlers mounted behind `requireAuth`. */
export function currentUserId(req: Request): number {
  if (req.userId === undefined) throw UnauthorizedError.token('is missing');
  return req.userId;
}

/** Express 5 types path params as `string | string[] | undefined` once middleware is chained. */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') throw new Error(`Route is missing path parameter "${name}"`);
  return value;
}

/** The body as parsed by `validate({ body })`; `T` is the matching type in types/. */
export function validatedBody<T>(req: Request): T {
  return req.body as T;
}

/** The query string as parsed by `validate({ query })`. Fails loudly if the route forgot it. */
export function validatedQuery<T>(req: Request): T {
  if (req.validatedQuery === undefined) throw new Error('Route is missing validate({ query })');
  return req.validatedQuery as T;
}
