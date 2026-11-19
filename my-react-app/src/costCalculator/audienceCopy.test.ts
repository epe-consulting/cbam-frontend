import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../i18n';

// The engine texts are translated; the assertions below check the English wording.
beforeAll(async () => {
  await i18n.changeLanguage('en');
});
import { conclusionForAudience } from './audienceCopy.ts';
import type { Comparison } from './engine.ts';

function stub(over: Partial<Comparison> = {}): Comparison {
  return {
    default: {
      certificateCost: 7000,
      oneOff: 0,
      annual: 0,
      firstYearTotal: 7000,
      recurringTotal: 7000,
      costPerTonneFirstYear: 70,
      costPerTonneRecurring: 70,
      totals: {
        massTonnes: 100,
        embeddedEmissions: 0,
        freeAllocationAdjustment: 0,
        deduction: 0,
        certificates: 0,
        certificateCost: 7000,
        incomplete: false,
        planning: false,
        forecast: true,
      },
    },
    actual: {
      certificateCost: 1200,
      oneOff: 900,
      annual: 5000,
      firstYearTotal: 7100,
      recurringTotal: 6200,
      costPerTonneFirstYear: 71,
      costPerTonneRecurring: 62,
      totals: {
        massTonnes: 100,
        embeddedEmissions: 0,
        freeAllocationAdjustment: 0,
        deduction: 0,
        certificates: 0,
        certificateCost: 1200,
        incomplete: false,
        planning: true,
        forecast: true,
      },
    },
    certificateSaving: 5800,
    additionalCostsFirstYear: 5900,
    additionalCostsRecurring: 5000,
    netSavingFirstYear: -100,
    netSavingRecurring: 800,
    comparable: true,
    comparableNote: 'ok',
    breakEvenFirstYear: { kind: 'AT_QUANTITY', explanation: 'be' },
    breakEvenRecurring: { kind: 'AT_QUANTITY', explanation: 'be' },
    conclusion: 'Importer conclusion text.',
    ...over,
  };
}

describe('conclusionForAudience', () => {
  it('returns engine conclusion for importer audience', () => {
    expect(conclusionForAudience(stub(), 'IMPORTER')).toBe('Importer conclusion text.');
  });

  it('frames exporter conclusion around buyer certificates and exporter verification', () => {
    const text = conclusionForAudience(stub(), 'EXPORTER');
    expect(text).toMatch(/For your EU buyer/);
    expect(text).toMatch(/non-EU exporter/i);
    expect(text).toMatch(/ADDITIONAL COST/i);
    expect(text).toMatch(/break-even/i);
    expect(text).toMatch(/Planning scenario—verification pending/);
  });
});
