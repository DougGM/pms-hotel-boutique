import type { ISODateString, UserRole } from '@/shared/types/common';

/**
 * The authenticated user as the login/session response carries it: the PMS
 * access role (ADMIN/RECEPTIONIST/MANAGER/STAFF) that drives navigation and
 * permissions. Deliberately separate from the `User` entity in
 * `shared/types/entities/user/`, which models a staff-directory job role
 * (admin/manager/frontDesk/housekeeping/maintenance) for catalog screens —
 * a different concept that happens to share a name. Do not merge them; see
 * `src/modules/auth/README.md`.
 */
export interface SessionUserDTO {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: ISODateString;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponseDTO {
  user: SessionUserDTO;
  token: string;
  refreshToken: string;
  expiresAt: ISODateString;
}
