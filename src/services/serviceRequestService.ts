import {
  toDomain as toServiceRequest,
  type ServiceRequest,
} from '@/shared/types/entities/service-request';
import type { ID } from '@/shared/types/common';
import type { ServiceRequestTypeDto } from '@/shared/types/entities/service-request';
import { bookingsDB, roomsDB, serviceRequestsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';

function nextRequestId(): string {
  const max = serviceRequestsDB.reduce((currentMax, request) => {
    const match = /^SR-(\d+)$/.exec(request.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `SR-${String(max + 1).padStart(3, '0')}`;
}

function assertRequestExists(id: ID) {
  const request = serviceRequestsDB.find((item) => item.id === id);
  if (!request) throw new Error(`No existe la solicitud ${id}.`);
  return request;
}

export const serviceRequestService = {
  async getRequests(): Promise<ServiceRequest[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las solicitudes.');
    return requireCollection(serviceRequestsDB, 'serviceRequestsDB').map(toServiceRequest);
  },
  async getRequestById(id: ID): Promise<ServiceRequest | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la solicitud.');
    const request = serviceRequestsDB.find((item) => item.id === id);
    return request ? toServiceRequest(request) : undefined;
  },
  async getRequestsByGuestId(guestId: ID): Promise<ServiceRequest[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las solicitudes.');
    return requireCollection(serviceRequestsDB, 'serviceRequestsDB')
      .filter((item) => item.guest_id === guestId)
      .map(toServiceRequest);
  },
  async createRequest(data: {
    bookingId: ID;
    roomId: ID;
    guestId: ID;
    type: ServiceRequestTypeDto;
    description: string;
    notes?: string;
  }): Promise<ServiceRequest> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la solicitud.');

    const booking = bookingsDB.find((item) => item.id === data.bookingId);
    if (!booking) throw new Error(`No existe la reserva ${data.bookingId}.`);
    if (booking.guest_id !== data.guestId) {
      throw new Error('La reserva no pertenece al huesped autenticado.');
    }
    if (booking.room_id !== data.roomId) {
      throw new Error('La habitacion no coincide con la reserva activa.');
    }
    const room = roomsDB.find((item) => item.id === data.roomId);
    if (!room) throw new Error(`No existe la habitacion ${data.roomId}.`);
    if (!data.description.trim()) throw new Error('Describe la solicitud.');

    const now = new Date().toISOString();
    const request = {
      id: nextRequestId(),
      booking_id: booking.id,
      room_id: room.id,
      guest_id: data.guestId,
      type: data.type,
      description: data.description.trim(),
      status: 'pending' as const,
      notes: data.notes?.trim() || undefined,
      requested_at: now,
      created_at: now,
      updated_at: now,
    };
    serviceRequestsDB.unshift(request);
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
    return toServiceRequest(request);
  },
};
export default serviceRequestService;
