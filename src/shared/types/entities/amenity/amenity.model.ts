export type AmenityCategory = 'room' | 'hotel' | 'service';

export interface Amenity {
  id: string;
  name: string;
  description?: string;
  category: AmenityCategory;
  location?: string;
  opensAt?: string;
  closesAt?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
