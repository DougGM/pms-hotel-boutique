import type { Currency } from '@/shared/types/common';

export type ProductCategoryDto = 'minibar' | 'shop' | 'food_and_beverage' | 'other';

export interface ProductDTO {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: ProductCategoryDto;
  price_cents: number;
  currency: Currency;
  stock_quantity: number;
  reorder_level: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductDto = ProductDTO;
