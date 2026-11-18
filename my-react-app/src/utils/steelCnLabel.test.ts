/**
 * CN heading lookup for the steel wizard labels. Rows mirror /is/cn-mapping; descriptions are the
 * CBAM-R Annex I heading texts as seeded (consolidated Reg. 2023/956, p.46–48).
 */
import { describe, expect, it } from 'vitest';
import type { IsCnMappingRow } from '../api/ironSteel';
import { cnHeadingText, cnHelperText, cnOptions, filterCnOptions, findCnHeading, findCnLabel } from './steelCnLabel';
import { checkCn } from '../components/steel/cnCheck';

const row = (cnCode: string, category: string, description: string): IsCnMappingRow => ({
  cnCode, cnDigits: cnCode.replace(/\s/g, ''), category, categoryLabel: category, description,
  directOnly: true, ambiguous: false, precursorOnly: false, sortOrder: 0,
});

const mapping = [
  row('7202 1', 'FEMN', 'Ferro-manganese'),
  row('7208', 'IRON_STEEL_PRODUCTS', 'Flat-rolled products of iron or non-alloy steel, of a width of 600 mm or more, hot-rolled, not clad, plated or coated'),
  row('7217', 'IRON_STEEL_PRODUCTS', 'Wire of iron or non-alloy steel'),
  row('7318', 'IRON_STEEL_PRODUCTS', 'Screws, bolts, nuts, coach screws, screw hooks, rivets, cotters, cotter pins, washers (including spring washers) and similar articles, of iron or steel'),
  row('2601 12 00', 'SINTERED_ORE', 'Agglomerated iron ores and concentrates, other than roasted iron pyrites'),
];

describe('findCnHeading', () => {
  it('finds the 4-digit heading of an 8-digit code, with or without spaces', () => {
    expect(findCnHeading(mapping, '7208 51 20')?.cnCode).toBe('7208');
    expect(findCnHeading(mapping, '72171010')?.cnCode).toBe('7217');
  });

  it('uses the longest prefix (7202 1 for ferro-manganese, full code for sintered ore)', () => {
    expect(findCnHeading(mapping, '7202 11 20')?.cnCode).toBe('7202 1');
    expect(findCnHeading(mapping, '2601 12 00')?.cnCode).toBe('2601 12 00');
  });

  it('returns null for codes outside the mapping or shorter than 4 digits', () => {
    expect(findCnHeading(mapping, '7204 10 00')).toBeNull();
    expect(findCnHeading(mapping, '72')).toBeNull();
    expect(findCnHeading(mapping, '')).toBeNull();
  });
});

describe('labels', () => {
  it('codes of the same category get different texts', () => {
    const a = cnHeadingText(mapping, '7208 51 20');
    const b = cnHeadingText(mapping, '7217 10 10');
    const c = cnHeadingText(mapping, '7318 15 95');
    expect(new Set([a, b, c]).size).toBe(3);
    expect(b).toBe('7217 – Wire of iron or non-alloy steel');
  });

  it('helper text = heading text · category; falls back to the category alone', () => {
    expect(cnHelperText(mapping, '7217 10 10', 'Iron or steel products'))
      .toBe('7217 – Wire of iron or non-alloy steel · Iron or steel products');
    expect(cnHelperText(mapping, '9999 99 99', 'Iron or steel products')).toBe('Iron or steel products');
  });
});

// Sub-codes as printed in 2025/2621 Annex I (Other countries and territories), see backend /is/cn-mapping.
const withSubs: IsCnMappingRow[] = [
  { ...row('7318', 'IRON_STEEL_PRODUCTS', 'Screws, bolts, nuts … of iron or steel'), dvSpecific: false, subCodes: [
    { cnCode: '7318 15', cnDigits: '731815', description: 'Threaded screws and bolts, of iron or steel', dvSpecific: true },
    { cnCode: '7318 16', cnDigits: '731816', description: 'Nuts of iron or steel', dvSpecific: true },
  ] },
  { ...row('7208', 'IRON_STEEL_PRODUCTS', 'Flat-rolled products … hot-rolled'), dvSpecific: true, subCodes: [] },
  { ...row('2804 10 00', 'HYDROGEN', 'Hydrogen'), precursorOnly: true },
];

describe('sub-codes', () => {
  it('label uses the most specific printed row', () => {
    expect(findCnLabel(withSubs, '7318 16 10')?.cnCode).toBe('7318 16');
    expect(cnHeadingText(withSubs, '7318 16 10')).toBe('7318 16 – Nuts of iron or steel');
    expect(findCnLabel(withSubs, '7318')?.cnCode).toBe('7318');
  });

  it('dropdown lists headings followed by their sub-codes, without precursor-only rows', () => {
    const opts = cnOptions(withSubs);
    expect(opts.map((o) => o.cnCode)).toEqual(['7318', '7318 15', '7318 16', '7208']);
    expect(opts[0]).toMatchObject({ sub: false, dvSpecific: false });
    expect(opts[1]).toMatchObject({ sub: true, dvSpecific: true, category: 'IRON_STEEL_PRODUCTS' });
  });

  it('search by code or by description', () => {
    const opts = cnOptions(withSubs);
    expect(filterCnOptions(opts, '7318 1').map((o) => o.cnCode)).toEqual(['7318', '7318 15', '7318 16']);
    expect(filterCnOptions(opts, 'nuts').map((o) => o.cnCode)).toEqual(['7318', '7318 16']);
    expect(filterCnOptions(opts, '').length).toBe(4);
  });
});

describe('checkCn (4 to 8 digits, precision)', () => {
  const ok = (dvSpecific: boolean) => ({ ok: true, category: 'IRON_STEEL_PRODUCTS', dvSpecific });
  it('accepts a 4-digit heading that picks one default value', () => {
    expect(checkCn('7208', { '7208': ok(true) }, 'Proizvod 1').state).toBe('ok');
  });
  it('rejects a code that is too short (from the backend error or the flag)', () => {
    const fromError = checkCn('7318', { '7318': { ok: false, errorCode: 'IS_E_CN_TOO_SHORT' } }, 'P');
    expect(fromError.state === 'error' && fromError.issue.code).toBe('IS_E_CN_TOO_SHORT');
    const fromFlag = checkCn('7318', { '7318': ok(false) }, 'P');
    expect(fromFlag.state === 'error' && fromFlag.issue.code).toBe('IS_E_CN_TOO_SHORT');
  });
  it('allowShort rows (no default value needed) ignore the precision flag', () => {
    expect(checkCn('7318', { '7318': ok(false) }, 'P', true).state).toBe('ok');
  });
  it('fewer than 4 digits is still a format error', () => {
    const r = checkCn('720', {}, 'P');
    expect(r.state === 'error' && r.issue.code).toBe('IS_E_CN_FORMAT');
  });
});
