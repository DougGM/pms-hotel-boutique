import { toDomain as toRoom, type Room } from '@/shared/types/entities/room';
import { toDomain as toRoomType, type RoomType } from '@/shared/types/entities/room-type';
import type { ID } from '@/shared/types/common';
import { roomsDB, roomTypesDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';
export const roomService = {
  async getRoomTypes(): Promise<RoomType[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los tipos de habitacion.');
    return roomTypesDB.map(toRoomType);
  },
  async getRooms(): Promise<Room[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las habitaciones.');
    return roomsDB.map(toRoom);
  },
  async getRoomById(id: ID): Promise<Room | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la habitación.');
    const room = roomsDB.find((item) => item.id === id);
    return room ? toRoom(room) : undefined;
  },
};
export default roomService;
