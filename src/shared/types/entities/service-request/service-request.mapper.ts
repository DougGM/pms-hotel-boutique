import { toDomainDate, toDtoDate } from '@/shared/types/common';
import type { ServiceRequestDto } from './service-request.dto';
import type { ServiceRequest } from './service-request.model';

export const toDomain = (dto: ServiceRequestDto): ServiceRequest => ({
  id: dto.id,
  bookingId: dto.booking_id,
  roomId: dto.room_id,
  guestId: dto.guest_id,
  type: dto.type,
  description: dto.description,
  status: dto.status === 'in_progress' ? 'inProgress' : dto.status,
  notes: dto.notes,
  chargeId: dto.charge_id,
  requestedAt: toDomainDate(dto.requested_at),
  createdAt: toDomainDate(dto.created_at),
  updatedAt: toDomainDate(dto.updated_at),
});

export const toDTO = (model: ServiceRequest): ServiceRequestDto => ({
  id: model.id,
  booking_id: model.bookingId,
  room_id: model.roomId,
  guest_id: model.guestId,
  type: model.type,
  description: model.description,
  status: model.status === 'inProgress' ? 'in_progress' : model.status,
  notes: model.notes,
  charge_id: model.chargeId,
  requested_at: toDtoDate(model.requestedAt),
  created_at: toDtoDate(model.createdAt),
  updated_at: toDtoDate(model.updatedAt),
});
