export type ID = string;
export type ISODateString = string;
export type Currency = 'GTQ' | 'USD';
export type PaymentMethod = 'cash' | 'card' | 'transfer';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'cleaning';
export type UserRole = 'admin' | 'receptionist' | 'housekeeping';
export type ProductCategory = 'minibar' | 'amenity' | 'service' | 'other';
export type ChargeType = 'room' | 'product' | 'service' | 'adjustment';
export interface PaginationParams { page?: number; pageSize?: number }
export interface PaginatedResponse<T> { data: T[]; page: number; pageSize: number; total: number; totalPages: number }
export interface ApiResponse<T> { data: T; message?: string }
export interface ApiError { code: string; message: string; details?: unknown }
