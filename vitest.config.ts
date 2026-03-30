import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url).href);
const rootAlias = root.endsWith("/") ? root : `${root}/`;

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: rootAlias,
      },
      {
        find: /^react-native$/,
        replacement: "react-native-web",
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    include: [
      "src/test/**/*.test.ts",
      "src/test/**/*.test.tsx",
      "src/hooks/**/*.test.ts",
      "src/hooks/**/*.test.tsx",
      "convex/**/*.test.ts",
    ],
  },
});
