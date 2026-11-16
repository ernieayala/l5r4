import { posix } from "node:path";
import { describe, expect, it } from "vitest";
import {
  codeSpansOf,
  getFixtureTrees,
  getRepoTree,
  parseScss,
  registerConventionSuite,
  tableAfter
} from "../../tools/conventions/shared.mjs";

const { basename } = posix;

/** The stylesheet that declares every token (docs/design-system/foundations/color.md, rule C2). */
const VARIABLES = "scss/base/_variables.scss";

/** The one folder that may hold literal colors, layers, and spacing (docs/code-system/templates-and-styles.md). */
const BASE = "scss/base/";

/** Chat card files whose block is a fixed class (docs/design-system/components/README.md). */
const FIXED_BLOCKS = Object.freeze({
  "request-card": "l5r4-check-request",
  "check-card": "l5r4-check",
  "item-summary-card": "l5r4-item-summary"
});

/** Properties on the space scale (docs/design-system/foundations/space-and-size.md, rule S1). */
const SPACE_PROPERTY = /^(gap|row-gap|column-gap|margin|padding)(-.+)?$/;

/** Properties that carry motion (docs/design-system/foundations/motion.md). */
const MOTION_PROPERTY = /^(transition|animation)(-duration|-timing-function)?$/;

/** A literal duration or easing keyword. */
const MOTION_LITERAL =
  /(^|[\s,(])(\d*\.?\d+m?s|ease(-in|-out|-in-out)?|linear|cubic-bezier\(|steps\(\s*\d)/;

/** A literal color, a core color variable, or a palette primitive (color.md, rule C3). */
const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(|var\(--color-|var\(--l5r4-palette-/;

/** CSS-wide keywords any property may take. */
const CSS_WIDE = Object.freeze(["inherit", "initial", "unset", "revert"]);

/** The Ring names, which a class carries as a modifier, never inside its name (docs/code-system/naming.md). */
const RINGS = Object.freeze(["air", "water", "earth", "fire", "void"]);

/** Each stylesheet's parsed blocks and statements, per tree. */
const parsedSheets = new WeakMap();

/**
 * The stylesheets of a tree, parsed once.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{path: string, blocks: object[], statements: object[]}[]} The parsed files
 */
function sheetsOf(tree) {
  if (!parsedSheets.has(tree)) {
    parsedSheets.set(
      tree,
      tree.files("scss", /\.scss$/).map(path => ({ path, ...parseScss(tree.text(path)) }))
    );
  }
  return parsedSheets.get(tree);
}

/**
 * The declarations of the stylesheets outside `scss/base/`.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{path: string, prop: string, value: string, chain: string[], line: number}[]} The declarations
 */
function componentDeclarationsOf(tree) {
  return sheetsOf(tree)
    .filter(({ path }) => !path.startsWith(BASE))
    .flatMap(({ path, statements }) =>
      statements.filter(statement => statement.prop).map(statement => ({ path, ...statement }))
    );
}

/**
 * Split a value or selector list at its top-level separators.
 * @param {string} text - The value or selector
 * @param {RegExp} separator - A one-character separator: /,/ or /\s/
 * @returns {string[]} The parts, trimmed, empty ones dropped
 */
function splitTop(text, separator) {
  const parts = [];
  let depth = 0;
  let part = "";
  for (const char of text) {
    depth += char === "(" ? 1 : char === ")" ? -1 : 0;
    if (depth === 0 && separator.test(char)) {
      parts.push(part);
      part = "";
    } else {
      part += char;
    }
  }
  parts.push(part);
  return parts.map(each => each.trim()).filter(Boolean);
}

/**
 * The `--l5r4-*` tokens declared in a tree's variables file.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{prop: string, value: string, chain: string[], line: number}[]} The declarations
 */
function declaredTokensOf(tree) {
  const sheet = sheetsOf(tree).find(({ path }) => path === VARIABLES);
  return sheet ? sheet.statements.filter(statement => statement.prop?.startsWith("--l5r4-")) : [];
}

/**
 * The class names a selector list names.
 * @param {string} selector - The selector list
 * @returns {string[]} The class names, without the dot
 */
function classesIn(selector) {
  return [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(([, name]) => name);
}

/**
 * The block class a component or app file styles: its file name with `l5r4-`, or a fixed card block.
 * @param {string} path - The stylesheet
 * @returns {string} The block class
 */
function blockOf(path) {
  const name = basename(path)
    .replace(/^_/, "")
    .replace(/\.scss$/, "");
  return FIXED_BLOCKS[name] ?? `l5r4-${name}`;
}

/**
 * The fixed chat-card classes: posted messages store them, so they keep their names and rules and sit outside a
 * file's block (docs/code-system/naming.md, Fixed names; templates-and-styles.md, Stylesheets).
 * @returns {string[]} The class names, without the dot
 */
function fixedCardClassesOf() {
  const row = tableAfter(getRepoTree().text("docs/code-system/naming.md"), "Fixed names").find(
    entry => entry.Kind === "Chat card classes"
  );
  return codeSpansOf(row.Names);
}

/**
 * Whether a selector starts with a fixed chat-card class.
 * @param {string} selector - One selector of a list
 * @param {string[]} fixed - The fixed chat-card classes
 * @returns {boolean} True when its first compound names one
 */
function isFixedCardSelector(selector, fixed) {
  const first = /^\.(-?[_a-zA-Z][\w-]*)/.exec(selector)?.[1];
  return Boolean(first) && fixed.includes(first);
}

/**
 * Whether a selector is an at-rule prelude rather than a style rule.
 * @param {string} prelude - The block prelude
 * @returns {boolean} True for `@media`, `@keyframes`, and the rest
 */
function isAtRule(prelude) {
  return prelude.startsWith("@");
}

/**
 * The one selector that sits under no system block, by file (docs/code-system/templates-and-styles.md, Stylesheets):
 * the posted item card's root `item` also roots every sheet item row, so core's message wrapper tells the card apart.
 */
const UNSCOPED = Object.freeze({ "scss/components/_chat-card.scss": ".message-content .item" });

/**
 * Whether a top-level block is the file's named unscoped selector: one selector, no declarations of its own, and
 * every child block joined to it gives exactly the name in `UNSCOPED`.
 * @param {{path: string, blocks: object[], statements: object[]}} sheet - The parsed file
 * @param {string} prelude - The top-level block's selector
 * @returns {boolean} True for the named exemption
 */
function isNamedUnscoped({ path, blocks, statements }, prelude) {
  const named = UNSCOPED[path];
  const children = blocks
    .filter(({ chain }) => chain.length === 2 && chain[0] === prelude)
    .flatMap(({ chain }) => splitTop(chain[1], /,/));
  return (
    Boolean(named) &&
    splitTop(prelude, /,/).length === 1 &&
    !statements.some(({ chain }) => chain.length === 1 && chain[0] === prelude) &&
    children.length > 0 &&
    children.every(child => `${prelude} ${child}` === named)
  );
}

/** docs/code-system/templates-and-styles.md, Stylesheets; docs/design-system/foundations/. */
const RULES = {
  "styles/block-class": tree =>
    sheetsOf(tree)
      .filter(({ path }) => !path.startsWith(BASE))
      .flatMap(sheet =>
        sheet.blocks
          .filter(({ chain }) => chain.length === 1 && !isAtRule(chain[0]))
          .filter(({ chain }) => !isNamedUnscoped(sheet, chain[0]))
          .flatMap(({ chain, line }) =>
            splitTop(chain[0], /,/)
              .filter(selector => !/^\.l5r4-[a-z0-9-]+/.test(selector))
              .map(
                selector => `${sheet.path}:${line}: "${selector}" sits under no l5r4- block class`
              )
          )
      ),

  "styles/one-component": tree => {
    const fixed = fixedCardClassesOf();
    return sheetsOf(tree)
      .filter(({ path }) => /^scss\/(components|apps)\//.test(path))
      .flatMap(sheet => {
        const { path, blocks } = sheet;
        const block = blockOf(path);
        return blocks
          .filter(({ chain }) => chain.length === 1 && !isAtRule(chain[0]))
          .filter(({ chain }) => !isNamedUnscoped(sheet, chain[0]))
          .flatMap(({ chain, line }) =>
            splitTop(chain[0], /,/)
              .filter(selector => !isFixedCardSelector(selector, fixed))
              .filter(selector => !new RegExp(`^\\.${block}(?![\\w])|^\\.${block}-`).test(selector))
              .map(selector => `${path}:${line}: "${selector}" is not the file's block .${block}`)
          );
      });
  },

  "styles/empty-file": tree =>
    sheetsOf(tree)
      .filter(({ path }) => path !== "scss/l5r4-enhanced.scss")
      .filter(
        ({ statements }) =>
          !statements.some(statement => statement.prop || statement.text.startsWith("@include"))
      )
      .map(({ path }) => `${path}: compiles to nothing`),

  "styles/literal-color": tree =>
    componentDeclarationsOf(tree)
      .filter(({ prop, value }) => !prop.startsWith("$") && LITERAL_COLOR.test(value))
      .map(
        ({ path, line, prop, value }) =>
          `${path}:${line}: ${prop}: ${value} is a literal color; read a --l5r4-color-* token`
      ),

  "styles/rgb-triplet": tree =>
    sheetsOf(tree).flatMap(({ path, statements }) =>
      statements
        .filter(({ value }) => value && /\brgba?\(\s*var\(/.test(value))
        .map(
          ({ line, prop, value }) =>
            `${path}:${line}: ${prop}: ${value} wraps an RGB triplet; use color-mix`
        )
    ),

  "styles/z-index": tree =>
    componentDeclarationsOf(tree)
      .filter(
        ({ prop, value }) => prop === "z-index" && !/^var\(--l5r4-layer-[\w-]+\)$/.test(value)
      )
      .map(
        ({ path, line, value }) =>
          `${path}:${line}: z-index: ${value} reads no --l5r4-layer-* token`
      ),

  "styles/space-scale": tree =>
    componentDeclarationsOf(tree)
      .filter(({ prop }) => SPACE_PROPERTY.test(prop))
      .filter(({ value }) =>
        splitTop(value.replace(/\s*!important$/, ""), /\s/).some(
          part =>
            !["0", "auto", ...CSS_WIDE].includes(part) &&
            !/^var\(--l5r4-space-[\w-]+\)$/.test(part) &&
            !/^calc\(-1 \* var\(--l5r4-space-[\w-]+\)\)$/.test(part)
        )
      )
      .map(
        ({ path, line, prop, value }) =>
          `${path}:${line}: ${prop}: ${value} is off the --l5r4-space-* scale`
      ),

  "styles/motion-token": tree =>
    componentDeclarationsOf(tree)
      .filter(({ prop, value }) => MOTION_PROPERTY.test(prop) && value !== "none")
      .filter(({ value }) => MOTION_LITERAL.test(value) || !/--l5r4-(duration|easing)-/.test(value))
      .map(
        ({ path, line, prop, value }) => `${path}:${line}: ${prop}: ${value} reads no motion token`
      ),

  "styles/reduced-motion": tree => {
    const sheets = sheetsOf(tree);
    const outside = sheets
      .filter(({ path }) => path !== VARIABLES)
      .flatMap(({ path, blocks }) =>
        blocks
          .filter(({ chain }) => chain.at(-1).includes("prefers-reduced-motion"))
          .map(({ line }) => `${path}:${line}: a reduced-motion rule outside ${VARIABLES}`)
      );
    const reduced = declaredTokensOf(tree).filter(
      ({ chain, value }) =>
        chain.some(prelude => prelude.includes("prefers-reduced-motion")) && /^0m?s$/.test(value)
    );
    const durations = [...new Set(declaredTokensOf(tree).map(({ prop }) => prop))].filter(prop =>
      prop.startsWith("--l5r4-duration-")
    );
    const unzeroed = durations
      .filter(prop => !reduced.some(token => token.prop === prop))
      .map(prop => `${VARIABLES}: ${prop} is not set to 0ms in the prefers-reduced-motion block`);
    const animated = sheets.some(({ statements }) =>
      statements.some(({ prop }) => prop && MOTION_PROPERTY.test(prop))
    );
    const missing =
      animated && !reduced.length
        ? [`${VARIABLES}: no prefers-reduced-motion block zeroes the durations`]
        : [];
    return [...outside, ...unzeroed, ...missing];
  },

  "styles/token-declared": tree => {
    const declared = new Set(declaredTokensOf(tree).map(({ prop }) => prop));
    return sheetsOf(tree).flatMap(({ path, statements }) =>
      statements.flatMap(({ value, line }) =>
        [...(value ?? "").matchAll(/var\((--l5r4-[\w-]+)/g)]
          .filter(([, token]) => !declared.has(token))
          .map(([, token]) => `${path}:${line}: ${token} is read but not declared in ${VARIABLES}`)
      )
    );
  },

  "styles/token-location": tree =>
    sheetsOf(tree)
      .filter(({ path }) => path !== VARIABLES)
      .flatMap(({ path, statements }) =>
        statements
          .filter(({ prop }) => prop?.startsWith("--"))
          .map(({ line, prop }) => `${path}:${line}: ${prop} is declared outside ${VARIABLES}`)
      ),

  "styles/token-name": tree =>
    sheetsOf(tree).flatMap(({ path, statements }) =>
      statements
        .filter(({ prop }) => prop?.startsWith("--") && !/^--l5r4-[a-z]+(-[a-z0-9]+)+$/.test(prop))
        .map(({ line, prop }) => `${path}:${line}: ${prop} is not --l5r4-{category}-{name}`)
    ),

  "styles/token-used": tree => {
    const read = sheetsOf(tree)
      .flatMap(({ statements }) => statements.map(({ value }) => value ?? ""))
      .join("\n");
    return [...new Set(declaredTokensOf(tree).map(({ prop }) => prop))]
      .filter(prop => !read.includes(`var(${prop})`) && !read.includes(`var(${prop},`))
      .map(prop => `${VARIABLES}: ${prop} is declared but never read`);
  },

  "styles/token-documented": tree => {
    const docs = tree
      .files("docs/design-system/foundations", /\.md$/)
      .map(path => tree.text(path))
      .join("\n");
    return [...new Set(declaredTokensOf(tree).map(({ prop }) => prop))]
      .filter(prop => !docs.includes(`\`${prop}\``))
      .map(prop => `${VARIABLES}: ${prop} is not documented in docs/design-system/foundations/`);
  },

  "styles/theme-blocks": tree =>
    declaredTokensOf(tree)
      .filter(({ chain }) => chain.length === 1 && chain[0] === ":root")
      .filter(({ value }) => /var\(--(?!l5r4-)/.test(value))
      .map(
        ({ prop, line }) =>
          `${VARIABLES}:${line}: ${prop} reads a core variable on :root; declare it per theme`
      ),

  "styles/radius": tree =>
    componentDeclarationsOf(tree)
      .filter(({ prop }) => /^border(-[a-z]+)*-radius$/.test(prop))
      .filter(({ value }) =>
        splitTop(value, /\s/).some(
          part => part !== "0" && !/^var\(--l5r4-radius-[\w-]+\)$/.test(part)
        )
      )
      .map(
        ({ path, line, prop, value }) =>
          `${path}:${line}: ${prop}: ${value} reads no --l5r4-radius-* token`
      ),

  "styles/state-token": tree =>
    componentDeclarationsOf(tree)
      .filter(
        ({ chain }) =>
          /:(hover|active|focus-visible|disabled)\b/.test(chain.at(-1)) &&
          chain.some(c => c.includes(".l5r4-"))
      )
      .filter(
        ({ prop, value }) =>
          /^(filter|transform|outline|box-shadow|opacity)$/.test(prop) &&
          !/var\(--l5r4-state-/.test(value)
      )
      .map(
        ({ path, line, prop, value }) =>
          `${path}:${line}: ${prop}: ${value} in a state rule reads no --l5r4-state-* token`
      ),

  "styles/focus-within": tree =>
    componentDeclarationsOf(tree)
      .filter(({ prop, value }) => prop === "opacity" && value === "1")
      .filter(({ chain }) => {
        const hover = [...chain].reverse().find(prelude => prelude.includes(":hover"));
        return hover && !hover.includes(":focus-within");
      })
      .map(
        ({ path, line }) =>
          `${path}:${line}: a control shown on :hover is not shown on :focus-within`
      ),

  "styles/ring-variant": tree =>
    sheetsOf(tree).flatMap(({ path, blocks }) =>
      blocks
        .filter(({ chain }) => !isAtRule(chain.at(-1)))
        .flatMap(({ chain, line }) =>
          classesIn(chain.at(-1))
            .filter(name => !name.startsWith("-"))
            .filter(name => {
              const parts = name.split("-");
              return parts.includes("ring") && parts.some(part => RINGS.includes(part));
            })
            .map(name => `${path}:${line}: .${name} folds a Ring into the class name; use .-<ring>`)
        )
    ),

  "styles/scss-variable": tree =>
    sheetsOf(tree)
      .filter(({ path }) => path !== VARIABLES)
      .flatMap(({ path, statements }) =>
        statements
          .filter(({ prop }) => prop?.startsWith("$"))
          .map(({ line, prop }) => `${path}:${line}: ${prop} is declared outside ${VARIABLES}`)
      )
};

registerConventionSuite("Stylesheets", RULES, "styles");

describe("The named unscoped selector", () => {
  it.each(["styles/block-class", "styles/one-component"])(
    "should fail %s on a selector the exemption does not name",
    key => {
      const found = RULES[key](getFixtureTrees("styles").bad).filter(line =>
        line.startsWith("scss/components/_chat-card.scss:")
      );
      expect(found).toEqual([expect.stringContaining('".message-content"')]);
    }
  );
});
