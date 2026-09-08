import type { Currency, ID, ISODateString, ProductCategory } from '../common';
export type { ProductDto } from './product/product.dto';
export type { AmenityDto } from './amenity/amenity.dto';
export interface ProductDTO {
  id: ID;
  name: string;
  description?: string;
  category: ProductCategory;
  priceCents: number;
  currency: Currency;
  stock: number;
  active: boolean;
  imageUrl?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
export interface Product extends Omit<ProductDTO, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}
export const productMapper = {
  toDomain(dto: ProductDTO): Product {
    return { ...dto, createdAt: new Date(dto.createdAt), updatedAt: new Date(dto.updatedAt) };
  },
};
export interface AmenityDTO {
  id: ID;
  name: string;
  description?: string;
  icon?: string;
  active: boolean;
}
export type Amenity = AmenityDTO;
export const amenityMapper = {
  toDomain(dto: AmenityDTO): Amenity {
    return { ...dto };
  },
};
