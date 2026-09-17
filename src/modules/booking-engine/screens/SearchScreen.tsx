import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Car,
  Check,
  Coffee,
  Dumbbell,
  Percent,
  ShieldCheck,
  Sparkles,
  UserRound,
  Utensils,
  Waves,
  Wifi,
} from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { bookingService } from '@/services/bookingService';
import { roomService } from '@/services/roomService';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { BOOKING_STATUS_TRANSITIONS } from '@/shared/constants/statuses';
import type { Booking } from '@/shared/types/entities/booking';
import type { Rate } from '@/shared/types/entities/rate';
import type { Room } from '@/shared/types/entities/room';
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

const roomImages = [
  'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

const amenities = [
  { title: 'Piscina climatizada', detail: 'Terraza tranquila, camastros y servicio de bebidas.', icon: Waves, image: 'https://images.pexels.com/photos/261327/pexels-photo-261327.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { title: 'Desayuno Aurora', detail: 'Café de especialidad, panadería fresca y opciones locales.', icon: Coffee, image: 'https://images.pexels.com/photos/1833349/pexels-photo-1833349.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { title: 'Restaurante & bar', detail: 'Cocina de temporada para cerrar el día sin salir del hotel.', icon: Utensils, image: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { title: 'Wellness room', detail: 'Gimnasio, spa bajo reserva y amenidades para descansar.', icon: Dumbbell, image: 'https://images.pexels.com/photos/3757957/pexels-photo-3757957.jpeg?auto=compress&cs=tinysrgb&w=900' },
];

const promotions = [
  { name: 'Estancia extendida', code: 'AURORA15', value: '15%', detail: 'Ahorra en reservas de 4 noches o más.', image: 'https://images.pexels.com/photos/754628/pexels-photo-754628.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { name: 'Escapada romántica', code: 'ROMANCE', value: '10%', detail: 'Cena para dos y botella de vino incluida.', image: 'https://images.pexels.com/photos/1707828/pexels-photo-1707828.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { name: 'Fin de semana', code: 'WEEKEND10', value: '10%', detail: 'Tarifa especial de viernes a domingo.', image: 'https://images.pexels.com/photos/3754595/pexels-photo-3754595.jpeg?auto=compress&cs=tinysrgb&w=900' },
];

const policies = [
  { title: 'Cancelación flexible', detail: 'Sin cargo hasta 48 horas antes de la llegada en tarifa flexible.' },
  { title: 'Check-in y check-out', detail: 'Entrada desde las 15:00 y salida hasta las 12:00. Early check-in sujeto a disponibilidad.' },
  { title: 'Pago seguro', detail: 'Puedes reservar con tarjeta y completar cargos adicionales durante la estancia.' },
];

const experienceImages = [
  'https://images.pexels.com/photos/9119625/pexels-photo-9119625.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/14036253/pexels-photo-14036253.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/7222168/pexels-photo-7222168.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/24433378/pexels-photo-24433378.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/3011575/pexels-photo-3011575.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/6466301/pexels-photo-6466301.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

type DateRangeValue = {
  start: Date | null;
  end: Date | null;
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
  const location = useLocation();
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
  const [rates, setRates] = useState<Rate[]>([]);
  const [results, setResults] = useState<AvailableRoomType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showcaseError, setShowcaseError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | undefined>();
  const [hasSearched, setHasSearched] = useState(false);
  const [guests, setGuests] = useState('2 adultos');

  const scrollToSearch = useCallback(() => {
    document.getElementById('buscar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const loadShowcase = useCallback(async () => {
    setShowcaseStatus('loading');
    setShowcaseError(null);
    try {
      const [nextRoomTypes, nextRates] = await Promise.all([
        roomService.getRoomTypes(),
        roomService.getRates(),
      ]);
      setRoomTypes(nextRoomTypes.filter((roomType) => roomType.active));
      setRates(nextRates);
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
  const publicTab = ['amenidades', 'promociones', 'politicas'].includes(location.hash.replace('#', ''))
    ? location.hash.replace('#', '')
    : 'habitaciones';

  return (
    <section className="booking-search-page">
      <div className="visitor-hero booking-home-hero">
        <div className="visitor-hero-overlay" />
        <div className="visitor-hero-copy">
          <p className="eyebrow">Hospitalidad que se siente</p>
          <h1>
            Tu próxima estancia <em>comienza aquí.</em>
          </h1>
          <p>
            Descansa, descubre y déjanos cuidar cada detalle. Encuentra el espacio perfecto para tu
            próxima visita a Hotel Aurora.
          </p>
          <div className="hero-stats">
            <div>
              <strong>4.9</strong>
              <small>Valoración de huéspedes</small>
            </div>
            <div>
              <strong>24/7</strong>
              <small>Atención personalizada</small>
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
        id="buscar"
        className="search-panel booking-search-panel"
        onSubmit={(event) => {
          event.preventDefault();
          void searchAvailability();
        }}
      >
        <div className="search-title">
          <CalendarDays size={24} aria-hidden="true" />
          <div>
            <strong>Encuentra tu habitación</strong>
            <span>Consulta disponibilidad y tarifas en segundos</span>
          </div>
        </div>
        <div className="search-fields">
          <label>
            <span>Entrada</span>
            <input
              type="date"
              value={range.start ? dateKey(range.start) : ''}
              min={dateKey(new Date())}
              onChange={(event) => {
                setRange((current) => ({ ...current, start: parseDateKey(event.target.value) }));
                setRangeError(undefined);
              }}
            />
          </label>
          <label>
            <span>Salida</span>
            <input
              type="date"
              value={range.end ? dateKey(range.end) : ''}
              min={range.start ? dateKey(addDays(range.start, 1)) : dateKey(new Date())}
              onChange={(event) => {
                setRange((current) => ({ ...current, end: parseDateKey(event.target.value) }));
                setRangeError(undefined);
              }}
            />
          </label>
          <label>
            <span>Huéspedes</span>
            <select value={guests} onChange={(event) => setGuests(event.target.value)}>
              <option>1 adulto</option>
              <option>2 adultos</option>
              <option>2 adultos - 1 niño</option>
              <option>4 huéspedes</option>
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

      {rangeError ? <p className="search-error">{rangeError}</p> : null}
      {status === 'error' ? (
        <div className="booking-public-state">
          <ErrorState description={error ?? 'Intenta nuevamente.'} onRetry={searchAvailability} />
        </div>
      ) : null}

      <div className="visitor-content">
        {publicTab === 'habitaciones' ? (
          <>
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
              {results.length} {results.length === 1 ? 'opción disponible' : 'opciones disponibles'}
            </span>
          </div>
        ) : null}

        <div className="visitor-section-head" id="habitaciones">
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
            description="No encontramos tipos de habitación disponibles para esas fechas."
          />
        ) : null}

        {showcaseStatus === 'success' && roomCards.length > 0 ? (
          <div className="room-cards">
            {roomCards.map(({ roomType, availableRooms }, index) => {
              const rate = findLowestRate(rates, roomType.id);
              const detailUrl = isCompleteStayRange(range)
                ? `/rooms/${roomType.id}?checkIn=${dateKey(range.start)}&checkOut=${dateKey(range.end)}`
                : `/rooms/${roomType.id}`;

              return (
                <article className="visitor-room" key={roomType.id}>
                  <div
                    className={`room-visual booking-room-visual booking-room-visual-${index % 3}`}
                    style={{ backgroundImage: `linear-gradient(180deg, rgba(46, 33, 26, 0.08) 0%, transparent 42%, rgba(46, 33, 26, 0.35) 100%), url(${roomImages[index % roomImages.length]})` }}
                  >
                    <span className="room-tag">
                      {availableRooms !== undefined
                        ? `${availableRooms} disponibles`
                        : index === 0
                          ? 'Mejor precio'
                          : index === 1
                            ? 'Más reservada'
                            : 'Experiencia premium'}
                    </span>
                  </div>
                  <div className="room-card-body">
                    <div>
                      <h3>{roomType.name}</h3>
                      <p>
                        {roomType.bedConfiguration} - {roomType.capacity} huéspedes
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
                    <span>
                      <Check size={12} aria-hidden="true" />
                      {roomType.bedConfiguration}
                    </span>
                    <span>
                      <Check size={12} aria-hidden="true" />
                      Wi-Fi gratis
                    </span>
                    <span>
                      <Check size={12} aria-hidden="true" />
                      Desayuno incluido
                    </span>
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
          </>
        ) : null}

        {publicTab === 'amenidades' ? (
        <section className="booking-public-section" id="amenidades">
          <div className="visitor-section-head">
            <div>
              <p className="eyebrow">Amenidades incluidas</p>
              <h2>Todo listo para disfrutar tu estancia</h2>
            </div>
            <button className="text-button" type="button" onClick={scrollToSearch}>
              Buscar fechas <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="booking-amenity-grid">
            {amenities.map((amenity) => {
              const Icon = amenity.icon;
              return (
                <article className="booking-amenity-card" key={amenity.title}>
                  <div className="booking-amenity-image" style={{ backgroundImage: `url(${amenity.image})` }}>
                    <span><Icon size={18} aria-hidden="true" /></span>
                  </div>
                  <div>
                    <h3>{amenity.title}</h3>
                    <p>{amenity.detail}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="booking-service-strip">
            <span><Wifi size={16} aria-hidden="true" /> Wi-Fi de alta velocidad</span>
            <span><Car size={16} aria-hidden="true" /> Traslado bajo reserva</span>
            <span><Sparkles size={16} aria-hidden="true" /> Servicio a la habitación</span>
          </div>
        </section>
        ) : null}

        {publicTab === 'promociones' ? (
        <section className="booking-public-section" id="promociones">
          <div className="visitor-section-head">
            <div>
              <p className="eyebrow">Ofertas vigentes</p>
              <h2>Promociones para reservar mejor</h2>
            </div>
          </div>
          <div className="booking-promo-grid">
            {promotions.map((promo) => (
              <article className="booking-promo-card" key={promo.code}>
                <div className="booking-promo-image" style={{ backgroundImage: `url(${promo.image})` }}>
                  <span><Percent size={15} aria-hidden="true" /> {promo.code}</span>
                </div>
                <div className="booking-promo-body">
                  <small>{promo.value} de beneficio</small>
                  <h3>{promo.name}</h3>
                  <p>{promo.detail}</p>
                  <button className="button small secondary" type="button" onClick={scrollToSearch}>
                    Usar promoción <ArrowRight size={13} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        ) : null}

        {publicTab === 'politicas' ? (
        <section className="booking-public-section booking-policy-section" id="politicas">
          <div>
            <p className="eyebrow">Políticas claras</p>
            <h2>Reserva con tranquilidad</h2>
            <p>Antes de confirmar, revisa las condiciones principales de Hotel Aurora.</p>
          </div>
          <div className="booking-policy-list">
            {policies.map((policy) => (
              <article key={policy.title}>
                <ShieldCheck size={18} aria-hidden="true" />
                <div>
                  <h3>{policy.title}</h3>
                  <p>{policy.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        ) : null}
      </div>

      <section className="visitor-experience booking-experience">
        <div className="visitor-section-head center">
          <div>
            <p className="eyebrow">Vive Aurora</p>
            <h2>
              Una experiencia
              <br />
              <em>en cada rincón.</em>
            </h2>
          </div>
        </div>
        <p className="visitor-section-desc center">
          Desde nuestras instalaciones hasta cada detalle de servicio, todo está diseñado para que tu
          estancia sea inolvidable.
        </p>
        <div className="experience-grid booking-experience-grid">
          {experienceImages.map((image) => (
            <div className="experience-tile booking-experience-tile" key={image} style={{ backgroundImage: `url(${image})` }}>
              <div className="experience-overlay" />
            </div>
          ))}
        </div>
      </section>

      <footer className="visitor-footer">
        <span>© 2024 Aurora Hotel Group</span>
        <span>Privacidad · Términos · Contacto</span>
      </footer>
    </section>
  );
}
