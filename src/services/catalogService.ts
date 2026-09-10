import { toDomain as toAmenity, type Amenity } from '@/shared/types/entities/amenity';
import { toDomain as toProduct, type Product } from '@/shared/types/entities/product';
import { lotDMockData } from '@/shared/mocks/lot-d';
import { mockUtils, simulateLatency } from './mockUtils';
// Redirigido al dataset del Lote D (WEB-12) — antes leía de `./mockData`
// (2 productos, 2 amenidades, sin horario). Ver PROGRESO-MOCKS.md sección
// 1.4 para el porqué del cambio de fuente.
export const catalogService = {
  async getProducts(): Promise<Product[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los productos.');
    return lotDMockData.products.map(toProduct);
  },
  async getAmenities(): Promise<Amenity[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las amenidades.');
    return lotDMockData.amenities.map(toAmenity);
  },
};
export default catalogService;
