import type { User } from '@/shared/types/entities/user';
import { toDomain as toUser, type UserDto } from '@/shared/types/entities/user';
import { toDomain as toRole, type Role } from '@/shared/types/entities/role';
import { toDomain as toPermission, type Permission } from '@/shared/types/entities/permission';
import type { ID } from '@/shared/types/common';
import { permissionsDB, rolesDB, sessionAccountsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
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

type SaveUserData = {
  firstName: string;
  lastName: string;
  email: string;
  role: User['role'];
  status?: User['status'];
};

const apiRoleToUserRole: Record<string, User['role']> = {
  ADMIN: 'admin',
  GUEST: 'guest',
  RECEPTION: 'reception',
  HOUSEKEEPING: 'housekeeping',
  CONCIERGE: 'concierge',
  ROOM_SERVICE: 'roomService',
};

const userRoleToApiRole: Record<User['role'], string> = {
  admin: 'ADMIN',
  guest: 'GUEST',
  reception: 'RECEPTION',
  housekeeping: 'HOUSEKEEPING',
  concierge: 'CONCIERGE',
  roomService: 'ROOM_SERVICE',
};

const normalizeRoleCode = (code: string): string => code.trim().toUpperCase();
const isOfflineError = (error: unknown): boolean =>
  !(typeof error === 'object' && error !== null && 'status' in error) ||
  (typeof error === 'object' && error !== null && 'status' in error && error.status === 404);

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

const toUserRequest = (data: SaveUserData) => ({
  firstName: data.firstName.trim(),
  lastName: data.lastName.trim(),
  email: data.email.trim().toLowerCase(),
  roleCode: userRoleToApiRole[data.role],
  status: data.status ?? 'active',
});

const toSessionUser = ({ user }: (typeof sessionAccountsDB)[number]): User => {
  const [firstName, ...lastNameParts] = user.name.split(' ');
  const createdAt = new Date(user.createdAt);

  return {
    id: user.id,
    firstName,
    lastName: lastNameParts.join(' '),
    email: user.email,
    role: apiRoleToUserRole[user.role] ?? 'reception',
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  };
};

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

export const personnelService = {
  async getUsers(): Promise<User[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el personal.');
    try {
      const users = await httpClient.get<ApiUser[]>('/admin/users');
      return users.map(toUserDto).map(toUser);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      return requireCollection(sessionAccountsDB, 'sessionAccountsDB').map(toSessionUser);
    }
  },
  async getUserById(id: ID): Promise<User | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el usuario.');
    try {
      const user = await httpClient.get<ApiUser>(`/admin/users/${id}`);
      return toUser(toUserDto(user));
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      const account = sessionAccountsDB.find((item) => item.user.id === id);
      return account ? toSessionUser(account) : undefined;
    }
  },
  async createUser(data: SaveUserData): Promise<User> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear el usuario.');
    if (!data.firstName.trim()) throw new Error('El usuario requiere nombre.');
    if (!data.lastName.trim()) throw new Error('El usuario requiere apellido.');
    if (!data.email.trim()) throw new Error('El usuario requiere correo.');

    const user = await httpClient.post<ApiUser>('/admin/users', toUserRequest(data));
    return toUser(toUserDto(user));
  },
  async updateUser(id: ID, data: Partial<SaveUserData>): Promise<User> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar el usuario.');

    const current = await this.getUserById(id);
    if (!current) throw new Error(`No existe el usuario ${id}.`);
    const request = toUserRequest({
      firstName: data.firstName ?? current.firstName,
      lastName: data.lastName ?? current.lastName,
      email: data.email ?? current.email,
      role: data.role ?? current.role,
      status: data.status ?? current.status,
    });
    const user = await httpClient.put<ApiUser>(`/admin/users/${id}`, request);
    return toUser(toUserDto(user));
  },
  async getRoles(): Promise<Role[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los roles.');
    try {
      const roles = await httpClient.get<ApiRole[]>('/admin/roles');
      return roles.map(toRoleDto).map(toRole);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      return requireCollection(rolesDB, 'rolesDB').map(toRole);
    }
  },
  async getPermissions(): Promise<Permission[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los permisos.');
    return requireCollection(permissionsDB, 'permissionsDB').map(toPermission);
  },
};
export default personnelService;
