import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFluentQuery } from "./helpers";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  getUserRole: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
  getUserRole: mocks.getUserRole,
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { GET } from "@/app/api/contacts/route";

describe("GET /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "user@example.test" },
      response: null,
    });
  });

  it("returns empty result when company_q has no prefix matches", async () => {
    mocks.getUserRole.mockResolvedValue("commercial");

    const contactsQuery = createFluentQuery({
      data: [{ id: "contact-1" }],
      error: null,
    });
    const companiesLookup = createFluentQuery({
      data: [],
      error: null,
    });

    mocks.from
      .mockReturnValueOnce(contactsQuery)
      .mockReturnValueOnce(companiesLookup);

    const response = await GET(
      new Request("http://127.0.0.1:3000/api/contacts?company_q=Acme"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.contacts).toEqual([]);
    expect(companiesLookup.ilike).toHaveBeenCalledWith("name", "Acme%");
    expect(companiesLookup.or).not.toHaveBeenCalled();
  });

  it("applies text search and returns contact rows", async () => {
    mocks.getUserRole.mockResolvedValue("admin");
    const contactsQuery = createFluentQuery({
      data: [{ id: "contact-1", first_name: "Sepehr" }],
      error: null,
    });
    mocks.from.mockReturnValue(contactsQuery);

    const response = await GET(
      new Request("http://127.0.0.1:3000/api/contacts?q=sepehr"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(contactsQuery.or).toHaveBeenCalledWith(
      "first_name.ilike.%sepehr%,last_name.ilike.%sepehr%,email.ilike.%sepehr%",
    );
    expect(json.contacts).toHaveLength(1);
  });
});
