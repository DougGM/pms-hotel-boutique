import type { User } from '@/shared/types/entities/user';
import { toDomain as toUser, type UserDto } from '@/shared/types/entities/user';
import { toDomain as toRole, type Role } from '@/shared/types/entities/role';
import { toDomain as toPermission, type Permission } from '@/shared/types/entities/permission';
import type { ID } from '@/shared/types/common';
import { simulateLatency } from './mockUtils';
import { httpClient } from './http-client';

type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleCode: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

type ApiRole = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  permissions: string[];
};

type CreateUserData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: string;
};

type UpdateUserData = {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  status: User['status'];
};

const apiRoleToUserRole: Record<string, User['role']> = {
  ADMIN: 'admin',
  GUEST: 'guest',
  RECEPTION: 'reception',
  HOUSEKEEPING: 'housekeeping',
  CONCIERGE: 'concierge',
  ROOM_SERVICE: 'roomService',
};

const normalizeRoleCode = (code: string): string => code.trim().toUpperCase();
const toUserRoleDto = (code: string): UserDto['role'] => {
  const role = apiRoleToUserRole[normalizeRoleCode(code)] ?? 'reception';
  return role === 'roomService' ? 'room_service' : role;
};

const toUserDto = (api: ApiUser): UserDto => ({
  id: api.id,
  first_name: api.firstName,
  last_name: api.lastName,
  email: api.email,
  role: toUserRoleDto(api.roleCode),
  status: api.status,
  created_at: api.createdAt,
  updated_at: api.updatedAt,
});

const toCreateUserRequest = (data: CreateUserData) => ({
  firstName: data.firstName.trim(),
  lastName: data.lastName.trim(),
  email: data.email.trim().toLowerCase(),
  password: data.password,
  roleId: data.roleId,
});

const toUpdateUserRequest = (data: UpdateUserData) => ({
  firstName: data.firstName.trim(),
  lastName: data.lastName.trim(),
  email: data.email.trim().toLowerCase(),
  roleId: data.roleId,
  status: data.status,
});

const toRoleDto = (api: ApiRole) => {
  const timestamp = new Date().toISOString();
  return {
    id: api.id,
    code: apiRoleToUserRole[normalizeRoleCode(api.code)] ?? api.code.toLowerCase(),
    name: api.name,
    permission_ids: api.permissions,
    active: api.active,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

const formatPermissionName = (permission: string): string =>
  permission
    .split(/[.:_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const toPermissionDto = (permission: string) => {
  const timestamp = new Date().toISOString();
  return {
    id: permission,
    key: permission,
    name: formatPermissionName(permission),
    created_at: timestamp,
    updated_at: timestamp,
  };
};

export const personnelService = {
  async getUsers(): Promise<User[]> {
    await simulateLatency();
    const users = await httpClient.get<ApiUser[]>('/admin/users');
    return users.map(toUserDto).map(toUser);
  },
  async getUserById(id: ID): Promise<User | undefined> {
    await simulateLatency();
    try {
      const user = await httpClient.get<ApiUser>(`/admin/users/${id}`);
      return toUser(toUserDto(user));
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 404
      ) {
        return undefined;
      }
      throw error;
    }
  },
  async createUser(data: CreateUserData): Promise<User> {
    await simulateLatency();
    if (!data.firstName.trim()) throw new Error('El usuario requiere nombre.');
    if (!data.lastName.trim()) throw new Error('El usuario requiere apellido.');
    if (!data.email.trim()) throw new Error('El usuario requiere correo.');
    if (!data.password.trim()) throw new Error('El usuario requiere contrasena.');
    if (!data.roleId.trim()) throw new Error('El usuario requiere rol.');

    const user = await httpClient.post<ApiUser>('/admin/users', toCreateUserRequest(data));
    return toUser(toUserDto(user));
  },
  async updateUser(id: ID, data: Partial<UpdateUserData>): Promise<User> {
    await simulateLatency();

    const current = await this.getUserById(id);
    if (!current) throw new Error(`No existe el usuario ${id}.`);
    if (!data.roleId?.trim()) throw new Error('El usuario requiere rol.');
    const request = toUpdateUserRequest({
      firstName: data.firstName ?? current.firstName,
      lastName: data.lastName ?? current.lastName,
      email: data.email ?? current.email,
      roleId: data.roleId,
      status: data.status ?? current.status,
    });
    const user = await httpClient.put<ApiUser>(`/admin/users/${id}`, request);
    return toUser(toUserDto(user));
  },
  async getRoles(): Promise<Role[]> {
    await simulateLatency();
    const roles = await httpClient.get<ApiRole[]>('/admin/roles');
    return roles.map(toRoleDto).map(toRole);
  },
  async getPermissions(): Promise<Permission[]> {
    await simulateLatency();
    const roles = await httpClient.get<ApiRole[]>('/admin/roles');
    const permissions = [...new Set(roles.flatMap((role) => role.permissions))].sort();
    return permissions.map(toPermissionDto).map(toPermission);
  },
};
export default personnelService;
