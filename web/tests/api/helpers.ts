import { vi } from "vitest";

type QueryResult<T = unknown> = {
  data: T;
  error: { message: string } | null;
};

export function createFluentQuery<T = unknown>(result: QueryResult<T>) {
  const query: Record<string, unknown> = {
    data: result.data,
    error: result.error,
  };

  const chainMethods = [
    "select",
    "order",
    "eq",
    "or",
    "ilike",
    "gte",
    "lte",
    "lt",
    "not",
    "neq",
    "in",
    "limit",
    "range",
    "insert",
    "update",
    "delete",
    "upsert",
  ] as const;

  for (const method of chainMethods) {
    query[method] = vi.fn(() => query);
  }

  query.single = vi.fn(async () => ({ data: result.data, error: result.error }));

  return query;
}
