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
  createdAt?: string;
  updatedAt?: string;
};

export type SaveAmenityData = {
  name: string;
  description?: string;
  category: AmenityDto['category'];
  location?: string;
  opensAt?: string;
  closesAt?: string;
  active?: boolean;
};

type SaveProductData = {
  sku: string;
  name: string;
  description?: string;
  category: ProductDto['category'];
  priceCents: number;
  currency?: ProductDto['currency'];
  active?: boolean;
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
  const timestamp = api.createdAt ?? nowIso();
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
    updated_at: api.updatedAt ?? timestamp,
  };
}

function toAmenityRequest(data: SaveAmenityData) {
  return {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    category: data.category,
    location: data.location?.trim() || undefined,
    opensAt: data.opensAt || undefined,
    closesAt: data.closesAt || undefined,
    active: data.active ?? true,
  };
}

function toProductRequest(data: SaveProductData) {
  return {
    sku: data.sku.trim().toUpperCase(),
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    category: data.category,
    priceCents: data.priceCents,
    currency: data.currency ?? 'GTQ',
    active: data.active ?? true,
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
  async getAdminProducts(): Promise<Product[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el catalogo administrativo.');
    try {
      const products = await httpClient.get<ApiProduct[]>('/admin/room-service/products');
      return products.map(mapProductFromApi).map(toProduct);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      return requireCollection(productsDB, 'productsDB').map(toProduct);
    }
  },
  async createAdminProduct(data: SaveProductData): Promise<Product> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear el producto.');
    if (!data.name.trim()) throw new Error('El producto requiere nombre.');
    if (!data.sku.trim()) throw new Error('El producto requiere SKU.');
    if (!Number.isInteger(data.priceCents) || data.priceCents < 1) {
      throw new Error('El precio debe ser un entero mayor o igual a 1.');
    }

    const product = await httpClient.post<ApiProduct>(
      '/admin/room-service/products',
      toProductRequest(data),
    );
    return toProduct(mapProductFromApi(product));
  },
  async updateAdminProduct(id: string, data: Partial<SaveProductData>): Promise<Product> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar el producto.');
    if (
      data.priceCents !== undefined &&
      (!Number.isInteger(data.priceCents) || data.priceCents < 1)
    ) {
      throw new Error('El precio debe ser un entero mayor o igual a 1.');
    }
    const current = (await this.getAdminProducts()).find((product) => product.id === id);
    if (!current) throw new Error(`No existe el producto ${id}.`);
    const product = await httpClient.put<ApiProduct>(
      `/admin/room-service/products/${id}`,
      toProductRequest({
        sku: data.sku ?? current.sku,
        name: data.name ?? current.name,
        description: data.description ?? current.description,
        category:
          data.category ??
          (current.category === 'foodAndBeverage' ? 'food_and_beverage' : current.category),
        priceCents: data.priceCents ?? current.priceCents,
        currency: data.currency ?? current.currency,
        active: data.active ?? current.active,
      }),
    );
    return toProduct(mapProductFromApi(product));
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
  async getAdminAmenities(): Promise<Amenity[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las amenidades.');
    try {
      const amenities = await httpClient.get<ApiAmenity[]>('/admin/amenities');
      return amenities.map(mapAmenityFromApi).map(toAmenity);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      return requireCollection(amenitiesDB, 'amenitiesDB').map(toAmenity);
    }
  },
  async createAmenity(data: SaveAmenityData): Promise<Amenity> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la amenidad.');
    if (!data.name.trim()) throw new Error('La amenidad requiere nombre.');
    const amenity = await httpClient.post<ApiAmenity>('/admin/amenities', toAmenityRequest(data));
    return toAmenity(mapAmenityFromApi(amenity));
  },
  async updateAmenity(id: string, data: Partial<SaveAmenityData>): Promise<Amenity> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar la amenidad.');
    const current = (await this.getAdminAmenities()).find((amenity) => amenity.id === id);
    if (!current) throw new Error(`No existe la amenidad ${id}.`);
    const amenity = await httpClient.put<ApiAmenity>(
      `/admin/amenities/${id}`,
      toAmenityRequest({
        name: data.name ?? current.name,
        description: data.description ?? current.description,
        category: data.category ?? current.category,
        location: data.location ?? current.location,
        opensAt: data.opensAt ?? current.opensAt,
        closesAt: data.closesAt ?? current.closesAt,
        active: data.active ?? current.active,
      }),
    );
    return toAmenity(mapAmenityFromApi(amenity));
  },
};
export default catalogService;
