/**
 * Aluminium product row checks. CN rows mirror GET /cn-codes/active (CBAM-R Annex I "Aluminium",
 * consolidated Reg. 2023/956 p.47); quantities are synthetic.
 */
import { describe, expect, it } from 'vitest';
import type { CnCodeDto } from '../hooks/useCnCodes';
import { checkAluminiumCn, filterAluminiumCn, findAluminiumCn, parseQuantity } from './aluminiumProduct';

const cn = (id: number, cnCode: string, description: string): CnCodeDto =>
  ({ id, cnCode, description, sortOrder: id, isActive: true });

const list = [
  cn(0, '7601', 'Unwrought aluminium'),
  cn(4, '7605', 'Aluminium wire'),
  cn(5, '7606', 'Aluminium plates, sheets and strip, of a thickness exceeding 0,2 mm'),
  cn(6, '7607', 'Aluminium foil'),
  cn(8, '7609 00 00', 'Aluminium tube or pipe fittings'),
];

describe('checkAluminiumCn', () => {
  it('accepts listed codes and longer codes under them', () => {
    expect(checkAluminiumCn(list, '7605')).toBe('ok');
    expect(checkAluminiumCn(list, '7606 12 20')).toBe('ok');
    expect(checkAluminiumCn(list, '76090000')).toBe('ok');
    expect(findAluminiumCn(list, '7606 12 20')?.cnCode).toBe('7606');
  });

  it('rejects codes outside the aluminium list', () => {
    expect(checkAluminiumCn(list, '7602 00 11')).toBe('notAluminium'); // aluminium waste and scrap
    expect(checkAluminiumCn(list, '7208')).toBe('notAluminium');
    expect(checkAluminiumCn(list, '7609 10')).toBe('notAluminium'); // listed only as 7609 00 00
  });

  it('format and empty', () => {
    expect(checkAluminiumCn(list, '')).toBe('empty');
    expect(checkAluminiumCn(list, '760')).toBe('format');
    expect(checkAluminiumCn(list, '7606a')).toBe('format');
  });
});

describe('parseQuantity', () => {
  it('reads dot and comma decimals', () => {
    expect(parseQuantity('12.5')).toBe(12.5);
    expect(parseQuantity('12,5')).toBe(12.5);
    expect(parseQuantity(' 100 ')).toBe(100);
  });
  it('returns null for text', () => {
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('abc')).toBeNull();
    expect(parseQuantity('10 t')).toBeNull();
  });
});

describe('filterAluminiumCn', () => {
  it('by code with or without spaces, and by description', () => {
    expect(filterAluminiumCn(list, '7606 12').map((c) => c.cnCode)).toEqual(['7606']);
    expect(filterAluminiumCn(list, 'foil').map((c) => c.cnCode)).toEqual(['7607']);
    expect(filterAluminiumCn(list, '760').map((c) => c.cnCode)).toEqual(['7601', '7605', '7606', '7607', '7609 00 00']);
    expect(filterAluminiumCn(list, '').length).toBe(5);
  });
});
