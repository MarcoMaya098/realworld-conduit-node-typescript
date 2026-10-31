import { randomBytes } from 'node:crypto';

const MAX_LENGTH = 80;

/** "¿Cómo entrenar a tu dragón?" -> "como-entrenar-a-tu-dragon". Never returns an empty string. */
export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_LENGTH)
    .replace(/^-+|-+$/g, '');
  return slug || 'article';
}

export function withRandomSuffix(slug: string): string {
  return `${slug}-${randomBytes(3).toString('hex')}`;
}
