import { z } from 'zod';
import {
  atLeastOneField,
  BLANK,
  nonBlankString,
  nullableHttpUrl,
  nullableText,
  orEmpty,
  requiredString,
} from '../../lib/validation';

// Pragmatic check (something@something.tld); deliverability is not verified.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254; // RFC 5321 path limit

// Usernames end up in URLs (/profiles/:username): letters (any script), digits, ".", "_", "-".
const USERNAME_PATTERN = /^[\p{L}\p{N}._-]*$/u;
const USERNAME_MAX = 40;
const USERNAME_CHARSET = 'can only contain letters, numbers, ".", "_" and "-"';

// NIST SP 800-63B: at least 8 characters, accept at least 64, no composition rules.
// Upper bound only to cap hashing cost. Passwords are never trimmed or otherwise altered.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 256;

const BIO_MAX = 1000;
const IMAGE_URL_MAX = 2048;

const isEmail = (value: string) => value === '' || EMAIL_PATTERN.test(value);

const username = () => requiredString(USERNAME_MAX).regex(USERNAME_PATTERN, USERNAME_CHARSET);
const email = () => requiredString(EMAIL_MAX).refine(isEmail, 'is invalid');

const password = () =>
  z
    .string({ error: (issue) => (issue.input == null ? BLANK : 'must be a string') })
    .min(1, BLANK)
    .refine((v) => v.length === 0 || v.length >= PASSWORD_MIN, `is too short (minimum is ${PASSWORD_MIN} characters)`)
    .refine((v) => v.length <= PASSWORD_MAX, `is too long (maximum is ${PASSWORD_MAX} characters)`);

export const registerSchema = orEmpty(
  z.object({
    user: orEmpty(
      z.object({
        username: username(),
        email: email(),
        password: password(),
      }),
    ),
  }),
);

export const loginSchema = orEmpty(
  z.object({
    user: orEmpty(
      z.object({
        email: requiredString(EMAIL_MAX),
        // Only presence is checked on login: policy changes must not lock out existing users.
        password: z
          .string({ error: (issue) => (issue.input == null ? BLANK : 'must be a string') })
          .min(1, BLANK)
          .max(PASSWORD_MAX, `is too long (maximum is ${PASSWORD_MAX} characters)`),
      }),
    ),
  }),
);

export const updateUserSchema = orEmpty(
  z.object({
    user: orEmpty(
      z
        .object({
          username: username().optional(),
          email: nonBlankString(EMAIL_MAX).refine((v) => v === undefined || isEmail(v), 'is invalid'),
          password: password().optional(),
          bio: nullableText(BIO_MAX),
          image: nullableHttpUrl(IMAGE_URL_MAX),
        })
        .refine(atLeastOneField, 'must contain at least one field'),
    ),
  }),
);

export type RegisterInput = z.output<typeof registerSchema>['user'];
export type LoginInput = z.output<typeof loginSchema>['user'];
export type UpdateUserInput = z.output<typeof updateUserSchema>['user'];
