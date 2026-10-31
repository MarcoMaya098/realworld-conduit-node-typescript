/**
 * VALIDATION layer for articles (pure Zod, no I/O):
 * - request bodies: create (title, description and body required) and update (at least one
 *   field; tagList may be [] to clear tags but not null);
 * - query strings: pagination (limit >= 1, offset >= 0) and list filters (tag, author,
 *   favorited).
 * Sanitises and caps every string, normalises tags (trim, drop empty, de-duplicate in order).
 */

import { z } from 'zod';
import {
  atLeastOneField,
  filterParam,
  nonBlankString,
  orEmpty,
  requiredString,
  stripControlChars,
} from '../lib/validation';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 500;
const BODY_MAX = 100_000;
const TAG_MAX = 50;
const TAGS_MAX = 20;
const FILTER_MAX = 100;

/** Trims, drops empty entries and removes duplicates, keeping the first occurrence's position. */
export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

const LIST_OF_STRINGS = 'must be a list of strings';

// Optional, but `null` is rejected: `[]` is how a client clears the tags.
const tagList = () =>
  z
    .array(
      z.string({ error: LIST_OF_STRINGS }).overwrite(stripControlChars).max(TAG_MAX, `has a tag longer than ${TAG_MAX} characters`),
      { error: LIST_OF_STRINGS },
    )
    .max(TAGS_MAX, `is too long (maximum is ${TAGS_MAX} tags)`)
    .transform(normalizeTags)
    .optional();

export const createArticleSchema = orEmpty(
  z.object({
    article: orEmpty(
      z.object({
        title: requiredString(TITLE_MAX),
        description: requiredString(DESCRIPTION_MAX),
        body: requiredString(BODY_MAX),
        tagList: tagList(),
      }),
    ),
  }),
);

export const updateArticleSchema = orEmpty(
  z.object({
    article: orEmpty(
      z
        .object({
          title: nonBlankString(TITLE_MAX),
          description: nonBlankString(DESCRIPTION_MAX),
          body: nonBlankString(BODY_MAX),
          tagList: tagList(),
        })
        .refine(atLeastOneField, 'must contain at least one field'),
    ),
  }),
);

const integerParam = (min: number, fallback: number) =>
  z.coerce
    .number({ error: 'must be an integer' })
    .int('must be an integer')
    .min(min, `must be greater than or equal to ${min}`)
    .default(fallback);

export const paginationSchema = z.object({
  limit: integerParam(1, 20),
  offset: integerParam(0, 0),
});

export const listArticlesQuerySchema = paginationSchema.extend({
  tag: filterParam(FILTER_MAX),
  author: filterParam(FILTER_MAX),
  favorited: filterParam(FILTER_MAX),
});
