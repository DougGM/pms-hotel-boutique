import { LogIn } from 'lucide-react';
import './DevQuickLogin.css';

/**
 * Accesos rápidos para desarrollo local. Solo se carga con `npm run dev`
 * (`import.meta.env.DEV`); en el build de producción `StaffLoginPage` no lo
 * importa y Vite elimina este módulo junto con las credenciales.
 *
 * Son las cuentas del seed demo del backend (`docs/DEMO-DATA.md` en
 * pms-hotel-boutique-backend); solo funcionan contra una base con ese seed.
 */
export type DevAccount = {
  label: string;
  email: string;
  password: string;
  group: 'staff' | 'guest';
};

const DEV_ACCOUNTS: DevAccount[] = [
  { label: 'Administración', email: 'admin@aurora.test', password: 'admin', group: 'staff' },
  { label: 'Recepción', email: 'recepcion@aurora.test', password: 'recepcion', group: 'staff' },
  { label: 'Limpieza', email: 'limpieza@aurora.test', password: 'limpieza', group: 'staff' },
  {
    label: 'Conserjería',
    email: 'conserjeria@aurora.test',
    password: 'conserjeria',
    group: 'staff',
  },
  {
    label: 'Room Service',
    email: 'roomservice@aurora.test',
    password: 'roomservice',
    group: 'staff',
  },
  { label: 'Ana Morales', email: 'ana.demo@aurora.test', password: 'huesped1', group: 'guest' },
  { label: 'Carlos Reyes', email: 'carlos.demo@aurora.test', password: 'huesped2', group: 'guest' },
];

type DevQuickLoginProps = {
  onPick: (account: DevAccount) => void;
  disabled?: boolean;
};

export default function DevQuickLogin({ onPick, disabled = false }: DevQuickLoginProps) {
  const groups = [
    { id: 'staff', title: 'Personal', note: null },
    {
      id: 'guest',
      title: 'Huéspedes',
      note: 'Las estancias del seed demo tienen fechas fijas y pueden estar vencidas.',
    },
  ] as const;

  return (
    <section className="dev-quick-login" aria-labelledby="dev-quick-login-title">
      <p className="dev-quick-login__badge">Solo en desarrollo</p>
      <h2 id="dev-quick-login-title">Acceso rápido</h2>
      {groups.map((group) => (
        <div className="dev-quick-login__group" key={group.id}>
          <h3>{group.title}</h3>
          {group.note ? <p className="dev-quick-login__note">{group.note}</p> : null}
          <ul>
            {DEV_ACCOUNTS.filter((account) => account.group === group.id).map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="dev-quick-login__account"
                  disabled={disabled}
                  aria-label={`Iniciar sesión como ${account.label} (${account.email})`}
                  onClick={() => onPick(account)}
                >
                  <LogIn aria-hidden="true" />
                  <span>
                    <strong>{account.label}</strong>
                    <small>{account.email}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
