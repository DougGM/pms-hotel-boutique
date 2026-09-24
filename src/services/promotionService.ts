import {
  toDomain as toPromotion,
  type Promotion,
  type PromotionDto,
} from '@/shared/types/entities/promotion';
import { promotionsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { hydrateCollection, persistCollection } from './mockPersistence';

const promotionsStorageKey = 'PMS_PROMOTIONS_DB';

function getPromotionsDB(): PromotionDto[] {
  return hydrateCollection(promotionsStorageKey, promotionsDB);
}

function persistPromotionsDB(): void {
  persistCollection(promotionsStorageKey, promotionsDB);
}

function createPromotionId(): string {
  const max = getPromotionsDB().reduce((currentMax, promotion) => {
    const match = /^PROM-(\d+)$/.exec(promotion.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `PROM-${String(max + 1).padStart(3, '0')}`;
}

type SavePromotionData = {
  code: string;
  name: string;
  description: string;
  discount_percent: number;
  valid_from: string;
  valid_to: string;
  active?: boolean;
};

export const promotionService = {
  async getPromotions(): Promise<Promotion[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las promociones.');
    return requireCollection(getPromotionsDB(), 'promotionsDB').map(toPromotion);
  },
  async createPromotion(data: SavePromotionData): Promise<Promotion> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la promocion.');
    if (!data.name.trim()) throw new Error('La promocion requiere nombre.');
    if (!data.code.trim()) throw new Error('La promocion requiere codigo.');
    if (!Number.isInteger(data.discount_percent) || data.discount_percent <= 0) {
      throw new Error('El descuento debe ser un entero mayor a 0.');
    }

    const now = new Date().toISOString();
    const promotion: PromotionDto = {
      id: createPromotionId(),
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description.trim(),
      discount_percent: data.discount_percent,
      valid_from: data.valid_from,
      valid_to: data.valid_to,
      active: data.active ?? true,
      created_at: now,
      updated_at: now,
    };
    getPromotionsDB().push(promotion);
    persistPromotionsDB();
    return toPromotion(promotion);
  },
  async updatePromotion(id: string, data: Partial<SavePromotionData>): Promise<Promotion> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar la promocion.');

    const promotion = getPromotionsDB().find((item) => item.id === id);
    if (!promotion) throw new Error(`No existe la promocion ${id}.`);
    if (data.discount_percent !== undefined) {
      if (!Number.isInteger(data.discount_percent) || data.discount_percent <= 0) {
        throw new Error('El descuento debe ser un entero mayor a 0.');
      }
      promotion.discount_percent = data.discount_percent;
    }
    if (data.code !== undefined) promotion.code = data.code.trim().toUpperCase();
    if (data.name !== undefined) promotion.name = data.name.trim();
    if (data.description !== undefined) promotion.description = data.description.trim();
    if (data.valid_from !== undefined) promotion.valid_from = data.valid_from;
    if (data.valid_to !== undefined) promotion.valid_to = data.valid_to;
    if (data.active !== undefined) promotion.active = data.active;
    promotion.updated_at = new Date().toISOString();
    persistPromotionsDB();
    return toPromotion(promotion);
  },
};
export default promotionService;
