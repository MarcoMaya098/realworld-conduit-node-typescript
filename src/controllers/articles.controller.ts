/** HTTP layer for articles: validate query/body, call ArticlesService, pick the status code. */

import type { RequestHandler } from 'express';
import { pathParam } from '../lib/http';
import { parse } from '../lib/validation';
import { currentUserId } from '../middleware/auth';
import type { ArticlesService } from '../services/articles.service';
import {
  createArticleSchema,
  listArticlesQuerySchema,
  paginationSchema,
  updateArticleSchema,
} from '../validators/articles.schemas';
import { toArticleDto, toArticleListDto } from './presenters';

export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  list: RequestHandler = async (req, res) => {
    const query = parse(listArticlesQuerySchema, req.query);
    res.json(toArticleListDto(await this.articles.list(query, req.userId)));
  };

  feed: RequestHandler = async (req, res) => {
    const page = parse(paginationSchema, req.query);
    res.json(toArticleListDto(await this.articles.feed(page, currentUserId(req))));
  };

  create: RequestHandler = async (req, res) => {
    const { article } = parse(createArticleSchema, req.body);
    res.status(201).json({ article: toArticleDto(await this.articles.create(article, currentUserId(req))) });
  };

  get: RequestHandler = async (req, res) => {
    res.json({ article: toArticleDto(await this.articles.get(pathParam(req, 'slug'), req.userId)) });
  };

  update: RequestHandler = async (req, res) => {
    const { article } = parse(updateArticleSchema, req.body);
    const updated = await this.articles.update(pathParam(req, 'slug'), article, currentUserId(req));
    res.json({ article: toArticleDto(updated) });
  };

  delete: RequestHandler = async (req, res) => {
    await this.articles.delete(pathParam(req, 'slug'), currentUserId(req));
    res.status(204).end();
  };

  favorite: RequestHandler = async (req, res) => {
    res.json({ article: toArticleDto(await this.articles.favorite(pathParam(req, 'slug'), currentUserId(req))) });
  };

  unfavorite: RequestHandler = async (req, res) => {
    res.json({ article: toArticleDto(await this.articles.unfavorite(pathParam(req, 'slug'), currentUserId(req))) });
  };
}
