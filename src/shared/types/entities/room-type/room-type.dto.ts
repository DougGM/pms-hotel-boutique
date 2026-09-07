export interface RoomTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  capacity: number;
  bed_configuration: string;
  amenity_ids: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}
