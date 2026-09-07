export type Currency = 'USD' | 'MXN' | 'EUR' | 'GTQ';
export type ID = string;
export type ISODateString = string;
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
export type UserRole = 'ADMIN' | 'RECEPTIONIST' | 'MANAGER' | 'STAFF';
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'FAILED';
export type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'TRANSFER';
export type ChargeType = 'ROOM' | 'MINIBAR' | 'SERVICE' | 'DAMAGE' | 'OTHER';
export type ProductCategory = 'MINIBAR' | 'RESTAURANT' | 'SPA' | 'ROOM_SERVICE';

export const toDomainDate = (value: string): Date => new Date(value);

export const toDtoDate = (value: Date): string => value.toISOString();
