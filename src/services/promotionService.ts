import { toDomain as toPromotion, type Promotion } from '@/shared/types/entities/promotion';
import { promotionsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';

export const promotionService = {
  async getPromotions(): Promise<Promotion[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las promociones.');
    return requireCollection(promotionsDB, 'promotionsDB').map(toPromotion);
  },
};
export default promotionService;
