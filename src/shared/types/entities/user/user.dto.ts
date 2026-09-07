export type UserRoleDto = 'admin' | 'manager' | 'front_desk' | 'housekeeping' | 'maintenance';
export type UserStatusDto = 'active' | 'inactive';

export interface UserDto {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRoleDto;
  status: UserStatusDto;
  created_at: string;
  updated_at: string;
}
