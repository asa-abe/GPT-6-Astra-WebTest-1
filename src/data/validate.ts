import { sectionIds, type LandingContent } from './landing';

export interface Publication {
  mode: 'preview' | 'production';
  siteUrl: string;
  email: string;
  operator: string;
  approved: boolean;
}

const reservedDomain =
  /(^|\.)(example\.(com|net|org)|example|invalid|localhost|test)$/i;

export function isPublicHost(host: string): boolean {
  return (
    host.includes('.') &&
    !reservedDomain.test(host) &&
    !/^\d+(?:\.\d+){3}$/.test(host) &&
    host.length <= 253 &&
    host
      .split('.')
      .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
  );
}

export function mailto(email: string, subject: string): string {
  return `mailto:${encodeURIComponent(email).replace('%40', '@')}?subject=${encodeURIComponent(subject)}`;
}

export function validateContent(
  data: LandingContent,
  publication: Publication,
): void {
  const errors: string[] = [];
  const ids = new Set<string>(sectionIds);
  function required(value: string, path: string) {
    if (!value.trim()) errors.push(`${path}: 必須項目が空です`);
  }
  function id(value: string, path: string) {
    if (!/^[a-z][a-z0-9-]*$/.test(value) || ids.has(value))
      errors.push(`${path}: IDが不正または重複しています`);
    ids.add(value);
  }
  function image(
    value: { src: string; width: number; height: number },
    path: string,
  ) {
    if (!value?.src || value.width <= 0 || value.height <= 0)
      errors.push(`${path}: 画像がありません`);
  }
  const textGroups = [
    ['brand', data.brand],
    ['meta.title', data.meta.title],
    ['meta.description', data.meta.description],
    ['hero.title.0', data.hero.title[0]],
    ['hero.title.1', data.hero.title[1]],
    ['hero.description', data.hero.description],
    ['technology.title', data.technology.title],
    ['work.title', data.work.title],
    ['process.title', data.process.title],
    ['process.about', data.process.about],
    ['faq.title', data.faq.title],
    ['contact.subject', data.contact.subject],
    ['contact.title.0', data.contact.title[0]],
    ['contact.title.1', data.contact.title[1]],
    ['contact.description', data.contact.description],
    ['privacy.title', data.privacy.title],
  ] as const;
  for (const [path, value] of textGroups) required(value, path);
  for (const [key, value] of Object.entries(data.labels))
    required(value, `labels.${key}`);
  for (const link of [
    ...data.navigation,
    data.hero.primary,
    data.hero.secondary,
  ]) {
    required(link.label, 'link.label');
    if (!sectionIds.some((section) => `#${section}` === link.href))
      errors.push(`link: 不正なリンク ${link.href}`);
  }
  if (
    data.hero.primary.href !== '#contact' ||
    data.hero.secondary.href !== '#work'
  )
    errors.push('hero: CTAのリンク先が不正です');
  image(data.hero.poster, 'hero.poster');
  if (data.technology.items.length !== 3)
    errors.push('technology: 技術領域は3件必要です');
  for (const item of data.technology.items) {
    id(item.id, 'technology');
    if (!['expression', 'interaction', 'engineering'].includes(item.id))
      errors.push('technology: 不正な3D領域です');
    required(item.name, 'technology.name');
    required(item.description, 'technology.description');
  }
  if (data.work.items.length < 2 || data.work.items.length > 3)
    errors.push('work: 制作例は2〜3件必要です');
  for (const item of data.work.items) {
    id(item.id, 'work');
    image(item.image, 'work.image');
    for (const key of [
      'name',
      'alt',
      'description',
      'challenge',
      'approach',
      'outcome',
      'role',
    ] as const)
      required(item[key], `work.${key}`);
    if (!['concept', 'client'].includes(item.kind))
      errors.push('work: 種別が不正です');
  }
  if (data.process.steps.length !== 4)
    errors.push('process: 工程は4件必要です');
  for (const step of data.process.steps) {
    required(step.title, 'process.title');
    required(step.description, 'process.description');
  }
  if (data.faq.items.length < 3 || data.faq.items.length > 4)
    errors.push('faq: FAQは3〜4件必要です');
  for (const item of data.faq.items) {
    id(item.id, 'faq');
    required(item.question, 'faq.question');
    required(item.answer, 'faq.answer');
  }
  if (!data.privacy.paragraphs.length) errors.push('privacy: 方針がありません');
  for (const paragraph of data.privacy.paragraphs)
    required(paragraph, 'privacy.paragraph');
  if (
    publication.email &&
    (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(
      publication.email,
    ) ||
      !isPublicHost(publication.email.split('@')[1] ?? ''))
  ) {
    errors.push(
      'CONTACT_EMAIL: 実在の受信可能な公開メールアドレスを設定してください',
    );
  }
  if (publication.siteUrl) {
    try {
      const url = new URL(publication.siteUrl);
      if (
        url.protocol !== 'https:' ||
        !isPublicHost(url.hostname) ||
        url.pathname !== '/' ||
        url.search ||
        url.hash ||
        url.username ||
        url.password
      )
        throw new Error('invalid');
    } catch {
      errors.push('SITE_URL: httpsの公開ルートURLを設定してください');
    }
  }
  if (publication.mode === 'production') {
    if (!publication.siteUrl) errors.push('SITE_URL: 本公開にはURLが必要です');
    if (!publication.email)
      errors.push('CONTACT_EMAIL: 本公開には受信先が必要です');
    if (!publication.operator.trim())
      errors.push('OPERATOR_NAME: 本公開には運営者名が必要です');
    if (!publication.approved)
      errors.push(
        'CONTENT_APPROVED: 原稿・権利・個人情報の方針を承認してください',
      );
  }
  if (errors.length)
    throw new Error(`公開データの検証に失敗しました:\n${errors.join('\n')}`);
}
