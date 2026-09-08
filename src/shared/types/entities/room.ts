import type { Currency, ID, RoomStatus } from '../common';
export type { RoomDto } from './room/room.dto';
export interface RoomDTO {
  id: ID;
  number: string;
  type: string;
  floor: number;
  capacity: number;
  pricePerNightCents: number;
  currency: Currency;
  status: RoomStatus;
  amenities: string[];
  images: string[];
  description?: string;
}
export type Room = RoomDTO;
export const roomMapper = {
  toDomain(dto: RoomDTO): Room {
    return { ...dto, amenities: [...dto.amenities], images: [...dto.images] };
  },
};
