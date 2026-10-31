import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createArticle, registerUser, resetDatabase } from '../helpers';

let jake: string;
let anna: string;

beforeEach(async () => {
  await resetDatabase();
  jake = await registerUser('jake');
  anna = await registerUser('anna');
});

describe('POST /api/articles', () => {
  it('keeps the client’s tag order, trimming and de-duplicating', async () => {
    const article = await createArticle(jake, { title: 'Tags', tagList: ['zeta', ' alpha ', 'zeta', ''] });
    expect(article.tagList).toEqual(['zeta', 'alpha']);
  });

  it('derives a readable slug and gives duplicate titles distinct slugs', async () => {
    const first = await createArticle(jake, { title: '¿Cómo entrenar a tu dragón?' });
    const second = await createArticle(jake, { title: '¿Cómo entrenar a tu dragón?' });
    expect(first.slug).toBe('como-entrenar-a-tu-dragon');
    expect(second.slug).toMatch(/^como-entrenar-a-tu-dragon-[0-9a-f]{6}$/);
  });

  it('returns the full Article shape', async () => {
    const article = await createArticle(jake, { title: 'Shape' });
    expect(Object.keys(article).sort()).toEqual(
      [
        'author',
        'body',
        'createdAt',
        'description',
        'favorited',
        'favoritesCount',
        'slug',
        'tagList',
        'title',
        'updatedAt',
      ].sort(),
    );
    expect(article.author).toEqual({ username: 'jake', bio: null, image: null, following: false });
  });
});

describe('PUT /api/articles/:slug', () => {
  it('regenerates the slug when the title changes; the old slug stops resolving', async () => {
    const { slug } = await createArticle(jake, { title: 'Old title' });
    const res = await api
      .put(`/api/articles/${slug}`)
      .set(auth(jake))
      .send({ article: { title: 'New title' } })
      .expect(200);
    expect(res.body.article.slug).toBe('new-title');
    await api.get(`/api/articles/${slug}`).expect(404);
    await api.get('/api/articles/new-title').expect(200);
  });

  it('bumps updatedAt even when only the tags change', async () => {
    const created = await createArticle(jake, { title: 'Tags only', tagList: ['a'] });
    const res = await api
      .put(`/api/articles/${created.slug}`)
      .set(auth(jake))
      .send({ article: { tagList: ['b'] } })
      .expect(200);
    expect(res.body.article.tagList).toEqual(['b']);
    expect(res.body.article.updatedAt).not.toBe(created.updatedAt);
    expect(res.body.article.createdAt).toBe(created.createdAt);
  });

  it('checks existence before ownership: 404 beats 403', async () => {
    await api.put('/api/articles/missing').set(auth(anna)).send({ article: { body: 'x' } }).expect(404);
    const { slug } = await createArticle(jake, { title: 'Mine' });
    const res = await api.put(`/api/articles/${slug}`).set(auth(anna)).send({ article: { body: 'x' } }).expect(403);
    expect(res.body).toEqual({ errors: { article: ['forbidden'] } });
  });
});

describe('DELETE /api/articles/:slug', () => {
  it('removes the article with its comments, favorites and unused tags', async () => {
    const { slug } = await createArticle(jake, { title: 'Doomed', tagList: ['doomed'] });
    await api.post(`/api/articles/${slug}/comments`).set(auth(anna)).send({ comment: { body: 'hi' } }).expect(201);
    await api.post(`/api/articles/${slug}/favorite`).set(auth(anna)).expect(200);

    await api.delete(`/api/articles/${slug}`).set(auth(jake)).expect(204);

    await api.get(`/api/articles/${slug}/comments`).expect(404);
    expect((await api.get('/api/articles?favorited=anna').expect(200)).body.articlesCount).toBe(0);
    expect((await api.get('/api/tags').expect(200)).body.tags).not.toContain('doomed');
  });
});

describe('GET /api/articles', () => {
  it('lists newest first without bodies, filtered by tag, author and favorited', async () => {
    const a = await createArticle(jake, { title: 'A', tagList: ['x'] });
    const b = await createArticle(anna, { title: 'B', tagList: ['x', 'y'] });
    await createArticle(anna, { title: 'C' });
    await api.post(`/api/articles/${a.slug}/favorite`).set(auth(anna)).expect(200);

    const all = (await api.get('/api/articles').expect(200)).body;
    expect(all.articlesCount).toBe(3);
    expect(all.articles.map((x: { title: string }) => x.title)).toEqual(['C', 'B', 'A']);
    expect(all.articles[0]).not.toHaveProperty('body');

    const slugs = async (query: string) =>
      (await api.get(`/api/articles?${query}`).expect(200)).body.articles.map((x: { slug: string }) => x.slug);
    expect(await slugs('tag=x')).toEqual([b.slug, a.slug]);
    expect(await slugs('tag=x&author=anna')).toEqual([b.slug]);
    expect(await slugs('favorited=anna')).toEqual([a.slug]);
    expect(await slugs('author=nobody')).toEqual([]);
  });

  it('reports favorited / following from the viewer’s point of view', async () => {
    const { slug } = await createArticle(jake, { title: 'Viewpoint' });
    await api.post(`/api/articles/${slug}/favorite`).set(auth(anna)).expect(200);
    await api.post('/api/profiles/jake/follow').set(auth(anna)).expect(200);

    const asAnna = (await api.get('/api/articles').set(auth(anna)).expect(200)).body.articles[0];
    expect(asAnna).toMatchObject({ favorited: true, favoritesCount: 1, author: { following: true } });

    const anonymous = (await api.get('/api/articles').expect(200)).body.articles[0];
    expect(anonymous).toMatchObject({ favorited: false, favoritesCount: 1, author: { following: false } });
  });

  it('rejects invalid pagination with a 422', async () => {
    const res = await api.get('/api/articles?limit=0').expect(422);
    expect(res.body.errors).toHaveProperty('limit');
  });
});

describe('GET /api/articles/feed', () => {
  it('only contains articles by followed authors, with the total count', async () => {
    await createArticle(anna, { title: 'Anna 1' });
    await createArticle(anna, { title: 'Anna 2' });
    await createArticle(jake, { title: 'Own article' });
    await api.post('/api/profiles/anna/follow').set(auth(jake)).expect(200);

    const feed = (await api.get('/api/articles/feed?limit=1').set(auth(jake)).expect(200)).body;
    expect(feed.articlesCount).toBe(2);
    expect(feed.articles).toHaveLength(1);
    expect(feed.articles[0]).toMatchObject({ title: 'Anna 2', author: { username: 'anna', following: true } });
  });
});

describe('favorites', () => {
  it('are idempotent and counted across users', async () => {
    const { slug } = await createArticle(jake, { title: 'Popular' });
    await api.post(`/api/articles/${slug}/favorite`).set(auth(jake)).expect(200);
    await api.post(`/api/articles/${slug}/favorite`).set(auth(jake)).expect(200);
    const res = await api.post(`/api/articles/${slug}/favorite`).set(auth(anna)).expect(200);
    expect(res.body.article).toMatchObject({ favorited: true, favoritesCount: 2 });

    const after = await api.delete(`/api/articles/${slug}/favorite`).set(auth(anna)).expect(200);
    expect(after.body.article).toMatchObject({ favorited: false, favoritesCount: 1 });
  });
});
