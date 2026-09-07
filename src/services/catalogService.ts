import { amenityMapper, productMapper, type Amenity, type Product } from '@/shared/types/entities';
import { mockAmenities, mockProducts } from './mockData';
import { mockUtils, simulateLatency } from './mockUtils';
export const catalogService = { async getProducts(): Promise<Product[]> { await simulateLatency(); mockUtils.throwIfSimulatingError('No fue posible cargar los productos.'); return mockProducts.map(productMapper.toDomain); }, async getAmenities(): Promise<Amenity[]> { await simulateLatency(); mockUtils.throwIfSimulatingError('No fue posible cargar las amenidades.'); return mockAmenities.map(amenityMapper.toDomain); } };
export default catalogService;
