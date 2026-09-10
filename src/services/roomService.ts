import { toDomain as toRoom, type Room } from '@/shared/types/entities/room';
import type { ID } from '@/shared/types/common';
import { lotBMockData } from '@/shared/mocks';
import { mockUtils, simulateLatency } from './mockUtils';
export const roomService = {
  async getRooms(): Promise<Room[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las habitaciones.');
    return lotBMockData.rooms.map(toRoom);
  },
  async getRoomById(id: ID): Promise<Room | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la habitación.');
    const room = lotBMockData.rooms.find((item) => item.id === id);
    return room ? toRoom(room) : undefined;
  },
};
export default roomService;
