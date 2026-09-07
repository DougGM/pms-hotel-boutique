import type { Currency } from '@/shared/types/common';

export type ChargeStatus = 'pending' | 'posted' | 'voided';

export interface Charge {
  id: string;
  bookingId: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
  currency: Currency;
  status: ChargeStatus;
  chargedAt: Date;
  createdByUserId?: string;
  createdAt: Date;
}
