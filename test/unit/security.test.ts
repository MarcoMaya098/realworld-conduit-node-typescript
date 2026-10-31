import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { signToken, verifyToken } from '../../src/lib/jwt';
import { hashPassword, verifyPassword } from '../../src/lib/password';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse');
    expect(hash).not.toContain('correct horse');
    expect(await verifyPassword('correct horse', hash)).toBe(true);
    expect(await verifyPassword('wrong horse', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('handles passwords longer than bcrypt’s 72-byte limit without truncation', async () => {
    const long = 'x'.repeat(100);
    const hash = await hashPassword(long);
    expect(await verifyPassword(`${'x'.repeat(99)}y`, hash)).toBe(false);
  });

  it('rejects a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
  });
});

describe('jwt', () => {
  it('round-trips the user id', () => {
    expect(verifyToken(signToken(42))).toBe(42);
  });

  it('rejects tampered, foreign-secret and expired tokens', () => {
    const token = signToken(42);
    expect(verifyToken(`${token}x`)).toBeNull();
    expect(verifyToken(jwt.sign({ sub: '42' }, 'other-secret'))).toBeNull();
    expect(verifyToken(jwt.sign({ sub: '42', exp: 1 }, 'test-secret'))).toBeNull();
  });

  it('rejects a token without a numeric subject', () => {
    const claims = { issuer: 'conduit-api', audience: 'conduit' };
    expect(verifyToken(jwt.sign({ sub: 'admin' }, 'test-secret', claims))).toBeNull();
  });

  it('rejects a token signed with the right secret but for another issuer or audience', () => {
    expect(verifyToken(jwt.sign({ sub: '42' }, 'test-secret', { issuer: 'other', audience: 'conduit' }))).toBeNull();
    expect(verifyToken(jwt.sign({ sub: '42' }, 'test-secret', { issuer: 'conduit-api', audience: 'other' }))).toBeNull();
    expect(verifyToken(jwt.sign({ sub: '42' }, 'test-secret'))).toBeNull();
  });

  it('rejects the "none" algorithm', () => {
    const unsigned = jwt.sign({ sub: '42' }, '', { algorithm: 'none', issuer: 'conduit-api', audience: 'conduit' });
    expect(verifyToken(unsigned)).toBeNull();
  });
});
