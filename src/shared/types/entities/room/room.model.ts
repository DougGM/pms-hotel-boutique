import type { RoomStatus } from '@/shared/constants/statuses';

export type { RoomStatus };

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
