/** Fields the middleware adds to Express's Request. */

declare namespace Express {
  interface Request {
    /** Id of the authenticated user, set by `requireAuth` / `optionalAuth`. */
    userId?: number;
    /** Parsed query string, set by `validate({ query })` (Express 5's `req.query` is read-only). */
    validatedQuery?: unknown;
  }
}
