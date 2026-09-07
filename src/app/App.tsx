import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Ban,
  Bell,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  DoorOpen,
  Dumbbell,
  Eye,
  FileText,
  Gauge,
  Gift,
  Headphones,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Package,
  Pencil,
  Percent,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TriangleAlert,
  UserRound,
  Users,
  Utensils,
  Wallet,
  Waves,
  Wifi,
  X,
} from 'lucide-react';
import { ReceptionContent } from '@/components/reception/ReceptionContent';
import { GuestContent } from '@/components/guest/GuestContent';
import { RoomServiceContent } from '@/components/roomservice/RoomServiceContent';
import { AdminContent } from '@/components/admin/AdminContent';

type RoleId = 'reception' | 'admin' | 'housekeeping' | 'room-service' | 'concierge' | 'payment' | 'guest';
type IconType = typeof Home;

type Role = {
  id: RoleId;
  name: string;
  person: string;
  initials: string;
  description: string;
  icon: IconType;
  color: string;
};

type NavItem = { label: string; icon: IconType; badge?: string };

type Task = { id: number; title: string; room: string; guest: string; time: string; status: string; tone: 'warning' | 'info' | 'success' };

type RoomStatus = 'Pendiente' | 'En proceso' | 'Completada';
type CleaningRoom = {
  id: number;
  number: string;
  floor: string;
  type: string;
  cleaningType: string;
  priority: string;
  status: RoomStatus;
  startTime: string | null;
  endTime: string | null;
  duration: string | null;
  checklist: { label: string; done: boolean }[];
};

type GuestRequest = {
  id: number;
  room: string;
  request: string;
  time: string;
  priority: string;
  status: 'Pendiente' | 'En proceso' | 'Completada';
};

type HistoryEntry = {
  id: number;
  room: string;
  taskType: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  status: 'Completada';
};

type DefectReport = {
  id: number;
  room: string;
  category: string;
  description: string;
  priority: string;
  observation: string;
  photo: string;
};

export type OrderStatus = 'Pendiente' | 'Aceptado' | 'En preparación' | 'Listo' | 'En camino' | 'Entregado' | 'Rechazado' | 'Cancelado';
export type RoomServiceOrder = {
  id: number;
  room: string;
  guest: string;
  time: string;
  items: { name: string; quantity: number; price: number }[];
  status: OrderStatus;
  note: string;
  rejectionReason: string;
  charged: boolean;
};

type ConciergeStatus = 'Pendiente' | 'Aceptada' | 'En proceso' | 'Completada' | 'Rechazada';
type ConciergeRequest = {
  id: number;
  room: string;
  guest: string;
  time: string;
  category: string;
  description: string;
  priority: 'Alta' | 'Media' | 'Baja';
  status: ConciergeStatus;
  observation: string;
  rejectionReason: string;
  completedAt: string | null;
};

export type ReservationStatus = 'Pendiente' | 'Confirmada' | 'Check-in' | 'Check-out' | 'Cancelada' | 'Anulada';
export type RecRoomStatus = 'Disponible' | 'Ocupada' | 'Bloqueada' | 'Limpieza' | 'Mantenimiento';
export type RoomType = 'Estándar' | 'Deluxe' | 'Suite';
export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia';

export type GuestInfo = {
  name: string;
  lastName: string;
  phone: string;
  email: string;
  docType: string;
  docNumber: string;
  birthDate: string;
  nationality: string;
};

export type Companion = {
  id: number;
  name: string;
  lastName: string;
  document: string;
  age: number;
};

export type FolioEntry = {
  id: number;
  concept: string;
  category: string;
  amount: number;
  date: string;
  type: 'Cargo' | 'Pago' | 'Depósito' | 'Anulación';
  status: 'Activo' | 'Anulado';
  method?: PaymentMethod;
  reference?: string;
  voidReason?: string;
};

export type Reservation = {
  id: number;
  code: string;
  guest: GuestInfo;
  companions: Companion[];
  checkIn: string;
  checkOut: string;
  roomNumber: string;
  roomType: RoomType;
  rate: number;
  guestCount: number;
  status: ReservationStatus;
  origin: string;
  observations: string;
  folio: FolioEntry[];
  cancelReason: string;
  voidReason: string;
  checkInTime: string | null;
  checkOutTime: string | null;
};

export type RecRoom = {
  id: number;
  number: string;
  floor: string;
  type: RoomType;
  capacity: number;
  rate: number;
  status: RecRoomStatus;
  features: string[];
};

export type RoomBlock = {
  id: number;
  roomNumber: string;
  startDate: string;
  endDate: string;
  reason: string;
  observation: string;
  active: boolean;
};

const roles: Role[] = [
  { id: 'reception', name: 'Recepción', person: 'Chepe', initials: 'CH', description: 'Reservas, huéspedes y operación diaria', icon: Headphones, color: 'terracotta' },
  { id: 'admin', name: 'Administrador', person: 'Edgar', initials: 'EG', description: 'Control total del hotel y reportes', icon: ShieldCheck, color: 'gold' },
  { id: 'housekeeping', name: 'Limpieza', person: 'César', initials: 'CS', description: 'Habitaciones y tareas pendientes', icon: Sparkles, color: 'sage' },
  { id: 'room-service', name: 'Room service', person: 'Douglas', initials: 'DG', description: 'Pedidos y entregas en habitación', icon: Package, color: 'blue' },
  { id: 'concierge', name: 'Conserjería', person: 'Douglas', initials: 'DG', description: 'Solicitudes y atención al huésped', icon: MessageSquare, color: 'brown' },
  { id: 'payment', name: 'Pasarela de pago', person: 'Pablo', initials: 'PL', description: 'Cobros, reembolsos y transacciones', icon: Wallet, color: 'ink' },
  { id: 'guest', name: 'Huésped', person: 'Pablo', initials: 'PB', description: 'Reserva, estancia y servicios', icon: UserRound, color: 'cream' },
];

const defaultTasks: Task[] = [
  { id: 1, title: 'Limpieza de salida', room: '402 · Suite', guest: 'María Fernanda', time: '10:30', status: 'Pendiente', tone: 'warning' },
  { id: 2, title: 'Toallas adicionales', room: '208 · Deluxe', guest: 'Alejandro Ruiz', time: '11:15', status: 'En proceso', tone: 'info' },
  { id: 3, title: 'Amenidad de bienvenida', room: '115 · Estándar', guest: 'Sofía Torres', time: '12:00', status: 'Completada', tone: 'success' },
  { id: 4, title: 'Revisión minibar', room: '307 · Deluxe', guest: 'Carlos Méndez', time: '12:30', status: 'Pendiente', tone: 'warning' },
];

const defaultRooms: CleaningRoom[] = [
  { id: 1, number: '204', floor: 'Piso 2', type: 'Deluxe', cleaningType: 'Limpieza de salida', priority: 'Alta', status: 'Pendiente', startTime: null, endTime: null, duration: null, checklist: [{ label: 'Cama preparada', done: false }, { label: 'Baño limpio', done: false }, { label: 'Toallas completas', done: false }, { label: 'Amenidades repuestas', done: false }, { label: 'Basura retirada', done: false }, { label: 'Piso limpio', done: false }] },
  { id: 2, number: '115', floor: 'Piso 1', type: 'Estándar', cleaningType: 'Limpieza de estancia', priority: 'Media', status: 'En proceso', startTime: '10:42', endTime: null, duration: null, checklist: [{ label: 'Cama preparada', done: true }, { label: 'Baño limpio', done: true }, { label: 'Toallas completas', done: false }, { label: 'Amenidades repuestas', done: false }, { label: 'Basura retirada', done: true }, { label: 'Piso limpio', done: false }] },
  { id: 3, number: '307', floor: 'Piso 3', type: 'Deluxe', cleaningType: 'Limpieza de salida', priority: 'Alta', status: 'Pendiente', startTime: null, endTime: null, duration: null, checklist: [{ label: 'Cama preparada', done: false }, { label: 'Baño limpio', done: false }, { label: 'Toallas completas', done: false }, { label: 'Amenidades repuestas', done: false }, { label: 'Basura retirada', done: false }, { label: 'Piso limpio', done: false }] },
  { id: 4, number: '402', floor: 'Piso 4', type: 'Suite', cleaningType: 'Limpieza de salida', priority: 'Urgente', status: 'Pendiente', startTime: null, endTime: null, duration: null, checklist: [{ label: 'Cama preparada', done: false }, { label: 'Baño limpio', done: false }, { label: 'Toallas completas', done: false }, { label: 'Amenidades repuestas', done: false }, { label: 'Basura retirada', done: false }, { label: 'Piso limpio', done: false }] },
  { id: 5, number: '208', floor: 'Piso 2', type: 'Deluxe', cleaningType: 'Limpieza de estancia', priority: 'Media', status: 'Completada', startTime: '09:15', endTime: '09:48', duration: '33 min', checklist: [{ label: 'Cama preparada', done: true }, { label: 'Baño limpio', done: true }, { label: 'Toallas completas', done: true }, { label: 'Amenidades repuestas', done: true }, { label: 'Basura retirada', done: true }, { label: 'Piso limpio', done: true }] },
  { id: 6, number: '312', floor: 'Piso 3', type: 'Estándar', cleaningType: 'Limpieza de estancia', priority: 'Baja', status: 'Pendiente', startTime: null, endTime: null, duration: null, checklist: [{ label: 'Cama preparada', done: false }, { label: 'Baño limpio', done: false }, { label: 'Toallas completas', done: false }, { label: 'Amenidades repuestas', done: false }, { label: 'Basura retirada', done: false }, { label: 'Piso limpio', done: false }] },
];

const defaultRequests: GuestRequest[] = [
  { id: 1, room: '208', request: 'Toallas adicionales', time: '10:15', priority: 'Media', status: 'Pendiente' },
  { id: 2, room: '402', request: 'Almohadas extra', time: '10:30', priority: 'Alta', status: 'Pendiente' },
  { id: 3, room: '115', request: 'Productos de higiene', time: '09:45', priority: 'Baja', status: 'En proceso' },
  { id: 4, room: '307', request: 'Limpieza de habitación', time: '11:00', priority: 'Alta', status: 'Pendiente' },
  { id: 5, room: '312', request: 'Amenidades adicionales', time: '11:20', priority: 'Baja', status: 'Completada' },
];

const defaultHistory: HistoryEntry[] = [
  { id: 1, room: '208', taskType: 'Limpieza de estancia', date: 'Hoy', startTime: '09:15', endTime: '09:48', duration: '33 min', status: 'Completada' },
  { id: 2, room: '312', taskType: 'Solicitud: Amenidades', date: 'Hoy', startTime: '08:30', endTime: '08:42', duration: '12 min', status: 'Completada' },
  { id: 3, room: '104', taskType: 'Limpieza de salida', date: 'Ayer', startTime: '14:20', endTime: '15:05', duration: '45 min', status: 'Completada' },
];

const defaultDefects: DefectReport[] = [
  { id: 1, room: '307', category: 'Plomería', description: 'Grifo del lavabo gotea constantemente', priority: 'Alta', observation: 'Revisar empaquetadura del grifo', photo: '' },
];

const defaultRoomServiceOrders: RoomServiceOrder[] = [
  { id: 1042, room: '402', guest: 'María Fernanda', time: '10:24', items: [{ name: 'Desayuno Aurora', quantity: 2, price: 280 }, { name: 'Café americano', quantity: 1, price: 65 }], status: 'Pendiente', note: 'Sin nueces, por favor', rejectionReason: '', charged: false },
  { id: 1041, room: '208', guest: 'Alejandro Ruiz', time: '10:12', items: [{ name: 'Club sandwich', quantity: 1, price: 240 }, { name: 'Agua mineral', quantity: 2, price: 45 }], status: 'En preparación', note: 'Llevar cubiertos extra', rejectionReason: '', charged: false },
  { id: 1040, room: '115', guest: 'Sofía Torres', time: '09:58', items: [{ name: 'Pasta al pesto', quantity: 1, price: 320 }], status: 'Listo', note: '', rejectionReason: '', charged: false },
  { id: 1039, room: '307', guest: 'Carlos Méndez', time: '09:42', items: [{ name: 'Jugo verde', quantity: 2, price: 110 }], status: 'Entregado', note: '', rejectionReason: '', charged: true },
  { id: 1038, room: '212', guest: 'Laura Gómez', time: '09:15', items: [{ name: 'Tabla de quesos', quantity: 1, price: 390 }], status: 'Rechazado', note: '', rejectionReason: 'Cocina cerrada temporalmente', charged: false },
];

const defaultConciergeRequests: ConciergeRequest[] = [
  { id: 201, room: '402', guest: 'María Fernanda', time: '08:15', category: 'Transporte', description: 'Taxi al aeropuerto para 2 personas a las 11:00', priority: 'Alta', status: 'Pendiente', observation: '', rejectionReason: '', completedAt: null },
  { id: 202, room: '208', guest: 'Alejandro Ruiz', time: '09:30', category: 'Reservación', description: 'Reservación en restaurante La Terraza para 2 personas esta noche', priority: 'Media', status: 'Aceptada', observation: 'Mesa junto a la ventana solicitada', rejectionReason: '', completedAt: null },
  { id: 203, room: '115', guest: 'Sofía Torres', time: '08:45', category: 'Información turística', description: 'Información sobre tours a los museos de la ciudad', priority: 'Baja', status: 'En proceso', observation: 'Se enviaron folletos digitales al correo', rejectionReason: '', completedAt: null },
  { id: 204, room: '307', guest: 'Carlos Méndez', time: '07:50', category: 'Servicios especiales', description: 'Arreglo de flores en la habitación para aniversario', priority: 'Alta', status: 'Completada', observation: 'Ramos de peonías rosas entregados', rejectionReason: '', completedAt: '08:40' },
  { id: 205, room: '212', guest: 'Laura Gómez', time: '10:05', category: 'Transporte', description: 'Renta de auto para 3 días con chofer', priority: 'Media', status: 'Rechazada', observation: '', rejectionReason: 'No hay disponibilidad de choferes para esta fecha', completedAt: null },
  { id: 206, room: '402', guest: 'María Fernanda', time: '09:10', category: 'Lavandería', description: 'Servicio de lavandería express para traje de caballero', priority: 'Media', status: 'Pendiente', observation: '', rejectionReason: '', completedAt: null },
  { id: 207, room: '115', guest: 'Sofía Torres', time: '10:30', category: 'Información turística', description: 'Mapa y recomendaciones de cafeterías cercanas', priority: 'Baja', status: 'Aceptada', observation: '', rejectionReason: '', completedAt: null },
];

const recRooms: RecRoom[] = [
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

const recRoomTypes: RoomType[] = ['Estándar', 'Deluxe', 'Suite'];

const recReservations: Reservation[] = [
  {
    id: 1, code: 'AUR-2401', checkIn: '2024-08-26', checkOut: '2024-08-29', roomNumber: '402', roomType: 'Suite', rate: 3900, guestCount: 2, status: 'Check-in', origin: 'Online', observations: 'Aniversario, arreglo floral solicitado',
    checkInTime: '14:20', checkOutTime: null, cancelReason: '', voidReason: '',
    guest: { name: 'María Fernanda', lastName: 'Castillo', phone: '+52 55 1234 5678', email: 'maria.castillo@email.com', docType: 'INE', docNumber: 'MTCC850101', birthDate: '1985-01-01', nationality: 'Mexicana' },
    companions: [{ id: 1, name: 'Roberto', lastName: 'Castillo', document: 'RCCJ870203', age: 37 }],
    folio: [
      { id: 101, concept: 'Alojamiento 3 noches', category: 'Alojamiento', amount: 11700, date: '2024-08-26', type: 'Cargo', status: 'Activo' },
      { id: 102, concept: 'Depósito garantía', category: 'Depósito', amount: 3000, date: '2024-08-26', type: 'Depósito', status: 'Activo', method: 'Tarjeta', reference: 'TXN-8821' },
      { id: 103, concept: 'Room service — Desayuno', category: 'Room service', amount: 560, date: '2024-08-27', type: 'Cargo', status: 'Activo' },
    ],
  },
  {
    id: 2, code: 'AUR-2402', checkIn: '2024-08-25', checkOut: '2024-08-27', roomNumber: '208', roomType: 'Deluxe', rate: 2450, guestCount: 1, status: 'Check-in', origin: 'Teléfono', observations: '',
    checkInTime: '15:10', checkOutTime: null, cancelReason: '', voidReason: '',
    guest: { name: 'Alejandro', lastName: 'Ruiz', phone: '+52 33 9876 5432', email: 'alejandro.ruiz@email.com', docType: 'Pasaporte', docNumber: 'P12345678', birthDate: '1990-05-15', nationality: 'Mexicana' },
    companions: [],
    folio: [
      { id: 201, concept: 'Alojamiento 2 noches', category: 'Alojamiento', amount: 4900, date: '2024-08-25', type: 'Cargo', status: 'Activo' },
      { id: 202, concept: 'Pago parcial', category: 'Pago', amount: 2000, date: '2024-08-25', type: 'Pago', status: 'Activo', method: 'Efectivo' },
    ],
  },
  {
    id: 3, code: 'AUR-2403', checkIn: '2024-08-27', checkOut: '2024-08-30', roomNumber: '115', roomType: 'Estándar', rate: 1850, guestCount: 2, status: 'Pendiente', origin: 'Presencial', observations: 'Llegada aprox. 16:00',
    checkInTime: null, checkOutTime: null, cancelReason: '', voidReason: '',
    guest: { name: 'Sofía', lastName: 'Torres', phone: '+52 81 5555 1212', email: 'sofia.torres@email.com', docType: 'INE', docNumber: 'TORJS950808', birthDate: '1995-08-08', nationality: 'Mexicana' },
    companions: [{ id: 1, name: 'Luis', lastName: 'Torres', document: 'TORLJ980101', age: 26 }],
    folio: [
      { id: 301, concept: 'Alojamiento 3 noches', category: 'Alojamiento', amount: 5550, date: '2024-08-27', type: 'Cargo', status: 'Activo' },
    ],
  },
  {
    id: 4, code: 'AUR-2404', checkIn: '2024-08-24', checkOut: '2024-08-26', roomNumber: '307', roomType: 'Deluxe', rate: 2450, guestCount: 2, status: 'Check-out', origin: 'Online', observations: '',
    checkInTime: '13:00', checkOutTime: '11:30', cancelReason: '', voidReason: '',
    guest: { name: 'Carlos', lastName: 'Méndez', phone: '+52 55 2222 3333', email: 'carlos.mendez@email.com', docType: 'INE', docNumber: 'MECJ880303', birthDate: '1988-03-03', nationality: 'Mexicana' },
    companions: [],
    folio: [
      { id: 401, concept: 'Alojamiento 2 noches', category: 'Alojamiento', amount: 4900, date: '2024-08-24', type: 'Cargo', status: 'Activo' },
      { id: 402, concept: 'Amenidades — Spa', category: 'Amenidades', amount: 1200, date: '2024-08-25', type: 'Cargo', status: 'Activo' },
      { id: 403, concept: 'Pago final', category: 'Pago', amount: 6100, date: '2024-08-26', type: 'Pago', status: 'Activo', method: 'Tarjeta', reference: 'TXN-9001' },
    ],
  },
  {
    id: 5, code: 'AUR-2405', checkIn: '2024-08-23', checkOut: '2024-08-25', roomNumber: '212', roomType: 'Deluxe', rate: 2450, guestCount: 1, status: 'Cancelada', origin: 'Teléfono', observations: '',
    checkInTime: null, checkOutTime: null, cancelReason: 'El huésped canceló por cambio de planes', voidReason: '',
    guest: { name: 'Laura', lastName: 'Gómez', phone: '+52 55 4444 5555', email: 'laura.gomez@email.com', docType: 'INE', docNumber: 'GOLRJ920909', birthDate: '1992-09-09', nationality: 'Mexicana' },
    companions: [],
    folio: [],
  },
  {
    id: 6, code: 'AUR-2406', checkIn: '2024-08-28', checkOut: '2024-08-30', roomNumber: '201', roomType: 'Deluxe', rate: 2450, guestCount: 2, status: 'Confirmada', origin: 'Online', observations: 'Solicita cama adicional para niño',
    checkInTime: null, checkOutTime: null, cancelReason: '', voidReason: '',
    guest: { name: 'Fernando', lastName: 'Díaz', phone: '+52 55 6666 7777', email: 'fernando.diaz@email.com', docType: 'Pasaporte', docNumber: 'P98765432', birthDate: '1982-12-12', nationality: 'Española' },
    companions: [{ id: 1, name: 'Ana', lastName: 'Díaz', document: 'P11223344', age: 10 }],
    folio: [
      { id: 601, concept: 'Alojamiento 2 noches', category: 'Alojamiento', amount: 4900, date: '2024-08-28', type: 'Cargo', status: 'Activo' },
      { id: 602, concept: 'Depósito', category: 'Depósito', amount: 1500, date: '2024-08-22', type: 'Depósito', status: 'Activo', method: 'Transferencia', reference: 'TRF-4451' },
    ],
  },
];

const recRoomBlocks: RoomBlock[] = [
  { id: 1, roomNumber: '410', startDate: '2024-08-25', endDate: '2024-08-30', reason: 'Mantenimiento', observation: 'Revisión de climatización', active: true },
];

const navByRole: Record<RoleId, NavItem[]> = {
  reception: [
    { label: 'Resumen', icon: Gauge }, { label: 'Calendario', icon: CalendarDays, badge: '12' }, { label: 'Reservas', icon: ClipboardList },
    { label: 'Huéspedes', icon: Users }, { label: 'Disponibilidad', icon: BedDouble }, { label: 'Habitaciones', icon: DoorOpen }, { label: 'Caja', icon: Wallet },
  ],
  admin: [
    { label: 'Dashboard', icon: Gauge }, { label: 'Usuarios y roles', icon: Users }, { label: 'Habitaciones', icon: BedDouble },
    { label: 'Tarifas', icon: Wallet }, { label: 'Promociones', icon: Percent }, { label: 'Servicios', icon: Utensils },
    { label: 'Reportes', icon: FileText }, { label: 'Inventario', icon: Package }, { label: 'Caja', icon: Wallet }, { label: 'Auditoría', icon: ShieldCheck },
  ],
  housekeeping: [
    { label: 'Inicio', icon: Gauge }, { label: 'Habitaciones', icon: BedDouble, badge: '4' }, { label: 'Solicitudes', icon: ClipboardList, badge: '3' }, { label: 'Historial', icon: FileText }, { label: 'Perfil', icon: UserRound },
  ],
  'room-service': [
    { label: 'Pedidos activos', icon: Gauge, badge: '4' }, { label: 'Menú', icon: ClipboardList }, { label: 'Historial', icon: FileText }, { label: 'Inventario', icon: Package },
  ],
  concierge: [
    { label: 'Solicitudes', icon: ClipboardList, badge: '4' }, { label: 'Por habitación', icon: BedDouble }, { label: 'Historial', icon: FileText },
  ],
  payment: [
    { label: 'Transacciones', icon: Gauge }, { label: 'Cobros pendientes', icon: Wallet, badge: '8' }, { label: 'Reembolsos', icon: ArrowRight }, { label: 'Reportes', icon: FileText },
  ],
  guest: [
    { label: 'Inicio', icon: Home }, { label: 'Mis reservas', icon: CalendarDays }, { label: 'Mi estancia', icon: BedDouble }, { label: 'Amenidades', icon: Sparkles }, { label: 'Servicios de habitación', icon: ClipboardList }, { label: 'Room service', icon: Package }, { label: 'Mis solicitudes y pedidos', icon: FileText }, { label: 'Notificaciones', icon: Bell }, { label: 'Mi perfil', icon: UserRound }, { label: 'Cerrar sesión', icon: LogOut },
  ],
};

const metricsByRole: Record<RoleId, { label: string; value: string; change: string; icon: IconType; tone: string }[]> = {
  reception: [
    { label: 'Ocupación hoy', value: '78%', change: '+6.4%', icon: BedDouble, tone: 'sage' }, { label: 'Check-ins', value: '18', change: '4 próximos', icon: DoorOpen, tone: 'gold' },
    { label: 'Check-outs', value: '11', change: '3 pendientes', icon: ClipboardList, tone: 'terracotta' }, { label: 'Ingresos del día', value: '$8,420', change: '+12.8%', icon: Wallet, tone: 'blue' },
  ],
  admin: [
    { label: 'Ocupación mensual', value: '84.6%', change: '+8.2%', icon: BedDouble, tone: 'sage' }, { label: 'Ingresos', value: '$128.4K', change: '+14.5%', icon: Wallet, tone: 'gold' },
    { label: 'Reservas activas', value: '142', change: '18 nuevas', icon: CalendarDays, tone: 'terracotta' }, { label: 'NPS huésped', value: '92', change: '+4.1 pts', icon: Sparkles, tone: 'blue' },
  ],
  housekeeping: [
    { label: 'Habitaciones hoy', value: '14', change: '6 pendientes', icon: BedDouble, tone: 'sage' }, { label: 'En limpieza', value: '3', change: 'Ahora', icon: Sparkles, tone: 'gold' },
    { label: 'Solicitudes', value: '5', change: '2 urgentes', icon: ClipboardList, tone: 'terracotta' }, { label: 'Eficiencia', value: '96%', change: '+3.2%', icon: Activity, tone: 'blue' },
  ],
  'room-service': [
    { label: 'Pedidos activos', value: '4', change: '2 nuevos', icon: ClipboardList, tone: 'terracotta' }, { label: 'En preparación', value: '2', change: 'Ahora', icon: Package, tone: 'gold' },
    { label: 'Listos para entrega', value: '1', change: 'Habitación 208', icon: DoorOpen, tone: 'sage' }, { label: 'Ventas de hoy', value: '$1,860', change: '+18.4%', icon: Wallet, tone: 'blue' },
  ],
  concierge: [
    { label: 'Solicitudes abiertas', value: '5', change: '2 urgentes', icon: ClipboardList, tone: 'terracotta' }, { label: 'En atención', value: '3', change: 'Ahora', icon: Headphones, tone: 'gold' },
    { label: 'Habitaciones ocupadas', value: '86', change: '78% del hotel', icon: BedDouble, tone: 'sage' }, { label: 'Satisfacción', value: '98%', change: '+2.8%', icon: Sparkles, tone: 'blue' },
  ],
  payment: [
    { label: 'Por cobrar', value: '$12,460', change: '8 transacciones', icon: Wallet, tone: 'terracotta' }, { label: 'Procesadas hoy', value: '$24,890', change: '+21.4%', icon: Activity, tone: 'sage' },
    { label: 'Reembolsos', value: '$1,240', change: '3 solicitudes', icon: ArrowRight, tone: 'gold' }, { label: 'Tasa aprobada', value: '98.6%', change: '+0.8%', icon: ShieldCheck, tone: 'blue' },
  ],
  guest: [
    { label: 'Noches restantes', value: '03', change: 'Check-out: 28 ago', icon: CalendarDays, tone: 'sage' }, { label: 'Saldo pendiente', value: '$420', change: 'Al finalizar', icon: Wallet, tone: 'gold' },
    { label: 'Servicios activos', value: '02', change: '1 solicitud', icon: Sparkles, tone: 'terracotta' }, { label: 'Puntos Aurora', value: '1,840', change: '+240 esta estancia', icon: Activity, tone: 'blue' },
  ],
};

function App() {
  const [activeRole, setActiveRole] = useState<RoleId | null>(null);
  const [activeNav, setActiveNav] = useState('Resumen');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [tasks, setTasks] = useState(defaultTasks);
  const [search, setSearch] = useState('');
  const [authMode, setAuthMode] = useState<'choice' | 'guest' | 'employee' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hkRooms, setHkRooms] = useState(defaultRooms);
  const [hkRequests, setHkRequests] = useState(defaultRequests);
  const [hkHistory, setHkHistory] = useState(defaultHistory);
  const [hkDefects, setHkDefects] = useState(defaultDefects);
  const [hkDetailRoomId, setHkDetailRoomId] = useState<number | null>(null);
  const [hkShowDefectModal, setHkShowDefectModal] = useState(false);
  const [hkShowStatusModal, setHkShowStatusModal] = useState<CleaningRoom | null>(null);
  const [hkSearch, setHkSearch] = useState('');
  const [hkFilter, setHkFilter] = useState<'Todos' | RoomStatus>('Todos');
  const [rsOrders, setRsOrders] = useState(defaultRoomServiceOrders);
  const [rsSelectedOrderId, setRsSelectedOrderId] = useState<number | null>(null);
  const [rsSearch, setRsSearch] = useState('');
  const [rsFilter, setRsFilter] = useState<'Todos' | OrderStatus>('Todos');
  const [cgRequests, setCgRequests] = useState(defaultConciergeRequests);
  const [cgSelectedRequestId, setCgSelectedRequestId] = useState<number | null>(null);
  const [cgSearch, setCgSearch] = useState('');
  const [cgFilter, setCgFilter] = useState<'Todos' | ConciergeStatus>('Todos');
  const [recReservationList, setRecReservationList] = useState<Reservation[]>(recReservations);
  const [recRoomList, setRecRoomList] = useState<RecRoom[]>(recRooms);
  const [recBlockList, setRecBlockList] = useState<RoomBlock[]>(recRoomBlocks);
  const [recSelectedResId, setRecSelectedResId] = useState<number | null>(null);
  const [recShowNewRes, setRecShowNewRes] = useState(false);
  const [recShowWalkin, setRecShowWalkin] = useState(false);
  const [recShowCheckin, setRecShowCheckin] = useState<number | null>(null);
  const [recShowCheckout, setRecShowCheckout] = useState<number | null>(null);
  const [recShowCancel, setRecShowCancel] = useState<number | null>(null);
  const [recShowVoid, setRecShowVoid] = useState<number | null>(null);
  const [recShowCharge, setRecShowCharge] = useState<number | null>(null);
  const [recShowVoidCharge, setRecShowVoidCharge] = useState<{ resId: number; entryId: number } | null>(null);
  const [recShowPayment, setRecShowPayment] = useState<number | null>(null);
  const [recShowDeposit, setRecShowDeposit] = useState<number | null>(null);
  const [recShowRoomChange, setRecShowRoomChange] = useState<number | null>(null);
  const [recShowBlock, setRecShowBlock] = useState(false);
  const [recShowInvoice, setRecShowInvoice] = useState<number | null>(null);
  const [recCashAction, setRecCashAction] = useState<'payment' | 'charge' | null>(null);
  const [recCalFilter, setRecCalFilter] = useState<{ room: string; type: string; status: string }>({ room: 'Todos', type: 'Todos', status: 'Todos' });
  const [recSearch, setRecSearch] = useState('');
  const hkDetailRoom = hkDetailRoomId !== null ? hkRooms.find((r) => r.id === hkDetailRoomId) ?? null : null;
  const rsSelectedOrder = rsSelectedOrderId === null ? null : rsOrders.find((order) => order.id === rsSelectedOrderId) ?? null;
  const cgSelectedRequest = cgSelectedRequestId === null ? null : cgRequests.find((req) => req.id === cgSelectedRequestId) ?? null;
  const recSelectedRes = recSelectedResId === null ? null : recReservationList.find((r) => r.id === recSelectedResId) ?? null;
  const recNextCode = () => `AUR-${2407 + recReservationList.length - recReservations.length}`;
  const recNights = (checkIn: string, checkOut: string) => Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  const recFolioTotals = (folio: FolioEntry[]) => {
    const active = folio.filter((f) => f.status === 'Activo');
    const charges = active.filter((f) => f.type === 'Cargo').reduce((s, f) => s + f.amount, 0);
    const deposits = active.filter((f) => f.type === 'Depósito').reduce((s, f) => s + f.amount, 0);
    const payments = active.filter((f) => f.type === 'Pago').reduce((s, f) => s + f.amount, 0);
    return { charges, deposits, payments, balance: charges - payments - deposits };
  };
  const recIsRoomBlocked = (roomNumber: string, checkIn: string, checkOut: string) => recBlockList.some((b) => b.active && b.roomNumber === roomNumber && new Date(b.endDate) >= new Date(checkIn) && new Date(b.startDate) <= new Date(checkOut));
  const recHasConflict = (roomNumber: string, checkIn: string, checkOut: string, excludeId?: number) => recReservationList.some((r) => r.id !== excludeId && !['Cancelada', 'Anulada'].includes(r.status) && r.roomNumber === roomNumber && new Date(r.checkOut) > new Date(checkIn) && new Date(r.checkIn) < new Date(checkOut));

  const role = roles.find((item) => item.id === activeRole) ?? roles[0];
  const nav = activeRole ? navByRole[activeRole] : [];
  const filteredTasks = useMemo(() => tasks.filter((task) => `${task.title} ${task.room} ${task.guest}`.toLowerCase().includes(search.toLowerCase())), [tasks, search]);
  const currentMetrics = activeRole === 'housekeeping' ? [
    { label: 'Habitaciones hoy', value: String(hkRooms.length), change: `${hkRooms.filter((r) => r.status === 'Pendiente').length} pendientes`, icon: BedDouble as IconType, tone: 'sage' },
    { label: 'En limpieza', value: String(hkRooms.filter((r) => r.status === 'En proceso').length), change: 'Ahora', icon: Sparkles as IconType, tone: 'gold' },
    { label: 'Solicitudes', value: String(hkRequests.filter((r) => r.status !== 'Completada').length), change: `${hkRequests.filter((r) => r.priority === 'Alta' && r.status !== 'Completada').length} urgentes`, icon: ClipboardList as IconType, tone: 'terracotta' },
    { label: 'Eficiencia', value: '96%', change: '+3.2%', icon: Activity as IconType, tone: 'blue' },
  ] : metricsByRole[activeRole ?? 'reception'];

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const login = (selectedRole: RoleId) => {
    setActiveRole(selectedRole);
    setActiveNav(selectedRole === 'admin' ? 'Dashboard' : selectedRole === 'guest' ? 'Mi estancia' : selectedRole === 'housekeeping' ? 'Inicio' : selectedRole === 'concierge' ? 'Solicitudes' : selectedRole === 'reception' ? 'Resumen' : navByRole[selectedRole][0].label);
    notify(`Bienvenido, ${roles.find((item) => item.id === selectedRole)?.person}`);
    if (selectedRole === 'guest') setActiveNav('Inicio');
  };

  const updateTask = (taskId: number) => {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status: 'Completada', tone: 'success' } : task));
    notify('La tarea se marcó como completada');
  };

  const startCleaning = (roomId: number) => {
    const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    setHkRooms((current) => current.map((room) => room.id === roomId ? { ...room, status: 'En proceso', startTime: now } : room));
    notify('Limpieza iniciada correctamente');
  };

  const finishCleaning = (roomId: number) => {
    const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const room = hkRooms.find((r) => r.id === roomId);
    let duration = '';
    if (room?.startTime) {
      const [sh, sm] = room.startTime.split(':').map(Number);
      const [eh, em] = now.split(':').map(Number);
      const total = (eh * 60 + em) - (sh * 60 + sm);
      duration = total > 0 ? `${total} min` : '';
    }
    setHkRooms((current) => current.map((r) => r.id === roomId ? { ...r, status: 'Completada', endTime: now, duration: duration || r.duration, checklist: r.checklist.map((c) => ({ ...c, done: true })) } : r));
    if (room) {
      setHkHistory((prev) => [{ id: Date.now(), room: room.number, taskType: room.cleaningType, date: 'Hoy', startTime: room.startTime ?? now, endTime: now, duration: duration || '—', status: 'Completada' }, ...prev]);
    }
    notify('Habitación marcada como limpia');
  };

  const changeRoomStatus = (roomId: number, status: RoomStatus) => {
    setHkRooms((current) => current.map((room) => {
      if (room.id !== roomId) return room;
      const updates: Partial<CleaningRoom> = { status };
      if (status === 'En proceso' && !room.startTime) updates.startTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      if (status === 'Completada') { updates.endTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); updates.checklist = room.checklist.map((c) => ({ ...c, done: true })); }
      return { ...room, ...updates };
    }));
    setHkShowStatusModal(null);
    notify('Estado actualizado correctamente');
  };

  const attendRequest = (reqId: number) => {
    setHkRequests((current) => current.map((r) => r.id === reqId ? { ...r, status: 'En proceso' } : r));
    notify('Solicitud asignada correctamente');
  };

  const completeRequest = (reqId: number) => {
    setHkRequests((current) => current.map((r) => r.id === reqId ? { ...r, status: 'Completada' } : r));
    const req = hkRequests.find((r) => r.id === reqId);
    if (req) {
      setHkHistory((prev) => [{ id: Date.now(), room: req.room, taskType: `Solicitud: ${req.request}`, date: 'Hoy', startTime: req.time, endTime: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }), duration: '—', status: 'Completada' }, ...prev]);
    }
    notify('Solicitud completada correctamente · El huésped ha sido informado');
  };

  const toggleChecklistItem = (roomId: number, index: number) => {
    setHkRooms((current) => current.map((room) => room.id === roomId ? { ...room, checklist: room.checklist.map((c, i) => i === index ? { ...c, done: !c.done } : c) } : room));
  };

  const submitDefect = (report: Omit<DefectReport, 'id'>) => {
    setHkDefects((prev) => [...prev, { ...report, id: Date.now() }]);
    setHkShowDefectModal(false);
    notify('Reporte enviado correctamente');
  };

  const updateRoomServiceOrder = (orderId: number, status: OrderStatus) => {
    setRsOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
    notify(`Pedido #${orderId} actualizado: ${status}`);
  };

  const updateRoomServiceNote = (orderId: number, note: string) => {
    setRsOrders((current) => current.map((order) => order.id === orderId ? { ...order, note } : order));
    notify('Observación guardada');
  };

  const chargeRoomServiceOrder = (orderId: number) => {
    setRsOrders((current) => current.map((order) => order.id === orderId ? { ...order, charged: true } : order));
    notify('Consumo cargado a la cuenta de la habitación');
  };

  const rejectRoomServiceOrder = (orderId: number, reason: string) => {
    setRsOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: 'Rechazado', rejectionReason: reason } : order));
    notify(`Pedido #${orderId} rechazado`);
  };

  const cancelRoomServiceOrder = (orderId: number, reason: string) => {
    setRsOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: 'Cancelado', rejectionReason: reason } : order));
    notify(`Pedido #${orderId} cancelado`);
  };

  const updateConciergeStatus = (requestId: number, status: ConciergeStatus) => {
    setCgRequests((current) => current.map((req) => req.id === requestId ? {
      ...req,
      status,
      completedAt: status === 'Completada' ? new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : req.completedAt,
    } : req));
    notify(`Solicitud #${requestId} actualizada: ${status}`);
  };

  const updateConciergeObservation = (requestId: number, observation: string) => {
    setCgRequests((current) => current.map((req) => req.id === requestId ? { ...req, observation } : req));
    notify('Observación guardada correctamente');
  };

  const rejectConciergeRequest = (requestId: number, reason: string) => {
    setCgRequests((current) => current.map((req) => req.id === requestId ? { ...req, status: 'Rechazada', rejectionReason: reason } : req));
    notify(`Solicitud #${requestId} rechazada`);
  };

  const recUpdateReservation = (id: number, updates: Partial<Reservation>) => {
    setRecReservationList((current) => current.map((r) => r.id === id ? { ...r, ...updates } : r));
  };

  const recAddReservation = (reservation: Reservation) => {
    setRecReservationList((current) => [...current, reservation]);
  };

  const recDoCheckin = (id: number, updates: Partial<GuestInfo>, companions: Companion[], res: Reservation) => {
    const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    setRecReservationList((current) => current.map((r) => r.id === id ? { ...r, guest: { ...r.guest, ...updates }, companions, status: 'Check-in', checkInTime: now, checkIn: res.checkIn, checkOut: res.checkOut, roomNumber: res.roomNumber } : r));
    setRecRoomList((current) => current.map((rm) => rm.number === res.roomNumber ? { ...rm, status: 'Ocupada' } : rm));
    setRecShowCheckin(null);
    notify(`Check-in realizado · ${res.code}`);
  };

  const recDoCheckout = (id: number) => {
    const res = recReservationList.find((r) => r.id === id);
    const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    setRecReservationList((current) => current.map((r) => r.id === id ? { ...r, status: 'Check-out', checkOutTime: now } : r));
    if (res) setRecRoomList((current) => current.map((rm) => rm.number === res.roomNumber ? { ...rm, status: 'Limpieza' } : rm));
    setRecShowCheckout(null);
    notify(`Check-out completado · ${res?.code}`);
  };

  const recCancelReservation = (id: number, reason: string) => {
    setRecReservationList((current) => current.map((r) => r.id === id ? { ...r, status: 'Cancelada', cancelReason: reason } : r));
    setRecShowCancel(null);
    notify('Reserva cancelada correctamente');
  };

  const recVoidReservation = (id: number, reason: string) => {
    setRecReservationList((current) => current.map((r) => r.id === id ? { ...r, status: 'Anulada', voidReason: reason } : r));
    setRecShowVoid(null);
    notify('Reserva anulada · conservada para auditoría');
  };

  const recChangeRoom = (id: number, newRoomNumber: string) => {
    const res = recReservationList.find((r) => r.id === id);
    if (!res) return;
    setRecReservationList((current) => current.map((r) => r.id === id ? { ...r, roomNumber: newRoomNumber } : r));
    setRecRoomList((current) => current.map((rm) => {
      if (rm.number === res.roomNumber) return { ...rm, status: 'Limpieza' };
      if (rm.number === newRoomNumber) return { ...rm, status: 'Ocupada' };
      return rm;
    }));
    setRecShowRoomChange(null);
    notify(`Habitación cambiada a ${newRoomNumber}`);
  };

  const recAddCharge = (resId: number, concept: string, category: string, amount: number, observation: string) => {
    setRecReservationList((current) => current.map((r) => r.id === resId ? { ...r, folio: [...r.folio, { id: Date.now(), concept, category, amount, date: new Date().toISOString().slice(0, 10), type: 'Cargo' as const, status: 'Activo' as const }] } : r));
    setRecShowCharge(null);
    notify('Cargo agregado a la cuenta');
  };

  const recVoidCharge = (resId: number, entryId: number, reason: string) => {
    setRecReservationList((current) => current.map((r) => r.id === resId ? { ...r, folio: r.folio.map((f) => f.id === entryId ? { ...f, status: 'Anulado' as const, voidReason: reason } : f) } : r));
    setRecShowVoidCharge(null);
    notify('Cargo anulado · saldo recalculado');
  };

  const recAddPayment = (resId: number, amount: number, method: PaymentMethod, reference: string) => {
    setRecReservationList((current) => current.map((r) => r.id === resId ? { ...r, folio: [...r.folio, { id: Date.now(), concept: `Pago ${method}`, category: 'Pago', amount, date: new Date().toISOString().slice(0, 10), type: 'Pago' as const, status: 'Activo' as const, method, reference }] } : r));
    setRecShowPayment(null);
    notify('Pago registrado correctamente');
  };

  const recAddDeposit = (resId: number, amount: number, method: PaymentMethod, reference: string) => {
    setRecReservationList((current) => current.map((r) => r.id === resId ? { ...r, folio: [...r.folio, { id: Date.now(), concept: 'Depósito / garantía', category: 'Depósito', amount, date: new Date().toISOString().slice(0, 10), type: 'Depósito' as const, status: 'Activo' as const, method, reference }] } : r));
    setRecShowDeposit(null);
    notify('Depósito registrado correctamente');
  };

  const recAddBlock = (roomNumber: string, startDate: string, endDate: string, reason: string, observation: string) => {
    setRecBlockList((current) => [...current, { id: Date.now(), roomNumber, startDate, endDate, reason, observation, active: true }]);
    setRecRoomList((current) => current.map((rm) => rm.number === roomNumber ? { ...rm, status: 'Bloqueada' } : rm));
    setRecShowBlock(false);
    notify(`Habitación ${roomNumber} bloqueada`);
  };

  const recRemoveBlock = (blockId: number) => {
    const block = recBlockList.find((b) => b.id === blockId);
    setRecBlockList((current) => current.map((b) => b.id === blockId ? { ...b, active: false } : b));
    if (block) setRecRoomList((current) => current.map((rm) => rm.number === block.roomNumber ? { ...rm, status: 'Disponible' } : rm));
    notify('Bloqueo finalizado · habitación disponible');
  };

  const closeAllReceptionModals = () => {
    setRecShowNewRes(false); setRecShowWalkin(false); setRecShowBlock(false);
    setRecShowCheckin(null); setRecShowCheckout(null); setRecShowCancel(null);
    setRecShowVoid(null); setRecShowCharge(null); setRecShowVoidCharge(null);
    setRecShowPayment(null); setRecShowDeposit(null); setRecShowRoomChange(null);
    setRecShowInvoice(null); setRecCashAction(null); setRecSelectedResId(null);
  };

  if (!activeRole) {
    return <><VisitorScreen onOpenAuth={() => setAuthMode('choice')} onRegister={() => setAuthMode('guest')} onAction={notify} />{authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onLogin={login} onRegister={() => { setAuthMode(null); setActiveRole('guest'); setActiveNav('Mi estancia'); notify('Cuenta de huésped creada correctamente'); }} />}{toast && <div className="toast"><span className="toast-check">✓</span>{toast}</div>}</>;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Sparkles size={19} /></span><span>AURORA <small>HOTEL PMS</small></span><button className="sidebar-close" onClick={() => setSidebarOpen(false)}><X size={20} /></button></div>
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <button className="property-switcher" onClick={() => notify('Hotel Aurora · Sede Centro')}><span className="property-icon"><Home size={16} /></span><span><strong>Hotel Aurora</strong><small>Sede Centro</small></span><ChevronDown size={15} /></button>
        <nav className="side-nav">
          <div className="workspace-label">OPERACIÓN</div>
          {nav.map((item) => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${activeNav === item.label ? 'active' : ''}`} onClick={() => { if (activeRole === 'reception') closeAllReceptionModals(); setActiveNav(item.label); setSidebarOpen(false); notify(`${item.label} seleccionado`); }}><Icon size={18} /><span>{item.label}</span>{item.badge && <b>{item.badge}</b>}</button>; })}
        </nav>
        <div className="sidebar-bottom"><button className="nav-item" onClick={() => notify('Ajustes listos para configurar')}><Settings size={18} /><span>Configuración</span></button><div className="support-card"><div className="support-dot"><Headphones size={15} /></div><div><strong>¿Necesitas ayuda?</strong><span>Habla con soporte</span></div><ArrowRight size={15} /></div></div>
      </aside>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="hamburger" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button><div className="crumbs"><span>Hotel Aurora</span><span>/</span><strong>{activeNav}</strong></div><div className="topbar-actions"><button className="icon-btn notification" onClick={() => notify('No tienes notificaciones nuevas')}><Bell size={19} /><i /></button><div className="profile-wrap"><button className="profile-button" onClick={() => setShowRoleMenu(!showRoleMenu)}><span className={`avatar ${role.color}`}>{role.initials}</span><span><strong>{role.person}</strong><small>{role.name}</small></span><ChevronDown size={15} /></button>{showRoleMenu && <div className="role-menu"><button onClick={() => setShowRoleMenu(false)}><UserRound size={15} /> Mi perfil</button><button onClick={() => notify('Preferencias actualizadas')}><Settings size={15} /> Preferencias</button><button className="logout" onClick={() => { setActiveRole(null); setShowRoleMenu(false); setSidebarOpen(false); }}><LogOut size={15} /> Cerrar sesión</button></div>}</div></div></header>
        <div className="content">
          <section className="welcome-row"><div><p className="eyebrow">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>{activeNav === 'Resumen' || activeNav === 'Dashboard' || activeNav === 'Mi jornada' || activeNav === 'Mi estancia' || activeNav === 'Inicio' || activeNav === 'Pedidos activos' ? `Buenos días, ${role.person}` : activeNav}</h1><p className="muted">{getSubtitle(activeNav, role.name)}</p></div><div className="welcome-actions">{activeRole === 'housekeeping' ? <button className="button primary" onClick={() => setHkShowDefectModal(true)}><Plus size={17} /> Reportar desperfecto</button> : activeRole === 'reception' ? <><button className="button secondary" onClick={() => notify('Reporte preparado para descargar')}><FileText size={16} /> Exportar reporte</button>{(activeNav === 'Resumen' || activeNav === 'Reservas' || activeNav === 'Calendario') && <button className="button primary" onClick={() => setRecShowNewRes(true)}><Plus size={17} /> Nueva reserva</button>}{(activeNav === 'Resumen' || activeNav === 'Reservas') && <button className="button secondary" onClick={() => setRecShowWalkin(true)}><DoorOpen size={16} /> Walk-in</button>}{activeNav === 'Habitaciones' && <button className="button primary" onClick={() => setRecShowBlock(true)}><Ban size={17} /> Bloquear habitación</button>}</> : <><button className="button secondary" onClick={() => notify('Reporte preparado para descargar')}><FileText size={16} /> Exportar reporte</button><button className="button primary" onClick={() => setShowModal(true)}><Plus size={17} /> {role.id === 'guest' ? 'Nueva solicitud' : 'Nueva operación'}</button></>}</div></section>
          {!(activeRole === 'admin' && activeNav !== 'Dashboard') && <section className="metric-grid">{currentMetrics.map((metric) => { const Icon = metric.icon; return <div className="metric-card" key={metric.label}><div className={`metric-icon ${metric.tone}`}><Icon size={19} /></div><div><p>{metric.label}</p><h2>{metric.value}</h2><span className={metric.change.includes('+') ? 'positive' : ''}>{metric.change}</span></div><MoreHorizontal className="metric-more" size={18} /></div>; })}</section>}
          {activeRole === 'housekeeping' ? <HousekeepingContent nav={activeNav} rooms={hkRooms} requests={hkRequests} history={hkHistory} defects={hkDefects} search={hkSearch} setSearch={setHkSearch} onStartCleaning={startCleaning} onFinishCleaning={finishCleaning} onChangeStatus={changeRoomStatus} onAttendRequest={attendRequest} onCompleteRequest={completeRequest} onToggleChecklist={toggleChecklistItem} onOpenDetail={(room) => setHkDetailRoomId(room.id)} onOpenDefectModal={() => setHkShowDefectModal(true)} onOpenStatusModal={setHkShowStatusModal} onSubmitDefect={submitDefect} onAction={notify} detailRoom={hkDetailRoom} onCloseDetail={() => setHkDetailRoomId(null)} showStatusModal={hkShowStatusModal} onCloseStatusModal={() => setHkShowStatusModal(null)} showDefectModal={hkShowDefectModal} onCloseDefectModal={() => setHkShowDefectModal(false)} hkFilter={hkFilter} setHkFilter={setHkFilter} /> : activeRole === 'concierge' ? <ConciergeContent nav={activeNav} requests={cgRequests} selectedRequest={cgSelectedRequest} onSelectRequest={setCgSelectedRequestId} onCloseRequest={() => setCgSelectedRequestId(null)} onUpdateStatus={updateConciergeStatus} onUpdateObservation={updateConciergeObservation} onReject={rejectConciergeRequest} onAction={notify} search={cgSearch} setSearch={setCgSearch} filter={cgFilter} setFilter={setCgFilter} /> : activeRole === 'reception' ? <ReceptionContent nav={activeNav} reservations={recReservationList} rooms={recRoomList} blocks={recBlockList} selectedRes={recSelectedRes} onSelectRes={setRecSelectedResId} onCloseRes={() => setRecSelectedResId(null)} onUpdateRes={recUpdateReservation} onAddReservation={recAddReservation} nextCode={recNextCode()} nights={recNights} folioTotals={recFolioTotals} isRoomBlocked={recIsRoomBlocked} hasConflict={recHasConflict} showNewRes={recShowNewRes} setShowNewRes={setRecShowNewRes} showWalkin={recShowWalkin} setShowWalkin={setRecShowWalkin} showCheckin={recShowCheckin} setShowCheckin={setRecShowCheckin} onCheckin={recDoCheckin} showCheckout={recShowCheckout} setShowCheckout={setRecShowCheckout} onCheckout={recDoCheckout} showCancel={recShowCancel} setShowCancel={setRecShowCancel} onCancel={recCancelReservation} showVoid={recShowVoid} setShowVoid={setRecShowVoid} onVoid={recVoidReservation} showCharge={recShowCharge} setShowCharge={setRecShowCharge} onAddCharge={recAddCharge} showVoidCharge={recShowVoidCharge} setShowVoidCharge={setRecShowVoidCharge} onVoidCharge={recVoidCharge} showPayment={recShowPayment} setShowPayment={setRecShowPayment} onAddPayment={recAddPayment} showDeposit={recShowDeposit} setShowDeposit={setRecShowDeposit} onAddDeposit={recAddDeposit} showRoomChange={recShowRoomChange} setShowRoomChange={setRecShowRoomChange} onRoomChange={recChangeRoom} showBlock={recShowBlock} setShowBlock={setRecShowBlock} onAddBlock={recAddBlock} onRemoveBlock={recRemoveBlock} showInvoice={recShowInvoice} setShowInvoice={setRecShowInvoice} cashAction={recCashAction} setCashAction={setRecCashAction} calFilter={recCalFilter} setCalFilter={setRecCalFilter} search={recSearch} setSearch={setRecSearch} onAction={notify} /> : activeRole === 'room-service' ? <RoomServiceContent nav={activeNav} orders={rsOrders} selectedOrder={rsSelectedOrder} onSelectOrder={setRsSelectedOrderId} onCloseOrder={() => setRsSelectedOrderId(null)} onUpdateStatus={updateRoomServiceOrder} onUpdateNote={updateRoomServiceNote} onReject={rejectRoomServiceOrder} onCancel={cancelRoomServiceOrder} onCharge={chargeRoomServiceOrder} onAction={notify} search={rsSearch} setSearch={setRsSearch} filter={rsFilter} setFilter={setRsFilter} /> : activeRole === 'guest' ? <GuestContent nav={activeNav} onAction={notify} onLogout={() => { setActiveRole(null); setActiveNav('Inicio'); }} /> : activeRole === 'admin' ? <AdminContent nav={activeNav} onAction={notify} /> : <><section className="dashboard-grid"><div className="panel main-panel"><div className="panel-heading"><div><h3>{getPanelTitle(activeRole, activeNav)}</h3><p>{getPanelDescription(activeRole)}</p></div><button className="text-button" onClick={() => notify('Vista completa abierta')}>Ver todo <ArrowRight size={15} /></button></div>{activeRole === 'admin' ? <AdminChart onAction={notify} /> : <TaskTable tasks={filteredTasks} search={search} setSearch={setSearch} onComplete={updateTask} onAction={notify} role={activeRole} />}</div><div className="panel side-panel"><div className="panel-heading"><div><h3>Actividad reciente</h3><p>Últimos movimientos del hotel</p></div><button className="icon-btn" onClick={() => notify('Actividad actualizada')}><Activity size={17} /></button></div><ActivityFeed role={activeRole} /></div></section>
          <section className="bottom-grid"><div className="panel occupancy-panel"><div className="panel-heading"><div><h3>Estado de habitaciones</h3><p>Vista rápida del inventario en tiempo real</p></div><button className="button small secondary" onClick={() => setActiveNav('Habitaciones')}>Gestionar <ArrowRight size={14} /></button></div><div className="room-stats"><RoomStat label="Ocupadas" value="86" tone="occupied" /><RoomStat label="Disponibles" value="24" tone="available" /><RoomStat label="Limpieza" value="08" tone="cleaning" /><RoomStat label="Mantenimiento" value="02" tone="maintenance" /></div><div className="progress-line"><span>Ocupación general</span><strong>78%</strong><div><i style={{ width: '78%' }} /></div></div></div><div className="panel quick-panel"><div className="panel-heading"><div><h3>Accesos rápidos</h3><p>Lo que más haces durante tu jornada</p></div></div><div className="quick-actions"><button onClick={() => setRecShowNewRes(true)}><span><Plus size={17} /></span>Crear reserva</button><button onClick={() => notify('Búsqueda de huésped activada')}><span><Search size={17} /></span>Buscar huésped</button><button onClick={() => notify('Calendario abierto')}><span><CalendarDays size={17} /></span>Ver calendario</button><button onClick={() => notify('Centro de ayuda abierto')}><span><Headphones size={17} /></span>Centro de ayuda</button></div></div></section></>}
        </div>
      </main>
      {showModal && activeRole !== 'reception' && <Modal role={role} onClose={() => setShowModal(false)} onSubmit={(message) => { setShowModal(false); notify(message); }} />}
      {toast && <div className="toast"><span className="toast-check">✓</span>{toast}</div>}
    </div>
  );
}

function ConciergeContent({
  nav,
  requests,
  selectedRequest,
  onSelectRequest,
  onCloseRequest,
  onUpdateStatus,
  onUpdateObservation,
  onReject,
  onAction,
  search,
  setSearch,
  filter,
  setFilter,
}: {
  nav: string;
  requests: ConciergeRequest[];
  selectedRequest: ConciergeRequest | null;
  onSelectRequest: (id: number) => void;
  onCloseRequest: () => void;
  onUpdateStatus: (id: number, status: ConciergeStatus) => void;
  onUpdateObservation: (id: number, observation: string) => void;
  onReject: (id: number, reason: string) => void;
  onAction: (message: string) => void;
  search: string;
  setSearch: (value: string) => void;
  filter: 'Todos' | ConciergeStatus;
  setFilter: (value: 'Todos' | ConciergeStatus) => void;
}) {
  const [rejectionRequestId, setRejectionRequestId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const activeRequests = requests.filter((req) => !['Completada', 'Rechazada'].includes(req.status));
  const completedRequests = requests.filter((req) => ['Completada', 'Rechazada'].includes(req.status));

  const statusClass = (status: ConciergeStatus) => status === 'Pendiente' ? 'warning' : status === 'Aceptada' || status === 'En proceso' ? 'info' : status === 'Completada' ? 'success' : 'terracotta';
  const priorityClass = (priority: string) => priority === 'Alta' ? 'warning' : priority === 'Media' ? 'info' : 'success';
  const categoryIcon = (category: string) => {
    if (category === 'Transporte') return <Headphones size={15} />;
    if (category === 'Reservación') return <CalendarDays size={15} />;
    if (category === 'Lavandería') return <Sparkles size={15} />;
    if (category === 'Información turística') return <FileText size={15} />;
    return <ClipboardList size={15} />;
  };

  const nextAction = (req: ConciergeRequest) => {
    if (req.status === 'Pendiente') return <><button className="button small primary" onClick={() => onUpdateStatus(req.id, 'Aceptada')}>Aceptar solicitud</button><button className="button small secondary" onClick={() => setRejectionRequestId(req.id)}>Rechazar</button></>;
    if (req.status === 'Aceptada') return <button className="button small primary" onClick={() => onUpdateStatus(req.id, 'En proceso')}>Marcar en proceso</button>;
    if (req.status === 'En proceso') return <button className="button small primary" onClick={() => onUpdateStatus(req.id, 'Completada')}>Completar solicitud</button>;
    return null;
  };

  const renderRequest = (req: ConciergeRequest) => <article className="cg-request-card" key={req.id}>
    <div className="cg-request-head"><div><span className="cg-request-number">Solicitud #{req.id}</span><h3>Habitación {req.room} · {req.guest}</h3><p>{req.category} · recibida a las {req.time}</p></div><div className="cg-request-pills"><span className={`status-pill ${priorityClass(req.priority)}`}>{req.priority}</span><span className={`status-pill ${statusClass(req.status)}`}>{req.status}</span></div></div>
    <div className="cg-request-body"><div className="cg-request-category">{categoryIcon(req.category)}<span>{req.category}</span></div><p className="cg-request-desc">{req.description}</p>{req.observation && <span className="cg-observation"><MessageSquare size={13} /> {req.observation}</span>}{req.rejectionReason && <span className="cg-rejection-note"><ShieldCheck size={13} /> {req.rejectionReason}</span>}</div>
    <div className="cg-request-foot"><div className="cg-request-actions">{nextAction(req)}<button className="button small secondary" onClick={() => onSelectRequest(req.id)}>Ver detalle</button></div></div>
  </article>;

  const filteredRequests = activeRequests.filter((req) => {
    const matchesSearch = `${req.id} ${req.room} ${req.guest} ${req.category} ${req.description}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'Todos' || req.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (nav === 'Historial') return <div className="panel cg-view"><div className="panel-heading"><div><h3>Historial de solicitudes</h3><p>Consulta las solicitudes atendidas, completadas o rechazadas.</p></div><button className="button small secondary" onClick={() => onAction('Historial actualizado')}><Activity size={14} /> Actualizar</button></div><div className="cg-history-list">{completedRequests.length === 0 ? <div className="hk-empty"><FileText size={22} /><p>Aún no hay solicitudes finalizados</p></div> : completedRequests.map((req) => <div className="cg-history-row" key={req.id}><div className="cg-history-info"><strong>#{req.id} · Habitación {req.room}</strong><span>{req.guest} · {req.category}</span><small>{req.description}</small></div><div className="cg-history-meta">{req.completedAt && <span><Clock size={13} /> Completada {req.completedAt}</span>}<strong className={`status-pill ${statusClass(req.status)}`}>{req.status}</strong></div><button className="button small secondary" onClick={() => onSelectRequest(req.id)}>Ver detalle</button></div>)}</div></div>;

  if (nav === 'Por habitación') {
    const roomGroups = requests.reduce<Record<string, ConciergeRequest[]>>((groups, req) => {
      (groups[req.room] = groups[req.room] ?? []).push(req); return groups;
    }, {});
    const sortedRooms = Object.keys(roomGroups).sort((a, b) => Number(a) - Number(b));
    return <div className="panel cg-view"><div className="panel-heading"><div><h3>Solicitudes por habitación</h3><p>Consulta las necesidades actuales de los huéspedes agrupadas por habitación.</p></div></div><div className="cg-room-group-list">{sortedRooms.length === 0 ? <div className="hk-empty"><BedDouble size={22} /><p>No hay solicitudes registradas</p></div> : sortedRooms.map((room) => {
      const roomRequests = roomGroups[room];
      const pendingCount = roomRequests.filter((r) => !['Completada', 'Rechazada'].includes(r.status)).length;
      return <div className="cg-room-group" key={room}><div className="cg-room-group-head"><div className="cg-room-group-title"><BedDouble size={18} /><div><strong>Habitación {room}</strong><span>{roomRequests[0].guest}</span></div></div><div className="cg-room-group-meta"><span className={`status-pill ${pendingCount > 0 ? 'warning' : 'success'}`}>{pendingCount > 0 ? `${pendingCount} activas` : 'Sin pendientes'}</span><span className="cg-room-count">{roomRequests.length} en total</span></div></div><div className="cg-room-group-items">{roomRequests.map((req) => <div className="cg-room-group-item" key={req.id} onClick={() => onSelectRequest(req.id)}><div className="cg-room-group-item-icon">{categoryIcon(req.category)}</div><div className="cg-room-group-item-info"><strong>{req.category}</strong><span>{req.description}</span></div><span className={`status-pill ${statusClass(req.status)}`}>{req.status}</span></div>)}</div></div>;
    })}</div></div>;
  }

  return <><div className="cg-layout"><div className="panel cg-view"><div className="panel-heading"><div><h3>Solicitudes activas</h3><p>Gestiona cada solicitud desde su recepción hasta su atención.</p></div><span className="cg-live"><i /> Actualizado ahora</span></div><div className="toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar solicitud, habitación, huésped..." /></div><div className="filter-dropdown"><button className="filter-button"><span>{filter}</span><ChevronDown size={15} /></button><div className="filter-menu"><button className={filter === 'Todos' ? 'active' : ''} onClick={() => setFilter('Todos')}>Todos</button><button className={filter === 'Pendiente' ? 'active' : ''} onClick={() => setFilter('Pendiente')}>Pendientes</button><button className={filter === 'Aceptada' ? 'active' : ''} onClick={() => setFilter('Aceptada')}>Aceptadas</button><button className={filter === 'En proceso' ? 'active' : ''} onClick={() => setFilter('En proceso')}>En proceso</button></div></div></div><div className="cg-summary"><div><span className="status-pill warning">Pendientes</span><strong>{requests.filter((r) => r.status === 'Pendiente').length}</strong></div><div><span className="status-pill info">En atención</span><strong>{requests.filter((r) => ['Aceptada', 'En proceso'].includes(r.status)).length}</strong></div><div><span className="status-pill success">Completadas</span><strong>{requests.filter((r) => r.status === 'Completada').length}</strong></div></div><div className="cg-request-list">{filteredRequests.length === 0 ? <div className="hk-empty"><ClipboardList size={22} /><p>No hay solicitudes activas</p></div> : filteredRequests.map(renderRequest)}</div></div><aside className="panel cg-side-panel"><div className="panel-heading"><div><h3>Turno de Douglas</h3><p>Conserjería · Hotel Aurora</p></div><span className="avatar brown">DG</span></div><div className="cg-shift-card"><div><span>Solicitudes del turno</span><strong>{requests.length}</strong></div><div><span>Completadas</span><strong>{requests.filter((r) => r.status === 'Completada').length}</strong></div><div><span>Rechazadas</span><strong>{requests.filter((r) => r.status === 'Rechazada').length}</strong></div></div><div className="cg-legend"><strong>Flujo de la solicitud</strong><span><i className="warning" /> Pendiente de aceptación</span><span><i className="info" /> Aceptada o en proceso</span><span><i className="success" /> Completada</span><span><i className="terracotta" /> Rechazada</span></div><div className="cg-category-breakdown"><strong>Solicitudes por categoría</strong>{['Transporte', 'Reservación', 'Lavandería', 'Información turística', 'Servicios especiales'].map((cat) => { const count = requests.filter((r) => r.category === cat).length; return count > 0 ? <div className="cg-category-row" key={cat}><span>{cat}</span><strong>{count}</strong></div> : null; })}</div></aside></div>{selectedRequest && <ConciergeRequestModal request={selectedRequest} onClose={onCloseRequest} onUpdateStatus={onUpdateStatus} onUpdateObservation={onUpdateObservation} />}{rejectionRequestId !== null && <div className="modal-backdrop" onMouseDown={() => setRejectionRequestId(null)}><div className="modal" style={{ width: 'var(--size-legacy-420)' }} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">RECHAZAR SOLICITUD</p><h2>Indica el motivo</h2></div><button className="icon-btn" onClick={() => setRejectionRequestId(null)}><X size={18} /></button></div><p className="login-helper">El huésped podrá consultar por qué no fue posible atender su solicitud.</p><textarea className="cg-rejection-textarea" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Ej. No hay disponibilidad para esta fecha..." /><div className="modal-foot"><button className="button secondary" onClick={() => setRejectionRequestId(null)}>Cancelar</button><button className="button primary" disabled={!rejectionReason.trim()} onClick={() => { const requestId = rejectionRequestId; onReject(requestId, rejectionReason.trim()); setRejectionRequestId(null); setRejectionReason(''); onCloseRequest(); }}>Confirmar rechazo</button></div></div></div>}</>;
}

function ConciergeRequestModal({ request, onClose, onUpdateStatus, onUpdateObservation }: { request: ConciergeRequest; onClose: () => void; onUpdateStatus: (id: number, status: ConciergeStatus) => void; onUpdateObservation: (id: number, observation: string) => void }) {
  const [observation, setObservation] = useState(request.observation);
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal cg-detail-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">DETALLE DE SOLICITUD</p><h2>Solicitud #{request.id}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div><div className="cg-detail-header"><div><strong>Habitación {request.room}</strong><span>{request.guest} · recibida {request.time}</span></div><span className={`status-pill ${request.status === 'Pendiente' ? 'warning' : request.status === 'Completada' ? 'success' : request.status === 'Rechazada' ? 'terracotta' : 'info'}`}>{request.status}</span></div><div className="cg-detail-meta"><div><small>Categoría</small><span>{request.category}</span></div><div><small>Prioridad</small><span className={`status-pill ${request.priority === 'Alta' ? 'warning' : request.priority === 'Media' ? 'info' : 'success'}`}>{request.priority}</span></div>{request.completedAt && <div><small>Completada</small><span>{request.completedAt}</span></div>}</div><div className="cg-detail-description"><strong>Solicitud del huésped</strong><p>{request.description}</p></div>{request.rejectionReason && <div className="cg-detail-rejection"><ShieldCheck size={16} /><div><strong>Motivo de rechazo</strong><p>{request.rejectionReason}</p></div></div>}<label className="cg-note-label">Observaciones<textarea value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Agrega información sobre la atención brindada..." /></label><div className="cg-detail-actions"><button className="button secondary" onClick={() => { onUpdateObservation(request.id, observation); }}>Guardar observación</button>{request.status === 'Pendiente' && <button className="button primary" onClick={() => onUpdateStatus(request.id, 'Aceptada')}>Aceptar solicitud</button>}{request.status === 'Aceptada' && <button className="button primary" onClick={() => onUpdateStatus(request.id, 'En proceso')}>Marcar en proceso</button>}{request.status === 'En proceso' && <button className="button primary" onClick={() => onUpdateStatus(request.id, 'Completada')}>Completar solicitud</button>}{request.status === 'Completada' && <span className="cg-completed"><ShieldCheck size={15} /> Solicitud atendida</span>}</div></div></div>;
}

function HousekeepingContent({
  nav, rooms, requests, history, defects, search, setSearch,
  onStartCleaning, onFinishCleaning, onChangeStatus, onAttendRequest, onCompleteRequest, onToggleChecklist,
  onOpenDetail, onOpenDefectModal, onOpenStatusModal, onSubmitDefect, onAction, detailRoom, onCloseDetail,
  hkFilter, setHkFilter,
  showStatusModal, onCloseStatusModal, showDefectModal, onCloseDefectModal,
}: {
  nav: string;
  rooms: CleaningRoom[];
  requests: GuestRequest[];
  history: HistoryEntry[];
  defects: DefectReport[];
  search: string;
  setSearch: (value: string) => void;
  onStartCleaning: (id: number) => void;
  onFinishCleaning: (id: number) => void;
  onChangeStatus: (id: number, status: RoomStatus) => void;
  onAttendRequest: (id: number) => void;
  onCompleteRequest: (id: number) => void;
  onToggleChecklist: (roomId: number, index: number) => void;
  onOpenDetail: (room: CleaningRoom) => void;
  hkFilter: 'Todos' | RoomStatus;
  setHkFilter: (value: 'Todos' | RoomStatus) => void;
  onOpenDefectModal: () => void;
  onOpenStatusModal: (room: CleaningRoom) => void;
  onSubmitDefect: (report: Omit<DefectReport, 'id'>) => void;
  onAction: (message: string) => void;
  detailRoom: CleaningRoom | null;
  onCloseDetail: () => void;
  showStatusModal: CleaningRoom | null;
  onCloseStatusModal: () => void;
  showDefectModal: boolean;
  onCloseDefectModal: () => void;
}) {
  const pending = rooms.filter((r) => r.status === 'Pendiente').length;
  const inProgress = rooms.filter((r) => r.status === 'En proceso').length;
  const completed = rooms.filter((r) => r.status === 'Completada').length;
  const reqPending = requests.filter((r) => r.status === 'Pendiente').length;
  const reqInProgress = requests.filter((r) => r.status === 'En proceso').length;
  const reqCompleted = requests.filter((r) => r.status === 'Completada').length;
  const filteredRooms = rooms.filter((r) => {
    const matchesSearch = `${r.number} ${r.floor} ${r.type} ${r.cleaningType}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = hkFilter === 'Todos' || r.status === hkFilter;
    return matchesSearch && matchesFilter;
  });

  if (nav === 'Perfil') {
    return <div className="panel" style={{ maxWidth: 'var(--size-legacy-540)', margin: '0 auto' }}><div className="panel-heading"><div><h3>Mi perfil</h3><p>Datos del personal de limpieza</p></div></div><div className="hk-profile"><div className="hk-profile-avatar sage">CS</div><div className="hk-profile-info"><h4>César Salazar</h4><p>Personal de Limpieza · Hotel Aurora</p><small>Turno: Matutino · 06:00 — 14:00</small></div></div><div className="hk-profile-stats"><div><span>Habitaciones hoy</span><strong>{pending + inProgress + completed}</strong></div><div><span>Completadas</span><strong>{completed}</strong></div><div><span>En proceso</span><strong>{inProgress}</strong></div></div><div className="hk-profile-detail"><div><span>Rol</span><strong>Personal de Limpieza</strong></div><div><span>ID empleado</span><strong>HK-0042</strong></div><div><span>Sede</span><strong>Hotel Aurora · Centro</strong></div></div></div>;
  }

  if (nav === 'Historial') {
    return <div className="panel"><div className="panel-heading"><div><h3>Historial de tareas</h3><p>Tareas y solicitudes completadas</p></div></div><div className="hk-history-list">{history.length === 0 && <div className="hk-empty"><FileText size={22} /><p>Aún no hay tareas completadas</p></div>}{history.map((entry) => <div className="hk-history-row" key={entry.id}><div className="hk-history-info"><strong>Habitación {entry.room}</strong><span>{entry.taskType}</span><small>{entry.date}</small></div><div className="hk-history-time"><span><Clock size={13} /> {entry.startTime} → {entry.endTime}</span><strong>{entry.duration}</strong></div><span className="status-pill success">{entry.status}</span></div>)}</div></div>;
  }

  if (nav === 'Solicitudes') {
    return <div className="panel"><div className="panel-heading"><div><h3>Solicitudes de huéspedes</h3><p>Solicitudes relacionadas con limpieza y amenidades</p></div></div><div className="hk-req-summary"><div className="hk-summary-card"><span className="status-pill warning">Pendientes</span><strong>{reqPending}</strong></div><div className="hk-summary-card"><span className="status-pill info">En proceso</span><strong>{reqInProgress}</strong></div><div className="hk-summary-card"><span className="status-pill success">Completadas</span><strong>{reqCompleted}</strong></div></div><div className="hk-req-list">{requests.length === 0 && <div className="hk-empty"><ClipboardList size={22} /><p>No hay solicitudes pendientes</p></div>}{requests.map((req) => <div className={`hk-req-row ${req.status === 'Completada' ? 'completed' : ''}`} key={req.id}><div className="hk-req-info"><strong>Habitación {req.room}</strong><span>{req.request}</span></div><span className="hk-req-time">{req.time}</span>{req.priority === 'Alta' && <span className="status-pill warning">Prioridad alta</span>}{req.priority === 'Media' && <span className="status-pill info">Prioridad media</span>}{req.priority === 'Baja' && <span className="status-pill success">Prioridad baja</span>}<span className={`status-pill ${req.status === 'Pendiente' ? 'warning' : req.status === 'En proceso' ? 'info' : 'success'}`}>{req.status}</span>{req.status === 'Pendiente' && <button className="button small primary" onClick={() => onAttendRequest(req.id)}>Atender solicitud</button>}{req.status === 'En proceso' && <button className="button small primary" onClick={() => onCompleteRequest(req.id)}>Completar solicitud</button>}{req.status === 'Completada' && <span className="hk-done-label">Atendida</span>}</div>)}</div></div>;
  }

  if (nav === 'Habitaciones') {
    return <><div className="panel"><div className="panel-heading"><div><h3>Habitaciones pendientes</h3><p>Gestiona el estado de limpieza de cada habitación</p></div></div><div className="toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar habitación, piso, tipo..." /></div><div className="filter-dropdown"><button className="filter-button"><span>{hkFilter}</span><ChevronDown size={15} /></button><div className="filter-menu"><button className={hkFilter === 'Todos' ? 'active' : ''} onClick={() => setHkFilter('Todos')}>Todos</button><button className={hkFilter === 'Pendiente' ? 'active' : ''} onClick={() => setHkFilter('Pendiente')}>Pendientes</button><button className={hkFilter === 'En proceso' ? 'active' : ''} onClick={() => setHkFilter('En proceso')}>En proceso</button><button className={hkFilter === 'Completada' ? 'active' : ''} onClick={() => setHkFilter('Completada')}>Completadas</button></div></div></div><div className="hk-room-grid">{filteredRooms.length === 0 && <div className="hk-empty"><Search size={22} /><p>No se encontraron habitaciones</p></div>}{filteredRooms.map((room) => <div className={`hk-room-card priority-${room.priority.toLowerCase()}`} key={room.id}><div className="hk-room-head"><div><strong>Habitación {room.number}</strong><span>{room.floor} · {room.type}</span></div><span className={`status-pill ${room.status === 'Pendiente' ? 'warning' : room.status === 'En proceso' ? 'info' : 'success'}`}>{room.status}</span></div><div className="hk-room-meta"><div><small>Tipo de limpieza</small><span>{room.cleaningType}</span></div><div><small>Prioridad</small><span>{room.priority}</span></div>{room.startTime && <div><small>Inicio</small><span>{room.startTime}</span></div>}{room.endTime && <div><small>Fin</small><span>{room.endTime}</span></div>}{room.duration && <div><small>Duración</small><span>{room.duration}</span></div>}</div><div className="hk-room-actions">{room.status === 'Pendiente' && <button className="button small primary" onClick={() => onStartCleaning(room.id)}>Iniciar limpieza</button>}{room.status === 'En proceso' && <button className="button small primary" onClick={() => onFinishCleaning(room.id)}>Finalizar limpieza</button>}{room.status === 'Completada' && <span className="hk-done-label">Limpieza completada</span>}<button className="button small secondary" onClick={() => onOpenDetail(room)}>Ver detalle</button></div></div>)}</div></div>
    {detailRoom && <RoomDetailModal room={detailRoom} onClose={onCloseDetail} onStartCleaning={onStartCleaning} onFinishCleaning={onFinishCleaning} onToggleChecklist={onToggleChecklist} onOpenDefectModal={onOpenDefectModal} onOpenStatusModal={(r) => { onCloseDetail(); onOpenStatusModal(r); }} onAction={onAction} />}
    {showStatusModal && <StatusModal room={showStatusModal} onClose={onCloseStatusModal} onChangeStatus={onChangeStatus} />}
    {showDefectModal && <DefectModal onClose={onCloseDefectModal} onSubmit={onSubmitDefect} rooms={rooms} />}
    </>;
  }

  return <><div className="hk-dashboard-grid"><div className="panel main-panel"><div className="panel-heading"><div><h3>Actividad de hoy</h3><p>Tareas de limpieza que necesitan tu atención</p></div><button className="text-button" onClick={() => onAction('Vista completa abierta')}>Ver todo <ArrowRight size={15} /></button></div><div className="toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar habitación o tarea..." /></div></div><div className="task-list">{rooms.filter((r) => r.status !== 'Completada').length === 0 && requests.filter((r) => r.status !== 'Completada').length === 0 && <div className="hk-empty"><Sparkles size={22} /><p>Toda la jornada está al día</p></div>}{rooms.filter((r) => r.status !== 'Completada').map((room) => <div className="task-row" key={room.id}><div className="task-status-dot" /><div className="task-info"><strong>{room.cleaningType}</strong><span>Habitación {room.number} · {room.floor} · {room.type}</span></div><span className="task-time">{room.startTime ?? '—'}</span><span className={`status-pill ${room.status === 'Pendiente' ? 'warning' : 'info'}`}>{room.status}</span>{room.status === 'Pendiente' && <button className="button small primary" onClick={() => onStartCleaning(room.id)}>Iniciar limpieza</button>}{room.status === 'En proceso' && <button className="button small primary" onClick={() => onFinishCleaning(room.id)}>Finalizar</button>}</div>)}{requests.filter((r) => r.status !== 'Completada').map((req) => <div className="task-row" key={req.id}><div className="task-status-dot" /><div className="task-info"><strong>{req.request}</strong><span>Habitación {req.room}</span></div><span className="task-time">{req.time}</span><span className={`status-pill ${req.status === 'Pendiente' ? 'warning' : 'info'}`}>{req.status}</span>{req.status === 'Pendiente' && <button className="button small primary" onClick={() => onAttendRequest(req.id)}>Atender</button>}{req.status === 'En proceso' && <button className="button small primary" onClick={() => onCompleteRequest(req.id)}>Completar</button>}</div>)}</div></div><div className="panel side-panel"><div className="panel-heading"><div><h3>Resumen de limpieza</h3><p>Estado actual de tu jornada</p></div></div><div className="hk-summary-block"><div className="hk-summary-item"><span className="hk-summary-dot warning" /><div><strong>{pending}</strong><small>Habitaciones pendientes</small></div></div><div className="hk-summary-item"><span className="hk-summary-dot info" /><div><strong>{inProgress}</strong><small>En proceso</small></div></div><div className="hk-summary-item"><span className="hk-summary-dot success" /><div><strong>{completed}</strong><small>Completadas</small></div></div></div><div className="hk-summary-divider" /><div className="hk-summary-block"><div className="hk-summary-item"><span className="hk-summary-dot warning" /><div><strong>{reqPending}</strong><small>Solicitudes pendientes</small></div></div><div className="hk-summary-item"><span className="hk-summary-dot info" /><div><strong>{reqInProgress}</strong><small>Solicitudes en proceso</small></div></div><div className="hk-summary-item"><span className="hk-summary-dot success" /><div><strong>{reqCompleted}</strong><small>Solicitudes completadas</small></div></div></div><div className="hk-summary-divider" /><div className="hk-summary-block"><div className="hk-summary-item"><span className="hk-summary-dot terracotta" /><div><strong>{defects.length}</strong><small>Desperfectos reportados</small></div></div></div></div></div>
  {detailRoom && <RoomDetailModal room={detailRoom} onClose={onCloseDetail} onStartCleaning={onStartCleaning} onFinishCleaning={onFinishCleaning} onToggleChecklist={onToggleChecklist} onOpenDefectModal={onOpenDefectModal} onOpenStatusModal={(r) => { onCloseDetail(); onOpenStatusModal(r); }} onAction={onAction} />}
  {showStatusModal && <StatusModal room={showStatusModal} onClose={onCloseStatusModal} onChangeStatus={onChangeStatus} />}
  {showDefectModal && <DefectModal onClose={onCloseDefectModal} onSubmit={onSubmitDefect} rooms={rooms} />}
  </>;
}

function RoomDetailModal({ room, onClose, onStartCleaning, onFinishCleaning, onToggleChecklist, onOpenDefectModal, onOpenStatusModal, onAction }: {
  room: CleaningRoom;
  onClose: () => void;
  onStartCleaning: (id: number) => void;
  onFinishCleaning: (id: number) => void;
  onToggleChecklist: (roomId: number, index: number) => void;
  onOpenDefectModal: () => void;
  onOpenStatusModal: (room: CleaningRoom) => void;
  onAction: (message: string) => void;
}) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" style={{ width: 'var(--size-legacy-460)' }} onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">DETALLE DE HABITACIÓN</p><h2>Habitación {room.number}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div><div className="hk-detail-meta"><div><small>Piso</small><span>{room.floor}</span></div><div><small>Tipo</small><span>{room.type}</span></div><div><small>Limpieza</small><span>{room.cleaningType}</span></div><div><small>Prioridad</small><span>{room.priority}</span></div><div><small>Estado</small><span className={`status-pill ${room.status === 'Pendiente' ? 'warning' : room.status === 'En proceso' ? 'info' : 'success'}`}>{room.status}</span></div>{room.startTime && <div><small>Inicio</small><span>{room.startTime}</span></div>}</div><div className="hk-detail-section"><h4>Checklist de limpieza</h4><div className="hk-checklist-progress"><div className="hk-checklist-bar"><i style={{ width: `${room.checklist.filter((c) => c.done).length / room.checklist.length * 100}%` }} /></div><span className="hk-checklist-count">{room.checklist.filter((c) => c.done).length}/{room.checklist.length}</span></div><div className="hk-checklist">{room.checklist.map((item, i) => <button className={`hk-check-item ${item.done ? 'done' : ''}`} key={i} onClick={() => onToggleChecklist(room.id, i)}><span className="hk-check-box">{item.done && '✓'}</span>{item.label}</button>)}</div></div><div className="hk-detail-actions">{room.status === 'Pendiente' && <button className="button primary" onClick={() => { onStartCleaning(room.id); onClose(); }}>Iniciar limpieza</button>}{room.status === 'En proceso' && <button className="button primary" onClick={() => { onFinishCleaning(room.id); onClose(); }}>Finalizar limpieza</button>}{room.status === 'Completada' && <span className="hk-done-label">Limpieza completada</span>}<button className="button secondary" onClick={() => { onClose(); onOpenStatusModal(room); }}>Cambiar estado</button><button className="button secondary" onClick={() => { onClose(); onOpenDefectModal(); }}>Reportar desperfecto</button></div></div></div>;
}

function StatusModal({ room, onClose, onChangeStatus }: { room: CleaningRoom; onClose: () => void; onChangeStatus: (id: number, status: RoomStatus) => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" style={{ width: 'var(--size-legacy-360)' }} onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">CAMBIAR ESTADO</p><h2>Habitación {room.number}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div><p className="login-helper">Selecciona el nuevo estado de la habitación.</p><div className="hk-status-options"><button className="hk-status-option" onClick={() => onChangeStatus(room.id, 'Pendiente')}><span className="hk-summary-dot warning" /> Pendiente</button><button className="hk-status-option" onClick={() => onChangeStatus(room.id, 'En proceso')}><span className="hk-summary-dot info" /> En proceso</button><button className="hk-status-option" onClick={() => onChangeStatus(room.id, 'Completada')}><span className="hk-summary-dot success" /> Completada</button></div></div></div>;
}

function DefectModal({ onClose, onSubmit, rooms }: { onClose: () => void; onSubmit: (report: Omit<DefectReport, 'id'>) => void; rooms: CleaningRoom[] }) {
  const [room, setRoom] = useState(rooms[0]?.number ?? '');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [observation, setObservation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleSubmit = () => { const e: Record<string, string> = {}; if (!room) e.room = 'Selecciona una habitación'; if (!category) e.category = 'Selecciona una categoría'; if (!description.trim()) e.description = 'La descripción es obligatoria'; if (!priority) e.priority = 'Selecciona una prioridad'; if (Object.keys(e).length > 0) { setErrors(e); return; } onSubmit({ room, category, description: description.trim(), priority, observation, photo: '' }); };
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" style={{ width: 'var(--size-legacy-440)' }} onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">REPORTAR DESPERFECTO</p><h2>Reportar problema</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div><label className="hk-form-label">Habitación<select className="hk-form-select" value={room} onChange={(e) => setRoom(e.target.value)}>{rooms.map((r) => <option key={r.id} value={r.number}>{r.number} · {r.floor}</option>)}</select></label><label className="hk-form-label">Categoría<select className={`hk-form-select ${errors.category ? 'error' : ''}`} value={category} onChange={(e) => { setCategory(e.target.value); setErrors((p) => ({ ...p, category: '' })); }}><option value="">Selecciona...</option><option>Plomería</option><option>Eléctrico</option><option>Mobiliario</option><option>Climatización</option><option>Otro</option></select>{errors.category && <span className="hk-form-error">{errors.category}</span>}</label><label className="hk-form-label">Descripción<textarea className={`hk-form-textarea ${errors.description ? 'error' : ''}`} value={description} onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: '' })); }} placeholder="Describe el problema encontrado..." />{errors.description && <span className="hk-form-error">{errors.description}</span>}</label><label className="hk-form-label">Prioridad<select className={`hk-form-select ${errors.priority ? 'error' : ''}`} value={priority} onChange={(e) => { setPriority(e.target.value); setErrors((p) => ({ ...p, priority: '' })); }}><option value="">Selecciona...</option><option>Baja</option><option>Media</option><option>Alta</option><option>Urgente</option></select>{errors.priority && <span className="hk-form-error">{errors.priority}</span>}</label><label className="hk-form-label">Observación<textarea className="hk-form-textarea" value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Notas adicionales (opcional)..." /></label><label className="hk-form-label">Fotografía (opcional)<div className="hk-photo-upload"><Plus size={20} /><span>Adjuntar foto</span></div></label><div className="modal-foot"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" onClick={handleSubmit}>Enviar reporte <ArrowRight size={16} /></button></div></div></div>;
}

type ReservationStep = 'guest' | 'payment' | 'confirmation';
type RoomDetail = { name: string; detail: string; price: number; tag: string; image: string; features: string[]; maxGuests: number; gallery: string[]; description: string; size: string; bed: string };

function VisitorScreen({ onOpenAuth, onRegister, onAction }: { onOpenAuth: () => void; onRegister: () => void; onAction: (message: string) => void }) {
  const [checkIn, setCheckIn] = useState('2024-08-25');
  const [checkOut, setCheckOut] = useState('2024-08-28');
  const [guests, setGuests] = useState('2 adultos · 1 habitación');
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [tab, setTab] = useState<'rooms' | 'amenities' | 'promos' | 'policies'>('rooms');
  const [copiedCode, setCopiedCode] = useState('');
  const [detailRoom, setDetailRoom] = useState<RoomDetail | null>(null);
  const [detailGalleryIdx, setDetailGalleryIdx] = useState(0);
  const [reservingRoom, setReservingRoom] = useState<RoomDetail | null>(null);
  const [resStep, setResStep] = useState<ReservationStep>('guest');
  const [resData, setResData] = useState({ name: '', email: '', phone: '', card: '', cardName: '', cardExp: '', cardCvc: '', paymentMethod: 'card' });
  const [resErrors, setResErrors] = useState<Record<string, string>>({});

  const rooms: RoomDetail[] = [
    { name: 'Habitación Estándar', detail: '1 cama king · 2 huéspedes · 28 m²', price: 1850, tag: 'Mejor precio', image: 'https://images.pexels.com/photos/6434592/pexels-photo-6434592.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', features: ['Cama king', 'Wi-Fi gratis', 'Desayuno incluido', 'TV 43"', 'Aire acondicionado', '28 m²'], maxGuests: 2, size: '28 m²', bed: '1 cama king', description: 'Una habitación acogedora y funcional, ideal para viajeros que buscan comodidad sin renunciar a la elegancia. Cuenta con todas las comodidades modernas para una estancia placentera.', gallery: ['https://images.pexels.com/photos/6434592/pexels-photo-6434592.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/33072150/pexels-photo-33072150.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/16113326/pexels-photo-16113326.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'] },
    { name: 'Habitación Deluxe', detail: '1 cama king · 2 huéspedes · 36 m²', price: 2450, tag: 'Más reservada', image: 'https://images.pexels.com/photos/2736384/pexels-photo-2736384.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', features: ['Cama king', 'Balcón privado', 'Wi-Fi gratis', 'Desayuno incluido', 'TV 50"', 'Minibar', '36 m²'], maxGuests: 2, size: '36 m²', bed: '1 cama king', description: 'Amplia y luminosa, con balcón privado y vistas a la ciudad. Perfecta para quienes disfrutan de un espacio extra con detalles de diseño y confort superior.', gallery: ['https://images.pexels.com/photos/2736384/pexels-photo-2736384.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/36331296/pexels-photo-36331296.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/7166637/pexels-photo-7166637.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'] },
    { name: 'Suite Aurora', detail: '1 cama king · 4 huéspedes · 58 m²', price: 3900, tag: 'Experiencia premium', image: 'https://images.pexels.com/photos/8082217/pexels-photo-8082217.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', features: ['Cama king', 'Sala de estar', 'Jacuzzi', 'Wi-Fi gratis', 'Desayuno incluido', 'TV 55"', 'Minibar premium', '58 m²'], maxGuests: 4, size: '58 m²', bed: '1 cama king + sofá cama', description: 'Nuestra suite más exclusiva, con sala de estar independiente, jacuzzi privado y acabados de lujo. Diseñada para una experiencia de hospedaje inolvidable, ideal para familias o estancias especiales.', gallery: ['https://images.pexels.com/photos/8082217/pexels-photo-8082217.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/29000314/pexels-photo-29000314.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'https://images.pexels.com/photos/8146150/pexels-photo-8146150.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'] },
  ];

  const guestCount = parseInt(guests) || 2;
  const nights = (() => { const d1 = new Date(checkIn); const d2 = new Date(checkOut); return Math.round((d2.getTime() - d1.getTime()) / 86400000); })();
  const availableRooms = rooms.filter((r) => r.maxGuests >= guestCount);

  const handleSearch = () => {
    if (!checkIn || !checkOut) { setSearchError('Selecciona las fechas de entrada y salida'); return; }
    if (nights <= 0) { setSearchError('La fecha de salida debe ser posterior a la de entrada'); return; }
    setSearchError('');
    setSearched(true);
    setTab('rooms');
    onAction(`Disponibilidad consultada del ${checkIn} al ${checkOut}`);
  };

  const openDetail = (room: RoomDetail) => { setDetailRoom(room); setDetailGalleryIdx(0); };
  const closeDetail = () => setDetailRoom(null);

  const openReservation = (room: RoomDetail) => { setReservingRoom(room); setResStep('guest'); setResErrors({}); };
  const closeReservation = () => { setReservingRoom(null); setResStep('guest'); setResData({ name: '', email: '', phone: '', card: '', cardName: '', cardExp: '', cardCvc: '', paymentMethod: 'card' }); setResErrors({}); };

  const validateGuest = () => {
    const e: Record<string, string> = {};
    if (!resData.name.trim()) e.name = 'Ingresa tu nombre completo';
    if (!resData.email.trim()) e.email = 'Ingresa tu correo electrónico';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resData.email)) e.email = 'Ingresa un correo válido';
    if (!resData.phone.trim()) e.phone = 'Ingresa tu teléfono';
    setResErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePayment = () => {
    if (resData.paymentMethod === 'transfer') return true;
    const e: Record<string, string> = {};
    if (!resData.card.trim()) e.card = 'Ingresa el número de tarjeta';
    else if (resData.card.replace(/\s/g, '').length < 15) e.card = 'Número de tarjeta incompleto';
    if (!resData.cardName.trim()) e.cardName = 'Ingresa el nombre del titular';
    if (!resData.cardExp.trim()) e.cardExp = 'MM/AA';
    if (!resData.cardCvc.trim()) e.cardCvc = 'CVC';
    setResErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNextStep = () => {
    if (resStep === 'guest') { if (validateGuest()) setResStep('payment'); }
    else if (resStep === 'payment') { if (validatePayment()) { setResStep('confirmation'); onAction('Reserva confirmada'); } }
  };

  const reservationTotal = reservingRoom ? reservingRoom.price * Math.max(nights, 1) : 0;

  const amenities = [
    { icon: Sparkles, title: 'Desayuno buffet', desc: 'Sabores locales cada mañana', image: 'https://images.pexels.com/photos/33674440/pexels-photo-33674440.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    { icon: Waves, title: 'Piscina climatizada', desc: 'Relajación durante todo el año', image: 'https://images.pexels.com/photos/27274134/pexels-photo-27274134.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    { icon: Utensils, title: 'Restaurante gourmet', desc: 'Cocina de autor con ingredientes locales', image: 'https://images.pexels.com/photos/28999503/pexels-photo-28999503.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    { icon: Dumbbell, title: 'Wellness & gimnasio', desc: 'Equipamiento moderno y clases guiadas', image: 'https://images.pexels.com/photos/7222170/pexels-photo-7222170.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    { icon: Wifi, title: 'Wi-Fi de alta velocidad', desc: 'Conexión en todo el hotel', image: 'https://images.pexels.com/photos/7821349/pexels-photo-7821349.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    { icon: Headphones, title: 'Atención 24/7', desc: 'Siempre estamos para ti', image: 'https://images.pexels.com/photos/14036253/pexels-photo-14036253.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  ];

  const promos = [
    { title: 'Estancia extendida', desc: '15% de descuento en estancias de 4 noches o más', code: 'AURORA15', icon: Percent, tone: 'gold', image: 'https://images.pexels.com/photos/2725675/pexels-photo-2725675.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    { title: 'Escapada romántica', desc: 'Cena para dos + botella de vino + decoración floral', code: 'ROMANCE', icon: Gift, tone: 'terracotta', image: 'https://images.pexels.com/photos/24433378/pexels-photo-24433378.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    { title: 'Fin de semana', desc: '10% de descuento en reservas de viernes a domingo', code: 'WEEKEND10', icon: CalendarDays, tone: 'info', image: 'https://images.pexels.com/photos/3011575/pexels-photo-3011575.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
    { title: 'Reserva anticipada', desc: '12% de descuento reservando 30 días antes', code: 'EARLY12', icon: Star, tone: 'success', image: 'https://images.pexels.com/photos/8134808/pexels-photo-8134808.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  ];

  const policies = [
    { icon: CalendarDays, title: 'Check-in y check-out', desc: 'El check-in es a partir de las 15:00 y el check-out antes de las 12:00. Sujeto a disponibilidad.', tone: 'gold' },
    { icon: ShieldCheck, title: 'Cancelación flexible', desc: 'Cancelación gratuita hasta 48 horas antes de la fecha de llegada. Después de ese plazo se cobrará la primera noche.', tone: 'info' },
    { icon: Wallet, title: 'Depósito y pagos', desc: 'Se requiere depósito de garantía equivalente a una noche. Aceptamos efectivo, tarjeta y transferencia.', tone: 'success' },
    { icon: Users, title: 'Niños y acompañantes', desc: 'Menores de 12 años se hospedan gratis compartiendo cama con sus padres. Capacidad máxima según tipo de habitación.', tone: 'terracotta' },
    { icon: Activity, title: 'Mascotas', desc: 'Permitimos mascotas pequeñas previa solicitud. Sujeto a cargo adicional de limpieza de $250 por estancia.', tone: 'brown' },
    { icon: Headphones, title: 'Atención 24/7', desc: 'Nuestro equipo de recepción está disponible las 24 horas para cualquier necesidad durante tu estancia.', tone: 'cream' },
  ];

  const experienceImages = [
    'https://images.pexels.com/photos/9119625/pexels-photo-9119625.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/14036253/pexels-photo-14036253.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/7222168/pexels-photo-7222168.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/24433378/pexels-photo-24433378.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/3011575/pexels-photo-3011575.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'https://images.pexels.com/photos/6466301/pexels-photo-6466301.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ];

  const tabs = [
    { id: 'rooms' as const, label: 'Habitaciones', icon: BedDouble },
    { id: 'amenities' as const, label: 'Amenidades', icon: Sparkles },
    { id: 'promos' as const, label: 'Promociones', icon: Percent },
    { id: 'policies' as const, label: 'Políticas', icon: ShieldCheck },
  ];

  return (
    <div className="visitor-page">
      <header className="visitor-header">
        <div className="brand visitor-brand">
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span>AURORA <small>HOTEL & RESORT</small></span>
        </div>
        <nav className="visitor-tabs">
          {tabs.map((t) => { const TabIcon = t.icon; return (
            <button key={t.id} className={tab === t.id ? 'visitor-tab active' : 'visitor-tab'} onClick={() => setTab(t.id)}>
              <TabIcon size={15} /> <span className="visitor-tab-label">{t.label}</span>
            </button>
          ); })}
        </nav>
        <div className="visitor-auth">
          <button className="visitor-link" onClick={onOpenAuth}>Iniciar sesión</button>
          <button className="button primary small" onClick={onRegister}>Registrarse</button>
        </div>
      </header>
      <section className="visitor-hero">
        <div className="visitor-hero-bg" style={{ backgroundImage: 'url(https://images.pexels.com/photos/9119622/pexels-photo-9119622.jpeg?auto=compress&cs=tinysrgb&h=650&w=940)' }} />
        <div className="visitor-hero-overlay" />
        <div className="visitor-hero-copy">
          <p className="eyebrow">HOSPITALIDAD QUE SE SIENTE</p>
          <h1>Tu próxima estancia<br /><em>comienza aquí.</em></h1>
          <p>Descansa, descubre y déjanos cuidar cada detalle. Encuentra el espacio perfecto para tu próxima visita a Hotel Aurora.</p>
          <div className="hero-stats">
            <span><strong>4.9</strong><small>Valoración de huéspedes</small></span>
            <span><strong>24/7</strong><small>Atención personalizada</small></span>
            <span><strong>+12</strong><small>Amenidades incluidas</small></span>
          </div>
        </div>
        <div className="hero-orbit">
          <div className="orbit-card">
            <span className="status-pill success">Hotel Aurora · Centro</span>
            <h3>Un refugio<br /><em>en la ciudad.</em></h3>
            <p>Momentos que se quedan contigo.</p>
            <div className="orbit-line"><span /><span /><span /></div>
          </div>
        </div>
      </section>
      <section className="search-panel">
        <div className="search-title">
          <CalendarDays size={20} />
          <div><strong>Encuentra tu habitación</strong><span>Consulta disponibilidad y tarifas en segundos</span></div>
        </div>
        <div className="search-fields">
          <label><span>Entrada</span><input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} /></label>
          <label><span>Salida</span><input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></label>
          <label><span>Huéspedes</span>
            <select value={guests} onChange={(event) => setGuests(event.target.value)}>
              <option>2 adultos · 1 habitación</option>
              <option>1 adulto · 1 habitación</option>
              <option>2 adultos · 2 habitaciones</option>
              <option>2 adultos · 2 niños · 1 habitación</option>
              <option>4 adultos · 1 habitación</option>
            </select>
          </label>
        </div>
        <button className="button primary search-button" onClick={handleSearch}>
          Buscar disponibilidad <ArrowRight size={16} />
        </button>
      </section>
      {searchError && <div className="search-error"><TriangleAlert size={15} /> {searchError}</div>}
      <main className="visitor-content">
        {tab === 'rooms' && (
          <section className="visitor-section visitor-tab-content">
            <div className="visitor-section-head">
              <div><p className="eyebrow">ELIGE TU ESPACIO</p><h2>Habitaciones pensadas<br />para ti</h2></div>
              {searched && <div className="availability-note"><span className="room-dot available" />Disponibilidad actualizada</div>}
            </div>
            {searched && nights > 0 && (
              <div className="search-results-bar">
                <div className="search-results-info">
                  <CalendarDays size={16} />
                  <span><strong>{checkIn}</strong> → <strong>{checkOut}</strong></span>
                  <span className="search-results-nights">{nights} {nights === 1 ? 'noche' : 'noches'}</span>
                  <span className="search-results-guests"><Users size={14} /> {guests}</span>
                </div>
                <span className="search-results-count">{availableRooms.length} {availableRooms.length === 1 ? 'habitación disponible' : 'habitaciones disponibles'}</span>
              </div>
            )}
            <div className="room-cards">
              {(searched ? availableRooms : rooms).map((room) => (
                <article className="visitor-room" key={room.name}>
                  <div className="room-visual" style={{ backgroundImage: `url(${room.image})` }}>
                    <span className="room-tag">{room.tag}</span>
                  </div>
                  <div className="room-card-body">
                    <div><h3>{room.name}</h3><p>{room.detail}</p></div>
                    <div className="room-price"><small>Desde</small><strong>${room.price.toLocaleString()}</strong><span>por noche</span></div>
                  </div>
                  {searched && nights > 0 && (
                    <div className="room-total-stay">
                      <small>Total estancia · {nights} {nights === 1 ? 'noche' : 'noches'}</small>
                      <strong>${(room.price * nights).toLocaleString()}</strong>
                    </div>
                  )}
                  <div className="room-features-list">
                    {room.features.slice(0, 4).map((f) => <span key={f}><Check size={13} /> {f}</span>)}
                  </div>
                  <div className="room-card-footer">
                    <button className="text-button" onClick={() => openDetail(room)}>Ver detalles <ArrowRight size={14} /></button>
                    <button className="button primary small" onClick={() => openReservation(room)}>Reservar</button>
                  </div>
                </article>
              ))}
              {searched && availableRooms.length === 0 && (
                <div className="search-empty">
                  <TriangleAlert size={28} />
                  <p>No encontramos habitaciones para {guestCount} {guestCount === 1 ? 'huésped' : 'huéspedes'} en las fechas seleccionadas.</p>
                  <span>Prueba con otras fechas o reduce el número de huéspedes.</span>
                </div>
              )}
            </div>
          </section>
        )}
        {tab === 'amenities' && (
          <section className="visitor-section visitor-tab-content">
            <div className="visitor-section-head">
              <div><p className="eyebrow">TODO INCLUIDO EN TU ESTANCIA</p><h2>Pequeños detalles.<br /><em>Grandes momentos.</em></h2></div>
            </div>
            <p className="visitor-section-desc">Desde el primer café de la mañana hasta la última luz de la tarde, todo está pensado para que tú solo tengas que disfrutar.</p>
            <div className="amenity-grid">
              {amenities.map((a) => { const AmenityIcon = a.icon; return (
                <article className={a.image ? 'amenity-card with-image' : 'amenity-card'} key={a.title}>
                  {a.image ? <div className="amenity-image" style={{ backgroundImage: `url(${a.image})` }} /> : null}
                  <div className="amenity-body">
                    <span className="amenity-icon-wrap"><AmenityIcon size={20} /></span>
                    <strong>{a.title}</strong>
                    <p>{a.desc}</p>
                  </div>
                </article>
              ); })}
            </div>
          </section>
        )}
        {tab === 'promos' && (
          <section className="visitor-section visitor-tab-content">
            <div className="visitor-section-head">
              <div><p className="eyebrow">OFERTAS Y DESCUENTOS</p><h2>Promociones<br /><em>que te convienen.</em></h2></div>
            </div>
            <p className="visitor-section-desc">Aprovecha nuestras mejores ofertas y haz tu estancia aún más memorable.</p>
            <div className="promo-grid">
              {promos.map((p) => { const PromoIcon = p.icon; return (
                <article className="promo-card" key={p.code}>
                  <div className="promo-image" style={{ backgroundImage: `url(${p.image})` }}>
                    <span className={`promo-icon ${p.tone}`}><PromoIcon size={24} /></span>
                  </div>
                  <div className="promo-body"><strong>{p.title}</strong><p>{p.desc}</p></div>
                  <div className="promo-code-row">
                    <code>{p.code}</code>
                    <button className={copiedCode === p.code ? 'promo-copy copied' : 'promo-copy'} onClick={() => { setCopiedCode(p.code); onAction(`Código ${p.code} copiado`); }}>
                      {copiedCode === p.code ? <><Check size={14} /> Copiado</> : 'Copiar'}
                    </button>
                  </div>
                </article>
              ); })}
            </div>
          </section>
        )}
        {tab === 'policies' && (
          <section className="visitor-section visitor-tab-content">
            <div className="visitor-section-head">
              <div><p className="eyebrow">CONDICIONES DE RESERVA</p><h2>Políticas de cancelación<br />y reserva</h2></div>
            </div>
            <p className="visitor-section-desc">Conoce nuestras condiciones antes de reservar para una estancia sin sorpresas.</p>
            <div className="politicas-grid">
              {policies.map((p) => { const PolicyIcon = p.icon; return (
                <div className="politica-card" key={p.title}>
                  <span className={`politica-icon ${p.tone}`}><PolicyIcon size={22} /></span>
                  <strong>{p.title}</strong>
                  <p>{p.desc}</p>
                </div>
              ); })}
            </div>
          </section>
        )}
      </main>
      <section className="visitor-experience">
        <div className="visitor-section-head center">
          <div><p className="eyebrow">VIVE AURORA</p><h2>Una experiencia<br /><em>en cada rincón.</em></h2></div>
        </div>
        <p className="visitor-section-desc center">Desde nuestras instalaciones hasta cada detalle de servicio, todo está diseñado para que tu estancia sea inolvidable.</p>
        <div className="experience-grid">
          {experienceImages.map((img, i) => (
            <div className="experience-tile" key={i} style={{ backgroundImage: `url(${img})` }}>
              <div className="experience-overlay" />
            </div>
          ))}
        </div>
      </section>
      <footer className="visitor-footer">
        <span>© 2024 Aurora Hotel Group</span>
        <span>Privacidad · Términos · Contacto</span>
      </footer>

      {detailRoom && (
        <div className="modal-backdrop" onMouseDown={closeDetail}>
          <div className="modal room-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="room-detail-gallery">
              <div className="room-detail-main-img" style={{ backgroundImage: `url(${detailRoom.gallery[detailGalleryIdx]})` }}>
                <button className="icon-btn room-detail-close" onClick={closeDetail}><X size={18} /></button>
                <span className="room-tag">{detailRoom.tag}</span>
              </div>
              <div className="room-detail-thumbs">
                {detailRoom.gallery.map((g, i) => (
                  <button key={i} className={i === detailGalleryIdx ? 'room-detail-thumb active' : 'room-detail-thumb'} style={{ backgroundImage: `url(${g})` }} onClick={() => setDetailGalleryIdx(i)} />
                ))}
              </div>
            </div>
            <div className="room-detail-info">
              <div className="room-detail-head">
                <div>
                  <p className="eyebrow">DETALLES DE LA HABITACIÓN</p>
                  <h2>{detailRoom.name}</h2>
                  <p className="room-detail-sub">{detailRoom.detail}</p>
                </div>
                <div className="room-detail-price-box">
                  <small>Desde</small>
                  <strong>${detailRoom.price.toLocaleString()}</strong>
                  <span>por noche</span>
                </div>
              </div>
              <div className="room-detail-meta-row">
                <span><Users size={15} /> {detailRoom.maxGuests} huéspedes</span>
                <span><BedDouble size={15} /> {detailRoom.bed}</span>
                <span><Home size={15} /> {detailRoom.size}</span>
              </div>
              <p className="room-detail-desc">{detailRoom.description}</p>
              <div className="room-detail-features">
                <h4>Características</h4>
                <div className="room-detail-features-grid">
                  {detailRoom.features.map((f) => <span key={f}><Check size={14} /> {f}</span>)}
                </div>
              </div>
              {searched && nights > 0 && (
                <div className="room-detail-total">
                  <div><span>Total · {nights} {nights === 1 ? 'noche' : 'noches'}</span><strong>${(detailRoom.price * nights).toLocaleString()}</strong></div>
                  <p>Check-in: {checkIn} · Check-out: {checkOut} · {guests}</p>
                </div>
              )}
              <div className="room-detail-actions">
                <button className="button secondary" onClick={closeDetail}>Cerrar</button>
                <button className="button primary" onClick={() => { closeDetail(); openReservation(detailRoom); }}>Reservar esta habitación <ArrowRight size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reservingRoom && (
        <div className="modal-backdrop" onMouseDown={closeReservation}>
          <div className="modal reservation-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">RESERVA · {reservingRoom.name.toUpperCase()}</p>
                <h2>{resStep === 'guest' ? 'Tus datos' : resStep === 'payment' ? 'Pago de reserva' : 'Reserva confirmada'}</h2>
              </div>
              <button className="icon-btn" onClick={closeReservation}><X size={18} /></button>
            </div>
            <div className="reservation-steps">
              <span className={resStep === 'guest' ? 'res-step active' : 'res-step done'}><span className="res-step-num">{resStep === 'guest' ? '1' : <Check size={12} />}</span> Datos</span>
              <span className={resStep === 'payment' ? 'res-step active' : (resStep === 'confirmation' ? 'res-step done' : 'res-step')}><span className="res-step-num">{resStep === 'payment' ? '2' : resStep === 'confirmation' ? <Check size={12} /> : '2'}</span> Pago</span>
              <span className={resStep === 'confirmation' ? 'res-step active' : 'res-step'}><span className="res-step-num">3</span> Confirmación</span>
            </div>
            <div className="reservation-summary">
              <div className="res-summary-room">
                <div className="res-summary-img" style={{ backgroundImage: `url(${reservingRoom.image})` }} />
                <div>
                  <strong>{reservingRoom.name}</strong>
                  <span>{reservingRoom.detail}</span>
                </div>
              </div>
              <div className="res-summary-details">
                <span><CalendarDays size={13} /> {checkIn} → {checkOut}</span>
                <span><Clock size={13} /> {Math.max(nights, 1)} {nights === 1 ? 'noche' : 'noches'}</span>
                <span><Users size={13} /> {guests}</span>
                <strong>${reservationTotal.toLocaleString()}</strong>
              </div>
            </div>

            {resStep === 'guest' && (
              <div className="reservation-form">
                <div className="res-field-group">
                  <label className="res-field">
                    <span>Nombre completo *</span>
                    <input value={resData.name} onChange={(e) => setResData({ ...resData, name: e.target.value })} placeholder="Tu nombre completo" />
                    {resErrors.name && <em className="res-error">{resErrors.name}</em>}
                  </label>
                  <label className="res-field">
                    <span>Correo electrónico *</span>
                    <input value={resData.email} onChange={(e) => setResData({ ...resData, email: e.target.value })} placeholder="tu@correo.com" />
                    {resErrors.email && <em className="res-error">{resErrors.email}</em>}
                  </label>
                  <label className="res-field">
                    <span>Teléfono *</span>
                    <input value={resData.phone} onChange={(e) => setResData({ ...resData, phone: e.target.value })} placeholder="+52 555 123 4567" />
                    {resErrors.phone && <em className="res-error">{resErrors.phone}</em>}
                  </label>
                </div>
                <p className="res-form-note"><ShieldCheck size={14} /> Tus datos están protegidos y no se comparten con terceros.</p>
              </div>
            )}

            {resStep === 'payment' && (
              <div className="reservation-form">
                <div className="res-payment-methods">
                  <button className={resData.paymentMethod === 'card' ? 'res-pay-method active' : 'res-pay-method'} onClick={() => setResData({ ...resData, paymentMethod: 'card' })}>
                    <Wallet size={18} /> Tarjeta
                  </button>
                  <button className={resData.paymentMethod === 'transfer' ? 'res-pay-method active' : 'res-pay-method'} onClick={() => setResData({ ...resData, paymentMethod: 'transfer' })}>
                    <ArrowRight size={18} /> Transferencia
                  </button>
                </div>
                {resData.paymentMethod === 'card' ? (
                  <div className="res-field-group">
                    <label className="res-field">
                      <span>Número de tarjeta *</span>
                      <input value={resData.card} onChange={(e) => setResData({ ...resData, card: e.target.value })} placeholder="4242 4242 4242 4242" maxLength={19} />
                      {resErrors.card && <em className="res-error">{resErrors.card}</em>}
                    </label>
                    <label className="res-field">
                      <span>Nombre del titular *</span>
                      <input value={resData.cardName} onChange={(e) => setResData({ ...resData, cardName: e.target.value })} placeholder="Como aparece en la tarjeta" />
                      {resErrors.cardName && <em className="res-error">{resErrors.cardName}</em>}
                    </label>
                    <div className="res-field-row">
                      <label className="res-field">
                        <span>Vencimiento *</span>
                        <input value={resData.cardExp} onChange={(e) => setResData({ ...resData, cardExp: e.target.value })} placeholder="MM/AA" maxLength={5} />
                        {resErrors.cardExp && <em className="res-error">{resErrors.cardExp}</em>}
                      </label>
                      <label className="res-field">
                        <span>CVC *</span>
                        <input value={resData.cardCvc} onChange={(e) => setResData({ ...resData, cardCvc: e.target.value })} placeholder="123" maxLength={4} />
                        {resErrors.cardCvc && <em className="res-error">{resErrors.cardCvc}</em>}
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="res-transfer-info">
                    <p>Realiza tu transferencia a la siguiente cuenta y envía el comprobante a reservas@aurorahotel.com:</p>
                    <div className="res-transfer-bank">
                      <span>Banco</span>
                      <strong>Banco Aurora · Cuenta 0123 4567 8901 2345</strong>
                      <span>CLABE</span>
                      <strong>012 345 678 901 234 567</strong>
                      <span>Concepto</span>
                      <strong>Reserva {reservingRoom.name}</strong>
                    </div>
                    <p className="res-transfer-note">Tu reserva se confirmará al recibir el comprobante del pago.</p>
                  </div>
                )}
                <div className="res-payment-total">
                  <span>Total a pagar</span>
                  <strong>${reservationTotal.toLocaleString()}</strong>
                </div>
              </div>
            )}

            {resStep === 'confirmation' && (
              <div className="reservation-confirmation">
                <div className="res-confirm-icon"><Check size={40} /></div>
                <h3>¡Tu reserva está confirmada!</h3>
                <p>Enviamos un correo de confirmación a <strong>{resData.email || 'tu correo'}</strong> con todos los detalles de tu reserva.</p>
                <div className="res-confirm-details">
                  <div className="res-confirm-row"><span>Habitación</span><strong>{reservingRoom.name}</strong></div>
                  <div className="res-confirm-row"><span>Check-in</span><strong>{checkIn}</strong></div>
                  <div className="res-confirm-row"><span>Check-out</span><strong>{checkOut}</strong></div>
                  <div className="res-confirm-row"><span>Huéspedes</span><strong>{guests}</strong></div>
                  <div className="res-confirm-row"><span>Total pagado</span><strong>${reservationTotal.toLocaleString()}</strong></div>
                  <div className="res-confirm-row"><span>Confirmación</span><strong>AUR-{Math.floor(Math.random() * 90000 + 10000)}</strong></div>
                </div>
                <div className="res-confirm-note">
                  <Headphones size={16} />
                  <p>¿Necesitas cambios? Llámanos al 555-123-4567 o escribe a reservas@aurorahotel.com</p>
                </div>
              </div>
            )}

            <div className="modal-foot">
              {resStep === 'guest' && <button className="button secondary" onClick={closeReservation}>Cancelar</button>}
              {resStep === 'payment' && <button className="button secondary" onClick={() => setResStep('guest')}>Volver</button>}
              {resStep === 'confirmation' ? (
                <button className="button primary" onClick={closeReservation}>Listo <Check size={16} /></button>
              ) : (
                <button className="button primary" onClick={handleNextStep}>
                  {resStep === 'guest' ? 'Continuar al pago' : 'Confirmar reserva'} <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthModal({ mode, onClose, onLogin, onRegister }: { mode: 'choice' | 'guest' | 'employee'; onClose: () => void; onLogin: (role: RoleId) => void; onRegister: () => void }) {
  const [view, setView] = useState(mode);
  const [selectedRole, setSelectedRole] = useState<RoleId>('reception');
  const [submitted, setSubmitted] = useState(false);
  const employeeRoles = roles.filter((role) => role.id !== 'guest');
  const selected = roles.find((role) => role.id === selectedRole) ?? roles[0];
  const SelectedIcon = selected.icon;
  if (view === 'choice') return <div className="modal-backdrop" onMouseDown={onClose}><div className="auth-choice" onMouseDown={(event) => event.stopPropagation()}><button className="icon-btn auth-close" onClick={onClose}><X size={18} /></button><div className="auth-choice-head"><span className="brand-mark"><Sparkles size={19} /></span><p className="eyebrow">ACCESO AURORA</p><h2>¿Cómo quieres continuar?</h2><p>Elige la experiencia que corresponde a tu visita.</p></div><div className="auth-choice-grid"><button onClick={() => setView('guest')}><span className="choice-icon cream"><UserRound size={23} /></span><strong>Soy huésped</strong><small>Regístrate para reservar y administrar tu estancia.</small><span className="choice-arrow"><ArrowRight size={16} /></span></button><button onClick={() => setView('employee')}><span className="choice-icon brown"><ShieldCheck size={23} /></span><strong>Soy empleado o administrador</strong><small>Accede al PMS con tus credenciales de trabajo.</small><span className="choice-arrow"><ArrowRight size={16} /></span></button></div><p className="login-security"><ShieldCheck size={14} /> Tus datos están protegidos por Hotel Aurora</p></div></div>;
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="auth-form" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">{view === 'guest' ? 'NUEVO HUÉSPED' : 'ACCESO DE PERSONAL'}</p><h2>{view === 'guest' ? 'Crea tu cuenta' : 'Iniciar sesión'}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div><p className="login-helper">{view === 'guest' ? 'Regístrate para consultar tus reservas, recibir confirmaciones y disfrutar tu estancia.' : 'Este acceso es exclusivo para empleados y administradores registrados.'}</p>{view === 'employee' && <><label>Rol de trabajo</label><div className="employee-role-select"><span className={`role-list-icon ${selected.color}`}><SelectedIcon size={16} /></span><select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as RoleId)}>{employeeRoles.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.person}</option>)}</select><ChevronDown size={14} /></div></>}<div className="auth-fields"><label>Usuario o correo electrónico<input placeholder={view === 'guest' ? 'tu@correo.com' : 'usuario@aurorahotel.com'} /></label>{view === 'guest' && <label>Nombre completo<input placeholder="Tu nombre" /></label>}<label>Contraseña<input type="password" placeholder="••••••••" /></label>{view === 'guest' && <label>Confirmar contraseña<input type="password" placeholder="••••••••" /></label>}</div>{view === 'employee' && <button className="forgot-link" onClick={() => setSubmitted(true)}>¿Olvidaste tu contraseña?</button>}<button className="button primary login-button" onClick={() => { if (view === 'guest') onRegister(); else onLogin(selectedRole); }}>{view === 'guest' ? 'Crear cuenta de huésped' : `Ingresar como ${selected.name}`} <ArrowRight size={16} /></button>{submitted && <div className="form-note">Te mostraremos el proceso para recuperar tu acceso.</div>}<p className="auth-switch">{view === 'guest' ? <>¿Ya tienes cuenta? <button onClick={() => setView('employee')}>Iniciar sesión</button></> : <>¿Quieres reservar como huésped? <button onClick={() => setView('guest')}>Registrarte aquí</button></>}</p></div></div>;
}

function TaskTable({ tasks, search, setSearch, onComplete, onAction, role }: { tasks: Task[]; search: string; setSearch: (value: string) => void; onComplete: (id: number) => void; onAction: (message: string) => void; role: RoleId }) {
  return <><div className="toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={role === 'housekeeping' ? 'Buscar habitación o tarea...' : 'Buscar huésped, habitación...'} /></div><button className="filter-button" onClick={() => onAction('Filtros disponibles próximamente')}><span>Todos</span><ChevronDown size={15} /></button><button className="icon-btn" onClick={() => onAction('Más filtros abiertos')}><Menu size={18} /></button></div><div className="task-list">{tasks.map((task) => <div className="task-row" key={task.id}><div className="task-status-dot" /><div className="task-info"><strong>{task.title}</strong><span>{task.room} · {task.guest}</span></div><span className="task-time">{task.time}</span><span className={`status-pill ${task.tone}`}>{task.status}</span><button className="row-more" onClick={() => task.status !== 'Completada' ? onComplete(task.id) : onAction('Detalle de tarea abierto')}><MoreHorizontal size={18} /></button></div>)}{tasks.length === 0 && <div className="empty-state"><Search size={22} /><p>No encontramos resultados</p></div>}</div></>;
}

function AdminChart({ onAction }: { onAction: (message: string) => void }) { return <div className="chart-area"><div className="chart-tabs"><button className="active">Ocupación</button><button onClick={() => onAction('Gráfica de ingresos seleccionada')}>Ingresos</button><button onClick={() => onAction('Gráfica de reservas seleccionada')}>Reservas</button><span>Últimos 30 días <ChevronDown size={14} /></span></div><div className="chart"><div className="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="chart-lines"><i /><i /><i /><i /><i /><svg viewBox="0 0 720 210" preserveAspectRatio="none"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-brand-gold)" stopOpacity=".32" /><stop offset="100%" stopColor="var(--color-brand-gold)" stopOpacity="0" /></linearGradient></defs><path d="M0 167 C40 153 57 151 85 159 S135 133 168 138 S216 108 247 126 S294 116 322 120 S370 93 403 104 S447 72 479 89 S520 59 549 75 S600 42 634 58 S677 32 720 39 L720 210 L0 210 Z" fill="url(#chartFill)" /><path d="M0 167 C40 153 57 151 85 159 S135 133 168 138 S216 108 247 126 S294 116 322 120 S370 93 403 104 S447 72 479 89 S520 59 549 75 S600 42 634 58 S677 32 720 39" fill="none" stroke="var(--color-brand-gold)" strokeWidth="3" /></svg></div><div className="chart-x"><span>01 ago</span><span>08 ago</span><span>15 ago</span><span>22 ago</span><span>30 ago</span></div></div><div className="chart-footer"><span><i className="legend-dot" /> Ocupación promedio</span><strong>84.6%</strong><span className="positive">+8.2% vs. mes anterior</span></div></div>; }

function ActivityFeed({ role }: { role: RoleId }) { const items = role === 'guest' ? [['Hace 15 min', 'Tu solicitud de almohadas fue recibida', 'success'], ['Ayer, 18:40', 'Cargo de Room Service · $32.00', 'info'], ['21 ago, 14:20', 'Check-in realizado correctamente', 'gold']] : [['Hace 8 min', 'Nueva reserva creada · Habitación 402', 'success'], ['Hace 24 min', 'Check-in completado · Habitación 115', 'info'], ['Hace 1 h', 'Solicitud de mantenimiento asignada', 'gold'], ['Ayer, 18:40', 'Cierre de caja registrado', 'terracotta']]; return <div className="activity-list">{items.map(([time, text, tone]) => <div className="activity-item" key={text}><span className={`activity-dot ${tone}`} /><div><p>{text}</p><small>{time}</small></div></div>)}</div>; }

function RoomStat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="room-stat"><span className={`room-dot ${tone}`} /><div><strong>{value}</strong><small>{label}</small></div></div>; }

function Modal({ role, onClose, onSubmit }: { role: Role; onClose: () => void; onSubmit: (message: string) => void }) { const [value, setValue] = useState(''); return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">NUEVA OPERACIÓN</p><h2>{role.id === 'guest' ? 'Crear solicitud' : 'Crear registro'}</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div><label>¿Qué necesitas registrar?</label><div className="modal-options"><button className="selected" onClick={() => setValue('Reserva')}>Reserva <CalendarDays size={16} /></button><button onClick={() => setValue('Solicitud')}>Solicitud <ClipboardList size={16} /></button><button onClick={() => setValue('Pago')}>Pago <Wallet size={16} /></button></div><label>Descripción breve</label><textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="Escribe los detalles de la operación..." /><div className="modal-foot"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" onClick={() => onSubmit(value || 'Operación creada correctamente')}>Guardar operación <ArrowRight size={16} /></button></div></div></div>; }

function getSubtitle(nav: string, role: string) { if (nav === 'Resumen' || nav === 'Dashboard' || nav === 'Mi jornada' || nav === 'Mi estancia' || nav === 'Inicio' || nav === 'Pedidos activos' || nav === 'Solicitudes') return `Este es el resumen de tu actividad como ${role.toLowerCase()}.`; if (nav === 'Cerrar sesión') return 'Cierra tu sesión cuando termines de usar la aplicación.'; return `Gestiona y consulta la información de ${nav.toLowerCase()} de tu hotel.`; }
function getPanelTitle(role: RoleId, nav: string) { if (role === 'admin') return 'Rendimiento del hotel'; if (role === 'guest') return 'Resumen de mi estancia'; if (nav === 'Habitaciones') return 'Habitaciones pendientes'; if (nav === 'Solicitudes') return 'Solicitudes por atender'; if (nav === 'Pedidos activos') return 'Pedidos en curso'; if (nav === 'Transacciones') return 'Últimas transacciones'; return 'Actividad de hoy'; }
function getPanelDescription(role: RoleId) { if (role === 'admin') return 'Ocupación y rendimiento durante este periodo'; if (role === 'guest') return 'Todo lo que necesitas para disfrutar tu visita'; return 'Tareas que necesitan tu atención'; }

export default App;
