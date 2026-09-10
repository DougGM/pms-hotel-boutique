import type { Product } from '@/shared/types/entities/product';

export interface InventoryConsumptionLine {
  inventoryItemId: string;
  quantity: number;
}

/**
 * Dado un producto y la cantidad pedida, devuelve qué artículos de
 * inventario se descuentan y en qué cantidad — 0, 1 o varias líneas según
 * `product.inventoryConsumption` (Lote D, WEB-12, ver docs/DECISIONES.md
 * D-006). La cantidad de cada línea ya está en la unidad del artículo de
 * inventario (`product.inventoryConsumption[].quantity` es "por unidad
 * vendida"), así que aquí solo se escala por `requestedQuantity`.
 *
 * Es el único cálculo de este consumo: ninguna pantalla debe
 * reimplementarlo (ver scripts/test-lot-c-d.mjs, verificación estática).
 * No aplica el descuento — solo calcula qué se descontaría; enganchar
 * esto al flujo real de entrega de un pedido es una decisión de negocio
 * del Lote D todavía sin tomar (ver docs/DECISIONES.md, D-006, "Qué NO
 * hacer").
 */
export const calculateInventoryConsumption = (
  product: Pick<Product, 'inventoryConsumption'>,
  requestedQuantity: number,
): InventoryConsumptionLine[] =>
  product.inventoryConsumption.map((line) => ({
    inventoryItemId: line.inventoryItemId,
    quantity: line.quantity * requestedQuantity,
  }));
