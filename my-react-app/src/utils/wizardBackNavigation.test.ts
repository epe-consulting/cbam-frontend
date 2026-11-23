/**
 * Back navigation fallback (no in-session step stack, e.g. after a page refresh) for the aluminium
 * routes changed in post-043. Routing only, no regulatory values.
 */
import { describe, expect, it } from 'vitest';
import { inferPreviousStepFallback, type WizardAnswerLookup } from './wizardBackNavigation';

const lookup = (answers: Record<string, string>): WizardAnswerLookup => ({
  getAnswerByCode: (code) => answers[code] ?? '',
  hasAnswerByCode: (code) => code in answers,
});

const UNWROUGHT = { ALU_DECLARATION_PRODUCT: 'UNWROUGHT_CN7601' };
const PRODUCTS_OWN = { ALU_DECLARATION_PRODUCT: 'ALU_PRODUCTS', ALU_OWN_EMBEDDED_EMISSIONS: 'NO' };

describe('Back from the secondary module start', () => {
  it('7601 + Oba: back to the end of the primary module (flue gas)', () => {
    expect(inferPreviousStepFallback('ALU_SECONDARY_UNWROUGHT_SOURCES',
      lookup({ ...UNWROUGHT, ALU_UNWROUGHT_PRODUCTION_METHOD: 'BOTH', ALU_DATA_AVAILABILITY: 'HAS_REAL_INPUTS' })))
      .toBe('ALU_FLUE_GAS_TREATMENT');
  });

  it('Oba with already calculated emissions: back to the emissions input', () => {
    expect(inferPreviousStepFallback('ALU_SECONDARY_UNWROUGHT_SOURCES',
      lookup({ ...PRODUCTS_OWN, ALU_UNWROUGHT_PRODUCTION_METHOD: 'BOTH', ALU_DATA_AVAILABILITY: 'HAS_EMISSIONS_ONLY' })))
      .toBe('ALU_EMISSIONS_INPUT');
  });

  it('Sekundarni only: back to the production method question', () => {
    expect(inferPreviousStepFallback('ALU_SECONDARY_UNWROUGHT_SOURCES',
      lookup({ ...UNWROUGHT, ALU_UNWROUGHT_PRODUCTION_METHOD: 'SECONDARY' }))).toBe('ALU_UNWROUGHT');
    expect(inferPreviousStepFallback('ALU_SECONDARY_UNWROUGHT_SOURCES',
      lookup({ ...PRODUCTS_OWN, ALU_UNWROUGHT_PRODUCTION_METHOD: 'SECONDARY' }))).toBe('ALU_UNWROUGHT');
  });
});

describe('Back from precursors (products, own production)', () => {
  it('primary with already calculated emissions: back to the emissions input', () => {
    expect(inferPreviousStepFallback('ALU_PRODUCTS_PRECURSORS',
      lookup({ ...PRODUCTS_OWN, ALU_UNWROUGHT_PRODUCTION_METHOD: 'PRIMARY', ALU_DATA_AVAILABILITY: 'HAS_EMISSIONS_ONLY' })))
      .toBe('ALU_EMISSIONS_INPUT');
  });

  it('primary / secondary / Oba with detailed data: back to flue gas', () => {
    for (const method of ['PRIMARY', 'SECONDARY', 'BOTH']) {
      expect(inferPreviousStepFallback('ALU_PRODUCTS_PRECURSORS',
        lookup({ ...PRODUCTS_OWN, ALU_UNWROUGHT_PRODUCTION_METHOD: method, ALU_DATA_AVAILABILITY: 'HAS_REAL_INPUTS' })))
        .toBe('ALU_FLUE_GAS_TREATMENT');
    }
  });
});

describe('Back from the additional questions', () => {
  it('7601 primary with already calculated emissions: back to the emissions input', () => {
    expect(inferPreviousStepFallback('ALU_UNWROUGHT_ADDITIONAL',
      lookup({ ...UNWROUGHT, ALU_UNWROUGHT_PRODUCTION_METHOD: 'PRIMARY', ALU_DATA_AVAILABILITY: 'HAS_EMISSIONS_ONLY' })))
      .toBe('ALU_EMISSIONS_INPUT');
  });

  it('7601 Oba: back to flue gas of the secondary module', () => {
    expect(inferPreviousStepFallback('ALU_UNWROUGHT_ADDITIONAL',
      lookup({ ...UNWROUGHT, ALU_UNWROUGHT_PRODUCTION_METHOD: 'BOTH', ALU_DATA_AVAILABILITY: 'HAS_EMISSIONS_ONLY' })))
      .toBe('ALU_FLUE_GAS_TREATMENT');
  });

  it('products: back to flue gas of the products stage', () => {
    expect(inferPreviousStepFallback('ALU_UNWROUGHT_ADDITIONAL',
      lookup({ ...PRODUCTS_OWN, ALU_UNWROUGHT_PRODUCTION_METHOD: 'PRIMARY', ALU_DATA_AVAILABILITY: 'HAS_EMISSIONS_ONLY' })))
      .toBe('ALU_FLUE_GAS_TREATMENT');
  });
});

describe('Aluminium II (AL2_*) back navigation', () => {
  it('static chain after a reload (aluminium2 spec §4.2)', () => {
    expect(inferPreviousStepFallback('AL2_GENERAL', lookup({}))).toBe('CBAM_PRODUCT_DETAILS');
    expect(inferPreviousStepFallback('AL2_PFC', lookup({}))).toBe('AL2_DIRECT_EMISSIONS');
    expect(inferPreviousStepFallback('AL2_REPORTING_PARAMS', lookup({}))).toBe('AL2_PRECURSORS');
  });

  it('COMPLETE goes back to the last step of the chosen path', () => {
    expect(inferPreviousStepFallback('COMPLETE', lookup({ AL2_DATA_SOURCE: 'DEFAULT_VALUES' }))).toBe('AL2_GENERAL');
    expect(inferPreviousStepFallback('COMPLETE', lookup({ AL2_DATA_SOURCE: 'ACTUAL_VALUES' }))).toBe('AL2_REPORTING_PARAMS');
  });

  it('steel and cement answers keep their own result', () => {
    expect(inferPreviousStepFallback('COMPLETE', lookup({ IS_DATA_SOURCE: 'ACTUAL_VALUES' }))).toBe('IS_REPORTING_PARAMS');
    expect(inferPreviousStepFallback('COMPLETE', lookup({ CE_DATA_SOURCE: 'ACTUAL_VALUES' }))).toBe('CE_PRECURSORS');
    expect(inferPreviousStepFallback('COMPLETE', lookup({}))).toBeNull();
  });
});
