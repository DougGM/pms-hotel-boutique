import type { AuthUserDto } from '@/modules/auth/dtos/auth-user';
import type { Credentials } from '@/modules/auth/models/session';

// Public demonstration accounts only. This adapter is not a security boundary.
const users: AuthUserDto[] = [
  { id: 'demo-admin', full_name: 'Ana Morales', email: 'admin@hotel.test', role: 'admin' },
  {
    id: 'demo-reception',
    full_name: 'Luis Pérez',
    email: 'recepcion@hotel.test',
    role: 'reception',
  },
  {
    id: 'demo-housekeeping',
    full_name: 'María López',
    email: 'limpieza@hotel.test',
    role: 'housekeeping',
  },
  {
    id: 'demo-room-service',
    full_name: 'Carlos García',
    email: 'roomservice@hotel.test',
    role: 'room-service',
  },
  {
    id: 'demo-concierge',
    full_name: 'Sofía Castillo',
    email: 'conserjeria@hotel.test',
    role: 'concierge',
  },
  { id: 'demo-payment', full_name: 'Pedro Reyes', email: 'caja@hotel.test', role: 'payment' },
];

async function delay() {
  await new Promise((resolve) => setTimeout(resolve, 350));
  if (import.meta.env.VITE_AUTH_FORCE_ERROR === 'true') {
    throw new Error('No pudimos conectar con el servicio. Intenta nuevamente.');
  }
}

export const mockAuthAdapter = {
  async login(credentials: Credentials) {
    await delay();
    const user = users.find((item) => item.email === credentials.email.trim().toLowerCase());
    if (!user || credentials.password !== 'AuroraDemo2026!') {
      throw new Error('Correo o contraseña incorrectos.');
    }
    return user;
  },
  async findUser(id: string) {
    await delay();
    return users.find((item) => item.id === id) ?? null;
  },
};
