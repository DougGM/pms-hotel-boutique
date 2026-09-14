import type { Currency } from '@/shared/types/common';
import type { OrderStatus } from '@/shared/constants/statuses';

export type { OrderStatus };

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  bookingId: string;
  roomId: string;
  guestId?: string;
  items: OrderItem[];
  status: OrderStatus;
  notes?: string;
  currency: Currency;
  chargeId?: string;
  requestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
