/** MODEL: a user as seen by a viewer (`following` depends on who is asking). */

export interface Profile {
  id: number;
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
}
