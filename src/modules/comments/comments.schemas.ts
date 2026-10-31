import { z } from 'zod';
import { orEmpty, requiredString } from '../../lib/validation';

const COMMENT_MAX = 10_000;

export const createCommentSchema = orEmpty(
  z.object({
    comment: orEmpty(z.object({ body: requiredString(COMMENT_MAX) })),
  }),
);

export type CreateCommentInput = z.output<typeof createCommentSchema>['comment'];

/** A non-numeric id cannot match any comment, so it is a 404 rather than a 422. */
export function parseCommentId(raw: string): number | null {
  const id = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(id) ? id : null;
}
