/**
 * TokenService implemented with HS256 JWTs. The token identifies the user by id (`sub`), so
 * it stays valid after a username/email change. Issuer and audience are pinned so a token
 * minted for another service with the same secret is not accepted here.
 */

import jwt from 'jsonwebtoken';
import type { TokenService } from '../types/security.types';
import type { JwtOptions } from '../types/app.types';

export class JwtTokenService implements TokenService {
  constructor(private readonly options: JwtOptions) {}

  sign(userId: number): string {
    return jwt.sign({}, this.options.secret, {
      subject: String(userId),
      expiresIn: this.options.expiresInSeconds,
      issuer: this.options.issuer,
      audience: this.options.audience,
      algorithm: 'HS256',
    });
  }

  verify(token: string): number | null {
    try {
      const payload = jwt.verify(token, this.options.secret, {
        algorithms: ['HS256'],
        issuer: this.options.issuer,
        audience: this.options.audience,
      });
      const userId = typeof payload === 'object' ? Number(payload.sub) : NaN;
      return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
    } catch {
      return null;
    }
  }
}
