import { toDomainCalendarDate } from '@/shared/types/common';
import type { Currency, ID } from '@/shared/types/common';
import { httpClient } from './http-client';
import { guestRequest } from './guestHttp';

// Portal del huésped (INT-12). La estancia es una vista del backend (reserva +
// habitación + saldo del folio), no una entidad del contrato compartido.

type GuestStayResponse = {
  bookingId: string;
  guestId: string;
  guestFirstName?: string | null;
  guestLastName?: string | null;
  roomId?: string | null;
  roomNumber?: string | null;
  roomTypeId?: string | null;
  roomTypeName?: string | null;
  checkIn: string;
  checkOut: string;
  status: string;
  balanceCents?: number | null;
  currency: string;
};

export interface GuestStay {
  bookingId: ID;
  guestId: ID;
  guestFirstName: string;
  guestLastName: string;
  roomId?: ID;
  roomNumber?: string;
  roomTypeName?: string;
  /** Fechas civiles: se convierten sin desplazar el día por zona horaria. */
  checkIn: Date;
  checkOut: Date;
  status: string;
  balanceCents: number;
  currency: Currency;
}

function toGuestStay(response: GuestStayResponse): GuestStay {
  if (response.currency !== 'GTQ') {
    throw new Error(`El portal solo admite moneda GTQ; backend devolvio ${response.currency}.`);
  }
  return {
    bookingId: response.bookingId,
    guestId: response.guestId,
    guestFirstName: response.guestFirstName ?? '',
    guestLastName: response.guestLastName ?? '',
    roomId: response.roomId ?? undefined,
    roomNumber: response.roomNumber ?? undefined,
    roomTypeName: response.roomTypeName ?? undefined,
    checkIn: toDomainCalendarDate(response.checkIn),
    checkOut: toDomainCalendarDate(response.checkOut),
    status: response.status,
    balanceCents: response.balanceCents ?? 0,
    currency: 'GTQ',
  };
}

export const guestPortalService = {
  /** Estancia de la reserva asociada al JWT de huésped (`GET /guest/stay`). */
  async getStay(): Promise<GuestStay> {
    const response = await guestRequest(
      () => httpClient.get<GuestStayResponse>('/guest/stay'),
      'No fue posible cargar tu estancia.',
    );
    return toGuestStay(response);
  },
};

export default guestPortalService;
