/**
 * DOMAIN errors. Services and validation throw these; they know nothing about HTTP.
 * The error handler (src/middleware/error-handler.ts) maps each kind to a status code and
 * renders `errors` as the RealWorld body: `{ "errors": { "<field or resource>": [...] } }`.
 */

export type ErrorBody = Record<string, string[]>;

export type DomainErrorKind = 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict' | 'invalid';

export class DomainError extends Error {
  constructor(
    readonly kind: DomainErrorKind,
    readonly errors: ErrorBody,
  ) {
    super(`${kind}: ${JSON.stringify(errors)}`);
  }
}

export const unauthenticated = (reason: 'is missing' | 'is invalid') =>
  new DomainError('unauthenticated', { token: [reason] });

export const invalidCredentials = () => new DomainError('unauthenticated', { credentials: ['invalid'] });

/** `resource` is the error key the spec expects: `article`, `comment`, `profile`. */
export const forbidden = (resource: string) => new DomainError('forbidden', { [resource]: ['forbidden'] });

export const notFound = (resource: string) => new DomainError('not_found', { [resource]: ['not found'] });

export const alreadyTaken = (fields: string[]) =>
  new DomainError('conflict', Object.fromEntries(fields.map((f) => [f, ['has already been taken']])));

export const invalid = (errors: ErrorBody) => new DomainError('invalid', errors);
