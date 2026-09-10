export type UserRole =
  'admin' | 'manager' | 'frontDesk' | 'housekeeping' | 'maintenance' | 'roomService' | 'concierge';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
