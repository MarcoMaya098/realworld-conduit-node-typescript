import supertest from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { type AppOptions, createApp } from '../../src/app';
import { api, auth, registerUser, resetDatabase } from '../helpers';

beforeEach(resetDatabase);

const client = (overrides: Partial<AppOptions>) => supertest(createApp(overrides));

describe('security headers (helmet)', () => {
  it('sets the hardening headers and hides the framework', async () => {
    const res = await api.get('/api/tags').expect(200);
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });

  it('only asks browsers to upgrade to https when HTTPS is enforced', async () => {
    const dev = await api.get('/api/tags').expect(200);
    expect(dev.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');

    const prod = await client({ requireHttps: true, trustProxyHops: 1 })
      .get('/api/tags')
      .set('X-Forwarded-Proto', 'https')
      .expect(200);
    expect(prod.headers['content-security-policy']).toContain('upgrade-insecure-requests');
  });
});

describe('strict CORS', () => {
  const app = () => client({ corsOrigins: ['https://conduit.example'] });

  it('allows a listed origin, without credentials', async () => {
    const res = await app().get('/api/tags').set('Origin', 'https://conduit.example').expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://conduit.example');
    expect(res.headers).not.toHaveProperty('access-control-allow-credentials');
  });

  it('gives an unlisted origin no CORS headers, so the browser blocks it', async () => {
    const res = await app().get('/api/tags').set('Origin', 'https://evil.example').expect(200);
    expect(res.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('only allows the API’s methods and headers in preflight', async () => {
    const res = await app()
      .options('/api/articles')
      .set('Origin', 'https://conduit.example')
      .set('Access-Control-Request-Method', 'PUT')
      .expect(204);
    expect(res.headers['access-control-allow-methods']).toBe('GET,POST,PUT,DELETE');
    expect(res.headers['access-control-allow-headers']).toBe('Content-Type,Authorization,X-Request-Id');
  });

  it('defaults to any localhost port outside production', async () => {
    const res = await api.get('/api/tags').set('Origin', 'http://localhost:4200').expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4200');
    const lookalike = await api.get('/api/tags').set('Origin', 'http://localhost.evil.example').expect(200);
    expect(lookalike.headers).not.toHaveProperty('access-control-allow-origin');
  });
});

describe('HTTPS required', () => {
  const app = () => client({ requireHttps: true, trustProxyHops: 1 });

  it('redirects plain-HTTP reads to https', async () => {
    const res = await app().get('/api/tags?x=1').set('Host', 'api.example').expect(301);
    expect(res.headers.location).toBe('https://api.example/api/tags?x=1');
  });

  it('refuses plain-HTTP writes instead of redirecting them', async () => {
    const res = await app()
      .post('/api/users/login')
      .send({ user: { email: 'a@b.co', password: 'password123' } })
      .expect(403);
    expect(res.body).toEqual({ errors: { https: ['required'] } });
  });

  it('accepts requests a trusted proxy received over TLS', async () => {
    await app().get('/api/tags').set('X-Forwarded-Proto', 'https').expect(200);
  });

  it('keeps the health check reachable for internal load balancers', async () => {
    await app().get('/api/health').expect(200);
  });
});

describe('API docs', () => {
  it('can be switched off (the production default)', async () => {
    await client({ docsEnabled: false }).get('/api/docs/').expect(404);
    await client({ docsEnabled: true }).get('/api/docs/').expect(200);
  });
});

describe('input sanitising, end to end', () => {
  it('strips control characters and stores plain text otherwise untouched', async () => {
    const token = await registerUser('jake');
    const res = await api
      .post('/api/articles')
      .set(auth(token))
      .send({
        article: {
          title: 'Hello\u0000 World\u0007',
          description: 'd',
          body: '<script>alert(1)</script>\n**markdown** stays',
        },
      })
      .expect(201);
    expect(res.body.article.title).toBe('Hello World');
    // Not HTML-escaped on the way in: output encoding is the client's job.
    expect(res.body.article.body).toBe('<script>alert(1)</script>\n**markdown** stays');
  });

  it('rejects a javascript: image URL', async () => {
    const token = await registerUser('jake');
    const res = await api
      .put('/api/user')
      .set(auth(token))
      .send({ user: { image: 'javascript:alert(1)' } })
      .expect(422);
    expect(res.body).toEqual({ errors: { image: ['must be an http(s) URL'] } });
  });

  it('ignores unknown fields such as an attempt to set the author or the hash', async () => {
    const token = await registerUser('jake');
    await registerUser('anna');
    const res = await api
      .post('/api/articles')
      .set(auth(token))
      .send({ article: { title: 't', description: 'd', body: 'b', authorId: 2, author: { username: 'anna' } } })
      .expect(201);
    expect(res.body.article.author.username).toBe('jake');
  });
});
