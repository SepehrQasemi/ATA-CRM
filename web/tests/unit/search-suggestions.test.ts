import { describe, expect, it } from "vitest";
import { startsWithSuggestions } from "@/lib/search-suggestions";

describe("startsWithSuggestions", () => {
  it("returns empty array for empty query", () => {
    expect(startsWithSuggestions(["Alpha", "Beta"], "")).toEqual([]);
    expect(startsWithSuggestions(["Alpha", "Beta"], "   ")).toEqual([]);
  });

  it("returns case-insensitive prefix matches", () => {
    expect(startsWithSuggestions(["Alpha", "Alpine", "Beta"], "al")).toEqual([
      "Alpha",
      "Alpine",
    ]);
  });

  it("deduplicates values and applies limit", () => {
    const items = ["Apple", "apple", "Application", "Appraise", "Approach", "Appendix", "Banana"];
    expect(startsWithSuggestions(items, "app", 5)).toEqual([
      "Apple",
      "Application",
      "Appraise",
      "Approach",
      "Appendix",
    ]);
  });
});
