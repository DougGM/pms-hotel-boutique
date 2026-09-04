type PaginationProps = {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
};

export function Pagination({ currentPage, onPageChange, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Paginacion">
      <button
        className="button small secondary"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Anterior
      </button>
      <span className="muted">
        Pagina {currentPage} de {totalPages}
      </span>
      <button
        className="button small secondary"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Siguiente
      </button>
    </nav>
  );
}
