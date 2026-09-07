export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'outOfService';

export interface Room {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  floor: number;
  status: RoomStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
