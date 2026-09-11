import { toDomain as toRoom, type Room } from '@/shared/types/entities/room';
import type { ID } from '@/shared/types/common';
import { roomsDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';
export const roomService = {
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
