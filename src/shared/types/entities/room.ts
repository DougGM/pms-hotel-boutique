import type { ID, RoomStatus } from '../common';
export type { RoomDto } from './room/room.dto';
export interface RoomDTO {
  id: ID;
  number: string;
  type: string;
  floor: number;
  capacity: number;
  pricePerNight: number;
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
