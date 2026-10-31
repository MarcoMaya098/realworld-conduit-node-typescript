/**
 * PasswordHasher implemented with scrypt from node:crypto (no native dependency, no 72-byte
 * truncation like bcrypt). Stored format: `scrypt$<salt b64>$<key b64>`.
 */

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasher } from '../types/security.types';

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** Hash compared against when the account is unknown, so both login failures take similar time. */
const DUMMY_HASH = `scrypt$${randomBytes(16).toString('base64')}$${randomBytes(KEY_LENGTH).toString('base64')}`;

export class ScryptPasswordService implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await scrypt(password, salt, KEY_LENGTH);
    return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
  }

  async verify(password: string, stored: string | undefined): Promise<boolean> {
    const matches = await this.compare(password, stored ?? DUMMY_HASH);
    return stored !== undefined && matches;
  }

  private async compare(password: string, stored: string): Promise<boolean> {
    const [algorithm, salt, key] = stored.split('$');
    if (algorithm !== 'scrypt' || !salt || !key) return false;
    const expected = Buffer.from(key, 'base64');
    const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length);
    return timingSafeEqual(actual, expected);
  }
}
