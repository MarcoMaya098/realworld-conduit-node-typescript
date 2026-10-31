import jwt from 'jsonwebtoken';
import { config } from '../config';

// The token identifies the user by id, so it stays valid after a username/email change.
// Issuer and audience are pinned so a token minted for another service with the same
// secret is not accepted here.
export function signToken(userId: number): string {
  return jwt.sign({}, config.jwtSecret, {
    subject: String(userId),
    expiresIn: config.jwtExpiresInSeconds,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    algorithm: 'HS256',
  });
}

/** Returns the user id, or `null` if the token is malformed, tampered with, foreign or expired. */
export function verifyToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
    const userId = typeof payload === 'object' ? Number(payload.sub) : NaN;
    return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}
