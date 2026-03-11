import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  getUserRole: vi.fn(),
  from: vi.fn(),
  sendBrevoEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
  getUserRole: mocks.getUserRole,
}));

vi.mock("@/lib/brevo", () => ({
  sendBrevoEmail: mocks.sendBrevoEmail,
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { POST } from "@/app/api/emails/send/route";

describe("POST /api/emails/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "user@example.test" },
      response: null,
    });
  });

  it("blocks test email for non-admin users", async () => {
    mocks.getUserRole.mockResolvedValue("standard_user");

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_test: true,
          template_id: "tpl-1",
          contact_id: "contact-1",
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toBe("Only admins can send test emails");
  });

  it("requires manual recipient, subject, and body", async () => {
    mocks.getUserRole.mockResolvedValue("admin");

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_email: "",
          subject: "",
          body: "",
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Recipient email is required");
  });
});
