import { toDomain as toUser, type User } from '@/shared/types/entities/user';
import { toDomain as toRole, type Role } from '@/shared/types/entities/role';
import { toDomain as toPermission, type Permission } from '@/shared/types/entities/permission';
import type { ID } from '@/shared/types/common';
import { permissionsDB, rolesDB, usersDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';

export const personnelService = {
  async getUsers(): Promise<User[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el personal.');
    return usersDB.map(toUser);
  },
  async getUserById(id: ID): Promise<User | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el usuario.');
    const user = usersDB.find((item) => item.id === id);
    return user ? toUser(user) : undefined;
  },
  async getRoles(): Promise<Role[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los roles.');
    return rolesDB.map(toRole);
  },
  async getPermissions(): Promise<Permission[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los permisos.');
    return permissionsDB.map(toPermission);
  },
};
export default personnelService;
