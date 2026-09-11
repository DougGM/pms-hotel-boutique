import {
  toDomain as toInventoryItem,
  type InventoryItem,
} from '@/shared/types/entities/inventory-item';
import {
  toDomain as toInventoryMovement,
  type InventoryMovement,
} from '@/shared/types/entities/inventory-movement';
import type { ID } from '@/shared/types/common';
import { inventoryItemsDB, inventoryMovementsDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';

export const inventoryService = {
  async getItems(): Promise<InventoryItem[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el inventario.');
    return inventoryItemsDB.map(toInventoryItem);
  },
  async getItemById(id: ID): Promise<InventoryItem | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el artículo.');
    const item = inventoryItemsDB.find((entry) => entry.id === id);
    return item ? toInventoryItem(item) : undefined;
  },
  async getItemsBelowMinimum(): Promise<InventoryItem[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la alerta de stock bajo.');
    return inventoryItemsDB.map(toInventoryItem).filter((item) => item.isBelowMinimum);
  },
  async getMovementsByItemId(itemId: ID): Promise<InventoryMovement[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los movimientos.');
    return inventoryMovementsDB
      .filter((item) => item.inventory_item_id === itemId)
      .map(toInventoryMovement);
  },
};
export default inventoryService;
