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
import { inventoryItemsDB, inventoryMovementsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { httpClient } from './http-client';

type ApiInventoryItem = {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  currentQuantity: number;
  minimumQuantity: number;
  lowStock: boolean;
  productId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiInventoryMovement = {
  id: string;
  inventoryItemId: string;
  type: InventoryMovementTypeDto;
  reason: InventoryMovementReasonDto | 'physical_count' | 'room_service_return';
  quantity: number;
  responsibleUserId?: string;
  occurredAt: string;
  notes?: string;
  createdAt: string;
};

type UpdateInventoryItemData = Partial<
  Pick<InventoryItemDto, 'name' | 'category' | 'current_quantity' | 'minimum_quantity' | 'active'>
>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isOfflineError = (error: unknown): boolean =>
  !(typeof error === 'object' && error !== null && 'status' in error) ||
  (typeof error === 'object' && error !== null && 'status' in error && error.status === 404);

function ensureBackendUserId(responsibleUserId?: ID): void {
  if (responsibleUserId && !uuidPattern.test(responsibleUserId)) {
    throw new Error(`No existe el usuario responsable ${responsibleUserId}.`);
  }
}

function normalizeCategory(category: string): InventoryItemDto['category'] {
  return category === 'roomService' ? 'room_service' : (category as InventoryItemDto['category']);
}

function normalizeUnit(unit: string): InventoryItemDto['unit'] {
  return unit as InventoryItemDto['unit'];
}

function normalizeReason(reason: ApiInventoryMovement['reason']): InventoryMovementReasonDto {
  if (reason === 'physical_count') return 'restock';
  if (reason === 'room_service_return') return 'restock';
  return reason;
}

function toInventoryItemDto(api: ApiInventoryItem): InventoryItemDto {
  return {
    id: api.id,
    sku: api.sku,
    name: api.name,
    description: api.description,
    category: normalizeCategory(api.category),
    unit: normalizeUnit(api.unit),
    current_quantity: api.currentQuantity,
    minimum_quantity: api.minimumQuantity,
    product_id: api.productId,
    active: api.active,
    created_at: api.createdAt,
    updated_at: api.updatedAt,
  };
}

function toInventoryMovementDto(api: ApiInventoryMovement): InventoryMovementDto {
  return {
    id: api.id,
    inventory_item_id: api.inventoryItemId,
    type: api.type,
    reason: normalizeReason(api.reason),
    quantity: api.quantity,
    responsible_user_id: api.responsibleUserId,
    occurred_at: api.occurredAt,
    notes: api.notes,
    created_at: api.createdAt,
  };
}

function toUpdateRequest(item: InventoryItem, data: UpdateInventoryItemData) {
  return {
    sku: item.sku,
    name: data.name ?? item.name,
    description: item.description,
    category: data.category ?? (item.category === 'roomService' ? 'room_service' : item.category),
    unit: item.unit,
    minimumQuantity: data.minimum_quantity ?? item.minimumQuantity,
    productId: item.productId,
    active: data.active ?? item.active,
  };
}

export const inventoryService = {
  async getItems(): Promise<InventoryItem[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el inventario.');
    try {
      const items = await httpClient.get<ApiInventoryItem[]>('/inventory/items');
      return items.map(toInventoryItemDto).map(toInventoryItem);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      return requireCollection(inventoryItemsDB, 'inventoryItemsDB').map(toInventoryItem);
    }
  },
  async getItemById(id: ID): Promise<InventoryItem | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el articulo.');
    try {
      const item = await httpClient.get<ApiInventoryItem>(`/inventory/items/${id}`);
      return toInventoryItem(toInventoryItemDto(item));
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      const item = inventoryItemsDB.find((entry) => entry.id === id);
      return item ? toInventoryItem(item) : undefined;
    }
  },
  async getItemsBelowMinimum(): Promise<InventoryItem[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la alerta de stock bajo.');
    try {
      const items = await httpClient.get<ApiInventoryItem[]>('/inventory/items?lowStock=true');
      return items.map(toInventoryItemDto).map(toInventoryItem);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      return requireCollection(inventoryItemsDB, 'inventoryItemsDB')
        .map(toInventoryItem)
        .filter((item) => item.isBelowMinimum);
    }
  },
  async getMovementsByItemId(itemId: ID): Promise<InventoryMovement[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los movimientos.');
    try {
      const movements = await httpClient.get<ApiInventoryMovement[]>(
        `/inventory/items/${itemId}/movements`,
      );
      return movements.map(toInventoryMovementDto).map(toInventoryMovement);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      return requireCollection(inventoryMovementsDB, 'inventoryMovementsDB')
        .filter((item) => item.inventory_item_id === itemId)
        .map(toInventoryMovement);
    }
  },
  async getMovements(): Promise<InventoryMovement[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los movimientos.');
    try {
      const items = await httpClient.get<ApiInventoryItem[]>('/inventory/items');
      const movements = await Promise.all(
        items.map((item) =>
          httpClient.get<ApiInventoryMovement[]>(`/inventory/items/${item.id}/movements`),
        ),
      );
      return movements.flat().map(toInventoryMovementDto).map(toInventoryMovement);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      return requireCollection(inventoryMovementsDB, 'inventoryMovementsDB').map(
        toInventoryMovement,
      );
    }
  },
  async updateItem(id: ID, data: UpdateInventoryItemData): Promise<InventoryItem> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar el inventario.');

    const current = await this.getItemById(id);
    if (!current) throw new Error(`No existe el articulo de inventario ${id}.`);
    const updated = await httpClient.put<ApiInventoryItem>(
      `/admin/inventory/items/${id}`,
      toUpdateRequest(current, data),
    );
    if (data.current_quantity !== undefined && data.current_quantity !== updated.currentQuantity) {
      const delta = data.current_quantity - updated.currentQuantity;
      if (delta !== 0) {
        await this.createMovement({
          inventoryItemId: id,
          type: delta > 0 ? 'in' : 'out',
          reason: delta > 0 ? 'restock' : 'shrinkage',
          quantity: Math.abs(delta),
          notes: 'Ajuste manual de existencias desde administracion.',
        });
        return (await this.getItemById(id)) as InventoryItem;
      }
    }
    return toInventoryItem(toInventoryItemDto(updated));
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
    ensureBackendUserId(data.responsibleUserId);

    const movement = await httpClient.post<ApiInventoryMovement>(
      `/inventory/items/${data.inventoryItemId}/movements`,
      {
        type: data.type,
        reason: data.reason,
        quantity: data.quantity,
        notes: data.notes?.trim() || undefined,
      },
    );
    return toInventoryMovement(toInventoryMovementDto(movement));
  },
};
export default inventoryService;
