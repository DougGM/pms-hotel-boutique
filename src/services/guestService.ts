import {
  toDomain as toGuest,
  type CreateGuestDto,
  type Guest,
  type GuestDocumentTypeDto,
  type GuestDto,
  type UpdateGuestDto,
} from '@/shared/types/entities/guest';
import type { ID } from '@/shared/types/common';
import { guestsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { hydrateCollection, persistCollection, refreshCollection } from './mockPersistence';
import { HttpError, httpClient } from './http-client';

const guestsStorageKey = 'pms.guests';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ApiGuest = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  documentType?: GuestDocumentTypeDto | 'nationalId' | 'driverLicense' | null;
  documentNumber?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const nowIso = () => new Date().toISOString();
const isOfflineError = (error: unknown): boolean =>
  !(error instanceof HttpError) || error.status === 404;

function isUuid(value: ID): boolean {
  return UUID_PATTERN.test(value);
}

function getGuestsCollection() {
  return hydrateCollection(guestsStorageKey, guestsDB);
}

function nextGuestId(): string {
  const max = getGuestsCollection().reduce((currentMax, guest) => {
    const match = /^GST-(\d+)$/.exec(guest.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `GST-${String(max + 1).padStart(3, '0')}`;
}

function toGuestDto(api: ApiGuest): GuestDto {
  const timestamp = api.updatedAt ?? api.createdAt ?? nowIso();
  return {
    id: api.id,
    first_name: api.firstName,
    last_name: api.lastName,
    email: api.email ?? undefined,
    phone: api.phone ?? undefined,
    nationality: api.nationality ?? undefined,
    document_type:
      api.documentType === 'nationalId'
        ? 'national_id'
        : api.documentType === 'driverLicense'
          ? 'driver_license'
          : (api.documentType ?? undefined),
    document_number: api.documentNumber ?? undefined,
    notes: api.notes ?? undefined,
    created_at: api.createdAt ?? timestamp,
    updated_at: timestamp,
  };
}

function toGuestRequest(data: CreateGuestDto | UpdateGuestDto) {
  return {
    firstName: data.first_name?.trim(),
    lastName: data.last_name?.trim(),
    email: data.email?.trim() || undefined,
    phone: data.phone?.trim() || undefined,
    nationality: data.nationality?.trim() || undefined,
    documentType: data.document_type,
    documentNumber: data.document_number?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
  };
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
  if (error.status === 400) return `${fallback} Revisa los datos enviados.`;
  if (error.status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente.';
  if (error.status === 403) return 'No tienes permisos para operar huespedes.';
  if (error.status === 404) return `${fallback} El huesped ya no existe.`;
  if (error.status === 409) return `${fallback} El backend reporto un conflicto.`;
  return fallback;
}

function createLocalGuest(data: CreateGuestDto): Guest {
  const now = new Date().toISOString();
  const guest: GuestDto = {
    id: nextGuestId(),
    ...data,
    created_at: now,
    updated_at: now,
  };
  getGuestsCollection().push(guest);
  persistCollection(guestsStorageKey, getGuestsCollection());
  return toGuest(guest);
}

export const guestService = {
  async getGuests(): Promise<Guest[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los huespedes.');
    try {
      const guests = await httpClient.get<ApiGuest[]>('/guests');
      return guests.map(toGuestDto).map(toGuest);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
    }
    return requireCollection(
      refreshCollection(guestsStorageKey, getGuestsCollection()),
      'guestsDB',
    ).map(toGuest);
  },
  async getGuestById(id: ID): Promise<Guest | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el huesped.');
    try {
      const guest = await httpClient.get<ApiGuest>(`/guests/${id}`);
      return toGuest(toGuestDto(guest));
    } catch (error) {
      if (error instanceof HttpError && error.status === 404 && isUuid(id)) return undefined;
      if (!isOfflineError(error)) throw error;
    }
    const guest = getGuestsCollection().find((item) => item.id === id);
    return guest ? toGuest(guest) : undefined;
  },
  async createGuest(data: CreateGuestDto): Promise<Guest> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear el huesped.');
    try {
      const guest = await httpClient.post<ApiGuest>('/guests', toGuestRequest(data));
      return toGuest(toGuestDto(guest));
    } catch (error) {
      if (!isOfflineError(error)) {
        throw new Error(getHttpErrorMessage(error, 'No fue posible crear el huesped.'));
      }
      return createLocalGuest(data);
    }
  },
  async updateGuest(id: ID, data: UpdateGuestDto): Promise<Guest> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar el huesped.');

    try {
      const guest = await httpClient.put<ApiGuest>(`/guests/${id}`, toGuestRequest(data));
      return toGuest(toGuestDto(guest));
    } catch (error) {
      if (!isOfflineError(error)) {
        throw new Error(getHttpErrorMessage(error, 'No fue posible actualizar el huesped.'));
      }
    }

    const guest = getGuestsCollection().find((item) => item.id === id);
    if (!guest) throw new Error(`No existe el huesped ${id}.`);

    Object.assign(guest, data, { updated_at: new Date().toISOString() });
    persistCollection(guestsStorageKey, getGuestsCollection());
    return toGuest(guest);
  },
};
export default guestService;
