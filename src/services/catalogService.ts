import { toDomain as toAmenity, type Amenity } from '@/shared/types/entities/amenity';
import { toDomain as toProduct, type Product } from '@/shared/types/entities/product';
import { mockAmenities, mockProducts } from './mockData';
import { mockUtils, simulateLatency } from './mockUtils';
export const catalogService = {
  async getProducts(): Promise<Product[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los productos.');
    return mockProducts.map(toProduct);
  },
  async getAmenities(): Promise<Amenity[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las amenidades.');
    return mockAmenities.map(toAmenity);
  },
};
export default catalogService;
