import type { Currency } from '@/shared/types/common';
import type { CatalogCategory } from '@/shared/constants/catalog-categories';

export type ProductCategory = CatalogCategory;

export interface ProductInventoryConsumption {
  inventoryItemId: string;
  quantity: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: ProductCategory;
  priceCents: number;
  currency: Currency;
  stockQuantity: number;
  reorderLevel: number;
  /** `[]` cuando el producto no consume inventario — nunca `undefined`. */
  inventoryConsumption: ProductInventoryConsumption[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
