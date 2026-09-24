import {
  toDomain as toRoom,
  type CreateRoomDto,
  type Room,
  type RoomDto,
  type UpdateRoomDto,
} from '@/shared/types/entities/room';
import { toDomain as toRate, type Rate, type RateDto } from '@/shared/types/entities/rate';
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
const roomTypesStorageKey = 'PMS_ROOM_TYPES_DB';
const ratesStorageKey = 'PMS_RATES_DB';

type SaveRateDto = {
  room_type_id: ID;
  name: string;
  valid_from: string;
  valid_to: string;
  price_cents: number;
  currency?: RateDto['currency'];
  minimum_nights?: number;
  refundable?: boolean;
  active?: boolean;
};

function getRoomsDB(): RoomDto[] {
  return hydrateCollection(roomsStorageKey, roomsDB);
}

function persistRoomsDB(): void {
  persistCollection(roomsStorageKey, roomsDB);
}

function getRoomTypesDB(): RoomTypeDto[] {
  return hydrateCollection(roomTypesStorageKey, roomTypesDB);
}

function persistRoomTypesDB(): void {
  persistCollection(roomTypesStorageKey, roomTypesDB);
}

function getRatesDB(): RateDto[] {
  return hydrateCollection(ratesStorageKey, ratesDB);
}

function persistRatesDB(): void {
  persistCollection(ratesStorageKey, ratesDB);
}

function createRoomId(): ID {
  return `RM-${String(getRoomsDB().length + 1).padStart(3, '0')}`;
}

function createRoomTypeId(): ID {
  return `RT-${String(getRoomTypesDB().length + 1).padStart(2, '0')}`;
}

function createRateId(): ID {
  return `RATE-${String(getRatesDB().length + 1).padStart(3, '0')}`;
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
    return requireCollection(getRatesDB(), 'ratesDB').map(toRate);
  },
  async createRate(data: SaveRateDto): Promise<Rate> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la tarifa.');

    const now = new Date().toISOString();
    const rate: RateDto = {
      id: createRateId(),
      room_type_id: data.room_type_id,
      name: data.name.trim(),
      valid_from: data.valid_from,
      valid_to: data.valid_to,
      price_cents: data.price_cents,
      currency: data.currency ?? 'GTQ',
      minimum_nights: data.minimum_nights ?? 1,
      refundable: data.refundable ?? true,
      active: data.active ?? true,
      created_at: now,
      updated_at: now,
    };
    getRatesDB().push(rate);
    persistRatesDB();
    return toRate(rate);
  },
  async updateRate(id: ID, data: Partial<SaveRateDto>): Promise<Rate> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar la tarifa.');

    const rate = getRatesDB().find((item) => item.id === id);
    if (!rate) throw new Error(`No existe la tarifa ${id}.`);

    Object.assign(rate, data, { updated_at: new Date().toISOString() });
    persistRatesDB();
    return toRate(rate);
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
    return requireCollection(getRoomTypesDB(), 'roomTypesDB').map(toRoomType);
  },
  async getRoomTypeById(id: ID): Promise<RoomType | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el tipo de habitación.');
    const roomType = getRoomTypesDB().find((item) => item.id === id);
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
    getRoomTypesDB().push(roomType);
    persistRoomTypesDB();
    return toRoomType(roomType);
  },
  async updateRoomType(id: ID, data: UpdateRoomTypeDto): Promise<RoomType> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar el tipo de habitación.');

    const roomType = getRoomTypesDB().find((item) => item.id === id);
    if (!roomType) throw new Error(`No existe el tipo de habitación ${id}.`);

    Object.assign(roomType, data, { updated_at: new Date().toISOString() });
    persistRoomTypesDB();
    return toRoomType(roomType);
  },
};
export default roomService;
