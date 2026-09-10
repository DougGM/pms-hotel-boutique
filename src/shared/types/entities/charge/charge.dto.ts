import type { Currency } from '@/shared/types/common';

export type ChargeStatusDto = 'pending' | 'posted' | 'voided';

export interface ChargeDTO {
  id: string;
  booking_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  amount_cents: number;
  currency: Currency;
  status: ChargeStatusDto;
  charged_at: string;
  created_by_user_id?: string;
  /** Motivo de la anulación — solo cuando `status === 'voided'` (Lote C, WEB-11). */
  void_reason?: string;
  created_at: string;
}

export type ChargeDto = ChargeDTO;
