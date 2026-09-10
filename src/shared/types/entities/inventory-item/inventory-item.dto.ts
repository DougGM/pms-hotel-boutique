import type { CatalogCategoryDto } from '@/shared/constants/catalog-categories';

export type InventoryItemCategoryDto = CatalogCategoryDto;
export type InventoryUnitDto = 'unit' | 'box' | 'bottle' | 'kg' | 'liter' | 'roll';

/**
 * Artículo de inventario (Lote D, WEB-12) — más amplio que `product`
 * (Room Service vendible al huésped): también cubre insumos operativos
 * (blancos, químicos de limpieza, ingredientes de cocina) que nunca se
 * venden sueltos. El vínculo con `product` ya no es una FK propia de este
 * DTO — es `product.inventory_consumption`, que apunta hacia acá con
 * cantidad (ver docs/DECISIONES.md, D-006); un artículo puede ser
 * consumido por cero, uno o varios productos. `category` comparte
 * taxonomía con `product.category` (D-005/D-006) — un artículo vinculado
 * a un producto usa la misma categoría que ese producto (p. ej. "Agua
 * mineral" es `minibar` en ambos). `current_quantity` es un valor
 * guardado — coincide con la suma de sus `inventory_movement` (entradas
 * menos salidas); la FASE 5 (WEB-11/WEB-12) lo verifica.
 */
export interface InventoryItemDTO {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: InventoryItemCategoryDto;
  unit: InventoryUnitDto;
  current_quantity: number;
  minimum_quantity: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type InventoryItemDto = InventoryItemDTO;
