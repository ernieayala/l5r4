import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

// Globals Foundry v14 assigns without a deprecation warning (roadmap/FOUNDRY-V14-REFERENCE.md §10.4, §11).
// Handlebars is the template library Foundry loads as a global.
const FOUNDRY_GLOBALS = [
  "CONFIG",
  "CONST",
  "Hooks",
  "game",
  "ui",
  "canvas",
  "foundry",
  "Roll",
  "Actor",
  "Item",
  "ChatMessage",
  "Combat",
  "fromUuid",
  "fromUuidSync",
  "getDocumentClass",
  "_loc",
  "_del",
  "_replace",
  "Handlebars"
];

// The Sequencer module's globals, used by module/services/animations/ when that module is active.
const MODULE_GLOBALS = ["Sequencer", "Sequence"];

const readonly = names => Object.fromEntries(names.map(name => [name, "readonly"]));

export default [
  { ignores: ["node_modules/", "dist/*.css", "coverage/", "tests/coverage/"] },
  js.configs.recommended,
  prettier,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...readonly(FOUNDRY_GLOBALS),
        ...readonly(MODULE_GLOBALS)
      }
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",
      "no-var": "error",
      eqeqeq: ["warn", "always", { null: "ignore" }],
      curly: ["warn", "all"],
      "brace-style": ["warn", "1tbs", { allowSingleLine: true }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-throw-literal": "error",
      "no-unreachable": "error",
      "no-duplicate-imports": "warn"
    }
  },
  {
    // Vitest runs in Node.
    files: ["*.config.js", "*.config.mjs", "tests/unit/**/*.js", "tests/*.test.js"],
    languageOptions: { globals: globals.node }
  },
  {
    // Release and maintenance scripts are CommonJS run by Node.
    files: ["scripts/**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node }
  }
];
