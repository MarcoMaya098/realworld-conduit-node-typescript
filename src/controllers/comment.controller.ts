/** Controller for an article's comments: call CommentService, pick the status code. */

import type { RequestHandler } from 'express';
import type { CommentService } from '../services/comment.service';
import type { CreateCommentBody } from '../types/comment.types';
import { currentUserId, pathParam, validatedBody } from '../utils/http';
import { toCommentDto } from '../utils/response';
import { parseCommentId } from '../validators/comment.validator';

export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  list: RequestHandler = async (req, res) => {
    const comments = await this.commentService.list(pathParam(req, 'slug'), req.userId);
    res.json({ comments: comments.map(toCommentDto) });
  };

  create: RequestHandler = async (req, res) => {
    const { comment } = validatedBody<CreateCommentBody>(req);
    const created = await this.commentService.create(pathParam(req, 'slug'), comment, currentUserId(req));
    res.status(201).json({ comment: toCommentDto(created) });
  };

  delete: RequestHandler = async (req, res) => {
    const commentId = parseCommentId(pathParam(req, 'id'));
    await this.commentService.delete(pathParam(req, 'slug'), commentId, currentUserId(req));
    res.status(204).end();
  };
}
