/** Ocupación: la controla la web (recepción). Ver docs/DECISIONES.md, D-002. */
export type RoomStatusDto = 'available' | 'occupied' | 'maintenance' | 'out_of_service';

/** Limpieza: la controla la app móvil; la web solo la lee. Ver D-002. */
export type RoomHousekeepingStatusDto = 'dirty' | 'cleaning' | 'clean' | 'inspected';

export interface RoomDTO {
  id: string;
  room_number: string;
  room_type_id: string;
  floor: number;
  status: RoomStatusDto;
  housekeeping_status: RoomHousekeepingStatusDto;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type RoomDto = RoomDTO;

export interface CreateRoomDto {
  room_number: string;
  room_type_id: string;
  floor: number;
  status?: RoomStatusDto;
  housekeeping_status?: RoomHousekeepingStatusDto;
  notes?: string;
}

export type UpdateRoomDto = Partial<CreateRoomDto>;
