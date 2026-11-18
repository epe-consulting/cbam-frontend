import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { tr } from '../i18n';

export interface CountryDto {
  id: number;
  country: string;
  isEu: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface CountriesResponse {
  success: boolean;
  count?: number;
  countries?: CountryDto[];
  message?: string;
}

export function useCountries(): {
  countries: CountryDto[];
  loading: boolean;
  error: string | null;
} {
  const [countries, setCountries] = useState<CountryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCountries() {
      setLoading(true);
      setError(null);
      const result = await apiRequest<CountriesResponse>('/countries/active');
      if (cancelled) return;
      if (result === null) {
        setError(tr('err.notAuthenticated'));
        setCountries([]);
      } else if (!result.data.success || !result.data.countries) {
        setError(result.data.message ?? tr('err.countries'));
        setCountries([]);
      } else {
        setCountries(result.data.countries);
      }
      setLoading(false);
    }

    fetchCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  return { countries, loading, error };
}
