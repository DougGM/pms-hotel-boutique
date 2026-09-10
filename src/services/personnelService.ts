import { toDomain as toUser, type User } from '@/shared/types/entities/user';
import { toDomain as toRole, type Role } from '@/shared/types/entities/role';
import { toDomain as toPermission, type Permission } from '@/shared/types/entities/permission';
import type { ID } from '@/shared/types/common';
import { lotDMockData } from '@/shared/mocks/lot-d';
import { mockUtils, simulateLatency } from './mockUtils';

export const personnelService = {
  async getUsers(): Promise<User[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el personal.');
    return lotDMockData.users.map(toUser);
  },
  async getUserById(id: ID): Promise<User | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el usuario.');
    const user = lotDMockData.users.find((item) => item.id === id);
    return user ? toUser(user) : undefined;
  },
  async getRoles(): Promise<Role[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los roles.');
    return lotDMockData.roles.map(toRole);
  },
  async getPermissions(): Promise<Permission[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los permisos.');
    return lotDMockData.permissions.map(toPermission);
  },
};
export default personnelService;
