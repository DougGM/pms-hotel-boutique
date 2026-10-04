import {
  toDomain as toServiceRequest,
  type ServiceRequest,
  type ServiceRequestStatus,
} from '@/shared/types/entities/service-request';
import type { ID } from '@/shared/types/common';
import type {
  ServiceRequestDto,
  ServiceRequestTypeDto,
} from '@/shared/types/entities/service-request';
import { bookingsDB, roomsDB, serviceRequestsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { HttpError, httpClient } from './http-client';
import { hydrateCollection, persistCollection } from './mockPersistence';

// --- Conserjería (INT-11) ----------------------------------------------------
// El personal opera contra `ConciergeRequestController`. El backend valida las
// transiciones, agrega las notas del cambio de estado a las existentes y asigna
// al usuario autenticado como responsable al tomar la solicitud.

type ConciergeRequestResponse = {
  id: string;
  bookingId: string;
  roomId?: string | null;
  roomNumber?: string | null;
  guestId?: string | null;
  guestName?: string | null;
  responsibleUserId?: string | null;
  responsibleUserName?: string | null;
  responsibleUserEmail?: string | null;
  type: ServiceRequestTypeDto;
  description: string;
  status: ServiceRequestDto['status'];
  notes?: string | null;
  chargeId?: string | null;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
};

function toConciergeDto(response: ConciergeRequestResponse): ServiceRequestDto {
  return {
    id: response.id,
    booking_id: response.bookingId,
    room_id: response.roomId ?? '',
    room_number: response.roomNumber ?? undefined,
    guest_id: response.guestId ?? undefined,
    guest_name: response.guestName ?? undefined,
    responsible_user_id: response.responsibleUserId ?? undefined,
    responsible_user_name: response.responsibleUserName ?? undefined,
    responsible_user_email: response.responsibleUserEmail ?? undefined,
    type: response.type,
    description: response.description,
    status: response.status,
    notes: response.notes ?? undefined,
    charge_id: response.chargeId ?? undefined,
    requested_at: response.requestedAt,
    created_at: response.createdAt,
    updated_at: response.updatedAt,
  };
}

function toStatusParam(status: ServiceRequestStatus): ServiceRequestDto['status'] {
  return status === 'inProgress' ? 'in_progress' : status;
}

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

function getHttpErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpError)) return error instanceof Error ? error.message : fallback;
  if (error.status === 400) {
    return `${fallback} El backend rechazó la operación: la solicitud cambió de estado o ya no admite ese cambio.`;
  }
  if (error.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (error.status === 403) return 'No tienes permisos para operar Conserjería.';
  if (error.status === 404) return `${fallback} La solicitud no existe.`;
  return fallback;
}

async function request<T>(call: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw new Error(getHttpErrorMessage(error, fallback));
  }
}

const conciergePath = '/concierge/requests';

// --- Portal del huésped y desperfectos (mock) ---------------------------------
// `createRequest`, `cancelRequest` y `getRequestsByGuestId` son del portal del
// huésped (pendiente INT-12); `createMaintenanceReport` no tiene endpoint en el
// backend. Siguen sobre `src/data/db.ts`.

const serviceRequestsStorageKey = 'PMS_SERVICE_REQUESTS_DB';

function getServiceRequestsDB(): ServiceRequestDto[] {
  return hydrateCollection(serviceRequestsStorageKey, serviceRequestsDB);
}

function persistServiceRequestsDB(): void {
  persistCollection(serviceRequestsStorageKey, serviceRequestsDB);
}

function nextRequestId(): string {
  const max = getServiceRequestsDB().reduce((currentMax, request) => {
    const match = /^SRQ?-(\d+)$/.exec(request.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `SR-${String(max + 1).padStart(3, '0')}`;
}

function assertRequestExists(id: ID): ServiceRequestDto {
  const request = getServiceRequestsDB().find((item) => item.id === id);
  if (!request) throw new Error(`No existe la solicitud ${id}.`);
  return request;
}

function findActiveBookingForRoom(roomId: ID) {
  return bookingsDB.find(
    (booking) =>
      booking.room_id === roomId &&
      (booking.status === 'checked_in' || booking.status === 'confirmed'),
  );
}

export const serviceRequestService = {
  async getConciergeRequests(
    filters: { bookingId?: ID; status?: ServiceRequestStatus } = {},
  ): Promise<ServiceRequest[]> {
    const response = await request(
      () =>
        httpClient.get<ConciergeRequestResponse[]>(
          withQuery(conciergePath, {
            bookingId: filters.bookingId,
            status: filters.status ? toStatusParam(filters.status) : undefined,
          }),
        ),
      'No fue posible cargar las solicitudes de conserjería.',
    );
    return response.map((item) => toServiceRequest(toConciergeDto(item)));
  },
  async getConciergeRequestById(id: ID): Promise<ServiceRequest | undefined> {
    try {
      const response = await httpClient.get<ConciergeRequestResponse>(`${conciergePath}/${id}`);
      return toServiceRequest(toConciergeDto(response));
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return undefined;
      throw new Error(getHttpErrorMessage(error, 'No fue posible cargar la solicitud.'));
    }
  },
  /** El backend toma habitación y huésped de la reserva, y la crea en `pending`. */
  async createConciergeRequest(data: {
    bookingId: ID;
    description: string;
    notes?: string;
  }): Promise<ServiceRequest> {
    if (!data.description.trim()) throw new Error('Describe la solicitud.');
    const response = await request(
      () =>
        httpClient.post<ConciergeRequestResponse>(conciergePath, {
          bookingId: data.bookingId,
          description: data.description.trim(),
          notes: data.notes?.trim() || undefined,
        }),
      'No fue posible crear la solicitud.',
    );
    return toServiceRequest(toConciergeDto(response));
  },
  /** Reemplaza descripción (solo `pending`) y/o notas (hasta `in_progress`). */
  async updateConciergeRequest(
    id: ID,
    data: { description?: string; notes?: string },
  ): Promise<ServiceRequest> {
    const response = await request(
      () => httpClient.put<ConciergeRequestResponse>(`${conciergePath}/${id}`, data),
      'No fue posible guardar la solicitud.',
    );
    return toServiceRequest(toConciergeDto(response));
  },
  /**
   * `notes` se agrega a las notas existentes (p. ej. el motivo de un rechazo o
   * una cancelación). Sin `responsibleUserId`, el backend asigna al usuario
   * autenticado al aceptar, iniciar o completar una solicitud sin responsable.
   */
  async updateConciergeRequestStatus(
    id: ID,
    status: ServiceRequestStatus,
    options: { notes?: string; responsibleUserId?: ID } = {},
  ): Promise<ServiceRequest> {
    const response = await request(
      () =>
        httpClient.post<ConciergeRequestResponse>(`${conciergePath}/${id}/status`, {
          status: toStatusParam(status),
          notes: options.notes,
          responsibleUserId: options.responsibleUserId,
        }),
      'No fue posible actualizar la solicitud.',
    );
    return toServiceRequest(toConciergeDto(response));
  },
  async getRequests(): Promise<ServiceRequest[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las solicitudes.');
    return requireCollection(getServiceRequestsDB(), 'serviceRequestsDB').map(toServiceRequest);
  },
  async getRequestById(id: ID): Promise<ServiceRequest | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la solicitud.');
    const request = getServiceRequestsDB().find((item) => item.id === id);
    return request ? toServiceRequest(request) : undefined;
  },
  async getRequestsByGuestId(guestId: ID): Promise<ServiceRequest[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las solicitudes.');
    return requireCollection(getServiceRequestsDB(), 'serviceRequestsDB')
      .filter((item) => item.guest_id === guestId)
      .map(toServiceRequest);
  },
  async createRequest(data: {
    bookingId: ID;
    roomId: ID;
    guestId?: ID;
    type: ServiceRequestTypeDto;
    description: string;
    notes?: string;
  }): Promise<ServiceRequest> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la solicitud.');

    const booking = bookingsDB.find((item) => item.id === data.bookingId);
    if (!booking) throw new Error(`No existe la reserva ${data.bookingId}.`);
    if (data.guestId && booking.guest_id !== data.guestId) {
      throw new Error('La reserva no pertenece al huesped autenticado.');
    }
    if (booking.room_id !== data.roomId) {
      throw new Error('La habitacion no coincide con la reserva activa.');
    }
    const room = roomsDB.find((item) => item.id === data.roomId);
    if (!room) throw new Error(`No existe la habitacion ${data.roomId}.`);
    if (!data.description.trim()) throw new Error('Describe la solicitud.');

    const now = new Date().toISOString();
    const request: ServiceRequestDto = {
      id: nextRequestId(),
      booking_id: booking.id,
      room_id: room.id,
      guest_id: data.guestId,
      type: data.type,
      description: data.description.trim(),
      status: 'pending',
      notes: data.notes?.trim() || undefined,
      requested_at: now,
      created_at: now,
      updated_at: now,
    };
    getServiceRequestsDB().unshift(request);
    persistServiceRequestsDB();
    return toServiceRequest(request);
  },
  async createMaintenanceReport(data: {
    roomId: ID;
    description: string;
    notes?: string;
  }): Promise<ServiceRequest> {
    const booking = findActiveBookingForRoom(data.roomId);
    if (!booking) {
      throw new Error(
        `No existe una reserva activa para la habitacion ${data.roomId}; no se creo el reporte de mantenimiento.`,
      );
    }

    return this.createRequest({
      bookingId: booking.id,
      roomId: data.roomId,
      guestId: booking.guest_id,
      type: 'maintenance',
      description: data.description,
      notes: data.notes,
    });
  },
  async cancelRequest(requestId: ID, guestId?: ID): Promise<ServiceRequest> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cancelar la solicitud.');

    const request = assertRequestExists(requestId);
    if (guestId && request.guest_id !== guestId) {
      throw new Error('La solicitud no pertenece al huesped autenticado.');
    }
    if (request.status !== 'pending') {
      throw new Error('Esta solicitud ya no se puede cancelar.');
    }

    request.status = 'rejected';
    request.updated_at = new Date().toISOString();
    persistServiceRequestsDB();
    return toServiceRequest(request);
  },
};
export default serviceRequestService;
