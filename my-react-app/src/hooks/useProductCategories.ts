import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

export interface ProductCategoryDto {
  id: number;
  code: string;
  name: string;
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
  categories: ProductCategoryDto[];
  loading: boolean;
  error: string | null;
} {
  const [categories, setCategories] = useState<ProductCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      setLoading(true);
      setError(null);
      const result = await apiRequest<ProductCategoriesResponse>('/product-categories/all');
      if (cancelled) return;
      if (result === null) {
        setError('Session expired or not authenticated');
        setCategories([]);
      } else if (!result.data.success || !result.data.productCategories) {
        setError(result.data.message ?? 'Failed to load product categories');
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
  }, []);

  const categoryNames = categories.map((c: ProductCategoryDto) => c.name);

  return {
    categoryNames,
    categories,
    loading,
    error,
  };
}
