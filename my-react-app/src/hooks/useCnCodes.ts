import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { tr } from '../i18n';
import { useAppLanguage } from '../i18n/useAppLanguage';

export interface CnCodeDto {
  id: number;
  cnCode: string;
  /** Localized by the backend (Accept-Language); display text only. */
  description: string;
  sortOrder: number;
  isActive: boolean;
}

interface CnCodesResponse {
  success: boolean;
  count?: number;
  cnCodes?: CnCodeDto[];
  message?: string;
}

export function useCnCodes(): {
  cnCodes: CnCodeDto[];
  loading: boolean;
  error: string | null;
} {
  const [cnCodes, setCnCodes] = useState<CnCodeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Descriptions come localized from the backend: reload when the language changes.
  const language = useAppLanguage();

  useEffect(() => {
    let cancelled = false;

    async function fetchCnCodes() {
      // Initial load only shows the loading state; a language switch keeps the list on screen.
      setError(null);
      const result = await apiRequest<CnCodesResponse>('/cn-codes/active');
      if (cancelled) return;
      if (result === null) {
        setError(tr('err.notAuthenticated'));
        setCnCodes([]);
      } else if (!result.data.success || !result.data.cnCodes) {
        setError(result.data.message ?? tr('err.cnCodes'));
        setCnCodes([]);
      } else {
        setCnCodes(result.data.cnCodes);
      }
      setLoading(false);
    }

    fetchCnCodes();
    return () => {
      cancelled = true;
    };
  }, [language]);

  return { cnCodes, loading, error };
}
