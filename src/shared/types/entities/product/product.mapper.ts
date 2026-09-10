import { toDomainDate, toDtoDate } from '@/shared/types/common';
import {
  toDomainCatalogCategory,
  toDtoCatalogCategory,
} from '@/shared/constants/catalog-categories';
import type { ProductDto } from './product.dto';
import type { Product } from './product.model';

export const toDomain = (dto: ProductDto): Product => ({
  id: dto.id,
  sku: dto.sku,
  name: dto.name,
  description: dto.description,
  category: toDomainCatalogCategory(dto.category),
  priceCents: dto.price_cents,
  currency: dto.currency,
  stockQuantity: dto.stock_quantity,
  reorderLevel: dto.reorder_level,
  inventoryConsumption: (dto.inventory_consumption ?? []).map((entry) => ({
    inventoryItemId: entry.inventory_item_id,
    quantity: entry.quantity,
  })),
  active: dto.active,
  createdAt: toDomainDate(dto.created_at),
  updatedAt: toDomainDate(dto.updated_at),
});

export const toDTO = (model: Product): ProductDto => ({
  id: model.id,
  sku: model.sku,
  name: model.name,
  description: model.description,
  category: toDtoCatalogCategory(model.category),
  price_cents: model.priceCents,
  currency: model.currency,
  stock_quantity: model.stockQuantity,
  reorder_level: model.reorderLevel,
  inventory_consumption: model.inventoryConsumption.map((entry) => ({
    inventory_item_id: entry.inventoryItemId,
    quantity: entry.quantity,
  })),
  active: model.active,
  created_at: toDtoDate(model.createdAt),
  updated_at: toDtoDate(model.updatedAt),
});
