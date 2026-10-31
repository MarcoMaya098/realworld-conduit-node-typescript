import { describe, expect, it } from 'vitest';
import { AppError, ValidationError } from '../../src/utils/errors';
import { parse } from '../../src/utils/validation';
import {
  createArticleSchema,
  listArticlesQuerySchema,
  normalizeTags,
  updateArticleSchema,
} from '../../src/validators/article.validator';
import { registerSchema, updateUserSchema } from '../../src/validators/user.validator';

/** Runs `parse` and returns the RealWorld error body it throws. */
function errorsOf(schema: Parameters<typeof parse>[0], input: unknown) {
  try {
    parse(schema, input);
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as AppError).statusCode).toBe(422);
    return (err as AppError).errors;
  }
  throw new Error('expected validation to fail');
}

describe('registerSchema', () => {
  it('reports every blank field, keyed by field name', () => {
    expect(errorsOf(registerSchema, { user: { username: ' ', email: '', password: '' } })).toEqual({
      username: ["can't be blank"],
      email: ["can't be blank"],
      password: ["can't be blank"],
    });
  });

  it('treats a missing body or wrapper as blank fields', () => {
    expect(Object.keys(errorsOf(registerSchema, undefined))).toEqual(['username', 'email', 'password']);
    expect(Object.keys(errorsOf(registerSchema, { user: null }))).toEqual(['username', 'email', 'password']);
  });

  it('validates email shape and the password policy', () => {
    const errors = errorsOf(registerSchema, { user: { username: 'u', email: 'nope', password: 'short' } });
    expect(errors).toEqual({
      email: ['is invalid'],
      password: ['is too short (minimum is 8 characters)'],
    });
  });

  it('trims username and email but never the password', () => {
    const { user } = parse(registerSchema, {
      user: { username: ' jake ', email: ' jake@jake.jake ', password: ' secret pw ' },
    });
    expect(user).toEqual({ username: 'jake', email: 'jake@jake.jake', password: ' secret pw ' });
  });
});

describe('updateUserSchema', () => {
  it('normalises empty bio/image to null and keeps explicit null', () => {
    const { user } = parse(updateUserSchema, { user: { bio: '', image: null } });
    expect(user).toEqual({ bio: null, image: null });
  });

  it('rejects null or blank for non-nullable fields', () => {
    expect(errorsOf(updateUserSchema, { user: { username: null } })).toHaveProperty('username');
    expect(errorsOf(updateUserSchema, { user: { email: '' } })).toHaveProperty('email');
    expect(errorsOf(updateUserSchema, { user: { password: null } })).toHaveProperty('password');
  });

  it('requires at least one field', () => {
    expect(errorsOf(updateUserSchema, { user: {} })).toEqual({ user: ['must contain at least one field'] });
  });

  it('accepts a 64-character password (NIST minimum maximum)', () => {
    expect(() => parse(updateUserSchema, { user: { password: 'a'.repeat(64) } })).not.toThrow();
  });
});

describe('article schemas', () => {
  it('normalizeTags trims, drops empties and de-duplicates keeping order', () => {
    expect(normalizeTags([' b ', 'a', '', 'b', 'c'])).toEqual(['b', 'a', 'c']);
  });

  it('rejects a null tagList but accepts an empty one', () => {
    expect(errorsOf(updateArticleSchema, { article: { tagList: null } })).toEqual({
      tagList: ['must be a list of strings'],
    });
    expect(parse(updateArticleSchema, { article: { tagList: [] } }).article.tagList).toEqual([]);
  });

  it('keys tagList element errors by the field', () => {
    const errors = errorsOf(createArticleSchema, {
      article: { title: 't', description: 'd', body: 'b', tagList: ['ok', 3] },
    });
    expect(errors).toEqual({ tagList: ['must be a list of strings'] });
  });
});

describe('sanitising', () => {
  it('removes control characters but keeps newlines and tabs', () => {
    const { article } = parse(createArticleSchema, {
      article: { title: 'A\u0000B\u001bC', description: 'd', body: 'line 1\n\tline 2\r\n' },
    });
    expect(article.title).toBe('ABC');
    expect(article.body).toBe('line 1\n\tline 2');
  });

  it('treats a value that is only control characters as blank', () => {
    expect(errorsOf(createArticleSchema, { article: { title: '\u0000\u0001', description: 'd', body: 'b' } })).toEqual({
      title: ["can't be blank"],
    });
  });

  it('caps every free-text field', () => {
    expect(errorsOf(createArticleSchema, { article: { title: 'x'.repeat(201), description: 'd', body: 'b' } })).toEqual({
      title: ['is too long (maximum is 200 characters)'],
    });
    expect(errorsOf(updateUserSchema, { user: { bio: 'x'.repeat(1001) } })).toHaveProperty('bio');
  });

  it('caps the number and length of tags', () => {
    const many = Array.from({ length: 21 }, (_, i) => `t${i}`);
    expect(errorsOf(updateArticleSchema, { article: { tagList: many } })).toEqual({
      tagList: ['is too long (maximum is 20 tags)'],
    });
    expect(errorsOf(updateArticleSchema, { article: { tagList: ['x'.repeat(51)] } })).toHaveProperty('tagList');
  });

  it('restricts usernames to URL-safe characters, in any script', () => {
    expect(errorsOf(updateUserSchema, { user: { username: 'jake/../admin' } })).toEqual({
      username: ['can only contain letters, numbers, ".", "_" and "-"'],
    });
    expect(() => parse(updateUserSchema, { user: { username: 'josé.ñandú_1' } })).not.toThrow();
  });

  it('only accepts http(s) image URLs', () => {
    for (const image of ['javascript:alert(1)', 'data:text/html,hi', 'not a url']) {
      expect(errorsOf(updateUserSchema, { user: { image } })).toEqual({ image: ['must be an http(s) URL'] });
    }
    expect(parse(updateUserSchema, { user: { image: 'https://example.com/a.png' } }).user.image).toBe(
      'https://example.com/a.png',
    );
  });

  it('drops unknown keys', () => {
    const { user } = parse(updateUserSchema, { user: { bio: 'hi', isAdmin: true, passwordHash: 'x' } });
    expect(user).toEqual({ bio: 'hi' });
  });
});

describe('listArticlesQuerySchema', () => {
  it('applies defaults and coerces query strings', () => {
    expect(parse(listArticlesQuerySchema, {})).toEqual({ limit: 20, offset: 0 });
    expect(parse(listArticlesQuerySchema, { limit: '5', offset: '10', tag: '' })).toEqual({
      limit: 5,
      offset: 10,
    });
  });

  it('rejects out-of-range or non-integer pagination', () => {
    expect(errorsOf(listArticlesQuerySchema, { limit: '0' })).toHaveProperty('limit');
    expect(errorsOf(listArticlesQuerySchema, { offset: '-1' })).toHaveProperty('offset');
    expect(errorsOf(listArticlesQuerySchema, { limit: 'ten' })).toHaveProperty('limit');
  });
});
