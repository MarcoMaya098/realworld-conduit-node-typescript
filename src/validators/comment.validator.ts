/**
 * VALIDATION layer for comments: the request body (body required, sanitised, capped) and the
 * comment id from the URL (a non-numeric id simply matches nothing).
 */

import { z } from 'zod';
import { orEmpty, requiredString } from '../utils/validation';

const COMMENT_MAX = 10_000;

export const createCommentSchema = orEmpty(
  z.object({
    comment: orEmpty(z.object({ body: requiredString(COMMENT_MAX) })),
  }),
);

/** A non-numeric id cannot match any comment, so it is a 404 rather than a 422. */
export function parseCommentId(raw: string): number | null {
  const id = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(id) ? id : null;
}
