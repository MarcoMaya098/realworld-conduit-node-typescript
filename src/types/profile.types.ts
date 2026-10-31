/** DTO for profiles: the JSON Profile of the RealWorld spec, also used for every author. */

/** Response shape: `{ "profile": ProfileDto }`. */
export interface ProfileDto {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
}
