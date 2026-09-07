import { toDomainDate, toDtoDate } from '@/shared/types/common';
import type { RateDto } from './rate.dto';
import type { Rate } from './rate.model';

export const toDomain = (dto: RateDto): Rate => ({
  id: dto.id,
  roomTypeId: dto.room_type_id,
  name: dto.name,
  validFrom: toDomainDate(dto.valid_from),
  validTo: toDomainDate(dto.valid_to),
  priceCents: dto.price_cents,
  currency: dto.currency,
  minimumNights: dto.minimum_nights,
  refundable: dto.refundable,
  active: dto.active,
  createdAt: toDomainDate(dto.created_at),
  updatedAt: toDomainDate(dto.updated_at),
});

export const toDTO = (model: Rate): RateDto => ({
  id: model.id,
  room_type_id: model.roomTypeId,
  name: model.name,
  valid_from: toDtoDate(model.validFrom),
  valid_to: toDtoDate(model.validTo),
  price_cents: model.priceCents,
  currency: model.currency,
  minimum_nights: model.minimumNights,
  refundable: model.refundable,
  active: model.active,
  created_at: toDtoDate(model.createdAt),
  updated_at: toDtoDate(model.updatedAt),
});
