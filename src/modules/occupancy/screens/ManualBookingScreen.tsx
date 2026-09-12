import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Input } from '@/shared/components/Input';
import { LoadingState } from '@/shared/components/LoadingState';
import { Select } from '@/shared/components/Select';
import { bookingService } from '@/services/bookingService';
import { guestService } from '@/services/guestService';
import { roomService } from '@/services/roomService';
import type { Guest } from '@/shared/types/entities/guest';
import type { RoomType } from '@/shared/types/entities/room-type';
import './occupancy.css';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; guests: Guest[]; roomTypes: RoomType[] };

type FormState = {
  guestId: string;
  roomTypeId: string;
  rateId: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  guestId: '',
  roomTypeId: '',
  rateId: '',
  checkIn: '',
  checkOut: '',
  adults: '1',
  children: '0',
  notes: '',
};

function getErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Error inesperado.';
}

function toCalendarTime(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.guestId) errors.guestId = 'Selecciona un huésped.';
  if (!form.roomTypeId) errors.roomTypeId = 'Selecciona un tipo de habitación.';
  if (!form.checkIn) errors.checkIn = 'Ingresa la fecha de entrada.';
  if (!form.checkOut) errors.checkOut = 'Ingresa la fecha de salida.';
  if (
    form.checkIn &&
    form.checkOut &&
    toCalendarTime(form.checkOut) <= toCalendarTime(form.checkIn)
  ) {
    errors.checkOut = 'La salida debe ser posterior a la entrada.';
  }
  if (!Number.isInteger(Number(form.adults)) || Number(form.adults) < 1) {
    errors.adults = 'Ingresa al menos un adulto.';
  }
  if (!Number.isInteger(Number(form.children)) || Number(form.children) < 0) {
    errors.children = 'Ingresa cero o más menores.';
  }
  return errors;
}

export function ManualBookingScreen() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<ScreenState>({ status: 'loading' });
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setScreen({ status: 'loading' });
    try {
      const [guests, roomTypes] = await Promise.all([
        guestService.getGuests(),
        roomService.getRoomTypes(),
      ]);
      setScreen({
        status: 'ready',
        guests,
        roomTypes: roomTypes.filter((roomType) => roomType.active),
      });
    } catch (cause) {
      setScreen({ status: 'error', message: getErrorMessage(cause) });
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasOptions = useMemo(
    () => screen.status === 'ready' && screen.guests.length > 0 && screen.roomTypes.length > 0,
    [screen],
  );

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await bookingService.createBooking({
        guest_id: form.guestId,
        room_type_id: form.roomTypeId,
        rate_id: form.rateId || undefined,
        check_in: form.checkIn,
        check_out: form.checkOut,
        adults: Number(form.adults),
        children: Number(form.children),
        notes: form.notes || undefined,
      });
      navigate('/pms/occupancy');
    } catch (cause) {
      setSubmitError(getErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="content">
      <div className="occupancy-header">
        <div>
          <h1>Nueva reserva manual</h1>
          <p className="occupancy-muted">Registro para reservas tomadas por recepción.</p>
        </div>
      </div>

      {screen.status === 'loading' && <LoadingState label="Cargando formulario..." />}

      {screen.status === 'error' && (
        <ErrorState
          title="No pudimos cargar el formulario"
          description={screen.message}
          onRetry={loadData}
        />
      )}

      {screen.status === 'ready' && !hasOptions && (
        <EmptyState
          title="Faltan datos para crear reservas"
          description="Debe existir al menos un huésped y un tipo de habitación activo."
        />
      )}

      {screen.status === 'ready' && hasOptions && (
        <form className="occupancy-form" onSubmit={handleSubmit} noValidate>
          <Select
            label="Huésped"
            required
            value={form.guestId}
            error={errors.guestId}
            onChange={(event) => updateField('guestId', event.target.value)}
          >
            <option value="">Seleccionar huésped</option>
            {screen.guests.map((guest) => (
              <option key={guest.id} value={guest.id}>
                {guest.firstName} {guest.lastName}
              </option>
            ))}
          </Select>

          <Select
            label="Tipo de habitación"
            required
            value={form.roomTypeId}
            error={errors.roomTypeId}
            onChange={(event) => updateField('roomTypeId', event.target.value)}
          >
            <option value="">Seleccionar tipo</option>
            {screen.roomTypes.map((roomType) => (
              <option key={roomType.id} value={roomType.id}>
                {roomType.name} · {roomType.bedConfiguration}
              </option>
            ))}
          </Select>

          <Input
            label="Tarifa"
            value={form.rateId}
            placeholder="RATE-01"
            helpText="Opcional si recepción todavía no definió tarifa."
            onChange={(event) => updateField('rateId', event.target.value)}
          />

          <Input
            label="Entrada"
            type="date"
            required
            value={form.checkIn}
            error={errors.checkIn}
            onChange={(event) => updateField('checkIn', event.target.value)}
          />

          <Input
            label="Salida"
            type="date"
            required
            value={form.checkOut}
            error={errors.checkOut}
            onChange={(event) => updateField('checkOut', event.target.value)}
          />

          <Input
            label="Adultos"
            type="number"
            min="1"
            required
            value={form.adults}
            error={errors.adults}
            onChange={(event) => updateField('adults', event.target.value)}
          />

          <Input
            label="Menores"
            type="number"
            min="0"
            required
            value={form.children}
            error={errors.children}
            onChange={(event) => updateField('children', event.target.value)}
          />

          <Input
            label="Notas"
            value={form.notes}
            placeholder="Solicitud especial o referencia de recepción"
            onChange={(event) => updateField('notes', event.target.value)}
          />

          {submitError && <p className="occupancy-error">{submitError}</p>}

          <div className="occupancy-actions">
            <Button type="button" variant="secondary" onClick={() => navigate('/pms/occupancy')}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Crear reserva
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
