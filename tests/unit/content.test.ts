import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/assets/core.webp', () => ({
  default: { src: '/core.webp', width: 1000, height: 1000, format: 'webp' },
}));
vi.mock('../../src/assets/orbit.webp', () => ({
  default: { src: '/orbit.webp', width: 1600, height: 1100, format: 'webp' },
}));
vi.mock('../../src/assets/forma.webp', () => ({
  default: { src: '/forma.webp', width: 1400, height: 1100, format: 'webp' },
}));
import { landing, type LandingContent } from '../../src/data/landing';
import {
  validateContent,
  mailto,
  type Publication,
} from '../../src/data/validate';

const preview: Publication = {
  mode: 'preview',
  siteUrl: '',
  email: '',
  operator: '',
  approved: false,
};
const production: Publication = {
  mode: 'production',
  siteUrl: 'https://aether.studio/',
  email: 'studio@aether.studio',
  operator: 'テスト運営者',
  approved: true,
};

describe('publication and content validation', () => {
  it('supports an explicit preview without fabricated contact information', () => {
    expect(() => validateContent(landing, preview)).not.toThrow();
  });
  it('blocks an unconfigured public build', () => {
    expect(() =>
      validateContent(landing, { ...preview, mode: 'production' }),
    ).toThrow(/CONTACT_EMAIL/);
  });
  it('accepts configured, approved content', () => {
    expect(() => validateContent(landing, production)).not.toThrow();
  });
  it.each([
    'hello@example.com',
    'hello@example.test',
    'hello@localhost',
    'hello@company.invalid',
    'a\r\nb@company.com',
    'hello@studio.com?body=bad',
  ])('rejects invalid/dummy email %s', (email) => {
    expect(() => validateContent(landing, { ...preview, email })).toThrow(
      /CONTACT_EMAIL/,
    );
  });
  it.each([
    'https://example.com/',
    'http://aether.studio/',
    'https://aether.studio/work',
    'https://aether.studio/?id=1',
    'https://user:pass@aether.studio/',
  ])('rejects invalid canonical %s', (siteUrl) => {
    expect(() => validateContent(landing, { ...preview, siteUrl })).toThrow(
      /SITE_URL/,
    );
  });
  it('requires approval and operator for publication', () => {
    expect(() =>
      validateContent(landing, {
        ...production,
        approved: false,
        operator: '',
      }),
    ).toThrow(/CONTENT_APPROVED/);
  });
  it('rejects duplicate IDs, missing images and blank answers', () => {
    const data: LandingContent = structuredClone(landing);
    data.work.items[0]!.id = 'hero';
    data.work.items[1]!.image.src = '';
    data.faq.items[0]!.answer = '';
    expect(() => validateContent(data, preview)).toThrow(/ID.*重複/);
    expect(() => validateContent(data, preview)).toThrow(/画像/);
    expect(() => validateContent(data, preview)).toThrow(/faq.answer/);
  });
  it('encodes only the mail subject', () => {
    const url = mailto('studio@aether.studio', '相談 & idea? #1');
    expect(url).toBe(
      'mailto:studio@aether.studio?subject=%E7%9B%B8%E8%AB%87%20%26%20idea%3F%20%231',
    );
    expect(url).not.toContain('&body=');
  });
  it('escapes address characters that have meaning in a mailto URL', () => {
    expect(mailto('a?b#c&d@aether.studio', '相談')).toMatch(
      /^mailto:a%3Fb%23c%26d@aether\.studio\?subject=/,
    );
    expect(() =>
      validateContent(landing, { ...preview, email: 'studio@a..b.com' }),
    ).toThrow(/CONTACT_EMAIL/);
  });
});
