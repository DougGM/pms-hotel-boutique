import {
  toDomain as toBookingCompanion,
  type BookingCompanion,
  type BookingCompanionDto,
  type UpsertBookingCompanionDto,
} from '@/shared/types/entities/booking-companion';
import { getBookingGuestTotal, validateBookingCapacity } from '@/shared/utils/bookingCapacity';
import type { ID } from '@/shared/types/common';
import { bookingCompanionsDB, bookingsDB, roomTypesDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';

function getLastBookingCompanionNumber(): number {
  const max = bookingCompanionsDB.reduce((currentMax, companion) => {
    const match = /^BCMP-(\d+)$/.exec(companion.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return max;
}

function formatBookingCompanionId(value: number): ID {
  return `BCMP-${String(value).padStart(3, '0')}`;
}

function normalizeCompanion(data: UpsertBookingCompanionDto): UpsertBookingCompanionDto {
  return {
    ...data,
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    document_number: data.document_number.trim(),
  };
}

function assertCompanionFields(companions: UpsertBookingCompanionDto[]) {
  companions.forEach((companion, index) => {
    const label = `Acompanante ${index + 1}`;
    if (!companion.first_name) throw new Error(`${label}: ingresa el nombre.`);
    if (!companion.last_name) throw new Error(`${label}: ingresa el apellido.`);
    if (!companion.document_type) throw new Error(`${label}: selecciona el tipo de documento.`);
    if (!companion.document_number) throw new Error(`${label}: ingresa el numero de documento.`);
    if (companion.guest_type !== 'adult' && companion.guest_type !== 'child') {
      throw new Error(`${label}: selecciona si es adulto o menor.`);
    }
  });
}

function assertBookingComposition(bookingId: ID, companions: UpsertBookingCompanionDto[]) {
  const booking = bookingsDB.find((item) => item.id === bookingId);
  if (!booking) throw new Error(`No existe la reserva ${bookingId}.`);

  const roomType = roomTypesDB.find((item) => item.id === booking.room_type_id);
  if (!roomType) throw new Error(`No existe el tipo de habitacion ${booking.room_type_id}.`);

  const companionAdults = companions.filter((item) => item.guest_type === 'adult').length;
  const companionChildren = companions.filter((item) => item.guest_type === 'child').length;
  const totalGuests = getBookingGuestTotal(1, companions.length);
  const capacityError = validateBookingCapacity({
    adults: 1,
    children: companions.length,
    capacity: roomType.capacity,
    roomTypeName: roomType.name,
  });

  if (capacityError) throw new Error(capacityError);
  if (totalGuests !== booking.adults + booking.children) {
    throw new Error(
      `La reserva espera ${booking.adults + booking.children} huesped(es): ${booking.adults} adulto(s) y ${booking.children} menor(es).`,
    );
  }
  if (companionAdults !== booking.adults - 1 || companionChildren !== booking.children) {
    throw new Error(
      `La composicion debe ser ${Math.max(booking.adults - 1, 0)} acompanante(s) adulto(s) y ${booking.children} menor(es).`,
    );
  }
}

export const bookingCompanionService = {
  async getCompanionsByBookingId(bookingId: ID): Promise<BookingCompanion[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los acompanantes.');
    return requireCollection(bookingCompanionsDB, 'bookingCompanionsDB')
      .filter((item) => item.booking_id === bookingId)
      .map(toBookingCompanion);
  },

  async saveCompanionsForBooking(
    bookingId: ID,
    data: UpsertBookingCompanionDto[],
  ): Promise<BookingCompanion[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible guardar los acompanantes.');

    const companions = data.map(normalizeCompanion);
    assertCompanionFields(companions);
    assertBookingComposition(bookingId, companions);

    const now = new Date().toISOString();
    let nextIdNumber = getLastBookingCompanionNumber() + 1;
    const existingById = new Map(
      bookingCompanionsDB
        .filter((item) => item.booking_id === bookingId)
        .map((item) => [item.id, item] as const),
    );
    const nextCompanions: BookingCompanionDto[] = companions.map((companion) => {
      const existing = companion.id ? existingById.get(companion.id) : undefined;
      const id = existing?.id ?? formatBookingCompanionId(nextIdNumber++);
      return {
        id,
        booking_id: bookingId,
        first_name: companion.first_name,
        last_name: companion.last_name,
        document_type: companion.document_type,
        document_number: companion.document_number,
        guest_type: companion.guest_type,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
    });

    for (let index = bookingCompanionsDB.length - 1; index >= 0; index--) {
      if (bookingCompanionsDB[index].booking_id === bookingId) bookingCompanionsDB.splice(index, 1);
    }
    bookingCompanionsDB.push(...nextCompanions);
    return nextCompanions.map(toBookingCompanion);
  },
};

export default bookingCompanionService;
