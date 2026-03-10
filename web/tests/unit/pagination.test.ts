import { describe, expect, it } from "vitest";
import { buildPaginationMeta, normalizePagination } from "@/lib/pagination";

describe("pagination helpers", () => {
  it("normalizes invalid input values", () => {
    expect(normalizePagination(undefined, undefined)).toEqual({
      page: 1,
      perPage: 20,
      offset: 0,
    });

    expect(normalizePagination("-2", "0")).toEqual({
      page: 1,
      perPage: 20,
      offset: 0,
    });
  });

  it("caps perPage and computes offset", () => {
    expect(normalizePagination("3", "200")).toEqual({
      page: 3,
      perPage: 100,
      offset: 200,
    });
  });

  it("builds pagination metadata", () => {
    expect(buildPaginationMeta(2, 20, 95)).toEqual({
      page: 2,
      per_page: 20,
      total: 95,
      total_pages: 5,
    });
  });

  it("guards negative totals and page overflow", () => {
    expect(buildPaginationMeta(99, 20, -1)).toEqual({
      page: 1,
      per_page: 20,
      total: 0,
      total_pages: 1,
    });
  });
});
