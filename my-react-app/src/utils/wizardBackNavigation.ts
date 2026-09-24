/** Steps that auto-forward in the UI; never show as a Back destination. */
export const HIDDEN_WIZARD_STEPS = new Set(['SABIRNA_TACKA']);

export type WizardAnswerLookup = {
  getAnswerByCode: (code: string) => string;
  hasAnswerByCode: (code: string) => boolean;
};

/** Static previous step when the in-session stack is empty (e.g. after refresh). */
export const STEP_PREVIOUS_FALLBACK: Record<string, string> = {
  ALU_DECLARATION: 'CBAM_PRODUCT_DETAILS',
  ALU_PRODUCTS_UNWROUGHT_INPUT: 'ALU_DECLARATION',
  ALU_OWN_EMBEDDED_EMISSIONS: 'ALU_PRODUCTS_UNWROUGHT_INPUT',
  ALU_EXTERNAL_EMBEDDED_VALUE: 'ALU_OWN_EMBEDDED_EMISSIONS',
  ALU_EXTERNAL_PURCHASED_QTY: 'ALU_EXTERNAL_EMBEDDED_VALUE',
  ALU_EXTERNAL_UNWROUGHT_INPUT: 'ALU_PRODUCTS_UNWROUGHT_INPUT',
  ALU_PRODUCTS_ALLOYING: 'ALU_PRODUCTS_PRECURSORS',
  ALU_PRODUCTS_ALLOYING_PERCENT: 'ALU_PRODUCTS_ALLOYING',
  ALU_SECONDARY_UNWROUGHT_QTY: 'ALU_SECONDARY_UNWROUGHT_SOURCES',
  ALU_SECONDARY_EMBEDDED_EMISSIONS: 'ALU_SECONDARY_UNWROUGHT_QTY',
  ALU_SECONDARY_EMBEDDED_EMISSIONS_VALUE: 'ALU_SECONDARY_EMBEDDED_EMISSIONS',
  ALU_SECONDARY_ALLOYING_PERCENT: 'ALU_SECONDARY_ALLOYING_ELEMENTS',
};

function resolveElectricityTerminalStep(lookup: WizardAnswerLookup): string {
  const source = lookup.getAnswerByCode('ALU_ELECTRICITY_SOURCE');
  if (source === 'GRID') return 'ALU_GRID_CONSUMPTION';
  if (source === 'OWN_PLANT') {
    return lookup.hasAnswerByCode('ALU_OWN_PLANT_CONSUMPTION')
      ? 'ALU_OWN_PLANT_CONSUMPTION'
      : 'ALU_OWN_PLANT_FUEL_TYPE';
  }
  if (source === 'PPA') {
    const ppaHas = lookup.getAnswerByCode('ALU_PPA_HAS_EMISSION_FACTOR');
    return ppaHas === 'YES' ? 'ALU_PPA_EMISSION_FACTOR_AND_CONSUMPTION' : 'ALU_PPA_CONSUMPTION_ONLY';
  }
  return 'ALU_ELECTRICITY_SOURCE';
}

function isProductsFlow(lookup: WizardAnswerLookup): boolean {
  return lookup.getAnswerByCode('ALU_DECLARATION_PRODUCT') === 'ALU_PRODUCTS';
}

/** Infer the previous visible step from saved answers when the stack is missing. */
export function inferPreviousStepFallback(
  currentStepCode: string,
  lookup: WizardAnswerLookup,
): string | null {
  if (STEP_PREVIOUS_FALLBACK[currentStepCode]) {
    return STEP_PREVIOUS_FALLBACK[currentStepCode];
  }

  switch (currentStepCode) {
    case 'ALU_PRODUCTS_PRECURSORS':
      if (lookup.hasAnswerByCode('ALU_EXTERNAL_UNWROUGHT_ENTRY')) {
        return 'ALU_EXTERNAL_UNWROUGHT_INPUT';
      }
      if (lookup.getAnswerByCode('ALU_PRODUCTS_UNWROUGHT_INPUT') === 'NO_SEMI_FINISHED_ONLY') {
        return 'ALU_PRODUCTS_UNWROUGHT_INPUT';
      }
      if (lookup.getAnswerByCode('ALU_OWN_EMBEDDED_EMISSIONS') === 'YES') {
        return 'ALU_EXTERNAL_PURCHASED_QTY';
      }
      if (lookup.getAnswerByCode('ALU_OWN_EMBEDDED_EMISSIONS') === 'NO') {
        return resolveElectricityTerminalStep(lookup);
      }
      return 'ALU_PRODUCTS_UNWROUGHT_INPUT';

    case 'ALU_UNWROUGHT':
      if (isProductsFlow(lookup) && lookup.getAnswerByCode('ALU_OWN_EMBEDDED_EMISSIONS') === 'NO') {
        return 'ALU_OWN_EMBEDDED_EMISSIONS';
      }
      return 'ALU_DECLARATION';

    case 'ALU_SECONDARY_UNWROUGHT_SOURCES':
      if (isProductsFlow(lookup) && lookup.getAnswerByCode('ALU_OWN_EMBEDDED_EMISSIONS') === 'NO') {
        return resolveElectricityTerminalStep(lookup);
      }
      return 'ALU_UNWROUGHT';

    case 'ALU_SECONDARY_ALLOYING_ELEMENTS': {
      const sourcesAnswer = lookup.getAnswerByCode('ALU_SECONDARY_UNWROUGHT_SOURCES');
      if (sourcesAnswer === 'YES') {
        return lookup.hasAnswerByCode('ALU_SECONDARY_EMBEDDED_EMISSIONS_VALUE')
          ? 'ALU_SECONDARY_EMBEDDED_EMISSIONS_VALUE'
          : 'ALU_SECONDARY_EMBEDDED_EMISSIONS';
      }
      return 'ALU_SECONDARY_UNWROUGHT_SOURCES';
    }

    case 'ALU_PRODUCTS_REMAINING_FUEL_INPUT':
      return lookup.hasAnswerByCode('ALU_PRODUCTS_ALLOYING_PERCENT')
        ? 'ALU_PRODUCTS_ALLOYING_PERCENT'
        : 'ALU_PRODUCTS_ALLOYING';

    default:
      return null;
  }
}

/** Pop the navigation stack, skipping hidden routing hubs. */
export function resolvePreviousStep(
  stack: string[],
  currentStepCode: string,
  lookup: WizardAnswerLookup,
): string | null {
  while (stack.length > 0) {
    const candidate = stack.pop() ?? null;
    if (candidate && !HIDDEN_WIZARD_STEPS.has(candidate)) {
      return candidate;
    }
  }
  return inferPreviousStepFallback(currentStepCode, lookup);
}
