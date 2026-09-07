export type AmenityCategoryDto = 'room' | 'hotel' | 'service';

export interface AmenityDTO {
  id: string;
  name: string;
  description?: string;
  category: AmenityCategoryDto;
  location?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type AmenityDto = AmenityDTO;
