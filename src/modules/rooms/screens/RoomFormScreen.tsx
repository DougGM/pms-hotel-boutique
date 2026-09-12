import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { routePaths } from '@/app/routes';
import { ROOM_HOUSEKEEPING_STATUSES, ROOM_STATUSES } from '@/shared/constants/statuses';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Input } from '@/shared/components/Input';
import { LoadingState } from '@/shared/components/LoadingState';
import { Select } from '@/shared/components/Select';
import { roomService } from '@/services/roomService';
import type {
  CreateRoomDto,
  Room,
  RoomHousekeepingStatus,
  RoomStatus,
} from '@/shared/types/entities/room';
import type { RoomType } from '@/shared/types/entities/room-type';
import './rooms.css';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; roomTypes: RoomType[]; room?: Room };

type FormState = {
  roomNumber: string;
  roomTypeId: string;
  floor: string;
  status: RoomStatus;
  housekeepingStatus: RoomHousekeepingStatus;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  roomNumber: '',
  roomTypeId: '',
  floor: '',
  status: 'available',
  housekeepingStatus: 'dirty',
  notes: '',
};

function getErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Error inesperado.';
}

function toRoomStatusDto(status: RoomStatus): CreateRoomDto['status'] {
  return status === 'outOfService' ? 'out_of_service' : status;
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.roomNumber.trim()) errors.roomNumber = 'Ingresa el número de habitación.';
  if (!form.roomTypeId) errors.roomTypeId = 'Selecciona un tipo de habitación.';
  if (form.floor.trim() === '' || !Number.isInteger(Number(form.floor))) {
    errors.floor = 'Ingresa un piso válido.';
  }
  if (!ROOM_STATUSES.includes(form.status)) errors.status = 'Selecciona un estado válido.';
  if (!ROOM_HOUSEKEEPING_STATUSES.includes(form.housekeepingStatus)) {
    errors.housekeepingStatus = 'Selecciona un estado de limpieza válido.';
  }
  return errors;
}

export function RoomFormScreen() {
  const { roomId } = useParams<'roomId'>();
  const navigate = useNavigate();
  const isEditing = Boolean(roomId);
  const [screen, setScreen] = useState<ScreenState>({ status: 'loading' });
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadFormData = useCallback(async () => {
    setScreen({ status: 'loading' });
    try {
      const [roomTypes, room] = await Promise.all([
        roomService.getRoomTypes(),
        roomId ? roomService.getRoomById(roomId) : Promise.resolve(undefined),
      ]);
      if (roomId && !room) {
        throw new Error(`No existe la habitación ${roomId}.`);
      }
      setScreen({
        status: 'ready',
        roomTypes: roomTypes.filter((roomType) => roomType.active),
        room,
      });
    } catch (cause) {
      setScreen({ status: 'error', message: getErrorMessage(cause) });
    }
  }, [roomId]);

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  useEffect(() => {
    if (screen.status !== 'ready') return;
    if (screen.room) {
      const room = screen.room;
      setForm({
        roomNumber: room.roomNumber,
        roomTypeId: room.roomTypeId,
        floor: String(room.floor),
        status: room.status,
        housekeepingStatus: room.housekeepingStatus,
        notes: room.notes ?? '',
      });
    } else {
      setForm((current) => ({
        ...current,
        roomTypeId: current.roomTypeId || screen.roomTypes[0]?.id || '',
      }));
    }
  }, [screen]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateRoomDto = {
        room_number: form.roomNumber.trim(),
        room_type_id: form.roomTypeId,
        floor: Number(form.floor),
        status: toRoomStatusDto(form.status),
        housekeeping_status: form.housekeepingStatus,
        notes: form.notes.trim() || undefined,
      };

      if (roomId) {
        await roomService.updateRoom(roomId, payload);
      } else {
        await roomService.createRoom(payload);
      }

      navigate(routePaths.pms.rooms);
    } catch (cause) {
      setSubmitError(getErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="content">
      <h1>{isEditing ? 'Editar habitación' : 'Nueva habitación'}</h1>

      {screen.status === 'loading' && <LoadingState label="Cargando formulario..." />}

      {screen.status === 'error' && (
        <ErrorState
          title="No pudimos cargar el formulario"
          description={screen.message}
          onRetry={loadFormData}
        />
      )}

      {screen.status === 'ready' && screen.roomTypes.length === 0 && (
        <EmptyState
          title="Sin tipos de habitación"
          description="Debe existir al menos un tipo de habitación activo para continuar."
        />
      )}

      {screen.status === 'ready' && screen.roomTypes.length > 0 && (
        <form className="room-form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Número de habitación"
            required
            value={form.roomNumber}
            error={errors.roomNumber}
            onChange={(event) => updateField('roomNumber', event.target.value)}
          />

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
                {roomType.name}
              </option>
            ))}
          </Select>

          <Input
            label="Piso"
            type="number"
            required
            value={form.floor}
            error={errors.floor}
            onChange={(event) => updateField('floor', event.target.value)}
          />

          <Select
            label="Estado"
            required
            value={form.status}
            error={errors.status}
            onChange={(event) => updateField('status', event.target.value as RoomStatus)}
          >
            {ROOM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>

          <Select
            label="Limpieza"
            required
            value={form.housekeepingStatus}
            error={errors.housekeepingStatus}
            onChange={(event) =>
              updateField('housekeepingStatus', event.target.value as RoomHousekeepingStatus)
            }
          >
            {ROOM_HOUSEKEEPING_STATUSES.map((housekeepingStatus) => (
              <option key={housekeepingStatus} value={housekeepingStatus}>
                {housekeepingStatus}
              </option>
            ))}
          </Select>

          <Input
            label="Notas"
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
          />

          {submitError && <p className="room-form-error">{submitError}</p>}

          <Button type="submit" loading={submitting}>
            Guardar
          </Button>
        </form>
      )}
    </section>
  );
}
