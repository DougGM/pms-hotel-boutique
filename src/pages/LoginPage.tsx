import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <main className="public-page-shell">
      <section className="public-page-card">
        <p className="eyebrow">Acceso seguro</p>
        <h1>Iniciar sesion</h1>
        <p className="muted">La autenticacion se conectara cuando el backend este disponible.</p>
        <Link className="button secondary" to="/">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
