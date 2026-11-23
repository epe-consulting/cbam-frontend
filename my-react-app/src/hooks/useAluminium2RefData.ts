import { useEffect, useMemo, useState } from 'react';
import {
  getAl2CnMapping, getAl2DefaultValue, getAl2PfcFactors, validateAl2Cn,
  type Al2CnValidation, type Al2DefaultValueResult,
} from '../api/aluminium2';
import type { Al2CnMapping, Al2PfcFactorRow } from '../utils/aluminium2Steps';
import { cnDigits } from '../utils/steelSteps';
import { tr } from '../i18n';

/*
 * Aluminium II reference data (GET /al2/*). Standard factors (FUEL, CARBONATE, GWP) and exempt origins reuse
 * hooks/useIronSteelRefData.ts. CN descriptions of /al2/cn-mapping are English only (contract §6.11), so the
 * caches are not per language.
 */

let cnMappingCache: Al2CnMapping | null = null;
let pfcFactorsCache: Al2PfcFactorRow[] | null = null;
const dvCache = new Map<string, Al2DefaultValueResult>();
const cnValidationCache = new Map<string, Al2CnValidation>();

const EMPTY_MAPPING: Al2CnMapping = { rows: [], excluded: [] };

export function useAl2CnMapping() {
  const [mapping, setMapping] = useState<Al2CnMapping>(() => cnMappingCache ?? EMPTY_MAPPING);
  const [loading, setLoading] = useState(() => cnMappingCache == null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (cnMappingCache) { setMapping(cnMappingCache); setLoading(false); return; }
    let cancelled = false;
    getAl2CnMapping()
      .then((m) => { cnMappingCache = m; if (!cancelled) { setMapping(m); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : tr('err.loading')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { mapping, loading, error };
}

export function useAl2PfcFactors() {
  const [rows, setRows] = useState<Al2PfcFactorRow[]>(() => pfcFactorsCache ?? []);
  const [loading, setLoading] = useState(() => pfcFactorsCache == null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (pfcFactorsCache) { setRows(pfcFactorsCache); setLoading(false); return; }
    let cancelled = false;
    getAl2PfcFactors()
      .then((r) => { pfcFactorsCache = r; if (!cancelled) { setRows(r); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : tr('err.loading')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { rows, loading, error };
}

/**
 * Validates 8-digit CN codes with GET /al2/cn-validate (cached per code). Returns digits → result; a code is
 * absent while its request is pending. Codes that are not 8 digits are not sent (the local check reports them).
 */
export function useAl2CnValidation(codes: string[]) {
  const [results, setResults] = useState<Record<string, Al2CnValidation>>({});
  const key = useMemo(() => [...new Set(codes.map((c) => cnDigits(c ?? '')).filter((d) => /^\d{8}$/.test(d)))].sort().join(','), [codes]);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    key.split(',').forEach((d) => {
      const cached = cnValidationCache.get(d);
      if (cached) { setResults((prev) => (prev[d] === cached ? prev : { ...prev, [d]: cached })); return; }
      validateAl2Cn(d)
        .then((r) => {
          if (r.errorCode !== 'SESSION') cnValidationCache.set(d, r);
          if (!cancelled) setResults((prev) => ({ ...prev, [d]: r }));
        })
        .catch(() => {
          if (!cancelled) setResults((prev) => ({ ...prev, [d]: { ok: false, errorCode: 'NETWORK', message: tr('err.cnCheck') } }));
        });
    });
    return () => { cancelled = true; };
  }, [key]);
  return results;
}

export interface Al2DvRequest { cn: string; country: string; year: number; annex: 'I' | 'IV' }

export function al2DvRequestKey(r: Al2DvRequest): string {
  return `${r.annex}|${cnDigits(r.cn)}|${r.annex === 'IV' ? '' : r.country}|${r.year}`;
}

/** Default-value previews (GET /al2/default-value), cached per request; map key = al2DvRequestKey. */
export function useAl2DefaultValues(requests: Al2DvRequest[]) {
  const [results, setResults] = useState<Record<string, Al2DefaultValueResult>>({});
  const key = useMemo(() => [...new Set(requests.map(al2DvRequestKey))].sort().join('\n'), [requests]);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    key.split('\n').forEach((k) => {
      const cached = dvCache.get(k);
      if (cached) { setResults((prev) => (prev[k] === cached ? prev : { ...prev, [k]: cached })); return; }
      const [annex, cn, country, year] = k.split('|');
      getAl2DefaultValue(cn, country, Number(year), annex as 'I' | 'IV')
        .then((r) => {
          if (r.errorCode !== 'SESSION') dvCache.set(k, r);
          if (!cancelled) setResults((prev) => ({ ...prev, [k]: r }));
        })
        .catch(() => {
          if (!cancelled) setResults((prev) => ({ ...prev, [k]: { ok: false, warnings: [], errorCode: 'NETWORK', message: tr('err.loading') } }));
        });
    });
    return () => { cancelled = true; };
  }, [key]);
  return results;
}
