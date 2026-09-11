import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bookingService } from '@/services/bookingService';
import { roomService } from '@/services/roomService';
import { Button } from '@/shared/components/Button';
import { DatePickerRange, type DateRangeValue } from '@/shared/components/DatePickerRange';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Input } from '@/shared/components/Input';
import { LoadingState } from '@/shared/components/LoadingState';
import { Select } from '@/shared/components/Select';
import type { CreateBookingDto } from '@/shared/types/entities/booking';
import type { Rate } from '@/shared/types/entities/rate';
import type { RoomType } from '@/shared/types/entities/room-type';
import { toDtoCalendarDate } from '@/shared/types/common';
import { formatCurrency } from '@/shared/utils/currency';
import { calculateNights, formatDateGT } from '@/shared/utils/date';
import './booking-engine.css';

type FormStatus = 'loading' | 'success' | 'error';

type FormErrors = Partial<
  Record<'guestId' | 'roomTypeId' | 'dates' | 'adults' | 'children', string>
>;

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

function isValidStay(range: DateRangeValue): range is { start: Date; end: Date } {
  if (!range.start || !range.end) return false;
  try {
    return calculateNights(range.start, range.end) > 0;
  } catch {
    return false;
  }
}

function findRateForStay(
  rates: Rate[],
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
): Rate | undefined {
  const nights = calculateNights(checkIn, checkOut);

  return rates
    .filter(
      (rate) =>
        rate.active &&
        rate.roomTypeId === roomTypeId &&
        dateKey(rate.validFrom) <= dateKey(checkIn) &&
        dateKey(rate.validTo) >= dateKey(checkOut) &&
        rate.minimumNights <= nights,
    )
    .sort((left, right) => dateKey(right.validFrom).localeCompare(dateKey(left.validFrom)))[0];
}

export function BookingFormScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRoomTypeId = searchParams.get('roomTypeId') ?? '';
  const initialRange = useMemo<DateRangeValue>(
    () => ({
      start: parseDateKey(searchParams.get('checkIn')),
      end: parseDateKey(searchParams.get('checkOut')),
    }),
    [searchParams],
  );

  const [status, setStatus] = useState<FormStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [roomTypeId, setRoomTypeId] = useState(initialRoomTypeId);
  const [range, setRange] = useState<DateRangeValue>(initialRange);
  const [guestId, setGuestId] = useState('');
  const [adults, setAdults] = useState('1');
  const [children, setChildren] = useState('0');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadFormData = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);

    try {
      const [nextRoomTypes, nextRates] = await Promise.all([
        roomService.getRoomTypes(),
        roomService.getRates(),
      ]);
      const activeRoomTypes = nextRoomTypes.filter((roomType) => roomType.active);

      setRoomTypes(activeRoomTypes);
      setRates(nextRates);
      setRoomTypeId((current) => current || activeRoomTypes[0]?.id || '');
      setStatus('success');
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'No fue posible cargar el formulario.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  const selectedRoomType = roomTypes.find((roomType) => roomType.id === roomTypeId);
  const selectedRate =
    selectedRoomType && isValidStay(range)
      ? findRateForStay(rates, selectedRoomType.id, range.start, range.end)
      : undefined;
  const nights = isValidStay(range) ? calculateNights(range.start, range.end) : 0;
  const totalAmount =
    selectedRate && isValidStay(range) ? selectedRate.priceCents * nights : undefined;

  function validateForm(): boolean {
    const nextErrors: FormErrors = {};
    const adultsNumber = Number(adults);
    const childrenNumber = Number(children);

    if (!guestId.trim()) nextErrors.guestId = 'Ingresa el ID del huesped.';
    if (!selectedRoomType) nextErrors.roomTypeId = 'Selecciona un tipo de habitacion valido.';
    if (!isValidStay(range)) nextErrors.dates = 'Selecciona una salida posterior a la entrada.';
    if (!Number.isInteger(adultsNumber) || adultsNumber < 1) {
      nextErrors.adults = 'Debe viajar al menos un adulto.';
    }
    if (!Number.isInteger(childrenNumber) || childrenNumber < 0) {
      nextErrors.children = 'Ingresa cero o mas ninos.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!validateForm() || !isValidStay(range)) return;

    setSubmitting(true);
    try {
      const data: CreateBookingDto = {
        guest_id: guestId.trim(),
        room_type_id: roomTypeId,
        rate_id: selectedRate?.id,
        check_in: toDtoCalendarDate(range.start),
        check_out: toDtoCalendarDate(range.end),
        adults: Number(adults),
        children: Number(children),
        notes: notes.trim() || undefined,
      };
      const booking = await bookingService.createBooking(data);
      navigate(`/booking/${booking.id}/done`);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'No fue posible crear la reserva.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <section className="content booking-form-page">
        <LoadingState label="Cargando formulario de reserva..." />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="content booking-form-page">
        <ErrorState description={loadError ?? 'Intenta nuevamente.'} onRetry={loadFormData} />
      </section>
    );
  }

  if (roomTypes.length === 0) {
    return (
      <section className="content booking-form-page">
        <EmptyState
          title="Sin habitaciones para reservar"
          description="No hay tipos de habitacion activos en este momento."
        />
      </section>
    );
  }

  return (
    <section className="content booking-form-page">
      <div className="booking-form-heading">
        <div>
          <p className="eyebrow">Nueva reserva</p>
          <h1>Reservar</h1>
          <p>Completa los datos requeridos para asegurar la estadia.</p>
        </div>
      </div>

      <div className="booking-form-layout">
        <form className="booking-form-card" onSubmit={handleSubmit}>
          {submitError ? <p className="field-error">{submitError}</p> : null}

          <div className="booking-form-grid">
            <Input
              label="ID del huesped"
              value={guestId}
              onChange={(event) => {
                setGuestId(event.target.value);
                setErrors((current) => ({ ...current, guestId: undefined }));
              }}
              error={errors.guestId}
              helpText="Ejemplo con datos mock: GST-001."
              required
            />

            <Select
              label="Tipo de habitacion"
              value={roomTypeId}
              onChange={(event) => {
                setRoomTypeId(event.target.value);
                setErrors((current) => ({ ...current, roomTypeId: undefined }));
              }}
              error={errors.roomTypeId}
              required
            >
              {roomTypes.map((roomType) => (
                <option key={roomType.id} value={roomType.id}>
                  {roomType.name}
                </option>
              ))}
            </Select>

            <div className="booking-form-full">
              <DatePickerRange
                label="Fechas de estadia"
                value={range}
                onChange={(nextRange) => {
                  setRange(nextRange);
                  setErrors((current) => ({ ...current, dates: undefined }));
                }}
                minDate={new Date()}
                error={errors.dates}
              />
            </div>

            <Input
              label="Adultos"
              type="number"
              min="1"
              value={adults}
              onChange={(event) => {
                setAdults(event.target.value);
                setErrors((current) => ({ ...current, adults: undefined }));
              }}
              error={errors.adults}
              required
            />

            <Input
              label="Ninos"
              type="number"
              min="0"
              value={children}
              onChange={(event) => {
                setChildren(event.target.value);
                setErrors((current) => ({ ...current, children: undefined }));
              }}
              error={errors.children}
              required
            />

            <div className="field booking-form-full">
              <label className="field-label" htmlFor="booking-notes">
                Notas
              </label>
              <textarea
                id="booking-notes"
                className="booking-form-textarea"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>

          <div className="booking-form-actions">
            <Button type="submit" loading={submitting}>
              Crear reserva
            </Button>
          </div>
        </form>

        <aside className="booking-form-summary">
          <h2>Resumen</h2>
          <div className="booking-rate-summary">
            <div>
              <span>Habitacion</span>
              <strong>{selectedRoomType?.name ?? 'Por definir'}</strong>
            </div>
            <div>
              <span>Entrada</span>
              <strong>{isValidStay(range) ? formatDateGT(range.start) : 'Por definir'}</strong>
            </div>
            <div>
              <span>Salida</span>
              <strong>{isValidStay(range) ? formatDateGT(range.end) : 'Por definir'}</strong>
            </div>
            <div>
              <span>Noches</span>
              <strong>{isValidStay(range) ? nights : 'Por definir'}</strong>
            </div>
            <div>
              <span>Tarifa</span>
              <strong>
                {selectedRate ? formatCurrency(selectedRate.priceCents) : 'Por definir'}
              </strong>
            </div>
            <div>
              <span>Total estimado</span>
              <strong>
                {totalAmount !== undefined ? formatCurrency(totalAmount) : 'Por definir'}
              </strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
