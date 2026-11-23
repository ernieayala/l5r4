import { describe, expect, it } from "vitest";
import {
  codeSpansOf,
  getFixtureTrees,
  getRepoTree,
  registerConventionSuite,
  tableAfter
} from "../../tools/conventions/shared.mjs";

/** Where the written reasons for over-limit files live. */
const EXCEPTIONS = "tests/conventions/exceptions.json";

/**
 * Each layer's soft line limit, from the Size table of docs/code-system/modules.md.
 * @returns {{prefix: string, limit: number}[]} The limits, longest prefix first
 */
function limitsOf() {
  return tableAfter(getRepoTree().text("docs/code-system/modules.md"), "Size")
    .map(row => ({ prefix: codeSpansOf(row.Layer)[0], limit: Number(row.Limit) }))
    .sort((a, b) => b.prefix.length - a.prefix.length);
}

/**
 * A file's line count, a final newline not counted as a line.
 * @param {string} text - The file's text
 * @returns {number} The line count
 */
function lineCountOf(text) {
  return text.replace(/\n$/, "").split("\n").length;
}

/**
 * The over-limit files of a tree, each with its count and limit.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{path: string, lines: number, limit: number}[]} The files over their layer's limit
 */
function overLimitOf(tree) {
  const limits = limitsOf();
  return [...tree.files("module", /\.js$/), ...tree.files("dist", /\.js$/)].flatMap(path => {
    const layer = limits.find(({ prefix }) => path === prefix || path.startsWith(prefix));
    const lines = lineCountOf(tree.text(path));
    return layer && lines > layer.limit ? [{ path, lines, limit: layer.limit }] : [];
  });
}

/**
 * The written reasons of a tree's exceptions file.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {Record<string, string>} Reason by path
 */
function exceptionsOf(tree) {
  return tree.has(EXCEPTIONS) ? JSON.parse(tree.text(EXCEPTIONS)) : {};
}

/** docs/code-system/modules.md, Size: a file over its layer's limit carries a written reason. */
const RULES = {
  "size/over-limit": tree => {
    const reasons = exceptionsOf(tree);
    return overLimitOf(tree)
      .filter(({ path }) => !reasons[path]?.trim())
      .map(
        ({ path, lines, limit }) =>
          `${path}: ${lines} lines over the limit ${limit}, with no reason in ${EXCEPTIONS}`
      );
  },

  "size/stale-exception": tree => {
    const over = new Set(overLimitOf(tree).map(({ path }) => path));
    return Object.keys(exceptionsOf(tree))
      .filter(path => !over.has(path))
      .map(path => `${EXCEPTIONS} lists ${path}, which is within its limit or gone`);
  }
};

registerConventionSuite("File size", RULES, "size");

describe("File size exceptions", () => {
  it("should fail an over-limit file once its exception entry is removed", () => {
    const { good } = getFixtureTrees("size");
    expect(RULES["size/over-limit"](good)).toEqual([]);
    const listed = Object.keys(exceptionsOf(good));
    expect(listed.length).toBeGreaterThan(0);
    const without = Object.create(good, {
      has: { value: path => path !== EXCEPTIONS && good.has(path) }
    });
    expect(RULES["size/over-limit"](without).length).toBe(listed.length);
  });
});
