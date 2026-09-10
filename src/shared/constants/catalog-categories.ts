// Categoría compartida por `product` (Room Service) e `inventory_item`
// (Lote D, WEB-12): antes eran dos taxonomías divergentes
// (`ProductCategoryDto` vs. `InventoryItemCategoryDto`) que no tenían
// ningún valor en común — ver docs/DECISIONES.md, D-006. Se unifican aquí
// en una sola fuente para que un artículo de inventario pueda tomar la
// misma categoría que el producto que vende (p. ej. "Agua mineral" es
// `minibar` tanto en `product` como en `inventory_item`), y para que los
// insumos operativos que no se venden (blancos, químicos de limpieza)
// sigan teniendo dónde clasificarse (`housekeeping`, `maintenance`,
// `office`).
//
// No es un archivo de `statuses.ts`: no hay transiciones, es una
// clasificación simple, no una máquina de estado — ver la nota en ese
// archivo sobre qué sí calza ahí.
//
// `amenity` mantiene su propia taxonomía (`AmenityCategoryDto`: servicios
// del hotel, nada que ver con artículos) — no participa de esta
// unificación, a propósito.

export const CATALOG_CATEGORY_DTOS = [
  'minibar',
  'food_and_beverage',
  'shop',
  'other',
  'housekeeping',
  'maintenance',
  'office',
] as const;
export type CatalogCategoryDto = (typeof CATALOG_CATEGORY_DTOS)[number];

export const CATALOG_CATEGORIES = [
  'minibar',
  'foodAndBeverage',
  'shop',
  'other',
  'housekeeping',
  'maintenance',
  'office',
] as const;
export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export const toDomainCatalogCategory = (category: CatalogCategoryDto): CatalogCategory =>
  category === 'food_and_beverage' ? 'foodAndBeverage' : category;

export const toDtoCatalogCategory = (category: CatalogCategory): CatalogCategoryDto =>
  category === 'foodAndBeverage' ? 'food_and_beverage' : category;
