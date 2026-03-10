export function startsWithSuggestions(items: string[], query: string, limit = 5): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const seen = new Set<string>();
  const unique = items
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return unique
    .filter((item) => item.toLowerCase().startsWith(normalizedQuery))
    .slice(0, limit);
}
