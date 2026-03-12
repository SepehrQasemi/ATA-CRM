"use client";

import { useLocale } from "@/components/locale-provider";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  const { tr } = useLocale();
  const safePage = Math.max(1, page);
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <nav className="inline-actions" aria-label={tr("Pagination controls")}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onPageChange(safePage - 1)}
        disabled={safePage <= 1}
      >
        {tr("Prev")}
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
        {tr("Next")}
      </button>
    </nav>
  );
}
