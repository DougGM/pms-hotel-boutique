import { useState } from 'react';
import {
  ArrowRight, Ban, BedDouble, CalendarDays, Download,
  Plus, TriangleAlert, X,
} from 'lucide-react';
import type { Reservation, GuestInfo, ReservationStatus } from '@/app/App';

export type GuestNotification = {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: 'Estancia' | 'Servicio' | 'Pedido' | 'Promoción';
};

export type GuestServiceRequest = {
  id: number;
  type: string;
  description: string;
  time: string;
  status: 'Pendiente' | 'En proceso' | 'Completada' | 'Cancelada';
  room: string;
};

export type GuestMenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
};

export type GuestCartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export type GuestOrder = {
  id: number;
  items: { name: string; quantity: number; price: number }[];
  time: string;
  status: 'Pendiente' | 'Aceptado' | 'En preparación' | 'En camino' | 'Entregado' | 'Cancelado';
  note: string;
  room: string;
};

export const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (d: string) => {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const resStatusClass = (status: ReservationStatus): string =>
  status === 'Confirmada' ? 'success' :
  status === 'Pendiente' ? 'warning' :
  status === 'Check-in' || status === 'Check-out' ? 'info' : 'terracotta';

export const orderStatusClass = (status: string): string =>
  status === 'Pendiente' ? 'warning' :
  status === 'Aceptado' || status === 'En preparación' || status === 'En camino' ? 'info' :
  status === 'Entregado' ? 'success' : 'terracotta';

export const reqStatusClass = (status: string): string =>
  status === 'Pendiente' ? 'warning' :
  status === 'En proceso' ? 'info' :
  status === 'Completada' ? 'success' : 'terracotta';

export function ReservationDetailModal({
  reservation, onClose, onModify, onCancel, onReceipt,
}: {
  reservation: Reservation;
  onClose: () => void;
  onModify: () => void;
  onCancel: () => void;
  onReceipt: () => void;
}) {
  const nights = Math.max(1, Math.round((new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 86400000));
  const total = reservation.rate * nights;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 480, maxWidth: 'calc(100vw - 32px)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">DETALLE DE RESERVA</p><h2>Reserva {reservation.code}</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="gs-detail-status">
          <span className={`status-pill ${resStatusClass(reservation.status)}`}>{reservation.status}</span>
          <span className="gs-detail-room"><BedDouble size={15} /> Habitación {reservation.roomNumber} · {reservation.roomType}</span>
        </div>
        <div className="gs-detail-grid">
          <div><small>Check-in</small><strong>{fmtDate(reservation.checkIn)}</strong></div>
          <div><small>Check-out</small><strong>{fmtDate(reservation.checkOut)}</strong></div>
          <div><small>Noches</small><strong>{nights}</strong></div>
          <div><small>Huéspedes</small><strong>{reservation.guestCount}</strong></div>
          <div><small>Tarifa/noche</small><strong>{money(reservation.rate)}</strong></div>
          <div><small>Total estancia</small><strong>{money(total)}</strong></div>
        </div>
        <div className="gs-detail-section">
          <strong>Titular de la reserva</strong>
          <p>{reservation.guest.name} {reservation.guest.lastName}</p>
          <small>{reservation.guest.email} · {reservation.guest.phone}</small>
        </div>
        {reservation.companions.length > 0 && (
          <div className="gs-detail-section">
            <strong>Acompañantes</strong>
            {reservation.companions.map((c) => (
              <p key={c.id}>{c.name} {c.lastName} · {c.age} años</p>
            ))}
          </div>
        )}
        {reservation.observations && (
          <div className="gs-detail-section">
            <strong>Observaciones</strong>
            <p>{reservation.observations}</p>
          </div>
        )}
        <div className="modal-foot gs-modal-foot" style={{ flexWrap: 'wrap' }}>
          <button className="button secondary" onClick={onClose}>Cerrar</button>
          <button className="button secondary" onClick={onReceipt}><Download size={15} /> Recibo</button>
          {!['Cancelada', 'Anulada', 'Check-out'].includes(reservation.status) && (
            <>
              <button className="button secondary" onClick={onModify}><CalendarDays size={15} /> Modificar</button>
              <button className="button terracotta-btn" onClick={onCancel}><Ban size={15} /> Cancelar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ModifyReservationModal({
  reservation, onClose, onSave,
}: {
  reservation: Reservation;
  onClose: () => void;
  onSave: (updates: { checkIn: string; checkOut: string; guestCount: number; observations: string }) => void;
}) {
  const [checkIn, setCheckIn] = useState(reservation.checkIn);
  const [checkOut, setCheckOut] = useState(reservation.checkOut);
  const [guestCount, setGuestCount] = useState(reservation.guestCount);
  const [observations, setObservations] = useState(reservation.observations);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 440, maxWidth: 'calc(100vw - 32px)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">MODIFICAR RESERVA</p><h2>Reserva {reservation.code}</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="login-helper">Solicita un cambio de fechas o detalles. El hotel confirmará la modificación.</p>
        <label className="hk-form-label">Fecha de check-in<input type="date" className="hk-form-select" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></label>
        <label className="hk-form-label">Fecha de check-out<input type="date" className="hk-form-select" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></label>
        <label className="hk-form-label">Número de huéspedes<input type="number" className="hk-form-select" value={guestCount} min={1} max={4} onChange={(e) => setGuestCount(Number(e.target.value))} /></label>
        <label className="hk-form-label">Observaciones<textarea className="hk-form-textarea" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Indica cualquier detalle adicional..." /></label>
        <div className="modal-foot">
          <button className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button primary" onClick={() => onSave({ checkIn, checkOut, guestCount, observations })}>Guardar cambios <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

export function CancelReservationModal({
  reservation, onClose, onConfirm,
}: {
  reservation: Reservation;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 420, maxWidth: 'calc(100vw - 32px)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">CANCELAR RESERVA</p><h2>Reserva {reservation.code}</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="gs-cancel-warning"><TriangleAlert size={20} /><p>Esta acción no se puede deshacer. Se aplicarán las políticas de cancelación según la tarifa contratada.</p></div>
        <div className="gs-cancel-summary">
          <div><small>Habitación</small><strong>{reservation.roomNumber} · {reservation.roomType}</strong></div>
          <div><small>Estancia</small><strong>{fmtDate(reservation.checkIn)} — {fmtDate(reservation.checkOut)}</strong></div>
        </div>
        <label className="hk-form-label">Motivo de cancelación<textarea className="hk-form-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Indica el motivo de tu cancelación..." /></label>
        <div className="modal-foot">
          <button className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button terracotta-btn" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>Confirmar cancelación</button>
        </div>
      </div>
    </div>
  );
}

export function ReceiptModal({
  reservation, onClose, onDownload,
}: {
  reservation: Reservation;
  onClose: () => void;
  onDownload: () => void;
}) {
  const active = reservation.folio.filter((f) => f.status === 'Activo');
  const charges = active.filter((f) => f.type === 'Cargo').reduce((s, f) => s + f.amount, 0);
  const payments = active.filter((f) => f.type === 'Pago').reduce((s, f) => s + f.amount, 0);
  const deposits = active.filter((f) => f.type === 'Depósito').reduce((s, f) => s + f.amount, 0);
  const balance = charges - payments - deposits;
  const nights = Math.max(1, Math.round((new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 86400000));
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 460, maxWidth: 'calc(100vw - 32px)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">RECIBO DE RESERVA</p><h2>Reserva {reservation.code}</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="gs-receipt">
          <div className="gs-receipt-head">
            <div><strong>Hotel Aurora</strong><small>Sede Centro · RFC AUR850101</small></div>
            <div><small>Recibo</small><strong>#{reservation.code}</strong></div>
          </div>
          <div className="gs-receipt-guest">
            <small>Titular</small>
            <strong>{reservation.guest.name} {reservation.guest.lastName}</strong>
            <span>{reservation.guest.email}</span>
          </div>
          <div className="gs-receipt-stay">
            <div><small>Habitación</small><strong>{reservation.roomNumber} · {reservation.roomType}</strong></div>
            <div><small>Estancia</small><strong>{nights} noches</strong></div>
            <div><small>Check-in</small><strong>{fmtDate(reservation.checkIn)}</strong></div>
            <div><small>Check-out</small><strong>{fmtDate(reservation.checkOut)}</strong></div>
          </div>
          <div className="gs-receipt-folio">
            <strong>Detalle de cargos</strong>
            {active.length === 0 ? <p className="gs-receipt-empty">Sin movimientos registrados</p> : active.map((entry) => (
              <div className="gs-receipt-row" key={entry.id}>
                <div><span className={`status-pill ${entry.type === 'Pago' || entry.type === 'Depósito' ? 'success' : 'warning'}`}>{entry.type}</span><strong>{entry.concept}</strong><small>{fmtDate(entry.date)}{entry.method ? ` · ${entry.method}` : ''}</small></div>
                <span className={entry.type === 'Cargo' ? 'gs-receipt-charge' : 'gs-receipt-payment'}>{entry.type === 'Cargo' ? '+' : '−'}{money(entry.amount)}</span>
              </div>
            ))}
          </div>
          <div className="gs-receipt-totals">
            <div><span>Cargos</span><strong>{money(charges)}</strong></div>
            <div><span>Pagos</span><strong>−{money(payments)}</strong></div>
            <div><span>Depósitos</span><strong>−{money(deposits)}</strong></div>
            <div className="gs-receipt-balance"><span>Saldo pendiente</span><strong>{money(Math.max(0, balance))}</strong></div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="button secondary" onClick={onClose}>Cerrar</button>
          <button className="button primary" onClick={onDownload}><Download size={15} /> Descargar recibo</button>
        </div>
      </div>
    </div>
  );
}

export function LinkReservationModal({
  onClose, onLink,
}: {
  onClose: () => void;
  onLink: (code: string) => void;
}) {
  const [code, setCode] = useState('');
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 420, maxWidth: 'calc(100vw - 32px)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">VINCULAR RESERVA</p><h2>Ingresa tu código</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="login-helper">Si ya tienes una reserva hecha por otro canal, vincúlala con tu código de confirmación para verla en la app.</p>
        <label className="hk-form-label">Código de reserva<input className="hk-form-select" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ej. AUR-2415" /></label>
        <div className="modal-foot">
          <button className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button primary" disabled={!code.trim()} onClick={() => onLink(code.trim())}>Vincular reserva <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

export function EditProfileModal({
  profile, onClose, onSave,
}: {
  profile: GuestInfo;
  onClose: () => void;
  onSave: (profile: GuestInfo) => void;
}) {
  const [data, setData] = useState<GuestInfo>(profile);
  const update = (field: keyof GuestInfo, value: string) => setData((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 460, maxWidth: 'calc(100vw - 32px)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">EDITAR PERFIL</p><h2>Mis datos personales</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="gs-form-grid">
          <label className="hk-form-label">Nombre<input className="hk-form-select" value={data.name} onChange={(e) => update('name', e.target.value)} /></label>
          <label className="hk-form-label">Apellidos<input className="hk-form-select" value={data.lastName} onChange={(e) => update('lastName', e.target.value)} /></label>
          <label className="hk-form-label">Teléfono<input className="hk-form-select" value={data.phone} onChange={(e) => update('phone', e.target.value)} /></label>
          <label className="hk-form-label">Correo electrónico<input className="hk-form-select" value={data.email} onChange={(e) => update('email', e.target.value)} /></label>
          <label className="hk-form-label">Tipo de documento<select className="hk-form-select" value={data.docType} onChange={(e) => update('docType', e.target.value)}><option>INE</option><option>Pasaporte</option><option>Cédula</option><option>Otro</option></select></label>
          <label className="hk-form-label">Número de documento<input className="hk-form-select" value={data.docNumber} onChange={(e) => update('docNumber', e.target.value)} /></label>
          <label className="hk-form-label">Fecha de nacimiento<input type="date" className="hk-form-select" value={data.birthDate} onChange={(e) => update('birthDate', e.target.value)} /></label>
          <label className="hk-form-label">Nacionalidad<input className="hk-form-select" value={data.nationality} onChange={(e) => update('nationality', e.target.value)} /></label>
        </div>
        <div className="modal-foot">
          <button className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button primary" onClick={() => onSave(data)}>Guardar cambios <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

export function CancelOrderModal({
  orderId, orderInfo, onClose, onConfirm,
}: {
  orderId: number;
  orderInfo: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 400, maxWidth: 'calc(100vw - 32px)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">CANCELAR PEDIDO</p><h2>Pedido #{orderId}</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="gs-cancel-warning"><TriangleAlert size={20} /><p>Esta acción no se puede deshacer. El cargo será revertido si aún no se ha procesado.</p></div>
        <div className="gs-cancel-summary"><div><small>Pedido</small><strong>{orderInfo}</strong></div></div>
        <div className="modal-foot">
          <button className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button terracotta-btn" onClick={onConfirm}>Confirmar cancelación</button>
        </div>
      </div>
    </div>
  );
}

export function RequestServiceModal({
  mode, onClose, onSubmit,
}: {
  mode: 'Limpieza' | 'Articulos';
  onClose: () => void;
  onSubmit: (data: { type: string; description: string; time: string }) => void;
}) {
  const cleaningTypes = ['Limpieza de estancia', 'Limpieza de salida', 'Limpieza completa'];
  const timeSlots = ['Lo antes posible', 'Por la mañana', 'Por la tarde', 'Esta noche'];
  const itemTypes = ['Toallas extra', 'Almohadas adicionales', 'Artículos de higiene', 'Cobijas', 'Otros'];
  const [selectedType, setSelectedType] = useState(mode === 'Limpieza' ? cleaningTypes[0] : itemTypes[0]);
  const [selectedTime, setSelectedTime] = useState(timeSlots[0]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const handleSubmit = () => {
    const description = mode === 'Limpieza'
      ? `${selectedType}${notes ? ` — ${notes}` : ''}`
      : `${quantity}× ${selectedType}${notes ? ` — ${notes}` : ''}`;
    onSubmit({ type: mode === 'Limpieza' ? 'Limpieza' : 'Artículos', description, time: selectedTime });
  };
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 440, maxWidth: 'calc(100vw - 32px)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">SOLICITAR SERVICIO</p><h2>{mode === 'Limpieza' ? 'Limpieza de habitación' : 'Artículos adicionales'}</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <label className="hk-form-label">{mode === 'Limpieza' ? 'Tipo de limpieza' : 'Artículo'}
          <div className="modal-options">
            {(mode === 'Limpieza' ? cleaningTypes : itemTypes).map((opt) => (
              <button key={opt} className={selectedType === opt ? 'selected' : ''} onClick={() => setSelectedType(opt)}>{opt}</button>
            ))}
          </div>
        </label>
        {mode === 'Articulos' && (
          <label className="hk-form-label">Cantidad
            <div className="gs-qty-selector">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}><X size={14} /></button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(5, q + 1))}><Plus size={14} /></button>
            </div>
          </label>
        )}
        <label className="hk-form-label">Momento preferido
          <div className="modal-options">
            {timeSlots.map((opt) => (
              <button key={opt} className={selectedTime === opt ? 'selected' : ''} onClick={() => setSelectedTime(opt)}>{opt}</button>
            ))}
          </div>
        </label>
        <label className="hk-form-label">Notas<textarea className="hk-form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Indica cualquier detalle adicional..." /></label>
        <div className="modal-foot">
          <button className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button primary" onClick={handleSubmit}>Enviar solicitud <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}
