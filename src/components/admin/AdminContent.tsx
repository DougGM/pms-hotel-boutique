import { useState } from 'react';
import {
  Activity, ArrowRight, Ban, BedDouble, Bell, CalendarDays, Check, ChevronDown, ClipboardList,
  Clock, DollarSign, Dumbbell, Download, FileText, Package, Pencil, Percent, Plus,
  Search, Settings, Sparkles, Star, TriangleAlert, TrendingUp, Users, Utensils,
  Wallet, Waves, Wifi, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type AdminUser = {
  id: number; name: string; email: string; role: string; status: 'Activo' | 'Inactivo'; lastAccess: string;
};
type AdminRole = {
  id: number; name: string; description: string; permissions: Record<string, boolean>; userCount: number;
};
type AdminRoom = {
  id: number; number: string; floor: string; type: string; capacity: number; rate: number; status: string; features: string[];
};
type AdminRoomType = {
  id: number; name: string; capacity: number; description: string; features: string[]; basePrice: number; status: 'Activo' | 'Inactivo';
};
type SeasonRate = {
  id: number; roomType: string; seasonName: string; startDate: string; endDate: string; baseRate: number; seasonalRate: number; status: 'Activa' | 'Inactiva';
};
type DynamicRate = {
  id: number; condition: string; operator: string; threshold: number; adjustment: string; value: number; status: 'Activa' | 'Inactiva';
};
type Promo = {
  id: number; name: string; code: string; percentage: number; startDate: string; endDate: string; conditions: string; status: 'Activa' | 'Inactiva';
};
type Amenity = {
  id: number; name: string; schedule: string; available: boolean; status: 'Activo' | 'Inactivo'; icon: string;
};
type RoomServiceItem = {
  id: number; name: string; category: string; price: number; available: boolean; status: 'Activo' | 'Inactivo'; image: string;
};
type InventoryProduct = {
  id: number; name: string; category: string; stock: number; minStock: number; price: number; status: 'Activo' | 'Inactivo';
};
type InventoryMovement = {
  id: number; date: string; product: string; type: 'Entrada' | 'Salida'; quantity: number; reason: string; responsible: string;
};
type CashMovement = {
  id: number; date: string; concept: string; type: 'Ingreso' | 'Egreso'; amount: number; responsible: string;
};
type AuditEntry = {
  id: number; user: string; date: string; time: string; module: string; action: string; description: string;
};

const ALL_PERMISSIONS = ['Recepción', 'Reservaciones', 'Caja', 'Inventario', 'Reportes', 'Administración', 'Room Service'];

const defaultUsers: AdminUser[] = [
  { id: 1, name: 'Edgar González', email: 'edgar@aurorahotel.com', role: 'Administrador', status: 'Activo', lastAccess: 'Hoy, 08:15' },
  { id: 2, name: 'Chepe Ramírez', email: 'chepe@aurorahotel.com', role: 'Recepción', status: 'Activo', lastAccess: 'Hoy, 07:42' },
  { id: 3, name: 'César Salazar', email: 'cesar@aurorahotel.com', role: 'Limpieza', status: 'Activo', lastAccess: 'Hoy, 06:00' },
  { id: 4, name: 'Douglas Pérez', email: 'douglas@aurorahotel.com', role: 'Room Service', status: 'Activo', lastAccess: 'Ayer, 22:10' },
  { id: 5, name: 'Pablo López', email: 'pablo@aurorahotel.com', role: 'Pasarela de pago', status: 'Inactivo', lastAccess: '15 ago, 14:30' },
  { id: 6, name: 'María Torres', email: 'maria@aurorahotel.com', role: 'Recepción', status: 'Activo', lastAccess: 'Hoy, 08:00' },
];

const defaultRoles: AdminRole[] = [
  { id: 1, name: 'Administrador', description: 'Control total del sistema', userCount: 1, permissions: Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, true])) as Record<string, boolean> },
  { id: 2, name: 'Recepción', description: 'Reservas, huéspedes y caja', userCount: 2, permissions: { Recepción: true, Reservaciones: true, Caja: true, Inventario: false, Reportes: true, Administración: false, 'Room Service': false } },
  { id: 3, name: 'Limpieza', description: 'Habitaciones y tareas de limpieza', userCount: 1, permissions: { Recepción: false, Reservaciones: false, Caja: false, Inventario: false, Reportes: false, Administración: false, 'Room Service': false } },
  { id: 4, name: 'Room Service', description: 'Pedidos y menú de room service', userCount: 1, permissions: { Recepción: false, Reservaciones: false, Caja: false, Inventario: true, Reportes: false, Administración: false, 'Room Service': true } },
];

const defaultRooms: AdminRoom[] = [
  { id: 1, number: '101', floor: 'Piso 1', type: 'Estándar', capacity: 2, rate: 1850, status: 'Disponible', features: ['Cama king', 'Wi-Fi', 'Desayuno'] },
  { id: 2, number: '104', floor: 'Piso 1', type: 'Estándar', capacity: 2, rate: 1850, status: 'Limpieza', features: ['Cama king', 'Wi-Fi', 'Desayuno'] },
  { id: 3, number: '115', floor: 'Piso 1', type: 'Estándar', capacity: 2, rate: 1850, status: 'Ocupada', features: ['Cama king', 'Wi-Fi', 'Desayuno'] },
  { id: 4, number: '201', floor: 'Piso 2', type: 'Deluxe', capacity: 2, rate: 2450, status: 'Disponible', features: ['Cama king', 'Balcón', 'Wi-Fi', 'Desayuno'] },
  { id: 5, number: '208', floor: 'Piso 2', type: 'Deluxe', capacity: 3, rate: 2450, status: 'Ocupada', features: ['Cama king', 'Balcón', 'Wi-Fi', 'Desayuno'] },
  { id: 6, number: '212', floor: 'Piso 2', type: 'Deluxe', capacity: 3, rate: 2450, status: 'Disponible', features: ['Cama king', 'Balcón', 'Wi-Fi', 'Desayuno'] },
  { id: 7, number: '307', floor: 'Piso 3', type: 'Deluxe', capacity: 3, rate: 2450, status: 'Ocupada', features: ['Cama king', 'Balcón', 'Wi-Fi', 'Desayuno'] },
  { id: 8, number: '312', floor: 'Piso 3', type: 'Estándar', capacity: 2, rate: 1850, status: 'Disponible', features: ['Cama king', 'Wi-Fi', 'Desayuno'] },
  { id: 9, number: '402', floor: 'Piso 4', type: 'Suite', capacity: 4, rate: 3900, status: 'Ocupada', features: ['Cama king', 'Sala', 'Wi-Fi', 'Desayuno', 'Jacuzzi'] },
  { id: 10, number: '405', floor: 'Piso 4', type: 'Suite', capacity: 4, rate: 3900, status: 'Disponible', features: ['Cama king', 'Sala', 'Wi-Fi', 'Desayuno', 'Jacuzzi'] },
  { id: 11, number: '410', floor: 'Piso 4', type: 'Suite', capacity: 4, rate: 3900, status: 'Mantenimiento', features: ['Cama king', 'Sala', 'Wi-Fi', 'Desayuno', 'Jacuzzi'] },
];

const defaultRoomTypes: AdminRoomType[] = [
  { id: 1, name: 'Estándar', capacity: 2, description: 'Habitación acogedora con todas las comodidades modernas', features: ['Cama king', 'Wi-Fi', 'Desayuno', 'TV 43"', 'Aire acondicionado'], basePrice: 1850, status: 'Activo' },
  { id: 2, name: 'Deluxe', capacity: 3, description: 'Amplia y luminosa con balcón privado y vistas a la ciudad', features: ['Cama king', 'Balcón', 'Wi-Fi', 'Desayuno', 'TV 50"', 'Minibar'], basePrice: 2450, status: 'Activo' },
  { id: 3, name: 'Suite', capacity: 4, description: 'Suite exclusiva con sala de estar y jacuzzi privado', features: ['Cama king', 'Sala', 'Jacuzzi', 'Wi-Fi', 'Desayuno', 'TV 55"', 'Minibar premium'], basePrice: 3900, status: 'Activo' },
];

const defaultSeasonRates: SeasonRate[] = [
  { id: 1, roomType: 'Deluxe', seasonName: 'Semana Santa', startDate: '2026-03-28', endDate: '2026-04-05', baseRate: 2450, seasonalRate: 780, status: 'Activa' },
  { id: 2, roomType: 'Suite', seasonName: 'Semana Santa', startDate: '2026-03-28', endDate: '2026-04-05', baseRate: 3900, seasonalRate: 1200, status: 'Activa' },
  { id: 3, roomType: 'Estándar', seasonName: 'Verano', startDate: '2026-06-15', endDate: '2026-08-31', baseRate: 1850, seasonalRate: 2200, status: 'Activa' },
  { id: 4, roomType: 'Deluxe', seasonName: 'Navidad / Año Nuevo', startDate: '2026-12-20', endDate: '2027-01-06', baseRate: 2450, seasonalRate: 3100, status: 'Inactiva' },
];

const defaultDynamicRates: DynamicRate[] = [
  { id: 1, condition: 'Ocupación', operator: '>', threshold: 80, adjustment: 'Aumentar', value: 15, status: 'Activa' },
  { id: 2, condition: 'Ocupación', operator: '>', threshold: 90, adjustment: 'Aumentar', value: 25, status: 'Activa' },
  { id: 3, condition: 'Reservas con menos de', operator: '<', threshold: 3, adjustment: 'Disminuir', value: 10, status: 'Activa' },
  { id: 4, condition: 'Estancia extendida (4+ noches)', operator: '>=', threshold: 4, adjustment: 'Disminuir', value: 12, status: 'Inactiva' },
];

const defaultPromos: Promo[] = [
  { id: 1, name: 'Estancia extendida', code: 'AURORA15', percentage: 15, startDate: '2026-01-01', endDate: '2026-12-31', conditions: 'Estancias de 4 noches o más', status: 'Activa' },
  { id: 2, name: 'Escapada romántica', code: 'ROMANCE', percentage: 10, startDate: '2026-02-01', endDate: '2026-12-31', conditions: 'Cena para dos + botella de vino', status: 'Activa' },
  { id: 3, name: 'Fin de semana', code: 'WEEKEND10', percentage: 10, startDate: '2026-01-01', endDate: '2026-12-31', conditions: 'Reservas de viernes a domingo', status: 'Activa' },
  { id: 4, name: 'Reserva anticipada', code: 'EARLY12', percentage: 12, startDate: '2026-01-01', endDate: '2026-06-30', conditions: 'Reservando 30 días antes', status: 'Inactiva' },
];

const defaultAmenities: Amenity[] = [
  { id: 1, name: 'Piscina', schedule: '07:00 — 21:00', available: true, status: 'Activo', icon: 'Waves' },
  { id: 2, name: 'Restaurante', schedule: '06:30 — 22:30', available: true, status: 'Activo', icon: 'Utensils' },
  { id: 3, name: 'Gimnasio', schedule: '06:00 — 23:00', available: true, status: 'Activo', icon: 'Dumbbell' },
  { id: 4, name: 'Spa', schedule: '10:00 — 20:00', available: false, status: 'Activo', icon: 'Sparkles' },
  { id: 5, name: 'Terraza', schedule: '08:00 — 23:00', available: true, status: 'Activo', icon: 'Star' },
  { id: 6, name: 'Wi-Fi', schedule: '24 horas', available: true, status: 'Activo', icon: 'Wifi' },
];

const defaultRoomServiceItems: RoomServiceItem[] = [
  { id: 1, name: 'Desayuno Aurora', category: 'Desayunos', price: 280, available: true, status: 'Activo', image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&h=200&w=300' },
  { id: 2, name: 'Club sandwich', category: 'Almuerzos', price: 240, available: true, status: 'Activo', image: 'https://images.pexels.com/photos/1647263/pexels-photo-1647263.jpeg?auto=compress&cs=tinysrgb&h=200&w=300' },
  { id: 3, name: 'Pasta al pesto', category: 'Cenas', price: 320, available: true, status: 'Activo', image: 'https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&h=200&w=300' },
  { id: 4, name: 'Café americano', category: 'Bebidas', price: 65, available: true, status: 'Activo', image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&h=200&w=300' },
  { id: 5, name: 'Tabla de quesos', category: 'Snacks', price: 390, available: false, status: 'Inactivo', image: 'https://images.pexels.com/photos/821365/pexels-photo-821365.jpeg?auto=compress&cs=tinysrgb&h=200&w=300' },
  { id: 6, name: 'Jugo verde', category: 'Bebidas', price: 110, available: true, status: 'Activo', image: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&h=200&w=300' },
];

const defaultInventory: InventoryProduct[] = [
  { id: 1, name: 'Toallas de baño', category: 'Lencería', stock: 48, minStock: 50, price: 120, status: 'Activo' },
  { id: 2, name: 'Jabón de manos', category: 'Amenidades', stock: 120, minStock: 30, price: 15, status: 'Activo' },
  { id: 3, name: 'Shampoo', category: 'Amenidades', stock: 25, minStock: 40, price: 25, status: 'Activo' },
  { id: 4, name: 'Café molido', category: 'Cocina', stock: 8, minStock: 15, price: 180, status: 'Activo' },
  { id: 5, name: 'Botellas de agua', category: 'Bebidas', stock: 200, minStock: 50, price: 18, status: 'Activo' },
  { id: 6, name: 'Sábanas king', category: 'Lencería', stock: 35, minStock: 20, price: 250, status: 'Activo' },
  { id: 7, name: 'Toallas de piscina', category: 'Lencería', stock: 12, minStock: 25, price: 90, status: 'Activo' },
];

const defaultMovements: InventoryMovement[] = [
  { id: 1, date: '2026-09-01', product: 'Toallas de baño', type: 'Entrada', quantity: 50, reason: 'Compra mensual', responsible: 'Edgar González' },
  { id: 2, date: '2026-08-30', product: 'Jabón de manos', type: 'Salida', quantity: 30, reason: 'Reposición pisos 1-2', responsible: 'César Salazar' },
  { id: 3, date: '2026-08-28', product: 'Café molido', type: 'Salida', quantity: 5, reason: 'Consumo room service', responsible: 'Douglas Pérez' },
  { id: 4, date: '2026-08-25', product: 'Shampoo', type: 'Entrada', quantity: 60, reason: 'Compra mensual', responsible: 'Edgar González' },
  { id: 5, date: '2026-08-20', product: 'Botellas de agua', type: 'Salida', quantity: 100, reason: 'Reposición minibares', responsible: 'César Salazar' },
];

const defaultCashMovements: CashMovement[] = [
  { id: 1, date: '2026-09-02', concept: 'Pago de huésped · AUR-2401', type: 'Ingreso', amount: 5000, responsible: 'Chepe Ramírez' },
  { id: 2, date: '2026-09-02', concept: 'Compra de suministros', type: 'Egreso', amount: 850, responsible: 'Edgar González' },
  { id: 3, date: '2026-09-01', concept: 'Pago de huésped · AUR-2402', type: 'Ingreso', amount: 2000, responsible: 'Chepe Ramírez' },
  { id: 4, date: '2026-09-01', concept: 'Servicio de lavandería', type: 'Egreso', amount: 320, responsible: 'Edgar González' },
  { id: 5, date: '2026-08-31', concept: 'Pago de huésped · AUR-2404', type: 'Ingreso', amount: 6100, responsible: 'Chepe Ramírez' },
];

const defaultAudit: AuditEntry[] = [
  { id: 1, user: 'Edgar González', date: '2026-09-02', time: '08:15', module: 'Tarifas', action: 'Actualización', description: 'Tarifa de temporada Semana Santa modificada para Deluxe' },
  { id: 2, user: 'Chepe Ramírez', date: '2026-09-02', time: '07:42', module: 'Reservas', action: 'Creación', description: 'Nueva reserva AUR-2407 creada' },
  { id: 3, user: 'Edgar González', date: '2026-09-01', time: '18:30', module: 'Usuarios', action: 'Edición', description: 'Usuario María Torres actualizado a rol Recepción' },
  { id: 4, user: 'Douglas Pérez', date: '2026-09-01', time: '14:20', module: 'Room Service', action: 'Edición', description: 'Producto Jugo verde marcado como disponible' },
  { id: 5, user: 'Edgar González', date: '2026-08-31', time: '10:00', module: 'Caja', action: 'Cierre', description: 'Cierre de caja del 31 de agosto registrado' },
  { id: 6, user: 'Chepe Ramírez', date: '2026-08-30', time: '16:45', module: 'Reservas', action: 'Cancelación', description: 'Reserva AUR-2405 cancelada por el huésped' },
  { id: 7, user: 'Edgar González', date: '2026-08-30', time: '09:15', module: 'Inventario', action: 'Entrada', description: 'Entrada de 50 toallas de baño registrada' },
];

const amenityIconMap: Record<string, LucideIcon> = { Waves, Utensils, Dumbbell, Sparkles, Star, Wifi };
const roomStatusClass = (status: string) => status === 'Disponible' ? 'success' : status === 'Ocupada' ? 'warning' : status === 'Limpieza' ? 'info' : 'terracotta';
const statusPillClass = (status: string) => status === 'Activo' || status === 'Activa' ? 'success' : status === 'Inactivo' || status === 'Inactiva' ? 'terracotta' : 'info';

function AdminModal({ title, eyebrow, onClose, children, onSubmit, submitLabel, width = 480 }: {
  title: string; eyebrow: string; onClose: () => void; children: React.ReactNode; onSubmit?: () => void; submitLabel?: string; width?: number;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
        {onSubmit && (
          <div className="modal-foot">
            <button className="button secondary" onClick={onClose}>Cancelar</button>
            <button className="button primary" onClick={onSubmit}>{submitLabel || 'Guardar'} <ArrowRight size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminToolbar({ search, setSearch, filterLabel, filterValue, setFilter, filterOptions, onAction }: {
  search: string; setSearch: (v: string) => void; filterLabel?: string; filterValue?: string; setFilter?: (v: string) => void; filterOptions?: string[]; onAction?: (msg: string) => void;
}) {
  return (
    <div className="toolbar">
      <div className="search-box">
        <Search size={17} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." />
      </div>
      {filterLabel && filterOptions && setFilter && (
        <div className="filter-dropdown">
          <button className="filter-button"><span>{filterValue}</span><ChevronDown size={15} /></button>
          <div className="filter-menu">
            {filterOptions.map((opt) => (
              <button key={opt} className={filterValue === opt ? 'active' : ''} onClick={() => setFilter(opt)}>{opt}</button>
            ))}
          </div>
        </div>
      )}
      {onAction && <button className="icon-btn" onClick={() => onAction('Más filtros abiertos')}><Settings size={18} /></button>}
    </div>
  );
}

function AdminTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function MiniChart({ data, labels, color = '#b88d50' }: { data: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 720},${210 - (v / max) * 180}`).join(' ');
  const fillPoints = `${points} 720,210 0,210`;
  return (
    <div className="chart-area">
      <div className="chart">
        <div className="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
        <div className="chart-lines">
          <i /><i /><i /><i /><i />
          <svg viewBox="0 0 720 210" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`fill-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity=".32" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={fillPoints} fill={`url(#fill-${color.replace('#', '')})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="3" />
          </svg>
        </div>
        <div className="chart-x">{labels.map((l) => <span key={l}>{l}</span>)}</div>
      </div>
    </div>
  );
}

function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="adm-bar-chart">
      {data.map((v, i) => (
        <div className="adm-bar-col" key={i}>
          <div className="adm-bar" style={{ height: `${(v / max) * 100}%` }}>
            <span className="adm-bar-val">${(v / 1000).toFixed(0)}K</span>
          </div>
          <span className="adm-bar-label">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminContent({ nav, onAction }: { nav: string; onAction: (message: string) => void }) {
  const [users, setUsers] = useState(defaultUsers);
  const [roles, setRoles] = useState(defaultRoles);
  const [rooms, setRooms] = useState(defaultRooms);
  const [roomTypes, setRoomTypes] = useState(defaultRoomTypes);
  const [seasonRates, setSeasonRates] = useState(defaultSeasonRates);
  const [dynamicRates, setDynamicRates] = useState(defaultDynamicRates);
  const [promos, setPromos] = useState(defaultPromos);
  const [amenities, setAmenities] = useState(defaultAmenities);
  const [rsItems, setRsItems] = useState(defaultRoomServiceItems);
  const [inventory, setInventory] = useState(defaultInventory);
  const [movements] = useState(defaultMovements);
  const [cashMovements, setCashMovements] = useState(defaultCashMovements);
  const [audit] = useState(defaultAudit);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');

  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editRole, setEditRole] = useState<AdminRole | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editRoom, setEditRoom] = useState<AdminRoom | null>(null);
  const [showRoomTypeModal, setShowRoomTypeModal] = useState(false);
  const [editRoomType, setEditRoomType] = useState<AdminRoomType | null>(null);
  const [showSeasonRateModal, setShowSeasonRateModal] = useState(false);
  const [showDynamicRateModal, setShowDynamicRateModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editPromo, setEditPromo] = useState<Promo | null>(null);
  const [showAmenityModal, setShowAmenityModal] = useState(false);
  const [editAmenity, setEditAmenity] = useState<Amenity | null>(null);
  const [showRsItemModal, setShowRsItemModal] = useState(false);
  const [editRsItem, setEditRsItem] = useState<RoomServiceItem | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<InventoryProduct | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashOpen, setCashOpen] = useState(true);
  const [reportFilter, setReportFilter] = useState('Mes');
  const [reportTab, setReportTab] = useState('Ocupación');

  const resetSearch = () => { setSearch(''); setFilter('Todos'); };

  // ─── DASHBOARD ───
  if (nav === 'Dashboard') {
    const lowStock = inventory.filter((p) => p.stock <= p.minStock);
    return (
      <>
        <div className="dashboard-grid">
          <div className="panel main-panel">
            <div className="panel-heading">
              <div><h3>Rendimiento del hotel</h3><p>Ocupación y rendimiento durante este periodo</p></div>
              <button className="text-button" onClick={() => onAction('Vista completa abierta')}>Ver todo <ArrowRight size={15} /></button>
            </div>
            <div className="chart-tabs">
              <button className="active">Ocupación</button>
              <button onClick={() => onAction('Gráfica de ingresos seleccionada')}>Ingresos</button>
              <button onClick={() => onAction('Gráfica de reservas seleccionada')}>Reservas</button>
              <span>Últimos 30 días <ChevronDown size={14} /></span>
            </div>
            <MiniChart data={[62, 68, 65, 72, 70, 78, 75, 82, 79, 85, 88, 84, 90, 87, 92]} labels={['01 ago', '05 ago', '10 ago', '15 ago', '20 ago', '25 ago', '30 ago']} />
            <div className="chart-footer">
              <span><i className="legend-dot" /> Ocupación promedio</span>
              <strong>84.6%</strong>
              <span className="positive">+8.2% vs. mes anterior</span>
            </div>
          </div>
          <div className="panel side-panel">
            <div className="panel-heading">
              <div><h3>Alertas de stock</h3><p>Productos con inventario bajo</p></div>
              <span className={`status-pill ${lowStock.length > 0 ? 'warning' : 'success'}`}>{lowStock.length} alertas</span>
            </div>
            {lowStock.length === 0 ? (
              <div className="hk-empty"><Check size={22} /><p>Todas las existencias están correctas</p></div>
            ) : (
              <div className="adm-alert-list">
                {lowStock.map((p) => (
                  <div className="adm-alert-row" key={p.id}>
                    <span className="status-pill warning"><TriangleAlert size={12} /> Stock bajo</span>
                    <div><strong>{p.name}</strong><span>{p.category} · {p.stock} unidades (mín: {p.minStock})</span></div>
                  </div>
                ))}
              </div>
            )}
            <div className="hk-summary-divider" />
            <div className="panel-heading">
              <div><h3>Estado de caja</h3><p>Resumen de hoy</p></div>
            </div>
            <div className="adm-cash-summary">
              <div><span>Saldo inicial</span><strong>$5,000</strong></div>
              <div><span>Ingresos</span><strong className="success-text">$13,100</strong></div>
              <div><span>Egresos</span><strong className="terracotta-text">$1,170</strong></div>
              <div><span>Saldo actual</span><strong>$16,930</strong></div>
            </div>
          </div>
        </div>
        <div className="bottom-grid">
          <div className="panel occupancy-panel">
            <div className="panel-heading">
              <div><h3>Estado de habitaciones</h3><p>Vista rápida del inventario en tiempo real</p></div>
              <button className="button small secondary" onClick={() => onAction('Gestión de habitaciones abierta')}>Gestionar <ArrowRight size={14} /></button>
            </div>
            <div className="room-stats">
              <div className="room-stat"><span className="room-dot occupied" /><div><strong>04</strong><small>Ocupadas</small></div></div>
              <div className="room-stat"><span className="room-dot available" /><div><strong>05</strong><small>Disponibles</small></div></div>
              <div className="room-stat"><span className="room-dot cleaning" /><div><strong>01</strong><small>Limpieza</small></div></div>
              <div className="room-stat"><span className="room-dot maintenance" /><div><strong>01</strong><small>Mantenimiento</small></div></div>
            </div>
            <div className="progress-line"><span>Ocupación general</span><strong>36%</strong><div><i style={{ width: '36%' }} /></div></div>
          </div>
          <div className="panel quick-panel">
            <div className="panel-heading">
              <div><h3>Actividad reciente</h3><p>Últimos movimientos del hotel</p></div>
              <button className="icon-btn" onClick={() => onAction('Actividad actualizada')}><Activity size={17} /></button>
            </div>
            <div className="activity-list">
              <div className="activity-item"><span className="activity-dot success" /><div><p>Nueva reserva creada · Habitación 402</p><small>Hace 8 min</small></div></div>
              <div className="activity-item"><span className="activity-dot info" /><div><p>Check-in completado · Habitación 115</p><small>Hace 24 min</small></div></div>
              <div className="activity-item"><span className="activity-dot gold" /><div><p>Tarifa de temporada actualizada</p><small>Hace 1 h</small></div></div>
              <div className="activity-item"><span className="activity-dot terracotta" /><div><p>Cierre de caja registrado</p><small>Ayer, 18:40</small></div></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── USUARIOS Y ROLES ───
  if (nav === 'Usuarios y roles') {
    const filtered = users.filter((u) => {
      const ms = `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase());
      const mf = filter === 'Todos' || u.role === filter || (filter === 'Activo' && u.status === 'Activo') || (filter === 'Inactivo' && u.status === 'Inactivo');
      return ms && mf;
    });
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Gestión de usuarios</h3><p>Administra los usuarios del sistema y sus permisos</p></div>
            <button className="button primary" onClick={() => { setEditUser(null); setShowUserModal(true); }}><Plus size={17} /> Nuevo usuario</button>
          </div>
          <AdminToolbar search={search} setSearch={setSearch} filterLabel="Filtrar" filterValue={filter} setFilter={setFilter} filterOptions={['Todos', 'Activo', 'Inactivo', 'Administrador', 'Recepción', 'Limpieza', 'Room Service']} />
          <AdminTable headers={['Nombre', 'Correo', 'Rol', 'Estado', 'Último acceso', 'Acciones']}>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td><span className={`status-pill ${statusPillClass(u.status)}`}>{u.status}</span></td>
                <td>{u.lastAccess}</td>
                <td className="adm-actions">
                  <button className="button small secondary" onClick={() => { setEditUser(u); setShowUserModal(true); }}><Pencil size={14} /> Editar</button>
                  <button className="button small secondary" onClick={() => { setUsers((cur) => cur.map((x) => x.id === u.id ? { ...x, status: x.status === 'Activo' ? 'Inactivo' : 'Activo' } : x)); onAction(`Usuario ${u.name} ${u.status === 'Activo' ? 'desactivado' : 'activado'}`); }}>{u.status === 'Activo' ? 'Desactivar' : 'Activar'}</button>
                </td>
              </tr>
            ))}
          </AdminTable>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Roles y permisos</h3><p>Configura los permisos de cada rol</p></div>
            <button className="button primary" onClick={() => { setEditRole(null); setShowRoleModal(true); }}><Plus size={17} /> Nuevo rol</button>
          </div>
          <div className="adm-role-grid">
            {roles.map((r) => (
              <div className="adm-role-card" key={r.id}>
                <div className="adm-role-head">
                  <div><strong>{r.name}</strong><span>{r.description}</span></div>
                  <span className="status-pill info">{r.userCount} usuarios</span>
                </div>
                <div className="adm-perm-list">
                  {ALL_PERMISSIONS.map((p) => (
                    <div className="adm-perm-item" key={p}>
                      <span className={`adm-perm-check ${r.permissions[p] ? 'on' : ''}`}>{r.permissions[p] && <Check size={12} />}</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
                <div className="adm-role-actions">
                  <button className="button small secondary" onClick={() => { setEditRole(r); setShowRoleModal(true); }}><Pencil size={14} /> Editar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {showUserModal && (
          <UserModal user={editUser} roles={roles} onClose={() => setShowUserModal(false)} onSave={(u) => {
            if (editUser) { setUsers((cur) => cur.map((x) => x.id === u.id ? u : x)); onAction('Usuario actualizado correctamente'); }
            else { setUsers((cur) => [...cur, { ...u, id: Date.now() }]); onAction('Usuario creado correctamente'); }
            setShowUserModal(false);
          }} />
        )}
        {showRoleModal && (
          <RoleModal role={editRole} onClose={() => setShowRoleModal(false)} onSave={(r) => {
            if (editRole) { setRoles((cur) => cur.map((x) => x.id === r.id ? r : x)); onAction('Rol actualizado correctamente'); }
            else { setRoles((cur) => [...cur, { ...r, id: Date.now() }]); onAction('Rol creado correctamente'); }
            setShowRoleModal(false);
          }} />
        )}
      </>
    );
  }

  // ─── HABITACIONES ───
  if (nav === 'Habitaciones') {
    const filtered = rooms.filter((r) => {
      const ms = `${r.number} ${r.floor} ${r.type} ${r.status}`.toLowerCase().includes(search.toLowerCase());
      const mf = filter === 'Todos' || r.status === filter || r.type === filter;
      return ms && mf;
    });
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Gestión de habitaciones</h3><p>Administra las habitaciones del hotel</p></div>
            <button className="button primary" onClick={() => { setEditRoom(null); setShowRoomModal(true); }}><Plus size={17} /> Nueva habitación</button>
          </div>
          <AdminToolbar search={search} setSearch={setSearch} filterLabel="Filtrar" filterValue={filter} setFilter={setFilter} filterOptions={['Todos', 'Disponible', 'Ocupada', 'Limpieza', 'Mantenimiento', 'Estándar', 'Deluxe', 'Suite']} />
          <AdminTable headers={['Número', 'Piso', 'Tipo', 'Capacidad', 'Tarifa', 'Estado', 'Acciones']}>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.number}</strong></td>
                <td>{r.floor}</td>
                <td>{r.type}</td>
                <td>{r.capacity} huéspedes</td>
                <td>${r.rate.toLocaleString()}</td>
                <td><span className={`status-pill ${roomStatusClass(r.status)}`}>{r.status}</span></td>
                <td className="adm-actions">
                  <button className="button small secondary" onClick={() => { setEditRoom(r); setShowRoomModal(true); }}><Pencil size={14} /> Editar</button>
                  <button className="button small secondary" onClick={() => { setRooms((cur) => cur.map((x) => x.id === r.id ? { ...x, status: x.status === 'Mantenimiento' ? 'Disponible' : 'Mantenimiento' } : x)); onAction(`Habitación ${r.number} ${r.status === 'Mantenimiento' ? 'activada' : 'desactivada'}`); }}>{r.status === 'Mantenimiento' ? 'Activar' : 'Desactivar'}</button>
                </td>
              </tr>
            ))}
          </AdminTable>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Tipos de habitación</h3><p>Configura los tipos y sus características</p></div>
            <button className="button primary" onClick={() => { setEditRoomType(null); setShowRoomTypeModal(true); }}><Plus size={17} /> Nuevo tipo</button>
          </div>
          <div className="adm-roomtype-grid">
            {roomTypes.map((rt) => (
              <div className="adm-roomtype-card" key={rt.id}>
                <div className="adm-roomtype-head">
                  <div><strong>{rt.name}</strong><span>{rt.capacity} huéspedes · {rt.features.length} características</span></div>
                  <span className={`status-pill ${statusPillClass(rt.status)}`}>{rt.status}</span>
                </div>
                <p className="adm-roomtype-desc">{rt.description}</p>
                <div className="adm-roomtype-features">
                  {rt.features.map((f) => <span key={f} className="adm-feature-tag">{f}</span>)}
                </div>
                <div className="adm-roomtype-price">Precio base: <strong>${rt.basePrice.toLocaleString()}</strong></div>
                <div className="adm-role-actions">
                  <button className="button small secondary" onClick={() => { setEditRoomType(rt); setShowRoomTypeModal(true); }}><Pencil size={14} /> Editar</button>
                  <button className="button small secondary" onClick={() => { setRoomTypes((cur) => cur.map((x) => x.id === rt.id ? { ...x, status: x.status === 'Activo' ? 'Inactivo' : 'Activo' } : x)); onAction(`Tipo ${rt.name} ${rt.status === 'Activo' ? 'desactivado' : 'activado'}`); }}>{rt.status === 'Activo' ? 'Desactivar' : 'Activar'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {showRoomModal && (
          <RoomModal room={editRoom} roomTypes={roomTypes} onClose={() => setShowRoomModal(false)} onSave={(r) => {
            if (editRoom) { setRooms((cur) => cur.map((x) => x.id === r.id ? r : x)); onAction('Habitación actualizada correctamente'); }
            else { setRooms((cur) => [...cur, { ...r, id: Date.now() }]); onAction('Habitación creada correctamente'); }
            setShowRoomModal(false);
          }} />
        )}
        {showRoomTypeModal && (
          <RoomTypeModal roomType={editRoomType} onClose={() => setShowRoomTypeModal(false)} onSave={(rt) => {
            if (editRoomType) { setRoomTypes((cur) => cur.map((x) => x.id === rt.id ? rt : x)); onAction('Tipo de habitación actualizado correctamente'); }
            else { setRoomTypes((cur) => [...cur, { ...rt, id: Date.now() }]); onAction('Tipo de habitación creado correctamente'); }
            setShowRoomTypeModal(false);
          }} />
        )}
      </>
    );
  }

  // ─── TARIFAS ───
  if (nav === 'Tarifas') {
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Tarifas por temporada</h3><p>Configura tarifas especiales según la temporada</p></div>
            <button className="button primary" onClick={() => setShowSeasonRateModal(true)}><Plus size={17} /> Nueva tarifa de temporada</button>
          </div>
          <AdminTable headers={['Tipo de habitación', 'Temporada', 'Fechas', 'Tarifa base', 'Tarifa especial', 'Estado', 'Acciones']}>
            {seasonRates.map((sr) => (
              <tr key={sr.id}>
                <td><strong>{sr.roomType}</strong></td>
                <td>{sr.seasonName}</td>
                <td>{sr.startDate} → {sr.endDate}</td>
                <td>${sr.baseRate.toLocaleString()}</td>
                <td><strong className="success-text">${sr.seasonalRate.toLocaleString()}</strong></td>
                <td><span className={`status-pill ${statusPillClass(sr.status)}`}>{sr.status}</span></td>
                <td className="adm-actions">
                  <button className="button small secondary" onClick={() => { setSeasonRates((cur) => cur.map((x) => x.id === sr.id ? { ...x, status: x.status === 'Activa' ? 'Inactiva' : 'Activa' } : x)); onAction(`Tarifa ${sr.status === 'Activa' ? 'desactivada' : 'activada'}`); }}>{sr.status === 'Activa' ? 'Desactivar' : 'Activar'}</button>
                </td>
              </tr>
            ))}
          </AdminTable>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Tarifas dinámicas</h3><p>Reglas de ajuste automático según condiciones</p></div>
            <button className="button primary" onClick={() => setShowDynamicRateModal(true)}><Plus size={17} /> Nueva regla</button>
          </div>
          <div className="adm-dynrate-grid">
            {dynamicRates.map((dr) => (
              <div className="adm-dynrate-card" key={dr.id}>
                <div className="adm-dynrate-head">
                  <div><strong>{dr.condition}</strong><span>{dr.operator} {dr.threshold}{dr.condition.includes('Ocupación') ? '%' : dr.condition.includes('noches') ? ' noches' : ' días'}</span></div>
                  <span className={`status-pill ${statusPillClass(dr.status)}`}>{dr.status}</span>
                </div>
                <div className="adm-dynrate-body">
                  <span className={`status-pill ${dr.adjustment === 'Aumentar' ? 'warning' : 'info'}`}>{dr.adjustment} {dr.value}%</span>
                </div>
                <div className="adm-role-actions">
                  <button className="button small secondary" onClick={() => { setDynamicRates((cur) => cur.map((x) => x.id === dr.id ? { ...x, status: x.status === 'Activa' ? 'Inactiva' : 'Activa' } : x)); onAction(`Regla ${dr.status === 'Activa' ? 'desactivada' : 'activada'}`); }}>{dr.status === 'Activa' ? 'Desactivar' : 'Activar'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {showSeasonRateModal && (
          <SeasonRateModal roomTypes={roomTypes} onClose={() => setShowSeasonRateModal(false)} onSave={(sr) => {
            setSeasonRates((cur) => [...cur, { ...sr, id: Date.now() }]);
            onAction('Tarifa de temporada creada correctamente');
            setShowSeasonRateModal(false);
          }} />
        )}
        {showDynamicRateModal && (
          <DynamicRateModal onClose={() => setShowDynamicRateModal(false)} onSave={(dr) => {
            setDynamicRates((cur) => [...cur, { ...dr, id: Date.now() }]);
            onAction('Regla dinámica creada correctamente');
            setShowDynamicRateModal(false);
          }} />
        )}
      </>
    );
  }

  // ─── PROMOCIONES ───
  if (nav === 'Promociones') {
    const filtered = promos.filter((p) => `${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase()));
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Gestión de promociones</h3><p>Administra los códigos de descuento del hotel</p></div>
            <button className="button primary" onClick={() => { setEditPromo(null); setShowPromoModal(true); }}><Plus size={17} /> Nueva promoción</button>
          </div>
          <AdminToolbar search={search} setSearch={setSearch} />
          <div className="adm-promo-grid">
            {filtered.map((p) => (
              <div className="adm-promo-card" key={p.id}>
                <div className="adm-promo-head">
                  <div><strong>{p.name}</strong><code>{p.code}</code></div>
                  <span className={`status-pill ${statusPillClass(p.status)}`}>{p.status}</span>
                </div>
                <div className="adm-promo-body">
                  <div className="adm-promo-pct"><Percent size={20} /><strong>{p.percentage}%</strong></div>
                  <p>{p.conditions}</p>
                  <div className="adm-promo-dates"><CalendarDays size={14} /><span>{p.startDate} → {p.endDate}</span></div>
                </div>
                <div className="adm-role-actions">
                  <button className="button small secondary" onClick={() => { setEditPromo(p); setShowPromoModal(true); }}><Pencil size={14} /> Editar</button>
                  <button className="button small secondary" onClick={() => { setPromos((cur) => cur.map((x) => x.id === p.id ? { ...x, status: x.status === 'Activa' ? 'Inactiva' : 'Activa' } : x)); onAction(`Promoción ${p.status === 'Activa' ? 'desactivada' : 'activada'}`); }}>{p.status === 'Activa' ? 'Desactivar' : 'Activar'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {showPromoModal && (
          <PromoModal promo={editPromo} onClose={() => setShowPromoModal(false)} onSave={(p) => {
            if (editPromo) { setPromos((cur) => cur.map((x) => x.id === p.id ? p : x)); onAction('Promoción actualizada correctamente'); }
            else { setPromos((cur) => [...cur, { ...p, id: Date.now() }]); onAction('Promoción creada correctamente'); }
            setShowPromoModal(false);
          }} />
        )}
      </>
    );
  }

  // ─── SERVICIOS (AMENIDADES + ROOM SERVICE) ───
  if (nav === 'Servicios') {
    const filteredRs = rsItems.filter((i) => `${i.name} ${i.category}`.toLowerCase().includes(search.toLowerCase()));
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Amenidades</h3><p>Administra las amenidades del hotel y sus horarios</p></div>
            <button className="button primary" onClick={() => { setEditAmenity(null); setShowAmenityModal(true); }}><Plus size={17} /> Nueva amenidad</button>
          </div>
          <div className="adm-amenity-grid">
            {amenities.map((a) => {
              const Icon = amenityIconMap[a.icon] ?? Sparkles;
              return (
                <div className="adm-amenity-card" key={a.id}>
                  <div className="adm-amenity-icon"><Icon size={22} /></div>
                  <div className="adm-amenity-body">
                    <div><strong>{a.name}</strong><span>{a.schedule}</span></div>
                    <div className="adm-amenity-pills">
                      <span className={`status-pill ${a.available ? 'success' : 'warning'}`}>{a.available ? 'Disponible' : 'No disponible'}</span>
                      <span className={`status-pill ${statusPillClass(a.status)}`}>{a.status}</span>
                    </div>
                  </div>
                  <div className="adm-amenity-actions">
                    <button className="button small secondary" onClick={() => { setEditAmenity(a); setShowAmenityModal(true); }}><Pencil size={14} /></button>
                    <button className="button small secondary" onClick={() => { setAmenities((cur) => cur.map((x) => x.id === a.id ? { ...x, status: x.status === 'Activo' ? 'Inactivo' : 'Activo' } : x)); onAction(`Amenidad ${a.status === 'Activo' ? 'desactivada' : 'activada'}`); }}>{a.status === 'Activo' ? 'Desactivar' : 'Activar'}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Catálogo de Room Service</h3><p>Administra los productos del menú de servicio a habitación</p></div>
            <button className="button primary" onClick={() => { setEditRsItem(null); setShowRsItemModal(true); }}><Plus size={17} /> Nuevo producto</button>
          </div>
          <AdminToolbar search={search} setSearch={setSearch} />
          <div className="adm-rs-grid">
            {filteredRs.map((item) => (
              <div className="adm-rs-card" key={item.id}>
                <div className="adm-rs-image" style={{ backgroundImage: `url(${item.image})` }}>
                  <span className={`status-pill ${statusPillClass(item.status)}`}>{item.status}</span>
                </div>
                <div className="adm-rs-body">
                  <div><strong>{item.name}</strong><span>{item.category}</span></div>
                  <div className="adm-rs-foot">
                    <strong>${item.price.toLocaleString()}</strong>
                    <span className={`status-pill ${item.available ? 'success' : 'warning'}`}>{item.available ? 'Disponible' : 'No disponible'}</span>
                  </div>
                </div>
                <div className="adm-amenity-actions">
                  <button className="button small secondary" onClick={() => { setEditRsItem(item); setShowRsItemModal(true); }}><Pencil size={14} /> Editar</button>
                  <button className="button small secondary" onClick={() => { setRsItems((cur) => cur.map((x) => x.id === item.id ? { ...x, status: x.status === 'Activo' ? 'Inactivo' : 'Activo' } : x)); onAction(`Producto ${item.status === 'Activo' ? 'desactivado' : 'activado'}`); }}>{item.status === 'Activo' ? 'Desactivar' : 'Activar'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {showAmenityModal && (
          <AmenityModal amenity={editAmenity} onClose={() => setShowAmenityModal(false)} onSave={(a) => {
            if (editAmenity) { setAmenities((cur) => cur.map((x) => x.id === a.id ? a : x)); onAction('Amenidad actualizada correctamente'); }
            else { setAmenities((cur) => [...cur, { ...a, id: Date.now() }]); onAction('Amenidad creada correctamente'); }
            setShowAmenityModal(false);
          }} />
        )}
        {showRsItemModal && (
          <RsItemModal item={editRsItem} onClose={() => setShowRsItemModal(false)} onSave={(item) => {
            if (editRsItem) { setRsItems((cur) => cur.map((x) => x.id === item.id ? item : x)); onAction('Producto actualizado correctamente'); }
            else { setRsItems((cur) => [...cur, { ...item, id: Date.now() }]); onAction('Producto creado correctamente'); }
            setShowRsItemModal(false);
          }} />
        )}
      </>
    );
  }

  // ─── REPORTES ───
  if (nav === 'Reportes') {
    const reportTabs = ['Ocupación', 'Ingresos', 'Reservas', 'Cancelaciones', 'Canales', 'Servicios', 'Temporadas'];
    const filterOpts = ['Día', 'Semana', 'Mes', 'Año', 'Temporada'];
    return (
      <div className="panel">
        <div className="panel-heading">
          <div><h3>Reportes del hotel</h3><p>Analiza el rendimiento y la operación del hotel</p></div>
          <button className="button secondary" onClick={() => onAction('Reporte preparado para descargar')}><Download size={16} /> Exportar</button>
        </div>
        <div className="chart-tabs">
          {reportTabs.map((t) => <button key={t} className={reportTab === t ? 'active' : ''} onClick={() => setReportTab(t)}>{t}</button>)}
        </div>
        <div className="adm-report-filters">
          {filterOpts.map((f) => <button key={f} className={`adm-filter-chip ${reportFilter === f ? 'active' : ''}`} onClick={() => setReportFilter(f)}>{f}</button>)}
        </div>
        <div className="adm-report-content">
          {reportTab === 'Ocupación' && (
            <>
              <div className="adm-report-stats">
                <div className="metric-card"><div className="metric-icon sage"><BedDouble size={19} /></div><div><p>Ocupación promedio</p><h2>84.6%</h2><span className="positive">+8.2%</span></div></div>
                <div className="metric-card"><div className="metric-icon gold"><TrendingUp size={19} /></div><div><p>Tendencia</p><h2>Ascendente</h2><span className="positive">+4.1 pts</span></div></div>
              </div>
              <MiniChart data={[62, 68, 65, 72, 70, 78, 75, 82, 79, 85, 88, 84, 90, 87, 92]} labels={['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']} />
            </>
          )}
          {reportTab === 'Ingresos' && (
            <>
              <div className="adm-report-stats">
                <div className="metric-card"><div className="metric-icon gold"><Wallet size={19} /></div><div><p>Ingresos del mes</p><h2>$128.4K</h2><span className="positive">+14.5%</span></div></div>
                <div className="metric-card"><div className="metric-icon sage"><DollarSign size={19} /></div><div><p>Promedio diario</p><h2>$4,280</h2><span className="positive">+6.8%</span></div></div>
              </div>
              <BarChart data={[98, 112, 105, 128, 135, 142, 128]} labels={['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep']} />
            </>
          )}
          {reportTab === 'Reservas' && (
            <AdminTable headers={['Periodo', 'Reservas', 'Check-ins', 'Check-outs', 'Ingresos']}>
              <tr><td>Semana 1</td><td>38</td><td>32</td><td>30</td><td>$42,100</td></tr>
              <tr><td>Semana 2</td><td>45</td><td>40</td><td>38</td><td>$58,200</td></tr>
              <tr><td>Semana 3</td><td>32</td><td>35</td><td>33</td><td>$38,500</td></tr>
              <tr><td>Semana 4</td><td>27</td><td>28</td><td>25</td><td>$31,600</td></tr>
            </AdminTable>
          )}
          {reportTab === 'Cancelaciones' && (
            <>
              <div className="adm-report-stats">
                <div className="metric-card"><div className="metric-icon terracotta"><Ban size={19} /></div><div><p>Cancelaciones</p><h2>12</h2><span>-2.4%</span></div></div>
                <div className="metric-card"><div className="metric-icon info"><Percent size={19} /></div><div><p>Tasa de cancelación</p><h2>8.5%</h2><span className="positive">-1.2%</span></div></div>
              </div>
              <MiniChart data={[15, 12, 10, 14, 8, 11, 9, 12, 7, 10, 8, 6]} labels={['E', 'F', 'M', 'A', 'M', 'J', 'J']} color="#a9483c" />
            </>
          )}
          {reportTab === 'Canales' && (
            <AdminTable headers={['Canal', 'Reservas', 'Ingresos', '% del total']}>
              <tr><td>Online</td><td>68</td><td>$78,400</td><td>61%</td></tr>
              <tr><td>Teléfono</td><td>24</td><td>$28,200</td><td>22%</td></tr>
              <tr><td>Presencial</td><td>12</td><td>$14,800</td><td>12%</td></tr>
              <tr><td>Agencias</td><td>8</td><td>$7,000</td><td>5%</td></tr>
            </AdminTable>
          )}
          {reportTab === 'Servicios' && (
            <AdminTable headers={['Servicio', 'Veces utilizado', 'Ingresos', '% del total']}>
              <tr><td>Room Service</td><td>142</td><td>$38,600</td><td>30%</td></tr>
              <tr><td>Spa</td><td>86</td><td>$24,200</td><td>19%</td></tr>
              <tr><td>Lavandería</td><td>54</td><td>$12,800</td><td>10%</td></tr>
              <tr><td>Transporte</td><td>38</td><td>$9,400</td><td>7%</td></tr>
            </AdminTable>
          )}
          {reportTab === 'Temporadas' && (
            <AdminTable headers={['Temporada', 'Ocupación', 'Ingresos', 'Reservas', 'ADR']}>
              <tr><td>Alta (Dic - Mar)</td><td>92%</td><td>$48,200</td><td>58</td><td>$3,200</td></tr>
              <tr><td>Media (Abr - Jul)</td><td>78%</td><td>$32,100</td><td>42</td><td>$2,450</td></tr>
              <tr><td>Baja (Ago - Nov)</td><td>65%</td><td>$22,800</td><td>28</td><td>$1,850</td></tr>
            </AdminTable>
          )}
        </div>
      </div>
    );
  }

  // ─── INVENTARIO ───
  if (nav === 'Inventario') {
    const filtered = inventory.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
    const lowStock = inventory.filter((p) => p.stock <= p.minStock);
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Gestión de inventario</h3><p>Administra los productos y existencias del hotel</p></div>
            <div className="adm-heading-actions">
              <button className="button secondary" onClick={() => setShowMovementModal(true)}><ArrowRight size={16} /> Registrar movimiento</button>
              <button className="button primary" onClick={() => { setEditProduct(null); setShowProductModal(true); }}><Plus size={17} /> Nuevo producto</button>
            </div>
          </div>
          {lowStock.length > 0 && (
            <div className="adm-inv-alerts">
              <TriangleAlert size={18} />
              <span>{lowStock.length} producto(s) con stock bajo el mínimo</span>
            </div>
          )}
          <AdminToolbar search={search} setSearch={setSearch} />
          <AdminTable headers={['Producto', 'Categoría', 'Stock', 'Stock mínimo', 'Precio', 'Estado', 'Acciones']}>
            {filtered.map((p) => (
              <tr key={p.id} className={p.stock <= p.minStock ? 'adm-row-alert' : ''}>
                <td><strong>{p.name}</strong></td>
                <td>{p.category}</td>
                <td className={p.stock <= p.minStock ? 'terracotta-text' : ''}><strong>{p.stock}</strong></td>
                <td>{p.minStock}</td>
                <td>${p.price.toLocaleString()}</td>
                <td><span className={`status-pill ${statusPillClass(p.status)}`}>{p.status}</span></td>
                <td className="adm-actions">
                  <button className="button small secondary" onClick={() => { setEditProduct(p); setShowProductModal(true); }}><Pencil size={14} /> Editar</button>
                  <button className="button small secondary" onClick={() => { setInventory((cur) => cur.map((x) => x.id === p.id ? { ...x, status: x.status === 'Activo' ? 'Inactivo' : 'Activo' } : x)); onAction(`Producto ${p.status === 'Activo' ? 'desactivado' : 'activado'}`); }}>{p.status === 'Activo' ? 'Desactivar' : 'Activar'}</button>
                </td>
              </tr>
            ))}
          </AdminTable>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Movimientos de inventario</h3><p>Historial de entradas y salidas</p></div>
          </div>
          <AdminTable headers={['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Motivo', 'Responsable']}>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{m.date}</td>
                <td><strong>{m.product}</strong></td>
                <td><span className={`status-pill ${m.type === 'Entrada' ? 'success' : 'warning'}`}>{m.type}</span></td>
                <td>{m.type === 'Entrada' ? '+' : '-'}{m.quantity}</td>
                <td>{m.reason}</td>
                <td>{m.responsible}</td>
              </tr>
            ))}
          </AdminTable>
        </div>
        {showProductModal && (
          <ProductModal product={editProduct} onClose={() => setShowProductModal(false)} onSave={(p) => {
            if (editProduct) { setInventory((cur) => cur.map((x) => x.id === p.id ? p : x)); onAction('Producto actualizado correctamente'); }
            else { setInventory((cur) => [...cur, { ...p, id: Date.now() }]); onAction('Producto creado correctamente'); }
            setShowProductModal(false);
          }} />
        )}
        {showMovementModal && (
          <MovementModal products={inventory} onClose={() => setShowMovementModal(false)} onSave={(m) => {
            setInventory((cur) => cur.map((x) => x.id === m.productId ? { ...x, stock: m.type === 'Entrada' ? x.stock + m.quantity : Math.max(0, x.stock - m.quantity) } : x));
            onAction(`${m.type} de ${m.quantity} unidades registrada`);
            setShowMovementModal(false);
          }} />
        )}
      </>
    );
  }

  // ─── CAJA ───
  if (nav === 'Caja') {
    const totalIngresos = cashMovements.filter((m) => m.type === 'Ingreso').reduce((s, m) => s + m.amount, 0);
    const totalEgresos = cashMovements.filter((m) => m.type === 'Egreso').reduce((s, m) => s + m.amount, 0);
    const saldoInicial = 5000;
    return (
      <>
        <div className="adm-cash-grid">
          <div className="metric-card"><div className="metric-icon sage"><Wallet size={19} /></div><div><p>Saldo inicial</p><h2>${saldoInicial.toLocaleString()}</h2></div></div>
          <div className="metric-card"><div className="metric-icon gold"><TrendingUp size={19} /></div><div><p>Ingresos</p><h2>${totalIngresos.toLocaleString()}</h2><span className="positive">+{((totalIngresos / (saldoInicial + totalIngresos)) * 100).toFixed(1)}%</span></div></div>
          <div className="metric-card"><div className="metric-icon terracotta"><ArrowRight size={19} /></div><div><p>Egresos</p><h2>${totalEgresos.toLocaleString()}</h2></div></div>
          <div className="metric-card"><div className="metric-icon info"><DollarSign size={19} /></div><div><p>Saldo actual</p><h2>${(saldoInicial + totalIngresos - totalEgresos).toLocaleString()}</h2></div></div>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div><h3>Movimientos de caja</h3><p>Historial de ingresos y egresos</p></div>
            <div className="adm-heading-actions">
              {cashOpen ? (
                <button className="button secondary" onClick={() => { setCashOpen(false); onAction('Caja cerrada correctamente'); }}><Ban size={16} /> Cerrar caja</button>
              ) : (
                <button className="button primary" onClick={() => { setCashOpen(true); onAction('Caja abierta correctamente'); }}><Plus size={16} /> Abrir caja</button>
              )}
              <button className="button secondary" onClick={() => onAction('Reporte de caja preparado')}><FileText size={16} /> Reporte</button>
              <button className="button primary" onClick={() => setShowCashModal(true)}><Plus size={17} /> Nuevo movimiento</button>
            </div>
          </div>
          <AdminTable headers={['Fecha', 'Concepto', 'Tipo', 'Monto', 'Responsable']}>
            {cashMovements.map((m) => (
              <tr key={m.id}>
                <td>{m.date}</td>
                <td><strong>{m.concept}</strong></td>
                <td><span className={`status-pill ${m.type === 'Ingreso' ? 'success' : 'warning'}`}>{m.type}</span></td>
                <td className={m.type === 'Ingreso' ? 'success-text' : 'terracotta-text'}><strong>{m.type === 'Ingreso' ? '+' : '-'}${m.amount.toLocaleString()}</strong></td>
                <td>{m.responsible}</td>
              </tr>
            ))}
          </AdminTable>
        </div>
        {showCashModal && (
          <CashModal onClose={() => setShowCashModal(false)} onSave={(m) => {
            setCashMovements((cur) => [{ ...m, id: Date.now(), date: new Date().toISOString().slice(0, 10) }, ...cur]);
            onAction('Movimiento de caja registrado correctamente');
            setShowCashModal(false);
          }} />
        )}
      </>
    );
  }

  // ─── AUDITORÍA ───
  if (nav === 'Auditoría') {
    const filtered = audit.filter((a) => {
      const ms = `${a.user} ${a.module} ${a.action} ${a.description}`.toLowerCase().includes(search.toLowerCase());
      const mf = filter === 'Todos' || a.module === filter || a.action === filter;
      return ms && mf;
    });
    return (
      <div className="panel">
        <div className="panel-heading">
          <div><h3>Historial de auditoría</h3><p>Registro de todas las acciones del sistema</p></div>
          <button className="button secondary" onClick={() => onAction('Reporte de auditoría preparado')}><Download size={16} /> Exportar</button>
        </div>
        <AdminToolbar search={search} setSearch={setSearch} filterLabel="Filtrar" filterValue={filter} setFilter={setFilter} filterOptions={['Todos', 'Tarifas', 'Reservas', 'Usuarios', 'Room Service', 'Caja', 'Inventario']} />
        <AdminTable headers={['Usuario', 'Fecha', 'Hora', 'Módulo', 'Acción', 'Descripción']}>
          {filtered.map((a) => (
            <tr key={a.id}>
              <td><strong>{a.user}</strong></td>
              <td>{a.date}</td>
              <td>{a.time}</td>
              <td><span className="status-pill info">{a.module}</span></td>
              <td><span className={`status-pill ${a.action === 'Cancelación' || a.action === 'Cierre' ? 'warning' : 'success'}`}>{a.action}</span></td>
              <td>{a.description}</td>
            </tr>
          ))}
        </AdminTable>
      </div>
    );
  }

  resetSearch();
  return <div className="panel"><div className="hk-empty"><FileText size={22} /><p>Selecciona una opción del menú</p></div></div>;
}

// ─── MODALES ───

function UserModal({ user, roles, onClose, onSave }: { user: AdminUser | null; roles: AdminRole[]; onClose: () => void; onSave: (u: AdminUser) => void }) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState(user?.role ?? roles[0]?.name ?? '');
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>(user?.status ?? 'Activo');
  return (
    <AdminModal title={user ? 'Editar usuario' : 'Nuevo usuario'} eyebrow="GESTIÓN DE USUARIOS" onClose={onClose} onSubmit={() => onSave({ id: user?.id ?? 0, name, email, role, status, lastAccess: user?.lastAccess ?? 'Sin acceso' })} submitLabel={user ? 'Guardar cambios' : 'Crear usuario'}>
      <label className="hk-form-label">Nombre completo<input className="hk-form-select" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del usuario" /></label>
      <label className="hk-form-label">Correo electrónico<input className="hk-form-select" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@aurorahotel.com" /></label>
      <label className="hk-form-label">Rol<select className="hk-form-select" value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}</select></label>
      <label className="hk-form-label">Estado<select className="hk-form-select" value={status} onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></label>
    </AdminModal>
  );
}

function RoleModal({ role, onClose, onSave }: { role: AdminRole | null; onClose: () => void; onSave: (r: AdminRole) => void }) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissions, setPermissions] = useState<Record<string, boolean>>(role?.permissions ?? Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, false])));
  return (
    <AdminModal title={role ? 'Editar rol' : 'Nuevo rol'} eyebrow="ROLES Y PERMISOS" onClose={onClose} onSubmit={() => onSave({ id: role?.id ?? 0, name, description, permissions, userCount: role?.userCount ?? 0 })} submitLabel={role ? 'Guardar cambios' : 'Crear rol'} width={520}>
      <label className="hk-form-label">Nombre del rol<input className="hk-form-select" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Gerente" /></label>
      <label className="hk-form-label">Descripción<input className="hk-form-select" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del rol" /></label>
      <label className="hk-form-label">Permisos
        <div className="adm-perm-editor">
          {ALL_PERMISSIONS.map((p) => (
            <button type="button" key={p} className={`adm-perm-toggle ${permissions[p] ? 'on' : ''}`} onClick={() => setPermissions((cur) => ({ ...cur, [p]: !cur[p] }))}>
              <span className="adm-perm-check">{permissions[p] && <Check size={12} />}</span>
              <span>{p}</span>
            </button>
          ))}
        </div>
      </label>
    </AdminModal>
  );
}

function RoomModal({ room, roomTypes, onClose, onSave }: { room: AdminRoom | null; roomTypes: AdminRoomType[]; onClose: () => void; onSave: (r: AdminRoom) => void }) {
  const [number, setNumber] = useState(room?.number ?? '');
  const [floor, setFloor] = useState(room?.floor ?? 'Piso 1');
  const [type, setType] = useState(room?.type ?? roomTypes[0]?.name ?? '');
  const [capacity, setCapacity] = useState(room?.capacity ?? 2);
  const [rate, setRate] = useState(room?.rate ?? 1850);
  const [status, setStatus] = useState(room?.status ?? 'Disponible');
  return (
    <AdminModal title={room ? 'Editar habitación' : 'Nueva habitación'} eyebrow="GESTIÓN DE HABITACIONES" onClose={onClose} onSubmit={() => onSave({ id: room?.id ?? 0, number, floor, type, capacity, rate, status, features: room?.features ?? ['Cama king', 'Wi-Fi', 'Desayuno'] })} submitLabel={room ? 'Guardar cambios' : 'Crear habitación'}>
      <div className="rc-form-grid">
        <label className="hk-form-label">Número<input className="hk-form-select" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Ej. 101" /></label>
        <label className="hk-form-label">Piso<input className="hk-form-select" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Ej. Piso 1" /></label>
        <label className="hk-form-label">Tipo<select className="hk-form-select" value={type} onChange={(e) => setType(e.target.value)}>{roomTypes.map((rt) => <option key={rt.id} value={rt.name}>{rt.name}</option>)}</select></label>
        <label className="hk-form-label">Capacidad<input className="hk-form-select" type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></label>
        <label className="hk-form-label">Tarifa<input className="hk-form-select" type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} /></label>
        <label className="hk-form-label">Estado<select className="hk-form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option>Disponible</option><option>Ocupada</option><option>Limpieza</option><option>Mantenimiento</option></select></label>
      </div>
    </AdminModal>
  );
}

function RoomTypeModal({ roomType, onClose, onSave }: { roomType: AdminRoomType | null; onClose: () => void; onSave: (rt: AdminRoomType) => void }) {
  const [name, setName] = useState(roomType?.name ?? '');
  const [capacity, setCapacity] = useState(roomType?.capacity ?? 2);
  const [description, setDescription] = useState(roomType?.description ?? '');
  const [basePrice, setBasePrice] = useState(roomType?.basePrice ?? 1850);
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>(roomType?.status ?? 'Activo');
  return (
    <AdminModal title={roomType ? 'Editar tipo de habitación' : 'Nuevo tipo de habitación'} eyebrow="TIPOS DE HABITACIÓN" onClose={onClose} onSubmit={() => onSave({ id: roomType?.id ?? 0, name, capacity, description, features: roomType?.features ?? ['Cama king', 'Wi-Fi'], basePrice, status })} submitLabel={roomType ? 'Guardar cambios' : 'Crear tipo'}>
      <div className="rc-form-grid">
        <label className="hk-form-label">Nombre<input className="hk-form-select" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Deluxe" /></label>
        <label className="hk-form-label">Capacidad<input className="hk-form-select" type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></label>
      </div>
      <label className="hk-form-label">Descripción<textarea className="hk-form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del tipo de habitación" /></label>
      <div className="rc-form-grid">
        <label className="hk-form-label">Precio base<input className="hk-form-select" type="number" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} /></label>
        <label className="hk-form-label">Estado<select className="hk-form-select" value={status} onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></label>
      </div>
    </AdminModal>
  );
}

function SeasonRateModal({ roomTypes, onClose, onSave }: { roomTypes: AdminRoomType[]; onClose: () => void; onSave: (sr: SeasonRate) => void }) {
  const [roomType, setRoomType] = useState(roomTypes[0]?.name ?? '');
  const [seasonName, setSeasonName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [baseRate, setBaseRate] = useState(1850);
  const [seasonalRate, setSeasonalRate] = useState(0);
  return (
    <AdminModal title="Nueva tarifa de temporada" eyebrow="TARIFAS POR TEMPORADA" onClose={onClose} onSubmit={() => onSave({ id: 0, roomType, seasonName, startDate, endDate, baseRate, seasonalRate, status: 'Activa' })} submitLabel="Crear tarifa">
      <div className="rc-form-grid">
        <label className="hk-form-label">Tipo de habitación<select className="hk-form-select" value={roomType} onChange={(e) => setRoomType(e.target.value)}>{roomTypes.map((rt) => <option key={rt.id} value={rt.name}>{rt.name}</option>)}</select></label>
        <label className="hk-form-label">Temporada<input className="hk-form-select" value={seasonName} onChange={(e) => setSeasonName(e.target.value)} placeholder="Ej. Semana Santa" /></label>
        <label className="hk-form-label">Fecha inicio<input className="hk-form-select" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label className="hk-form-label">Fecha fin<input className="hk-form-select" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        <label className="hk-form-label">Tarifa base<input className="hk-form-select" type="number" value={baseRate} onChange={(e) => setBaseRate(Number(e.target.value))} /></label>
        <label className="hk-form-label">Tarifa especial<input className="hk-form-select" type="number" value={seasonalRate} onChange={(e) => setSeasonalRate(Number(e.target.value))} /></label>
      </div>
    </AdminModal>
  );
}

function DynamicRateModal({ onClose, onSave }: { onClose: () => void; onSave: (dr: DynamicRate) => void }) {
  const [condition, setCondition] = useState('Ocupación');
  const [operator, setOperator] = useState('>');
  const [threshold, setThreshold] = useState(80);
  const [adjustment, setAdjustment] = useState('Aumentar');
  const [value, setValue] = useState(15);
  return (
    <AdminModal title="Nueva regla dinámica" eyebrow="TARIFAS DINÁMICAS" onClose={onClose} onSubmit={() => onSave({ id: 0, condition, operator, threshold, adjustment, value, status: 'Activa' })} submitLabel="Crear regla">
      <div className="rc-form-grid">
        <label className="hk-form-label">Condición<select className="hk-form-select" value={condition} onChange={(e) => setCondition(e.target.value)}><option>Ocupación</option><option>Reservas con menos de</option><option>Estancia extendida (4+ noches)</option></select></label>
        <label className="hk-form-label">Operador<select className="hk-form-select" value={operator} onChange={(e) => setOperator(e.target.value)}><option value=">">{'Mayor que (>)'}</option><option value="<">{'Menor que (<)'}</option><option value=">=">{'Mayor o igual (>=)'}</option><option value="<=">{'Menor o igual (<=)'}</option></select></label>
        <label className="hk-form-label">Umbral<input className="hk-form-select" type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} /></label>
        <label className="hk-form-label">Ajuste<select className="hk-form-select" value={adjustment} onChange={(e) => setAdjustment(e.target.value)}><option>Aumentar</option><option>Disminuir</option></select></label>
        <label className="hk-form-label">Porcentaje (%)<input className="hk-form-select" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} /></label>
      </div>
    </AdminModal>
  );
}

function PromoModal({ promo, onClose, onSave }: { promo: Promo | null; onClose: () => void; onSave: (p: Promo) => void }) {
  const [name, setName] = useState(promo?.name ?? '');
  const [code, setCode] = useState(promo?.code ?? '');
  const [percentage, setPercentage] = useState(promo?.percentage ?? 10);
  const [startDate, setStartDate] = useState(promo?.startDate ?? '');
  const [endDate, setEndDate] = useState(promo?.endDate ?? '');
  const [conditions, setConditions] = useState(promo?.conditions ?? '');
  const [status, setStatus] = useState<'Activa' | 'Inactiva'>(promo?.status ?? 'Activa');
  return (
    <AdminModal title={promo ? 'Editar promoción' : 'Nueva promoción'} eyebrow="GESTIÓN DE PROMOCIONES" onClose={onClose} onSubmit={() => onSave({ id: promo?.id ?? 0, name, code, percentage, startDate, endDate, conditions, status })} submitLabel={promo ? 'Guardar cambios' : 'Crear promoción'}>
      <div className="rc-form-grid">
        <label className="hk-form-label">Nombre<input className="hk-form-select" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Estancia extendida" /></label>
        <label className="hk-form-label">Código<input className="hk-form-select" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ej. AURORA15" /></label>
        <label className="hk-form-label">Porcentaje (%)<input className="hk-form-select" type="number" value={percentage} onChange={(e) => setPercentage(Number(e.target.value))} /></label>
        <label className="hk-form-label">Estado<select className="hk-form-select" value={status} onChange={(e) => setStatus(e.target.value as 'Activa' | 'Inactiva')}><option value="Activa">Activa</option><option value="Inactiva">Inactiva</option></select></label>
        <label className="hk-form-label">Fecha inicio<input className="hk-form-select" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label className="hk-form-label">Fecha fin<input className="hk-form-select" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
      </div>
      <label className="hk-form-label">Condiciones<textarea className="hk-form-textarea" value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="Ej. Estancias de 4 noches o más" /></label>
    </AdminModal>
  );
}

function AmenityModal({ amenity, onClose, onSave }: { amenity: Amenity | null; onClose: () => void; onSave: (a: Amenity) => void }) {
  const [name, setName] = useState(amenity?.name ?? '');
  const [schedule, setSchedule] = useState(amenity?.schedule ?? '');
  const [available, setAvailable] = useState(amenity?.available ?? true);
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>(amenity?.status ?? 'Activo');
  const [icon, setIcon] = useState(amenity?.icon ?? 'Sparkles');
  return (
    <AdminModal title={amenity ? 'Editar amenidad' : 'Nueva amenidad'} eyebrow="GESTIÓN DE AMENIDADES" onClose={onClose} onSubmit={() => onSave({ id: amenity?.id ?? 0, name, schedule, available, status, icon })} submitLabel={amenity ? 'Guardar cambios' : 'Crear amenidad'}>
      <div className="rc-form-grid">
        <label className="hk-form-label">Nombre<input className="hk-form-select" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Piscina" /></label>
        <label className="hk-form-label">Horario<input className="hk-form-select" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Ej. 07:00 — 21:00" /></label>
        <label className="hk-form-label">Ícono<select className="hk-form-select" value={icon} onChange={(e) => setIcon(e.target.value)}><option value="Waves">Piscina</option><option value="Utensils">Restaurante</option><option value="Dumbbell">Gimnasio</option><option value="Sparkles">Spa</option><option value="Star">Terraza</option><option value="Wifi">Wi-Fi</option></select></label>
        <label className="hk-form-label">Disponibilidad<select className="hk-form-select" value={available ? 'si' : 'no'} onChange={(e) => setAvailable(e.target.value === 'si')}><option value="si">Disponible</option><option value="no">No disponible</option></select></label>
        <label className="hk-form-label">Estado<select className="hk-form-select" value={status} onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></label>
      </div>
    </AdminModal>
  );
}

function RsItemModal({ item, onClose, onSave }: { item: RoomServiceItem | null; onClose: () => void; onSave: (i: RoomServiceItem) => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? 'Desayunos');
  const [price, setPrice] = useState(item?.price ?? 0);
  const [available, setAvailable] = useState(item?.available ?? true);
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>(item?.status ?? 'Activo');
  const [image, setImage] = useState(item?.image ?? '');
  return (
    <AdminModal title={item ? 'Editar producto' : 'Nuevo producto'} eyebrow="CATÁLOGO DE ROOM SERVICE" onClose={onClose} onSubmit={() => onSave({ id: item?.id ?? 0, name, category, price, available, status, image: image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&h=200&w=300' })} submitLabel={item ? 'Guardar cambios' : 'Crear producto'}>
      <div className="rc-form-grid">
        <label className="hk-form-label">Nombre<input className="hk-form-select" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Desayuno Aurora" /></label>
        <label className="hk-form-label">Categoría<select className="hk-form-select" value={category} onChange={(e) => setCategory(e.target.value)}><option>Desayunos</option><option>Almuerzos</option><option>Cenas</option><option>Bebidas</option><option>Snacks</option></select></label>
        <label className="hk-form-label">Precio<input className="hk-form-select" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
        <label className="hk-form-label">Disponibilidad<select className="hk-form-select" value={available ? 'si' : 'no'} onChange={(e) => setAvailable(e.target.value === 'si')}><option value="si">Disponible</option><option value="no">No disponible</option></select></label>
        <label className="hk-form-label">Estado<select className="hk-form-select" value={status} onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></label>
      </div>
      <label className="hk-form-label">URL de imagen<input className="hk-form-select" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." /></label>
    </AdminModal>
  );
}

function ProductModal({ product, onClose, onSave }: { product: InventoryProduct | null; onClose: () => void; onSave: (p: InventoryProduct) => void }) {
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? 'Lencería');
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [minStock, setMinStock] = useState(product?.minStock ?? 0);
  const [price, setPrice] = useState(product?.price ?? 0);
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>(product?.status ?? 'Activo');
  return (
    <AdminModal title={product ? 'Editar producto' : 'Nuevo producto'} eyebrow="GESTIÓN DE INVENTARIO" onClose={onClose} onSubmit={() => onSave({ id: product?.id ?? 0, name, category, stock, minStock, price, status })} submitLabel={product ? 'Guardar cambios' : 'Crear producto'}>
      <div className="rc-form-grid">
        <label className="hk-form-label">Nombre<input className="hk-form-select" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Toallas de baño" /></label>
        <label className="hk-form-label">Categoría<select className="hk-form-select" value={category} onChange={(e) => setCategory(e.target.value)}><option>Lencería</option><option>Amenidades</option><option>Cocina</option><option>Bebidas</option><option>Limpieza</option></select></label>
        <label className="hk-form-label">Stock<input className="hk-form-select" type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} /></label>
        <label className="hk-form-label">Stock mínimo<input className="hk-form-select" type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} /></label>
        <label className="hk-form-label">Precio<input className="hk-form-select" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
        <label className="hk-form-label">Estado<select className="hk-form-select" value={status} onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></label>
      </div>
    </AdminModal>
  );
}

function MovementModal({ products, onClose, onSave }: { products: InventoryProduct[]; onClose: () => void; onSave: (m: { productId: number; type: 'Entrada' | 'Salida'; quantity: number; reason: string; responsible: string }) => void }) {
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [type, setType] = useState<'Entrada' | 'Salida'>('Entrada');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [responsible, setResponsible] = useState('Edgar González');
  return (
    <AdminModal title="Registrar movimiento" eyebrow="MOVIMIENTO DE INVENTARIO" onClose={onClose} onSubmit={() => onSave({ productId, type, quantity, reason, responsible })} submitLabel="Registrar">
      <div className="rc-form-grid">
        <label className="hk-form-label">Producto<select className="hk-form-select" value={productId} onChange={(e) => setProductId(Number(e.target.value))}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="hk-form-label">Tipo<select className="hk-form-select" value={type} onChange={(e) => setType(e.target.value as 'Entrada' | 'Salida')}><option value="Entrada">Entrada</option><option value="Salida">Salida</option></select></label>
        <label className="hk-form-label">Cantidad<input className="hk-form-select" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></label>
        <label className="hk-form-label">Responsable<input className="hk-form-select" value={responsible} onChange={(e) => setResponsible(e.target.value)} /></label>
      </div>
      <label className="hk-form-label">Motivo<textarea className="hk-form-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. Compra mensual, reposición..." /></label>
    </AdminModal>
  );
}

function CashModal({ onClose, onSave }: { onClose: () => void; onSave: (m: { concept: string; type: 'Ingreso' | 'Egreso'; amount: number; responsible: string }) => void }) {
  const [concept, setConcept] = useState('');
  const [type, setType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [amount, setAmount] = useState(0);
  const [responsible, setResponsible] = useState('Edgar González');
  return (
    <AdminModal title="Nuevo movimiento de caja" eyebrow="GESTIÓN DE CAJA" onClose={onClose} onSubmit={() => onSave({ concept, type, amount, responsible })} submitLabel="Registrar">
      <div className="rc-form-grid">
        <label className="hk-form-label">Concepto<input className="hk-form-select" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Pago de huésped" /></label>
        <label className="hk-form-label">Tipo<select className="hk-form-select" value={type} onChange={(e) => setType(e.target.value as 'Ingreso' | 'Egreso')}><option value="Ingreso">Ingreso</option><option value="Egreso">Egreso</option></select></label>
        <label className="hk-form-label">Monto<input className="hk-form-select" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
        <label className="hk-form-label">Responsable<input className="hk-form-select" value={responsible} onChange={(e) => setResponsible(e.target.value)} /></label>
      </div>
    </AdminModal>
  );
}
