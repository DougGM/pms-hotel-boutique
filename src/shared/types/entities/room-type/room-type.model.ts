export interface RoomType {
  id: string;
  code: string;
  name: string;
  description?: string;
  capacity: number;
  bedConfiguration: string;
  amenityIds: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
