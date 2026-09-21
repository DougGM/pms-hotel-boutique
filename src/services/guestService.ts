import {
  toDomain as toGuest,
  type CreateGuestDto,
  type Guest,
  type GuestDto,
  type UpdateGuestDto,
} from '@/shared/types/entities/guest';
import type { ID } from '@/shared/types/common';
import { guestsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';

function nextGuestId(): string {
  const max = guestsDB.reduce((currentMax, guest) => {
    const match = /^GST-(\d+)$/.exec(guest.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `GST-${String(max + 1).padStart(3, '0')}`;
}

export const guestService = {
  async getGuests(): Promise<Guest[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los huéspedes.');
    return requireCollection(guestsDB, 'guestsDB').map(toGuest);
  },
  async getGuestById(id: ID): Promise<Guest | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el huésped.');
    const guest = guestsDB.find((item) => item.id === id);
    return guest ? toGuest(guest) : undefined;
  },
  async createGuest(data: CreateGuestDto): Promise<Guest> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear el huesped.');
    const now = new Date().toISOString();
    const guest: GuestDto = {
      id: nextGuestId(),
      ...data,
      created_at: now,
      updated_at: now,
    };
    guestsDB.push(guest);
    return toGuest(guest);
  },
  async updateGuest(id: ID, data: UpdateGuestDto): Promise<Guest> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar el huesped.');

    const guest = guestsDB.find((item) => item.id === id);
    if (!guest) throw new Error(`No existe el huesped ${id}.`);

    Object.assign(guest, data, { updated_at: new Date().toISOString() });
    return toGuest(guest);
  },
};
export default guestService;
