import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, UserRound } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { bookingService } from '@/services/bookingService';
import { roomService } from '@/services/roomService';
import { DatePickerRange, type DateRangeValue } from '@/shared/components/DatePickerRange';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { BOOKING_STATUS_TRANSITIONS } from '@/shared/constants/statuses';
import type { Booking } from '@/shared/types/entities/booking';
import type { Rate } from '@/shared/types/entities/rate';
import type { Room } from '@/shared/types/entities/room';
import type { RoomFeature } from '@/shared/types/entities/room-feature';
import type { RoomType } from '@/shared/types/entities/room-type';
import { formatCurrency } from '@/shared/utils/currency';
import { calculateNights, formatDateGT } from '@/shared/utils/date';
import './booking-engine.css';

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';
type ShowcaseStatus = 'loading' | 'success' | 'error';

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

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
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

function findLowestRate(rates: Rate[], roomTypeId: string): Rate | undefined {
  return rates
    .filter((rate) => rate.active && rate.roomTypeId === roomTypeId)
    .sort((left, right) => left.priceCents - right.priceCents)[0];
}

export function SearchScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRange = useMemo<DateRangeValue>(() => {
    const today = new Date();
    return {
      start: parseDateKey(searchParams.get('checkIn')) ?? today,
      end: parseDateKey(searchParams.get('checkOut')) ?? addDays(today, 3),
    };
  }, [searchParams]);

  const [range, setRange] = useState<DateRangeValue>(initialRange);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [showcaseStatus, setShowcaseStatus] = useState<ShowcaseStatus>('loading');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [features, setFeatures] = useState<RoomFeature[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [results, setResults] = useState<AvailableRoomType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showcaseError, setShowcaseError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | undefined>();
  const [hasSearched, setHasSearched] = useState(false);
  const [guests, setGuests] = useState('2 adultos');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const loadShowcase = useCallback(async () => {
    setShowcaseStatus('loading');
    setShowcaseError(null);
    try {
      const [nextRoomTypes, nextRates, nextFeatures] = await Promise.all([
        roomService.getRoomTypes(),
        roomService.getRates(),
        roomService.getRoomFeatures(),
      ]);
      setRoomTypes(nextRoomTypes.filter((roomType) => roomType.active));
      setRates(nextRates);
      setFeatures(nextFeatures);
      setShowcaseStatus('success');
    } catch (cause) {
      setShowcaseError(
        cause instanceof Error ? cause.message : 'No fue posible cargar habitaciones.',
      );
      setShowcaseStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadShowcase();
  }, [loadShowcase]);

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
  const roomCards = hasSearched
    ? results.map(({ roomType, availableRooms }) => ({ roomType, availableRooms }))
    : roomTypes.map((roomType) => ({ roomType, availableRooms: undefined }));
  const featureById = useMemo(
    () => new Map(features.map((feature) => [feature.id, feature.name])),
    [features],
  );

  return (
    <section className="booking-search-page">
      <div className="visitor-hero booking-home-hero">
        <div className="visitor-hero-overlay" />
        <div className="visitor-hero-copy">
          <p className="eyebrow">Hospitalidad que se siente</p>
          <h1>
            Tu proxima estancia <em>comienza aqui.</em>
          </h1>
          <p>
            Descansa, descubre y dejanos cuidar cada detalle. Encuentra el espacio perfecto para tu
            proxima visita a Hotel Aurora.
          </p>
          <div className="hero-stats">
            <div>
              <strong>4.9</strong>
              <small>Valoracion de huespedes</small>
            </div>
            <div>
              <strong>24/7</strong>
              <small>Atencion personalizada</small>
            </div>
            <div>
              <strong>+12</strong>
              <small>Amenidades incluidas</small>
            </div>
          </div>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit-card">
            <span className="booking-orbit-label">Hotel Aurora - Centro</span>
            <h3>
              Un refugio <em>en la ciudad.</em>
            </h3>
            <p>Momentos que se quedan contigo.</p>
            <div className="orbit-line">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>

      <form
        className="search-panel booking-search-panel"
        onSubmit={(event) => {
          event.preventDefault();
          void searchAvailability();
        }}
      >
        <div className="search-title">
          <CalendarDays size={24} aria-hidden="true" />
          <div>
            <strong>Encuentra tu habitacion</strong>
            <span>Consulta disponibilidad y tarifas en segundos</span>
          </div>
        </div>
        <div className="search-fields">
          <div className="booking-search-range">
            <button
              type="button"
              className="booking-search-date-trigger"
              onClick={() => setIsDatePickerOpen((current) => !current)}
              aria-expanded={isDatePickerOpen}
            >
              <span>
                <small>Entrada</small>
                <strong>{range.start ? formatDateGT(range.start) : 'Seleccionar'}</strong>
              </span>
              <span>
                <small>Salida</small>
                <strong>{range.end ? formatDateGT(range.end) : 'Seleccionar'}</strong>
              </span>
            </button>
            {isDatePickerOpen ? (
              <div className="booking-search-range-popover">
                <DatePickerRange
                  value={range}
                  onChange={(nextRange) => {
                    setRange(nextRange);
                    setRangeError(undefined);
                    if (isCompleteStayRange(nextRange)) {
                      setIsDatePickerOpen(false);
                    }
                  }}
                  minDate={new Date()}
                  error={rangeError}
                />
              </div>
            ) : null}
            {rangeError && !isDatePickerOpen ? <p className="field-error">{rangeError}</p> : null}
          </div>
          <label>
            <span>Huespedes</span>
            <select value={guests} onChange={(event) => setGuests(event.target.value)}>
              <option>1 adulto</option>
              <option>2 adultos</option>
              <option>2 adultos - 1 nino</option>
              <option>4 huespedes</option>
            </select>
          </label>
        </div>
        <button
          className="button primary search-button"
          type="submit"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Buscando...' : 'Buscar disponibilidad'}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>

      {status === 'error' ? (
        <div className="booking-public-state">
          <ErrorState description={error ?? 'Intenta nuevamente.'} onRetry={searchAvailability} />
        </div>
      ) : null}

      <div className="visitor-content">
        {hasSearched && status === 'success' ? (
          <div className="search-results-bar">
            <div className="search-results-info">
              <strong>
                {formatDateGT(range.start!)} al {formatDateGT(range.end!)}
              </strong>
              <span className="search-results-nights">
                {nights} {nights === 1 ? 'noche' : 'noches'}
              </span>
              <span className="search-results-guests">
                <UserRound size={14} aria-hidden="true" />
                {guests}
              </span>
            </div>
            <span className="search-results-count">
              {results.length} {results.length === 1 ? 'opcion disponible' : 'opciones disponibles'}
            </span>
          </div>
        ) : null}

        {status === 'loading' ? (
          <div className="booking-public-state booking-search-loading">
            <LoadingState label="Buscando disponibilidad..." />
          </div>
        ) : null}

        <div className="visitor-section-head">
          <div>
            <p className="eyebrow">Elige tu espacio</p>
            <h2>Habitaciones pensadas para ti</h2>
          </div>
        </div>

        {showcaseStatus === 'loading' ? <LoadingState label="Cargando habitaciones..." /> : null}

        {showcaseStatus === 'error' ? (
          <ErrorState description={showcaseError ?? 'Intenta nuevamente.'} onRetry={loadShowcase} />
        ) : null}

        {showcaseStatus === 'success' && hasSearched && results.length === 0 ? (
          <EmptyState
            title="Sin disponibilidad"
            description="No encontramos tipos de habitacion disponibles para esas fechas."
          />
        ) : null}

        {showcaseStatus === 'success' && roomCards.length > 0 ? (
          <div className="room-cards">
            {roomCards.map(({ roomType, availableRooms }, index) => {
              const rate = findLowestRate(rates, roomType.id);
              const detailUrl = isCompleteStayRange(range)
                ? `/rooms/${roomType.id}?checkIn=${dateKey(range.start)}&checkOut=${dateKey(range.end)}`
                : `/rooms/${roomType.id}`;
              const featureNames = roomType.roomFeatureIds
                .map((featureId) => featureById.get(featureId))
                .filter((featureName): featureName is string => Boolean(featureName))
                .slice(0, 2);
              const cardFeatures =
                featureNames.length > 0 ? featureNames : [roomType.bedConfiguration];

              return (
                <article className="visitor-room" key={roomType.id}>
                  <div
                    className={`room-visual booking-room-visual booking-room-visual-${index % 3}`}
                  >
                    <span className="room-tag">
                      {availableRooms !== undefined
                        ? `${availableRooms} disponibles`
                        : index === 0
                          ? 'Mejor precio'
                          : index === 1
                            ? 'Mas reservada'
                            : 'Experiencia premium'}
                    </span>
                  </div>
                  <div className="room-card-body">
                    <div>
                      <h3>{roomType.name}</h3>
                      <p>
                        {roomType.bedConfiguration} - {roomType.capacity} huespedes
                      </p>
                    </div>
                    <div className="room-price">
                      <small>Desde</small>
                      <strong>
                        {rate ? formatCurrency(rate.priceCents, rate.currency) : 'Consultar'}
                      </strong>
                      <span>por noche</span>
                    </div>
                  </div>
                  <div className="room-features-list">
                    {cardFeatures.map((featureName) => (
                      <span key={featureName}>
                        <Check size={12} aria-hidden="true" />
                        {featureName}
                      </span>
                    ))}
                  </div>
                  <div className="room-card-footer">
                    <span className="booking-room-code">{roomType.code}</span>
                    <Link className="text-button" to={detailUrl}>
                      Ver detalle
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
