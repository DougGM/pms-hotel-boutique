import { toDomainDate, toDtoDate } from '@/shared/types/common';
import {
  toDomainCatalogCategory,
  toDtoCatalogCategory,
} from '@/shared/constants/catalog-categories';
import type { InventoryItemDto } from './inventory-item.dto';
import type { InventoryItem } from './inventory-item.model';

export const toDomain = (dto: InventoryItemDto): InventoryItem => ({
  id: dto.id,
  sku: dto.sku,
  name: dto.name,
  description: dto.description,
  category: toDomainCatalogCategory(dto.category),
  unit: dto.unit,
  currentQuantity: dto.current_quantity,
  minimumQuantity: dto.minimum_quantity,
  active: dto.active,
  isBelowMinimum: dto.current_quantity < dto.minimum_quantity,
  createdAt: toDomainDate(dto.created_at),
  updatedAt: toDomainDate(dto.updated_at),
});

export const toDTO = (model: InventoryItem): InventoryItemDto => ({
  id: model.id,
  sku: model.sku,
  name: model.name,
  description: model.description,
  category: toDtoCatalogCategory(model.category),
  unit: model.unit,
  current_quantity: model.currentQuantity,
  minimum_quantity: model.minimumQuantity,
  active: model.active,
  created_at: toDtoDate(model.createdAt),
  updated_at: toDtoDate(model.updatedAt),
});
