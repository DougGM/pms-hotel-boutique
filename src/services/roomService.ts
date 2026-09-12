import { toDomain as toRate, type Rate } from '@/shared/types/entities/rate';
import {
  toDomain as toRoom,
  type CreateRoomDto,
  type Room,
  type RoomDto,
  type UpdateRoomDto,
} from '@/shared/types/entities/room';
import { toDomain as toRoomFeature, type RoomFeature } from '@/shared/types/entities/room-feature';
import { toDomain as toRoomType, type RoomType } from '@/shared/types/entities/room-type';
import type { ID } from '@/shared/types/common';
import { ratesDB, roomFeaturesDB, roomsDB, roomTypesDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';

function createRoomId(): ID {
  return `RM-${String(roomsDB.length + 1).padStart(3, '0')}`;
}

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
    mockUtils.throwIfSimulatingError('No fue posible cargar la habitacion.');
    const room = roomsDB.find((item) => item.id === id);
    return room ? toRoom(room) : undefined;
  },
  async createRoom(data: CreateRoomDto): Promise<Room> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la habitacion.');

    const now = new Date().toISOString();
    const room: RoomDto = {
      id: createRoomId(),
      room_number: data.room_number,
      room_type_id: data.room_type_id,
      floor: data.floor,
      status: data.status ?? 'available',
      housekeeping_status: data.housekeeping_status ?? 'dirty',
      notes: data.notes,
      created_at: now,
      updated_at: now,
    };
    roomsDB.push(room);
    return toRoom(room);
  },
  async updateRoom(id: ID, data: UpdateRoomDto): Promise<Room> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar la habitacion.');

    const room = roomsDB.find((item) => item.id === id);
    if (!room) throw new Error(`No existe la habitacion ${id}.`);

    Object.assign(room, data, { updated_at: new Date().toISOString() });
    return toRoom(room);
  },
};
export default roomService;
