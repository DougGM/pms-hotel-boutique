import type { AuthResponseDTO, SessionUserDTO } from '@/shared/types/entities/session';
import type { AmenityDto } from '@/shared/types/entities/amenity';
import type { BookingDto } from '@/shared/types/entities/booking';
import type { GuestDto } from '@/shared/types/entities/guest';
import type { PaymentDto } from '@/shared/types/entities/payment';
import type { ProductDto } from '@/shared/types/entities/product';
import type { RateDto } from '@/shared/types/entities/rate';
import type { RoomDto } from '@/shared/types/entities/room';
import type { RoomFeatureDto } from '@/shared/types/entities/room-feature';
import type { RoomTypeDto } from '@/shared/types/entities/room-type';

const createdAt = '2026-01-10T12:00:00.000Z';

export const mockUser: SessionUserDTO = {
  id: 'user-1',
  email: 'admin@hotelboutique.test',
  name: 'Ana Martínez',
  role: 'ADMIN',
  createdAt,
};
export const mockAuthResponse: AuthResponseDTO = {
  user: mockUser,
  token: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: '2026-12-31T23:59:59.000Z',
};

export const mockAmenities: AmenityDto[] = [
  {
    id: 'amenity-1',
    name: 'Wi-Fi',
    description: 'Internet inalámbrico',
    category: 'hotel',
    active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: 'amenity-2',
    name: 'Desayuno',
    description: 'Desayuno incluido',
    category: 'service',
    active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
];

// Características de habitación, no amenidades del hotel (ver
// room-type.dto.ts y docs/CONTRATO-DATOS.md sección 3.2). Antes de este
// catálogo, mockRoomTypes.amenity_ids referenciaba mockAmenities
// directamente (Wi-Fi/Desayuno colgando de un tipo de habitación
// específico) — resuelve sin romper la referencia, pero es la misma
// confusión conceptual que rompía room_feature_ids en lot-b.ts.
export const mockRoomFeatures: RoomFeatureDto[] = [
  {
    id: 'room-feature-1',
    name: 'Aire acondicionado',
    description: 'Climatización individual controlable desde la habitación.',
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: 'room-feature-2',
    name: 'Vista al jardín',
    description: 'Ventanal orientado hacia las áreas verdes del hotel.',
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: 'room-feature-3',
    name: 'Minibar',
    description: 'Refrigerador con bebidas y snacks de cortesía.',
    created_at: createdAt,
    updated_at: createdAt,
  },
];

// Price now lives on Rate and capacity/description on RoomType (the official
// WEB-09 contract), not on Room: a real availability response would not
// inline them on the physical room. `bed_configuration` is placeholder data
// the original flat mock never captured.
export const mockRoomTypes: RoomTypeDto[] = [
  {
    id: 'room-type-suite-jardin',
    code: 'SUJ',
    name: 'Suite jardín',
    description: 'Suite con vista al jardín.',
    capacity: 2,
    bed_configuration: '1 cama king',
    room_feature_ids: ['room-feature-1', 'room-feature-2'],
    active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: 'room-type-deluxe',
    code: 'DLX',
    name: 'Habitación deluxe',
    description: 'Habitación amplia y luminosa.',
    capacity: 3,
    bed_configuration: '1 cama king y 1 individual',
    room_feature_ids: ['room-feature-1', 'room-feature-3'],
    active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
];
export const mockRates: RateDto[] = [
  {
    id: 'rate-suite-jardin',
    room_type_id: 'room-type-suite-jardin',
    name: 'Tarifa base',
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
    price_cents: 95000,
    currency: 'GTQ',
    minimum_nights: 1,
    refundable: true,
    active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: 'rate-deluxe',
    room_type_id: 'room-type-deluxe',
    name: 'Tarifa base',
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
    price_cents: 78000,
    currency: 'GTQ',
    minimum_nights: 1,
    refundable: true,
    active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
];
export const mockRooms: RoomDto[] = [
  {
    id: 'room-101',
    room_number: '101',
    room_type_id: 'room-type-suite-jardin',
    floor: 1,
    status: 'available',
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: 'room-202',
    room_number: '202',
    room_type_id: 'room-type-deluxe',
    floor: 2,
    status: 'occupied',
    created_at: createdAt,
    updated_at: createdAt,
  },
];

export const mockGuests: GuestDto[] = [
  {
    id: 'guest-1',
    first_name: 'Carlos',
    last_name: 'López',
    email: 'carlos@example.com',
    phone: '+502 5555-0101',
    nationality: 'Guatemalteca',
    document_type: 'national_id',
    document_number: '1234567890101',
    created_at: createdAt,
    updated_at: createdAt,
  },
];
export const mockBookings: BookingDto[] = [
  {
    id: 'booking-1',
    confirmation_code: 'PMS-0001',
    guest_link_code: 'LNK-7Q3F2K',
    guest_id: 'guest-1',
    room_id: 'room-101',
    room_type_id: 'room-type-suite-jardin',
    rate_id: 'rate-suite-jardin',
    check_in: '2026-09-10',
    check_out: '2026-09-13',
    status: 'confirmed',
    adults: 2,
    children: 0,
    total_amount_cents: 285000,
    currency: 'GTQ',
    created_at: createdAt,
    updated_at: createdAt,
  },
];
export const mockPayments: PaymentDto[] = [
  {
    id: 'payment-1',
    booking_id: 'booking-1',
    amount_cents: 285000,
    currency: 'GTQ',
    method: 'credit_card',
    status: 'completed',
    transaction_reference: 'TX-0001',
    paid_at: createdAt,
    created_at: createdAt,
  },
];
export const mockProducts: ProductDto[] = [
  {
    id: 'product-1',
    sku: 'AGUA-600ML',
    name: 'Agua mineral',
    description: 'Botella de 600 ml',
    category: 'minibar',
    price_cents: 1500,
    currency: 'GTQ',
    stock_quantity: 24,
    reorder_level: 6,
    active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: 'product-2',
    sku: 'SERV-EXPRESS',
    name: 'Servicio express',
    category: 'other',
    price_cents: 7500,
    currency: 'GTQ',
    stock_quantity: 999,
    reorder_level: 50,
    active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
];
