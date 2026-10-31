import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createArticle, registerUser, resetDatabase } from '../helpers';

let jake: string;
let anna: string;

beforeEach(async () => {
  await resetDatabase();
  jake = await registerUser('jake');
  anna = await registerUser('anna');
});

describe('profiles', () => {
  it('follow and unfollow are idempotent', async () => {
    await api.post('/api/profiles/anna/follow').set(auth(jake)).expect(200);
    const again = await api.post('/api/profiles/anna/follow').set(auth(jake)).expect(200);
    expect(again.body.profile.following).toBe(true);

    await api.delete('/api/profiles/anna/follow').set(auth(jake)).expect(200);
    const twice = await api.delete('/api/profiles/anna/follow').set(auth(jake)).expect(200);
    expect(twice.body.profile.following).toBe(false);
  });

  it('rejects following yourself', async () => {
    const res = await api.post('/api/profiles/jake/follow').set(auth(jake)).expect(422);
    expect(res.body).toEqual({ errors: { profile: ['cannot follow yourself'] } });
  });
});

describe('comments', () => {
  it('are listed oldest first with the viewer’s following flag', async () => {
    const { slug } = await createArticle(jake, { title: 'Discussed' });
    await api.post(`/api/articles/${slug}/comments`).set(auth(anna)).send({ comment: { body: 'first' } });
    await api.post(`/api/articles/${slug}/comments`).set(auth(jake)).send({ comment: { body: 'second' } });
    await api.post('/api/profiles/anna/follow').set(auth(jake)).expect(200);

    const { comments } = (await api.get(`/api/articles/${slug}/comments`).set(auth(jake)).expect(200)).body;
    expect(comments.map((c: { body: string }) => c.body)).toEqual(['first', 'second']);
    expect(comments[0].author).toEqual({ username: 'anna', bio: null, image: null, following: true });
  });

  it('cannot be deleted through a different article’s slug', async () => {
    const a = await createArticle(jake, { title: 'A' });
    const b = await createArticle(jake, { title: 'B' });
    const { body } = await api
      .post(`/api/articles/${a.slug}/comments`)
      .set(auth(jake))
      .send({ comment: { body: 'on A' } })
      .expect(201);

    const res = await api.delete(`/api/articles/${b.slug}/comments/${body.comment.id}`).set(auth(jake)).expect(404);
    expect(res.body).toEqual({ errors: { comment: ['not found'] } });
  });

  it('treats a non-numeric comment id as not found', async () => {
    const { slug } = await createArticle(jake, { title: 'A' });
    await api.delete(`/api/articles/${slug}/comments/abc`).set(auth(jake)).expect(404);
  });

  it('can only be deleted by their author, not by the article’s author', async () => {
    const { slug } = await createArticle(jake, { title: 'A' });
    const { body } = await api
      .post(`/api/articles/${slug}/comments`)
      .set(auth(anna))
      .send({ comment: { body: 'mine' } })
      .expect(201);
    await api.delete(`/api/articles/${slug}/comments/${body.comment.id}`).set(auth(jake)).expect(403);
    await api.delete(`/api/articles/${slug}/comments/${body.comment.id}`).set(auth(anna)).expect(204);
  });
});

describe('GET /api/tags', () => {
  it('lists tags in use, most used first', async () => {
    await createArticle(jake, { title: '1', tagList: ['rare', 'common'] });
    await createArticle(jake, { title: '2', tagList: ['common'] });
    expect((await api.get('/api/tags').expect(200)).body).toEqual({ tags: ['common', 'rare'] });
  });
});
