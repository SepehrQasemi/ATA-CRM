import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "lib/auth.ts",
        "lib/i18n.ts",
        "lib/pagination.ts",
        "lib/search-suggestions.ts",
        "components/autocomplete-input.tsx",
        "components/data-state.tsx",
        "components/locale-provider.tsx",
        "components/notification-bell.tsx",
        "components/pagination-controls.tsx",
        "app/api/leads/*/route.ts",
        "app/api/tasks/route.ts",
        "app/api/tasks/*/route.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
