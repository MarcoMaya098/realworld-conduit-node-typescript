import supertest from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { api, createArticle, registerUser, resetDatabase } from '../helpers';

beforeEach(resetDatabase);

describe('GET /api/health', () => {
  it('reports the service and database as up', async () => {
    const res = await api.get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
    expect(res.body.uptimeSeconds).toEqual(expect.any(Number));
  });
});

describe('request ids', () => {
  it('generates one per request and echoes a well-formed incoming id', async () => {
    const generated = await api.get('/api/tags').expect(200);
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const echoed = await api.get('/api/tags').set('X-Request-Id', 'trace-123').expect(200);
    expect(echoed.headers['x-request-id']).toBe('trace-123');
  });

  it('replaces an id that could inject garbage into the logs', async () => {
    const res = await api.get('/api/tags').set('X-Request-Id', 'bad id\twith spaces').expect(200);
    expect(res.headers['x-request-id']).not.toBe('bad id\twith spaces');
  });
});

describe('auth rate limiting', () => {
  // Fresh app per test: each one gets its own in-memory limiter store.
  const limitedApi = () =>
    supertest(createApp({ authRateLimit: { windowMs: 60_000, registerMax: 2, loginFailuresMax: 2 } }));

  const newUser = (name: string) => ({ user: { username: name, email: `${name}@test.com`, password: 'password123' } });
  const credentials = (email: string, password: string) => ({ user: { email, password } });

  it('caps registrations per IP with a RealWorld-style 429 and RateLimit headers', async () => {
    const client = limitedApi();
    await client.post('/api/users').send(newUser('u1')).expect(201);
    await client.post('/api/users').send(newUser('u2')).expect(201);

    const blocked = await client.post('/api/users').send(newUser('u3')).expect(429);
    expect(blocked.body).toEqual({ errors: { requests: ['too many, try again later'] } });
    expect(blocked.headers).toHaveProperty('ratelimit');
    expect(blocked.headers).toHaveProperty('retry-after');
  });

  it('only counts failed logins, per account', async () => {
    await registerUser('jake');
    await registerUser('anna');
    const client = limitedApi();

    // Successful logins never consume the budget.
    for (let i = 0; i < 3; i++) {
      await client.post('/api/users/login').send(credentials('jake@test.com', 'password123')).expect(200);
    }

    await client.post('/api/users/login').send(credentials('jake@test.com', 'wrong-1')).expect(401);
    await client.post('/api/users/login').send(credentials('jake@test.com', 'wrong-2')).expect(401);
    // Budget for jake is spent: even the right password is refused now.
    await client.post('/api/users/login').send(credentials('jake@test.com', 'password123')).expect(429);
    // Same email in different case is the same account.
    await client.post('/api/users/login').send(credentials('JAKE@test.com', 'password123')).expect(429);

    // Another account from the same IP is unaffected.
    await client.post('/api/users/login').send(credentials('anna@test.com', 'password123')).expect(200);
  });

  it('does not throttle other endpoints', async () => {
    const client = limitedApi();
    for (let i = 0; i < 5; i++) await client.get('/api/tags').expect(200);
  });
});

describe('compression', () => {
  it('gzips large responses for clients that accept it, and leaves small ones alone', async () => {
    const token = await registerUser('writer');
    const { slug } = await createArticle(token, { title: 'Long read', body: 'lorem ipsum '.repeat(500) });

    const large = await api.get(`/api/articles/${slug}`).set('Accept-Encoding', 'gzip').expect(200);
    expect(large.headers['content-encoding']).toBe('gzip');
    expect(large.body.article.body).toBe('lorem ipsum '.repeat(500).trim());

    const small = await api.get('/api/tags').set('Accept-Encoding', 'gzip').expect(200);
    expect(small.headers['content-encoding']).toBeUndefined();
  });
});
