import { describe, expect, it } from 'vitest';
import { isZeroEmbeddedOrigin } from './zeroEmbeddedOrigin';

// IR (EU) 2025/2547 Annex III, point B (p. 72); Annex III point 1 to Reg. (EU) 2023/956.
describe('zero embedded emissions by origin', () => {
  it('counts EU members as zero', () => {
    expect(isZeroEmbeddedOrigin('EU_MEMBER', 'Germany')).toBe(true);
  });

  it('counts the Annex III point 1 countries and territories as zero', () => {
    ['Iceland', 'Liechtenstein', 'Norway', 'Switzerland', ' norway ', 'Büsingen', 'Ceuta'].forEach((c) =>
      expect(isZeroEmbeddedOrigin('NON_EU_MEMBER', c)).toBe(true),
    );
  });

  it('keeps other countries', () => {
    expect(isZeroEmbeddedOrigin('NON_EU_MEMBER', 'Serbia')).toBe(false);
    expect(isZeroEmbeddedOrigin('', '')).toBe(false);
    expect(isZeroEmbeddedOrigin(undefined, undefined)).toBe(false);
  });
});
