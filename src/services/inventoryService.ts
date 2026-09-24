import {
  toDomain as toInventoryItem,
  type InventoryItem,
  type InventoryItemDto,
} from '@/shared/types/entities/inventory-item';
import {
  toDomain as toInventoryMovement,
  type InventoryMovement,
  type InventoryMovementDto,
  type InventoryMovementReasonDto,
  type InventoryMovementTypeDto,
} from '@/shared/types/entities/inventory-movement';
import type { ID } from '@/shared/types/common';
import { inventoryItemsDB, inventoryMovementsDB, usersDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { hydrateCollection, persistCollection } from './mockPersistence';

const inventoryItemsStorageKey = 'PMS_INVENTORY_ITEMS_DB';
const inventoryMovementsStorageKey = 'PMS_INVENTORY_MOVEMENTS_DB';

function getInventoryItemsDB(): InventoryItemDto[] {
  return hydrateCollection(inventoryItemsStorageKey, inventoryItemsDB);
}

function persistInventoryItemsDB(): void {
  persistCollection(inventoryItemsStorageKey, inventoryItemsDB);
}

function getInventoryMovementsDB(): InventoryMovementDto[] {
  return hydrateCollection(inventoryMovementsStorageKey, inventoryMovementsDB);
}

function persistInventoryMovementsDB(): void {
  persistCollection(inventoryMovementsStorageKey, inventoryMovementsDB);
}

function createMovementId(): ID {
  const max = getInventoryMovementsDB().reduce((currentMax, movement) => {
    const match = /^IMOV-(\d+)$/.exec(movement.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `IMOV-${String(max + 1).padStart(3, '0')}`;
}

function resolveResponsibleUserId(responsibleUserId?: ID): ID | undefined {
  if (!responsibleUserId) return undefined;
  if (usersDB.some((user) => user.id === responsibleUserId)) return responsibleUserId;
  throw new Error(`No existe el usuario responsable ${responsibleUserId}.`);
}

export const inventoryService = {
  async getItems(): Promise<InventoryItem[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el inventario.');
    return requireCollection(getInventoryItemsDB(), 'inventoryItemsDB').map(toInventoryItem);
  },
  async getItemById(id: ID): Promise<InventoryItem | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el articulo.');
    const item = getInventoryItemsDB().find((entry) => entry.id === id);
    return item ? toInventoryItem(item) : undefined;
  },
  async getItemsBelowMinimum(): Promise<InventoryItem[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la alerta de stock bajo.');
    return requireCollection(getInventoryItemsDB(), 'inventoryItemsDB')
      .map(toInventoryItem)
      .filter((item) => item.isBelowMinimum);
  },
  async getMovementsByItemId(itemId: ID): Promise<InventoryMovement[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los movimientos.');
    return requireCollection(getInventoryMovementsDB(), 'inventoryMovementsDB')
      .filter((item) => item.inventory_item_id === itemId)
      .map(toInventoryMovement);
  },
  async getMovements(): Promise<InventoryMovement[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los movimientos.');
    return requireCollection(getInventoryMovementsDB(), 'inventoryMovementsDB').map(
      toInventoryMovement,
    );
  },
  async updateItem(
    id: ID,
    data: Partial<
      Pick<
        InventoryItemDto,
        'name' | 'category' | 'current_quantity' | 'minimum_quantity' | 'active'
      >
    >,
  ): Promise<InventoryItem> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar el inventario.');

    const item = getInventoryItemsDB().find((entry) => entry.id === id);
    if (!item) throw new Error(`No existe el articulo de inventario ${id}.`);
    Object.assign(item, data, { updated_at: new Date().toISOString() });
    persistInventoryItemsDB();
    return toInventoryItem(item);
  },
  async createMovement(data: {
    inventoryItemId: ID;
    type: InventoryMovementTypeDto;
    reason: InventoryMovementReasonDto;
    quantity: number;
    responsibleUserId?: ID;
    notes?: string;
  }): Promise<InventoryMovement> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible registrar el movimiento de inventario.');
    if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
      throw new Error('La cantidad debe ser un entero mayor a 0.');
    }

    const item = getInventoryItemsDB().find((entry) => entry.id === data.inventoryItemId);
    if (!item) throw new Error(`No existe el articulo de inventario ${data.inventoryItemId}.`);
    const nextQuantity =
      data.type === 'in'
        ? item.current_quantity + data.quantity
        : item.current_quantity - data.quantity;
    if (nextQuantity < 0) throw new Error('El movimiento dejaria stock negativo.');

    const now = new Date().toISOString();
    const movement: InventoryMovementDto = {
      id: createMovementId(),
      inventory_item_id: item.id,
      type: data.type,
      reason: data.reason,
      quantity: data.quantity,
      responsible_user_id: resolveResponsibleUserId(data.responsibleUserId),
      occurred_at: now,
      notes: data.notes?.trim() || undefined,
      created_at: now,
    };
    item.current_quantity = nextQuantity;
    item.updated_at = now;
    getInventoryMovementsDB().unshift(movement);
    persistInventoryItemsDB();
    persistInventoryMovementsDB();
    return toInventoryMovement(movement);
  },
};
export default inventoryService;
