import { describe, expect, it } from 'vitest';
import { slugify, withRandomSuffix } from '../../src/lib/slug';

describe('slugify', () => {
  it('kebab-cases and strips accents and punctuation', () => {
    expect(slugify('¿Cómo entrenar a tu dragón?')).toBe('como-entrenar-a-tu-dragon');
    expect(slugify('  Hello,   World!!  ')).toBe('hello-world');
  });

  it('falls back to "article" when nothing slug-safe remains', () => {
    expect(slugify('!!!')).toBe('article');
    expect(slugify('日本語')).toBe('article');
  });

  it('caps the length without leaving a trailing dash', () => {
    const slug = slugify(`${'a'.repeat(79)} b`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('withRandomSuffix', () => {
  it('appends a short random suffix', () => {
    const a = withRandomSuffix('title');
    expect(a).toMatch(/^title-[0-9a-f]{6}$/);
    expect(withRandomSuffix('title')).not.toBe(a);
  });
});
