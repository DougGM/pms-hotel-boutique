import type { ID, ISODateString } from '../common';
export type { GuestDto } from './guest/guest.dto';
export interface GuestDTO {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  nationality?: string;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
export interface Guest extends Omit<GuestDTO, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}
export const guestMapper = {
  toDomain(dto: GuestDTO): Guest {
    return { ...dto, createdAt: new Date(dto.createdAt), updatedAt: new Date(dto.updatedAt) };
  },
};
