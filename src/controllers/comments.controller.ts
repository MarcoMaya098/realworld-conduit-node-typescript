/** HTTP layer for an article's comments: validate the body and path id, call CommentsService. */

import type { RequestHandler } from 'express';
import { pathParam } from '../lib/http';
import { parse } from '../lib/validation';
import { currentUserId } from '../middleware/auth';
import type { CommentsService } from '../services/comments.service';
import { createCommentSchema, parseCommentId } from '../validators/comments.schemas';
import { toCommentDto } from './presenters';

export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  list: RequestHandler = async (req, res) => {
    const comments = await this.comments.list(pathParam(req, 'slug'), req.userId);
    res.json({ comments: comments.map(toCommentDto) });
  };

  create: RequestHandler = async (req, res) => {
    const { comment } = parse(createCommentSchema, req.body);
    const created = await this.comments.create(pathParam(req, 'slug'), comment, currentUserId(req));
    res.status(201).json({ comment: toCommentDto(created) });
  };

  delete: RequestHandler = async (req, res) => {
    await this.comments.delete(pathParam(req, 'slug'), parseCommentId(pathParam(req, 'id')), currentUserId(req));
    res.status(204).end();
  };
}
