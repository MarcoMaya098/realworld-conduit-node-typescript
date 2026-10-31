/** RealWorld error body: `{ "errors": { "<field or resource>": ["message", ...] } }`. */
export type ErrorBody = Record<string, string[]>;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly errors: ErrorBody,
  ) {
    super(`HTTP ${status}: ${JSON.stringify(errors)}`);
  }
}

export const unauthorized = (reason: 'is missing' | 'is invalid') =>
  new HttpError(401, { token: [reason] });

export const invalidCredentials = () => new HttpError(401, { credentials: ['invalid'] });

/** `resource` is the error key the spec expects: `article`, `comment`, `profile`. */
export const forbidden = (resource: string) => new HttpError(403, { [resource]: ['forbidden'] });

export const notFound = (resource: string) => new HttpError(404, { [resource]: ['not found'] });

export const alreadyTaken = (fields: string[]) =>
  new HttpError(409, Object.fromEntries(fields.map((f) => [f, ['has already been taken']])));

export const unprocessable = (errors: ErrorBody) => new HttpError(422, errors);
