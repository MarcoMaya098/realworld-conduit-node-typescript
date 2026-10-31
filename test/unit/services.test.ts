import { describe, expect, it, vi } from 'vitest';
import type { Article, ArticleRef } from '../../src/domain/entities/article';
import type { User } from '../../src/domain/entities/user';
import { DomainError } from '../../src/domain/errors';
import type { ArticleRepository, CommentRepository, ProfileRepository, UserRepository } from '../../src/domain/repositories';
import type { PasswordHasher, TokenService } from '../../src/domain/security';
import { ArticlesService } from '../../src/services/articles.service';
import { CommentsService } from '../../src/services/comments.service';
import { ProfilesService } from '../../src/services/profiles.service';
import { UsersService } from '../../src/services/users.service';

// The services only see domain interfaces, so their rules are tested here without a database:
// each test injects hand-written fakes that implement just the methods the case needs.

const fake = <T>(methods: Partial<T>) => methods as T;

async function domainErrorOf(promise: Promise<unknown>): Promise<DomainError> {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(DomainError);
  return err as DomainError;
}

const ref: ArticleRef = { id: 7, authorId: 1, title: 'Old title' };
const article = { id: 7, slug: 'old-title' } as Article;

describe('ArticlesService', () => {
  it('returns 404 before checking ownership', async () => {
    const articles = fake<ArticleRepository>({ findRefBySlug: vi.fn().mockResolvedValue(null), update: vi.fn() });
    const err = await domainErrorOf(new ArticlesService(articles).update('missing', { body: 'x' }, 2));
    expect(err.kind).toBe('not_found');
    expect(err.errors).toEqual({ article: ['not found'] });
  });

  it('forbids updates and deletes by anyone but the author, without writing', async () => {
    const articles = fake<ArticleRepository>({
      findRefBySlug: vi.fn().mockResolvedValue(ref),
      update: vi.fn(),
      delete: vi.fn(),
    });
    const service = new ArticlesService(articles);
    expect((await domainErrorOf(service.update('old-title', { body: 'x' }, 2))).kind).toBe('forbidden');
    expect((await domainErrorOf(service.delete('old-title', 2))).kind).toBe('forbidden');
    expect(articles.update).not.toHaveBeenCalled();
    expect(articles.delete).not.toHaveBeenCalled();
  });

  it('regenerates the slug only when the title changes, and always bumps updatedAt', async () => {
    const articles = fake<ArticleRepository>({
      findRefBySlug: vi.fn().mockResolvedValue(ref),
      slugTaken: vi.fn().mockResolvedValue(false),
      update: vi.fn().mockResolvedValue(article),
    });
    const service = new ArticlesService(articles);

    await service.update('old-title', { title: 'New Title' }, 1);
    expect(articles.update).toHaveBeenLastCalledWith(
      7,
      { title: 'New Title', slug: 'new-title', updatedAt: expect.any(Date) },
      1,
    );

    await service.update('old-title', { tagList: ['a'] }, 1);
    expect(articles.update).toHaveBeenLastCalledWith(7, { tagList: ['a'], updatedAt: expect.any(Date) }, 1);
  });

  it('adds a random suffix when the slug is taken', async () => {
    const articles = fake<ArticleRepository>({
      slugTaken: vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false),
      create: vi.fn().mockResolvedValue(article),
    });
    await new ArticlesService(articles).create({ title: 'Hello', description: 'd', body: 'b' }, 1);
    expect(articles.create).toHaveBeenCalledWith(1, expect.objectContaining({ slug: expect.stringMatching(/^hello-[0-9a-f]{6}$/), tagList: [] }));
  });
});

describe('CommentsService', () => {
  it('only lets the comment author delete it', async () => {
    const articles = fake<ArticleRepository>({ findRefBySlug: vi.fn().mockResolvedValue(ref) });
    const comments = fake<CommentRepository>({
      findInArticle: vi.fn().mockResolvedValue({ id: 3, authorId: 1 }),
      delete: vi.fn(),
    });
    const service = new CommentsService(comments, articles);

    expect((await domainErrorOf(service.delete('old-title', 3, 2))).kind).toBe('forbidden');
    expect(comments.delete).not.toHaveBeenCalled();

    await service.delete('old-title', 3, 1);
    expect(comments.delete).toHaveBeenCalledWith(3);
  });

  it('treats a non-numeric comment id as not found', async () => {
    const articles = fake<ArticleRepository>({ findRefBySlug: vi.fn().mockResolvedValue(ref) });
    const comments = fake<CommentRepository>({ findInArticle: vi.fn() });
    const err = await domainErrorOf(new CommentsService(comments, articles).delete('old-title', null, 1));
    expect(err.errors).toEqual({ comment: ['not found'] });
    expect(comments.findInArticle).not.toHaveBeenCalled();
  });
});

describe('ProfilesService', () => {
  it('refuses to follow yourself', async () => {
    const profiles = fake<ProfileRepository>({
      findByUsername: vi.fn().mockResolvedValue({ id: 1, username: 'me', bio: null, image: null, following: false }),
      follow: vi.fn(),
    });
    const err = await domainErrorOf(new ProfilesService(profiles).follow('me', 1));
    expect(err.kind).toBe('invalid');
    expect(profiles.follow).not.toHaveBeenCalled();
  });
});

describe('UsersService', () => {
  const user: User = { id: 1, email: 'a@b.co', username: 'a', passwordHash: 'stored', bio: null, image: null };
  const tokens = fake<TokenService>({ sign: vi.fn().mockReturnValue('signed-token') });

  it('still verifies a password for an unknown email, then gives the same 401', async () => {
    const users = fake<UserRepository>({ findByEmail: vi.fn().mockResolvedValue(null) });
    const passwords = fake<PasswordHasher>({ verify: vi.fn().mockResolvedValue(false) });
    const err = await domainErrorOf(new UsersService(users, passwords, tokens).login({ email: 'x@y.co', password: 'p' }));
    expect(passwords.verify).toHaveBeenCalledWith('p', undefined);
    expect(err.errors).toEqual({ credentials: ['invalid'] });
  });

  it('returns the user with a signed token on a valid login', async () => {
    const users = fake<UserRepository>({ findByEmail: vi.fn().mockResolvedValue(user) });
    const passwords = fake<PasswordHasher>({ verify: vi.fn().mockResolvedValue(true) });
    const result = await new UsersService(users, passwords, tokens).login({ email: 'a@b.co', password: 'p' });
    expect(result).toEqual({ user, token: 'signed-token' });
    expect(passwords.verify).toHaveBeenCalledWith('p', 'stored');
  });

  it('reports every taken field and creates nothing', async () => {
    const users = fake<UserRepository>({ takenFields: vi.fn().mockResolvedValue(['username', 'email']), create: vi.fn() });
    const passwords = fake<PasswordHasher>({ hash: vi.fn() });
    const err = await domainErrorOf(
      new UsersService(users, passwords, tokens).register({ username: 'a', email: 'a@b.co', password: 'password1' }),
    );
    expect(err.kind).toBe('conflict');
    expect(Object.keys(err.errors)).toEqual(['username', 'email']);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('hashes a new password instead of storing it', async () => {
    const users = fake<UserRepository>({ takenFields: vi.fn().mockResolvedValue([]), update: vi.fn().mockResolvedValue(user) });
    const passwords = fake<PasswordHasher>({ hash: vi.fn().mockResolvedValue('new-hash') });
    await new UsersService(users, passwords, tokens).update(1, { password: 'new-password', bio: null });
    expect(users.update).toHaveBeenCalledWith(1, { bio: null, passwordHash: 'new-hash' });
  });
});
