/** DOMAIN entity: a registered user, including the password hash (never leaves the services). */

export interface User {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  bio: string | null;
  image: string | null;
}

export interface NewUser {
  email: string;
  username: string;
  passwordHash: string;
}

export type UserChanges = Partial<Pick<User, 'email' | 'username' | 'passwordHash' | 'bio' | 'image'>>;
