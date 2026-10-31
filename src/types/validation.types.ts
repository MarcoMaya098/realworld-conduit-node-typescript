/** Types for the validation middleware. */

import type { z } from 'zod';

/** Which parts of the request `validate()` checks, each with its Zod schema. */
export interface ValidationSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
}
