import type { ISODateString, UserRole } from '@/shared/types/common';

/**
 * The authenticated user as the login/session response carries it: the PMS
 * access role (ADMIN/GUEST/RECEPTION/HOUSEKEEPING/CONCIERGE/ROOM_SERVICE)
 * that drives navigation and permissions. Keep it aligned with the `User`
 * staff-directory role catalog in `shared/types/entities/user/`.
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
