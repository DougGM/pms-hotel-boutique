import { toDomain as toAmenity, type Amenity } from '@/shared/types/entities/amenity';
import { toDomain as toProduct, type Product } from '@/shared/types/entities/product';
import { amenitiesDB, productsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { hydrateCollection, persistCollection } from './mockPersistence';

const amenitiesStorageKey = 'PMS_AMENITIES_DB';

function getAmenitiesDB() {
  return hydrateCollection(amenitiesStorageKey, amenitiesDB);
}

function createAmenityId(): string {
  const max = getAmenitiesDB().reduce((currentMax, amenity) => {
    const match = /^AMN-(\d+)$/.exec(amenity.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `AMN-${String(max + 1).padStart(2, '0')}`;
}

export type SaveAmenityData = {
  name: string;
  description?: string;
  opens_at?: string;
  closes_at?: string;
  active?: boolean;
};
export const catalogService = {
  async getProducts(): Promise<Product[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los productos.');
    return requireCollection(productsDB, 'productsDB').map(toProduct);
  },
  async getAmenities(): Promise<Amenity[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las amenidades.');
    return requireCollection(getAmenitiesDB(), 'amenitiesDB').map(toAmenity);
  },
  async createAmenity(data: SaveAmenityData): Promise<Amenity> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la amenidad.');
    if (!data.name.trim()) throw new Error('La amenidad requiere nombre.');
    const now = new Date().toISOString();
    const amenity = {
      id: createAmenityId(),
      name: data.name.trim(),
      description: data.description?.trim(),
      category: 'hotel' as const,
      opens_at: data.opens_at,
      closes_at: data.closes_at,
      active: data.active ?? true,
      created_at: now,
      updated_at: now,
    };
    getAmenitiesDB().push(amenity);
    persistCollection(amenitiesStorageKey, getAmenitiesDB());
    return toAmenity(amenity);
  },
  async updateAmenity(id: string, data: Partial<SaveAmenityData>): Promise<Amenity> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar la amenidad.');
    const amenity = getAmenitiesDB().find((item) => item.id === id);
    if (!amenity) throw new Error(`No existe la amenidad ${id}.`);
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error('La amenidad requiere nombre.');
      amenity.name = data.name.trim();
    }
    if (data.description !== undefined) amenity.description = data.description.trim();
    if (data.opens_at !== undefined) amenity.opens_at = data.opens_at;
    if (data.closes_at !== undefined) amenity.closes_at = data.closes_at;
    if (data.active !== undefined) amenity.active = data.active;
    amenity.updated_at = new Date().toISOString();
    persistCollection(amenitiesStorageKey, getAmenitiesDB());
    return toAmenity(amenity);
  },
};
export default catalogService;
