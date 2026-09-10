import type { Currency } from '@/shared/types/common';
import type { CatalogCategoryDto } from '@/shared/constants/catalog-categories';

export type ProductCategoryDto = CatalogCategoryDto;

/**
 * Un artículo de inventario que se descuenta cuando se entrega este
 * producto, y cuánto de él (Lote D, WEB-12) — ver docs/DECISIONES.md,
 * D-006. `quantity` está expresada en la unidad del `inventory_item`
 * (`InventoryUnitDto`), no en una unidad propia del producto: un café que
 * se vende "por taza" pero se almacena en kg lleva aquí la fracción de kg
 * que consume una taza, no "1 taza".
 */
export interface ProductInventoryConsumptionDto {
  inventory_item_id: string;
  quantity: number;
}

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
  /**
   * Ausente o `[]` cuando el producto no consume ningún artículo de
   * inventario (un servicio como planchado) — es un caso válido, no una
   * omisión. Puede tener cero, uno o varios artículos.
   */
  inventory_consumption?: ProductInventoryConsumptionDto[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductDto = ProductDTO;
