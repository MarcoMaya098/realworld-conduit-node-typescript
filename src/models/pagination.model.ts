/** MODEL value objects for paginated lists. */

export interface Pagination {
  limit: number;
  offset: number;
}

/** One page of results plus the total number of matches. */
export interface Page<T> {
  items: T[];
  count: number;
}
