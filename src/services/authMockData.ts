import type { SessionUserDTO } from '@/shared/types/entities/session';
import { mockUser } from './mockData';

// Public demo credentials, never production accounts.
export const mockAuthAccounts: { user: SessionUserDTO; password: string }[] = [
  { user: mockUser, password: 'AuroraDemo2026!' },
  {
    user: {
      ...mockUser,
      id: 'user-reception',
      name: 'Luis Pérez',
      email: 'recepcion@hotelboutique.test',
      role: 'RECEPTIONIST',
    },
    password: 'AuroraDemo2026!',
  },
  {
    user: {
      ...mockUser,
      id: 'user-manager',
      name: 'Sofía Castillo',
      email: 'gerente@hotelboutique.test',
      role: 'MANAGER',
    },
    password: 'AuroraDemo2026!',
  },
  {
    user: {
      ...mockUser,
      id: 'user-staff',
      name: 'María López',
      email: 'personal@hotelboutique.test',
      role: 'STAFF',
    },
    password: 'AuroraDemo2026!',
  },
];
