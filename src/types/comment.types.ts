/**
 * DTOs for comments: what CommentService accepts (already validated by
 * validators/comment.validator.ts) and the JSON Comment of the RealWorld spec.
 */

import type { ProfileDto } from './profile.types';

export interface CreateCommentInput {
  body: string;
}

/** Response shape: `{ "comment": CommentDto }` / `{ "comments": CommentDto[] }`. */
export interface CommentDto {
  id: number;
  createdAt: string;
  updatedAt: string;
  body: string;
  author: ProfileDto;
}

/** Request body, as parsed by validators/comment.validator.ts. */
export interface CreateCommentBody {
  comment: CreateCommentInput;
}
