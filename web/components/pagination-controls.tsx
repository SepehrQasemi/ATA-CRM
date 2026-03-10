"use client";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  const safePage = Math.max(1, page);
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <nav className="inline-actions" aria-label="Pagination controls">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onPageChange(safePage - 1)}
        disabled={safePage <= 1}
      >
        Prev
      </button>
      <span data-testid="pagination-status">
        {safePage} / {safeTotalPages}
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onPageChange(safePage + 1)}
        disabled={safePage >= safeTotalPages}
      >
        Next
      </button>
    </nav>
  );
}
