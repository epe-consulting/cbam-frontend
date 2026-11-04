import { API_BASE_URL } from '../utils/api';

export interface ProductCategoryCostDefaults {
  code: string;
  name: string;
  quantityUnit: string;
  suggestedDefaultSee: number;
  suggestedActualSee: number;
  suggestedVerificationCostBam: number;
  markupPercent: number;
  notes: string;
}

export interface CostCalculatorDefaults {
  platformAnnualFeeBam: number;
  platformAnnualFeeEur: number;
  bamToEurRate: number;
  certificatePriceEur: number;
  certificatePriceLabel: string;
  defaultMarkupPercent: number;
  quantityUnitHint: string;
  categories: ProductCategoryCostDefaults[];
}

export interface CostCalculatorRequestPayload {
  productCategoryCode: string;
  productDescription: string;
  annualQuantity: number;
  actualSpecificEmbeddedEmissions?: number | null;
  defaultSpecificEmbeddedEmissions?: number | null;
  verificationCostBam?: number | null;
  certificatePriceEur?: number | null;
  /** Honeypot — always send empty string from the UI. */
  website?: string;
}

export interface CostCalculatorResult {
  productCategoryCode: string;
  productCategoryName: string;
  productDescription: string;
  annualQuantity: number;
  quantityUnit: string;
  defaultSpecificEmbeddedEmissions: number;
  actualSpecificEmbeddedEmissions: number;
  certificatePriceEur: number;
  defaultPathCertificates: number;
  actualPathCertificates: number;
  defaultPathCbamCostEur: number;
  defaultPathCbamCostBam: number;
  actualPathCbamCostEur: number;
  actualPathCbamCostBam: number;
  platformFeeBam: number;
  platformFeeEur: number;
  verificationCostBam: number;
  verificationCostEur: number;
  actualPathTotalCostEur: number;
  actualPathTotalCostBam: number;
  savingsEur: number;
  savingsBam: number;
  recommendation: 'ACTUAL_CBAM' | 'DEFAULT_VALUES' | string;
  recommendationMessage: string;
  disclaimer: string;
}

interface DefaultsApiResponse {
  success: boolean;
  defaults?: CostCalculatorDefaults;
  message?: string;
}

interface CompareApiResponse {
  success: boolean;
  result?: CostCalculatorResult;
  message?: string;
}

async function publicJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; status: number; retryAfterSeconds: number | null }> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const retryHeader = response.headers.get('Retry-After');
  const retryAfterSeconds = retryHeader ? Number(retryHeader) : null;
  const data = (await response.json()) as T;
  return {
    data,
    status: response.status,
    retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
  };
}

export async function fetchCostCalculatorDefaults(): Promise<{
  defaults: CostCalculatorDefaults | null;
  error: string | null;
}> {
  try {
    const { data } = await publicJson<DefaultsApiResponse>('/cost-calculator/defaults');
    if (!data.success || !data.defaults) {
      return { defaults: null, error: data.message ?? 'Failed to load calculator defaults' };
    }
    return { defaults: data.defaults, error: null };
  } catch {
    return { defaults: null, error: 'Unable to reach the server. Please try again.' };
  }
}

export async function compareCostCalculator(
  payload: CostCalculatorRequestPayload
): Promise<{
  result: CostCalculatorResult | null;
  error: string | null;
  retryAfterSeconds: number | null;
}> {
  try {
    const { data, status, retryAfterSeconds } = await publicJson<CompareApiResponse>(
      '/cost-calculator/compare',
      {
        method: 'POST',
        body: JSON.stringify({ ...payload, website: payload.website ?? '' }),
      }
    );
    if (status === 429) {
      return {
        result: null,
        error: data.message ?? 'Too many requests. Please wait a minute and try again.',
        retryAfterSeconds: retryAfterSeconds ?? 60,
      };
    }
    if (!data.success || !data.result) {
      return { result: null, error: data.message ?? 'Failed to compare costs', retryAfterSeconds: null };
    }
    return { result: data.result, error: null, retryAfterSeconds: null };
  } catch {
    return {
      result: null,
      error: 'Unable to reach the server. Please try again.',
      retryAfterSeconds: null,
    };
  }
}
