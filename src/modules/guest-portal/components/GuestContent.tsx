import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Ban,
  BedDouble,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  FileText,
  Home,
  LogOut,
  Package,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Reservation, GuestInfo } from '@/private/workspace/PrivateWorkspace';
import { bookingService } from '@/services/bookingService';
import { catalogService } from '@/services/catalogService';
import { guestAccountService } from '@/services/guestAccountService';
import { guestService } from '@/services/guestService';
import { notificationService } from '@/services/notificationService';
import { orderService } from '@/services/orderService';
import { roomService } from '@/services/roomService';
import { serviceRequestService } from '@/services/serviceRequestService';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import type { Booking } from '@/shared/types/entities/booking';
import type { Guest } from '@/shared/types/entities/guest';
import type { RoomType as RoomTypeModel } from '@/shared/types/entities/room-type';
import { toDomainCalendarDate, toDtoCalendarDate } from '@/shared/types/common';
import { calculateNights } from '@/shared/utils/date';
import {
  CancelOrderModal,
  CancelReservationModal,
  EditProfileModal,
  LinkReservationModal,
  ModifyReservationModal,
  ReceiptModal,
  RequestServiceModal,
  ReservationDetailModal,
  money,
  fmtDate,
  resStatusClass,
  orderStatusClass,
  reqStatusClass,
  type GuestNotification,
  type GuestServiceRequest,
  type GuestMenuItem,
  type GuestCartItem,
  type GuestOrder,
} from '@/modules/guest-portal/components/GuestModals';

type GuestAmenity = {
  name: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
  schedule: string;
};

const AMENITY_ICONS: LucideIcon[] = [
  Sparkles,
  Activity,
  ShieldCheck,
  BedDouble,
  Home,
  Package,
  FileText,
  Clock,
];

function parseDbId(id: string, fallback: number) {
  const value = Number(id.replace(/\D/g, ''));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function centsToAmount(cents: number) {
  return Math.round(cents / 100);
}

function formatDbTime(value?: Date) {
  if (!value) return '';
  return value.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getRoomTypeLabel(
  roomTypeId: string | undefined,
  roomTypes: RoomTypeModel[],
): Reservation['roomType'] {
  const roomType = roomTypes.find((type) => type.id === roomTypeId);
  const name = roomType?.name.toLowerCase() ?? '';
  if (name.includes('suite')) return 'Suite';
  if (name.includes('deluxe')) return 'Deluxe';
  return 'Estándar';
}

function mapReservationStatus(status: Booking['status']): Reservation['status'] {
  if (status === 'confirmed') return 'Confirmada';
  if (status === 'checkedIn') return 'Check-in';
  if (status === 'checkedOut') return 'Check-out';
  if (status === 'cancelled') return 'Cancelada';
  if (status === 'noShow') return 'Anulada';
  return 'Pendiente';
}

function mapOrderStatus(status: string): GuestOrder['status'] {
  if (status === 'accepted') return 'Aceptado';
  if (status === 'preparing' || status === 'ready') return 'En preparación';
  if (status === 'onTheWay') return 'En camino';
  if (status === 'delivered') return 'Entregado';
  if (status === 'cancelled' || status === 'rejected') return 'Cancelado';
  return 'Pendiente';
}

function mapRequestStatus(status: string): GuestServiceRequest['status'] {
  if (status === 'completed') return 'Completada';
  if (status === 'cancelled' || status === 'rejected') return 'Cancelada';
  if (status === 'accepted' || status === 'inProgress') return 'En proceso';
  return 'Pendiente';
}

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      profile: GuestInfo;
      reservations: PortalReservation[];
      notifications: GuestNotification[];
      serviceRequests: GuestServiceRequest[];
      menu: GuestMenuItem[];
      orders: GuestOrder[];
      amenities: GuestAmenity[];
    };

type PortalReservation = Reservation & {
  bookingId: string;
  guestId: string;
  roomId?: string;
  roomTypeId: string;
  adults: number;
  children: number;
  balanceCents: number;
  currency: Booking['currency'];
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function findGuestForSession(guests: Guest[], sessionEmail?: string, sessionName?: string) {
  const email = sessionEmail?.trim().toLowerCase();
  if (email) {
    const byEmail = guests.find((guest) => guest.email?.toLowerCase() === email);
    if (byEmail) return byEmail;
  }

  const nameTokens = normalize(sessionName ?? '')
    .split(/\s+/)
    .filter(Boolean);
  if (nameTokens.length === 0) return undefined;

  return guests.find((guest) => {
    const guestName = normalize(`${guest.firstName} ${guest.lastName}`);
    return nameTokens.every((token) => guestName.includes(token));
  });
}

function isVisibleAsActive(status: Booking['status']) {
  return status === 'checkedIn' || status === 'confirmed' || status === 'pending';
}

function sortBookingsForPortal(left: Booking, right: Booking) {
  const leftActive = isVisibleAsActive(left.status) ? 0 : 1;
  const rightActive = isVisibleAsActive(right.status) ? 0 : 1;
  if (leftActive !== rightActive) return leftActive - rightActive;
  return right.checkIn.getTime() - left.checkIn.getTime();
}

function calculateReservationBalanceCents(reservation: Reservation) {
  const active = reservation.folio.filter((item) => item.status === 'Activo');
  const charges = active
    .filter((item) => item.type === 'Cargo')
    .reduce((sum, item) => sum + item.amount, 0);
  const credits = active
    .filter((item) => item.type !== 'Cargo')
    .reduce((sum, item) => sum + item.amount, 0);
  return Math.round((charges - credits) * 100);
}

function mapServiceRequestType(type: string) {
  return type === 'Limpieza' ? 'housekeeping' : 'concierge';
}

function mapDocumentTypeToDto(type: string) {
  if (type === 'nationalId' || type === 'DPI' || type === 'INE' || type === 'Cédula') {
    return 'national_id' as const;
  }
  if (type === 'driverLicense') return 'driver_license' as const;
  return 'passport' as const;
}

function getErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'No fue posible cargar tu portal de huésped.';
}

export function GuestContent({
  nav,
  onAction,
  onLogout,
  sessionName,
  sessionEmail,
}: {
  nav: string;
  onAction: (message: string) => void;
  onLogout: () => void;
  sessionUserId?: string;
  sessionName?: string;
  sessionEmail?: string;
}) {
  const [screen, setScreen] = useState<ScreenState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setScreen({ status: 'loading' });
      try {
        const [
          bookings,
          guests,
          rooms,
          roomTypes,
          products,
          amenitiesData,
          charges,
          payments,
          deposits,
        ] = await Promise.all([
          bookingService.getBookings(),
          guestService.getGuests(),
          roomService.getRooms(),
          roomService.getRoomTypes(),
          catalogService.getProducts(),
          catalogService.getAmenities(),
          guestAccountService.getCharges(),
          guestAccountService.getPayments(),
          guestAccountService.getDeposits(),
        ]);

        const activeGuest = findGuestForSession(guests, sessionEmail, sessionName);
        const guestBookings = activeGuest
          ? bookings
              .filter((booking) => booking.guestId === activeGuest.id)
              .sort(sortBookingsForPortal)
          : [];
        const activeBooking =
          guestBookings.find((booking) => booking.status === 'checkedIn') ?? guestBookings[0];
        const activeRoom = activeBooking
          ? rooms.find((room) => room.id === activeBooking.roomId)
          : undefined;
        const activeRoomNumber = activeRoom?.roomNumber ?? 'Sin asignar';

        const profile: GuestInfo = activeGuest
          ? {
              name: activeGuest.firstName,
              lastName: activeGuest.lastName,
              phone: activeGuest.phone ?? '',
              email: activeGuest.email ?? '',
              docType: activeGuest.documentType ?? 'DPI',
              docNumber: activeGuest.documentNumber ?? '',
              birthDate: '',
              nationality: activeGuest.nationality ?? '',
            }
          : {
              name: '',
              lastName: '',
              phone: '',
              email: '',
              docType: 'DPI',
              docNumber: '',
              birthDate: '',
              nationality: '',
            };

        const accounts = await guestAccountService.getAccounts();

        const reservations: PortalReservation[] = guestBookings.map((booking, index) => {
          const bookingCharges = charges.filter((charge) => charge.bookingId === booking.id);
          const bookingPayments = payments.filter((payment) => payment.bookingId === booking.id);
          const bookingDeposits = deposits.filter((deposit) => deposit.bookingId === booking.id);
          const bookingAccount = accounts.find((account) => account.bookingId === booking.id);
          const room = rooms.find((item) => item.id === booking.roomId);
          const nights = Math.max(1, calculateNights(booking.checkIn, booking.checkOut));
          const status = mapReservationStatus(booking.status);
          const folio: Reservation['folio'] = [
            ...bookingCharges.map((charge, chargeIndex) => ({
              id: parseDbId(charge.id, chargeIndex + 1),
              concept: charge.description,
              category: 'Cargo',
              amount: centsToAmount(charge.amountCents),
              date: toDtoCalendarDate(charge.chargedAt),
              type: 'Cargo' as const,
              status: charge.status === 'voided' ? ('Anulado' as const) : ('Activo' as const),
            })),
            ...bookingPayments.map((payment, paymentIndex) => ({
              id: parseDbId(payment.id, 4000 + paymentIndex),
              concept: 'Pago registrado',
              category: 'Pago',
              amount: centsToAmount(payment.amountCents),
              date: toDtoCalendarDate(payment.paidAt ?? payment.createdAt),
              type: 'Pago' as const,
              status:
                payment.status === 'failed' || payment.status === 'refunded'
                  ? ('Anulado' as const)
                  : ('Activo' as const),
            })),
            ...bookingDeposits.map((deposit, depositIndex) => ({
              id: parseDbId(deposit.id, 6000 + depositIndex),
              concept: 'Depósito garantía',
              category: 'Depósito',
              amount: centsToAmount(deposit.amountCents),
              date: toDtoCalendarDate(deposit.collectedAt),
              type: 'Depósito' as const,
              status: deposit.status === 'refunded' ? ('Anulado' as const) : ('Activo' as const),
            })),
          ];
          const reservation = {
            id: parseDbId(booking.id, index + 1),
            bookingId: booking.id,
            guestId: booking.guestId,
            roomId: booking.roomId,
            roomTypeId: booking.roomTypeId,
            adults: booking.adults,
            children: booking.children,
            balanceCents: bookingAccount?.balanceCents ?? 0,
            currency: booking.currency,
            code: booking.confirmationCode,
            checkIn: toDtoCalendarDate(booking.checkIn),
            checkOut: toDtoCalendarDate(booking.checkOut),
            roomNumber: room?.roomNumber ?? activeRoomNumber,
            roomType: getRoomTypeLabel(booking.roomTypeId, roomTypes),
            rate: centsToAmount(booking.totalAmountCents) / nights,
            guestCount: booking.adults + booking.children,
            status,
            origin: 'Online',
            observations: booking.notes ?? '',
            checkInTime:
              status === 'Check-in' || status === 'Check-out'
                ? formatDbTime(booking.updatedAt)
                : null,
            checkOutTime: status === 'Check-out' ? formatDbTime(booking.updatedAt) : null,
            cancelReason: status === 'Cancelada' ? (booking.notes ?? '') : '',
            voidReason: status === 'Anulada' ? (booking.notes ?? '') : '',
            guest: profile,
            companions: [],
            folio,
          };
          return {
            ...reservation,
            balanceCents:
              bookingAccount?.balanceCents ?? calculateReservationBalanceCents(reservation),
          };
        });

        const [requests, guestOrdersRaw, notificationsRaw] = await Promise.all([
          activeGuest
            ? serviceRequestService.getRequestsByGuestId(activeGuest.id)
            : Promise.resolve([]),
          activeGuest ? orderService.getOrdersByGuestId(activeGuest.id) : Promise.resolve([]),
          activeGuest
            ? notificationService.getNotificationsByGuestId(activeGuest.id)
            : Promise.resolve([]),
        ]);

        const serviceRequests: GuestServiceRequest[] = requests.map((request, index) => ({
          id: parseDbId(request.id, index + 1),
          sourceId: request.id,
          type:
            request.type === 'housekeeping'
              ? 'Limpieza'
              : request.type === 'maintenance'
                ? 'Mantenimiento'
                : 'Servicio',
          description: request.description,
          time: formatDbTime(request.requestedAt),
          status: mapRequestStatus(request.status),
          room: rooms.find((item) => item.id === request.roomId)?.roomNumber ?? activeRoomNumber,
        }));

        const orders: GuestOrder[] = guestOrdersRaw.map((order, index) => ({
          id: parseDbId(order.id, index + 1),
          sourceId: order.id,
          items: order.items.map((item) => {
            const product = products.find((productItem) => productItem.id === item.productId);
            return {
              name: product?.name ?? item.productId,
              quantity: item.quantity,
              price: centsToAmount(item.unitPriceCents),
            };
          }),
          time: formatDbTime(order.requestedAt),
          status: mapOrderStatus(order.status),
          note: order.notes ?? '',
          room: rooms.find((item) => item.id === order.roomId)?.roomNumber ?? activeRoomNumber,
        }));

        const notifications: GuestNotification[] = notificationsRaw.map((item, index) => ({
          id: index + 1,
          sourceId: item.id,
          title: item.title,
          message: item.message,
          time: formatDbTime(item.occurredAt),
          read: item.read,
          category: item.category === 'order' ? 'Pedido' : 'Servicio',
        }));

        const menu: GuestMenuItem[] = products
          .filter((product) => product.category === 'foodAndBeverage')
          .map((product, index) => ({
            id: parseDbId(product.id, index + 1),
            productId: product.id,
            name: product.name,
            description: product.description ?? product.sku,
            price: centsToAmount(product.priceCents),
            category: 'Room service',
            available: product.active,
          }));

        const amenities: GuestAmenity[] = amenitiesData.map((amenity, index) => ({
          name: amenity.name,
          description: amenity.description ?? '',
          icon: AMENITY_ICONS[index % AMENITY_ICONS.length],
          available: amenity.active,
          schedule:
            amenity.opensAt && amenity.closesAt
              ? `${amenity.opensAt} — ${amenity.closesAt}`
              : 'Disponible',
        }));

        if (active) {
          setScreen({
            status: 'ready',
            profile,
            reservations,
            notifications,
            serviceRequests,
            menu,
            orders,
            amenities,
          });
        }
      } catch (cause) {
        if (active) setScreen({ status: 'error', message: getErrorMessage(cause) });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [reloadToken, sessionEmail, sessionName]);

  if (screen.status === 'loading') {
    return <LoadingState label="Cargando tu portal de huésped..." />;
  }

  if (screen.status === 'error') {
    return (
      <ErrorState
        title="No pudimos cargar tu portal de huésped"
        description={screen.message}
        onRetry={() => setReloadToken((value) => value + 1)}
      />
    );
  }

  return (
    <GuestContentReady
      nav={nav}
      onAction={onAction}
      onLogout={onLogout}
      initialProfile={screen.profile}
      initialReservations={screen.reservations}
      initialNotifications={screen.notifications}
      initialServiceRequests={screen.serviceRequests}
      initialMenu={screen.menu}
      initialOrders={screen.orders}
      amenities={screen.amenities}
    />
  );
}

function GuestContentReady({
  nav,
  onAction,
  onLogout,
  initialProfile,
  initialReservations,
  initialNotifications,
  initialServiceRequests,
  initialMenu,
  initialOrders,
  amenities,
}: {
  nav: string;
  onAction: (message: string) => void;
  onLogout: () => void;
  initialProfile: GuestInfo;
  initialReservations: PortalReservation[];
  initialNotifications: GuestNotification[];
  initialServiceRequests: GuestServiceRequest[];
  initialMenu: GuestMenuItem[];
  initialOrders: GuestOrder[];
  amenities: GuestAmenity[];
}) {
  const [reservations, setReservations] = useState<PortalReservation[]>(initialReservations);
  const [profile, setProfile] = useState<GuestInfo>(initialProfile);
  const [notifications, setNotifications] = useState<GuestNotification[]>(initialNotifications);
  const [serviceRequests, setServiceRequests] =
    useState<GuestServiceRequest[]>(initialServiceRequests);
  const [orders, setOrders] = useState<GuestOrder[]>(initialOrders);
  const [cart, setCart] = useState<GuestCartItem[]>([]);
  const [orderNote, setOrderNote] = useState('');

  const [detailResId, setDetailResId] = useState<number | null>(null);
  const [modifyResId, setModifyResId] = useState<number | null>(null);
  const [cancelResId, setCancelResId] = useState<number | null>(null);
  const [receiptResId, setReceiptResId] = useState<number | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showRequestService, setShowRequestService] = useState<'Limpieza' | 'Articulos' | null>(
    null,
  );
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [resFilter, setResFilter] = useState<'Todas' | 'Activas' | 'Pasadas' | 'Canceladas'>(
    'Todas',
  );
  const [menuCat, setMenuCat] = useState('Todos');

  const detailRes =
    detailResId !== null ? (reservations.find((r) => r.id === detailResId) ?? null) : null;
  const modifyRes =
    modifyResId !== null ? (reservations.find((r) => r.id === modifyResId) ?? null) : null;
  const cancelRes =
    cancelResId !== null ? (reservations.find((r) => r.id === cancelResId) ?? null) : null;
  const receiptRes =
    receiptResId !== null ? (reservations.find((r) => r.id === receiptResId) ?? null) : null;

  const activeReservations = reservations.filter(
    (r) => !['Cancelada', 'Anulada', 'Check-out'].includes(r.status),
  );
  const pastReservations = reservations.filter((r) => ['Check-out'].includes(r.status));
  const cancelledReservations = reservations.filter((r) =>
    ['Cancelada', 'Anulada'].includes(r.status),
  );
  const currentStay =
    reservations.find((r) => r.status === 'Check-in') ?? activeReservations[0] ?? null;

  const filteredReservations =
    resFilter === 'Todas'
      ? reservations
      : resFilter === 'Activas'
        ? activeReservations
        : resFilter === 'Pasadas'
          ? pastReservations
          : cancelledReservations;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (item: GuestMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing)
        return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [
        ...prev,
        {
          id: item.id,
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };
  const removeFromCart = (id: number) => setCart((prev) => prev.filter((c) => c.id !== id));
  const updateCartQty = (id: number, delta: number) =>
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)),
    );

  const submitOrder = async () => {
    if (cart.length === 0) return;
    if (!currentStay?.roomId) {
      onAction('No hay una reserva con habitacion asignada para crear el pedido.');
      return;
    }
    try {
      const order = await orderService.createOrder({
        bookingId: currentStay.bookingId,
        roomId: currentStay.roomId,
        guestId: currentStay.guestId,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        notes: orderNote,
      });
      const newOrder: GuestOrder = {
        id: parseDbId(order.id, orders.length + 1),
        sourceId: order.id,
        items: order.items.map((item) => {
          const product = initialMenu.find((menuItem) => menuItem.productId === item.productId);
          return {
            name: product?.name ?? item.productId,
            quantity: item.quantity,
            price: centsToAmount(item.unitPriceCents),
          };
        }),
        time: formatDbTime(order.requestedAt),
        status: mapOrderStatus(order.status),
        note: order.notes ?? '',
        room: currentStay.roomNumber,
      };
      setOrders((prev) => [newOrder, ...prev]);
      setCart([]);
      setOrderNote('');
      onAction(`Pedido #${newOrder.id} enviado a la habitacion ${currentStay.roomNumber}`);
    } catch (cause) {
      onAction(getErrorMessage(cause));
    }
  };

  const cancelOrder = async (orderId: number) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order || !currentStay) return;
    try {
      await orderService.cancelOrder(order.sourceId, currentStay.guestId);
      setOrders((prev) =>
        prev.map((item) => (item.id === orderId ? { ...item, status: 'Cancelado' } : item)),
      );
      setCancelOrderId(null);
      onAction(`Pedido #${orderId} cancelado correctamente`);
    } catch (cause) {
      onAction(getErrorMessage(cause));
    }
  };

  const submitServiceRequest = async (data: {
    type: string;
    description: string;
    time: string;
  }) => {
    if (!currentStay?.roomId) {
      onAction('No hay una reserva con habitacion asignada para crear la solicitud.');
      return;
    }
    try {
      const request = await serviceRequestService.createRequest({
        bookingId: currentStay.bookingId,
        roomId: currentStay.roomId,
        guestId: currentStay.guestId,
        type: mapServiceRequestType(data.type),
        description: `${data.description} (${data.time})`,
      });
      const newReq: GuestServiceRequest = {
        id: parseDbId(request.id, serviceRequests.length + 1),
        sourceId: request.id,
        type: data.type,
        description: request.description,
        time: formatDbTime(request.requestedAt),
        status: mapRequestStatus(request.status),
        room: currentStay.roomNumber,
      };
      setServiceRequests((prev) => [newReq, ...prev]);
      setShowRequestService(null);
      onAction('Solicitud enviada correctamente');
    } catch (cause) {
      onAction(getErrorMessage(cause));
    }
  };

  const cancelServiceRequest = async (reqId: number) => {
    const request = serviceRequests.find((item) => item.id === reqId);
    if (!request || !currentStay) return;
    try {
      await serviceRequestService.cancelRequest(request.sourceId, currentStay.guestId);
      setServiceRequests((prev) =>
        prev.map((item) => (item.id === reqId ? { ...item, status: 'Cancelada' } : item)),
      );
      onAction('Solicitud cancelada');
    } catch (cause) {
      onAction(getErrorMessage(cause));
    }
  };

  const saveProfile = async (updated: GuestInfo) => {
    const guestId = reservations[0]?.guestId;
    if (!guestId) return;
    try {
      const guest = await guestService.updateGuest(guestId, {
        first_name: updated.name,
        last_name: updated.lastName,
        phone: updated.phone,
        email: updated.email,
        document_type: mapDocumentTypeToDto(updated.docType),
        document_number: updated.docNumber,
        nationality: updated.nationality,
      });
      setProfile({
        ...updated,
        name: guest.firstName,
        lastName: guest.lastName,
        phone: guest.phone ?? '',
        email: guest.email ?? '',
        docType: guest.documentType ?? updated.docType,
        docNumber: guest.documentNumber ?? '',
        nationality: guest.nationality ?? '',
      });
      setShowEditProfile(false);
      onAction('Perfil actualizado correctamente');
    } catch (cause) {
      onAction(getErrorMessage(cause));
    }
  };

  const saveReservationModify = async (
    id: number,
    updates: { checkIn: string; checkOut: string; guestCount: number; observations: string },
  ) => {
    const reservation = reservations.find((item) => item.id === id);
    if (!reservation) return;
    const children = Math.min(reservation.children, Math.max(0, updates.guestCount - 1));
    const adults = updates.guestCount - children;
    try {
      const booking = await bookingService.updateBooking(reservation.bookingId, {
        check_in: updates.checkIn,
        check_out: updates.checkOut,
        adults,
        children,
        notes: updates.observations,
      });
      setReservations((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                checkIn: toDtoCalendarDate(booking.checkIn),
                checkOut: toDtoCalendarDate(booking.checkOut),
                adults: booking.adults,
                children: booking.children,
                guestCount: booking.adults + booking.children,
                observations: booking.notes ?? '',
              }
            : item,
        ),
      );
      setModifyResId(null);
      setDetailResId(null);
      onAction('Modificacion de reserva guardada correctamente.');
    } catch (cause) {
      onAction(getErrorMessage(cause));
    }
  };

  const confirmCancelReservation = async (id: number, reason: string) => {
    const reservation = reservations.find((item) => item.id === id);
    if (!reservation) return;
    try {
      await bookingService.cancelBooking(reservation.bookingId, reason);
      setReservations((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'Cancelada', cancelReason: reason } : item,
        ),
      );
      setCancelResId(null);
      setDetailResId(null);
      onAction('Reserva cancelada correctamente');
    } catch (cause) {
      onAction(getErrorMessage(cause));
    }
  };

  const linkReservation = async (code: string) => {
    const guestId = reservations[0]?.guestId;
    if (!guestId) return;
    try {
      const bookings = await bookingService.getBookings();
      const booking = bookings.find(
        (item) =>
          item.confirmationCode.toUpperCase() === code.toUpperCase() ||
          item.guestLinkCode.toUpperCase() === code.toUpperCase(),
      );
      if (!booking || booking.guestId !== guestId) {
        throw new Error('No encontramos una reserva vigente para este huesped con ese codigo.');
      }
      setShowLink(false);
      onAction(`Reserva ${booking.confirmationCode} vinculada a tu cuenta`);
    } catch (cause) {
      onAction(getErrorMessage(cause));
    }
  };

  const markNotificationRead = async (id: number) => {
    const notification = notifications.find((item) => item.id === id);
    const guestId = reservations[0]?.guestId;
    if (!notification || !guestId) return;
    try {
      await notificationService.markNotificationRead(guestId, notification.sourceId);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
    } catch (cause) {
      onAction(getErrorMessage(cause));
    }
  };
  const markAllRead = async () => {
    const guestId = reservations[0]?.guestId;
    if (!guestId) return;
    try {
      await notificationService.markAllRead(guestId);
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      onAction('Todas las notificaciones marcadas como leidas');
    } catch (cause) {
      onAction(getErrorMessage(cause));
    }
  };

  // ─── HOME / OVERVIEW ───────────────────────────────────────────
  if (nav === 'Inicio') {
    return (
      <>
        <div className="gs-overview">
          <div className="gs-overview-main">
            <div className="gs-overview-hero">
              <div>
                {currentStay ? (
                  <>
                    <span className={`status-pill ${resStatusClass(currentStay.status)}`}>
                      {currentStay.status}
                    </span>
                    <h4>
                      {currentStay.roomType} · Habitacion {currentStay.roomNumber}
                    </h4>
                    <p>
                      {fmtDate(currentStay.checkIn)} — {fmtDate(currentStay.checkOut)} ·{' '}
                      {currentStay.adults} adultos
                      {currentStay.children > 0 ? ` · ${currentStay.children} menores` : ''}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="status-pill warning">Sin reserva activa</span>
                    <h4>Vincula una reserva</h4>
                    <p>Ingresa tu codigo para ver tu estancia.</p>
                  </>
                )}
              </div>
              <div className="stay-art">
                <BedDouble size={48} strokeWidth={1.2} />
              </div>
            </div>
            <div className="gs-overview-details">
              <div>
                <span>Proximo evento</span>
                <strong>{currentStay ? 'Check-out' : 'Reserva'}</strong>
                <small>
                  {currentStay ? `${fmtDate(currentStay.checkOut)} · 12:00 hrs` : 'Pendiente'}
                </small>
              </div>
              <div>
                <span>Saldo pendiente</span>
                <strong>{money(Math.max(0, (currentStay?.balanceCents ?? 0) / 100))}</strong>
                <small>Se carga al finalizar tu estancia</small>
              </div>
            </div>
            <div className="gs-overview-quick">
              <button onClick={() => setShowRequestService('Limpieza')}>
                <span className="gs-quick-icon sage">
                  <Sparkles size={18} />
                </span>
                <strong>Limpieza</strong>
                <small>Solicitar servicio</small>
              </button>
              <button onClick={() => setShowRequestService('Articulos')}>
                <span className="gs-quick-icon gold">
                  <Package size={18} />
                </span>
                <strong>Artículos</strong>
                <small>Toallas, almohadas</small>
              </button>
              <button onClick={() => onAction('Redirigiendo a Room Service')}>
                <span className="gs-quick-icon terracotta">
                  <ClipboardList size={18} />
                </span>
                <strong>Room Service</strong>
                <small>Pide a tu cuarto</small>
              </button>
              <button onClick={() => onAction('Redirigiendo a amenidades')}>
                <span className="gs-quick-icon blue">
                  <Activity size={18} />
                </span>
                <strong>Amenidades</strong>
                <small>Ver disponibles</small>
              </button>
            </div>
          </div>
          <div className="gs-overview-notif">
            <div className="gs-overview-notif-head">
              <div>
                <h3>Actividad reciente</h3>
                <p>Ãšltimos movimientos de tu estancia</p>
              </div>
              {unreadCount > 0 && (
                <span className="status-pill warning">{unreadCount} sin leer</span>
              )}
            </div>
            <div className="activity-list">
              {notifications.slice(0, 3).map((n) => (
                <div className="activity-item" key={n.id}>
                  <span className={`activity-dot ${n.read ? 'info' : 'success'}`} />
                  <div>
                    <p>{n.title}</p>
                    <small>{n.time}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {showRequestService && (
          <RequestServiceModal
            mode={showRequestService}
            onClose={() => setShowRequestService(null)}
            onSubmit={submitServiceRequest}
          />
        )}
      </>
    );
  }

  // ─── MY RESERVATIONS ───────────────────────────────────────────
  if (nav === 'Mis reservas') {
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Mis reservas</h3>
              <p>Consulta y gestiona todas tus reservas</p>
            </div>
            <button className="button small primary" onClick={() => setShowLink(true)}>
              <Plus size={15} /> Vincular reserva
            </button>
          </div>
          <div className="toolbar">
            <div className="filter-dropdown">
              <button className="filter-button">
                <span>{resFilter}</span>
                <ChevronDown size={15} />
              </button>
              <div className="filter-menu">
                <button
                  className={resFilter === 'Todas' ? 'active' : ''}
                  onClick={() => setResFilter('Todas')}
                >
                  Todas
                </button>
                <button
                  className={resFilter === 'Activas' ? 'active' : ''}
                  onClick={() => setResFilter('Activas')}
                >
                  Activas
                </button>
                <button
                  className={resFilter === 'Pasadas' ? 'active' : ''}
                  onClick={() => setResFilter('Pasadas')}
                >
                  Pasadas
                </button>
                <button
                  className={resFilter === 'Canceladas' ? 'active' : ''}
                  onClick={() => setResFilter('Canceladas')}
                >
                  Canceladas
                </button>
              </div>
            </div>
          </div>
          <div className="gs-res-list">
            {filteredReservations.length === 0 ? (
              <div className="hk-empty">
                <CalendarDays size={22} />
                <p>No tienes reservas en esta categoría</p>
              </div>
            ) : (
              filteredReservations.map((res) => {
                const nights = Math.max(
                  1,
                  calculateNights(
                    toDomainCalendarDate(res.checkIn),
                    toDomainCalendarDate(res.checkOut),
                  ),
                );
                return (
                  <article
                    className="gs-res-card"
                    key={res.id}
                    onClick={() => setDetailResId(res.id)}
                  >
                    <div className="gs-res-card-head">
                      <div>
                        <span className="gs-res-code">{res.code}</span>
                        <strong>
                          Habitación {res.roomNumber} · {res.roomType}
                        </strong>
                        <small>
                          {fmtDate(res.checkIn)} — {fmtDate(res.checkOut)} · {nights} noches
                        </small>
                      </div>
                      <span className={`status-pill ${resStatusClass(res.status)}`}>
                        {res.status}
                      </span>
                    </div>
                    <div className="gs-res-card-meta">
                      <span>
                        <BedDouble size={14} /> {res.guestCount} huéspedes
                      </span>
                      <span>
                        <Wallet size={14} /> {money(res.rate * nights)}
                      </span>
                      <span>
                        <CalendarDays size={14} /> {res.origin}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
        {detailRes && (
          <ReservationDetailModal
            reservation={detailRes}
            onClose={() => setDetailResId(null)}
            onModify={() => {
              setDetailResId(null);
              setModifyResId(detailRes.id);
            }}
            onCancel={() => {
              setDetailResId(null);
              setCancelResId(detailRes.id);
            }}
            onReceipt={() => {
              setDetailResId(null);
              setReceiptResId(detailRes.id);
            }}
          />
        )}
        {modifyRes && (
          <ModifyReservationModal
            reservation={modifyRes}
            onClose={() => setModifyResId(null)}
            onSave={(updates) => saveReservationModify(modifyRes.id, updates)}
          />
        )}
        {cancelRes && (
          <CancelReservationModal
            reservation={cancelRes}
            onClose={() => setCancelResId(null)}
            onConfirm={(reason) => confirmCancelReservation(cancelRes.id, reason)}
          />
        )}
        {receiptRes && (
          <ReceiptModal
            reservation={receiptRes}
            onClose={() => setReceiptResId(null)}
            onDownload={() => {
              setReceiptResId(null);
              onAction('Recibo descargado en formato PDF');
            }}
          />
        )}
        {showLink && (
          <LinkReservationModal onClose={() => setShowLink(false)} onLink={linkReservation} />
        )}
      </>
    );
  }

  // ─── MY STAY ───────────────────────────────────────────────────
  if (nav === 'Mi estancia') {
    if (!currentStay) {
      return (
        <div className="panel">
          <div className="hk-empty">
            <BedDouble size={22} />
            <p>No tienes una estancia activa en este momento</p>
            <button
              className="button primary"
              style={{ marginTop: 16 }}
              onClick={() => setShowLink(true)}
            >
              Vincular una reserva
            </button>
          </div>
        </div>
      );
    }
    const nights = Math.max(
      1,
      calculateNights(
        toDomainCalendarDate(currentStay.checkIn),
        toDomainCalendarDate(currentStay.checkOut),
      ),
    );
    return (
      <>
        <div className="gs-stay-layout">
          <div className="panel gs-stay-main">
            <div className="panel-heading">
              <div>
                <h3>Mi estancia</h3>
                <p>Detalles de tu estancia actual</p>
              </div>
              <span className={`status-pill ${resStatusClass(currentStay.status)}`}>
                {currentStay.status}
              </span>
            </div>
            <div className="gs-stay-hero">
              <div className="stay-art">
                <BedDouble size={48} strokeWidth={1.2} />
              </div>
              <div>
                <h4>
                  {currentStay.roomType} · Habitacion {currentStay.roomNumber}
                </h4>
                <p>
                  {fmtDate(currentStay.checkIn)} — {fmtDate(currentStay.checkOut)}
                </p>
                <small>
                  {nights} noches · {currentStay.guestCount} huéspedes
                </small>
              </div>
            </div>
            <div className="gs-stay-info">
              <div>
                <small>Check-in</small>
                <strong>{fmtDate(currentStay.checkIn)}</strong>
                {currentStay.checkInTime && <span>{currentStay.checkInTime} hrs</span>}
              </div>
              <div>
                <small>Check-out</small>
                <strong>{fmtDate(currentStay.checkOut)}</strong>
                <span>12:00 hrs</span>
              </div>
              <div>
                <small>Tarifa/noche</small>
                <strong>{money(currentStay.rate)}</strong>
              </div>
              <div>
                <small>Total estancia</small>
                <strong>{money(currentStay.rate * nights)}</strong>
              </div>
            </div>
            <div className="gs-stay-services">
              <h4>Servicios contratados</h4>
              <div className="gs-stay-service-list">
                <div className="gs-stay-service-item">
                  <span className="gs-quick-icon sage">
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <strong>Desayuno incluido</strong>
                    <small>Servicio diario de 7:00 a 11:00</small>
                  </div>
                  <Check size={16} />
                </div>
                <div className="gs-stay-service-item">
                  <span className="gs-quick-icon blue">
                    <Activity size={16} />
                  </span>
                  <div>
                    <strong>Wi-Fi de alta velocidad</strong>
                    <small>Conexión gratuita en todo el hotel</small>
                  </div>
                  <Check size={16} />
                </div>
                <div className="gs-stay-service-item">
                  <span className="gs-quick-icon gold">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <strong>Acceso a gimnasio y spa</strong>
                    <small>Incluido en tu tarifa</small>
                  </div>
                  <Check size={16} />
                </div>
                {currentStay.observations && (
                  <div className="gs-stay-obs">
                    <FileText size={14} />
                    <p>{currentStay.observations}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <aside className="panel gs-stay-side">
            <div className="panel-heading">
              <div>
                <h3>Acciones rápidas</h3>
              </div>
            </div>
            <div className="gs-stay-actions">
              <button
                className="button secondary"
                onClick={() => setShowRequestService('Limpieza')}
              >
                <Sparkles size={15} /> Solicitar limpieza
              </button>
              <button
                className="button secondary"
                onClick={() => setShowRequestService('Articulos')}
              >
                <Package size={15} /> Pedir artículos
              </button>
              <button
                className="button secondary"
                onClick={() => onAction('Redirigiendo a Room Service')}
              >
                <ClipboardList size={15} /> Room Service
              </button>
              <button className="button secondary" onClick={() => setDetailResId(currentStay.id)}>
                <FileText size={15} /> Ver mi reserva
              </button>
            </div>
            <div className="gs-stay-side-info">
              <strong>Saldo pendiente</strong>
              <span className="gs-stay-balance">
                {money(Math.max(0, currentStay.balanceCents / 100))}
              </span>
              <small>Se carga al finalizar tu estancia</small>
            </div>
          </aside>
        </div>
        {showRequestService && (
          <RequestServiceModal
            mode={showRequestService}
            onClose={() => setShowRequestService(null)}
            onSubmit={submitServiceRequest}
          />
        )}
        {detailRes && (
          <ReservationDetailModal
            reservation={detailRes}
            onClose={() => setDetailResId(null)}
            onModify={() => {
              setDetailResId(null);
              setModifyResId(detailRes.id);
            }}
            onCancel={() => {
              setDetailResId(null);
              setCancelResId(detailRes.id);
            }}
            onReceipt={() => {
              setDetailResId(null);
              setReceiptResId(detailRes.id);
            }}
          />
        )}
      </>
    );
  }

  // ─── AMENITIES ─────────────────────────────────────────────────
  if (nav === 'Amenidades') {
    return (
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Amenidades del hotel</h3>
            <p>Todo lo que puedes disfrutar durante tu estancia</p>
          </div>
        </div>
        <div className="gs-amenities-grid">
          {amenities.map((am) => {
            const Icon = am.icon;
            return (
              <div
                className={`gs-amenity-card ${!am.available ? 'unavailable' : ''}`}
                key={am.name}
              >
                <div className="gs-amenity-icon">
                  <Icon size={22} />
                </div>
                <div className="gs-amenity-body">
                  <div>
                    <strong>{am.name}</strong>
                    {am.available ? (
                      <span className="status-pill success">Disponible</span>
                    ) : (
                      <span className="status-pill terracotta">No disponible</span>
                    )}
                  </div>
                  <p>{am.description}</p>
                  <small>
                    <Clock size={12} /> {am.schedule}
                  </small>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── ROOM SERVICES (Cleaning + Items) ──────────────────────────
  if (nav === 'Servicios de habitación') {
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Servicios de habitación</h3>
              <p>Solicita limpieza o artículos adicionales</p>
            </div>
            <div className="gs-heading-actions">
              <button
                className="button small primary"
                onClick={() => setShowRequestService('Limpieza')}
              >
                <Sparkles size={15} /> Solicitar limpieza
              </button>
              <button
                className="button small secondary"
                onClick={() => setShowRequestService('Articulos')}
              >
                <Package size={15} /> Pedir artículos
              </button>
            </div>
          </div>
          <div className="gs-req-summary">
            <div>
              <span className="status-pill warning">Pendientes</span>
              <strong>{serviceRequests.filter((r) => r.status === 'Pendiente').length}</strong>
            </div>
            <div>
              <span className="status-pill info">En proceso</span>
              <strong>{serviceRequests.filter((r) => r.status === 'En proceso').length}</strong>
            </div>
            <div>
              <span className="status-pill success">Completadas</span>
              <strong>{serviceRequests.filter((r) => r.status === 'Completada').length}</strong>
            </div>
          </div>
          <div className="gs-req-list">
            {serviceRequests.length === 0 ? (
              <div className="hk-empty">
                <ClipboardList size={22} />
                <p>No tienes solicitudes de servicio</p>
              </div>
            ) : (
              serviceRequests.map((req) => (
                <div className="gs-req-row" key={req.id}>
                  <div className="gs-req-info">
                    <span className="gs-req-type">
                      {req.type === 'Limpieza' ? <Sparkles size={15} /> : <Package size={15} />}
                    </span>
                    <div>
                      <strong>{req.description}</strong>
                      <small>
                        Solicitada: {req.time} · Habitación {req.room}
                      </small>
                    </div>
                  </div>
                  <div className="gs-req-actions">
                    <span className={`status-pill ${reqStatusClass(req.status)}`}>
                      {req.status}
                    </span>
                    {req.status === 'Pendiente' && (
                      <button
                        className="button small terracotta-btn"
                        onClick={() => cancelServiceRequest(req.id)}
                      >
                        <Ban size={14} /> Cancelar
                      </button>
                    )}
                    {req.status === 'En proceso' && (
                      <span className="gs-req-progress">
                        <Clock size={14} /> En atención
                      </span>
                    )}
                    {req.status === 'Completada' && <Check size={16} className="gs-req-done" />}
                    {req.status === 'Cancelada' && (
                      <span className="gs-req-cancelled">Cancelada</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {showRequestService && (
          <RequestServiceModal
            mode={showRequestService}
            onClose={() => setShowRequestService(null)}
            onSubmit={submitServiceRequest}
          />
        )}
      </>
    );
  }

  // ─── ROOM SERVICE (Food & Beverage) ────────────────────────────
  if (nav === 'Room service') {
    const categories = [...new Set(initialMenu.map((m) => m.category))];
    const filteredMenu =
      menuCat === 'Todos' ? initialMenu : initialMenu.filter((m) => m.category === menuCat);
    return (
      <>
        <div className="gs-rs-layout">
          <div className="panel gs-rs-menu">
            <div className="panel-heading">
              <div>
                <h3>Menú de Room Service</h3>
                <p>Selecciona productos y envía tu pedido</p>
              </div>
            </div>
            <div className="toolbar">
              <div className="filter-dropdown">
                <button className="filter-button">
                  <span>{menuCat}</span>
                  <ChevronDown size={15} />
                </button>
                <div className="filter-menu">
                  <button
                    className={menuCat === 'Todos' ? 'active' : ''}
                    onClick={() => setMenuCat('Todos')}
                  >
                    Todos
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={menuCat === cat ? 'active' : ''}
                      onClick={() => setMenuCat(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="gs-menu-grid">
              {filteredMenu.map((item) => (
                <div
                  className={`gs-menu-card ${!item.available ? 'unavailable' : ''}`}
                  key={item.id}
                >
                  <div className="gs-menu-card-body">
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.description}</p>
                      <span className="gs-menu-price">{money(item.price)}</span>
                    </div>
                    {item.available ? (
                      <button className="button small primary" onClick={() => addToCart(item)}>
                        <Plus size={14} /> Agregar
                      </button>
                    ) : (
                      <span className="status-pill terracotta">No disponible</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <aside className="panel gs-rs-cart">
            <div className="panel-heading">
              <div>
                <h3>Mi pedido</h3>
                <p>Habitacion {currentStay?.roomNumber ?? 'Sin asignar'}</p>
              </div>
              {cart.length > 0 && <span className="status-pill warning">{cart.length} items</span>}
            </div>
            {cart.length === 0 ? (
              <div className="hk-empty">
                <ClipboardList size={22} />
                <p>Tu pedido está vacío</p>
                <small>Selecciona productos del menú para agregarlos</small>
              </div>
            ) : (
              <>
                <div className="gs-cart-list">
                  {cart.map((item) => (
                    <div className="gs-cart-row" key={item.id}>
                      <div className="gs-cart-info">
                        <strong>{item.name}</strong>
                        <small>{money(item.price)} c/u</small>
                      </div>
                      <div className="gs-cart-controls">
                        <button onClick={() => updateCartQty(item.id, -1)}>
                          <X size={12} />
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateCartQty(item.id, 1)}>
                          <Plus size={12} />
                        </button>
                        <strong className="gs-cart-subtotal">
                          {money(item.price * item.quantity)}
                        </strong>
                        <button className="gs-cart-remove" onClick={() => removeFromCart(item.id)}>
                          <Ban size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <label className="hk-form-label">
                  Notas del pedido
                  <textarea
                    className="hk-form-textarea"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Indica preferencias o alergias..."
                  />
                </label>
                <div className="gs-cart-total">
                  <span>Total</span>
                  <strong>{money(cartTotal)}</strong>
                </div>
                <button className="button primary gs-cart-submit" onClick={submitOrder}>
                  <ClipboardList size={16} /> Enviar pedido a habitacion{' '}
                  {currentStay?.roomNumber ?? 'Sin asignar'} <ArrowRight size={16} />
                </button>
              </>
            )}
          </aside>
        </div>
      </>
    );
  }

  // ─── MY REQUESTS & ORDERS ───────────────────────────────────────
  if (nav === 'Mis solicitudes y pedidos') {
    return (
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Mis solicitudes y pedidos</h3>
            <p>Estado de tus solicitudes de servicio y pedidos de Room Service</p>
          </div>
        </div>
        <div className="gs-orders-section">
          <h4>Pedidos de Room Service</h4>
          <div className="gs-orders-list">
            {orders.length === 0 ? (
              <div className="hk-empty">
                <ClipboardList size={22} />
                <p>No tienes pedidos de Room Service</p>
              </div>
            ) : (
              orders.map((order) => {
                const total = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
                const canCancel = order.status === 'Pendiente' || order.status === 'Aceptado';
                return (
                  <div className="gs-order-card" key={order.id}>
                    <div className="gs-order-head">
                      <div>
                        <span className="gs-order-num">Pedido #{order.id}</span>
                        <strong>
                          {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                        </strong>
                        <small>
                          {order.time} · Habitación {order.room}
                        </small>
                      </div>
                      <span className={`status-pill ${orderStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    {order.note && (
                      <div className="gs-order-note">
                        <FileText size={13} /> {order.note}
                      </div>
                    )}
                    <div className="gs-order-foot">
                      <span className="gs-order-total">{money(total)}</span>
                      {canCancel ? (
                        <button
                          className="button small terracotta-btn"
                          onClick={() => setCancelOrderId(order.id)}
                        >
                          <Ban size={14} /> Cancelar
                        </button>
                      ) : order.status === 'Cancelado' ? (
                        <span className="gs-order-cancelled">Pedido cancelado</span>
                      ) : order.status === 'Entregado' ? (
                        <span className="gs-order-delivered">
                          <Check size={15} /> Entregado
                        </span>
                      ) : (
                        <button className="button small secondary" disabled>
                          <Ban size={14} /> Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="gs-orders-section">
          <h4>Solicitudes de servicio</h4>
          <div className="gs-req-list">
            {serviceRequests.length === 0 ? (
              <div className="hk-empty">
                <Sparkles size={22} />
                <p>No tienes solicitudes de servicio</p>
              </div>
            ) : (
              serviceRequests.map((req) => (
                <div className="gs-req-row" key={req.id}>
                  <div className="gs-req-info">
                    <span className="gs-req-type">
                      {req.type === 'Limpieza' ? <Sparkles size={15} /> : <Package size={15} />}
                    </span>
                    <div>
                      <strong>{req.description}</strong>
                      <small>
                        Solicitada: {req.time} · Habitación {req.room}
                      </small>
                    </div>
                  </div>
                  <div className="gs-req-actions">
                    <span className={`status-pill ${reqStatusClass(req.status)}`}>
                      {req.status}
                    </span>
                    {req.status === 'Pendiente' && (
                      <button
                        className="button small terracotta-btn"
                        onClick={() => cancelServiceRequest(req.id)}
                      >
                        <Ban size={14} /> Cancelar
                      </button>
                    )}
                    {req.status === 'En proceso' && (
                      <span className="gs-req-progress">
                        <Clock size={14} /> En atención
                      </span>
                    )}
                    {req.status === 'Completada' && <Check size={16} className="gs-req-done" />}
                    {req.status === 'Cancelada' && (
                      <span className="gs-req-cancelled">Cancelada</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {cancelOrderId !== null && (
          <CancelOrderModal
            orderId={cancelOrderId}
            orderInfo={
              orders
                .find((o) => o.id === cancelOrderId)
                ?.items.map((i) => `${i.quantity}× ${i.name}`)
                .join(', ') ?? ''
            }
            onClose={() => setCancelOrderId(null)}
            onConfirm={() => cancelOrder(cancelOrderId)}
          />
        )}
      </div>
    );
  }

  // ─── NOTIFICATIONS ─────────────────────────────────────────────
  if (nav === 'Notificaciones') {
    return (
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Notificaciones</h3>
            <p>
              {unreadCount > 0
                ? `${unreadCount} notificaciones sin leer`
                : 'Todas tus notificaciones están leídas'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button className="button small secondary" onClick={markAllRead}>
              <Check size={14} /> Marcar todas como leídas
            </button>
          )}
        </div>
        <div className="gs-notif-list">
          {notifications.length === 0 ? (
            <div className="hk-empty">
              <Bell size={22} />
              <p>No tienes notificaciones</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                className={`gs-notif-card ${!n.read ? 'unread' : ''}`}
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
              >
                <div className="gs-notif-dot">
                  {!n.read && <span className="gs-notif-unread-dot" />}
                </div>
                <div className="gs-notif-body">
                  <div className="gs-notif-head">
                    <strong>{n.title}</strong>
                    <span
                      className={`status-pill ${n.category === 'Promoción' ? 'gold' : n.category === 'Pedido' ? 'info' : n.category === 'Servicio' ? 'terracotta' : 'success'}`}
                    >
                      {n.category}
                    </span>
                  </div>
                  <p>{n.message}</p>
                  <small>{n.time}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─── MY PROFILE ────────────────────────────────────────────────
  if (nav === 'Mi perfil') {
    return (
      <>
        <div className="panel" style={{ maxWidth: 580, margin: '0 auto' }}>
          <div className="panel-heading">
            <div>
              <h3>Mi perfil</h3>
              <p>Datos personales registrados</p>
            </div>
            <button className="button small secondary" onClick={() => setShowEditProfile(true)}>
              <Pencil size={14} /> Editar perfil
            </button>
          </div>
          <div className="hk-profile">
            <div className="hk-profile-avatar cream">MC</div>
            <div className="hk-profile-info">
              <h4>
                {profile.name} {profile.lastName}
              </h4>
              <p>Huésped · Hotel Aurora</p>
              <small>{profile.email}</small>
            </div>
          </div>
          <div className="gs-profile-detail">
            <div>
              <span>Nombre</span>
              <strong>{profile.name}</strong>
            </div>
            <div>
              <span>Apellidos</span>
              <strong>{profile.lastName}</strong>
            </div>
            <div>
              <span>Teléfono</span>
              <strong>{profile.phone}</strong>
            </div>
            <div>
              <span>Correo electrónico</span>
              <strong>{profile.email}</strong>
            </div>
            <div>
              <span>Tipo de documento</span>
              <strong>{profile.docType}</strong>
            </div>
            <div>
              <span>Número de documento</span>
              <strong>{profile.docNumber}</strong>
            </div>
            <div>
              <span>Fecha de nacimiento</span>
              <strong>{fmtDate(profile.birthDate)}</strong>
            </div>
            <div>
              <span>Nacionalidad</span>
              <strong>{profile.nationality}</strong>
            </div>
          </div>
        </div>
        {showEditProfile && (
          <EditProfileModal
            profile={profile}
            onClose={() => setShowEditProfile(false)}
            onSave={saveProfile}
          />
        )}
      </>
    );
  }

  // ─── LOG OUT ───────────────────────────────────────────────────
  if (nav === 'Cerrar sesión') {
    return (
      <div className="panel" style={{ maxWidth: 420, margin: '0 auto' }}>
        <div className="hk-empty">
          <UserRound size={22} />
          <p>¿Seguro que deseas cerrar sesión?</p>
          <small>Puedes volver a iniciar sesión cuando quieras.</small>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button className="button secondary" onClick={() => onAction('Cancelado')}>
            Cancelar
          </button>
          <button className="button terracotta-btn" onClick={onLogout}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="hk-empty">
        <Home size={22} />
        <p>Selecciona una opción del menú</p>
      </div>
    </div>
  );
}
