/**
 * Worked examples for the cost calculator.
 * Default SEE / benchmark for Serbia CN 2523 29 00 from IR 2025/2621 Annex I and
 * IR 2025/2620 point 5.3 (see lookup assertions below). CBAM factor / CSCF from
 * Guidance Doc. No. 4 Table 2-1 (see OPEN_QUESTIONS.md).
 */
import { describe, expect, it } from 'vitest';
import {
  PLANNING_LABEL,
  compare,
  lookupDefaultValue,
  selectDefaultBenchmark,
  sensitivity,
  suggestDefaultPathwaySefa,
  toTonnes,
  type CompareInput,
} from './engine.ts';
import { CBAM_FACTOR, CSCF, MASS_THRESHOLD_TONNES } from './regulatory.ts';
import type { CostItem, ImportLine } from './types.ts';

const SERBIA_GREY_CEMENT = {
  country: 'Serbia',
  cn: '2523 29 00',
  /** IR 2025/2621 Annex I — Serbia, Grey Portland cement, y2026 incl. mark-up */
  defaultSee2026: 1.551,
  /** IR 2025/2620 point 5.3 — Column B, route-independent */
  benchmarkB: 0.666,
};

const sefa2026 = CBAM_FACTOR[2026]! * CSCF[2026]! * SERBIA_GREY_CEMENT.benchmarkB; // 0.64935

function baseLine(over: Partial<ImportLine> = {}): ImportLine {
  return {
    id: '1',
    cn: SERBIA_GREY_CEMENT.cn,
    countryOfOrigin: SERBIA_GREY_CEMENT.country,
    importYear: 2026,
    importQuarter: 1,
    quantity: 100,
    unit: 't',
    actualSee: 0.8,
    actualSefa: sefa2026,
    actualSource: 'PRELIMINARY_ESTIMATE',
    ...over,
  };
}

function baseInput(over: Partial<CompareInput> = {}): CompareInput {
  return {
    lines: [baseLine()],
    prices: { low: 60, central: 80, high: 100 },
    priceCase: 'central',
    importer: { otherImportsTonnesByYear: { 2026: 0 } },
    costItems: [],
    view: 'IMPORTER',
    costCase: 'central',
    ...over,
  };
}

describe('lookupDefaultValue / benchmark (Serbia grey Portland cement)', () => {
  it('returns Annex I y2026 value 1.551 t CO2e/t', () => {
    const dv = lookupDefaultValue(SERBIA_GREY_CEMENT.country, SERBIA_GREY_CEMENT.cn, 2026);
    expect(dv.ok).toBe(true);
    if (!dv.ok) return;
    expect(dv.value).toBe(SERBIA_GREY_CEMENT.defaultSee2026);
    expect(dv.usedFallback).toBe(false);
  });

  it('selects Column B benchmark 0.666 and SEFA = CBAM factor × CSCF × BMg', () => {
    const bm = selectDefaultBenchmark(SERBIA_GREY_CEMENT.cn, 2026, '');
    expect(bm.ok).toBe(true);
    if (!bm.ok) return;
    expect(bm.value).toBe(SERBIA_GREY_CEMENT.benchmarkB);
    expect(sefa2026).toBeCloseTo(0.64935, 6);
  });

  it('suggestDefaultPathwaySefa returns 0.64935 for Serbia grey Portland cement 2026', () => {
    const s = suggestDefaultPathwaySefa(SERBIA_GREY_CEMENT.country, SERBIA_GREY_CEMENT.cn, 2026);
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.sefa).toBeCloseTo(0.64935, 6);
    expect(s.benchmark).toBe(0.666);
    expect(s.cbamFactor).toBe(0.975);
  });
});

describe('compare — certificate pathway', () => {
  it('calculates default certificates from official default SEE and SEFA', () => {
    // E = 1.551 × 100 = 155.1; FAA = 0.64935 × 100 = 64.935; certs = 90.165; × €80
    const c = compare(baseInput({ costItems: [] }));
    expect(c.comparable).toBe(true);
    expect(c.default.totals.embeddedEmissions).toBeCloseTo(155.1, 6);
    expect(c.default.totals.freeAllocationAdjustment).toBeCloseTo(64.935, 6);
    expect(c.default.totals.certificates).toBeCloseTo(90.165, 6);
    expect(c.default.certificateCost).toBeCloseTo(7213.2, 4);
  });

  it('calculates actual pathway with user SEE/SEFA separately', () => {
    // E = 0.8 × 100 = 80; FAA = 64.935; certs = 15.065; × €80
    const c = compare(baseInput());
    expect(c.actual.totals.certificates).toBeCloseTo(15.065, 6);
    expect(c.actual.certificateCost).toBeCloseTo(1205.2, 4);
    expect(c.certificateSaving).toBeCloseTo(6008, 4);
  });

  it('labels preliminary actual data as planning scenario', () => {
    const c = compare(baseInput());
    expect(c.actual.totals.planning).toBe(true);
    expect(c.conclusion).toContain(PLANNING_LABEL);
  });

  it('does not label verified supplier data as planning', () => {
    const c = compare(
      baseInput({
        lines: [baseLine({ actualSource: 'VERIFIED_SUPPLIER' })],
      }),
    );
    expect(c.actual.totals.planning).toBe(false);
  });
});

describe('compare — other costs, net savings, break-even', () => {
  const verifier: CostItem = {
    id: 'v',
    label: 'Independent verification',
    scenario: 'ACTUAL',
    amount: { central: 5000 },
    occurrence: 'ANNUAL',
    basis: 'PER_INSTALLATION',
    count: 1,
    allocationShare: 1,
    payer: 'IMPORTER',
  };

  it('nets certificate saving against verification costs', () => {
    const c = compare(baseInput({ costItems: [verifier] }));
    expect(c.additionalCostsFirstYear).toBe(5000);
    expect(c.netSavingFirstYear).toBeCloseTo(1008, 4);
    expect(c.conclusion).toMatch(/net saving is €1,008\.00/i);
  });

  it('estimates break-even volume when certificate saving per tonne is positive', () => {
    const c = compare(baseInput({ costItems: [verifier] }));
    expect(c.breakEvenFirstYear.kind).toBe('AT_QUANTITY');
    // 5000 / (6008/100) ≈ 83.22 t
    expect(c.breakEvenFirstYear.quantityTonnes).toBeCloseTo(83.222, 2);
  });

  it('explains when no break-even exists (actual certificates more expensive)', () => {
    const c = compare(
      baseInput({
        lines: [baseLine({ actualSee: 2.0, actualSefa: 0 })],
        costItems: [verifier],
      }),
    );
    expect(c.certificateSaving).toBeLessThan(0);
    expect(c.breakEvenFirstYear.kind).toBe('NONE');
    expect(c.breakEvenFirstYear.explanation).toMatch(/never recovered|no break-even/i);
    expect(c.netSavingFirstYear).toBeLessThan(0);
  });

  it('allocates shared costs by editable share and ignores producer costs in importer view', () => {
    const shared: CostItem = {
      ...verifier,
      id: 'shared',
      amount: { central: 10000 },
      allocationShare: 0.25,
      payer: 'PRODUCER',
    };
    const importerView = compare(baseInput({ costItems: [shared], view: 'IMPORTER' }));
    const combinedView = compare(baseInput({ costItems: [shared], view: 'COMBINED' }));
    expect(importerView.additionalCostsFirstYear).toBe(0);
    expect(combinedView.additionalCostsFirstYear).toBe(2500);
  });
});

describe('Art. 2a mass threshold', () => {
  it('marks imports EXEMPT when annual total ≤ 50 t (zero certificate cost)', () => {
    const c = compare(
      baseInput({
        lines: [baseLine({ quantity: 40 })],
        importer: { otherImportsTonnesByYear: { 2026: 5 } },
      }),
    );
    expect(40 + 5).toBeLessThanOrEqual(MASS_THRESHOLD_TONNES);
    expect(c.default.certificateCost).toBe(0);
    expect(c.actual.certificateCost).toBe(0);
    expect(c.certificateSaving).toBe(0);
  });

  it('requires other-imports input when lines alone are ≤ 50 t', () => {
    const c = compare(
      baseInput({
        lines: [baseLine({ quantity: 40 })],
        importer: { otherImportsTonnesByYear: {} },
      }),
    );
    expect(c.comparable).toBe(false);
    expect(c.comparableNote).toMatch(/could not be estimated|incomplete/i);
  });
});

describe('sensitivity', () => {
  it('returns rows for certificate price, SEE scale and cost case', () => {
    const rows = sensitivity(
      baseInput({
        costItems: [
          {
            id: 'v',
            label: 'Verification',
            scenario: 'ACTUAL',
            amount: { low: 3000, central: 5000, high: 8000 },
            occurrence: 'ANNUAL',
            basis: 'PER_INSTALLATION',
            count: 1,
            allocationShare: 1,
            payer: 'IMPORTER',
          },
        ],
      }),
    );
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.some((r) => r.label.includes('Certificate price'))).toBe(true);
    expect(rows.some((r) => r.label.includes('Actual SEE'))).toBe(true);
  });
});

describe('toTonnes', () => {
  it('converts kg to tonnes', () => {
    expect(toTonnes(1500, 'kg')).toBe(1.5);
    expect(toTonnes(10, 't')).toBe(10);
  });
});
