import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bookingService } from '@/services/bookingService';
import { guestAccountService } from '@/services/guestAccountService';
import { guestService } from '@/services/guestService';
import { roomService } from '@/services/roomService';
import { Badge, type BadgeTone } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Input } from '@/shared/components/Input';
import { LoadingState } from '@/shared/components/LoadingState';
import { Select } from '@/shared/components/Select';
import { BOOKING_STATUS_TRANSITIONS } from '@/shared/constants/statuses';
import type { Booking } from '@/shared/types/entities/booking';
import type { Guest } from '@/shared/types/entities/guest';
import type { Room } from '@/shared/types/entities/room';
import { formatDateGT } from '@/shared/utils/date';
import './front-desk.css';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'notFound' }
  | { status: 'ready'; booking: Booking; guest?: Guest; rooms: Room[] };

const BOOKING_STATUS_LABELS: Record<Booking['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  checkedIn: 'Hospedaje activo',
  checkedOut: 'Check-out realizado',
  cancelled: 'Cancelada',
  noShow: 'No-show',
};

const BOOKING_STATUS_TONES: Record<Booking['status'], BadgeTone> = {
  pending: 'warning',
  confirmed: 'info',
  checkedIn: 'success',
  checkedOut: 'neutral',
  cancelled: 'danger',
  noShow: 'danger',
};

function getErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Error inesperado.';
}

export function CheckInScreen() {
  const navigate = useNavigate();
  const { bookingId } = useParams<'bookingId'>();

  const [screen, setScreen] = useState<ScreenState>({ status: 'loading' });
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [companions, setCompanions] = useState('');
  const [assigningRoom, setAssigningRoom] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [roomAssignedMessage, setRoomAssignedMessage] = useState<string | null>(null);

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      setScreen({ status: 'notFound' });
      return;
    }

    setScreen({ status: 'loading' });
    setActionError(null);
    setRoomAssignedMessage(null);

    try {
      const booking = await bookingService.getBookingById(bookingId);
      if (!booking) {
        setScreen({ status: 'notFound' });
        return;
      }

      const [guest, rooms] = await Promise.all([
        guestService.getGuestById(booking.guestId),
        roomService.getRooms(),
      ]);

      setScreen({ status: 'ready', booking, guest, rooms });
      setSelectedRoomId(booking.roomId ?? '');
      setDocumentType(guest?.documentType ?? '');
      setDocumentNumber(guest?.documentNumber ?? '');
    } catch (cause) {
      setScreen({ status: 'error', message: getErrorMessage(cause) });
    }
  }, [bookingId]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const availableRooms = useMemo(() => {
    if (screen.status !== 'ready') return [];
    return screen.rooms.filter((room) => room.isAssignable || room.id === screen.booking.roomId);
  }, [screen]);

  async function handleAssignRoom() {
    if (screen.status !== 'ready' || !selectedRoomId) return;

    setAssigningRoom(true);
    setActionError(null);
    setRoomAssignedMessage(null);

    try {
      const booking = await bookingService.assignRoom(screen.booking.id, selectedRoomId);
      const room = screen.rooms.find((item) => item.id === selectedRoomId);
      setScreen({ ...screen, booking });
      setRoomAssignedMessage(
        `Habitación ${room?.roomNumber ?? selectedRoomId} asignada correctamente.`,
      );
    } catch (cause) {
      setActionError(getErrorMessage(cause));
    } finally {
      setAssigningRoom(false);
    }
  }

  async function handleCheckIn() {
    if (screen.status !== 'ready') return;

    setCheckingIn(true);
    setActionError(null);
    setRoomAssignedMessage(null);

    try {
      await bookingService.checkIn(screen.booking.id);
      const account = await guestAccountService.getAccountByBookingId(screen.booking.id);
      if (!account) {
        throw new Error('El check-in se completó, pero no se encontró la cuenta del huésped.');
      }
      navigate(`/pms/accounts/${account.id}`);
    } catch (cause) {
      setActionError(getErrorMessage(cause));
      setCheckingIn(false);
    }
  }

  if (screen.status === 'loading') {
    return (
      <section className="content">
        <LoadingState label="Cargando reserva..." />
      </section>
    );
  }

  if (screen.status === 'error') {
    return (
      <section className="content">
        <ErrorState description={screen.message} onRetry={loadBooking} />
      </section>
    );
  }

  if (screen.status === 'notFound') {
    return (
      <section className="content">
        <EmptyState
          title="Reserva no encontrada"
          description={
            bookingId
              ? `No existe una reserva con el identificador ${bookingId}.`
              : 'No se recibió un identificador de reserva en la ruta.'
          }
        />
      </section>
    );
  }

  const { booking, guest } = screen;
  const canTransitionToCheckedIn = BOOKING_STATUS_TRANSITIONS[booking.status].includes('checkedIn');
  const hasRoomAssigned = Boolean(booking.roomId);
  const canCompleteCheckIn =
    canTransitionToCheckedIn && hasRoomAssigned && !checkingIn && !assigningRoom;

  return (
    <section className="content" aria-labelledby="check-in-title">
      <div className="front-desk-header">
        <div>
          <p className="eyebrow">Front Desk</p>
          <h1 id="check-in-title">Check-in del huésped</h1>
          <p className="muted">Reserva {booking.confirmationCode}</p>
        </div>
        <Badge tone={BOOKING_STATUS_TONES[booking.status]}>
          {BOOKING_STATUS_LABELS[booking.status]}
        </Badge>
      </div>

      <div className="panel front-desk-panel">
        <h2>Datos de la reserva</h2>
        <dl className="front-desk-summary">
          <div>
            <dt>Huésped</dt>
            <dd>{guest ? `${guest.firstName} ${guest.lastName}` : 'No disponible'}</dd>
          </div>
          <div>
            <dt>Entrada</dt>
            <dd>{formatDateGT(booking.checkIn)}</dd>
          </div>
          <div>
            <dt>Salida</dt>
            <dd>{formatDateGT(booking.checkOut)}</dd>
          </div>
          <div>
            <dt>Huéspedes</dt>
            <dd>
              {booking.adults} adultos · {booking.children} menores
            </dd>
          </div>
        </dl>

        {!canTransitionToCheckedIn && (
          <p className="field-error" role="alert">
            Esta reserva está en estado "{BOOKING_STATUS_LABELS[booking.status]}" y no admite pasar
            a hospedaje activo desde aquí.
          </p>
        )}
      </div>

      <div className="panel front-desk-panel">
        <h2>Documento de identificación y acompañantes</h2>
        <div className="front-desk-form-grid">
          <Select
            label="Tipo de documento"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
          >
            <option value="">Selecciona un tipo</option>
            <option value="passport">Pasaporte</option>
            <option value="nationalId">DPI / identificación nacional</option>
            <option value="driverLicense">Licencia de conducir</option>
          </Select>
          <Input
            label="Número de documento"
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
            placeholder="Ej. 1234 56789 0101"
          />
          <Input
            label="Acompañantes"
            className="front-desk-form-grid-full"
            value={companions}
            onChange={(event) => setCompanions(event.target.value)}
            placeholder="Nombres separados por coma"
            helpText="Registro de recepción para la estadía; el contrato de datos de acompañantes todavía no está definido en shared/types/entities/."
          />
        </div>
      </div>

      <div className="panel front-desk-panel">
        <h2>Habitación</h2>
        <Select
          label="Habitación disponible"
          value={selectedRoomId}
          onChange={(event) => {
            setSelectedRoomId(event.target.value);
            setRoomAssignedMessage(null);
            setActionError(null);
          }}
          disabled={assigningRoom || checkingIn}
          helpText="Solo se muestran habitaciones libres y listas para recibir al huésped."
        >
          <option value="">Selecciona una habitación</option>
          {availableRooms.map((room) => (
            <option key={room.id} value={room.id}>
              Habitación {room.roomNumber} · Piso {room.floor}
            </option>
          ))}
        </Select>

        {availableRooms.length === 0 && (
          <EmptyState
            title="No hay habitaciones disponibles"
            description="No hay habitaciones libres y limpias para asignar en este momento."
          />
        )}

        <div className="front-desk-actions">
          <Button
            type="button"
            variant="secondary"
            loading={assigningRoom}
            disabled={
              !selectedRoomId || selectedRoomId === booking.roomId || assigningRoom || checkingIn
            }
            onClick={handleAssignRoom}
          >
            Asignar habitación
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={checkingIn}
            disabled={!canCompleteCheckIn}
            onClick={handleCheckIn}
          >
            Completar check-in
          </Button>
        </div>

        <div aria-live="polite" className="front-desk-feedback">
          {roomAssignedMessage && <p className="front-desk-success">{roomAssignedMessage}</p>}
          {actionError && (
            <p className="field-error" role="alert">
              {actionError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
