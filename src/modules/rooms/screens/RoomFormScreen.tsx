import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ROOM_HOUSEKEEPING_STATUSES, ROOM_STATUSES } from '@/shared/constants/statuses';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Input } from '@/shared/components/Input';
import { LoadingState } from '@/shared/components/LoadingState';
import { Select } from '@/shared/components/Select';
import { roomService } from '@/services/roomService';
import type { Room, RoomHousekeepingStatus, RoomStatus } from '@/shared/types/entities/room';
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

export function RoomFormScreen() {
  const { roomId } = useParams<'roomId'>();
  const isEditing = Boolean(roomId);
  const [screen, setScreen] = useState<ScreenState>({ status: 'loading' });
  const [form, setForm] = useState<FormState>(initialForm);

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
        <form className="room-form" onSubmit={(event) => event.preventDefault()} noValidate>
          <Input
            label="Número de habitación"
            required
            value={form.roomNumber}
            onChange={(event) => updateField('roomNumber', event.target.value)}
          />

          <Select
            label="Tipo de habitación"
            required
            value={form.roomTypeId}
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
            onChange={(event) => updateField('floor', event.target.value)}
          />

          <Select
            label="Estado"
            required
            value={form.status}
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

          <p className="room-form-hint">Guardado disponible en la siguiente etapa.</p>
          <Button type="submit" disabled>
            Guardar
          </Button>
        </form>
      )}
    </section>
  );
}
