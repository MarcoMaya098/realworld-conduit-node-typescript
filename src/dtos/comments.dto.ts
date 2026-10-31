/**
 * DTOs for comments: what CommentsService accepts (already validated by
 * validators/comments.schemas.ts) and the JSON Comment of the RealWorld spec.
 */

import type { ProfileDto } from './profiles.dto';

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
