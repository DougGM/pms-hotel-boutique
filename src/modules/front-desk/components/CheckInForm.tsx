import { useEffect, useState } from 'react';
import { bookingService } from '@/services/bookingService';
import { roomService } from '@/services/roomService';
import type { Room } from '@/shared/types/entities/room';

interface CheckInFormProps {
  reservationId: string;
}

export function CheckInForm({ reservationId }: CheckInFormProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
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

  async function handleAssignRoom() {
    if (!selectedRoom) return;

    setAssigningRoom(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await bookingService.assignRoom(reservationId, selectedRoom);
      const room = rooms.find((item) => item.id === selectedRoom);
      setSuccessMessage(`Habitación ${room?.roomNumber ?? selectedRoom} asignada correctamente.`);
    } catch (cause: unknown) {
      setErrorMessage(
        cause instanceof Error ? cause.message : 'No fue posible asignar la habitación.',
      );
    } finally {
      setAssigningRoom(false);
    }
  }

  async function handleCheckIn() {
    setCheckingIn(true);
    setSuccessMessage(null);
    setErrorMessage(null);

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

  const loading = loadingRooms || assigningRoom || checkingIn;

  return (
    <section
      aria-labelledby="check-in-form-title"
      className="panel rounded-lg border border-[#B08D57] bg-[#FAF7F2] p-6 text-[#2E211A] shadow-sm"
    >
      <div className="mb-6">
        <p className="eyebrow">Front Desk</p>
        <h2 id="check-in-form-title" className="mt-2 text-2xl font-semibold text-[#2E211A]">
          Check-in del huésped
        </h2>
        <p className="mt-2 text-sm text-[#6B5D52]">Reserva: {reservationId}</p>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="room" className="mb-2 block text-sm font-semibold text-[#2E211A]">
            Habitación disponible
          </label>
          <select
            id="room"
            value={selectedRoom}
            onChange={(event) => {
              setSelectedRoom(event.target.value);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            disabled={loadingRooms || assigningRoom || checkingIn}
            className="w-full rounded-lg border border-[#B08D57] bg-white px-4 py-3 text-[#2E211A] outline-none transition focus:ring-2 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {loadingRooms ? 'Cargando habitaciones...' : 'Selecciona una habitación'}
            </option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                Habitación {room.roomNumber} · Piso {room.floor}
              </option>
            ))}
          </select>
          {!loadingRooms && rooms.length === 0 && (
            <p className="mt-2 text-sm text-[#A9483C]">
              No hay habitaciones disponibles para asignar.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleAssignRoom}
            disabled={!selectedRoom || loading}
            className="button secondary rounded-lg border border-[#B08D57] px-5 py-3 text-[#2E211A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {assigningRoom ? 'Asignando...' : 'Asignar Habitación'}
          </button>
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={!selectedRoom || loading}
            className="button rounded-lg bg-[#4F7A5B] px-5 py-3 text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingIn ? 'Completando...' : 'Completar Check-in'}
          </button>
        </div>

        <div aria-live="polite" className="min-h-5 text-sm">
          {successMessage && <p className="font-semibold text-[#4F7A5B]">{successMessage}</p>}
          {errorMessage && <p className="font-semibold text-[#A9483C]">{errorMessage}</p>}
        </div>
      </div>
    </section>
  );
}

export default CheckInForm;
