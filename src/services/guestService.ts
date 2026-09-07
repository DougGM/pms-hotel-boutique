import { guestMapper, type Guest } from '@/shared/types/entities';
import type { ID } from '@/shared/types/common';
import { mockGuests } from './mockData';
import { mockUtils, simulateLatency } from './mockUtils';
export const guestService = {
  async getGuests(): Promise<Guest[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los huéspedes.');
    return mockGuests.map(guestMapper.toDomain);
  },
  async getGuestById(id: ID): Promise<Guest | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el huésped.');
    const guest = mockGuests.find((item) => item.id === id);
    return guest ? guestMapper.toDomain(guest) : undefined;
  },
};
export default guestService;
