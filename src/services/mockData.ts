import type {
  AuthResponseDTO,
  BookingDTO,
  GuestDTO,
  PaymentDTO,
  ProductDTO,
  AmenityDTO,
  RoomDTO,
  UserDTO,
} from '@/shared/types/entities';

const createdAt = '2026-01-10T12:00:00.000Z';
export const mockUser: UserDTO = {
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
export const mockRooms: RoomDTO[] = [
  {
    id: 'room-101',
    number: '101',
    type: 'Suite jardín',
    floor: 1,
    capacity: 2,
    pricePerNightCents: 95000,
    currency: 'GTQ',
    status: 'AVAILABLE',
    amenities: ['Wi-Fi', 'Desayuno'],
    images: [],
    description: 'Suite con vista al jardín.',
  },
  {
    id: 'room-202',
    number: '202',
    type: 'Habitación deluxe',
    floor: 2,
    capacity: 3,
    pricePerNightCents: 78000,
    currency: 'GTQ',
    status: 'OCCUPIED',
    amenities: ['Wi-Fi', 'Balcón'],
    images: [],
    description: 'Habitación amplia y luminosa.',
  },
];
export const mockGuests: GuestDTO[] = [
  {
    id: 'guest-1',
    firstName: 'Carlos',
    lastName: 'López',
    email: 'carlos@example.com',
    phone: '+502 5555-0101',
    documentType: 'DPI',
    documentNumber: '1234567890101',
    nationality: 'Guatemalteca',
    createdAt,
    updatedAt: createdAt,
  },
];
export const mockBookings: BookingDTO[] = [
  {
    id: 'booking-1',
    code: 'PMS-0001',
    guestId: 'guest-1',
    roomId: 'room-101',
    checkIn: '2026-09-10T15:00:00.000Z',
    checkOut: '2026-09-13T12:00:00.000Z',
    status: 'CONFIRMED',
    guests: 2,
    adults: 2,
    children: 0,
    pricePerNightCents: 95000,
    totalAmountCents: 285000,
    currency: 'GTQ',
    source: 'direct',
    createdAt,
    updatedAt: createdAt,
    guest: mockGuests[0],
    room: mockRooms[0],
  },
];
export const mockPayments: PaymentDTO[] = [
  {
    id: 'payment-1',
    bookingId: 'booking-1',
    amountCents: 285000,
    currency: 'GTQ',
    method: 'CREDIT_CARD',
    status: 'COMPLETED',
    type: 'ROOM',
    description: 'Reserva PMS-0001',
    transactionId: 'TX-0001',
    createdAt,
    paidAt: createdAt,
  },
];
export const mockProducts: ProductDTO[] = [
  {
    id: 'product-1',
    name: 'Agua mineral',
    description: 'Botella de 600 ml',
    category: 'MINIBAR',
    priceCents: 1500,
    currency: 'GTQ',
    stock: 24,
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'product-2',
    name: 'Servicio express',
    category: 'ROOM_SERVICE',
    priceCents: 7500,
    currency: 'GTQ',
    stock: 999,
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
];
export const mockAmenities: AmenityDTO[] = [
  {
    id: 'amenity-1',
    name: 'Wi-Fi',
    description: 'Internet inalámbrico',
    icon: 'wifi',
    active: true,
  },
  {
    id: 'amenity-2',
    name: 'Desayuno',
    description: 'Desayuno incluido',
    icon: 'coffee',
    active: true,
  },
];
