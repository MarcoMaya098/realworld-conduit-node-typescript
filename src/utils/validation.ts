import { z } from 'zod';
import { type ErrorBody, ValidationError } from './errors';

export const BLANK = "can't be blank";
export const tooLong = (max: number) => `is too long (maximum is ${max} characters)`;

/**
 * Validates `input` and returns the parsed value, or throws a 422 whose body
 * follows the RealWorld error format.
 */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(toErrorBody(result.error));
  }
  return result.data;
}

export function toErrorBody(error: z.ZodError): ErrorBody {
  const body: ErrorBody = {};
  for (const issue of error.issues) {
    const key = fieldKey(issue.path);
    const messages = (body[key] ??= []);
    if (!messages.includes(issue.message)) messages.push(issue.message);
  }
  return body;
}

/**
 * Errors are keyed by field name, not by full path: `user.email` -> `email`,
 * `article.tagList[2]` -> `tagList`, `limit` (query) -> `limit`.
 */
function fieldKey(path: PropertyKey[]): string {
  const names = path.filter((segment): segment is string => typeof segment === 'string');
  return names[1] ?? names[0] ?? 'body';
}

// --- Sanitising -------------------------------------------------------------------------
//
// Input is validated and normalised here; it is NOT HTML-escaped. The API returns JSON and
// article bodies are Markdown, so escaping on the way in would corrupt data (and double-
// escape in the client). Escaping on output is the frontend's job; what the backend
// guarantees is well-formed, bounded, plain text: no control characters, no unknown keys
// (Zod strips them), every string length-capped, and URLs restricted to http(s).

// C0 control characters and DEL, except tab, line feed and carriage return.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const stripControlChars = (value: string) => value.replace(CONTROL_CHARS, '');

const stringError = (issue: { input?: unknown }) => (issue.input == null ? BLANK : 'must be a string');

/** Sanitised text: control characters removed, then trimmed. */
const text = () => z.string({ error: stringError }).overwrite(stripControlChars).trim();

/** Required, non-blank text up to `max` characters. Missing or null also reads as blank. */
export const requiredString = (max: number) => text().min(1, BLANK).max(max, tooLong(max));

/** Optional on update, but when present it must be non-blank (null is rejected). */
export const nonBlankString = (max: number) => requiredString(max).optional();

/** Nullable profile text (bio): `""` is normalised to `null`. */
export const nullableText = (max: number) =>
  text()
    .max(max, tooLong(max))
    .nullable()
    .optional()
    .transform((value) => (value === '' ? null : value));

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Nullable URL (image). Blocks `javascript:`, `data:` and other schemes a client might render. */
export const nullableHttpUrl = (max: number) =>
  nullableText(max).refine((value) => value == null || isHttpUrl(value), 'must be an http(s) URL');

/** Query-string filter: `?tag=` (empty) means "no filter". */
export const filterParam = (max: number) =>
  text()
    .max(max, tooLong(max))
    .optional()
    .transform((value) => value || undefined);

/** Treats a missing or null JSON value as `{}` so field-level errors are reported. */
export const orEmpty = <T extends z.ZodType>(schema: T) => z.preprocess((value) => value ?? {}, schema);

export const atLeastOneField = (value: Record<string, unknown>) =>
  Object.values(value).some((field) => field !== undefined);
