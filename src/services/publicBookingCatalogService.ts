import { bookingsDB, ratesDB, roomsDB, roomTypesDB } from '@/data/db';
import {
  toDomain as toBooking,
  type Booking,
  type BookingDto,
} from '@/shared/types/entities/booking';
import { toDomain as toRate, type Rate, type RateDto } from '@/shared/types/entities/rate';
import { toDomain as toRoom, type Room, type RoomDto } from '@/shared/types/entities/room';
import {
  toDomain as toRoomType,
  type RoomType,
  type RoomTypeDto,
} from '@/shared/types/entities/room-type';
import { HttpError, httpClient } from './http-client';
import { mockUtils, simulateLatency } from './mockUtils';

type ApiRoom = {
  id: string;
  roomNumber: string;
  roomTypeId?: string;
  roomType?: { id: string };
  floor: number;
  status: RoomDto['status'] | Room['status'];
  housekeepingStatus: RoomDto['housekeeping_status'];
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ApiRoomType = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  capacity: number;
  bedConfiguration: string;
  roomFeatureIds?: string[];
  roomFeatures?: { id: string }[];
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ApiRate = {
  id: string;
  roomTypeId?: string;
  roomType?: { id: string };
  name: string;
  validFrom: string;
  validTo: string;
  priceCents: number;
  currency?: RateDto['currency'];
  minimumNights?: number;
  refundable?: boolean;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ApiBooking = {
  id: string;
  confirmationCode: string;
  guestLinkCode?: string | null;
  guestId?: string;
  guest?: { id: string };
  roomId?: string | null;
  room?: { id: string } | null;
  roomTypeId?: string;
  roomType?: { id: string };
  rateId?: string | null;
  rate?: { id: string } | null;
  checkIn: string;
  checkOut: string;
  status: BookingDto['status'] | Booking['status'];
  adults: number;
  children: number;
  totalAmountCents: number;
  currency?: BookingDto['currency'];
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const nowIso = () => new Date().toISOString();
const isProtectedOrMissingPublicEndpoint = (error: unknown): boolean =>
  error instanceof HttpError &&
  (error.status === 401 || error.status === 403 || error.status === 404);

function requiredId(id: string | undefined | null, label: string): string {
  if (!id) throw new Error(`La respuesta del backend no incluye ${label}.`);
  return id;
}

function toRoomDto(api: ApiRoom): RoomDto {
  const timestamp = api.updatedAt ?? api.createdAt ?? nowIso();
  return {
    id: api.id,
    room_number: api.roomNumber,
    room_type_id: requiredId(api.roomTypeId ?? api.roomType?.id, 'roomTypeId'),
    floor: api.floor,
    status: api.status === 'outOfService' ? 'out_of_service' : api.status,
    housekeeping_status: api.housekeepingStatus,
    notes: api.notes ?? undefined,
    created_at: api.createdAt ?? timestamp,
    updated_at: timestamp,
  };
}

function toRoomTypeDto(api: ApiRoomType): RoomTypeDto {
  const timestamp = api.updatedAt ?? api.createdAt ?? nowIso();
  return {
    id: api.id,
    code: api.code,
    name: api.name,
    description: api.description ?? undefined,
    capacity: api.capacity,
    bed_configuration: api.bedConfiguration,
    room_feature_ids: api.roomFeatureIds ?? api.roomFeatures?.map((feature) => feature.id) ?? [],
    active: api.active,
    created_at: api.createdAt ?? timestamp,
    updated_at: timestamp,
  };
}

function toRateDto(api: ApiRate): RateDto {
  const timestamp = api.updatedAt ?? api.createdAt ?? nowIso();
  return {
    id: api.id,
    room_type_id: requiredId(api.roomTypeId ?? api.roomType?.id, 'roomTypeId'),
    name: api.name,
    valid_from: api.validFrom,
    valid_to: api.validTo,
    price_cents: api.priceCents,
    currency: api.currency ?? 'GTQ',
    minimum_nights: api.minimumNights ?? 1,
    refundable: api.refundable ?? true,
    active: api.active,
    created_at: api.createdAt ?? timestamp,
    updated_at: timestamp,
  };
}

function toBookingDto(api: ApiBooking): BookingDto {
  const timestamp = api.updatedAt ?? api.createdAt ?? nowIso();
  return {
    id: api.id,
    confirmation_code: api.confirmationCode,
    guest_link_code: api.guestLinkCode ?? api.confirmationCode,
    guest_id: requiredId(api.guestId ?? api.guest?.id, 'guestId'),
    room_id: api.roomId ?? api.room?.id ?? undefined,
    room_type_id: requiredId(api.roomTypeId ?? api.roomType?.id, 'roomTypeId'),
    rate_id: api.rateId ?? api.rate?.id ?? undefined,
    check_in: api.checkIn,
    check_out: api.checkOut,
    status:
      api.status === 'checkedIn'
        ? 'checked_in'
        : api.status === 'checkedOut'
          ? 'checked_out'
          : api.status === 'noShow'
            ? 'no_show'
            : api.status,
    adults: api.adults,
    children: api.children,
    total_amount_cents: api.totalAmountCents,
    currency: api.currency ?? 'GTQ',
    notes: api.notes ?? undefined,
    created_at: api.createdAt ?? timestamp,
    updated_at: timestamp,
  };
}

export const publicBookingCatalogService = {
  async getRoomTypes(): Promise<RoomType[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los tipos de habitacion.');
    try {
      const roomTypes = await httpClient.get<ApiRoomType[]>('/room-types', {
        auth: { skipAuthorization: true, skipRefresh: true },
      });
      return roomTypes.map(toRoomTypeDto).map(toRoomType);
    } catch (error) {
      if (isProtectedOrMissingPublicEndpoint(error)) return roomTypesDB.map(toRoomType);
      throw error;
    }
  },
  async getRates(): Promise<Rate[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las tarifas.');
    try {
      const rates = await httpClient.get<ApiRate[]>('/rates', {
        auth: { skipAuthorization: true, skipRefresh: true },
      });
      return rates.map(toRateDto).map(toRate);
    } catch (error) {
      if (isProtectedOrMissingPublicEndpoint(error)) return ratesDB.map(toRate);
      throw error;
    }
  },
  async getRooms(): Promise<Room[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las habitaciones.');
    try {
      const rooms = await httpClient.get<ApiRoom[]>('/rooms', {
        auth: { skipAuthorization: true, skipRefresh: true },
      });
      return rooms.map(toRoomDto).map(toRoom);
    } catch (error) {
      if (isProtectedOrMissingPublicEndpoint(error)) return roomsDB.map(toRoom);
      throw error;
    }
  },
  async getBookings(): Promise<Booking[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las reservas.');
    try {
      const bookings = await httpClient.get<ApiBooking[]>('/bookings', {
        auth: { skipAuthorization: true, skipRefresh: true },
      });
      return bookings.map(toBookingDto).map(toBooking);
    } catch (error) {
      if (isProtectedOrMissingPublicEndpoint(error)) return bookingsDB.map(toBooking);
      throw error;
    }
  },
};
