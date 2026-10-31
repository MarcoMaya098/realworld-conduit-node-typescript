/** Controller for articles: call ArticleService with validated input, pick the status code. */

import type { RequestHandler } from 'express';
import type { Pagination } from '../models/pagination.model';
import type { ArticleService } from '../services/article.service';
import type { CreateArticleBody, ListArticlesQuery, UpdateArticleBody } from '../types/article.types';
import { currentUserId, pathParam, validatedBody, validatedQuery } from '../utils/http';
import { toArticleDto, toArticleListDto } from '../utils/response';

export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  list: RequestHandler = async (req, res) => {
    const query = validatedQuery<ListArticlesQuery>(req);
    res.json(toArticleListDto(await this.articleService.list(query, req.userId)));
  };

  feed: RequestHandler = async (req, res) => {
    const page = validatedQuery<Pagination>(req);
    res.json(toArticleListDto(await this.articleService.feed(page, currentUserId(req))));
  };

  create: RequestHandler = async (req, res) => {
    const { article } = validatedBody<CreateArticleBody>(req);
    res.status(201).json({ article: toArticleDto(await this.articleService.create(article, currentUserId(req))) });
  };

  get: RequestHandler = async (req, res) => {
    res.json({ article: toArticleDto(await this.articleService.get(pathParam(req, 'slug'), req.userId)) });
  };

  update: RequestHandler = async (req, res) => {
    const { article } = validatedBody<UpdateArticleBody>(req);
    const updated = await this.articleService.update(pathParam(req, 'slug'), article, currentUserId(req));
    res.json({ article: toArticleDto(updated) });
  };

  delete: RequestHandler = async (req, res) => {
    await this.articleService.delete(pathParam(req, 'slug'), currentUserId(req));
    res.status(204).end();
  };

  favorite: RequestHandler = async (req, res) => {
    res.json({ article: toArticleDto(await this.articleService.favorite(pathParam(req, 'slug'), currentUserId(req))) });
  };

  unfavorite: RequestHandler = async (req, res) => {
    const article = await this.articleService.unfavorite(pathParam(req, 'slug'), currentUserId(req));
    res.json({ article: toArticleDto(article) });
  };
}
