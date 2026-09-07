import type { Currency } from '@/shared/types/common';

export type BookingStatusDto =
  'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';

export interface BookingDto {
  id: string;
  confirmation_code: string;
  guest_id: string;
  room_id?: string;
  room_type_id: string;
  rate_id?: string;
  check_in: string;
  check_out: string;
  status: BookingStatusDto;
  adults: number;
  children: number;
  total_amount_cents: number;
  currency: Currency;
  notes?: string;
  created_at: string;
  updated_at: string;
}
