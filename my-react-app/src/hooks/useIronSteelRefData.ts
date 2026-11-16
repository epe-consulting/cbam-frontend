import { useEffect, useMemo, useState } from 'react';
import {
  getIsCnMapping,
  getIsExemptOrigins,
  getIsStandardFactors,
  validateIsCn,
  type IsCnMappingRow,
  type IsCnValidation,
  type IsExemptOrigins,
  type IsStandardFactor,
} from '../api/ironSteel';
import { cnDigits } from '../utils/steelSteps';

/* Module-level caches: reference data does not change during a session. */
let factorsCache: IsStandardFactor[] | null = null;
let exemptCache: IsExemptOrigins | null = null;
let cnMappingCache: IsCnMappingRow[] | null = null;
const cnValidationCache = new Map<string, IsCnValidation>();

function useCachedLoad<T>(getCache: () => T | null, setCache: (v: T) => void, load: () => Promise<T>, empty: T) {
  const [data, setData] = useState<T>(() => getCache() ?? empty);
  const [loading, setLoading] = useState(() => getCache() == null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (getCache() != null) return;
    let cancelled = false;
    load()
      .then((v) => { setCache(v); if (!cancelled) setData(v); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Greška pri učitavanju'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { data, loading, error };
}

export function useIsStandardFactors() {
  const { data, loading, error } = useCachedLoad<IsStandardFactor[]>(
    () => factorsCache, (v) => { factorsCache = v; }, getIsStandardFactors, [],
  );
  const byWizardCode = useMemo(() => {
    const m: Record<string, IsStandardFactor> = {};
    data.forEach((f) => { if (f.wizardCode) m[f.wizardCode] = f; });
    return m;
  }, [data]);
  return { factors: data, byWizardCode, loading, error };
}

export function useIsExemptOrigins() {
  const { data, loading, error } = useCachedLoad<IsExemptOrigins>(
    () => exemptCache, (v) => { exemptCache = v; }, getIsExemptOrigins, { countries: [], territories: [] },
  );
  return { exempt: data, loading, error };
}

export function useIsCnMapping() {
  const { data, loading, error } = useCachedLoad<IsCnMappingRow[]>(
    () => cnMappingCache, (v) => { cnMappingCache = v; }, getIsCnMapping, [],
  );
  return { rows: data, loading, error };
}

/**
 * Validates CN codes with GET /is/cn-validate (cached per code).
 * Returns a map digits -> result; a code is absent from the map while its request is pending.
 */
export function useIsCnValidation(codes: string[], allowShort = false) {
  const [results, setResults] = useState<Record<string, IsCnValidation>>({});
  const key = useMemo(() => {
    const digits = codes.map(cnDigits).filter((d) => (allowShort ? /^(\d{4}|\d{6}|\d{8})$/ : /^\d{8}$/).test(d));
    return [...new Set(digits)].sort().join(',');
  }, [codes, allowShort]);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const digits = key.split(',');
    const cached: Record<string, IsCnValidation> = {};
    const missing: string[] = [];
    digits.forEach((d) => {
      const c = cnValidationCache.get(`${allowShort ? 's' : 'f'}:${d}`);
      if (c) cached[d] = c; else missing.push(d);
    });
    if (Object.keys(cached).length > 0) setResults((prev) => ({ ...prev, ...cached }));
    missing.forEach((d) => {
      validateIsCn(d, allowShort)
        .then((r) => {
          if (r.errorCode !== 'SESSION') cnValidationCache.set(`${allowShort ? 's' : 'f'}:${d}`, r);
          if (!cancelled) setResults((prev) => ({ ...prev, [d]: r }));
        })
        .catch(() => {
          if (!cancelled) setResults((prev) => ({ ...prev, [d]: { ok: false, errorCode: 'NETWORK', message: 'Provjera CN koda nije uspjela' } }));
        });
    });
    return () => { cancelled = true; };
  }, [key, allowShort]);

  return results;
}
