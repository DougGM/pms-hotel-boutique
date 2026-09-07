import { useState } from 'react';
import {
  Activity, ArrowRight, Ban, BedDouble, Bell, CalendarDays, Check, ChevronDown,
  ClipboardList, Clock, FileText, Home, LogOut, Package, Pencil,
  Plus, ShieldCheck, Sparkles, UserRound, Wallet, X,
} from 'lucide-react';
import type { Reservation, GuestInfo } from '@/app/App';
import {
  CancelOrderModal, CancelReservationModal, EditProfileModal, LinkReservationModal,
  ModifyReservationModal, ReceiptModal, RequestServiceModal, ReservationDetailModal,
  money, fmtDate, resStatusClass, orderStatusClass, reqStatusClass,
  type GuestNotification, type GuestServiceRequest, type GuestMenuItem,
  type GuestCartItem, type GuestOrder,
} from '@/components/guest/GuestModals';

const guestRoom = '402';

const guestProfile: GuestInfo = {
  name: 'María Fernanda', lastName: 'Castillo', phone: '+52 55 1234 5678',
  email: 'maria.castillo@email.com', docType: 'INE', docNumber: 'MTCC850101',
  birthDate: '1985-01-01', nationality: 'Mexicana',
};

const guestReservations: Reservation[] = [
  {
    id: 1, code: 'AUR-2401', checkIn: '2024-08-26', checkOut: '2024-08-29', roomNumber: '402',
    roomType: 'Suite', rate: 3900, guestCount: 2, status: 'Check-in', origin: 'Online',
    observations: 'Aniversario, arreglo floral solicitado', checkInTime: '14:20',
    checkOutTime: null, cancelReason: '', voidReason: '',
    guest: guestProfile,
    companions: [{ id: 1, name: 'Roberto', lastName: 'Castillo', document: 'RCCJ870203', age: 37 }],
    folio: [
      { id: 101, concept: 'Alojamiento 3 noches', category: 'Alojamiento', amount: 11700, date: '2024-08-26', type: 'Cargo', status: 'Activo' },
      { id: 102, concept: 'Depósito garantía', category: 'Depósito', amount: 3000, date: '2024-08-26', type: 'Depósito', status: 'Activo', method: 'Tarjeta', reference: 'TXN-8821' },
      { id: 103, concept: 'Room service — Desayuno', category: 'Room service', amount: 560, date: '2024-08-27', type: 'Cargo', status: 'Activo' },
    ],
  },
  {
    id: 4, code: 'AUR-2404', checkIn: '2024-08-24', checkOut: '2024-08-26', roomNumber: '307',
    roomType: 'Deluxe', rate: 2450, guestCount: 2, status: 'Check-out', origin: 'Online',
    observations: '', checkInTime: '13:00', checkOutTime: '11:30', cancelReason: '', voidReason: '',
    guest: guestProfile, companions: [],
    folio: [
      { id: 401, concept: 'Alojamiento 2 noches', category: 'Alojamiento', amount: 4900, date: '2024-08-24', type: 'Cargo', status: 'Activo' },
      { id: 402, concept: 'Amenidades — Spa', category: 'Amenidades', amount: 1200, date: '2024-08-25', type: 'Cargo', status: 'Activo' },
      { id: 403, concept: 'Pago final', category: 'Pago', amount: 6100, date: '2024-08-26', type: 'Pago', status: 'Activo', method: 'Tarjeta', reference: 'TXN-9001' },
    ],
  },
];

const guestNotifications: GuestNotification[] = [
  { id: 1, title: 'Solicitud de limpieza recibida', message: 'Tu solicitud de limpieza de estancia ha sido registrada. El equipo de housekeeping la atenderá pronto.', time: 'Hace 15 min', read: false, category: 'Servicio' },
  { id: 2, title: 'Pedido de Room Service en camino', message: 'Tu pedido #1042 (Desayuno Aurora) está en camino a tu habitación.', time: 'Hace 40 min', read: false, category: 'Pedido' },
  { id: 3, title: 'Cargo de Room Service', message: 'Se ha registrado un cargo de $560.00 por consumo de Room Service en tu cuenta.', time: 'Ayer, 18:40', read: false, category: 'Pedido' },
  { id: 4, title: 'Check-in realizado correctamente', message: 'Bienvenida a Hotel Aurora. Tu estancia en la Suite 402 ha comenzado.', time: '26 ago, 14:20', read: true, category: 'Estancia' },
  { id: 5, title: 'Promoción especial: Spa 20% de descuento', message: 'Disfruta de un 20% de descuento en tratamientos de spa durante tu estancia. Válido hasta el 31 de agosto.', time: '25 ago, 10:00', read: true, category: 'Promoción' },
];

const guestServiceRequests: GuestServiceRequest[] = [
  { id: 301, type: 'Limpieza', description: 'Limpieza de estancia — Lo antes posible', time: '10:15', status: 'En proceso', room: guestRoom },
  { id: 302, type: 'Artículos', description: '2× Almohadas adicionales — Por la tarde', time: '09:30', status: 'Pendiente', room: guestRoom },
  { id: 303, type: 'Artículos', description: '1× Toallas extra — Lo antes posible', time: '08:45', status: 'Completada', room: guestRoom },
];

const guestMenu: GuestMenuItem[] = [
  { id: 1, name: 'Desayuno Aurora', description: 'Huevos al gusto, pan artesanal, fruta de temporada y jugo natural', price: 280, category: 'Desayunos', available: true },
  { id: 2, name: 'Huevos Benedictinos', description: 'Dos huevos pochados sobre salmón y pan inglés, salsa holandesa', price: 240, category: 'Desayunos', available: true },
  { id: 3, name: 'Club Sandwich', description: 'Pavo, tocino, lechuga, tomate y huevo en pan tostado', price: 240, category: 'Comidas', available: true },
  { id: 4, name: 'Pasta al Pesto', description: 'Pasta fresca con pesto de albahaca, piñones y parmesano', price: 320, category: 'Comidas', available: true },
  { id: 5, name: 'Salmón Grillado', description: 'Filete de salmón con vegetales al vapor y arroz integral', price: 420, category: 'Comidas', available: true },
  { id: 6, name: 'Tabla de Quesos', description: 'Selección de quesos artesanales, frutos secos y mermelada', price: 390, category: 'Botanas', available: true },
  { id: 7, name: 'Café Americano', description: 'Café de grano recién molido', price: 65, category: 'Bebidas', available: true },
  { id: 8, name: 'Café Latte', description: 'Espresso con leche vaporizada y arte latte', price: 85, category: 'Bebidas', available: true },
  { id: 9, name: 'Jugo Verde', description: 'Apio, espinaca, manzana, jengibre y limón', price: 110, category: 'Bebidas', available: true },
  { id: 10, name: 'Agua Mineral', description: 'Agua mineral con gas, 500 ml', price: 45, category: 'Bebidas', available: true },
  { id: 11, name: 'Cheesecake de Frambuesa', description: 'Pastel de queso con coulis de frambuesa', price: 150, category: 'Postres', available: true },
  { id: 12, name: 'Tiramisú', description: 'Clásico postre italiano con café y mascarpone', price: 140, category: 'Postres', available: false },
];

const guestOrders: GuestOrder[] = [
  { id: 1042, items: [{ name: 'Desayuno Aurora', quantity: 2, price: 280 }, { name: 'Café Americano', quantity: 1, price: 65 }], time: '10:24', status: 'En camino', note: 'Sin nueces, por favor', room: guestRoom },
  { id: 1041, items: [{ name: 'Club Sandwich', quantity: 1, price: 240 }, { name: 'Agua Mineral', quantity: 2, price: 45 }], time: 'Ayer 18:30', status: 'Entregado', note: 'Llevar cubiertos extra', room: guestRoom },
  { id: 1040, items: [{ name: 'Pasta al Pesto', quantity: 1, price: 320 }], time: 'Ayer 14:15', status: 'Entregado', note: '', room: guestRoom },
];

const amenities = [
  { name: 'Desayuno Buffet', description: 'Sabores locales e internacionales cada mañana de 7:00 a 11:00', icon: Sparkles, available: true, schedule: '7:00 — 11:00' },
  { name: 'Wi-Fi de Alta Velocidad', description: 'Conexión gratuita en todo el hotel y áreas comunes', icon: Activity, available: true, schedule: '24 horas' },
  { name: 'Gimnasio & Wellness', description: 'Equipamiento de última generación y clases de yoga matutinas', icon: ShieldCheck, available: true, schedule: '6:00 — 22:00' },
  { name: 'Spa & Masajes', description: 'Tratamientos faciales, masajes de relajación y terapia corporal', icon: BedDouble, available: true, schedule: '10:00 — 20:00' },
  { name: 'Alberca Climatizada', description: 'Alberca exterior con zona de reposo y servicio de toallas', icon: Home, available: true, schedule: '7:00 — 21:00' },
  { name: 'Estacionamiento', description: 'Valet parking incluido para huéspedes con auto', icon: Package, available: true, schedule: '24 horas' },
  { name: 'Business Center', description: 'Computadoras, impresora y salas de reuniones disponibles', icon: FileText, available: true, schedule: '24 horas' },
  { name: 'Lavandería Express', description: 'Servicio de lavandería con entrega en 4 horas', icon: Clock, available: false, schedule: 'Temporalmente fuera de servicio' },
];

export function GuestContent({
  nav, onAction, onLogout,
}: {
  nav: string;
  onAction: (message: string) => void;
  onLogout: () => void;
}) {
  const [reservations, setReservations] = useState<Reservation[]>(guestReservations);
  const [profile, setProfile] = useState<GuestInfo>(guestProfile);
  const [notifications, setNotifications] = useState<GuestNotification[]>(guestNotifications);
  const [serviceRequests, setServiceRequests] = useState<GuestServiceRequest[]>(guestServiceRequests);
  const [orders, setOrders] = useState<GuestOrder[]>(guestOrders);
  const [cart, setCart] = useState<GuestCartItem[]>([]);
  const [orderNote, setOrderNote] = useState('');

  const [detailResId, setDetailResId] = useState<number | null>(null);
  const [modifyResId, setModifyResId] = useState<number | null>(null);
  const [cancelResId, setCancelResId] = useState<number | null>(null);
  const [receiptResId, setReceiptResId] = useState<number | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showRequestService, setShowRequestService] = useState<'Limpieza' | 'Articulos' | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [resFilter, setResFilter] = useState<'Todas' | 'Activas' | 'Pasadas' | 'Canceladas'>('Todas');
  const [menuCat, setMenuCat] = useState('Todos');

  const detailRes = detailResId !== null ? reservations.find((r) => r.id === detailResId) ?? null : null;
  const modifyRes = modifyResId !== null ? reservations.find((r) => r.id === modifyResId) ?? null : null;
  const cancelRes = cancelResId !== null ? reservations.find((r) => r.id === cancelResId) ?? null : null;
  const receiptRes = receiptResId !== null ? reservations.find((r) => r.id === receiptResId) ?? null : null;

  const activeReservations = reservations.filter((r) => !['Cancelada', 'Anulada', 'Check-out'].includes(r.status));
  const pastReservations = reservations.filter((r) => ['Check-out'].includes(r.status));
  const cancelledReservations = reservations.filter((r) => ['Cancelada', 'Anulada'].includes(r.status));
  const currentStay = reservations.find((r) => r.status === 'Check-in') ?? null;

  const filteredReservations = resFilter === 'Todas' ? reservations : resFilter === 'Activas' ? activeReservations : resFilter === 'Pasadas' ? pastReservations : cancelledReservations;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (item: GuestMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };
  const removeFromCart = (id: number) => setCart((prev) => prev.filter((c) => c.id !== id));
  const updateCartQty = (id: number, delta: number) => setCart((prev) => prev.map((c) => c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));

  const submitOrder = () => {
    if (cart.length === 0) return;
    const newOrder: GuestOrder = {
      id: 1043 + orders.length,
      items: cart.map((c) => ({ name: c.name, quantity: c.quantity, price: c.price })),
      time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      status: 'Pendiente',
      note: orderNote,
      room: guestRoom,
    };
    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    setOrderNote('');
    onAction(`Pedido #${newOrder.id} enviado a la habitación ${guestRoom}`);
  };

  const cancelOrder = (orderId: number) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'Cancelado' } : o));
    setCancelOrderId(null);
    onAction(`Pedido #${orderId} cancelado correctamente`);
  };

  const submitServiceRequest = (data: { type: string; description: string; time: string }) => {
    const newReq: GuestServiceRequest = {
      id: 304 + serviceRequests.length,
      type: data.type,
      description: data.description,
      time: data.time,
      status: 'Pendiente',
      room: guestRoom,
    };
    setServiceRequests((prev) => [newReq, ...prev]);
    setShowRequestService(null);
    onAction('Solicitud enviada correctamente');
  };

  const cancelServiceRequest = (reqId: number) => {
    setServiceRequests((prev) => prev.map((r) => r.id === reqId ? { ...r, status: 'Cancelada' } : r));
    onAction('Solicitud cancelada');
  };

  const saveProfile = (updated: GuestInfo) => {
    setProfile(updated);
    setShowEditProfile(false);
    onAction('Perfil actualizado correctamente');
  };

  const saveReservationModify = (id: number, updates: { checkIn: string; checkOut: string; guestCount: number; observations: string }) => {
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, checkIn: updates.checkIn, checkOut: updates.checkOut, guestCount: updates.guestCount, observations: updates.observations } : r));
    setModifyResId(null);
    setDetailResId(null);
    onAction('Modificación de reserva solicitada. El hotel confirmará los cambios.');
  };

  const confirmCancelReservation = (id: number, reason: string) => {
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status: 'Cancelada', cancelReason: reason } : r));
    setCancelResId(null);
    setDetailResId(null);
    onAction('Reserva cancelada correctamente');
  };

  const linkReservation = (code: string) => {
    setShowLink(false);
    onAction(`Reserva ${code} vinculada a tu cuenta`);
  };

  const markNotificationRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };
  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    onAction('Todas las notificaciones marcadas como leídas');
  };

  // ─── HOME / OVERVIEW ───────────────────────────────────────────
  if (nav === 'Inicio') {
    return <><div className="gs-overview">
      <div className="gs-overview-hero">
        <div>
          <span className="status-pill success">Reserva confirmada</span>
          <h4>Suite Aurora · Habitación {guestRoom}</h4>
          <p>21 ago — 28 ago, 2024 · 2 adultos</p>
        </div>
        <div className="stay-art"><BedDouble size={48} strokeWidth={1.2} /></div>
      </div>
      <div className="gs-overview-details">
        <div><span>Próximo evento</span><strong>Check-out</strong><small>28 ago · 12:00 hrs</small></div>
        <div><span>Saldo pendiente</span><strong>$420.00</strong><small>Se carga al finalizar tu estancia</small></div>
      </div>
      <div className="gs-overview-quick">
        <button onClick={() => setShowRequestService('Limpieza')}><span className="gs-quick-icon sage"><Sparkles size={18} /></span><strong>Limpieza</strong><small>Solicitar servicio</small></button>
        <button onClick={() => setShowRequestService('Articulos')}><span className="gs-quick-icon gold"><Package size={18} /></span><strong>Artículos</strong><small>Toallas, almohadas</small></button>
        <button onClick={() => onAction('Redirigiendo a Room Service')}><span className="gs-quick-icon terracotta"><ClipboardList size={18} /></span><strong>Room Service</strong><small>Pide a tu cuarto</small></button>
        <button onClick={() => onAction('Redirigiendo a amenidades')}><span className="gs-quick-icon blue"><Activity size={18} /></span><strong>Amenidades</strong><small>Ver disponibles</small></button>
      </div>
      <div className="gs-overview-notif">
        <div className="gs-overview-notif-head"><div><h3>Actividad reciente</h3><p>Últimos movimientos de tu estancia</p></div>{unreadCount > 0 && <span className="status-pill warning">{unreadCount} sin leer</span>}</div>
        <div className="activity-list">
          {notifications.slice(0, 3).map((n) => (
            <div className="activity-item" key={n.id}>
              <span className={`activity-dot ${n.read ? 'info' : 'success'}`} />
              <div><p>{n.title}</p><small>{n.time}</small></div>
            </div>
          ))}
        </div>
      </div>
    </div>
    {showRequestService && <RequestServiceModal mode={showRequestService} onClose={() => setShowRequestService(null)} onSubmit={submitServiceRequest} />}
    </>;
  }

  // ─── MY RESERVATIONS ───────────────────────────────────────────
  if (nav === 'Mis reservas') {
    return <><div className="panel">
      <div className="panel-heading">
        <div><h3>Mis reservas</h3><p>Consulta y gestiona todas tus reservas</p></div>
        <button className="button small primary" onClick={() => setShowLink(true)}><Plus size={15} /> Vincular reserva</button>
      </div>
      <div className="toolbar">
        <div className="filter-dropdown">
          <button className="filter-button"><span>{resFilter}</span><ChevronDown size={15} /></button>
          <div className="filter-menu">
            <button className={resFilter === 'Todas' ? 'active' : ''} onClick={() => setResFilter('Todas')}>Todas</button>
            <button className={resFilter === 'Activas' ? 'active' : ''} onClick={() => setResFilter('Activas')}>Activas</button>
            <button className={resFilter === 'Pasadas' ? 'active' : ''} onClick={() => setResFilter('Pasadas')}>Pasadas</button>
            <button className={resFilter === 'Canceladas' ? 'active' : ''} onClick={() => setResFilter('Canceladas')}>Canceladas</button>
          </div>
        </div>
      </div>
      <div className="gs-res-list">
        {filteredReservations.length === 0 ? (
          <div className="hk-empty"><CalendarDays size={22} /><p>No tienes reservas en esta categoría</p></div>
        ) : filteredReservations.map((res) => {
          const nights = Math.max(1, Math.round((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / 86400000));
          return (
            <article className="gs-res-card" key={res.id} onClick={() => setDetailResId(res.id)}>
              <div className="gs-res-card-head">
                <div><span className="gs-res-code">{res.code}</span><strong>Habitación {res.roomNumber} · {res.roomType}</strong><small>{fmtDate(res.checkIn)} — {fmtDate(res.checkOut)} · {nights} noches</small></div>
                <span className={`status-pill ${resStatusClass(res.status)}`}>{res.status}</span>
              </div>
              <div className="gs-res-card-meta">
                <span><BedDouble size={14} /> {res.guestCount} huéspedes</span>
                <span><Wallet size={14} /> {money(res.rate * nights)}</span>
                <span><CalendarDays size={14} /> {res.origin}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
    {detailRes && <ReservationDetailModal reservation={detailRes} onClose={() => setDetailResId(null)} onModify={() => { setDetailResId(null); setModifyResId(detailRes.id); }} onCancel={() => { setDetailResId(null); setCancelResId(detailRes.id); }} onReceipt={() => { setDetailResId(null); setReceiptResId(detailRes.id); }} />}
    {modifyRes && <ModifyReservationModal reservation={modifyRes} onClose={() => setModifyResId(null)} onSave={(updates) => saveReservationModify(modifyRes.id, updates)} />}
    {cancelRes && <CancelReservationModal reservation={cancelRes} onClose={() => setCancelResId(null)} onConfirm={(reason) => confirmCancelReservation(cancelRes.id, reason)} />}
    {receiptRes && <ReceiptModal reservation={receiptRes} onClose={() => setReceiptResId(null)} onDownload={() => { setReceiptResId(null); onAction('Recibo descargado en formato PDF'); }} />}
    {showLink && <LinkReservationModal onClose={() => setShowLink(false)} onLink={linkReservation} />}
    </>;
  }

  // ─── MY STAY ───────────────────────────────────────────────────
  if (nav === 'Mi estancia') {
    if (!currentStay) {
      return <div className="panel"><div className="hk-empty"><BedDouble size={22} /><p>No tienes una estancia activa en este momento</p><button className="button primary" style={{ marginTop: 'var(--space-7)' }} onClick={() => setShowLink(true)}>Vincular una reserva</button></div></div>;
    }
    const nights = Math.max(1, Math.round((new Date(currentStay.checkOut).getTime() - new Date(currentStay.checkIn).getTime()) / 86400000));
    return <><div className="gs-stay-layout">
      <div className="panel gs-stay-main">
        <div className="panel-heading"><div><h3>Mi estancia</h3><p>Detalles de tu estancia actual</p></div><span className={`status-pill ${resStatusClass(currentStay.status)}`}>{currentStay.status}</span></div>
        <div className="gs-stay-hero">
          <div className="stay-art"><BedDouble size={48} strokeWidth={1.2} /></div>
          <div><h4>Suite Aurora · Habitación {currentStay.roomNumber}</h4><p>{fmtDate(currentStay.checkIn)} — {fmtDate(currentStay.checkOut)}</p><small>{nights} noches · {currentStay.guestCount} huéspedes</small></div>
        </div>
        <div className="gs-stay-info">
          <div><small>Check-in</small><strong>{fmtDate(currentStay.checkIn)}</strong>{currentStay.checkInTime && <span>{currentStay.checkInTime} hrs</span>}</div>
          <div><small>Check-out</small><strong>{fmtDate(currentStay.checkOut)}</strong><span>12:00 hrs</span></div>
          <div><small>Tarifa/noche</small><strong>{money(currentStay.rate)}</strong></div>
          <div><small>Total estancia</small><strong>{money(currentStay.rate * nights)}</strong></div>
        </div>
        <div className="gs-stay-services">
          <h4>Servicios contratados</h4>
          <div className="gs-stay-service-list">
            <div className="gs-stay-service-item"><span className="gs-quick-icon sage"><Sparkles size={16} /></span><div><strong>Desayuno incluido</strong><small>Servicio diario de 7:00 a 11:00</small></div><Check size={16} /></div>
            <div className="gs-stay-service-item"><span className="gs-quick-icon blue"><Activity size={16} /></span><div><strong>Wi-Fi de alta velocidad</strong><small>Conexión gratuita en todo el hotel</small></div><Check size={16} /></div>
            <div className="gs-stay-service-item"><span className="gs-quick-icon gold"><ShieldCheck size={16} /></span><div><strong>Acceso a gimnasio y spa</strong><small>Incluido en tu tarifa</small></div><Check size={16} /></div>
            {currentStay.observations && <div className="gs-stay-obs"><FileText size={14} /><p>{currentStay.observations}</p></div>}
          </div>
        </div>
      </div>
      <aside className="panel gs-stay-side">
        <div className="panel-heading"><div><h3>Acciones rápidas</h3></div></div>
        <div className="gs-stay-actions">
          <button className="button secondary" onClick={() => setShowRequestService('Limpieza')}><Sparkles size={15} /> Solicitar limpieza</button>
          <button className="button secondary" onClick={() => setShowRequestService('Articulos')}><Package size={15} /> Pedir artículos</button>
          <button className="button secondary" onClick={() => onAction('Redirigiendo a Room Service')}><ClipboardList size={15} /> Room Service</button>
          <button className="button secondary" onClick={() => setDetailResId(currentStay.id)}><FileText size={15} /> Ver mi reserva</button>
        </div>
        <div className="gs-stay-side-info">
          <strong>Saldo pendiente</strong>
          <span className="gs-stay-balance">{money(420)}</span>
          <small>Se carga al finalizar tu estancia</small>
        </div>
      </aside>
    </div>
    {showRequestService && <RequestServiceModal mode={showRequestService} onClose={() => setShowRequestService(null)} onSubmit={submitServiceRequest} />}
    {detailRes && <ReservationDetailModal reservation={detailRes} onClose={() => setDetailResId(null)} onModify={() => { setDetailResId(null); setModifyResId(detailRes.id); }} onCancel={() => { setDetailResId(null); setCancelResId(detailRes.id); }} onReceipt={() => { setDetailResId(null); setReceiptResId(detailRes.id); }} />}
    </>;
  }

  // ─── AMENITIES ─────────────────────────────────────────────────
  if (nav === 'Amenidades') {
    return <div className="panel">
      <div className="panel-heading"><div><h3>Amenidades del hotel</h3><p>Todo lo que puedes disfrutar durante tu estancia</p></div></div>
      <div className="gs-amenities-grid">
        {amenities.map((am) => {
          const Icon = am.icon;
          return (
            <div className={`gs-amenity-card ${!am.available ? 'unavailable' : ''}`} key={am.name}>
              <div className="gs-amenity-icon"><Icon size={22} /></div>
              <div className="gs-amenity-body">
                <div><strong>{am.name}</strong>{am.available ? <span className="status-pill success">Disponible</span> : <span className="status-pill terracotta">No disponible</span>}</div>
                <p>{am.description}</p>
                <small><Clock size={12} /> {am.schedule}</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>;
  }

  // ─── ROOM SERVICES (Cleaning + Items) ──────────────────────────
  if (nav === 'Servicios de habitación') {
    return <><div className="panel">
      <div className="panel-heading"><div><h3>Servicios de habitación</h3><p>Solicita limpieza o artículos adicionales</p></div>
        <div className="gs-heading-actions">
          <button className="button small primary" onClick={() => setShowRequestService('Limpieza')}><Sparkles size={15} /> Solicitar limpieza</button>
          <button className="button small secondary" onClick={() => setShowRequestService('Articulos')}><Package size={15} /> Pedir artículos</button>
        </div>
      </div>
      <div className="gs-req-summary">
        <div><span className="status-pill warning">Pendientes</span><strong>{serviceRequests.filter((r) => r.status === 'Pendiente').length}</strong></div>
        <div><span className="status-pill info">En proceso</span><strong>{serviceRequests.filter((r) => r.status === 'En proceso').length}</strong></div>
        <div><span className="status-pill success">Completadas</span><strong>{serviceRequests.filter((r) => r.status === 'Completada').length}</strong></div>
      </div>
      <div className="gs-req-list">
        {serviceRequests.length === 0 ? (
          <div className="hk-empty"><ClipboardList size={22} /><p>No tienes solicitudes de servicio</p></div>
        ) : serviceRequests.map((req) => (
          <div className="gs-req-row" key={req.id}>
            <div className="gs-req-info">
              <span className="gs-req-type">{req.type === 'Limpieza' ? <Sparkles size={15} /> : <Package size={15} />}</span>
              <div><strong>{req.description}</strong><small>Solicitada: {req.time} · Habitación {req.room}</small></div>
            </div>
            <div className="gs-req-actions">
              <span className={`status-pill ${reqStatusClass(req.status)}`}>{req.status}</span>
              {req.status === 'Pendiente' && <button className="button small terracotta-btn" onClick={() => cancelServiceRequest(req.id)}><Ban size={14} /> Cancelar</button>}
              {req.status === 'En proceso' && <span className="gs-req-progress"><Clock size={14} /> En atención</span>}
              {req.status === 'Completada' && <Check size={16} className="gs-req-done" />}
              {req.status === 'Cancelada' && <span className="gs-req-cancelled">Cancelada</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
    {showRequestService && <RequestServiceModal mode={showRequestService} onClose={() => setShowRequestService(null)} onSubmit={submitServiceRequest} />}
    </>;
  }

  // ─── ROOM SERVICE (Food & Beverage) ────────────────────────────
  if (nav === 'Room service') {
    const categories = [...new Set(guestMenu.map((m) => m.category))];
    const filteredMenu = menuCat === 'Todos' ? guestMenu : guestMenu.filter((m) => m.category === menuCat);
    return <><div className="gs-rs-layout">
      <div className="panel gs-rs-menu">
        <div className="panel-heading"><div><h3>Menú de Room Service</h3><p>Selecciona productos y envía tu pedido</p></div></div>
        <div className="toolbar">
          <div className="filter-dropdown">
            <button className="filter-button"><span>{menuCat}</span><ChevronDown size={15} /></button>
            <div className="filter-menu">
              <button className={menuCat === 'Todos' ? 'active' : ''} onClick={() => setMenuCat('Todos')}>Todos</button>
              {categories.map((cat) => <button key={cat} className={menuCat === cat ? 'active' : ''} onClick={() => setMenuCat(cat)}>{cat}</button>)}
            </div>
          </div>
        </div>
        <div className="gs-menu-grid">
          {filteredMenu.map((item) => (
            <div className={`gs-menu-card ${!item.available ? 'unavailable' : ''}`} key={item.id}>
              <div className="gs-menu-card-body">
                <div><strong>{item.name}</strong><p>{item.description}</p><span className="gs-menu-price">{money(item.price)}</span></div>
                {item.available
                  ? <button className="button small primary" onClick={() => addToCart(item)}><Plus size={14} /> Agregar</button>
                  : <span className="status-pill terracotta">No disponible</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="panel gs-rs-cart">
        <div className="panel-heading"><div><h3>Mi pedido</h3><p>Habitación {guestRoom}</p></div>{cart.length > 0 && <span className="status-pill warning">{cart.length} items</span>}</div>
        {cart.length === 0 ? (
          <div className="hk-empty"><ClipboardList size={22} /><p>Tu pedido está vacío</p><small>Selecciona productos del menú para agregarlos</small></div>
        ) : (
          <>
            <div className="gs-cart-list">
              {cart.map((item) => (
                <div className="gs-cart-row" key={item.id}>
                  <div className="gs-cart-info"><strong>{item.name}</strong><small>{money(item.price)} c/u</small></div>
                  <div className="gs-cart-controls">
                    <button onClick={() => updateCartQty(item.id, -1)}><X size={12} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateCartQty(item.id, 1)}><Plus size={12} /></button>
                    <strong className="gs-cart-subtotal">{money(item.price * item.quantity)}</strong>
                    <button className="gs-cart-remove" onClick={() => removeFromCart(item.id)}><Ban size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
            <label className="hk-form-label">Notas del pedido<textarea className="hk-form-textarea" value={orderNote} onChange={(e) => setOrderNote(e.target.value)} placeholder="Indica preferencias o alergias..." /></label>
            <div className="gs-cart-total"><span>Total</span><strong>{money(cartTotal)}</strong></div>
            <button className="button primary gs-cart-submit" onClick={submitOrder}><ClipboardList size={16} /> Enviar pedido a habitación {guestRoom} <ArrowRight size={16} /></button>
          </>
        )}
      </aside>
    </div>
    </>;
  }

  // ─── MY REQUESTS & ORDERS ───────────────────────────────────────
  if (nav === 'Mis solicitudes y pedidos') {
    return <div className="panel">
      <div className="panel-heading"><div><h3>Mis solicitudes y pedidos</h3><p>Estado de tus solicitudes de servicio y pedidos de Room Service</p></div></div>
      <div className="gs-orders-section">
        <h4>Pedidos de Room Service</h4>
        <div className="gs-orders-list">
          {orders.length === 0 ? (
            <div className="hk-empty"><ClipboardList size={22} /><p>No tienes pedidos de Room Service</p></div>
          ) : orders.map((order) => {
            const total = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
            const canCancel = order.status === 'Pendiente' || order.status === 'Aceptado';
            return (
              <div className="gs-order-card" key={order.id}>
                <div className="gs-order-head">
                  <div><span className="gs-order-num">Pedido #{order.id}</span><strong>{order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</strong><small>{order.time} · Habitación {order.room}</small></div>
                  <span className={`status-pill ${orderStatusClass(order.status)}`}>{order.status}</span>
                </div>
                {order.note && <div className="gs-order-note"><FileText size={13} /> {order.note}</div>}
                <div className="gs-order-foot">
                  <span className="gs-order-total">{money(total)}</span>
                  {canCancel
                    ? <button className="button small terracotta-btn" onClick={() => setCancelOrderId(order.id)}><Ban size={14} /> Cancelar</button>
                    : order.status === 'Cancelado'
                      ? <span className="gs-order-cancelled">Pedido cancelado</span>
                      : order.status === 'Entregado'
                        ? <span className="gs-order-delivered"><Check size={15} /> Entregado</span>
                        : <button className="button small secondary" disabled><Ban size={14} /> Cancelar</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="gs-orders-section">
        <h4>Solicitudes de servicio</h4>
        <div className="gs-req-list">
          {serviceRequests.length === 0 ? (
            <div className="hk-empty"><Sparkles size={22} /><p>No tienes solicitudes de servicio</p></div>
          ) : serviceRequests.map((req) => (
            <div className="gs-req-row" key={req.id}>
              <div className="gs-req-info">
                <span className="gs-req-type">{req.type === 'Limpieza' ? <Sparkles size={15} /> : <Package size={15} />}</span>
                <div><strong>{req.description}</strong><small>Solicitada: {req.time} · Habitación {req.room}</small></div>
              </div>
              <div className="gs-req-actions">
                <span className={`status-pill ${reqStatusClass(req.status)}`}>{req.status}</span>
                {req.status === 'Pendiente' && <button className="button small terracotta-btn" onClick={() => cancelServiceRequest(req.id)}><Ban size={14} /> Cancelar</button>}
                {req.status === 'En proceso' && <span className="gs-req-progress"><Clock size={14} /> En atención</span>}
                {req.status === 'Completada' && <Check size={16} className="gs-req-done" />}
                {req.status === 'Cancelada' && <span className="gs-req-cancelled">Cancelada</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {cancelOrderId !== null && <CancelOrderModal orderId={cancelOrderId} orderInfo={orders.find((o) => o.id === cancelOrderId)?.items.map((i) => `${i.quantity}× ${i.name}`).join(', ') ?? ''} onClose={() => setCancelOrderId(null)} onConfirm={() => cancelOrder(cancelOrderId)} />}
    </div>;
  }

  // ─── NOTIFICATIONS ─────────────────────────────────────────────
  if (nav === 'Notificaciones') {
    return <div className="panel">
      <div className="panel-heading">
        <div><h3>Notificaciones</h3><p>{unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : 'Todas tus notificaciones están leídas'}</p></div>
        {unreadCount > 0 && <button className="button small secondary" onClick={markAllRead}><Check size={14} /> Marcar todas como leídas</button>}
      </div>
      <div className="gs-notif-list">
        {notifications.length === 0 ? (
          <div className="hk-empty"><Bell size={22} /><p>No tienes notificaciones</p></div>
        ) : notifications.map((n) => (
          <div className={`gs-notif-card ${!n.read ? 'unread' : ''}`} key={n.id} onClick={() => markNotificationRead(n.id)}>
            <div className="gs-notif-dot">{!n.read && <span className="gs-notif-unread-dot" />}</div>
            <div className="gs-notif-body">
              <div className="gs-notif-head"><strong>{n.title}</strong><span className={`status-pill ${n.category === 'Promoción' ? 'gold' : n.category === 'Pedido' ? 'info' : n.category === 'Servicio' ? 'terracotta' : 'success'}`}>{n.category}</span></div>
              <p>{n.message}</p>
              <small>{n.time}</small>
            </div>
          </div>
        ))}
      </div>
    </div>;
  }

  // ─── MY PROFILE ────────────────────────────────────────────────
  if (nav === 'Mi perfil') {
    return <><div className="panel" style={{ maxWidth: 'var(--size-legacy-580)', margin: '0 auto' }}>
      <div className="panel-heading"><div><h3>Mi perfil</h3><p>Datos personales registrados</p></div>
        <button className="button small secondary" onClick={() => setShowEditProfile(true)}><Pencil size={14} /> Editar perfil</button>
      </div>
      <div className="hk-profile">
        <div className="hk-profile-avatar cream">MC</div>
        <div className="hk-profile-info">
          <h4>{profile.name} {profile.lastName}</h4>
          <p>Huésped · Hotel Aurora</p>
          <small>{profile.email}</small>
        </div>
      </div>
      <div className="gs-profile-detail">
        <div><span>Nombre</span><strong>{profile.name}</strong></div>
        <div><span>Apellidos</span><strong>{profile.lastName}</strong></div>
        <div><span>Teléfono</span><strong>{profile.phone}</strong></div>
        <div><span>Correo electrónico</span><strong>{profile.email}</strong></div>
        <div><span>Tipo de documento</span><strong>{profile.docType}</strong></div>
        <div><span>Número de documento</span><strong>{profile.docNumber}</strong></div>
        <div><span>Fecha de nacimiento</span><strong>{fmtDate(profile.birthDate)}</strong></div>
        <div><span>Nacionalidad</span><strong>{profile.nationality}</strong></div>
      </div>
    </div>
    {showEditProfile && <EditProfileModal profile={profile} onClose={() => setShowEditProfile(false)} onSave={saveProfile} />}
    </>;
  }

  // ─── LOG OUT ───────────────────────────────────────────────────
  if (nav === 'Cerrar sesión') {
    return <div className="panel" style={{ maxWidth: 'var(--size-legacy-420)', margin: '0 auto' }}>
      <div className="hk-empty"><UserRound size={22} /><p>¿Seguro que deseas cerrar sesión?</p><small>Puedes volver a iniciar sesión cuando quieras.</small></div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-7)' }}>
        <button className="button secondary" onClick={() => onAction('Cancelado')}>Cancelar</button>
        <button className="button terracotta-btn" onClick={onLogout}><LogOut size={16} /> Cerrar sesión</button>
      </div>
    </div>;
  }

  return <div className="panel"><div className="hk-empty"><Home size={22} /><p>Selecciona una opción del menú</p></div></div>;
}
