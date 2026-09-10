import { isRoomAssignable } from '@/shared/constants/statuses';
import { toDomainDate, toDtoDate } from '@/shared/types/common';
import type { RoomDto } from './room.dto';
import type { Room } from './room.model';

export const toDomain = (dto: RoomDto): Room => {
  const status = dto.status === 'out_of_service' ? 'outOfService' : dto.status;
  const housekeepingStatus = dto.housekeeping_status;
  return {
    id: dto.id,
    roomNumber: dto.room_number,
    roomTypeId: dto.room_type_id,
    floor: dto.floor,
    status,
    housekeepingStatus,
    isAssignable: isRoomAssignable({ status, housekeepingStatus }),
    notes: dto.notes,
    createdAt: toDomainDate(dto.created_at),
    updatedAt: toDomainDate(dto.updated_at),
  };
};

export const toDTO = (model: Room): RoomDto => ({
  id: model.id,
  room_number: model.roomNumber,
  room_type_id: model.roomTypeId,
  floor: model.floor,
  status: model.status === 'outOfService' ? 'out_of_service' : model.status,
  housekeeping_status: model.housekeepingStatus,
  notes: model.notes,
  created_at: toDtoDate(model.createdAt),
  updated_at: toDtoDate(model.updatedAt),
});
