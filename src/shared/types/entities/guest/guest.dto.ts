export type GuestDocumentTypeDto = 'passport' | 'national_id' | 'driver_license';

export interface GuestDto {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  nationality?: string;
  document_type?: GuestDocumentTypeDto;
  document_number?: string;
  created_at: string;
  updated_at: string;
}
