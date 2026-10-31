/** Adds the authenticated user's id to Express's Request (set by the auth middleware). */

declare namespace Express {
  interface Request {
    /** Id of the authenticated user, set by `requireAuth` / `optionalAuth`. */
    userId?: number;
  }
}
