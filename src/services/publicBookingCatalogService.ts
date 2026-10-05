import type { Booking } from '@/shared/types/entities/booking';
import type { Currency } from '@/shared/types/common';
import { toDomain as toRate, type Rate, type RateDto } from '@/shared/types/entities/rate';
import type { Room } from '@/shared/types/entities/room';
import {
  toDomain as toRoomFeature,
  type RoomFeature,
  type RoomFeatureDto,
} from '@/shared/types/entities/room-feature';
import {
  toDomain as toRoomType,
  type RoomType,
  type RoomTypeDto,
} from '@/shared/types/entities/room-type';
import { HttpError, httpClient } from './http-client';
import { mockUtils, simulateLatency } from './mockUtils';

type ApiRoomType = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  capacity: number;
  bedConfiguration: string;
  roomFeatureIds?: string[];
  roomFeatures?: ApiRoomFeature[];
  features?: ApiRoomFeature[];
  active?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ApiRoomFeature = {
  id: string;
  name?: string | null;
  description?: string | null;
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
  active?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type PublicAvailabilityResult = {
  roomTypeId: string;
  code: string;
  name: string;
  capacity: number;
  bedConfiguration: string;
  availableRooms: number;
  rate: ApiRate;
  totalAmountCents: number;
  currency: string;
};

type PublicAvailabilityResponse = {
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  results: PublicAvailabilityResult[];
};

export type PublicAvailableRoomType = {
  roomType: RoomType;
  availableRooms: number;
  rate: Rate;
  totalAmountCents: number;
};

export type PublicRoomTypeCatalog = {
  roomTypes: RoomType[];
  features: RoomFeature[];
};

export type PublicBookingRequest = {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  notes?: string;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    nationality?: string;
    documentType?: 'national_id' | 'passport' | 'driver_license';
    documentNumber?: string;
  };
};

export type PublicBookingConfirmation = {
  confirmationCode: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  roomTypeId: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  rateName: string;
  totalAmountCents: number;
  currency: Currency;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  createdAt: string;
};

const nowIso = () => new Date().toISOString();

function requiredId(id: string | undefined | null, label: string): string {
  if (!id) throw new Error(`La respuesta del backend no incluye ${label}.`);
  return id;
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
    room_feature_ids:
      api.roomFeatureIds ??
      api.roomFeatures?.map((feature) => feature.id) ??
      api.features?.map((feature) => feature.id) ??
      [],
    active: api.active ?? true,
    created_at: api.createdAt ?? timestamp,
    updated_at: timestamp,
  };
}

function toRoomFeatureDto(api: ApiRoomFeature): RoomFeatureDto {
  const timestamp = api.updatedAt ?? api.createdAt ?? nowIso();
  return {
    id: api.id,
    name: api.name ?? api.id,
    description: api.description ?? undefined,
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
    active: api.active ?? true,
    created_at: api.createdAt ?? timestamp,
    updated_at: timestamp,
  };
}

function toUnavailableError(operation: string): Error {
  return new Error(`${operation} debe usar contrato backend publico; no hay fallback mock.`);
}

function getHttpErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpError)) return error instanceof Error ? error.message : fallback;
  const data = error.data;
  if (data && typeof data === 'object') {
    const value = data as { message?: unknown; error?: unknown; detail?: unknown };
    if (typeof value.message === 'string' && value.message.trim()) return value.message;
    if (typeof value.error === 'string' && value.error.trim()) return value.error;
    if (typeof value.detail === 'string' && value.detail.trim()) return value.detail;
  }
  if (error.status === 400) return `${fallback} Revisa las fechas y huespedes.`;
  if (error.status === 404) return `${fallback} El contrato publico no esta disponible.`;
  return fallback;
}

async function publicRequest<T>(call: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw new Error(getHttpErrorMessage(error, fallback));
  }
}

async function fetchPublicRoomTypes(): Promise<ApiRoomType[]> {
  return publicRequest(
    () =>
      httpClient.get<ApiRoomType[]>('/public/room-types', {
        auth: { skipAuthorization: true, skipRefresh: true },
      }),
    'No fue posible cargar los tipos de habitacion.',
  );
}

function buildRoomTypeCatalog(roomTypes: ApiRoomType[]): PublicRoomTypeCatalog {
  const featuresById = new Map<string, RoomFeature>();

  roomTypes.forEach((roomType) => {
    (roomType.features ?? roomType.roomFeatures ?? []).forEach((feature) => {
      featuresById.set(feature.id, toRoomFeature(toRoomFeatureDto(feature)));
    });
  });

  return {
    roomTypes: roomTypes.map(toRoomTypeDto).map(toRoomType),
    features: [...featuresById.values()],
  };
}

function buildRoomTypeFromAvailability(result: PublicAvailabilityResult): RoomType {
  return toRoomType(
    toRoomTypeDto({
      id: result.roomTypeId,
      code: result.code,
      name: result.name,
      capacity: result.capacity,
      bedConfiguration: result.bedConfiguration,
      active: true,
    }),
  );
}

export const publicBookingCatalogService = {
  async getRoomTypes(): Promise<RoomType[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los tipos de habitacion.');
    const roomTypes = await fetchPublicRoomTypes();
    return roomTypes.map(toRoomTypeDto).map(toRoomType);
  },
  async getRoomTypeCatalog(): Promise<PublicRoomTypeCatalog> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los tipos de habitacion.');
    return buildRoomTypeCatalog(await fetchPublicRoomTypes());
  },
  async getRates(): Promise<Rate[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las tarifas.');
    const rates = await publicRequest(
      () =>
        httpClient.get<ApiRate[]>('/public/rates', {
          auth: { skipAuthorization: true, skipRefresh: true },
        }),
      'No fue posible cargar las tarifas.',
    );
    return rates.map(toRateDto).map(toRate);
  },
  async getAvailability(filters: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children?: number;
    roomTypeId?: string;
  }): Promise<PublicAvailableRoomType[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible buscar disponibilidad.');
    const query = new URLSearchParams({
      checkIn: filters.checkIn,
      checkOut: filters.checkOut,
      adults: String(filters.adults),
      children: String(filters.children ?? 0),
    });
    if (filters.roomTypeId) query.set('roomTypeId', filters.roomTypeId);
    const response = await publicRequest(
      () =>
        httpClient.get<PublicAvailabilityResponse>(`/public/availability?${query.toString()}`, {
          auth: { skipAuthorization: true, skipRefresh: true },
        }),
      'No fue posible buscar disponibilidad.',
    );
    return response.results.map((result) => ({
      roomType: buildRoomTypeFromAvailability(result),
      availableRooms: result.availableRooms,
      rate: toRate(toRateDto(result.rate)),
      totalAmountCents: result.totalAmountCents,
    }));
  },
  async createBooking(data: PublicBookingRequest): Promise<PublicBookingConfirmation> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la reserva.');
    return publicRequest(
      () =>
        httpClient.post<PublicBookingConfirmation>('/public/bookings', data, {
          auth: { skipAuthorization: true, skipRefresh: true },
        }),
      'No fue posible crear la reserva.',
    );
  },
  async getRooms(): Promise<Room[]> {
    throw toUnavailableError('La disponibilidad publica por habitaciones');
  },
  async getBookings(): Promise<Booking[]> {
    throw toUnavailableError('La disponibilidad publica por reservas');
  },
};
