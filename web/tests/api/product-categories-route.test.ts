import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFluentQuery } from "./helpers";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { GET, POST } from "@/app/api/product-categories/route";

describe("GET /api/product-categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "user@example.test" },
      response: null,
    });
  });

  it("returns paginated categories with product counts", async () => {
    const categoriesQuery = createFluentQuery({
      data: [{ id: "cat-1", name: "Hydrocolloids", description: "Texturants", created_at: "2026-03-11" }],
      error: null,
    }) as ReturnType<typeof createFluentQuery> & { count?: number };
    categoriesQuery.count = 1;

    const productsQuery = createFluentQuery({
      data: [
        { id: "p-1", category: "Hydrocolloids" },
        { id: "p-2", category: "Hydrocolloids" },
      ],
      error: null,
    });

    mocks.from.mockReturnValueOnce(categoriesQuery).mockReturnValueOnce(productsQuery);

    const response = await GET(
      new Request("http://127.0.0.1:3000/api/product-categories?page=1&per_page=10&q=hyd"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.categories).toHaveLength(1);
    expect(json.categories[0].product_count).toBe(2);
    expect(productsQuery.in).toHaveBeenCalledWith("category", ["Hydrocolloids"]);
  });
});

describe("POST /api/product-categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "user@example.test" },
      response: null,
    });
  });

  it("creates a new category", async () => {
    const insertQuery = createFluentQuery({
      data: { id: "cat-2", name: "Sweeteners", description: "Sugar substitutes", created_at: "2026-03-11" },
      error: null,
    });

    mocks.from.mockReturnValue(insertQuery);

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/product-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Sweeteners", description: "Sugar substitutes" }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.from).toHaveBeenCalledWith("product_categories");
    expect(insertQuery.insert).toHaveBeenCalled();
    expect(json.category.name).toBe("Sweeteners");
  });
});
