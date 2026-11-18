/**
 * Aluminium report totals. SEE rounding: IR 2025/2547 (OJ-L-202502547.pdf) Annex II A.1 pt 8 (OJ p.28/86),
 * max. 5 decimals. Item values are synthetic (unit/aggregation tests, not regulatory values).
 */
import { describe, expect, it } from 'vitest';
import {
  aluminiumToolTotals,
  isAluminiumEmissionItem,
  precursorKgToTonnesText,
  specificDirect,
  specificDirectText,
  splitEmissions,
  type ReportResultItem,
} from './aluminiumReportTotals.ts';

const item = (formulaCode: string, resultValue: number, unit?: string, outputCode: string | null = null): ReportResultItem =>
  ({ formulaCode, outputCode, resultValue, unit });

describe('specificDirect', () => {
  it('3.3118245 t / 100 t = 0.03312 t CO2e/t (5 decimals)', () => {
    expect(specificDirect(3.3118245, 100)).toBeCloseTo(0.033118245, 12);
    expect(specificDirectText(3.3118245, 100)).toBe('0.03312');
  });

  it('returns null / empty for missing or non-positive quantity', () => {
    expect(specificDirect(3, 0)).toBeNull();
    expect(specificDirect(3, -1)).toBeNull();
    expect(specificDirect(null, 10)).toBeNull();
    expect(specificDirectText(3, 0)).toBe('');
  });
});

describe('splitEmissions', () => {
  it('splits aluminium t CO2e items into direct and indirect', () => {
    const items = [
      item('ALU_SECONDARY_FUEL_COMBUSTION', 3.3118245, 't CO2e'),
      item('ALU_GRID_ELECTRICITY_EMISSIONS', 0.2, 't CO2e'),
    ];
    const s = splitEmissions(items);
    expect(s.direct).toBeCloseTo(3.3118245, 10);
    expect(s.indirect).toBeCloseTo(0.2, 10);
  });

  it('does not sum steel items or items in other units (t CO2e/t, t, %)', () => {
    const items = [
      item('ALU_SECONDARY_FUEL_COMBUSTION', 1, 't CO2e'),
      item('IS_PROC_DIREM_STAR', 500, 't CO2e'),
      item('IS_SEE_TOTAL', 2.03988, 't CO2e/t'),
      item('IS_PROC_AL', 1000, 't'),
      item('IS_DEFAULT_SHARE', 40, '%'),
      item('ALU_SOMETHING_SEE', 9, 't CO2e/t'),
    ];
    expect(splitEmissions(items)).toEqual({ direct: 1, indirect: 0 });
  });

  it('without units (older backend) accepts only ALU_ items', () => {
    const items = [item('ALU_SECONDARY_FUEL_COMBUSTION', 2), item('IS_PROC_AL', 1000)];
    expect(splitEmissions(items)).toEqual({ direct: 2, indirect: 0 });
    expect(isAluminiumEmissionItem(item('IS_PROC_AL', 1000))).toBe(false);
  });
});

describe('aluminiumToolTotals', () => {
  it('returns null for a pure steel result (nothing to sum)', () => {
    expect(aluminiumToolTotals([item('IS_SEE_TOTAL', 2.0, 't CO2e/t'), item('IS_PROC_AL', 10, 't')])).toBeNull();
  });

  it('ignores ALU_DIRECT_INDIRECT_SUM when other emission items exist (no double counting)', () => {
    const totals = aluminiumToolTotals([
      item('ALU_SECONDARY_FUEL_COMBUSTION', 3, 't CO2e'),
      item('ALU_DIRECT_INDIRECT_SUM', 3, 't CO2e'),
    ]);
    expect(totals).toEqual({ direct: 3, indirect: 0 });
  });

  it('uses ALU_DIRECT_INDIRECT_SUM when it is the only emission item', () => {
    expect(aluminiumToolTotals([item('ALU_DIRECT_INDIRECT_SUM', 4, 't CO2e')])).toEqual({ direct: 4, indirect: 0 });
  });
});

describe('precursorKgToTonnesText', () => {
  it('converts the wizard kg quantity to t: 1374.5 kg -> 1.3745 t', () => {
    expect(precursorKgToTonnesText('1374.5')).toBe('1.3745');
  });

  it('passes empty / non-numeric input through unchanged', () => {
    expect(precursorKgToTonnesText('')).toBe('');
    expect(precursorKgToTonnesText(undefined)).toBe('');
    expect(precursorKgToTonnesText('n/a')).toBe('n/a');
  });
});
