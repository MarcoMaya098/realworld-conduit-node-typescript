/**
 * Interfaces for credentials: password hashing and access tokens. The services depend on
 * these interfaces; the scrypt and JWT implementations are services/password.service.ts
 * and services/token.service.ts.
 */

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  /**
   * `stored` is undefined when the account does not exist: implementations must still spend
   * the same time hashing, so a failed login does not reveal which emails are registered.
   */
  verify(password: string, stored: string | undefined): Promise<boolean>;
}

export interface TokenService {
  sign(userId: number): string;
  /** The user id, or null if the token is malformed, tampered with, foreign or expired. */
  verify(token: string): number | null;
}
