/**
 * Display rounding rules: IR 2025/2547 (OJ-L-202502547.pdf) Annex II, Section A.1, points 6 and 8 (OJ p.28/86);
 * detail-view decimal: docs/steel-implementation-spec.md §0.2.
 */
import { describe, expect, it } from 'vitest';
import {
  formatEmissions,
  formatResultItem,
  formatSee,
  formatTonnes,
  kgToTonnes,
} from './formatEmissions.ts';

describe('formatEmissions', () => {
  it('shows 1000 kWh × 0.20 kgCO2e/kWh = 200 kg as 0.2 t CO2e (detail view)', () => {
    const kg = 1000 * 0.2;
    expect(formatEmissions(kgToTonnes(kg), 't CO2e')).toBe('0.2 t CO₂e');
  });

  it('rounds period totals to full tonnes for reporting (A.1 pt 6)', () => {
    expect(formatEmissions(3.3118245, 't CO2e', 'report')).toBe('3 t CO₂e');
    expect(formatEmissions(1234.5, 't CO2e', 'report')).toBe('1235 t CO₂e');
    expect(formatEmissions(0.2, 't CO2e', 'report')).toBe('0 t CO₂e');
  });

  it('shows one decimal in detail view (steel spec §0.2)', () => {
    expect(formatEmissions(3.3118245, 't CO2e')).toBe('3.3 t CO₂e');
    expect(formatEmissions(12, 't CO2e')).toBe('12.0 t CO₂e');
  });

  it('falls back to t CO2e when the API sends no unit, and to a dash for no value', () => {
    expect(formatEmissions(5, undefined)).toBe('5.0 t CO₂e');
    expect(formatEmissions(5, '')).toBe('5.0 t CO₂e');
    expect(formatEmissions(null)).toBe('—');
    expect(formatEmissions('')).toBe('—');
  });

  it('never prints negative zero', () => {
    expect(formatEmissions(-0.01, 't CO2e', 'report')).toBe('0 t CO₂e');
  });
});

describe('formatSee', () => {
  it('uses at most 5 decimals (A.1 pt 8)', () => {
    expect(formatSee(3.3118245 / 100)).toBe('0.03312 t CO₂e/t');
    expect(formatSee(2.039876543)).toBe('2.03988 t CO₂e/t');
  });

  it('does not pad trailing zeros', () => {
    expect(formatSee(10.49)).toBe('10.49 t CO₂e/t');
  });
});

describe('formatResultItem (per-item unit)', () => {
  it('formats each item by its own unit', () => {
    expect(formatResultItem(0.2, 't CO2e')).toBe('0.2 t CO₂e');
    expect(formatResultItem(2.039876543, 't CO2e/t')).toBe('2.03988 t CO₂e/t');
    expect(formatResultItem(1.17647, 't')).toBe('1.1765 t');
    expect(formatResultItem(12.345, '%')).toBe('12.35 %');
  });

  it('never labels a value of unknown unit as tonnes', () => {
    expect(formatResultItem(200, undefined)).toBe('200');
    expect(formatResultItem(200, null)).not.toMatch(/t/);
  });
});

describe('kgToTonnes', () => {
  it('converts 200 kg to 0.2 t (a 200 kg value is never shown as 200 t)', () => {
    expect(kgToTonnes(200)).toBe(0.2);
    expect(formatTonnes(kgToTonnes(200))).toBe('0.2 t');
    expect(formatTonnes(kgToTonnes(200))).not.toBe('200 t');
  });

  it('converts 1374.5 kg to 1.3745 t', () => {
    expect(kgToTonnes('1374.5')).toBeCloseTo(1.3745, 10);
    expect(formatTonnes(kgToTonnes('1374.5'))).toBe('1.3745 t');
  });

  it('returns null for empty or non-numeric input', () => {
    expect(kgToTonnes('')).toBeNull();
    expect(kgToTonnes('abc')).toBeNull();
    expect(kgToTonnes(null)).toBeNull();
  });
});
