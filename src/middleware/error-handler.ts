/**
 * Global error handler: the last stop for every error. AppError subclasses answer with their
 * own statusCode; malformed JSON (422) and unique-constraint races (409) are converted to
 * AppErrors first. The body is always the RealWorld format {"errors": {...}}. Anything else is
 * a bug: it is logged with the request id and answered with a generic 500, so no stack trace
 * or internals reach the client. Also provides the 404 for unknown routes.
 */

import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export const routeNotFound: RequestHandler = () => {
  throw new NotFoundError('route');
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = toAppError(err);
  if (appError) {
    res.status(appError.statusCode).json({ errors: appError.errors });
    return;
  }
  req.log.error({ err }, 'unhandled error');
  res.status(500).json({ errors: { server: ['internal error'] } });
};

function toAppError(err: unknown): AppError | undefined {
  if (err instanceof AppError) return err;

  // body-parser failures: malformed JSON is invalid input (422 in the spec); others (payload
  // too large, bad charset...) keep their own status.
  if (isBodyParserError(err)) {
    if (err.type === 'entity.parse.failed') return new ValidationError({ body: ['is not valid JSON'] });
    return new AppError(err.status, { body: ['is invalid'] });
  }

  // Unique constraint lost to a concurrent request between the service's check and the insert.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = err.meta?.target;
    return new ConflictError(Array.isArray(target) ? target.map(String) : ['resource']);
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
