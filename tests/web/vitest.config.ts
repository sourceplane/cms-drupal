import { defineConfig } from "vitest/config";
import * as path from "node:path";

// Upstream imports its own modules by bare path (`lib/drupal`,
// `components/…`, `site`) through tsconfig `baseUrl: "."`; the aliases make
// the same specifiers resolve from here.
const app = path.resolve(__dirname, "../../apps/web");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^components\//, replacement: `${app}/components/` },
      { find: /^lib\//, replacement: `${app}/lib/` },
      { find: /^site$/, replacement: `${app}/site.ts` },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
