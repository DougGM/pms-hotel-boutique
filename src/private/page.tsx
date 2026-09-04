import type { ReactNode } from 'react';

type PrivatePageProps = {
  activeItem: string;
  children: ReactNode;
  menuItems: string[];
  onNavigate?: (item: string) => void;
};

/** Shared private shell with the main menu for employee and admin views. */
export function PrivatePage({ activeItem, children, menuItems, onNavigate }: PrivatePageProps) {
  return (
    <div className="app-shell">
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
              onClick={() => onNavigate?.(item)}
            >
              <span>{item}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="main-area">{children}</main>
    </div>
  );
}
