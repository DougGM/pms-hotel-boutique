import {
  toDomain as toAmenity,
  type Amenity,
  type AmenityDto,
} from '@/shared/types/entities/amenity';
import {
  toDomain as toProduct,
  type Product,
  type ProductDto,
} from '@/shared/types/entities/product';
import { amenitiesDB, productsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { httpClient } from './http-client';

type ApiAmenity = {
  id: string;
  name: string;
  description?: string;
  category: AmenityDto['category'];
  location?: string;
  opensAt?: string;
  closesAt?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: ProductDto['category'];
  priceCents: number;
  currency?: ProductDto['currency'];
  active: boolean;
};

const nowIso = () => new Date().toISOString();
const isOfflineError = (error: unknown): boolean =>
  !(typeof error === 'object' && error !== null && 'status' in error) ||
  (typeof error === 'object' && error !== null && 'status' in error && error.status === 404);

function mapAmenityFromApi(api: ApiAmenity): AmenityDto {
  const createdAt = api.createdAt ?? nowIso();
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    category: api.category,
    location: api.location,
    opens_at: api.opensAt,
    closes_at: api.closesAt,
    active: api.active,
    created_at: createdAt,
    updated_at: api.updatedAt ?? createdAt,
  };
}

function mapProductFromApi(api: ApiProduct): ProductDto {
  const timestamp = nowIso();
  return {
    id: api.id,
    sku: api.sku,
    name: api.name,
    description: api.description,
    category: api.category,
    price_cents: api.priceCents,
    currency: api.currency ?? 'GTQ',
    stock_quantity: 0,
    reorder_level: 0,
    active: api.active,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export const catalogService = {
  async getProducts(): Promise<Product[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los productos.');
    try {
      const products = await httpClient.get<ApiProduct[]>('/room-service/products');
      return products.map(mapProductFromApi).map(toProduct);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      return requireCollection(productsDB, 'productsDB').map(toProduct);
    }
  },
  async getAmenities(): Promise<Amenity[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las amenidades.');
    try {
      const amenities = await httpClient.get<ApiAmenity[]>('/admin/amenities?active=true');
      return amenities.map(mapAmenityFromApi).map(toAmenity);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      return requireCollection(amenitiesDB, 'amenitiesDB').map(toAmenity);
    }
  },
};
export default catalogService;
