/**
 * Validation middleware: checks the request against Zod schemas (validators/) before the
 * controller runs. On success the parsed, sanitised value replaces `req.body` (and is stored
 * in `req.validatedQuery` for the query string); on failure it throws a 422 ValidationError
 * with the RealWorld body. Mount it after the auth middleware so a missing token is a 401.
 */

import type { RequestHandler } from 'express';
import type { ValidationSchemas } from '../types/validation.types';
import { parse } from '../utils/validation';

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    if (schemas.body) req.body = parse(schemas.body, req.body);
    if (schemas.query) req.validatedQuery = parse(schemas.query, req.query);
    next();
  };
}
