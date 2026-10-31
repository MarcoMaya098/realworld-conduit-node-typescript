import supertest from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

export const api = supertest(createApp());

/** Deleting users cascades to follows, articles, article tags, favorites and comments. */
export async function resetDatabase(): Promise<void> {
  await prisma.user.deleteMany();
  await prisma.tag.deleteMany();
}

export async function registerUser(username: string): Promise<string> {
  const res = await api
    .post('/api/users')
    .send({ user: { username, email: `${username}@test.com`, password: 'password123' } })
    .expect(201);
  return res.body.user.token as string;
}

export const auth = (token: string) => ({ Authorization: `Token ${token}` });

export async function createArticle(
  token: string,
  article: { title: string; description?: string; body?: string; tagList?: string[] },
): Promise<{ slug: string } & Record<string, unknown>> {
  const res = await api
    .post('/api/articles')
    .set(auth(token))
    .send({ article: { description: 'description', body: 'body', ...article } })
    .expect(201);
  return res.body.article;
}
