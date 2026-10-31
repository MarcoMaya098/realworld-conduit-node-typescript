/**
 * Last stop for every error. Converts HttpError, malformed JSON (422) and unique-constraint
 * races (409) into the RealWorld body {"errors": {...}}. Anything else is logged with the
 * request id and answered with a generic 500, so no stack trace or internals reach the
 * client. Also provides the 404 for unknown routes.
 */

import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { alreadyTaken, HttpError, notFound, unprocessable } from '../errors';

export const routeNotFound: RequestHandler = () => {
  throw notFound('route');
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const httpError = toHttpError(err);
  if (httpError) {
    res.status(httpError.status).json({ errors: httpError.errors });
    return;
  }
  req.log.error({ err }, 'unhandled error');
  res.status(500).json({ errors: { server: ['internal error'] } });
};

function toHttpError(err: unknown): HttpError | undefined {
  if (err instanceof HttpError) return err;

  // Malformed JSON from express.json(): the spec reserves 422 for invalid input.
  if (isBodyParserError(err)) {
    if (err.type === 'entity.parse.failed') return unprocessable({ body: ['is not valid JSON'] });
    return new HttpError(err.status, { body: ['is invalid'] });
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
