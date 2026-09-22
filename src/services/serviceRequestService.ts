import {
  toDomain as toServiceRequest,
  type CreateServiceRequestDto,
  type ServiceRequest,
  type ServiceRequestStatus,
  type ServiceRequestType,
} from '@/shared/types/entities/service-request';
import type { ID } from '@/shared/types/common';
import type { ServiceRequestDto } from '@/shared/types/entities/service-request/service-request.dto';
import { SERVICE_REQUEST_STATUS_TRANSITIONS } from '@/shared/constants/statuses';
import { bookingsDB, serviceRequestsDB } from '@/data/db';
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

function createRequestId(): ID {
  return `SRQ-${String(getServiceRequestsDB().length + 1).padStart(3, '0')}`;
}

function ensureValidTransition(current: ServiceRequestStatus, next: ServiceRequestStatus): void {
  if (current === next) return;
  if (current === 'accepted' && next === 'completed') return;
  if (!SERVICE_REQUEST_STATUS_TRANSITIONS[current].includes(next)) {
    throw new Error(`Transicion invalida de solicitud: ${current} -> ${next}.`);
  }
}

function findBookingIdForRoom(roomId: ID): ID {
  return (
    bookingsDB.find(
      (booking) =>
        booking.room_id === roomId &&
        (booking.status === 'checked_in' || booking.status === 'confirmed'),
    )?.id ?? 'BKG-HOUSEKEEPING'
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
  async createRequest(data: CreateServiceRequestDto): Promise<ServiceRequest> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la solicitud.');

    const now = new Date().toISOString();
    const request: ServiceRequestDto = {
      id: createRequestId(),
      booking_id: data.booking_id,
      room_id: data.room_id,
      guest_id: data.guest_id,
      type: data.type,
      description: data.description,
      status: 'pending',
      notes: data.notes,
      requested_at: now,
      created_at: now,
      updated_at: now,
    };
    getServiceRequestsDB().push(request);
    persistServiceRequestsDB();
    return toServiceRequest(request);
  },
  async createMaintenanceReport(data: {
    roomId: ID;
    description: string;
    notes?: string;
  }): Promise<ServiceRequest> {
    return this.createRequest({
      booking_id: findBookingIdForRoom(data.roomId),
      room_id: data.roomId,
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

    const request = getServiceRequestsDB().find((item) => item.id === id);
    if (!request) throw new Error(`No existe la solicitud ${id}.`);

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

    const request = getServiceRequestsDB().find((item) => item.id === id);
    if (!request) throw new Error(`No existe la solicitud ${id}.`);

    request.type = type;
    request.updated_at = new Date().toISOString();
    persistServiceRequestsDB();
    return toServiceRequest(request);
  },
};
export default serviceRequestService;
