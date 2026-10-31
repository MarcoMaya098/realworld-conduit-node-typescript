/** MODEL for comments: the comment as seen by a viewer, and the ownership reference. */

import type { Profile } from './profile.model';

export interface Comment {
  id: number;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: Profile;
}

export interface CommentRef {
  id: number;
  authorId: number;
}

export interface NewComment {
  body: string;
  articleId: number;
  authorId: number;
}
