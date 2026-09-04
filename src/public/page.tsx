type PublicPageProps = {
  onLogin?: () => void;
};

/** Landing shell for public routes. The router will provide the login action. */
export function PublicPage({ onLogin }: PublicPageProps) {
  return (
    <main className="public-page-shell">
      <section className="public-page-card">
        <p className="eyebrow">Hotel Aurora</p>
        <h1>Tu estancia empieza aqui</h1>
        <p className="muted">Consulta habitaciones, disponibilidad y promociones.</p>
        <button className="button primary" type="button" onClick={onLogin}>
          Iniciar sesion
        </button>
      </section>
    </main>
  );
}
