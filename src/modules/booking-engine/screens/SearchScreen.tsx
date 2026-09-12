import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bookingService } from '@/services/bookingService';
import { roomService } from '@/services/roomService';
import { Button } from '@/shared/components/Button';
import { DatePickerRange, type DateRangeValue } from '@/shared/components/DatePickerRange';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { BOOKING_STATUS_TRANSITIONS } from '@/shared/constants/statuses';
import type { Booking } from '@/shared/types/entities/booking';
import type { Room } from '@/shared/types/entities/room';
import type { RoomType } from '@/shared/types/entities/room-type';
import { calculateNights, formatDateGT } from '@/shared/utils/date';
import './booking-engine.css';

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

type AvailableRoomType = {
  roomType: RoomType;
  availableRooms: number;
};

function dateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function staysOverlap(
  left: { checkIn: Date; checkOut: Date },
  right: { checkIn: Date; checkOut: Date },
): boolean {
  return (
    dateKey(left.checkIn) < dateKey(right.checkOut) &&
    dateKey(left.checkOut) > dateKey(right.checkIn)
  );
}

function isCompleteStayRange(range: DateRangeValue): range is { start: Date; end: Date } {
  if (!range.start || !range.end) return false;
  try {
    return calculateNights(range.start, range.end) > 0;
  } catch {
    return false;
  }
}

function countAvailableRooms({
  roomTypeId,
  rooms,
  bookings,
  range,
}: {
  roomTypeId: string;
  rooms: Room[];
  bookings: Booking[];
  range: { start: Date; end: Date };
}): number {
  const assignableRooms = rooms.filter(
    (room) => room.roomTypeId === roomTypeId && room.isAssignable,
  );
  const blockingBookings = bookings.filter(
    (booking) =>
      booking.roomTypeId === roomTypeId &&
      BOOKING_STATUS_TRANSITIONS[booking.status].length > 0 &&
      staysOverlap(
        { checkIn: range.start, checkOut: range.end },
        { checkIn: booking.checkIn, checkOut: booking.checkOut },
      ),
  );

  return Math.max(0, assignableRooms.length - blockingBookings.length);
}

function buildAvailableRoomTypes({
  roomTypes,
  rooms,
  bookings,
  range,
}: {
  roomTypes: RoomType[];
  rooms: Room[];
  bookings: Booking[];
  range: { start: Date; end: Date };
}): AvailableRoomType[] {
  return roomTypes
    .filter((roomType) => roomType.active)
    .map((roomType) => ({
      roomType,
      availableRooms: countAvailableRooms({
        roomTypeId: roomType.id,
        rooms,
        bookings,
        range,
      }),
    }))
    .filter((result) => result.availableRooms > 0);
}

export function SearchScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRange = useMemo<DateRangeValue>(
    () => ({
      start: parseDateKey(searchParams.get('checkIn')),
      end: parseDateKey(searchParams.get('checkOut')),
    }),
    [searchParams],
  );

  const [range, setRange] = useState<DateRangeValue>(initialRange);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<AvailableRoomType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | undefined>();
  const [hasSearched, setHasSearched] = useState(false);

  const searchAvailability = useCallback(async () => {
    if (!isCompleteStayRange(range)) {
      setRangeError('Selecciona una fecha de entrada y una salida posterior.');
      return;
    }

    setRangeError(undefined);
    setError(null);
    setStatus('loading');
    setHasSearched(true);

    try {
      const [roomTypes, rooms, bookings] = await Promise.all([
        roomService.getRoomTypes(),
        roomService.getRooms(),
        bookingService.getBookings(),
      ]);

      const availableRoomTypes = buildAvailableRoomTypes({
        roomTypes,
        rooms,
        bookings,
        range,
      });

      setResults(availableRoomTypes);
      setSearchParams({ checkIn: dateKey(range.start), checkOut: dateKey(range.end) });
      setStatus('success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible buscar disponibilidad.');
      setStatus('error');
    }
  }, [range, setSearchParams]);

  const nights = isCompleteStayRange(range) ? calculateNights(range.start, range.end) : 0;

  return (
    <section className="content booking-search-page">
      <div className="booking-search-heading">
        <div>
          <p className="eyebrow">Motor de reservas</p>
          <h1>Buscar disponibilidad</h1>
          <p>Elige fechas de entrada y salida para encontrar tipos de habitacion disponibles.</p>
        </div>
      </div>

      <div className="booking-search-layout">
        <form
          className="booking-search-card"
          onSubmit={(event) => {
            event.preventDefault();
            void searchAvailability();
          }}
        >
          <DatePickerRange
            label="Fechas de estadia"
            value={range}
            onChange={(nextRange) => {
              setRange(nextRange);
              setRangeError(undefined);
            }}
            minDate={new Date()}
            error={rangeError}
          />

          <Button type="submit" loading={status === 'loading'}>
            Buscar habitaciones
          </Button>
        </form>

        <div className="booking-search-results">
          {status === 'loading' ? <LoadingState label="Buscando disponibilidad..." /> : null}

          {status === 'error' ? (
            <ErrorState description={error ?? 'Intenta nuevamente.'} onRetry={searchAvailability} />
          ) : null}

          {status !== 'loading' && status !== 'error' && !hasSearched ? (
            <EmptyState
              title="Selecciona tus fechas"
              description="Los resultados apareceran aqui despues de buscar."
            />
          ) : null}

          {status === 'success' && results.length === 0 ? (
            <EmptyState
              title="Sin disponibilidad"
              description="No encontramos tipos de habitacion disponibles para esas fechas."
            />
          ) : null}

          {status === 'success' && results.length > 0 ? (
            <>
              <p className="booking-search-summary">
                {formatDateGT(range.start!)} al {formatDateGT(range.end!)} - {nights}{' '}
                {nights === 1 ? 'noche' : 'noches'}
              </p>

              <div className="booking-roomtype-list">
                {results.map(({ roomType, availableRooms }) => (
                  <article className="booking-roomtype-card" key={roomType.id}>
                    <div>
                      <h2>{roomType.name}</h2>
                      <p>{roomType.description}</p>
                      <div className="booking-roomtype-meta">
                        <span>{roomType.capacity} huespedes</span>
                        <span>{roomType.bedConfiguration}</span>
                        <span>{availableRooms} disponibles</span>
                      </div>
                    </div>
                    <Link
                      className="ui-action"
                      to={`/rooms/${roomType.id}?checkIn=${dateKey(range.start!)}&checkOut=${dateKey(
                        range.end!,
                      )}`}
                    >
                      Ver detalle
                    </Link>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
