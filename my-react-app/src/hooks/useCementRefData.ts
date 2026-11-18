import { useEffect, useMemo, useState } from 'react';
import { getCeCnMapping, getCeDefaultValue, type CeDefaultValueResult } from '../api/cement';
import type { CeCnMappingRow } from '../utils/cementSteps';
import { tr } from '../i18n';
import { useAppLanguage } from '../i18n/useAppLanguage';

/* Cement reference data (GET /ce/*). Standard factors, grid EF and exempt origins reuse hooks/useIronSteelRefData.ts. */

const cnMappingCache = new Map<string, CeCnMappingRow[]>();
const dvCache = new Map<string, CeDefaultValueResult>();

/** CN/TARIC mapping of the 6 cement CN codes, cached per language (descriptions come localized). */
export function useCeCnMapping() {
  const language = useAppLanguage();
  const [rows, setRows] = useState<CeCnMappingRow[]>(() => cnMappingCache.get(language) ?? []);
  const [loading, setLoading] = useState(() => !cnMappingCache.has(language));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const cached = cnMappingCache.get(language);
    if (cached) { setRows(cached); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    getCeCnMapping()
      .then((r) => {
        const sorted = [...r].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        cnMappingCache.set(language, sorted);
        if (!cancelled) { setRows(sorted); setError(null); }
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : tr('err.loading')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [language]);
  return { rows, loading, error };
}

export interface CeDvRequest { code: string; country: string; year: number; annex: 'I' | 'IV' }

export function dvRequestKey(r: CeDvRequest): string {
  return `${r.annex}|${r.code}|${r.country}|${r.year}`;
}

/** Default-value previews (GET /ce/default-value), cached per request; map key = dvRequestKey. */
export function useCeDefaultValues(requests: CeDvRequest[]) {
  const [results, setResults] = useState<Record<string, CeDefaultValueResult>>({});
  const key = useMemo(() => [...new Set(requests.map(dvRequestKey))].sort().join('\n'), [requests]);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    key.split('\n').forEach((k) => {
      const cached = dvCache.get(k);
      if (cached) { setResults((prev) => ({ ...prev, [k]: cached })); return; }
      const [annex, code, country, year] = k.split('|');
      getCeDefaultValue(code, country, Number(year), annex as 'I' | 'IV')
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
