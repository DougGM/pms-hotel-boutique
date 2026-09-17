import type { User } from '@/shared/types/entities/user';
import { toDomain as toRole, type Role } from '@/shared/types/entities/role';
import { toDomain as toPermission, type Permission } from '@/shared/types/entities/permission';
import type { ID } from '@/shared/types/common';
import { permissionsDB, rolesDB, sessionAccountsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';

const sessionRoleToUserRole: Record<string, User['role']> = {
  ADMIN: 'admin',
  GUEST: 'guest',
  RECEPTION: 'reception',
  HOUSEKEEPING: 'housekeeping',
  CONCIERGE: 'concierge',
  ROOM_SERVICE: 'roomService',
};

const toSessionUser = ({ user }: (typeof sessionAccountsDB)[number]): User => {
  const [firstName, ...lastNameParts] = user.name.split(' ');
  const createdAt = new Date(user.createdAt);

  return {
    id: user.id,
    firstName,
    lastName: lastNameParts.join(' '),
    email: user.email,
    role: sessionRoleToUserRole[user.role],
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  };
};

export const personnelService = {
  async getUsers(): Promise<User[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el personal.');
    return requireCollection(sessionAccountsDB, 'sessionAccountsDB').map(toSessionUser);
  },
  async getUserById(id: ID): Promise<User | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el usuario.');
    const account = sessionAccountsDB.find((item) => item.user.id === id);
    return account ? toSessionUser(account) : undefined;
  },
  async getRoles(): Promise<Role[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los roles.');
    return requireCollection(rolesDB, 'rolesDB').map(toRole);
  },
  async getPermissions(): Promise<Permission[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los permisos.');
    return requireCollection(permissionsDB, 'permissionsDB').map(toPermission);
  },
};
export default personnelService;
