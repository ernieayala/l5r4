import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import {
  FIXTURES,
  REPO,
  expectWithinBaseline,
  readBaseline
} from "../../tools/conventions/shared.mjs";

/** The ESLint fixtures: each violating file with the rule it breaks and the repo path it is linted as. */
const VIOLATING = Object.freeze([
  { rule: "l5r4/naming", file: "naming.js", as: "module/services/example.js" },
  { rule: "l5r4/import-order", file: "import-order.js", as: "module/services/example.js" },
  { rule: "l5r4/module-shape", file: "module-shape.js", as: "module/services/example.js" },
  { rule: "l5r4/member-order", file: "member-order.js", as: "module/apps/example.js" },
  { rule: "l5r4/doc-format", file: "doc-format.js", as: "module/services/example.js" },
  { rule: "l5r4/no-bare-prepare", file: "no-bare-prepare.js", as: "tests/quench/example.js" },
  { rule: "l5r4/joined-title", file: "joined-title.js", as: "module/apps/example.js" },
  { rule: "l5r4/joined-copy", file: "joined-copy.js", as: "module/services/example.js" },
  { rule: "no-restricted-imports", file: "layer-import.js", as: "module/utils/example.js" },
  { rule: "no-restricted-globals", file: "layer-global.js", as: "module/utils/example.js" },
  {
    rule: "no-restricted-properties",
    file: "deprecated-property.js",
    as: "module/services/example.js"
  },
  { rule: "no-restricted-syntax", file: "presentation.js", as: "module/services/example.js" },
  { rule: "no-restricted-syntax", file: "direct-dialog.js", as: "module/services/example.js" },
  { rule: "camelcase", file: "camelcase.js", as: "module/services/example.js" },
  { rule: "new-cap", file: "new-cap.js", as: "module/services/example.js" },
  { rule: "max-params", file: "max-params.js", as: "module/services/example.js" },
  {
    rule: "max-lines-per-function",
    file: "max-lines-per-function.js",
    as: "module/services/example.js"
  },
  { rule: "no-else-return", file: "no-else-return.js", as: "module/services/example.js" },
  { rule: "jsdoc/require-jsdoc", file: "jsdoc-require.js", as: "module/services/example.js" },
  {
    rule: "jsdoc/require-description",
    file: "jsdoc-description.js",
    as: "module/services/example.js"
  },
  { rule: "jsdoc/match-description", file: "jsdoc-sentence.js", as: "module/services/example.js" },
  { rule: "jsdoc/require-param", file: "jsdoc-param.js", as: "module/services/example.js" },
  {
    rule: "jsdoc/check-param-names",
    file: "jsdoc-param-names.js",
    as: "module/services/example.js"
  },
  {
    rule: "jsdoc/require-hyphen-before-param-description",
    file: "jsdoc-hyphen.js",
    as: "module/services/example.js"
  },
  { rule: "jsdoc/require-returns", file: "jsdoc-returns.js", as: "module/services/example.js" },
  {
    rule: "jsdoc/require-returns-check",
    file: "jsdoc-returns-check.js",
    as: "module/services/example.js"
  },
  { rule: "jsdoc/check-types", file: "jsdoc-types.js", as: "module/services/example.js" },
  { rule: "jsdoc/check-tag-names", file: "jsdoc-tags.js", as: "module/services/example.js" }
]);

/** The conforming fixtures: each linted as a file of its layer, with no message from any rule. */
const CONFORMING = Object.freeze([
  { file: "good-service.js", as: "module/services/example.js" },
  { file: "good-app.js", as: "module/apps/example.js" },
  { file: "good-util.js", as: "module/utils/example.js" },
  { file: "good-mixin.js", as: "module/mixins/example-mixin.js" },
  { file: "good-document.js", as: "module/documents/example.js" }
]);

const eslint = new ESLint({ cwd: REPO });

/**
 * Lint a fixture as if it sat at a repo path.
 * @param {string} file - The fixture under tests/fixtures/conventions/eslint/
 * @param {string} as - The repo path whose config applies
 * @returns {Promise<object[]>} The messages
 */
async function lintFixture(file, as) {
  const text = readFileSync(join(FIXTURES, "eslint", file), "utf8");
  const [result] = await eslint.lintText(text, { filePath: join(REPO, as) });
  return result.messages;
}

/** The repo's warnings by rule: warning rules enforce nothing on their own (Stage 17 decision 12). */
const warnings = {};
for (const result of await eslint.lintFiles(["."])) {
  for (const message of result.messages.filter(entry => entry.severity === 1)) {
    const where = `${result.filePath.slice(REPO.length).replaceAll("\\", "/")}:${message.line}`;
    (warnings[message.ruleId] ??= []).push(`${where}: ${message.message}`);
  }
}

const keys = [
  ...new Set([
    ...Object.keys(warnings).map(rule => `eslint/${rule}`),
    ...Object.keys(readBaseline()).filter(key => key.startsWith("eslint/"))
  ])
].sort();

describe("ESLint conventions", () => {
  it.each(keys)("should keep %s at or below its baseline", key => {
    expectWithinBaseline(key, warnings[key.slice("eslint/".length)] ?? []);
  });

  it.each(VIOLATING)("should fail $rule on its violating fixture", async ({ rule, file, as }) => {
    const messages = await lintFixture(file, as);
    expect(messages.map(message => message.ruleId)).toContain(rule);
  });

  it.each(CONFORMING)("should pass every rule on $file", async ({ file, as }) => {
    const messages = await lintFixture(file, as);
    expect(messages.map(message => `${message.ruleId}: ${message.message}`)).toEqual([]);
  });
});
