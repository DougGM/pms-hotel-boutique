import { roomMapper, type Room } from '@/shared/types/entities';
import type { ID } from '@/shared/types/common';
import { mockRooms } from './mockData';
import { mockUtils, simulateLatency } from './mockUtils';
export const roomService = { async getRooms(): Promise<Room[]> { await simulateLatency(); mockUtils.throwIfSimulatingError('No fue posible cargar las habitaciones.'); return mockRooms.map(roomMapper.toDomain); }, async getRoomById(id: ID): Promise<Room | undefined> { await simulateLatency(); mockUtils.throwIfSimulatingError('No fue posible cargar la habitación.'); const room = mockRooms.find((item) => item.id === id); return room ? roomMapper.toDomain(room) : undefined; } };
export default roomService;
