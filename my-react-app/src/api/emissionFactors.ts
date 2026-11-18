import { apiRequest } from '../utils/api';

/**
 * A lookup list: `values` are the stored/filter values (never translated, sent back to the API),
 * `labels` maps each value to its localized display label (backend, Accept-Language).
 */
export interface LookupList {
  values: string[];
  labels: Record<string, string>;
}

function toLookupList(values: string[] | undefined, labels: Record<string, string> | undefined): LookupList {
  return { values: values ?? [], labels: labels ?? {} };
}

/**
 * GET /emission-factors/lookup/sectors
 */
export async function getLookupSectors(): Promise<LookupList> {
  const result = await apiRequest<{ success: boolean; sectors?: string[]; labels?: Record<string, string> }>('/emission-factors/lookup/sectors');
  if (result === null || !result.data.success) {
    throw new Error((result?.data as { message?: string })?.message ?? 'Failed to fetch sectors');
  }
  return toLookupList(result.data.sectors, result.data.labels);
}

/**
 * GET /emission-factors/lookup/subsectors?sector=...
 */
export async function getLookupSubsectors(sector: string): Promise<LookupList> {
  const result = await apiRequest<{ success: boolean; subsectors?: string[]; labels?: Record<string, string> }>(
    `/emission-factors/lookup/subsectors?sector=${encodeURIComponent(sector)}`
  );
  if (result === null || !result.data.success) {
    throw new Error((result?.data as { message?: string })?.message ?? 'Failed to fetch subsectors');
  }
  return toLookupList(result.data.subsectors, result.data.labels);
}

/**
 * GET /emission-factors/lookup/subsubsectors?sector=...&subsector=...
 */
export async function getLookupSubsubsectors(sector: string, subsector: string): Promise<LookupList> {
  const result = await apiRequest<{ success: boolean; subsubsectors?: string[]; labels?: Record<string, string> }>(
    `/emission-factors/lookup/subsubsectors?sector=${encodeURIComponent(sector)}&subsector=${encodeURIComponent(subsector)}`
  );
  if (result === null || !result.data.success) {
    throw new Error((result?.data as { message?: string })?.message ?? 'Failed to fetch subsubsectors');
  }
  return toLookupList(result.data.subsubsectors, result.data.labels);
}

/**
 * GET /emission-factors/lookup/emission-factor-names?sector=...&subsector=...&subsubsector=... (subsubsector optional)
 */
export async function getLookupEmissionFactorNames(
  sector: string,
  subsector: string,
  subsubsector: string | null
): Promise<LookupList> {
  const params = new URLSearchParams({ sector, subsector });
  if (subsubsector != null && subsubsector !== '') {
    params.set('subsubsector', subsubsector);
  }
  const result = await apiRequest<{ success: boolean; emissionFactorNames?: string[]; labels?: Record<string, string> }>(
    `/emission-factors/lookup/emission-factor-names?${params.toString()}`
  );
  if (result === null || !result.data.success) {
    throw new Error((result?.data as { message?: string })?.message ?? 'Failed to fetch emission factor names');
  }
  return toLookupList(result.data.emissionFactorNames, result.data.labels);
}

/**
 * GET /emission-factors/lookup/denominators?sector=...&subsector=...&subsubsector=...&emissionFactorName=...
 */
export async function getLookupDenominators(
  sector: string,
  subsector: string,
  subsubsector: string | null,
  emissionFactorName: string
): Promise<string[]> {
  const params = new URLSearchParams({ sector, subsector, emissionFactorName });
  if (subsubsector != null && subsubsector !== '') {
    params.set('subsubsector', subsubsector);
  }
  const result = await apiRequest<{ success: boolean; denominators?: string[] }>(
    `/emission-factors/lookup/denominators?${params.toString()}`
  );
  if (result === null || !result.data.success) {
    throw new Error((result?.data as { message?: string })?.message ?? 'Failed to fetch denominators');
  }
  return result.data.denominators ?? [];
}

export interface EmissionFactorLookupResult {
  emissionFactorId: number | null;
  value: number | null;
}

/**
 * GET /emission-factors/lookup/id?sector=...&subsector=...&subsubsector=...&emissionFactorName=...&denominator=...
 * Returns the emission_factors id and numeric value for the given selection (for formula: value × Količina).
 */
export async function getLookupId(
  sector: string,
  subsector: string,
  subsubsector: string | null,
  emissionFactorName: string,
  denominator: string
): Promise<EmissionFactorLookupResult> {
  const params = new URLSearchParams({ sector, subsector, emissionFactorName, denominator });
  if (subsubsector != null && subsubsector !== '') {
    params.set('subsubsector', subsubsector);
  }
  const result = await apiRequest<{ success: boolean; emissionFactorId?: number | null; value?: number | null }>(
    `/emission-factors/lookup/id?${params.toString()}`
  );
  if (result === null || !result.data.success) {
    throw new Error((result?.data as { message?: string })?.message ?? 'Failed to resolve emission factor id');
  }
  return {
    emissionFactorId: result.data.emissionFactorId ?? null,
    value: result.data.value ?? null,
  };
}
