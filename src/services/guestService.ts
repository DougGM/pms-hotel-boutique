import { toDomain as toGuest, type Guest } from '@/shared/types/entities/guest';
import type { ID } from '@/shared/types/common';
import { lotBMockData } from '@/shared/mocks';
import { mockUtils, simulateLatency } from './mockUtils';
export const guestService = {
  async getGuests(): Promise<Guest[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los huéspedes.');
    return lotBMockData.guests.map(toGuest);
  },
  async getGuestById(id: ID): Promise<Guest | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el huésped.');
    const guest = lotBMockData.guests.find((item) => item.id === id);
    return guest ? toGuest(guest) : undefined;
  },
};
export default guestService;
