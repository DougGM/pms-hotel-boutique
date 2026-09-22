import {
  toDomain as toServiceRequest,
  type ServiceRequest,
  type ServiceRequestStatus,
  type ServiceRequestType,
} from '@/shared/types/entities/service-request';
import type { ID } from '@/shared/types/common';
import type {
  ServiceRequestDto,
  ServiceRequestTypeDto,
} from '@/shared/types/entities/service-request';
import { SERVICE_REQUEST_STATUS_TRANSITIONS } from '@/shared/constants/statuses';
import { bookingsDB, roomsDB, serviceRequestsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { hydrateCollection, persistCollection } from './mockPersistence';

const serviceRequestsStorageKey = 'PMS_SERVICE_REQUESTS_DB';

function getServiceRequestsDB(): ServiceRequestDto[] {
  return hydrateCollection(serviceRequestsStorageKey, serviceRequestsDB);
}

function persistServiceRequestsDB(): void {
  persistCollection(serviceRequestsStorageKey, serviceRequestsDB);
}

function toDtoStatus(status: ServiceRequestStatus): ServiceRequestDto['status'] {
  return status === 'inProgress' ? 'in_progress' : status;
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

function ensureValidTransition(current: ServiceRequestStatus, next: ServiceRequestStatus): void {
  if (current === next) return;
  if (current === 'accepted' && next === 'completed') return;
  if (!SERVICE_REQUEST_STATUS_TRANSITIONS[current].includes(next)) {
    throw new Error(`Transicion invalida de solicitud: ${current} -> ${next}.`);
  }
}

function findActiveBookingForRoom(roomId: ID) {
  return bookingsDB.find(
    (booking) =>
      booking.room_id === roomId &&
      (booking.status === 'checked_in' || booking.status === 'confirmed'),
  );
}

export const serviceRequestService = {
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
  async updateRequestStatus(
    id: ID,
    status: ServiceRequestStatus,
    notes?: string,
  ): Promise<ServiceRequest> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar la solicitud.');

    const request = assertRequestExists(id);
    const current = toServiceRequest(request).status;
    ensureValidTransition(current, status);
    request.status = toDtoStatus(status);
    request.updated_at = new Date().toISOString();
    if (notes !== undefined) request.notes = notes;
    persistServiceRequestsDB();
    return toServiceRequest(request);
  },
  async updateRequestType(id: ID, type: ServiceRequestType): Promise<ServiceRequest> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar la solicitud.');

    const request = assertRequestExists(id);
    request.type = type;
    request.updated_at = new Date().toISOString();
    persistServiceRequestsDB();
    return toServiceRequest(request);
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
