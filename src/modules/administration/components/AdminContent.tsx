import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Ban,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  DollarSign,
  Dumbbell,
  Download,
  FileText,
  Package,
  Pencil,
  Percent,
  Plus,
  Search,
  Sparkles,
  Star,
  TriangleAlert,
  TrendingUp,
  Users as UsersIcon,
  Utensils,
  Wallet,
  Waves,
  Wifi,
  X,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { auditService } from '@/services/auditService';
import { cashService } from '@/services/cashService';
import { catalogService } from '@/services/catalogService';
import { inventoryService } from '@/services/inventoryService';
import { personnelService } from '@/services/personnelService';
import { promotionService } from '@/services/promotionService';
import { roomService } from '@/services/roomService';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { toDtoCalendarDate } from '@/shared/types/common';
import type { AuditAction, AuditLog, AuditModule } from '@/shared/types/entities/audit-log';
import type { InventoryItemCategory } from '@/shared/types/entities/inventory-item';
import type { InventoryMovementReason } from '@/shared/types/entities/inventory-movement';
import type { Product } from '@/shared/types/entities/product';
import type { Role } from '@/shared/types/entities/role';
import type { Room } from '@/shared/types/entities/room';
import type { RoomType } from '@/shared/types/entities/room-type';
import type { User } from '@/shared/types/entities/user';

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'Activo' | 'Inactivo';
  lastAccess: string;
};
type AdminRole = {
  id: number;
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  userCount: number;
};
type AdminRoom = {
  id: number;
  number: string;
  floor: string;
  type: string;
  capacity: number;
  rate: number;
  status: string;
  features: string[];
};
type AdminRoomType = {
  id: number;
  name: string;
  capacity: number;
  description: string;
  features: string[];
  basePrice: number;
  status: 'Activo' | 'Inactivo';
};
type SeasonRate = {
  id: number;
  roomType: string;
  seasonName: string;
  startDate: string;
  endDate: string;
  baseRate: number;
  seasonalRate: number;
  status: 'Activa' | 'Inactiva';
};
type DynamicRate = {
  id: number;
  condition: string;
  operator: string;
  threshold: number;
  adjustment: string;
  value: number;
  status: 'Activa' | 'Inactiva';
};
type Promo = {
  id: number;
  name: string;
  code: string;
  percentage: number;
  startDate: string;
  endDate: string;
  conditions: string;
  status: 'Activa' | 'Inactiva';
};
type Amenity = {
  id: number;
  name: string;
  schedule: string;
  available: boolean;
  status: 'Activo' | 'Inactivo';
  icon: string;
};
type RoomServiceItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  available: boolean;
  status: 'Activo' | 'Inactivo';
  image: string;
};
type InventoryProduct = {
  id: number;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  status: 'Activo' | 'Inactivo';
};
type InventoryMovement = {
  id: number;
  date: string;
  product: string;
  type: 'Entrada' | 'Salida';
  quantity: number;
  reason: string;
  responsible: string;
};
type CashMovement = {
  id: number;
  date: string;
  concept: string;
  type: 'Ingreso' | 'Egreso';
  amount: number;
  responsible: string;
};
type AuditEntry = {
  id: number;
  user: string;
  date: string;
  time: string;
  module: string;
  action: string;
  description: string;
};
type ReportPeriod = 'Día' | 'Semana' | 'Mes' | 'Año' | 'Temporada';
type AdminReportTab =
  'Ocupación' | 'Ingresos' | 'Reservas' | 'Cancelaciones' | 'Canales' | 'Servicios' | 'Temporadas';
type DashboardPeriod = 'Hoy' | '7 días' | '30 días' | '90 días';

const ALL_PERMISSIONS = [
  'Recepción',
  'Reservaciones',
  'Caja',
  'Inventario',
  'Reportes',
  'Administración',
  'Room Service',
];

/**
 * Tarifas dinámicas (ajuste automático por ocupación/anticipación): no
 * existe colección en data/db.ts ni contrato de entidad para esto — es un
 * concepto del prototipo Bolt que nadie llegó a conectar. Fuera de alcance
 * hasta que se defina el contrato — ver HU-22. No se le agrega respaldo con
 * warning porque no hay nada "ausente" que avisar: simplemente no existe
 * todavía como entidad.
 */
const defaultDynamicRates: DynamicRate[] = [
  {
    id: 1,
    condition: 'Ocupación',
    operator: '>',
    threshold: 80,
    adjustment: 'Aumentar',
    value: 15,
    status: 'Activa',
  },
  {
    id: 2,
    condition: 'Ocupación',
    operator: '>',
    threshold: 90,
    adjustment: 'Aumentar',
    value: 25,
    status: 'Activa',
  },
  {
    id: 3,
    condition: 'Reservas con menos de',
    operator: '<',
    threshold: 3,
    adjustment: 'Disminuir',
    value: 10,
    status: 'Activa',
  },
  {
    id: 4,
    condition: 'Estancia extendida (4+ noches)',
    operator: '>=',
    threshold: 4,
    adjustment: 'Disminuir',
    value: 12,
    status: 'Inactiva',
  },
];

const parseDbId = (id: string, fallback: number) => {
  const value = Number(id.replace(/\D/g, ''));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const centsToAmount = (cents: number) => Math.round(cents / 100);

const formatDbTime = (value: Date) =>
  value.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false });

const userNameById = (users: User[], userId?: string) => {
  const user = users.find((item) => item.id === userId);
  return user ? `${user.firstName} ${user.lastName}` : 'Sistema';
};

const roomTypeNameById = (roomTypes: RoomType[], roomTypeId?: string) =>
  roomTypes.find((type) => type.id === roomTypeId)?.name ?? 'Estándar';

/**
 * `role.code` no pasa por el mismo mapeo que `user.role`: el mapper de
 * `user` convierte 'room_service' (DTO) a 'roomService' (Model), pero el
 * mapper de `role` deja `code` tal cual llega del DTO. D-003
 * (docs/DECISIONES.md) dice que corresponden por valor — en la práctica
 * hay que normalizar antes de comparar. Mismo criterio que ya usa el
 * mapper de user, no una regla nueva.
 */
const normalizeRoleCode = (code: string) => (code === 'room_service' ? 'roomService' : code);

const roomStatusLabel = (
  status: Room['status'],
  housekeepingStatus: Room['housekeepingStatus'],
) => {
  if (status === 'occupied') return 'Ocupada';
  if (status === 'maintenance' || status === 'outOfService') return 'Mantenimiento';
  if (housekeepingStatus === 'dirty' || housekeepingStatus === 'cleaning') return 'Limpieza';
  return 'Disponible';
};

const INVENTORY_CATEGORY_LABELS: Record<InventoryItemCategory, string> = {
  roomService: 'Room Service',
  housekeeping: 'Housekeeping',
  maintenance: 'Mantenimiento',
  office: 'Oficina',
};

const INVENTORY_REASON_LABELS: Record<InventoryMovementReason, string> = {
  purchase: 'Compra',
  restock: 'Reposición',
  consumption: 'Consumo',
  sale: 'Venta',
  shrinkage: 'Merma',
};

/**
 * Los módulos/acciones de auditoría reales (AuditModule/AuditAction) no
 * coinciden con el vocabulario que el prototipo Bolt inventó ('Tarifas',
 * 'Room Service', 'Edición'...) — son categorías distintas. Se traducen
 * los valores reales, no se inventan nuevos.
 */
const AUDIT_MODULE_LABELS: Record<AuditModule, string> = {
  guestAccounts: 'Cuentas de huésped',
  cash: 'Caja',
  inventory: 'Inventario',
  catalog: 'Catálogo',
  users: 'Usuarios',
  bookings: 'Reservas',
};

const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
  void: 'Anulación',
  open: 'Apertura',
  close: 'Cierre',
};

const dashboardPeriodOptions: DashboardPeriod[] = ['Hoy', '7 días', '30 días', '90 días'];
const reportTabs: AdminReportTab[] = [
  'Ocupación',
  'Ingresos',
  'Reservas',
  'Cancelaciones',
  'Canales',
  'Servicios',
  'Temporadas',
];
const reportPeriodOptions: ReportPeriod[] = ['Día', 'Semana', 'Mes', 'Año', 'Temporada'];
const dashboardSeries: Record<
  DashboardPeriod,
  Record<
    'Ocupación' | 'Ingresos' | 'Reservas',
    { data: number[]; labels: string[]; value: string; change: string }
  >
> = {
  Hoy: {
    Ocupación: {
      data: [42, 48, 55, 61, 68, 74, 79],
      labels: ['06:00', '09:00', '12:00', '15:00', '18:00'],
      value: '79.0%',
      change: '+3.2% vs. ayer',
    },
    Ingresos: {
      data: [18, 24, 31, 44, 52, 61, 74],
      labels: ['06:00', '09:00', '12:00', '15:00', '18:00'],
      value: '$7.4K',
      change: '+5.1% vs. ayer',
    },
    Reservas: {
      data: [2, 4, 5, 8, 9, 12, 14],
      labels: ['06:00', '09:00', '12:00', '15:00', '18:00'],
      value: '14',
      change: '+2 hoy',
    },
  },
  '7 días': {
    Ocupación: {
      data: [71, 76, 74, 80, 83, 78, 86],
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      value: '78.3%',
      change: '+4.6% vs. semana anterior',
    },
    Ingresos: {
      data: [82, 94, 88, 105, 122, 118, 130],
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      value: '$73.9K',
      change: '+9.8% vs. semana anterior',
    },
    Reservas: {
      data: [18, 22, 19, 26, 31, 28, 34],
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      value: '178',
      change: '+12 reservas',
    },
  },
  '30 días': {
    Ocupación: {
      data: [62, 68, 65, 72, 70, 78, 75, 82, 79, 85, 88, 84, 90, 87, 92],
      labels: ['01 ago', '05 ago', '10 ago', '15 ago', '20 ago', '25 ago', '30 ago'],
      value: '84.6%',
      change: '+8.2% vs. mes anterior',
    },
    Ingresos: {
      data: [98, 112, 105, 128, 135, 142, 128, 152, 148, 166, 172, 164, 181, 176, 190],
      labels: ['01 ago', '05 ago', '10 ago', '15 ago', '20 ago', '25 ago', '30 ago'],
      value: '$128.4K',
      change: '+14.5% vs. mes anterior',
    },
    Reservas: {
      data: [28, 35, 32, 40, 38, 45, 42, 48, 46, 52, 55, 50, 58, 56, 61],
      labels: ['01 ago', '05 ago', '10 ago', '15 ago', '20 ago', '25 ago', '30 ago'],
      value: '642',
      change: '+8.9% vs. mes anterior',
    },
  },
  '90 días': {
    Ocupación: {
      data: [58, 64, 69, 73, 76, 81, 84, 86, 89],
      labels: ['Jun', 'Jul', 'Ago', 'Sep'],
      value: '81.2%',
      change: '+10.4% vs. trimestre anterior',
    },
    Ingresos: {
      data: [260, 282, 304, 336, 352, 371, 390, 415, 438],
      labels: ['Jun', 'Jul', 'Ago', 'Sep'],
      value: '$438K',
      change: '+18.1% vs. trimestre anterior',
    },
    Reservas: {
      data: [118, 130, 142, 158, 171, 184, 192, 204, 218],
      labels: ['Jun', 'Jul', 'Ago', 'Sep'],
      value: '1,517',
      change: '+15.3% vs. trimestre anterior',
    },
  },
};
const reportPeriodData: Record<
  ReportPeriod,
  {
    labels: string[];
    occupancy: number[];
    income: number[];
    reservations: number[];
    cancellations: number[];
    occupancyValue: string;
    incomeValue: string;
    reservationsValue: string;
    cancellationValue: string;
    trend: string;
    change: string;
  }
> = {
  Día: {
    labels: ['06', '09', '12', '15', '18', '21'],
    occupancy: [42, 51, 58, 65, 72, 79],
    income: [18, 24, 31, 44, 52, 61],
    reservations: [2, 4, 5, 8, 9, 12],
    cancellations: [1, 0, 1, 2, 1, 0],
    occupancyValue: '79.0%',
    incomeValue: '$7.4K',
    reservationsValue: '14',
    cancellationValue: '5',
    trend: 'En aumento',
    change: '+3.2%',
  },
  Semana: {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    occupancy: [71, 76, 74, 80, 83, 78, 86],
    income: [82, 94, 88, 105, 122, 118, 130],
    reservations: [18, 22, 19, 26, 31, 28, 34],
    cancellations: [3, 4, 2, 5, 3, 2, 4],
    occupancyValue: '78.3%',
    incomeValue: '$73.9K',
    reservationsValue: '178',
    cancellationValue: '23',
    trend: 'Estable',
    change: '+4.6%',
  },
  Mes: {
    labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'],
    occupancy: [62, 68, 65, 72, 70, 78, 75, 82, 79, 85, 88, 84, 90, 87, 92],
    income: [98, 112, 105, 128, 135, 142, 128],
    reservations: [38, 45, 32, 27, 41, 48, 52],
    cancellations: [15, 12, 10, 14, 8, 11, 9],
    occupancyValue: '84.6%',
    incomeValue: '$128.4K',
    reservationsValue: '241',
    cancellationValue: '12',
    trend: 'Ascendente',
    change: '+8.2%',
  },
  Año: {
    labels: ['Ene', 'Mar', 'May', 'Jul', 'Sep', 'Nov'],
    occupancy: [65, 70, 74, 78, 82, 88],
    income: [240, 268, 292, 315, 344, 372],
    reservations: [420, 452, 488, 510, 548, 590],
    cancellations: [38, 34, 31, 28, 26, 24],
    occupancyValue: '81.8%',
    incomeValue: '$1.92M',
    reservationsValue: '5,840',
    cancellationValue: '8.1%',
    trend: 'Crecimiento',
    change: '+11.6%',
  },
  Temporada: {
    labels: ['Baja', 'Media', 'Alta', 'Festiva'],
    occupancy: [64, 78, 91, 96],
    income: [228, 321, 482, 536],
    reservations: [280, 420, 580, 640],
    cancellations: [11, 8, 6, 5],
    occupancyValue: '88.4%',
    incomeValue: '$536K',
    reservationsValue: '640',
    cancellationValue: '5.0%',
    trend: 'Alta demanda',
    change: '+16.9%',
  },
};

const amenityIconMap: Record<string, LucideIcon> = {
  Waves,
  Utensils,
  Dumbbell,
  Sparkles,
  Star,
  Wifi,
};
const roomStatusClass = (status: string) =>
  status === 'Disponible'
    ? 'success'
    : status === 'Ocupada'
      ? 'warning'
      : status === 'Limpieza'
        ? 'info'
        : 'terracotta';
const statusPillClass = (status: string) =>
  status === 'Activo' || status === 'Activa'
    ? 'success'
    : status === 'Inactivo' || status === 'Inactiva'
      ? 'terracotta'
      : 'info';

function AdminModal({
  title,
  eyebrow,
  onClose,
  children,
  onSubmit,
  submitLabel,
  width = 480,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  width?: number;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
        {onSubmit && (
          <div className="modal-foot">
            <button className="button secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="button primary" onClick={onSubmit}>
              {submitLabel || 'Guardar'} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminToolbar({
  search,
  setSearch,
  filterLabel,
  filterValue,
  setFilter,
  filterOptions,
  onAction,
}: {
  search: string;
  setSearch: (v: string) => void;
  filterLabel?: string;
  filterValue?: string;
  setFilter?: (v: string) => void;
  filterOptions?: string[];
  onAction?: (msg: string) => void;
}) {
  return (
    <div className="toolbar">
      <div className="search-box">
        <Search size={17} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." />
      </div>
      {filterLabel && filterOptions && setFilter && (
        <div className="filter-dropdown">
          <button className="filter-button">
            <span>{filterValue}</span>
            <ChevronDown size={15} />
          </button>
          <div className="filter-menu">
            {filterOptions.map((opt) => (
              <button
                key={opt}
                className={filterValue === opt ? 'active' : ''}
                onClick={() => setFilter(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
      {onAction && (
        <button className="icon-btn" onClick={() => onAction('Más filtros abiertos')}>
          <Settings size={18} />
        </button>
      )}
    </div>
  );
}

function AdminTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function StatusSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      className={`adm-status-switch ${checked ? 'on' : ''}`}
      aria-label={label}
      title={label}
      onClick={onChange}
    >
      <span />
    </button>
  );
}

function EditIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="button small secondary adm-icon-action"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Pencil size={14} />
    </button>
  );
}

function MiniChart({
  data,
  labels,
  color = '#b88d50',
}: {
  data: number[];
  labels: string[];
  color?: string;
}) {
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 720},${210 - (v / max) * 180}`)
    .join(' ');
  const fillPoints = `${points} 720,210 0,210`;
  const chartLabels =
    labels.length <= 5
      ? labels
      : labels.filter(
          (_, index) =>
            index === 0 ||
            index === Math.floor((labels.length - 1) / 2) ||
            index === labels.length - 1,
        );
  return (
    <div className="chart-area">
      <div className="chart">
        <div className="chart-y">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>
        <div className="chart-lines">
          <i />
          <i />
          <i />
          <i />
          <i />
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
        <div className="chart-x">
          {chartLabels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
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

type AdminData = {
  users: AdminUser[];
  roles: AdminRole[];
  rooms: AdminRoom[];
  roomTypes: AdminRoomType[];
  seasonRates: SeasonRate[];
  promos: Promo[];
  amenities: Amenity[];
  roomServiceItems: RoomServiceItem[];
  inventory: InventoryProduct[];
  movements: InventoryMovement[];
  cashMovements: CashMovement[];
  audit: AuditEntry[];
  recentActivity: AuditEntry[];
};

type ScreenState =
  { status: 'loading' } | { status: 'error'; message: string } | ({ status: 'ready' } & AdminData);

function getErrorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'No fue posible cargar el panel de administración.';
}

function buildAuditEntries(logs: AuditLog[], users: User[]): AuditEntry[] {
  return logs.map((entry, index) => ({
    id: parseDbId(entry.id, index + 1),
    user: userNameById(users, entry.userId),
    date: toDtoCalendarDate(entry.occurredAt),
    time: formatDbTime(entry.occurredAt),
    module: AUDIT_MODULE_LABELS[entry.module],
    action: AUDIT_ACTION_LABELS[entry.action],
    description: `${entry.entityType} ${entry.entityId}`,
  }));
}

export function AdminContent({
  nav,
  onAction,
  onNavigate,
}: {
  nav: string;
  onAction: (message: string) => void;
  onNavigate?: (nav: string) => void;
}) {
  const [screen, setScreen] = useState<ScreenState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    async function load() {
      setScreen({ status: 'loading' });
      try {
        const [
          users,
          roles,
          permissions,
          rooms,
          roomTypes,
          roomFeatures,
          rates,
          amenitiesData,
          products,
          inventoryItems,
          inventoryMovements,
          cashMovementsData,
          auditLogs,
          promotions,
        ] = await Promise.all([
          personnelService.getUsers(),
          personnelService.getRoles(),
          personnelService.getPermissions(),
          roomService.getRooms(),
          roomService.getRoomTypes(),
          roomService.getRoomFeatures(),
          roomService.getRates(),
          catalogService.getAmenities(),
          catalogService.getProducts(),
          inventoryService.getItems(),
          inventoryService.getMovements(),
          cashService.getMovements(),
          auditService.getLogs(),
          promotionService.getPromotions(),
        ]);

        const adminUsers: AdminUser[] = users.map((user, index) => ({
          id: parseDbId(user.id, index + 1),
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role:
            roles.find((role: Role) => normalizeRoleCode(role.code) === user.role)?.name ??
            user.role,
          status: user.status === 'active' ? 'Activo' : 'Inactivo',
          lastAccess: toDtoCalendarDate(user.updatedAt),
        }));

        const adminRoles: AdminRole[] = roles.map((role, index) => ({
          id: parseDbId(role.id, index + 1),
          name: role.name,
          description: `Rol ${role.code}`,
          userCount: users.filter((user) => user.role === normalizeRoleCode(role.code)).length,
          permissions: Object.fromEntries(
            ALL_PERMISSIONS.map((label, permissionIndex) => {
              const permission = permissions[permissionIndex];
              return [label, permission ? role.permissionIds.includes(permission.id) : false];
            }),
          ) as Record<string, boolean>,
        }));

        const adminRooms: AdminRoom[] = rooms.map((room, index) => {
          const roomType = roomTypes.find((type) => type.id === room.roomTypeId);
          const rate = rates.find((item) => item.roomTypeId === room.roomTypeId);
          const features = (roomType?.roomFeatureIds ?? [])
            .map((featureId) => roomFeatures.find((feature) => feature.id === featureId)?.name)
            .filter((name): name is string => Boolean(name));
          return {
            id: index + 1,
            number: room.roomNumber,
            floor: `Piso ${room.floor}`,
            type: roomTypeNameById(roomTypes, room.roomTypeId),
            capacity: roomType?.capacity ?? 2,
            rate: rate ? centsToAmount(rate.priceCents) : 0,
            status: roomStatusLabel(room.status, room.housekeepingStatus),
            features,
          };
        });

        const adminRoomTypes: AdminRoomType[] = roomTypes.map((roomType, index) => ({
          id: parseDbId(roomType.id, index + 1),
          name: roomType.name,
          capacity: roomType.capacity,
          description: roomType.description ?? '',
          features: roomType.roomFeatureIds
            .map((featureId) => roomFeatures.find((feature) => feature.id === featureId)?.name)
            .filter((name): name is string => Boolean(name)),
          basePrice: centsToAmount(
            rates.find((rate) => rate.roomTypeId === roomType.id)?.priceCents ?? 0,
          ),
          status: roomType.active ? 'Activo' : 'Inactivo',
        }));

        const seasonRates: SeasonRate[] = rates.map((rate, index) => ({
          id: parseDbId(rate.id, index + 1),
          roomType: roomTypeNameById(roomTypes, rate.roomTypeId),
          seasonName: rate.name,
          startDate: toDtoCalendarDate(rate.validFrom),
          endDate: toDtoCalendarDate(rate.validTo),
          baseRate: centsToAmount(rate.priceCents),
          seasonalRate: centsToAmount(rate.priceCents),
          status: rate.active ? 'Activa' : 'Inactiva',
        }));

        const promos: Promo[] = promotions.map((promo, index) => ({
          id: parseDbId(promo.id, index + 1),
          name: promo.name,
          code: promo.code,
          percentage: promo.discountPercent,
          startDate: toDtoCalendarDate(promo.validFrom),
          endDate: toDtoCalendarDate(promo.validTo),
          conditions: promo.description,
          status: promo.active ? 'Activa' : 'Inactiva',
        }));

        const amenities: Amenity[] = amenitiesData.map((amenity, index) => ({
          id: parseDbId(amenity.id, index + 1),
          name: amenity.name,
          schedule: 'Disponible',
          available: amenity.active,
          status: amenity.active ? 'Activo' : 'Inactivo',
          icon: ['Waves', 'Utensils', 'Dumbbell', 'Sparkles', 'Star', 'Wifi'][index % 6],
        }));

        const roomServiceItems: RoomServiceItem[] = products
          .filter((product: Product) => product.category === 'foodAndBeverage')
          .map((product, index) => ({
            id: parseDbId(product.id, index + 1),
            name: product.name,
            category: 'Room Service',
            price: centsToAmount(product.priceCents),
            available: product.active,
            status: product.active ? 'Activo' : 'Inactivo',
            image: '',
          }));

        const inventory: InventoryProduct[] = inventoryItems.map((item, index) => {
          const product = products.find((productItem) => productItem.id === item.productId);
          return {
            id: parseDbId(item.id, index + 1),
            name: item.name,
            category: INVENTORY_CATEGORY_LABELS[item.category],
            stock: item.currentQuantity,
            minStock: item.minimumQuantity,
            price: product ? centsToAmount(product.priceCents) : 0,
            status: item.active ? 'Activo' : 'Inactivo',
          };
        });

        const movements: InventoryMovement[] = inventoryMovements.map((movement, index) => ({
          id: parseDbId(movement.id, index + 1),
          date: toDtoCalendarDate(movement.occurredAt),
          product:
            inventoryItems.find((item) => item.id === movement.inventoryItemId)?.name ??
            movement.inventoryItemId,
          type: movement.type === 'in' ? 'Entrada' : 'Salida',
          quantity: movement.quantity,
          reason: INVENTORY_REASON_LABELS[movement.reason],
          responsible: userNameById(users, movement.responsibleUserId),
        }));

        const cashMovements: CashMovement[] = cashMovementsData.map((movement, index) => ({
          id: parseDbId(movement.id, index + 1),
          date: toDtoCalendarDate(movement.occurredAt),
          concept: movement.concept,
          type: movement.type === 'income' ? 'Ingreso' : 'Egreso',
          amount: centsToAmount(movement.amountCents),
          responsible: userNameById(users, movement.responsibleUserId),
        }));

        const audit = buildAuditEntries(auditLogs, users);
        const recentActivity = buildAuditEntries(
          [...auditLogs]
            .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
            .slice(0, 4),
          users,
        );

        if (active) {
          setScreen({
            status: 'ready',
            users: adminUsers,
            roles: adminRoles,
            rooms: adminRooms,
            roomTypes: adminRoomTypes,
            seasonRates,
            promos,
            amenities,
            roomServiceItems,
            inventory,
            movements,
            cashMovements,
            audit,
            recentActivity,
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
  }, []);

  if (screen.status === 'loading') {
    return <LoadingState label="Cargando el panel de administración..." />;
  }

  if (screen.status === 'error') {
    return (
      <ErrorState
        title="No pudimos cargar el panel de administración"
        description={screen.message}
        onRetry={() => setScreen({ status: 'loading' })}
      />
    );
  }

  return (
    <AdminContentReady
      nav={nav}
      onAction={onAction}
      onNavigate={onNavigate}
      initialAdminUsers={screen.users}
      initialAdminRoles={screen.roles}
      initialAdminRooms={screen.rooms}
      initialAdminRoomTypes={screen.roomTypes}
      initialSeasonRates={screen.seasonRates}
      initialPromos={screen.promos}
      initialAmenities={screen.amenities}
      initialRoomServiceItems={screen.roomServiceItems}
      initialInventory={screen.inventory}
      initialMovements={screen.movements}
      initialCashMovements={screen.cashMovements}
      initialAudit={screen.audit}
      recentActivity={screen.recentActivity}
    />
  );
}

function AdminContentReady({
  nav,
  onAction,
  onNavigate,
  initialAdminUsers,
  initialAdminRoles,
  initialAdminRooms,
  initialAdminRoomTypes,
  initialSeasonRates,
  initialPromos,
  initialAmenities,
  initialRoomServiceItems,
  initialInventory,
  initialMovements,
  initialCashMovements,
  initialAudit,
  recentActivity,
}: {
  nav: string;
  onAction: (message: string) => void;
  onNavigate?: (nav: string) => void;
  initialAdminUsers: AdminUser[];
  initialAdminRoles: AdminRole[];
  initialAdminRooms: AdminRoom[];
  initialAdminRoomTypes: AdminRoomType[];
  initialSeasonRates: SeasonRate[];
  initialPromos: Promo[];
  initialAmenities: Amenity[];
  initialRoomServiceItems: RoomServiceItem[];
  initialInventory: InventoryProduct[];
  initialMovements: InventoryMovement[];
  initialCashMovements: CashMovement[];
  initialAudit: AuditEntry[];
  recentActivity: AuditEntry[];
}) {
  const [users, setUsers] = useState(initialAdminUsers);
  const [roles, setRoles] = useState(initialAdminRoles);
  const [rooms, setRooms] = useState(initialAdminRooms);
  const [roomTypes, setRoomTypes] = useState(initialAdminRoomTypes);
  const [seasonRates, setSeasonRates] = useState(initialSeasonRates);
  const [dynamicRates, setDynamicRates] = useState(defaultDynamicRates);
  const [promos, setPromos] = useState(initialPromos);
  const [amenities, setAmenities] = useState(initialAmenities);
  const [rsItems, setRsItems] = useState(initialRoomServiceItems);
  const [inventory, setInventory] = useState(initialInventory);
  const [movements] = useState(initialMovements);
  const [cashMovements, setCashMovements] = useState(initialCashMovements);
  const [audit] = useState(initialAudit);

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
  const [reportFilter, setReportFilter] = useState<ReportPeriod>('Mes');
  const [reportTab, setReportTab] = useState<AdminReportTab>('Ocupación');
  const [dashboardTab, setDashboardTab] = useState<'Ocupación' | 'Ingresos' | 'Reservas'>(
    'Ocupación',
  );
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>('30 días');

  const resetSearch = () => {
    setSearch('');
    setFilter('Todos');
  };

  // ─── DASHBOARD ───
  if (nav === 'Dashboard') {
    const lowStock = inventory.filter((p) => p.stock <= p.minStock);
    const dashboardChart = dashboardSeries[dashboardPeriod][dashboardTab];
    const dashboardLegend =
      dashboardTab === 'Ocupación'
        ? 'Ocupación promedio'
        : dashboardTab === 'Ingresos'
          ? 'Ingresos acumulados'
          : 'Reservas confirmadas';
    return (
      <>
        <div className="dashboard-grid">
          <div className="panel main-panel">
            <div className="panel-heading">
              <div>
                <h3>Rendimiento del hotel</h3>
                <p>Ocupación y rendimiento durante este periodo</p>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  if (onNavigate) onNavigate('Reportes');
                  else onAction('Reportes seleccionado');
                }}
              >
                Ver todo <ArrowRight size={15} />
              </button>
            </div>
            <div className="chart-tabs">
              {(['Ocupación', 'Ingresos', 'Reservas'] as const).map((tab) => (
                <button
                  key={tab}
                  className={dashboardTab === tab ? 'active' : ''}
                  onClick={() => setDashboardTab(tab)}
                >
                  {tab}
                </button>
              ))}
              <div className="filter-dropdown">
                <button className="filter-button">
                  <span>{dashboardPeriod}</span>
                  <ChevronDown size={14} />
                </button>
                <div className="filter-menu">
                  {dashboardPeriodOptions.map((period) => (
                    <button
                      key={period}
                      className={dashboardPeriod === period ? 'active' : ''}
                      onClick={() => setDashboardPeriod(period)}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <MiniChart
              data={dashboardChart.data}
              labels={dashboardChart.labels}
              color={dashboardTab === 'Reservas' ? '#5f7f9d' : undefined}
            />
            <div className="chart-footer">
              <span>
                <i className="legend-dot" /> {dashboardLegend}
              </span>
              <strong>{dashboardChart.value}</strong>
              <span className="positive">{dashboardChart.change}</span>
            </div>
          </div>
          <div className="panel side-panel">
            <div className="panel-heading">
              <div>
                <h3>Alertas de stock</h3>
                <p>Productos con inventario bajo</p>
              </div>
              <span className={`status-pill ${lowStock.length > 0 ? 'warning' : 'success'}`}>
                {lowStock.length} alertas
              </span>
            </div>
            {lowStock.length === 0 ? (
              <div className="hk-empty">
                <Check size={22} />
                <p>Todas las existencias están correctas</p>
              </div>
            ) : (
              <div className="adm-alert-list">
                {lowStock.map((p) => (
                  <div className="adm-alert-row" key={p.id}>
                    <span className="status-pill warning">
                      <TriangleAlert size={12} /> Stock bajo
                    </span>
                    <div>
                      <strong>{p.name}</strong>
                      <span>
                        {p.category} · {p.stock} unidades (mín: {p.minStock})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="hk-summary-divider" />
            <div className="panel-heading">
              <div>
                <h3>Estado de caja</h3>
                <p>Resumen de hoy</p>
              </div>
            </div>
            <div className="adm-cash-summary">
              <div>
                <span>Saldo inicial</span>
                <strong>$5,000</strong>
              </div>
              <div>
                <span>Ingresos</span>
                <strong className="success-text">$13,100</strong>
              </div>
              <div>
                <span>Egresos</span>
                <strong className="terracotta-text">$1,170</strong>
              </div>
              <div>
                <span>Saldo actual</span>
                <strong>$16,930</strong>
              </div>
            </div>
          </div>
        </div>
        <div className="bottom-grid">
          <div className="panel occupancy-panel">
            <div className="panel-heading">
              <div>
                <h3>Estado de habitaciones</h3>
                <p>Vista rápida del inventario en tiempo real</p>
              </div>
              <button
                className="button small secondary"
                onClick={() => {
                  if (onNavigate) onNavigate('Habitaciones');
                  else onAction('Habitaciones seleccionado');
                }}
              >
                Gestionar <ArrowRight size={14} />
              </button>
            </div>
            <div className="room-stats">
              <div className="room-stat">
                <span className="room-dot occupied" />
                <div>
                  <strong>04</strong>
                  <small>Ocupadas</small>
                </div>
              </div>
              <div className="room-stat">
                <span className="room-dot available" />
                <div>
                  <strong>05</strong>
                  <small>Disponibles</small>
                </div>
              </div>
              <div className="room-stat">
                <span className="room-dot cleaning" />
                <div>
                  <strong>01</strong>
                  <small>Limpieza</small>
                </div>
              </div>
              <div className="room-stat">
                <span className="room-dot maintenance" />
                <div>
                  <strong>01</strong>
                  <small>Mantenimiento</small>
                </div>
              </div>
            </div>
            <div className="progress-line">
              <span>Ocupación general</span>
              <strong>36%</strong>
              <div>
                <i style={{ width: '36%' }} />
              </div>
            </div>
          </div>
          <div className="panel quick-panel">
            <div className="panel-heading">
              <div>
                <h3>Actividad reciente</h3>
                <p>Últimos movimientos del hotel</p>
              </div>
              <button className="icon-btn" onClick={() => onAction('Actividad actualizada')}>
                <Activity size={17} />
              </button>
            </div>
            {recentActivity.length === 0 ? (
              <div className="hk-empty">
                <Activity size={20} />
                <p>Sin actividad registrada todavía</p>
              </div>
            ) : (
              <div className="activity-list">
                {recentActivity.map((entry) => (
                  <div className="activity-item" key={entry.id}>
                    <span
                      className={`activity-dot ${entry.action === 'Anulación' || entry.action === 'Eliminación' || entry.action === 'Cierre' ? 'terracotta' : 'success'}`}
                    />
                    <div>
                      <p>
                        {entry.module} · {entry.action} · {entry.description}
                      </p>
                      <small>
                        {entry.date} {entry.time}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── USUARIOS Y ROLES ───
  if (nav === 'Usuarios y roles') {
    const filtered = users.filter((u) => {
      const ms = `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase());
      const mf =
        filter === 'Todos' ||
        u.role === filter ||
        (filter === 'Activo' && u.status === 'Activo') ||
        (filter === 'Inactivo' && u.status === 'Inactivo');
      return ms && mf;
    });
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Gestión de usuarios</h3>
              <p>Administra los usuarios del sistema y sus permisos</p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setEditUser(null);
                setShowUserModal(true);
              }}
            >
              <Plus size={17} /> Nuevo usuario
            </button>
          </div>
          <AdminToolbar
            search={search}
            setSearch={setSearch}
            filterLabel="Filtrar"
            filterValue={filter}
            setFilter={setFilter}
            filterOptions={[
              'Todos',
              'Activo',
              'Inactivo',
              'Administrador',
              'Recepción',
              'Limpieza',
              'Room Service',
            ]}
          />
          {filtered.length === 0 ? (
            <div className="hk-empty">
              <UsersIcon size={22} />
              <p>No hay usuarios registrados</p>
            </div>
          ) : (
            <AdminTable
              headers={['Nombre', 'Correo', 'Rol', 'Estado', 'Último acceso', 'Acciones']}
            >
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`status-pill ${statusPillClass(u.status)}`}>{u.status}</span>
                  </td>
                  <td>{u.lastAccess}</td>
                  <td className="adm-actions">
                    <EditIconButton
                      label="Editar usuario"
                      onClick={() => {
                        setEditUser(u);
                        setShowUserModal(true);
                      }}
                    />
                    <StatusSwitch
                      checked={u.status === 'Activo'}
                      label={u.status === 'Activo' ? 'Desactivar usuario' : 'Activar usuario'}
                      onChange={() => {
                        setUsers((cur) =>
                          cur.map((x) =>
                            x.id === u.id
                              ? { ...x, status: x.status === 'Activo' ? 'Inactivo' : 'Activo' }
                              : x,
                          ),
                        );
                        onAction(
                          `Usuario ${u.name} ${u.status === 'Activo' ? 'desactivado' : 'activado'}`,
                        );
                      }}
                    />
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Roles y permisos</h3>
              <p>Configura los permisos de cada rol</p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setEditRole(null);
                setShowRoleModal(true);
              }}
            >
              <Plus size={17} /> Nuevo rol
            </button>
          </div>
          <div className="adm-role-grid">
            {roles.map((r) => (
              <div className="adm-role-card" key={r.id}>
                <div className="adm-role-head">
                  <div>
                    <strong>{r.name}</strong>
                    <span>{r.description}</span>
                  </div>
                  <span className="status-pill info">{r.userCount} usuarios</span>
                </div>
                <div className="adm-perm-list">
                  {ALL_PERMISSIONS.map((p) => (
                    <div className="adm-perm-item" key={p}>
                      <span className={`adm-perm-check ${r.permissions[p] ? 'on' : ''}`}>
                        {r.permissions[p] && <Check size={12} />}
                      </span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
                <div className="adm-role-actions">
                  <EditIconButton
                    label="Editar rol"
                    onClick={() => {
                      setEditRole(r);
                      setShowRoleModal(true);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {showUserModal && (
          <UserModal
            user={editUser}
            roles={roles}
            onClose={() => setShowUserModal(false)}
            onSave={(u) => {
              if (editUser) {
                setUsers((cur) => cur.map((x) => (x.id === u.id ? u : x)));
                onAction('Usuario actualizado correctamente');
              } else {
                setUsers((cur) => [...cur, { ...u, id: Date.now() }]);
                onAction('Usuario creado correctamente');
              }
              setShowUserModal(false);
            }}
          />
        )}
        {showRoleModal && (
          <RoleModal
            role={editRole}
            onClose={() => setShowRoleModal(false)}
            onSave={(r) => {
              if (editRole) {
                setRoles((cur) => cur.map((x) => (x.id === r.id ? r : x)));
                onAction('Rol actualizado correctamente');
              } else {
                setRoles((cur) => [...cur, { ...r, id: Date.now() }]);
                onAction('Rol creado correctamente');
              }
              setShowRoleModal(false);
            }}
          />
        )}
      </>
    );
  }

  // ─── HABITACIONES ───
  if (nav === 'Habitaciones') {
    const filtered = rooms.filter((r) => {
      const ms = `${r.number} ${r.floor} ${r.type} ${r.status}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const mf = filter === 'Todos' || r.status === filter || r.type === filter;
      return ms && mf;
    });
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Gestión de habitaciones</h3>
              <p>Administra las habitaciones del hotel</p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setEditRoom(null);
                setShowRoomModal(true);
              }}
            >
              <Plus size={17} /> Nueva habitación
            </button>
          </div>
          <AdminToolbar
            search={search}
            setSearch={setSearch}
            filterLabel="Filtrar"
            filterValue={filter}
            setFilter={setFilter}
            filterOptions={[
              'Todos',
              'Disponible',
              'Ocupada',
              'Limpieza',
              'Mantenimiento',
              'Estándar',
              'Deluxe',
              'Suite',
            ]}
          />
          {filtered.length === 0 ? (
            <div className="hk-empty">
              <BedDouble size={22} />
              <p>No hay habitaciones registradas</p>
            </div>
          ) : (
            <AdminTable
              headers={['Número', 'Piso', 'Tipo', 'Capacidad', 'Tarifa', 'Estado', 'Acciones']}
            >
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.number}</strong>
                  </td>
                  <td>{r.floor}</td>
                  <td>{r.type}</td>
                  <td>{r.capacity} huéspedes</td>
                  <td>${r.rate.toLocaleString()}</td>
                  <td>
                    <span className={`status-pill ${roomStatusClass(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="adm-actions">
                    <EditIconButton
                      label="Editar habitación"
                      onClick={() => {
                        setEditRoom(r);
                        setShowRoomModal(true);
                      }}
                    />
                    <StatusSwitch
                      checked={r.status !== 'Mantenimiento'}
                      label={
                        r.status === 'Mantenimiento'
                          ? 'Activar habitación'
                          : 'Desactivar habitación'
                      }
                      onChange={() => {
                        setRooms((cur) =>
                          cur.map((x) =>
                            x.id === r.id
                              ? {
                                  ...x,
                                  status:
                                    x.status === 'Mantenimiento' ? 'Disponible' : 'Mantenimiento',
                                }
                              : x,
                          ),
                        );
                        onAction(
                          `Habitación ${r.number} ${r.status === 'Mantenimiento' ? 'activada' : 'desactivada'}`,
                        );
                      }}
                    />
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Tipos de habitación</h3>
              <p>Configura los tipos y sus características</p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setEditRoomType(null);
                setShowRoomTypeModal(true);
              }}
            >
              <Plus size={17} /> Nuevo tipo
            </button>
          </div>
          {roomTypes.length === 0 ? (
            <div className="hk-empty">
              <Building2 size={22} />
              <p>No hay tipos de habitación registrados</p>
            </div>
          ) : (
            <div className="adm-roomtype-grid">
              {roomTypes.map((rt) => (
                <div className="adm-roomtype-card" key={rt.id}>
                  <div className="adm-roomtype-head">
                    <div>
                      <strong>{rt.name}</strong>
                      <span>
                        {rt.capacity} huéspedes · {rt.features.length} características
                      </span>
                    </div>
                    <span className={`status-pill ${statusPillClass(rt.status)}`}>{rt.status}</span>
                  </div>
                  <p className="adm-roomtype-desc">{rt.description}</p>
                  <div className="adm-roomtype-features">
                    {rt.features.map((f) => (
                      <span key={f} className="adm-feature-tag">
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="adm-roomtype-price">
                    Precio base: <strong>${rt.basePrice.toLocaleString()}</strong>
                  </div>
                  <div className="adm-role-actions">
                    <EditIconButton
                      label="Editar tipo de habitación"
                      onClick={() => {
                        setEditRoomType(rt);
                        setShowRoomTypeModal(true);
                      }}
                    />
                    <StatusSwitch
                      checked={rt.status === 'Activo'}
                      label={rt.status === 'Activo' ? 'Desactivar tipo' : 'Activar tipo'}
                      onChange={() => {
                        setRoomTypes((cur) =>
                          cur.map((x) =>
                            x.id === rt.id
                              ? { ...x, status: x.status === 'Activo' ? 'Inactivo' : 'Activo' }
                              : x,
                          ),
                        );
                        onAction(
                          `Tipo ${rt.name} ${rt.status === 'Activo' ? 'desactivado' : 'activado'}`,
                        );
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {showRoomModal && (
          <RoomModal
            room={editRoom}
            roomTypes={roomTypes}
            onClose={() => setShowRoomModal(false)}
            onSave={(r) => {
              if (editRoom) {
                setRooms((cur) => cur.map((x) => (x.id === r.id ? r : x)));
                onAction('Habitación actualizada correctamente');
              } else {
                setRooms((cur) => [...cur, { ...r, id: Date.now() }]);
                onAction('Habitación creada correctamente');
              }
              setShowRoomModal(false);
            }}
          />
        )}
        {showRoomTypeModal && (
          <RoomTypeModal
            roomType={editRoomType}
            onClose={() => setShowRoomTypeModal(false)}
            onSave={(rt) => {
              if (editRoomType) {
                setRoomTypes((cur) => cur.map((x) => (x.id === rt.id ? rt : x)));
                onAction('Tipo de habitación actualizado correctamente');
              } else {
                setRoomTypes((cur) => [...cur, { ...rt, id: Date.now() }]);
                onAction('Tipo de habitación creado correctamente');
              }
              setShowRoomTypeModal(false);
            }}
          />
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
            <div>
              <h3>Tarifas por temporada</h3>
              <p>Configura tarifas especiales según la temporada</p>
            </div>
            <button className="button primary" onClick={() => setShowSeasonRateModal(true)}>
              <Plus size={17} /> Nueva tarifa de temporada
            </button>
          </div>
          {seasonRates.length === 0 ? (
            <div className="hk-empty">
              <CalendarDays size={22} />
              <p>No hay tarifas de temporada registradas</p>
            </div>
          ) : (
            <AdminTable
              headers={[
                'Tipo de habitación',
                'Temporada',
                'Fechas',
                'Tarifa base',
                'Tarifa especial',
                'Estado',
                'Acciones',
              ]}
            >
              {seasonRates.map((sr) => (
                <tr key={sr.id}>
                  <td>
                    <strong>{sr.roomType}</strong>
                  </td>
                  <td>{sr.seasonName}</td>
                  <td>
                    {sr.startDate} → {sr.endDate}
                  </td>
                  <td>${sr.baseRate.toLocaleString()}</td>
                  <td>
                    <strong className="success-text">${sr.seasonalRate.toLocaleString()}</strong>
                  </td>
                  <td>
                    <span className={`status-pill ${statusPillClass(sr.status)}`}>{sr.status}</span>
                  </td>
                  <td className="adm-actions">
                    <StatusSwitch
                      checked={sr.status === 'Activa'}
                      label={sr.status === 'Activa' ? 'Desactivar tarifa' : 'Activar tarifa'}
                      onChange={() => {
                        setSeasonRates((cur) =>
                          cur.map((x) =>
                            x.id === sr.id
                              ? { ...x, status: x.status === 'Activa' ? 'Inactiva' : 'Activa' }
                              : x,
                          ),
                        );
                        onAction(`Tarifa ${sr.status === 'Activa' ? 'desactivada' : 'activada'}`);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Tarifas dinámicas</h3>
              <p>Reglas de ajuste automático según condiciones</p>
            </div>
            <button className="button primary" onClick={() => setShowDynamicRateModal(true)}>
              <Plus size={17} /> Nueva regla
            </button>
          </div>
          <div className="adm-dynrate-grid">
            {dynamicRates.map((dr) => (
              <div className="adm-dynrate-card" key={dr.id}>
                <div className="adm-dynrate-head">
                  <div>
                    <strong>{dr.condition}</strong>
                    <span>
                      {dr.operator} {dr.threshold}
                      {dr.condition.includes('Ocupación')
                        ? '%'
                        : dr.condition.includes('noches')
                          ? ' noches'
                          : ' días'}
                    </span>
                  </div>
                  <span className={`status-pill ${statusPillClass(dr.status)}`}>{dr.status}</span>
                </div>
                <div className="adm-dynrate-body">
                  <span
                    className={`status-pill ${dr.adjustment === 'Aumentar' ? 'warning' : 'info'}`}
                  >
                    {dr.adjustment} {dr.value}%
                  </span>
                </div>
                <div className="adm-role-actions">
                  <StatusSwitch
                    checked={dr.status === 'Activa'}
                    label={dr.status === 'Activa' ? 'Desactivar regla' : 'Activar regla'}
                    onChange={() => {
                      setDynamicRates((cur) =>
                        cur.map((x) =>
                          x.id === dr.id
                            ? { ...x, status: x.status === 'Activa' ? 'Inactiva' : 'Activa' }
                            : x,
                        ),
                      );
                      onAction(`Regla ${dr.status === 'Activa' ? 'desactivada' : 'activada'}`);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {showSeasonRateModal && (
          <SeasonRateModal
            roomTypes={roomTypes}
            onClose={() => setShowSeasonRateModal(false)}
            onSave={(sr) => {
              setSeasonRates((cur) => [...cur, { ...sr, id: Date.now() }]);
              onAction('Tarifa de temporada creada correctamente');
              setShowSeasonRateModal(false);
            }}
          />
        )}
        {showDynamicRateModal && (
          <DynamicRateModal
            onClose={() => setShowDynamicRateModal(false)}
            onSave={(dr) => {
              setDynamicRates((cur) => [...cur, { ...dr, id: Date.now() }]);
              onAction('Regla dinámica creada correctamente');
              setShowDynamicRateModal(false);
            }}
          />
        )}
      </>
    );
  }

  // ─── PROMOCIONES ───
  if (nav === 'Promociones') {
    const filtered = promos.filter((p) =>
      `${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase()),
    );
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Gestión de promociones</h3>
              <p>Administra los códigos de descuento del hotel</p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setEditPromo(null);
                setShowPromoModal(true);
              }}
            >
              <Plus size={17} /> Nueva promoción
            </button>
          </div>
          <AdminToolbar search={search} setSearch={setSearch} />
          {filtered.length === 0 ? (
            <div className="hk-empty">
              <Percent size={22} />
              <p>No hay promociones registradas</p>
            </div>
          ) : (
            <div className="adm-promo-grid">
              {filtered.map((p) => (
                <div className="adm-promo-card" key={p.id}>
                  <div className="adm-promo-head">
                    <div>
                      <strong>{p.name}</strong>
                      <code>{p.code}</code>
                    </div>
                    <span className={`status-pill ${statusPillClass(p.status)}`}>{p.status}</span>
                  </div>
                  <div className="adm-promo-body">
                    <div className="adm-promo-pct">
                      <Percent size={20} />
                      <strong>{p.percentage}%</strong>
                    </div>
                    <p>{p.conditions}</p>
                    <div className="adm-promo-dates">
                      <CalendarDays size={14} />
                      <span>
                        {p.startDate} → {p.endDate}
                      </span>
                    </div>
                  </div>
                  <div className="adm-role-actions">
                    <EditIconButton
                      label="Editar promoción"
                      onClick={() => {
                        setEditPromo(p);
                        setShowPromoModal(true);
                      }}
                    />
                    <StatusSwitch
                      checked={p.status === 'Activa'}
                      label={p.status === 'Activa' ? 'Desactivar promoción' : 'Activar promoción'}
                      onChange={() => {
                        setPromos((cur) =>
                          cur.map((x) =>
                            x.id === p.id
                              ? { ...x, status: x.status === 'Activa' ? 'Inactiva' : 'Activa' }
                              : x,
                          ),
                        );
                        onAction(`Promoción ${p.status === 'Activa' ? 'desactivada' : 'activada'}`);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {showPromoModal && (
          <PromoModal
            promo={editPromo}
            onClose={() => setShowPromoModal(false)}
            onSave={(p) => {
              if (editPromo) {
                setPromos((cur) => cur.map((x) => (x.id === p.id ? p : x)));
                onAction('Promoción actualizada correctamente');
              } else {
                setPromos((cur) => [...cur, { ...p, id: Date.now() }]);
                onAction('Promoción creada correctamente');
              }
              setShowPromoModal(false);
            }}
          />
        )}
      </>
    );
  }

  // ─── SERVICIOS (AMENIDADES + ROOM SERVICE) ───
  if (nav === 'Servicios') {
    const filteredRs = rsItems.filter((i) =>
      `${i.name} ${i.category}`.toLowerCase().includes(search.toLowerCase()),
    );
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Amenidades</h3>
              <p>Administra las amenidades del hotel y sus horarios</p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setEditAmenity(null);
                setShowAmenityModal(true);
              }}
            >
              <Plus size={17} /> Nueva amenidad
            </button>
          </div>
          {amenities.length === 0 ? (
            <div className="hk-empty">
              <Star size={22} />
              <p>No hay amenidades registradas</p>
            </div>
          ) : (
            <div className="adm-amenity-grid">
              {amenities.map((a) => {
                const Icon = amenityIconMap[a.icon] ?? Sparkles;
                return (
                  <div className="adm-amenity-card" key={a.id}>
                    <div className="adm-amenity-icon">
                      <Icon size={22} />
                    </div>
                    <div className="adm-amenity-body">
                      <div>
                        <strong>{a.name}</strong>
                        <span>{a.schedule}</span>
                      </div>
                      <div className="adm-amenity-pills">
                        <span className={`status-pill ${a.available ? 'success' : 'warning'}`}>
                          {a.available ? 'Disponible' : 'No disponible'}
                        </span>
                        <span className={`status-pill ${statusPillClass(a.status)}`}>
                          {a.status}
                        </span>
                      </div>
                    </div>
                    <div className="adm-amenity-actions">
                      <EditIconButton
                        label="Editar amenidad"
                        onClick={() => {
                          setEditAmenity(a);
                          setShowAmenityModal(true);
                        }}
                      />
                      <StatusSwitch
                        checked={a.status === 'Activo'}
                        label={a.status === 'Activo' ? 'Desactivar amenidad' : 'Activar amenidad'}
                        onChange={() => {
                          setAmenities((cur) =>
                            cur.map((x) =>
                              x.id === a.id
                                ? { ...x, status: x.status === 'Activo' ? 'Inactivo' : 'Activo' }
                                : x,
                            ),
                          );
                          onAction(
                            `Amenidad ${a.status === 'Activo' ? 'desactivada' : 'activada'}`,
                          );
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Catálogo de Room Service</h3>
              <p>Administra los productos del menú de servicio a habitación</p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setEditRsItem(null);
                setShowRsItemModal(true);
              }}
            >
              <Plus size={17} /> Nuevo producto
            </button>
          </div>
          <AdminToolbar search={search} setSearch={setSearch} />
          {filteredRs.length === 0 ? (
            <div className="hk-empty">
              <Utensils size={22} />
              <p>No hay productos de Room Service registrados</p>
            </div>
          ) : (
            <div className="adm-rs-grid">
              {filteredRs.map((item) => (
                <div className="adm-rs-card" key={item.id}>
                  <div className="adm-rs-image" style={{ backgroundImage: `url(${item.image})` }}>
                    <span className={`status-pill ${statusPillClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="adm-rs-body">
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.category}</span>
                    </div>
                    <div className="adm-rs-foot">
                      <strong>${item.price.toLocaleString()}</strong>
                      <span className={`status-pill ${item.available ? 'success' : 'warning'}`}>
                        {item.available ? 'Disponible' : 'No disponible'}
                      </span>
                    </div>
                  </div>
                  <div className="adm-amenity-actions">
                    <EditIconButton
                      label="Editar producto de room service"
                      onClick={() => {
                        setEditRsItem(item);
                        setShowRsItemModal(true);
                      }}
                    />
                    <StatusSwitch
                      checked={item.status === 'Activo'}
                      label={item.status === 'Activo' ? 'Desactivar producto' : 'Activar producto'}
                      onChange={() => {
                        setRsItems((cur) =>
                          cur.map((x) =>
                            x.id === item.id
                              ? { ...x, status: x.status === 'Activo' ? 'Inactivo' : 'Activo' }
                              : x,
                          ),
                        );
                        onAction(
                          `Producto ${item.status === 'Activo' ? 'desactivado' : 'activado'}`,
                        );
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {showAmenityModal && (
          <AmenityModal
            amenity={editAmenity}
            onClose={() => setShowAmenityModal(false)}
            onSave={(a) => {
              if (editAmenity) {
                setAmenities((cur) => cur.map((x) => (x.id === a.id ? a : x)));
                onAction('Amenidad actualizada correctamente');
              } else {
                setAmenities((cur) => [...cur, { ...a, id: Date.now() }]);
                onAction('Amenidad creada correctamente');
              }
              setShowAmenityModal(false);
            }}
          />
        )}
        {showRsItemModal && (
          <RsItemModal
            item={editRsItem}
            onClose={() => setShowRsItemModal(false)}
            onSave={(item) => {
              if (editRsItem) {
                setRsItems((cur) => cur.map((x) => (x.id === item.id ? item : x)));
                onAction('Producto actualizado correctamente');
              } else {
                setRsItems((cur) => [...cur, { ...item, id: Date.now() }]);
                onAction('Producto creado correctamente');
              }
              setShowRsItemModal(false);
            }}
          />
        )}
      </>
    );
  }

  // ─── REPORTES ───
  if (nav === 'Reportes') {
    const reportData = reportPeriodData[reportFilter];
    const lastReservation = reportData.reservations[reportData.reservations.length - 1] ?? 0;
    const lastIncome = reportData.income[reportData.income.length - 1] ?? 0;
    const reservationRows = reportData.labels.slice(0, 6).map((label, index) => ({
      label,
      reservations: reportData.reservations[index] ?? lastReservation,
      checkIns: Math.max((reportData.reservations[index] ?? 0) - 4, 0),
      checkOuts: Math.max((reportData.reservations[index] ?? 0) - 6, 0),
      income: (reportData.income[index] ?? lastIncome) * 1000,
    }));
    return (
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Reportes del hotel</h3>
            <p>Analiza el rendimiento y la operación del hotel</p>
          </div>
          <button
            className="button secondary"
            onClick={() => onAction('Reporte preparado para descargar')}
          >
            <Download size={16} /> Exportar
          </button>
        </div>
        <div className="chart-tabs">
          {reportTabs.map((t) => (
            <button
              key={t}
              className={reportTab === t ? 'active' : ''}
              onClick={() => setReportTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="adm-report-filters">
          {reportPeriodOptions.map((f) => (
            <button
              key={f}
              className={`adm-filter-chip ${reportFilter === f ? 'active' : ''}`}
              onClick={() => setReportFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="adm-report-content">
          {reportTab === 'Ocupación' && (
            <>
              <div className="adm-report-stats">
                <div className="metric-card">
                  <div className="metric-icon sage">
                    <BedDouble size={19} />
                  </div>
                  <div>
                    <p>Ocupación promedio</p>
                    <h2>{reportData.occupancyValue}</h2>
                    <span className="positive">{reportData.change}</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon gold">
                    <TrendingUp size={19} />
                  </div>
                  <div>
                    <p>Tendencia</p>
                    <h2>{reportData.trend}</h2>
                    <span className="positive">{reportFilter}</span>
                  </div>
                </div>
              </div>
              <MiniChart data={reportData.occupancy} labels={reportData.labels} />
            </>
          )}
          {reportTab === 'Ingresos' && (
            <>
              <div className="adm-report-stats">
                <div className="metric-card">
                  <div className="metric-icon gold">
                    <Wallet size={19} />
                  </div>
                  <div>
                    <p>Ingresos del periodo</p>
                    <h2>{reportData.incomeValue}</h2>
                    <span className="positive">{reportData.change}</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon sage">
                    <DollarSign size={19} />
                  </div>
                  <div>
                    <p>Promedio por corte</p>
                    <h2>
                      $
                      {Math.round(
                        reportData.income.reduce((sum, value) => sum + value, 0) /
                          reportData.income.length,
                      ).toLocaleString()}
                      K
                    </h2>
                    <span className="positive">{reportFilter}</span>
                  </div>
                </div>
              </div>
              <BarChart data={reportData.income} labels={reportData.labels} />
            </>
          )}
          {reportTab === 'Reservas' && (
            <AdminTable headers={['Periodo', 'Reservas', 'Check-ins', 'Check-outs', 'Ingresos']}>
              {reservationRows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.reservations}</td>
                  <td>{row.checkIns}</td>
                  <td>{row.checkOuts}</td>
                  <td>${row.income.toLocaleString()}</td>
                </tr>
              ))}
            </AdminTable>
          )}
          {reportTab === 'Cancelaciones' && (
            <>
              <div className="adm-report-stats">
                <div className="metric-card">
                  <div className="metric-icon terracotta">
                    <Ban size={19} />
                  </div>
                  <div>
                    <p>Cancelaciones</p>
                    <h2>{reportData.cancellationValue}</h2>
                    <span>-2.4%</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon info">
                    <Percent size={19} />
                  </div>
                  <div>
                    <p>Tasa de cancelación</p>
                    <h2>
                      {reportFilter === 'Día'
                        ? '3.1%'
                        : reportFilter === 'Temporada'
                          ? '5.0%'
                          : '8.5%'}
                    </h2>
                    <span className="positive">-1.2%</span>
                  </div>
                </div>
              </div>
              <MiniChart
                data={reportData.cancellations}
                labels={reportData.labels}
                color="#a9483c"
              />
            </>
          )}
          {reportTab === 'Canales' && (
            <AdminTable headers={['Canal', 'Reservas', 'Ingresos', '% del total']}>
              <tr>
                <td>Online</td>
                <td>68</td>
                <td>$78,400</td>
                <td>61%</td>
              </tr>
              <tr>
                <td>Teléfono</td>
                <td>24</td>
                <td>$28,200</td>
                <td>22%</td>
              </tr>
              <tr>
                <td>Presencial</td>
                <td>12</td>
                <td>$14,800</td>
                <td>12%</td>
              </tr>
              <tr>
                <td>Agencias</td>
                <td>8</td>
                <td>$7,000</td>
                <td>5%</td>
              </tr>
            </AdminTable>
          )}
          {reportTab === 'Servicios' && (
            <AdminTable headers={['Servicio', 'Veces utilizado', 'Ingresos', '% del total']}>
              <tr>
                <td>Room Service</td>
                <td>142</td>
                <td>$38,600</td>
                <td>30%</td>
              </tr>
              <tr>
                <td>Spa</td>
                <td>86</td>
                <td>$24,200</td>
                <td>19%</td>
              </tr>
              <tr>
                <td>Lavandería</td>
                <td>54</td>
                <td>$12,800</td>
                <td>10%</td>
              </tr>
              <tr>
                <td>Transporte</td>
                <td>38</td>
                <td>$9,400</td>
                <td>7%</td>
              </tr>
            </AdminTable>
          )}
          {reportTab === 'Temporadas' && (
            <AdminTable headers={['Temporada', 'Ocupación', 'Ingresos', 'Reservas', 'ADR']}>
              <tr>
                <td>Alta (Dic - Mar)</td>
                <td>92%</td>
                <td>$48,200</td>
                <td>58</td>
                <td>$3,200</td>
              </tr>
              <tr>
                <td>Media (Abr - Jul)</td>
                <td>78%</td>
                <td>$32,100</td>
                <td>42</td>
                <td>$2,450</td>
              </tr>
              <tr>
                <td>Baja (Ago - Nov)</td>
                <td>65%</td>
                <td>$22,800</td>
                <td>28</td>
                <td>$1,850</td>
              </tr>
            </AdminTable>
          )}
        </div>
      </div>
    );
  }

  // ─── INVENTARIO ───
  if (nav === 'Inventario') {
    const filtered = inventory.filter((p) =>
      `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()),
    );
    const lowStock = inventory.filter((p) => p.stock <= p.minStock);
    return (
      <>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Gestión de inventario</h3>
              <p>Administra los productos y existencias del hotel</p>
            </div>
            <div className="adm-heading-actions">
              <button className="button secondary" onClick={() => setShowMovementModal(true)}>
                <ArrowRight size={16} /> Registrar movimiento
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setEditProduct(null);
                  setShowProductModal(true);
                }}
              >
                <Plus size={17} /> Nuevo producto
              </button>
            </div>
          </div>
          {lowStock.length > 0 && (
            <div className="adm-inv-alerts">
              <TriangleAlert size={18} />
              <span>{lowStock.length} producto(s) con stock bajo el mínimo</span>
            </div>
          )}
          <AdminToolbar search={search} setSearch={setSearch} />
          {filtered.length === 0 ? (
            <div className="hk-empty">
              <Package size={22} />
              <p>No hay productos en el inventario</p>
            </div>
          ) : (
            <AdminTable
              headers={[
                'Producto',
                'Categoría',
                'Stock',
                'Stock mínimo',
                'Precio',
                'Estado',
                'Acciones',
              ]}
            >
              {filtered.map((p) => (
                <tr key={p.id} className={p.stock <= p.minStock ? 'adm-row-alert' : ''}>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>{p.category}</td>
                  <td className={p.stock <= p.minStock ? 'terracotta-text' : ''}>
                    <strong>{p.stock}</strong>
                  </td>
                  <td>{p.minStock}</td>
                  <td>${p.price.toLocaleString()}</td>
                  <td>
                    <span className={`status-pill ${statusPillClass(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="adm-actions">
                    <EditIconButton
                      label="Editar producto"
                      onClick={() => {
                        setEditProduct(p);
                        setShowProductModal(true);
                      }}
                    />
                    <StatusSwitch
                      checked={p.status === 'Activo'}
                      label={p.status === 'Activo' ? 'Desactivar producto' : 'Activar producto'}
                      onChange={() => {
                        setInventory((cur) =>
                          cur.map((x) =>
                            x.id === p.id
                              ? { ...x, status: x.status === 'Activo' ? 'Inactivo' : 'Activo' }
                              : x,
                          ),
                        );
                        onAction(`Producto ${p.status === 'Activo' ? 'desactivado' : 'activado'}`);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Movimientos de inventario</h3>
              <p>Historial de entradas y salidas</p>
            </div>
          </div>
          {movements.length === 0 ? (
            <div className="hk-empty">
              <ArrowRight size={22} />
              <p>Sin movimientos registrados</p>
            </div>
          ) : (
            <AdminTable
              headers={['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Motivo', 'Responsable']}
            >
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{m.date}</td>
                  <td>
                    <strong>{m.product}</strong>
                  </td>
                  <td>
                    <span className={`status-pill ${m.type === 'Entrada' ? 'success' : 'warning'}`}>
                      {m.type}
                    </span>
                  </td>
                  <td>
                    {m.type === 'Entrada' ? '+' : '-'}
                    {m.quantity}
                  </td>
                  <td>{m.reason}</td>
                  <td>{m.responsible}</td>
                </tr>
              ))}
            </AdminTable>
          )}
        </div>
        {showProductModal && (
          <ProductModal
            product={editProduct}
            onClose={() => setShowProductModal(false)}
            onSave={(p) => {
              if (editProduct) {
                setInventory((cur) => cur.map((x) => (x.id === p.id ? p : x)));
                onAction('Producto actualizado correctamente');
              } else {
                setInventory((cur) => [...cur, { ...p, id: Date.now() }]);
                onAction('Producto creado correctamente');
              }
              setShowProductModal(false);
            }}
          />
        )}
        {showMovementModal && (
          <MovementModal
            products={inventory}
            onClose={() => setShowMovementModal(false)}
            onSave={(m) => {
              setInventory((cur) =>
                cur.map((x) =>
                  x.id === m.productId
                    ? {
                        ...x,
                        stock:
                          m.type === 'Entrada'
                            ? x.stock + m.quantity
                            : Math.max(0, x.stock - m.quantity),
                      }
                    : x,
                ),
              );
              onAction(`${m.type} de ${m.quantity} unidades registrada`);
              setShowMovementModal(false);
            }}
          />
        )}
      </>
    );
  }

  // ─── CAJA ───
  if (nav === 'Caja') {
    const totalIngresos = cashMovements
      .filter((m) => m.type === 'Ingreso')
      .reduce((s, m) => s + m.amount, 0);
    const totalEgresos = cashMovements
      .filter((m) => m.type === 'Egreso')
      .reduce((s, m) => s + m.amount, 0);
    const saldoInicial = 5000;
    return (
      <>
        <div className="adm-cash-grid">
          <div className="metric-card">
            <div className="metric-icon sage">
              <Wallet size={19} />
            </div>
            <div>
              <p>Saldo inicial</p>
              <h2>${saldoInicial.toLocaleString()}</h2>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon gold">
              <TrendingUp size={19} />
            </div>
            <div>
              <p>Ingresos</p>
              <h2>${totalIngresos.toLocaleString()}</h2>
              <span className="positive">
                +{((totalIngresos / (saldoInicial + totalIngresos)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon terracotta">
              <ArrowRight size={19} />
            </div>
            <div>
              <p>Egresos</p>
              <h2>${totalEgresos.toLocaleString()}</h2>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon info">
              <DollarSign size={19} />
            </div>
            <div>
              <p>Saldo actual</p>
              <h2>${(saldoInicial + totalIngresos - totalEgresos).toLocaleString()}</h2>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Movimientos de caja</h3>
              <p>Historial de ingresos y egresos</p>
            </div>
            <div className="adm-heading-actions">
              {cashOpen ? (
                <button
                  className="button secondary"
                  onClick={() => {
                    setCashOpen(false);
                    onAction('Caja cerrada correctamente');
                  }}
                >
                  <Ban size={16} /> Cerrar caja
                </button>
              ) : (
                <button
                  className="button primary"
                  onClick={() => {
                    setCashOpen(true);
                    onAction('Caja abierta correctamente');
                  }}
                >
                  <Plus size={16} /> Abrir caja
                </button>
              )}
              <button
                className="button secondary"
                onClick={() => onAction('Reporte de caja preparado')}
              >
                <FileText size={16} /> Reporte
              </button>
              <button className="button primary" onClick={() => setShowCashModal(true)}>
                <Plus size={17} /> Nuevo movimiento
              </button>
            </div>
          </div>
          {cashMovements.length === 0 ? (
            <div className="hk-empty">
              <Wallet size={22} />
              <p>Sin movimientos de caja registrados</p>
            </div>
          ) : (
            <AdminTable headers={['Fecha', 'Concepto', 'Tipo', 'Monto', 'Responsable']}>
              {cashMovements.map((m) => (
                <tr key={m.id}>
                  <td>{m.date}</td>
                  <td>
                    <strong>{m.concept}</strong>
                  </td>
                  <td>
                    <span className={`status-pill ${m.type === 'Ingreso' ? 'success' : 'warning'}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className={m.type === 'Ingreso' ? 'success-text' : 'terracotta-text'}>
                    <strong>
                      {m.type === 'Ingreso' ? '+' : '-'}${m.amount.toLocaleString()}
                    </strong>
                  </td>
                  <td>{m.responsible}</td>
                </tr>
              ))}
            </AdminTable>
          )}
        </div>
        {showCashModal && (
          <CashModal
            onClose={() => setShowCashModal(false)}
            onSave={(m) => {
              setCashMovements((cur) => [
                { ...m, id: Date.now(), date: new Date().toISOString().slice(0, 10) },
                ...cur,
              ]);
              onAction('Movimiento de caja registrado correctamente');
              setShowCashModal(false);
            }}
          />
        )}
      </>
    );
  }

  // ─── AUDITORÍA ───
  if (nav === 'Auditoría') {
    const filtered = audit.filter((a) => {
      const ms = `${a.user} ${a.module} ${a.action} ${a.description}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const mf = filter === 'Todos' || a.module === filter || a.action === filter;
      return ms && mf;
    });
    return (
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Historial de auditoría</h3>
            <p>Registro de todas las acciones del sistema</p>
          </div>
          <button
            className="button secondary"
            onClick={() => onAction('Reporte de auditoría preparado')}
          >
            <Download size={16} /> Exportar
          </button>
        </div>
        <AdminToolbar
          search={search}
          setSearch={setSearch}
          filterLabel="Filtrar"
          filterValue={filter}
          setFilter={setFilter}
          filterOptions={['Todos', ...Object.values(AUDIT_MODULE_LABELS)]}
        />
        {filtered.length === 0 ? (
          <div className="hk-empty">
            <FileText size={22} />
            <p>Sin registros de auditoría</p>
          </div>
        ) : (
          <AdminTable headers={['Usuario', 'Fecha', 'Hora', 'Módulo', 'Acción', 'Descripción']}>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.user}</strong>
                </td>
                <td>{a.date}</td>
                <td>{a.time}</td>
                <td>
                  <span className="status-pill info">{a.module}</span>
                </td>
                <td>
                  <span
                    className={`status-pill ${a.action === 'Anulación' || a.action === 'Eliminación' || a.action === 'Cierre' ? 'warning' : 'success'}`}
                  >
                    {a.action}
                  </span>
                </td>
                <td>{a.description}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>
    );
  }

  resetSearch();
  return (
    <div className="panel">
      <div className="hk-empty">
        <FileText size={22} />
        <p>Selecciona una opción del menú</p>
      </div>
    </div>
  );
}

// ─── MODALES ───

function UserModal({
  user,
  roles,
  onClose,
  onSave,
}: {
  user: AdminUser | null;
  roles: AdminRole[];
  onClose: () => void;
  onSave: (u: AdminUser) => void;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState(user?.role ?? roles[0]?.name ?? '');
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>(user?.status ?? 'Activo');
  return (
    <AdminModal
      title={user ? 'Editar usuario' : 'Nuevo usuario'}
      eyebrow="GESTIÓN DE USUARIOS"
      onClose={onClose}
      onSubmit={() =>
        onSave({
          id: user?.id ?? 0,
          name,
          email,
          role,
          status,
          lastAccess: user?.lastAccess ?? 'Sin acceso',
        })
      }
      submitLabel={user ? 'Guardar cambios' : 'Crear usuario'}
    >
      <label className="hk-form-label">
        Nombre completo
        <input
          className="hk-form-select"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del usuario"
        />
      </label>
      <label className="hk-form-label">
        Correo electrónico
        <input
          className="hk-form-select"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@aurorahotel.com"
        />
      </label>
      <label className="hk-form-label">
        Rol
        <select className="hk-form-select" value={role} onChange={(e) => setRole(e.target.value)}>
          {roles.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="hk-form-label">
        Estado
        <select
          className="hk-form-select"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}
        >
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
      </label>
    </AdminModal>
  );
}

function RoleModal({
  role,
  onClose,
  onSave,
}: {
  role: AdminRole | null;
  onClose: () => void;
  onSave: (r: AdminRole) => void;
}) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    role?.permissions ?? Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, false])),
  );
  return (
    <AdminModal
      title={role ? 'Editar rol' : 'Nuevo rol'}
      eyebrow="ROLES Y PERMISOS"
      onClose={onClose}
      onSubmit={() =>
        onSave({
          id: role?.id ?? 0,
          name,
          description,
          permissions,
          userCount: role?.userCount ?? 0,
        })
      }
      submitLabel={role ? 'Guardar cambios' : 'Crear rol'}
      width={520}
    >
      <label className="hk-form-label">
        Nombre del rol
        <input
          className="hk-form-select"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Gerente"
        />
      </label>
      <label className="hk-form-label">
        Descripción
        <input
          className="hk-form-select"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción del rol"
        />
      </label>
      <label className="hk-form-label">
        Permisos
        <div className="adm-perm-editor">
          {ALL_PERMISSIONS.map((p) => (
            <button
              type="button"
              key={p}
              className={`adm-perm-toggle ${permissions[p] ? 'on' : ''}`}
              onClick={() => setPermissions((cur) => ({ ...cur, [p]: !cur[p] }))}
            >
              <span className="adm-perm-check">{permissions[p] && <Check size={12} />}</span>
              <span>{p}</span>
            </button>
          ))}
        </div>
      </label>
    </AdminModal>
  );
}

function RoomModal({
  room,
  roomTypes,
  onClose,
  onSave,
}: {
  room: AdminRoom | null;
  roomTypes: AdminRoomType[];
  onClose: () => void;
  onSave: (r: AdminRoom) => void;
}) {
  const [number, setNumber] = useState(room?.number ?? '');
  const [floor, setFloor] = useState(room?.floor ?? 'Piso 1');
  const [type, setType] = useState(room?.type ?? roomTypes[0]?.name ?? '');
  const [capacity, setCapacity] = useState(room?.capacity ?? 2);
  const [rate, setRate] = useState(room?.rate ?? 1850);
  const [status, setStatus] = useState(room?.status ?? 'Disponible');
  return (
    <AdminModal
      title={room ? 'Editar habitación' : 'Nueva habitación'}
      eyebrow="GESTIÓN DE HABITACIONES"
      onClose={onClose}
      onSubmit={() =>
        onSave({
          id: room?.id ?? 0,
          number,
          floor,
          type,
          capacity,
          rate,
          status,
          features: room?.features ?? ['Cama king', 'Wi-Fi', 'Desayuno'],
        })
      }
      submitLabel={room ? 'Guardar cambios' : 'Crear habitación'}
    >
      <div className="rc-form-grid">
        <label className="hk-form-label">
          Número
          <input
            className="hk-form-select"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Ej. 101"
          />
        </label>
        <label className="hk-form-label">
          Piso
          <input
            className="hk-form-select"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="Ej. Piso 1"
          />
        </label>
        <label className="hk-form-label">
          Tipo
          <select className="hk-form-select" value={type} onChange={(e) => setType(e.target.value)}>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.name}>
                {rt.name}
              </option>
            ))}
          </select>
        </label>
        <label className="hk-form-label">
          Capacidad
          <input
            className="hk-form-select"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Tarifa
          <input
            className="hk-form-select"
            type="number"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Estado
          <select
            className="hk-form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Disponible</option>
            <option>Ocupada</option>
            <option>Limpieza</option>
            <option>Mantenimiento</option>
          </select>
        </label>
      </div>
    </AdminModal>
  );
}

function RoomTypeModal({
  roomType,
  onClose,
  onSave,
}: {
  roomType: AdminRoomType | null;
  onClose: () => void;
  onSave: (rt: AdminRoomType) => void;
}) {
  const [name, setName] = useState(roomType?.name ?? '');
  const [capacity, setCapacity] = useState(roomType?.capacity ?? 2);
  const [description, setDescription] = useState(roomType?.description ?? '');
  const [basePrice, setBasePrice] = useState(roomType?.basePrice ?? 1850);
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>(roomType?.status ?? 'Activo');
  return (
    <AdminModal
      title={roomType ? 'Editar tipo de habitación' : 'Nuevo tipo de habitación'}
      eyebrow="TIPOS DE HABITACIÓN"
      onClose={onClose}
      onSubmit={() =>
        onSave({
          id: roomType?.id ?? 0,
          name,
          capacity,
          description,
          features: roomType?.features ?? ['Cama king', 'Wi-Fi'],
          basePrice,
          status,
        })
      }
      submitLabel={roomType ? 'Guardar cambios' : 'Crear tipo'}
    >
      <div className="rc-form-grid">
        <label className="hk-form-label">
          Nombre
          <input
            className="hk-form-select"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Deluxe"
          />
        </label>
        <label className="hk-form-label">
          Capacidad
          <input
            className="hk-form-select"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </label>
      </div>
      <label className="hk-form-label">
        Descripción
        <textarea
          className="hk-form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción del tipo de habitación"
        />
      </label>
      <div className="rc-form-grid">
        <label className="hk-form-label">
          Precio base
          <input
            className="hk-form-select"
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Estado
          <select
            className="hk-form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </label>
      </div>
    </AdminModal>
  );
}

function SeasonRateModal({
  roomTypes,
  onClose,
  onSave,
}: {
  roomTypes: AdminRoomType[];
  onClose: () => void;
  onSave: (sr: SeasonRate) => void;
}) {
  const [roomType, setRoomType] = useState(roomTypes[0]?.name ?? '');
  const [seasonName, setSeasonName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [baseRate, setBaseRate] = useState(1850);
  const [seasonalRate, setSeasonalRate] = useState(0);
  return (
    <AdminModal
      title="Nueva tarifa de temporada"
      eyebrow="TARIFAS POR TEMPORADA"
      onClose={onClose}
      onSubmit={() =>
        onSave({
          id: 0,
          roomType,
          seasonName,
          startDate,
          endDate,
          baseRate,
          seasonalRate,
          status: 'Activa',
        })
      }
      submitLabel="Crear tarifa"
    >
      <div className="rc-form-grid">
        <label className="hk-form-label">
          Tipo de habitación
          <select
            className="hk-form-select"
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
          >
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.name}>
                {rt.name}
              </option>
            ))}
          </select>
        </label>
        <label className="hk-form-label">
          Temporada
          <input
            className="hk-form-select"
            value={seasonName}
            onChange={(e) => setSeasonName(e.target.value)}
            placeholder="Ej. Semana Santa"
          />
        </label>
        <label className="hk-form-label">
          Fecha inicio
          <input
            className="hk-form-select"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="hk-form-label">
          Fecha fin
          <input
            className="hk-form-select"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <label className="hk-form-label">
          Tarifa base
          <input
            className="hk-form-select"
            type="number"
            value={baseRate}
            onChange={(e) => setBaseRate(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Tarifa especial
          <input
            className="hk-form-select"
            type="number"
            value={seasonalRate}
            onChange={(e) => setSeasonalRate(Number(e.target.value))}
          />
        </label>
      </div>
    </AdminModal>
  );
}

function DynamicRateModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (dr: DynamicRate) => void;
}) {
  const [condition, setCondition] = useState('Ocupación');
  const [operator, setOperator] = useState('>');
  const [threshold, setThreshold] = useState(80);
  const [adjustment, setAdjustment] = useState('Aumentar');
  const [value, setValue] = useState(15);
  return (
    <AdminModal
      title="Nueva regla dinámica"
      eyebrow="TARIFAS DINÁMICAS"
      onClose={onClose}
      onSubmit={() =>
        onSave({ id: 0, condition, operator, threshold, adjustment, value, status: 'Activa' })
      }
      submitLabel="Crear regla"
    >
      <div className="rc-form-grid">
        <label className="hk-form-label">
          Condición
          <select
            className="hk-form-select"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option>Ocupación</option>
            <option>Reservas con menos de</option>
            <option>Estancia extendida (4+ noches)</option>
          </select>
        </label>
        <label className="hk-form-label">
          Operador
          <select
            className="hk-form-select"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
          >
            <option value=">">{'Mayor que (>)'}</option>
            <option value="<">{'Menor que (<)'}</option>
            <option value=">=">{'Mayor o igual (>=)'}</option>
            <option value="<=">{'Menor o igual (<=)'}</option>
          </select>
        </label>
        <label className="hk-form-label">
          Umbral
          <input
            className="hk-form-select"
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Ajuste
          <select
            className="hk-form-select"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
          >
            <option>Aumentar</option>
            <option>Disminuir</option>
          </select>
        </label>
        <label className="hk-form-label">
          Porcentaje (%)
          <input
            className="hk-form-select"
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
        </label>
      </div>
    </AdminModal>
  );
}

function PromoModal({
  promo,
  onClose,
  onSave,
}: {
  promo: Promo | null;
  onClose: () => void;
  onSave: (p: Promo) => void;
}) {
  const [name, setName] = useState(promo?.name ?? '');
  const [code, setCode] = useState(promo?.code ?? '');
  const [percentage, setPercentage] = useState(promo?.percentage ?? 10);
  const [startDate, setStartDate] = useState(promo?.startDate ?? '');
  const [endDate, setEndDate] = useState(promo?.endDate ?? '');
  const [conditions, setConditions] = useState(promo?.conditions ?? '');
  const [status, setStatus] = useState<'Activa' | 'Inactiva'>(promo?.status ?? 'Activa');
  return (
    <AdminModal
      title={promo ? 'Editar promoción' : 'Nueva promoción'}
      eyebrow="GESTIÓN DE PROMOCIONES"
      onClose={onClose}
      onSubmit={() =>
        onSave({
          id: promo?.id ?? 0,
          name,
          code,
          percentage,
          startDate,
          endDate,
          conditions,
          status,
        })
      }
      submitLabel={promo ? 'Guardar cambios' : 'Crear promoción'}
    >
      <div className="rc-form-grid">
        <label className="hk-form-label">
          Nombre
          <input
            className="hk-form-select"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Estancia extendida"
          />
        </label>
        <label className="hk-form-label">
          Código
          <input
            className="hk-form-select"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ej. AURORA15"
          />
        </label>
        <label className="hk-form-label">
          Porcentaje (%)
          <input
            className="hk-form-select"
            type="number"
            value={percentage}
            onChange={(e) => setPercentage(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Estado
          <select
            className="hk-form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Activa' | 'Inactiva')}
          >
            <option value="Activa">Activa</option>
            <option value="Inactiva">Inactiva</option>
          </select>
        </label>
        <label className="hk-form-label">
          Fecha inicio
          <input
            className="hk-form-select"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="hk-form-label">
          Fecha fin
          <input
            className="hk-form-select"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>
      <label className="hk-form-label">
        Condiciones
        <textarea
          className="hk-form-textarea"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          placeholder="Ej. Estancias de 4 noches o más"
        />
      </label>
    </AdminModal>
  );
}

function AmenityModal({
  amenity,
  onClose,
  onSave,
}: {
  amenity: Amenity | null;
  onClose: () => void;
  onSave: (a: Amenity) => void;
}) {
  const [name, setName] = useState(amenity?.name ?? '');
  const [schedule, setSchedule] = useState(amenity?.schedule ?? '');
  const [available, setAvailable] = useState(amenity?.available ?? true);
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>(amenity?.status ?? 'Activo');
  const [icon, setIcon] = useState(amenity?.icon ?? 'Sparkles');
  return (
    <AdminModal
      title={amenity ? 'Editar amenidad' : 'Nueva amenidad'}
      eyebrow="GESTIÓN DE AMENIDADES"
      onClose={onClose}
      onSubmit={() => onSave({ id: amenity?.id ?? 0, name, schedule, available, status, icon })}
      submitLabel={amenity ? 'Guardar cambios' : 'Crear amenidad'}
    >
      <div className="rc-form-grid">
        <label className="hk-form-label">
          Nombre
          <input
            className="hk-form-select"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Piscina"
          />
        </label>
        <label className="hk-form-label">
          Horario
          <input
            className="hk-form-select"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="Ej. 07:00 — 21:00"
          />
        </label>
        <label className="hk-form-label">
          Ícono
          <select className="hk-form-select" value={icon} onChange={(e) => setIcon(e.target.value)}>
            <option value="Waves">Piscina</option>
            <option value="Utensils">Restaurante</option>
            <option value="Dumbbell">Gimnasio</option>
            <option value="Sparkles">Spa</option>
            <option value="Star">Terraza</option>
            <option value="Wifi">Wi-Fi</option>
          </select>
        </label>
        <label className="hk-form-label">
          Disponibilidad
          <select
            className="hk-form-select"
            value={available ? 'si' : 'no'}
            onChange={(e) => setAvailable(e.target.value === 'si')}
          >
            <option value="si">Disponible</option>
            <option value="no">No disponible</option>
          </select>
        </label>
        <label className="hk-form-label">
          Estado
          <select
            className="hk-form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </label>
      </div>
    </AdminModal>
  );
}

function RsItemModal({
  item,
  onClose,
  onSave,
}: {
  item: RoomServiceItem | null;
  onClose: () => void;
  onSave: (i: RoomServiceItem) => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? 'Desayunos');
  const [price, setPrice] = useState(item?.price ?? 0);
  const [available, setAvailable] = useState(item?.available ?? true);
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>(item?.status ?? 'Activo');
  const [image, setImage] = useState(item?.image ?? '');
  return (
    <AdminModal
      title={item ? 'Editar producto' : 'Nuevo producto'}
      eyebrow="CATÁLOGO DE ROOM SERVICE"
      onClose={onClose}
      onSubmit={() =>
        onSave({
          id: item?.id ?? 0,
          name,
          category,
          price,
          available,
          status,
          image:
            image ||
            'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&h=200&w=300',
        })
      }
      submitLabel={item ? 'Guardar cambios' : 'Crear producto'}
    >
      <div className="rc-form-grid">
        <label className="hk-form-label">
          Nombre
          <input
            className="hk-form-select"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Desayuno Aurora"
          />
        </label>
        <label className="hk-form-label">
          Categoría
          <select
            className="hk-form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Desayunos</option>
            <option>Almuerzos</option>
            <option>Cenas</option>
            <option>Bebidas</option>
            <option>Snacks</option>
          </select>
        </label>
        <label className="hk-form-label">
          Precio
          <input
            className="hk-form-select"
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Disponibilidad
          <select
            className="hk-form-select"
            value={available ? 'si' : 'no'}
            onChange={(e) => setAvailable(e.target.value === 'si')}
          >
            <option value="si">Disponible</option>
            <option value="no">No disponible</option>
          </select>
        </label>
        <label className="hk-form-label">
          Estado
          <select
            className="hk-form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </label>
      </div>
      <label className="hk-form-label">
        URL de imagen
        <input
          className="hk-form-select"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://..."
        />
      </label>
    </AdminModal>
  );
}

function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: InventoryProduct | null;
  onClose: () => void;
  onSave: (p: InventoryProduct) => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? 'Lencería');
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [minStock, setMinStock] = useState(product?.minStock ?? 0);
  const [price, setPrice] = useState(product?.price ?? 0);
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>(product?.status ?? 'Activo');
  return (
    <AdminModal
      title={product ? 'Editar producto' : 'Nuevo producto'}
      eyebrow="GESTIÓN DE INVENTARIO"
      onClose={onClose}
      onSubmit={() =>
        onSave({ id: product?.id ?? 0, name, category, stock, minStock, price, status })
      }
      submitLabel={product ? 'Guardar cambios' : 'Crear producto'}
    >
      <div className="rc-form-grid">
        <label className="hk-form-label">
          Nombre
          <input
            className="hk-form-select"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Toallas de baño"
          />
        </label>
        <label className="hk-form-label">
          Categoría
          <select
            className="hk-form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Lencería</option>
            <option>Amenidades</option>
            <option>Cocina</option>
            <option>Bebidas</option>
            <option>Limpieza</option>
          </select>
        </label>
        <label className="hk-form-label">
          Stock
          <input
            className="hk-form-select"
            type="number"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Stock mínimo
          <input
            className="hk-form-select"
            type="number"
            value={minStock}
            onChange={(e) => setMinStock(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Precio
          <input
            className="hk-form-select"
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Estado
          <select
            className="hk-form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </label>
      </div>
    </AdminModal>
  );
}

function MovementModal({
  products,
  onClose,
  onSave,
}: {
  products: InventoryProduct[];
  onClose: () => void;
  onSave: (m: {
    productId: number;
    type: 'Entrada' | 'Salida';
    quantity: number;
    reason: string;
    responsible: string;
  }) => void;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [type, setType] = useState<'Entrada' | 'Salida'>('Entrada');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [responsible, setResponsible] = useState('Edgar González');
  return (
    <AdminModal
      title="Registrar movimiento"
      eyebrow="MOVIMIENTO DE INVENTARIO"
      onClose={onClose}
      onSubmit={() => onSave({ productId, type, quantity, reason, responsible })}
      submitLabel="Registrar"
    >
      <div className="rc-form-grid">
        <label className="hk-form-label">
          Producto
          <select
            className="hk-form-select"
            value={productId}
            onChange={(e) => setProductId(Number(e.target.value))}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="hk-form-label">
          Tipo
          <select
            className="hk-form-select"
            value={type}
            onChange={(e) => setType(e.target.value as 'Entrada' | 'Salida')}
          >
            <option value="Entrada">Entrada</option>
            <option value="Salida">Salida</option>
          </select>
        </label>
        <label className="hk-form-label">
          Cantidad
          <input
            className="hk-form-select"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Responsable
          <input
            className="hk-form-select"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
          />
        </label>
      </div>
      <label className="hk-form-label">
        Motivo
        <textarea
          className="hk-form-textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej. Compra mensual, reposición..."
        />
      </label>
    </AdminModal>
  );
}

function CashModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (m: {
    concept: string;
    type: 'Ingreso' | 'Egreso';
    amount: number;
    responsible: string;
  }) => void;
}) {
  const [concept, setConcept] = useState('');
  const [type, setType] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [amount, setAmount] = useState(0);
  const [responsible, setResponsible] = useState('Edgar González');
  return (
    <AdminModal
      title="Nuevo movimiento de caja"
      eyebrow="GESTIÓN DE CAJA"
      onClose={onClose}
      onSubmit={() => onSave({ concept, type, amount, responsible })}
      submitLabel="Registrar"
    >
      <div className="rc-form-grid">
        <label className="hk-form-label">
          Concepto
          <input
            className="hk-form-select"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Ej. Pago de huésped"
          />
        </label>
        <label className="hk-form-label">
          Tipo
          <select
            className="hk-form-select"
            value={type}
            onChange={(e) => setType(e.target.value as 'Ingreso' | 'Egreso')}
          >
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
          </select>
        </label>
        <label className="hk-form-label">
          Monto
          <input
            className="hk-form-select"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        <label className="hk-form-label">
          Responsable
          <input
            className="hk-form-select"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
          />
        </label>
      </div>
    </AdminModal>
  );
}
