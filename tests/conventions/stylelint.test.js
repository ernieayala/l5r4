import { readFileSync } from "node:fs";
import { join } from "node:path";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";
import {
  FIXTURES,
  REPO,
  expectWithinBaseline,
  readBaseline
} from "../../tools/conventions/shared.mjs";

/** Each Stylelint rule this stage adds, with its violating fixture (docs/code-system/templates-and-styles.md). */
const VIOLATING = Object.freeze([
  { rule: "order/order", file: "order.scss" },
  { rule: "selector-class-pattern", file: "class-pattern.scss" },
  { rule: "scss/dollar-variable-pattern", file: "dollar-variable.scss" },
  { rule: "selector-attribute-name-disallowed-list", file: "data-action.scss" },
  { rule: "max-nesting-depth", file: "nesting.scss" },
  { rule: "property-disallowed-list", file: "physical-side.scss" },
  { rule: "color-no-hex", file: "hex.scss" },
  { rule: "color-named", file: "named-color.scss" },
  { rule: "declaration-no-important", file: "important.scss" },
  { rule: "at-rule-disallowed-list", file: "extend.scss" },
  { rule: "declaration-property-value-disallowed-list", file: "transition-all.scss" },
  { rule: "declaration-property-value-allowed-list", file: "font-size.scss" }
]);

/** The repo path a fixture is linted as, so the component rules apply. */
const LINT_AS = "scss/components/_sample.scss";

/**
 * Lint a fixture as if it sat at a repo path.
 * @param {string} file - The fixture under tests/fixtures/conventions/stylelint/
 * @returns {Promise<object[]>} The warnings
 */
async function lintFixture(file) {
  const { results } = await stylelint.lint({
    code: readFileSync(join(FIXTURES, "stylelint", file), "utf8"),
    codeFilename: join(REPO, LINT_AS)
  });
  return results[0].warnings;
}

/** The repo's Stylelint warnings by rule: a warning enforces nothing on its own (Stage 17 decision 12). */
const warnings = {};
const { results } = await stylelint.lint({ files: "scss/**/*.scss", cwd: REPO });
for (const result of results) {
  for (const warning of result.warnings.filter(entry => entry.severity === "warning")) {
    const where = `${result.source.slice(REPO.length).replaceAll("\\", "/")}:${warning.line}`;
    (warnings[warning.rule] ??= []).push(`${where}: ${warning.text}`);
  }
}

const keys = [
  ...new Set([
    ...Object.keys(warnings).map(rule => `stylelint/${rule}`),
    ...Object.keys(readBaseline()).filter(key => key.startsWith("stylelint/"))
  ])
].sort();

describe("Stylelint conventions", () => {
  it.each(keys)("should keep %s at or below its baseline", key => {
    expectWithinBaseline(key, warnings[key.slice("stylelint/".length)] ?? []);
  });

  it.each(VIOLATING)("should fail $rule on its violating fixture", async ({ rule, file }) => {
    const found = await lintFixture(file);
    expect(found.map(warning => warning.rule)).toContain(rule);
  });

  it("should pass every rule on the conforming fixture", async () => {
    const found = await lintFixture("good.scss");
    expect(found.map(warning => `${warning.rule}: ${warning.text}`)).toEqual([]);
  });
});
