import { toDomain as toRoom, type Room } from '@/shared/types/entities/room';
import { toDomain as toRate, type Rate } from '@/shared/types/entities/rate';
import { toDomain as toRoomFeature, type RoomFeature } from '@/shared/types/entities/room-feature';
import { toDomain as toRoomType, type RoomType } from '@/shared/types/entities/room-type';
import type { ID } from '@/shared/types/common';
import { ratesDB, roomFeaturesDB, roomsDB, roomTypesDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';
export const roomService = {
  async getRoomTypes(): Promise<RoomType[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los tipos de habitacion.');
    return roomTypesDB.map(toRoomType);
  },
  async getRoomFeatures(): Promise<RoomFeature[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las caracteristicas.');
    return roomFeaturesDB.map(toRoomFeature);
  },
  async getRates(): Promise<Rate[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las tarifas.');
    return ratesDB.map(toRate);
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
