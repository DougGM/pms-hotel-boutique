import { useState } from 'react';
import { TableFrame } from '@/shared/components/DataTable';
import { Ban, BedDouble, Check, Printer, TriangleAlert, X } from 'lucide-react';
import type { Companion, FolioEntry, GuestInfo, PaymentMethod, RecRoom, Reservation } from '@/app/App';

const money = (n: number) => `$${n.toLocaleString('es-MX')}`;
const emptyGuest: GuestInfo = { name: '', lastName: '', phone: '', email: '', docType: 'INE', docNumber: '', birthDate: '', nationality: 'Mexicana' };

type Totals = { charges: number; deposits: number; payments: number; balance: number };

const fieldClass = (err?: string) => `rc-input${err ? ' error' : ''}`;

/* ---------- New Reservation / Walk-in ---------- */
export function ReservationFormModal({
  nextCode, rooms, hasConflict, isRoomBlocked, onSave, onClose, walkin, nights, folioTotals,
}: {
  nextCode: string;
  rooms: RecRoom[];
  hasConflict: (room: string, ci: string, co: string, excludeId?: number) => boolean;
  isRoomBlocked: (room: string, ci: string, co: string) => boolean;
  onSave: (res: Reservation) => void;
  onClose: () => void;
  walkin?: boolean;
  nights: (ci: string, co: string) => number;
  folioTotals: (folio: FolioEntry[]) => Totals;
}) {
  const [guest, setGuest] = useState<GuestInfo>({ ...emptyGuest });
  const [checkIn, setCheckIn] = useState('2024-08-31');
  const [checkOut, setCheckOut] = useState('2024-09-02');
  const [roomNumber, setRoomNumber] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [origin, setOrigin] = useState(walkin ? 'Walk-in' : 'Teléfono');
  const [observations, setObservations] = useState('');
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [compName, setCompName] = useState('');
  const [compDoc, setCompDoc] = useState('');
  const [compAge, setCompAge] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);

  const availableRooms = rooms.filter((r) => r.status === 'Disponible');
  const selectedRoom = rooms.find((r) => r.number === roomNumber);
  const n = nights(checkIn, checkOut);
  const total = selectedRoom ? selectedRoom.rate * n : 0;

  const conflict = roomNumber && hasConflict(roomNumber, checkIn, checkOut);
  const blocked = roomNumber && isRoomBlocked(roomNumber, checkIn, checkOut);
  const capacityExceeded = selectedRoom ? guestCount + companions.length > selectedRoom.capacity : false;

  const addCompanion = () => {
    if (!compName.trim()) return;
    setCompanions((c) => [...c, { id: Date.now() + c.length, name: compName.split(' ')[0], lastName: compName.split(' ')[1] ?? '', document: compDoc, age: Number(compAge) || 0 }]);
    setCompName(''); setCompDoc(''); setCompAge('');
  };
  const removeCompanion = (id: number) => setCompanions((c) => c.filter((x) => x.id !== id));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!guest.name.trim()) e.name = 'Nombre obligatorio';
    if (!guest.lastName.trim()) e.lastName = 'Apellido obligatorio';
    if (!guest.phone.trim()) e.phone = 'Teléfono obligatorio';
    if (!checkIn || !checkOut) e.dates = 'Fechas obligatorias';
    if (new Date(checkOut) <= new Date(checkIn)) e.dates = 'La salida debe ser posterior a la entrada';
    if (!roomNumber) e.room = 'Selecciona una habitación';
    if (conflict) e.room = 'La habitación ya tiene una reserva en esas fechas';
    if (blocked) e.room = 'La habitación está bloqueada en esas fechas';
    if (capacityExceeded) e.capacity = `Excede la capacidad (${selectedRoom?.capacity})`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const room = rooms.find((r) => r.number === roomNumber)!;
    const res: Reservation = {
      id: Date.now(),
      code: nextCode,
      guest, companions, checkIn, checkOut,
      roomNumber: room.number, roomType: room.type, rate: room.rate, guestCount,
      status: 'Confirmada', origin, observations,
      folio: [{ id: Date.now(), concept: `Alojamiento ${n} ${n === 1 ? 'noche' : 'noches'}`, category: 'Alojamiento', amount: total, date: checkIn, type: 'Cargo', status: 'Activo' }],
      cancelReason: '', voidReason: '', checkInTime: null, checkOutTime: null,
    };
    onSave(res);
  };

  if (showSummary) {
    return (
      <div className="modal-backdrop" onMouseDown={onClose}>
        <div className="modal" style={{ width: 'var(--size-legacy-460)' }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal-head"><div><p className="eyebrow">RESUMEN DE RESERVA</p><h2>{nextCode}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
          <div className="rc-summary-box">
            <div><small>Huésped</small><span>{guest.name} {guest.lastName}</span></div>
            <div><small>Estadía</small><span>{checkIn} → {checkOut} · {n} {n === 1 ? 'noche' : 'noches'}</span></div>
            <div><small>Habitación</small><span>{roomNumber} · {selectedRoom?.type}</span></div>
            <div><small>Huéspedes</small><span>{guestCount + companions.length}</span></div>
            <div><small>Origen</small><span>{origin}</span></div>
            <div className="rc-summary-total"><small>Total alojamiento</small><strong>{money(total)}</strong></div>
          </div>
          <div className="modal-foot">
            <button className="button secondary" onClick={() => setShowSummary(false)}>Volver</button>
            <button className="button primary" onClick={handleSave}><Check size={16} /> Confirmar reserva</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal rc-form-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">{walkin ? 'WALK-IN' : 'NUEVA RESERVA'}</p><h2>{walkin ? 'Registro walk-in' : 'Crear reserva manual'}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="rc-form-scroll">
          <h4 className="rc-form-section-title">Datos del huésped</h4>
          <div className="rc-form-grid">
            <label className="rc-field"><span>Nombre</span><input className={fieldClass(errors.name)} value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />{errors.name && <small className="rc-field-error">{errors.name}</small>}</label>
            <label className="rc-field"><span>Apellido</span><input className={fieldClass(errors.lastName)} value={guest.lastName} onChange={(e) => setGuest({ ...guest, lastName: e.target.value })} />{errors.lastName && <small className="rc-field-error">{errors.lastName}</small>}</label>
            <label className="rc-field"><span>Teléfono</span><input className={fieldClass(errors.phone)} value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />{errors.phone && <small className="rc-field-error">{errors.phone}</small>}</label>
            <label className="rc-field"><span>Correo</span><input value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} /></label>
          </div>

          <h4 className="rc-form-section-title">Estadía</h4>
          <div className="rc-form-grid">
            <label className="rc-field"><span>Entrada</span><input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></label>
            <label className="rc-field"><span>Salida</span><input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></label>
            <label className="rc-field"><span>Huéspedes</span><input type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value) || 1)} /></label>
            <label className="rc-field"><span>Origen / canal</span><select value={origin} onChange={(e) => setOrigin(e.target.value)}>{!walkin && <option>Teléfono</option>}{!walkin && <option>Presencial</option>}{!walkin && <option>Online</option>}<option>Walk-in</option></select></label>
          </div>
          {errors.dates && <small className="rc-field-error">{errors.dates}</small>}

          <h4 className="rc-form-section-title">Habitación</h4>
          <div className="rc-room-select-list">
            {availableRooms.length === 0 && <div className="hk-empty"><BedDouble size={22} /><p>No hay habitaciones disponibles</p></div>}
            {availableRooms.map((r) => {
              const c = hasConflict(r.number, checkIn, checkOut);
              const b = isRoomBlocked(r.number, checkIn, checkOut);
              const disabled = c || b;
              return (
                <button key={r.id} className={`rc-room-option ${roomNumber === r.number ? 'selected' : ''} ${disabled ? 'disabled' : ''}`} disabled={disabled} onClick={() => setRoomNumber(r.number)}>
                  <div><strong>Hab. {r.number}</strong><span>{r.type} · cap. {r.capacity} · {money(r.rate)}/noche</span></div>
                  {disabled && <small className="rc-room-unavailable">{b ? 'Bloqueada' : 'Ocupada'}</small>}
                </button>
              );
            })}
          </div>
          {errors.room && <small className="rc-field-error">{errors.room}</small>}
          {errors.capacity && <small className="rc-field-error">{errors.capacity}</small>}
          {selectedRoom && <div className="rc-rate-preview">Tarifa: {money(selectedRoom.rate)} × {n} {n === 1 ? 'noche' : 'noches'} = <strong>{money(total)}</strong></div>}

          <h4 className="rc-form-section-title">Acompañantes</h4>
          <div className="rc-comp-add">
            <input placeholder="Nombre y apellido" value={compName} onChange={(e) => setCompName(e.target.value)} />
            <input placeholder="Documento" value={compDoc} onChange={(e) => setCompDoc(e.target.value)} />
            <input placeholder="Edad" type="number" className="rc-input-narrow" value={compAge} onChange={(e) => setCompAge(e.target.value)} />
            <button className="button small secondary" onClick={addCompanion}><Check size={14} /></button>
          </div>
          {companions.length > 0 && <div className="rc-comp-list">{companions.map((c) => <div className="rc-comp-item" key={c.id}><span>{c.name} {c.lastName} · {c.document} · {c.age} años</span><button onClick={() => removeCompanion(c.id)}><X size={13} /></button></div>)}</div>}

          <label className="rc-field rc-field-full"><span>Observaciones</span><textarea value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Notas adicionales..." /></label>
        </div>
        <div className="modal-foot">
          <button className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button primary" onClick={() => { if (validate()) setShowSummary(true); }}><Check size={16} /> Ver resumen</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Check-in ---------- */
export function CheckinModal({
  reservation, rooms, onClose, onCheckin,
}: {
  reservation: Reservation;
  rooms: RecRoom[];
  onClose: () => void;
  onCheckin: (id: number, updates: Partial<GuestInfo>, companions: Companion[], res: Reservation) => void;
}) {
  const [docType, setDocType] = useState(reservation.guest.docType || 'INE');
  const [docNumber, setDocNumber] = useState(reservation.guest.docNumber || '');
  const [birthDate, setBirthDate] = useState(reservation.guest.birthDate || '');
  const [nationality, setNationality] = useState(reservation.guest.nationality || 'Mexicana');
  const [companions, setCompanions] = useState<Companion[]>(reservation.companions);
  const [compName, setCompName] = useState('');
  const [compDoc, setCompDoc] = useState('');
  const [compAge, setCompAge] = useState('');
  const [error, setError] = useState('');

  const room = rooms.find((r) => r.number === reservation.roomNumber);
  const capacityExceeded = room ? 1 + companions.length > room.capacity : false;

  const addCompanion = () => {
    if (!compName.trim()) return;
    setCompanions((c) => [...c, { id: Date.now() + c.length, name: compName.split(' ')[0], lastName: compName.split(' ')[1] ?? '', document: compDoc, age: Number(compAge) || 0 }]);
    setCompName(''); setCompDoc(''); setCompAge('');
  };
  const removeCompanion = (id: number) => setCompanions((c) => c.filter((x) => x.id !== id));

  const submit = () => {
    if (!docNumber.trim()) { setError('El número de documento es obligatorio'); return; }
    if (capacityExceeded) { setError(`Excede la capacidad de la habitación (${room?.capacity})`); return; }
    onCheckin(reservation.id, { docType, docNumber, birthDate, nationality }, companions, reservation);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 'var(--size-legacy-460)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">CHECK-IN</p><h2>{reservation.code} · Hab. {reservation.roomNumber}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <p className="login-helper">Huésped: {reservation.guest.name} {reservation.guest.lastName}</p>
        <div className="rc-form-grid">
          <label className="rc-field"><span>Tipo de documento</span><select value={docType} onChange={(e) => setDocType(e.target.value)}><option>INE</option><option>Pasaporte</option><option>Licencia</option></select></label>
          <label className="rc-field"><span>Número de documento</span><input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="Número..." /></label>
          <label className="rc-field"><span>Fecha de nacimiento</span><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></label>
          <label className="rc-field"><span>Nacionalidad</span><input value={nationality} onChange={(e) => setNationality(e.target.value)} /></label>
        </div>

        <h4 className="rc-form-section-title">Acompañantes ({companions.length})</h4>
        <div className="rc-comp-add">
          <input placeholder="Nombre y apellido" value={compName} onChange={(e) => setCompName(e.target.value)} />
          <input placeholder="Documento" value={compDoc} onChange={(e) => setCompDoc(e.target.value)} />
          <input placeholder="Edad" type="number" className="rc-input-narrow" value={compAge} onChange={(e) => setCompAge(e.target.value)} />
          <button className="button small secondary" onClick={addCompanion}><Check size={14} /></button>
        </div>
        {companions.length > 0 && <div className="rc-comp-list">{companions.map((c) => <div className="rc-comp-item" key={c.id}><span>{c.name} {c.lastName} · {c.document} · {c.age} años</span><button onClick={() => removeCompanion(c.id)}><X size={13} /></button></div>)}</div>}
        {capacityExceeded && <small className="rc-field-error">Excede la capacidad de la habitación ({room?.capacity})</small>}
        {error && <small className="rc-field-error">{error}</small>}

        <div className="modal-foot">
          <button className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button primary" onClick={submit}><Check size={16} /> Confirmar check-in</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Checkout ---------- */
export function CheckoutModal({ reservation, onClose, onCheckout, folioTotals }: { reservation: Reservation; onClose: () => void; onCheckout: (id: number) => void; folioTotals: (f: FolioEntry[]) => Totals }) {
  const t = folioTotals(reservation.folio);
  const nights = Math.max(1, Math.round((new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 86400000));
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 'var(--size-legacy-420)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">CHECK-OUT</p><h2>{reservation.code}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <p className="login-helper">{reservation.guest.name} {reservation.guest.lastName} · Hab. {reservation.roomNumber} · {nights} {nights === 1 ? 'noche' : 'noches'}</p>
        <div className="rc-folio-summary">
          <div><span>Total cargos</span><strong>{money(t.charges)}</strong></div>
          <div><span>Pagos</span><strong>−{money(t.payments)}</strong></div>
          <div><span>Depósitos</span><strong>−{money(t.deposits)}</strong></div>
          <div className="rc-folio-balance"><span>Saldo pendiente</span><strong className={t.balance > 0 ? 'terracotta-text' : ''}>{money(t.balance)}</strong></div>
        </div>
        {t.balance > 0 && <div className="rc-alert warning"><TriangleAlert size={15} /><div><strong>Saldo pendiente</strong><p>Existe un saldo de {money(t.balance)} por cobrar antes del check-out.</p></div></div>}
        <div className="modal-foot">
          <button className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button primary" onClick={() => onCheckout(reservation.id)}><Check size={16} /> Finalizar check-out</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Cancel / Void ---------- */
export function ReasonModal({ title, label, tone, onClose, onConfirm }: { title: string; label: string; tone: 'warning' | 'terracotta'; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 'var(--size-legacy-400)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">{title}</p><h2>{label}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <p className="login-helper">Esta acción no se puede deshacer. El registro se conservará para auditoría.</p>
        <label className="rc-field"><span>Motivo</span><textarea className="rc-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Indica el motivo..." /></label>
        <div className="modal-foot">
          <button className="button secondary" onClick={onClose}>Cancelar</button>
          <button className={`button ${tone === 'terracotta' ? 'terracotta-btn' : 'primary'}`} disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}><Ban size={16} /> Confirmar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Add Charge ---------- */
export function ChargeModal({ onClose, onAdd }: { onClose: () => void; onAdd: (concept: string, category: string, amount: number, observation: string) => void }) {
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState('Servicios');
  const [amount, setAmount] = useState('');
  const [observation, setObservation] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    const amt = Number(amount);
    if (!concept.trim()) { setError('El concepto es obligatorio'); return; }
    if (!amt || amt <= 0) { setError('El monto debe ser mayor a 0'); return; }
    onAdd(concept.trim(), category, amt, observation);
  };
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 'var(--size-legacy-400)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">AGREGAR CARGO</p><h2>Nuevo cargo</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <label className="rc-field"><span>Concepto</span><input className="rc-input" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Room service — Almuerzo" /></label>
        <label className="rc-field"><span>Categoría</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option>Servicios</option><option>Room service</option><option>Amenidades</option><option>Productos</option><option>Otro</option></select></label>
        <label className="rc-field"><span>Monto</span><input className="rc-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></label>
        <label className="rc-field"><span>Observación</span><input value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Opcional..." /></label>
        {error && <small className="rc-field-error">{error}</small>}
        <div className="modal-foot"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" onClick={submit}><Check size={16} /> Agregar cargo</button></div>
      </div>
    </div>
  );
}

/* ---------- Payment / Deposit ---------- */
export function PaymentModal({ title, onClose, onSubmit, isDeposit }: { title: string; onClose: () => void; onSubmit: (amount: number, method: PaymentMethod, reference: string) => void; isDeposit?: boolean }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Efectivo');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('El monto debe ser mayor a 0'); return; }
    onSubmit(amt, method, reference);
  };
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 'var(--size-legacy-400)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">{title}</p><h2>{isDeposit ? 'Registrar depósito' : 'Registrar pago'}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <label className="rc-field"><span>Monto</span><input className="rc-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></label>
        <label className="rc-field"><span>Método</span><select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option></select></label>
        <label className="rc-field"><span>Referencia (opcional)</span><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej. TXN-1234" /></label>
        {error && <small className="rc-field-error">{error}</small>}
        <div className="modal-foot"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" onClick={submit}><Check size={16} /> Confirmar</button></div>
      </div>
    </div>
  );
}

/* ---------- Room Change ---------- */
export function RoomChangeModal({ reservation, rooms, hasConflict, isRoomBlocked, onClose, onConfirm }: { reservation: Reservation; rooms: RecRoom[]; hasConflict: (r: string, ci: string, co: string, excludeId?: number) => boolean; isRoomBlocked: (r: string, ci: string, co: string) => boolean; onClose: () => void; onConfirm: (id: number, room: string) => void }) {
  const [selected, setSelected] = useState('');
  const currentRoom = rooms.find((r) => r.number === reservation.roomNumber);
  const newRoom = rooms.find((r) => r.number === selected);
  const compatible = rooms.filter((r) => r.number !== reservation.roomNumber && r.type === reservation.roomType && (r.status === 'Disponible' || r.status === 'Limpieza'));
  const available = compatible.filter((r) => !hasConflict(r.number, reservation.checkIn, reservation.checkOut, reservation.id) && !isRoomBlocked(r.number, reservation.checkIn, reservation.checkOut));
  const diff = newRoom && currentRoom ? newRoom.rate - currentRoom.rate : 0;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 'var(--size-legacy-440)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">CAMBIO DE HABITACIÓN</p><h2>{reservation.code}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="rc-room-change-current"><span>Actual:</span><strong>Hab. {reservation.roomNumber} · {reservation.roomType} · {money(currentRoom?.rate ?? 0)}/noche</strong></div>
        {available.length === 0 ? <div className="hk-empty"><BedDouble size={22} /><p>No hay habitaciones compatibles disponibles</p></div> :
          <div className="rc-room-select-list">{available.map((r) => (
            <button key={r.id} className={`rc-room-option ${selected === r.number ? 'selected' : ''}`} onClick={() => setSelected(r.number)}>
              <div><strong>Hab. {r.number}</strong><span>{r.type} · cap. {r.capacity} · {money(r.rate)}/noche</span></div>
            </button>
          ))}</div>
        }
        {newRoom && <div className="rc-rate-preview">Diferencia de tarifa: {diff === 0 ? 'Sin cambio' : <strong className={diff > 0 ? 'terracotta-text' : 'success-text'}>{diff > 0 ? '+' : ''}{money(diff)}/noche</strong>}</div>}
        <div className="modal-foot"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={!selected} onClick={() => onConfirm(reservation.id, selected)}><Check size={16} /> Cambiar habitación</button></div>
      </div>
    </div>
  );
}

/* ---------- Block Room ---------- */
export function BlockModal({ rooms, onClose, onAdd }: { rooms: RecRoom[]; onClose: () => void; onAdd: (room: string, start: string, end: string, reason: string, observation: string) => void }) {
  const [roomNumber, setRoomNumber] = useState('');
  const [startDate, setStartDate] = useState('2024-08-31');
  const [endDate, setEndDate] = useState('2024-09-02');
  const [reason, setReason] = useState('Mantenimiento');
  const [observation, setObservation] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!roomNumber) { setError('Selecciona una habitación'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError('La fecha final debe ser posterior'); return; }
    onAdd(roomNumber, startDate, endDate, reason, observation);
  };
  const blockable = rooms.filter((r) => r.status !== 'Ocupada');
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 'var(--size-legacy-420)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">BLOQUEAR HABITACIÓN</p><h2>Bloqueo temporal</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <label className="rc-field"><span>Habitación</span><select value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)}><option value="">Selecciona...</option>{blockable.map((r) => <option key={r.id} value={r.number}>Hab. {r.number} · {r.type}</option>)}</select></label>
        <div className="rc-form-grid">
          <label className="rc-field"><span>Fecha inicial</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label className="rc-field"><span>Fecha final</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        </div>
        <label className="rc-field"><span>Motivo</span><select value={reason} onChange={(e) => setReason(e.target.value)}><option>Mantenimiento</option><option>Reparación</option><option>Limpieza profunda</option><option>Fuera de servicio</option><option>Otro</option></select></label>
        <label className="rc-field"><span>Observación</span><input value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Opcional..." /></label>
        {error && <small className="rc-field-error">{error}</small>}
        <div className="modal-foot"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" onClick={submit}><Check size={16} /> Bloquear habitación</button></div>
      </div>
    </div>
  );
}

/* ---------- Invoice ---------- */
export function InvoiceModal({ reservation, folioTotals, onClose }: { reservation: Reservation; folioTotals: (f: FolioEntry[]) => Totals; onClose: () => void }) {
  const t = folioTotals(reservation.folio);
  const nights = Math.max(1, Math.round((new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 86400000));
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal rc-invoice-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">COMPROBANTE DE ESTADÍA</p><h2>Hotel Aurora</h2></div>
          <div className="rc-invoice-actions">
            <button className="button small secondary" onClick={() => window.print()}><Printer size={14} /> Imprimir</button>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div className="rc-invoice">
          <div className="rc-invoice-head">
            <div><strong>HOTEL AURORA</strong><small>Av. Reforma 123, Centro · +52 55 1000 2000</small><small>reservaciones@aurorahotel.com</small></div>
            <div><strong className="rc-invoice-code">{reservation.code}</strong><small>Fecha: {new Date().toLocaleDateString('es-MX')}</small></div>
          </div>
          <div className="rc-invoice-guest">
            <div><small>Huésped</small><strong>{reservation.guest.name} {reservation.guest.lastName}</strong><span>{reservation.guest.docType}: {reservation.guest.docNumber}</span></div>
            <div><small>Habitación</small><strong>{reservation.roomNumber} · {reservation.roomType}</strong></div>
          </div>
          <div className="rc-invoice-dates">
            <div><small>Check-in</small><span>{fmt(reservation.checkIn)} {reservation.checkInTime}</span></div>
            <div><small>Check-out</small><span>{fmt(reservation.checkOut)} {reservation.checkOutTime}</span></div>
            <div><small>Noches</small><span>{nights}</span></div>
          </div>
          <TableFrame className="rc-invoice-table" wrapperClassName="" headers={[
            { id: 'concept', label: 'Concepto' }, { id: 'category', label: 'Categoría' },
            { id: 'date', label: 'Fecha' }, { id: 'amount', label: 'Monto', className: 'rc-right' },
          ]}>
              {reservation.folio.filter((f) => f.status === 'Activo').map((f) => (
                <tr key={f.id}><td>{f.concept}</td><td>{f.category}</td><td>{f.date}</td><td className="rc-right">{f.type === 'Cargo' ? money(f.amount) : `−${money(f.amount)}`}</td></tr>
              ))}
          </TableFrame>
          <div className="rc-invoice-totals">
            <div><span>Total cargos</span><strong>{money(t.charges)}</strong></div>
            <div><span>Pagos aplicados</span><strong>−{money(t.payments)}</strong></div>
            <div><span>Depósitos</span><strong>−{money(t.deposits)}</strong></div>
            <div className="rc-invoice-final"><span>Saldo final</span><strong>{money(t.balance)}</strong></div>
          </div>
          <p className="rc-invoice-thanks">Gracias por su estancia en Hotel Aurora. ¡Esperamos verle pronto!</p>
        </div>
      </div>
    </div>
  );
}
