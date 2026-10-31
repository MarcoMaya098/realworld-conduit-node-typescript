/** BUSINESS LOGIC for tags: only tags attached to at least one article are listed. */

import type { TagRepository } from '../types/repository.types';

export class TagService {
  constructor(private readonly tags: TagRepository) {}

  list(): Promise<string[]> {
    return this.tags.listInUse();
  }
}
