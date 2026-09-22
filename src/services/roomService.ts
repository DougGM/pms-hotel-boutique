import {
  toDomain as toRoom,
  type CreateRoomDto,
  type Room,
  type RoomDto,
  type UpdateRoomDto,
} from '@/shared/types/entities/room';
import { toDomain as toRate, type Rate } from '@/shared/types/entities/rate';
import { toDomain as toRoomFeature, type RoomFeature } from '@/shared/types/entities/room-feature';
import {
  toDomain as toRoomType,
  type CreateRoomTypeDto,
  type RoomType,
  type RoomTypeDto,
  type UpdateRoomTypeDto,
} from '@/shared/types/entities/room-type';
import type { ID } from '@/shared/types/common';
import { ratesDB, roomFeaturesDB, roomTypesDB, roomsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { hydrateCollection, persistCollection } from './mockPersistence';

const roomsStorageKey = 'PMS_ROOMS_DB';

function getRoomsDB(): RoomDto[] {
  return hydrateCollection(roomsStorageKey, roomsDB);
}

function persistRoomsDB(): void {
  persistCollection(roomsStorageKey, roomsDB);
}

function createRoomId(): ID {
  return `RM-${String(getRoomsDB().length + 1).padStart(3, '0')}`;
}

function createRoomTypeId(): ID {
  return `RT-${String(roomTypesDB.length + 1).padStart(2, '0')}`;
}

export const roomService = {
  async getRoomFeatures(): Promise<RoomFeature[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las caracteristicas.');
    return requireCollection(roomFeaturesDB, 'roomFeaturesDB').map(toRoomFeature);
  },
  async getRates(): Promise<Rate[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las tarifas.');
    return requireCollection(ratesDB, 'ratesDB').map(toRate);
  },
  async getRooms(): Promise<Room[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las habitaciones.');
    return requireCollection(getRoomsDB(), 'roomsDB').map(toRoom);
  },
  async getRoomById(id: ID): Promise<Room | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la habitación.');
    const room = getRoomsDB().find((item) => item.id === id);
    return room ? toRoom(room) : undefined;
  },
  async createRoom(data: CreateRoomDto): Promise<Room> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la habitación.');

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
    getRoomsDB().push(room);
    persistRoomsDB();
    return toRoom(room);
  },
  async updateRoom(id: ID, data: UpdateRoomDto): Promise<Room> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar la habitación.');

    const room = getRoomsDB().find((item) => item.id === id);
    if (!room) throw new Error(`No existe la habitación ${id}.`);

    Object.assign(room, data, { updated_at: new Date().toISOString() });
    persistRoomsDB();
    return toRoom(room);
  },
  async getRoomTypes(): Promise<RoomType[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los tipos de habitación.');
    return requireCollection(roomTypesDB, 'roomTypesDB').map(toRoomType);
  },
  async getRoomTypeById(id: ID): Promise<RoomType | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el tipo de habitación.');
    const roomType = roomTypesDB.find((item) => item.id === id);
    return roomType ? toRoomType(roomType) : undefined;
  },
  async createRoomType(data: CreateRoomTypeDto): Promise<RoomType> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear el tipo de habitación.');

    const now = new Date().toISOString();
    const roomType: RoomTypeDto = {
      id: createRoomTypeId(),
      code: data.code,
      name: data.name,
      description: data.description,
      capacity: data.capacity,
      bed_configuration: data.bed_configuration,
      room_feature_ids: data.room_feature_ids,
      active: data.active ?? true,
      created_at: now,
      updated_at: now,
    };
    roomTypesDB.push(roomType);
    return toRoomType(roomType);
  },
  async updateRoomType(id: ID, data: UpdateRoomTypeDto): Promise<RoomType> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar el tipo de habitación.');

    const roomType = roomTypesDB.find((item) => item.id === id);
    if (!roomType) throw new Error(`No existe el tipo de habitación ${id}.`);

    Object.assign(roomType, data, { updated_at: new Date().toISOString() });
    return toRoomType(roomType);
  },
};
export default roomService;
