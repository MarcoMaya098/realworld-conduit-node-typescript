/**
 * Last stop for every error. Maps each DomainError kind to its status code, and converts
 * malformed JSON (422) and unique-constraint races (409) too, always with the RealWorld body
 * {"errors": {...}}. Anything else is logged with the request id and answered with a generic
 * 500, so no stack trace or internals reach the client. Also provides the 404 for unknown routes.
 */

import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { alreadyTaken, DomainError, type DomainErrorKind, type ErrorBody, invalid, notFound } from '../domain/errors';

const STATUS: Record<DomainErrorKind, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  invalid: 422,
};

export const routeNotFound: RequestHandler = () => {
  throw notFound('route');
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const known = toResponse(err);
  if (known) {
    res.status(known.status).json({ errors: known.errors });
    return;
  }
  req.log.error({ err }, 'unhandled error');
  res.status(500).json({ errors: { server: ['internal error'] } });
};

function toResponse(err: unknown): { status: number; errors: ErrorBody } | undefined {
  const domainError = toDomainError(err);
  if (domainError) return { status: STATUS[domainError.kind], errors: domainError.errors };

  // Other body-parser failures (payload too large, bad charset...) keep their own status.
  if (isBodyParserError(err)) return { status: err.status, errors: { body: ['is invalid'] } };
  return undefined;
}

function toDomainError(err: unknown): DomainError | undefined {
  if (err instanceof DomainError) return err;

  // Malformed JSON from express.json(): the spec reserves 422 for invalid input.
  if (isBodyParserError(err) && err.type === 'entity.parse.failed') {
    return invalid({ body: ['is not valid JSON'] });
  }

  // Unique constraint lost to a concurrent request between the service's check and the insert.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = err.meta?.target;
    const fields = Array.isArray(target) ? target.map(String) : ['resource'];
    return alreadyTaken(fields);
  }
  return undefined;
}

function isBodyParserError(err: unknown): err is { type: string; status: number } {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { type?: unknown }).type === 'string' &&
    typeof (err as { status?: unknown }).status === 'number'
  );
}
