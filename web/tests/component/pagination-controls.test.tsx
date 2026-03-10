/* @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/components/locale-provider";
import { PaginationControls } from "@/components/pagination-controls";

describe("PaginationControls", () => {
  it("disables prev on first page and next on last page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    const { rerender } = render(
      <LocaleProvider initialLocale="en">
        <PaginationControls page={1} totalPages={3} onPageChange={onPageChange} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.getByTestId("pagination-status")).toHaveTextContent("1 / 3");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(
      <LocaleProvider initialLocale="en">
        <PaginationControls page={3} totalPages={3} onPageChange={onPageChange} />
      </LocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
