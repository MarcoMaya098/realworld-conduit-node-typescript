/**
 * Custom error classes. Services, middleware and validation throw these; the global error
 * handler (middleware/error-handler.ts) answers with `statusCode` and renders `errors` as the
 * RealWorld body: `{ "errors": { "<field or resource>": ["message", ...] } }`.
 */

export type ErrorBody = Record<string, string[]>;

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly errors: ErrorBody,
    /** Expected failures (bad input, missing resource...) as opposed to bugs. */
    readonly isOperational = true,
  ) {
    super(`HTTP ${statusCode}: ${JSON.stringify(errors)}`);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, new.target);
  }
}

/** 422: the spec's status for invalid input. */
export class ValidationError extends AppError {
  constructor(errors: ErrorBody) {
    super(422, errors);
  }
}

/** 401: `{ token: ["is missing" | "is invalid"] }`, or `{ credentials: ["invalid"] }` on login. */
export class UnauthorizedError extends AppError {
  constructor(errors: ErrorBody) {
    super(401, errors);
  }

  static token(reason: 'is missing' | 'is invalid'): UnauthorizedError {
    return new UnauthorizedError({ token: [reason] });
  }

  static credentials(): UnauthorizedError {
    return new UnauthorizedError({ credentials: ['invalid'] });
  }
}

/** 403. `resource` is the error key the spec expects: `article`, `comment`, `profile`. */
export class ForbiddenError extends AppError {
  constructor(resource: string) {
    super(403, { [resource]: ['forbidden'] });
  }
}

/** 404. `resource` is the error key the spec expects: `article`, `comment`, `profile`. */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, { [resource]: ['not found'] });
  }
}

/** 409: unique fields (username, email) already in use. */
export class ConflictError extends AppError {
  constructor(fields: string[]) {
    super(409, Object.fromEntries(fields.map((field) => [field, ['has already been taken']])));
  }
}

/** 429: rate limit exceeded. */
export class TooManyRequestsError extends AppError {
  constructor() {
    super(429, { requests: ['too many, try again later'] });
  }
}
