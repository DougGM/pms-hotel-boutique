export type RoomStatusDto =
  'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_service';

export interface RoomDTO {
  id: string;
  room_number: string;
  room_type_id: string;
  floor: number;
  status: RoomStatusDto;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type RoomDto = RoomDTO;
