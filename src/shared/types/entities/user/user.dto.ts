export type UserRoleDto =
  | 'admin'
  | 'manager'
  | 'front_desk'
  | 'housekeeping'
  | 'maintenance'
  | 'room_service'
  | 'concierge';
export type UserStatusDto = 'active' | 'inactive';

export interface UserDTO {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRoleDto;
  status: UserStatusDto;
  created_at: string;
  updated_at: string;
}

export type UserDto = UserDTO;
