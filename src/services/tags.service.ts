/** BUSINESS LOGIC for tags: only tags attached to at least one article are listed. */

import type { TagRepository } from '../domain/repositories';

export class TagsService {
  constructor(private readonly tags: TagRepository) {}

  list(): Promise<string[]> {
    return this.tags.listInUse();
  }
}
