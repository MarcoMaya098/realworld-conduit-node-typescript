import type { Request } from 'express';

/** Express 5 types path params as `string | string[] | undefined` once middleware is chained. */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') throw new Error(`Route is missing path parameter "${name}"`);
  return value;
}
