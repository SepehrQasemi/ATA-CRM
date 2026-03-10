export type PaginationParams = {
  page: number;
  perPage: number;
  offset: number;
};

export type PaginationMeta = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

export function normalizePagination(
  pageInput?: string | null,
  perPageInput?: string | null,
  defaultPerPage = DEFAULT_PER_PAGE,
): PaginationParams {
  const rawPage = Number(pageInput);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawPerPage = Number(perPageInput);
  const perPage =
    Number.isInteger(rawPerPage) && rawPerPage > 0
      ? Math.min(rawPerPage, MAX_PER_PAGE)
      : defaultPerPage;

  return {
    page,
    perPage,
    offset: (page - 1) * perPage,
  };
}

export function buildPaginationMeta(
  page: number,
  perPage: number,
  total: number,
): PaginationMeta {
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  return {
    page: safePage,
    per_page: perPage,
    total: safeTotal,
    total_pages: totalPages,
  };
}
