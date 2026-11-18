import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { productCategoryLabel, tr } from '../i18n';
import { useAppLanguage } from '../i18n/useAppLanguage';

export interface ProductCategoryDto {
  id: number;
  code: string;
  /** Stored value (e.g. "Iron and Steel"); drives routing, never translated. */
  name: string;
  /** Localized label from the backend (Accept-Language); display only. */
  displayName?: string;
  sortOrder: number;
  isActive: boolean;
}

interface ProductCategoriesResponse {
  success: boolean;
  count?: number;
  productCategories?: ProductCategoryDto[];
  message?: string;
}

export function useProductCategories(): {
  categoryNames: string[];
  /** Stored name -> localized display label. */
  categoryLabels: Record<string, string>;
  categories: ProductCategoryDto[];
  loading: boolean;
  error: string | null;
} {
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // displayName comes localized from the backend: reload when the language changes.
  const language = useAppLanguage();

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      setError(null);
      const result = await apiRequest<ProductCategoriesResponse>('/product-categories/all');
      if (cancelled) return;
      if (result === null) {
        setError(tr('err.notAuthenticated'));
        setCategories([]);
      } else if (!result.data.success || !result.data.productCategories) {
        setError(result.data.message ?? tr('err.categories'));
        setCategories([]);
      } else {
        setCategories(result.data.productCategories);
      }
      setLoading(false);
    }

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, [language]);

  const categoryNames = categories.map((c: ProductCategoryDto) => c.name);
  const categoryLabels: Record<string, string> = {};
  categories.forEach((c: ProductCategoryDto) => {
    // Fallback to the locale-file map only when the backend sent no displayName.
    categoryLabels[c.name] = c.displayName || productCategoryLabel(c.name);
  });

  return {
    categoryNames,
    categoryLabels,
    categories,
    loading,
    error,
  };
}
