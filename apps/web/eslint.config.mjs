// Upstream lints with `next lint` (gone in Next 16) and no config of its own;
// the port lints with the workspace's shared config. The template's
// components take untyped props and leave some parameters unread; both are
// kept as written.
import config from "../../tooling/eslint/index.js";

export default [
  ...config,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
