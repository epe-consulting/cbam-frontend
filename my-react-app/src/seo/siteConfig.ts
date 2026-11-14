/** Canonical production origin. Override with VITE_SITE_URL at build time. */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://panonia.io'
).replace(/\/$/, '');

export const SITE_NAME = 'Panonia';
export const SITE_TAGLINE = 'CBAM calculator & compliance helper for exporters';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/panonia-logo.png`;
export const TWITTER_HANDLE = '@panonia';
export const CONTACT_EMAIL = 'info@panonia.io';

export const DEFAULT_KEYWORDS = [
  'CBAM',
  'CBAM calculator',
  'CBAM helper',
  'CBAM compliance',
  'Carbon Border Adjustment Mechanism',
  'CBAM reporting',
  'embedded emissions calculator',
  'CBAM default values',
  'EU CBAM',
  'CBAM for exporters',
  'CBAM aluminium',
  'CBAM iron steel',
  'CBAM software',
].join(', ');
