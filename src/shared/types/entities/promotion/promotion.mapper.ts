import { toDomainDate, toDtoDate } from '@/shared/types/common';
import type { PromotionDto } from './promotion.dto';
import type { Promotion } from './promotion.model';

export const toDomain = (dto: PromotionDto): Promotion => ({
  id: dto.id,
  code: dto.code,
  name: dto.name,
  description: dto.description,
  discountPercent: dto.discount_percent,
  validFrom: toDomainDate(dto.valid_from),
  validTo: toDomainDate(dto.valid_to),
  active: dto.active,
  createdAt: toDomainDate(dto.created_at),
  updatedAt: toDomainDate(dto.updated_at),
});

export const toDTO = (model: Promotion): PromotionDto => ({
  id: model.id,
  code: model.code,
  name: model.name,
  description: model.description,
  discount_percent: model.discountPercent,
  valid_from: toDtoDate(model.validFrom),
  valid_to: toDtoDate(model.validTo),
  active: model.active,
  created_at: toDtoDate(model.createdAt),
  updated_at: toDtoDate(model.updatedAt),
});
