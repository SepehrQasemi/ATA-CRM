/* @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutocompleteInput } from "@/components/autocomplete-input";

describe("AutocompleteInput", () => {
  it("shows up to five unique suggestions and supports selection", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <AutocompleteInput
        value="Ap"
        onChange={handleChange}
        suggestions={["Apple", "Apricot", "apple", "Application", "Approve", "Apex", "Banana"]}
        placeholder="Search"
        listId="suggestion-list"
      />,
    );

    const input = screen.getByPlaceholderText("Search");
    await user.click(input);

    const options = await screen.findAllByRole("button");
    expect(options).toHaveLength(5);
    expect(options.map((option) => option.textContent)).toEqual([
      "Apple",
      "Apricot",
      "Application",
      "Approve",
      "Apex",
    ]);

    await user.click(screen.getByRole("button", { name: "Apricot" }));
    expect(handleChange).toHaveBeenCalledWith("Apricot");
  });
});
