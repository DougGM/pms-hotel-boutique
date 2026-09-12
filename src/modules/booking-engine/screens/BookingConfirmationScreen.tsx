import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bookingService } from '@/services/bookingService';
import { roomService } from '@/services/roomService';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import type { Booking } from '@/shared/types/entities/booking';
import type { Rate } from '@/shared/types/entities/rate';
import type { RoomType } from '@/shared/types/entities/room-type';
import { formatCurrency } from '@/shared/utils/currency';
import { calculateNights, formatDateGT } from '@/shared/utils/date';
import './booking-engine.css';

type ConfirmationStatus = 'loading' | 'success' | 'error';

type ConfirmationState = {
  booking?: Booking;
  roomType?: RoomType;
  rate?: Rate;
};

function dateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function findRateForBooking(rates: Rate[], booking: Booking): Rate | undefined {
  if (booking.rateId) {
    const rateById = rates.find((rate) => rate.id === booking.rateId);
    if (rateById) return rateById;
  }

  return rates
    .filter(
      (rate) =>
        rate.active &&
        rate.roomTypeId === booking.roomTypeId &&
        dateKey(rate.validFrom) <= dateKey(booking.checkIn) &&
        dateKey(rate.validTo) >= dateKey(booking.checkOut),
    )
    .sort((left, right) => dateKey(right.validFrom).localeCompare(dateKey(left.validFrom)))[0];
}

export function BookingConfirmationScreen() {
  const { bookingId } = useParams<'bookingId'>();
  const [status, setStatus] = useState<ConfirmationStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>({});

  const loadConfirmation = useCallback(async () => {
    if (!bookingId) return;

    setStatus('loading');
    setError(null);

    try {
      const [booking, roomTypes, rates] = await Promise.all([
        bookingService.getBookingById(bookingId),
        roomService.getRoomTypes(),
        roomService.getRates(),
      ]);
      const roomType = booking
        ? roomTypes.find((item) => item.id === booking.roomTypeId)
        : undefined;
      const rate = booking ? findRateForBooking(rates, booking) : undefined;

      setConfirmation({ booking, roomType, rate });
      setStatus('success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar la reserva.');
      setStatus('error');
    }
  }, [bookingId]);

  useEffect(() => {
    void loadConfirmation();
  }, [loadConfirmation]);

  if (status === 'loading') {
    return (
      <section className="content booking-confirmation-page">
        <LoadingState label="Cargando confirmacion de reserva..." />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="content booking-confirmation-page">
        <ErrorState description={error ?? 'Intenta nuevamente.'} onRetry={loadConfirmation} />
      </section>
    );
  }

  if (!confirmation.booking) {
    return (
      <section className="content booking-confirmation-page">
        <EmptyState
          title="Reserva no encontrada"
          description="No encontramos una reserva con ese identificador."
          action={
            <Link className="ui-action" to="/">
              Buscar disponibilidad
            </Link>
          }
        />
      </section>
    );
  }

  const { booking } = confirmation;
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const computedAmount = confirmation.rate ? confirmation.rate.priceCents * nights : 0;
  const amountToShow = booking.totalAmountCents > 0 ? booking.totalAmountCents : computedAmount;

  return (
    <section className="content booking-confirmation-page">
      <div className="booking-confirmation-heading">
        <div>
          <p className="eyebrow">Reserva registrada</p>
          <h1>Reserva confirmada</h1>
          <p>Tu reservacion quedo registrada correctamente.</p>
        </div>
        <Link className="ui-action" to="/">
          Nueva busqueda
        </Link>
      </div>

      <div className="booking-confirmation-layout">
        <article className="booking-confirmation-card">
          <h2>Codigo de confirmacion</h2>
          <div className="booking-confirmation-code">{booking.confirmationCode}</div>
          <p className="booking-muted">
            Conserva este codigo para consultar tu reserva en recepcion.
          </p>

          <div className="booking-rate-summary">
            <div>
              <span>Entrada</span>
              <strong>{formatDateGT(booking.checkIn)}</strong>
            </div>
            <div>
              <span>Salida</span>
              <strong>{formatDateGT(booking.checkOut)}</strong>
            </div>
            <div>
              <span>Noches</span>
              <strong>{nights}</strong>
            </div>
            <div>
              <span>Habitacion</span>
              <strong>{confirmation.roomType?.name ?? booking.roomTypeId}</strong>
            </div>
            <div>
              <span>Huesped</span>
              <strong>{booking.guestId}</strong>
            </div>
            <div>
              <span>Monto</span>
              <strong>{formatCurrency(amountToShow, booking.currency)}</strong>
            </div>
          </div>
        </article>

        <aside className="booking-confirmation-card">
          <h2>Siguiente paso</h2>
          <p className="booking-muted">
            Esta ronda confirma la reserva en pantalla. El envio por correo queda fuera de alcance.
          </p>
          <div className="booking-form-actions">
            <Link className="ui-action" to={`/rooms/${booking.roomTypeId}`}>
              Ver habitacion
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
