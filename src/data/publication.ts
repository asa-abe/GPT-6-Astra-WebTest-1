import type { Publication } from './validate';

const mode = import.meta.env.SITE_MODE || 'preview';
if (mode !== 'preview' && mode !== 'production')
  throw new Error('SITE_MODE must be preview or production');

export const publication: Publication = {
  mode,
  siteUrl: import.meta.env.SITE_URL?.trim() || '',
  email: import.meta.env.CONTACT_EMAIL?.trim() || '',
  operator: import.meta.env.OPERATOR_NAME?.trim() || '',
  approved: import.meta.env.CONTENT_APPROVED === 'true',
};
