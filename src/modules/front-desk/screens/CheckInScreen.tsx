import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { bookingService } from '@/services/bookingService';
import { roomService } from '@/services/roomService';
import { Button } from '@/shared/components/Button';
import { LoadingState } from '@/shared/components/LoadingState';
import { Select } from '@/shared/components/Select';
import type { Room } from '@/shared/types/entities/room';

export function CheckInScreen() {
  const { bookingId } = useParams<'bookingId'>();
  const reservationId = bookingId ?? '';
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [assigningRoom, setAssigningRoom] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    roomService
      .getRooms()
      .then((availableRooms) => {
        if (active) setRooms(availableRooms.filter((room) => room.isAssignable));
      })
      .catch((cause: unknown) => {
        if (active) {
          setErrorMessage(
            cause instanceof Error ? cause.message : 'No fue posible cargar las habitaciones.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadingRooms(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function clearFeedback() {
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function handleAssignRoom() {
    if (!reservationId || !selectedRoomId) return;

    setAssigningRoom(true);
    clearFeedback();

    try {
      await bookingService.assignRoom(reservationId, selectedRoomId);
      const room = rooms.find((item) => item.id === selectedRoomId);
      setSuccessMessage(`Habitación ${room?.roomNumber ?? selectedRoomId} asignada correctamente.`);
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'No fue posible asignar la habitación.',
      );
    } finally {
      setAssigningRoom(false);
    }
  }

  async function handleCheckIn() {
    if (!reservationId || !selectedRoomId) return;

    setCheckingIn(true);
    clearFeedback();

    try {
      await bookingService.checkIn(reservationId);
      setSuccessMessage('Check-in completado correctamente.');
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'No fue posible completar el check-in.',
      );
    } finally {
      setCheckingIn(false);
    }
  }

  const isBusy = loadingRooms || assigningRoom || checkingIn;
  const canCompleteCheckIn = Boolean(reservationId && selectedRoomId) && !isBusy;

  return (
    <section className="content" aria-labelledby="check-in-title">
      <div
        className="panel"
        style={{
          backgroundColor: '#FAF7F2',
          borderColor: '#B08D57',
          color: '#2E211A',
        }}
      >
        <p className="eyebrow">Front Desk</p>
        <h1 id="check-in-title">Check-in del huésped</h1>
        <p className="muted">Reserva: {bookingId ?? 'No identificada'}</p>

        {!bookingId && (
          <p className="field-error" role="alert">
            No se encontró el identificador de la reserva.
          </p>
        )}

        <div className="mt-6">
          <Select
            id="check-in-room"
            label="Habitación disponible"
            value={selectedRoomId}
            onChange={(event) => {
              setSelectedRoomId(event.target.value);
              clearFeedback();
            }}
            disabled={isBusy || !reservationId}
            helpText="Selecciona una habitación libre y lista para recibir al huésped."
          >
            <option value="">
              {loadingRooms ? 'Cargando habitaciones...' : 'Selecciona una habitación'}
            </option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                Habitación {room.roomNumber} · Piso {room.floor}
              </option>
            ))}
          </Select>

          {loadingRooms && (
            <LoadingState label="Cargando habitaciones disponibles..." variant="inline" />
          )}
          {!loadingRooms && rooms.length === 0 && (
            <p className="field-error" role="status">
              No hay habitaciones disponibles para asignar.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            loading={assigningRoom}
            disabled={!reservationId || !selectedRoomId || isBusy}
            onClick={handleAssignRoom}
            style={{ borderColor: '#B08D57', color: '#2E211A' }}
          >
            Asignar habitación
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={checkingIn}
            disabled={!canCompleteCheckIn}
            onClick={handleCheckIn}
            style={{ backgroundColor: '#4F7A5B', color: '#FFFFFF' }}
          >
            Completar Check-in
          </Button>
        </div>

        <div aria-live="polite" className="mt-4 min-h-5 text-sm">
          {successMessage && <p style={{ color: '#4F7A5B' }}>{successMessage}</p>}
          {errorMessage && (
            <p className="field-error" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
