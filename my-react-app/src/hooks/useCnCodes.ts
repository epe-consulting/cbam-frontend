import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

export interface CnCodeDto {
  id: number;
  cnCode: string;
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

  useEffect(() => {
    let cancelled = false;

    async function fetchCnCodes() {
      setLoading(true);
      setError(null);
      const result = await apiRequest<CnCodesResponse>('/cn-codes/active');
      if (cancelled) return;
      if (result === null) {
        setError('Session expired or not authenticated');
        setCnCodes([]);
      } else if (!result.data.success || !result.data.cnCodes) {
        setError(result.data.message ?? 'Failed to load CN codes');
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
  }, []);

  return { cnCodes, loading, error };
}
