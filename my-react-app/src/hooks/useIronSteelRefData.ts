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
import { tr } from '../i18n';
import { useAppLanguage } from '../i18n/useAppLanguage';

/*
 * Module-level caches, one per language: descriptions (CN codes, standard factors) come
 * localized from the backend (Accept-Language). Codes and numbers are the same in every language.
 */
const factorsCache = new Map<string, IsStandardFactor[]>();
const exemptCache = new Map<string, IsExemptOrigins>();
const cnMappingCache = new Map<string, IsCnMappingRow[]>();
const cnValidationCache = new Map<string, IsCnValidation>();

function useCachedLoad<T>(cache: Map<string, T>, load: () => Promise<T>, empty: T) {
  const language = useAppLanguage();
  const [data, setData] = useState<T>(() => cache.get(language) ?? empty);
  const [loading, setLoading] = useState(() => !cache.has(language));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const cached = cache.get(language);
    if (cached != null) { setData(cached); return; }
    // A language switch keeps the previous list on screen until the new one arrives.
    let cancelled = false;
    load()
      .then((v) => { cache.set(language, v); if (!cancelled) setData(v); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : tr('err.loading')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);
  return { data, loading, error };
}

export function useIsStandardFactors() {
  const { data, loading, error } = useCachedLoad<IsStandardFactor[]>(factorsCache, getIsStandardFactors, []);
  const byWizardCode = useMemo(() => {
    const m: Record<string, IsStandardFactor> = {};
    data.forEach((f) => { if (f.wizardCode) m[f.wizardCode] = f; });
    return m;
  }, [data]);
  return { factors: data, byWizardCode, loading, error };
}

export function useIsExemptOrigins() {
  const { data, loading, error } = useCachedLoad<IsExemptOrigins>(exemptCache, getIsExemptOrigins, { countries: [], territories: [] });
  return { exempt: data, loading, error };
}

export function useIsCnMapping() {
  const { data, loading, error } = useCachedLoad<IsCnMappingRow[]>(cnMappingCache, getIsCnMapping, []);
  return { rows: data, loading, error };
}

/**
 * Validates CN codes with GET /is/cn-validate (cached per code).
 * Returns a map digits -> result; a code is absent from the map while its request is pending.
 */
export function useIsCnValidation(codes: string[], allowShort = false) {
  const language = useAppLanguage();
  const [results, setResults] = useState<Record<string, IsCnValidation>>({});
  const key = useMemo(() => {
    // 4–8 digits in both modes (5 = ferro-alloy headings 7202 1/4/6); checkCn applies the stricter
    // 4/6/8 format for allowShort rows that need no default value.
    const digits = codes.map(cnDigits).filter((d) => /^\d{4,8}$/.test(d));
    return [...new Set(digits)].sort().join(',');
  }, [codes]);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const digits = key.split(',');
    const cached: Record<string, IsCnValidation> = {};
    const missing: string[] = [];
    digits.forEach((d) => {
      const c = cnValidationCache.get(`${language}:${allowShort ? 's' : 'f'}:${d}`);
      if (c) cached[d] = c; else missing.push(d);
    });
    if (Object.keys(cached).length > 0) setResults((prev) => ({ ...prev, ...cached }));
    missing.forEach((d) => {
      validateIsCn(d, allowShort)
        .then((r) => {
          if (r.errorCode !== 'SESSION') cnValidationCache.set(`${language}:${allowShort ? 's' : 'f'}:${d}`, r);
          if (!cancelled) setResults((prev) => ({ ...prev, [d]: r }));
        })
        .catch(() => {
          if (!cancelled) setResults((prev) => ({ ...prev, [d]: { ok: false, errorCode: 'NETWORK', message: tr('err.cnCheck') } }));
        });
    });
    return () => { cancelled = true; };
  }, [key, allowShort, language]);

  return results;
}
