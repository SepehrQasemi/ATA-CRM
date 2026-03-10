/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/components/locale-provider";
import { NotificationBell } from "@/components/notification-bell";

describe("NotificationBell", () => {
  it("shows preview on hover and links to notifications page", async () => {
    const user = userEvent.setup();

    render(
      <LocaleProvider initialLocale="en">
        <NotificationBell
          items={[
            { id: "1", title: "Lead updated", detail: "Lead A moved stage", level: "success", at: new Date().toISOString() },
            { id: "2", title: "Task completed", detail: "Task B completed", level: "info", at: new Date().toISOString() },
          ]}
        />
      </LocaleProvider>,
    );

    await user.hover(screen.getByRole("link", { name: "Open notifications page" }));
    expect(screen.getByRole("dialog", { name: "Notification preview" })).toBeInTheDocument();
    expect(screen.getByText("Lead updated")).toBeInTheDocument();
    expect(screen.getByText("Task completed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all notifications" })).toHaveAttribute(
      "href",
      "/notifications",
    );
  });
});
