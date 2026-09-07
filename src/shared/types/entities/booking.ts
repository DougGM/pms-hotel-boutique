import type { BookingStatus, Currency, ID, ISODateString } from '../common';
import { guestMapper, type Guest, type GuestDTO } from './guest';
import { roomMapper, type Room, type RoomDTO } from './room';
export type { BookingDto } from './booking/booking.dto';
export interface BookingDTO {
  id: ID;
  code: string;
  guestId: ID;
  roomId: ID;
  checkIn: ISODateString;
  checkOut: ISODateString;
  status: BookingStatus;
  guests: number;
  adults: number;
  children: number;
  pricePerNight: number;
  totalAmount: number;
  currency: Currency;
  source: string;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  guest?: GuestDTO;
  room?: RoomDTO;
}
export interface Booking extends Omit<
  BookingDTO,
  'checkIn' | 'checkOut' | 'createdAt' | 'updatedAt' | 'guest' | 'room'
> {
  checkIn: Date;
  checkOut: Date;
  createdAt: Date;
  updatedAt: Date;
  guest?: Guest;
  room?: Room;
}
export const bookingMapper = {
  toDomain(dto: BookingDTO): Booking {
    const { guest, room, ...rest } = dto;
    return {
      ...rest,
      checkIn: new Date(dto.checkIn),
      checkOut: new Date(dto.checkOut),
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      guest: guest ? guestMapper.toDomain(guest) : undefined,
      room: room ? roomMapper.toDomain(room) : undefined,
    };
  },
};
export interface CreateBookingDTO {
  guestId: ID;
  roomId: ID;
  checkIn: ISODateString;
  checkOut: ISODateString;
  adults: number;
  children: number;
  source: string;
  notes?: string;
}
