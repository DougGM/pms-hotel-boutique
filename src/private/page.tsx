import type { ReactNode } from 'react';
import './staff-shell.css';

type PrivatePageProps = {
  activeItem: string;
  children: ReactNode;
  menuItems: string[];
  onNavigate?: (item: string) => void;
  sessionLabel?: string;
  onLogout?: () => void;
};

/** Shared private shell with the main menu for employee and admin views. */
export function PrivatePage({
  activeItem,
  children,
  menuItems,
  onNavigate,
  sessionLabel,
  onLogout,
}: PrivatePageProps) {
  return (
    <div className="app-shell staff-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>
          <span>Hotel Aurora</span>
        </div>
        <nav className="side-nav" aria-label="Menu principal">
          <div className="workspace-label">OPERACION</div>
          {menuItems.map((item) => (
            <button
              className={`nav-item ${item === activeItem ? 'active' : ''}`}
              key={item}
              type="button"
              aria-current={item === activeItem ? 'page' : undefined}
              onClick={() => onNavigate?.(item)}
            >
              <span>{item}</span>
            </button>
          ))}
        </nav>
        {sessionLabel && <p className="eyebrow">{sessionLabel}</p>}
        {onLogout && (
          <button className="nav-item" type="button" onClick={onLogout}>
            Cerrar sesión
          </button>
        )}
      </aside>
      <main className="main-area">{children}</main>
    </div>
  );
}
