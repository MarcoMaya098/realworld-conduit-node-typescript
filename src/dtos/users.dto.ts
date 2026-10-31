/**
 * DTOs for users and authentication: what UsersService accepts (already validated by
 * validators/users.schemas.ts), what it returns, and the JSON User of the RealWorld spec.
 */

import type { User } from '../domain/entities/user';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  password?: string;
  bio?: string | null;
  image?: string | null;
}

/** Result of every successful authentication operation. */
export interface AuthenticatedUser {
  user: User;
  token: string;
}

/** Response shape: `{ "user": UserDto }`. */
export interface UserDto {
  email: string;
  token: string;
  username: string;
  bio: string | null;
  image: string | null;
}
