import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, registerUser, resetDatabase } from '../helpers';

beforeEach(resetDatabase);

describe('POST /api/users', () => {
  it('returns exactly the User shape, without the password hash', async () => {
    const res = await api
      .post('/api/users')
      .send({ user: { username: 'jake', email: 'jake@jake.jake', password: 'jakejake' } })
      .expect(201)
      .expect('Content-Type', /application\/json; charset=utf-8/);

    expect(Object.keys(res.body.user).sort()).toEqual(['bio', 'email', 'image', 'token', 'username']);
    expect(res.body.user).toMatchObject({ username: 'jake', email: 'jake@jake.jake', bio: null, image: null });
  });

  it('reports both conflicting fields at once', async () => {
    await registerUser('jake');
    const res = await api
      .post('/api/users')
      .send({ user: { username: 'jake', email: 'jake@test.com', password: 'password123' } })
      .expect(409);
    expect(res.body).toEqual({
      errors: { username: ['has already been taken'], email: ['has already been taken'] },
    });
  });

  it('answers malformed JSON with a 422 in the RealWorld error format', async () => {
    const res = await api.post('/api/users').set('Content-Type', 'application/json').send('{"user":').expect(422);
    expect(res.body).toEqual({ errors: { body: ['is not valid JSON'] } });
  });
});

describe('POST /api/users/login', () => {
  it('gives the same 401 for an unknown email and a wrong password', async () => {
    await registerUser('jake');
    const unknown = await api
      .post('/api/users/login')
      .send({ user: { email: 'nobody@test.com', password: 'password123' } })
      .expect(401);
    const wrong = await api
      .post('/api/users/login')
      .send({ user: { email: 'jake@test.com', password: 'wrong-password' } })
      .expect(401);
    expect(unknown.body).toEqual({ errors: { credentials: ['invalid'] } });
    expect(wrong.body).toEqual(unknown.body);
  });
});

describe('authentication', () => {
  it('distinguishes a missing token from an invalid one', async () => {
    expect((await api.get('/api/user').expect(401)).body).toEqual({ errors: { token: ['is missing'] } });
    expect((await api.get('/api/user').set(auth('garbage')).expect(401)).body).toEqual({
      errors: { token: ['is invalid'] },
    });
    expect((await api.get('/api/user').set('Authorization', 'Basic abc').expect(401)).body).toEqual({
      errors: { token: ['is invalid'] },
    });
  });

  it('accepts the Bearer scheme as well as Token', async () => {
    const token = await registerUser('jake');
    await api.get('/api/user').set('Authorization', `Bearer ${token}`).expect(200);
  });

  it('rejects an invalid token even on endpoints where auth is optional', async () => {
    await api.get('/api/articles').set(auth('garbage')).expect(401);
  });
});

describe('PUT /api/user', () => {
  it('keeps old tokens valid after a username change (tokens carry the user id)', async () => {
    const token = await registerUser('jake');
    await api.put('/api/user').set(auth(token)).send({ user: { username: 'jacob' } }).expect(200);
    const res = await api.get('/api/user').set(auth(token)).expect(200);
    expect(res.body.user.username).toBe('jacob');
  });

  it('changes the password used to log in', async () => {
    const token = await registerUser('jake');
    await api.put('/api/user').set(auth(token)).send({ user: { password: 'new-password' } }).expect(200);
    await api
      .post('/api/users/login')
      .send({ user: { email: 'jake@test.com', password: 'password123' } })
      .expect(401);
    await api
      .post('/api/users/login')
      .send({ user: { email: 'jake@test.com', password: 'new-password' } })
      .expect(200);
  });

  it('rejects taking another user’s email, but allows re-sending your own', async () => {
    const token = await registerUser('jake');
    await registerUser('anna');
    await api.put('/api/user').set(auth(token)).send({ user: { email: 'anna@test.com' } }).expect(409);
    await api.put('/api/user').set(auth(token)).send({ user: { email: 'jake@test.com' } }).expect(200);
  });
});

describe('unknown routes', () => {
  it('return 404 in the RealWorld error format', async () => {
    expect((await api.get('/api/nope').expect(404)).body).toEqual({ errors: { route: ['not found'] } });
  });
});
