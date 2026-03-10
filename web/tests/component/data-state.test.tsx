/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataState } from "@/components/data-state";

describe("DataState", () => {
  it("renders loading state", () => {
    render(<DataState state="loading" />);
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<DataState state="empty" />);
    expect(screen.getByText("No data found.")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(<DataState state="error" message="Failed to load" />);
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });
});
