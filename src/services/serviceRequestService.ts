import {
  toDomain as toServiceRequest,
  type ServiceRequest,
} from '@/shared/types/entities/service-request';
import type { ID } from '@/shared/types/common';
import { serviceRequestsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';

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
};
export default serviceRequestService;
