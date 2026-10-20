import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-undef": "off",
    },
  },
  {
    files: ["lib/simulators/aws/engine.ts"],
    rules: {
      "no-useless-escape": "off",
    },
  },
  {
    files: ["scripts/remote-setup.mjs"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^yesNo$" }],
      "no-empty": ["error", { "allowEmptyCatch": true }],
    },
  },
  globalIgnores([".next/**", "node_modules/**", "coverage/**"]),
]);
