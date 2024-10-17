import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["example/**", "node_modules/**", "dist/**"],
  },
});
