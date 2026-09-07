import type { StaffRole } from '@/modules/auth/models/session';

// Temporary auth contract pending coordination with WEB-05/WEB-09/WEB-12.
export interface AuthUserDto {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
}
