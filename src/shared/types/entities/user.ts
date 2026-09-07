import type { ID, ISODateString, UserRole } from '../common';
export type { UserDto } from './user/user.dto';
export interface UserDTO {
  id: ID;
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
export interface User {
  id: ID;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: Date;
}
export const userMapper = {
  toDomain(dto: UserDTO): User {
    return { ...dto, createdAt: new Date(dto.createdAt) };
  },
};
export interface AuthResponseDTO {
  user: UserDTO;
  token: string;
  refreshToken: string;
  expiresAt: ISODateString;
}
export interface AuthSession {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}
export const authMapper = {
  toSession(dto: AuthResponseDTO): AuthSession {
    return { ...dto, user: userMapper.toDomain(dto.user), expiresAt: new Date(dto.expiresAt) };
  },
};
