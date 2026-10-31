import { describe, expect, it } from 'vitest';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from '../../src/utils/errors';

describe('custom error classes', () => {
  it('carry the status code and the RealWorld error body', () => {
    expect(new ValidationError({ email: ["can't be blank"] })).toMatchObject({
      statusCode: 422,
      errors: { email: ["can't be blank"] },
    });
    expect(UnauthorizedError.token('is missing')).toMatchObject({ statusCode: 401, errors: { token: ['is missing'] } });
    expect(UnauthorizedError.credentials()).toMatchObject({ statusCode: 401, errors: { credentials: ['invalid'] } });
    expect(new ForbiddenError('article')).toMatchObject({ statusCode: 403, errors: { article: ['forbidden'] } });
    expect(new NotFoundError('profile')).toMatchObject({ statusCode: 404, errors: { profile: ['not found'] } });
    expect(new ConflictError(['username', 'email'])).toMatchObject({
      statusCode: 409,
      errors: { username: ['has already been taken'], email: ['has already been taken'] },
    });
    expect(new TooManyRequestsError()).toMatchObject({ statusCode: 429 });
  });

  it('are real Error subclasses, marked as operational, with a stack and their own name', () => {
    const err = new NotFoundError('article');
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.isOperational).toBe(true);
    expect(err.name).toBe('NotFoundError');
    expect(err.stack).toContain('NotFoundError');
  });
});
