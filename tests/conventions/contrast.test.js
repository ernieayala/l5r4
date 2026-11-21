import { describe, expect, it } from "vitest";
import {
  codeSpansOf,
  parseScss,
  registerConventionSuite,
  tablesUnder
} from "../../tools/conventions/shared.mjs";

/** The page holding the reference values and the pairings (docs/design-system/foundations/color.md, Contrast). */
const COLOR_PAGE = "docs/design-system/foundations/color.md";

/**
 * Parse a CSS color the reference table writes: `#rgb`, `#rrggbb`, `rgb()`, `rgba()`, or `transparent`.
 * @param {string} text - The color
 * @returns {{r: number, g: number, b: number, a: number}|null} Channels 0-255 and alpha 0-1, or null
 */
function parseColor(text) {
  const value = text.trim().toLowerCase();
  if (value === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map(d => d + d).join("") : hex[1];
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: 1
    };
  }
  const fn = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
    value
  );
  if (fn) {
    return {
      r: Number(fn[1]),
      g: Number(fn[2]),
      b: Number(fn[3]),
      a: fn[4] === undefined ? 1 : Number(fn[4])
    };
  }
  return null;
}

/**
 * Composite a color over an opaque backdrop.
 * @param {{r: number, g: number, b: number, a: number}} top - The color with alpha
 * @param {{r: number, g: number, b: number}} below - The opaque backdrop
 * @returns {{r: number, g: number, b: number, a: number}} The opaque result
 */
function over(top, below) {
  const mix = channel => top[channel] * top.a + below[channel] * (1 - top.a);
  return { r: mix("r"), g: mix("g"), b: mix("b"), a: 1 };
}

/**
 * WCAG 2 relative luminance.
 * @param {{r: number, g: number, b: number}} color - An opaque color
 * @returns {number} The luminance, 0-1
 */
function luminanceOf(color) {
  const linear = channel => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

/**
 * WCAG 2 contrast ratio of two opaque colors.
 * @param {{r: number, g: number, b: number}} a - One color
 * @param {{r: number, g: number, b: number}} b - The other
 * @returns {number} The ratio, 1-21
 */
function contrastOf(a, b) {
  const [light, dark] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The reference values and pairings of a tree's color page.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{references: Map<string, object>, pairings: object[]}} Reference rows by token, and the pairings
 */
function contrastTablesOf(tree) {
  const [references = [], pairings = []] = tablesUnder(tree.text(COLOR_PAGE), "Contrast");
  return {
    references: new Map(references.map(row => [codeSpansOf(row.Token)[0], row])),
    pairings: pairings.map(row => ({
      text: codeSpansOf(row["Text token"])[0],
      surface: codeSpansOf(row["Surface token"])[0],
      theme: row.Theme,
      minimum: Number(row.Minimum)
    }))
  };
}

/**
 * A token's opaque reference color in a theme, composited over its Over token as the page says.
 * @param {Map<string, object>} references - Reference rows by token
 * @param {string} token - The token
 * @param {"light"|"dark"} theme - The theme
 * @param {string[]} [seen] - Tokens already on the chain, to stop a loop
 * @returns {{r: number, g: number, b: number, a: number}|null} The color, or null when it cannot be resolved
 */
function resolveToken(references, token, theme, seen = []) {
  const row = references.get(token);
  const color = row && parseColor(row[theme === "light" ? "Light" : "Dark"].replaceAll("`", ""));
  if (!color || seen.includes(token)) {
    return null;
  }
  if (color.a >= 1) {
    return color;
  }
  const below = codeSpansOf(row.Over ?? "")[0];
  const backdrop = below && resolveToken(references, below, theme, [...seen, token]);
  return backdrop ? over(color, backdrop) : null;
}

/** The stylesheet that declares every token (color.md rule C2). */
const VARIABLES = "scss/base/_variables.scss";

/**
 * The custom property declarations of a stylesheet.
 * @param {string} text - The stylesheet
 * @returns {{prop: string, value: string, chain: string[], line: number}[]} The declarations
 */
function parseScssTokens(text) {
  return parseScss(text).statements.filter(statement => statement.prop?.startsWith("--"));
}

/**
 * The value a token declaration holds, followed through palette primitives, core's palette, and `color-mix` with
 * `transparent`.
 * @param {string} value - The declared value
 * @param {Map<string, string>} literals - Literal values by variable: the palette primitives and core's palette
 * @returns {{r: number, g: number, b: number, a: number}|null} The color, or null when it reads something else
 */
function declaredColorOf(value, literals) {
  const direct = parseColor(value);
  if (direct) {
    return direct;
  }
  const reference = /^var\((--[\w-]+)\)$/.exec(value.trim());
  if (reference) {
    return literals.has(reference[1]) ? parseColor(literals.get(reference[1])) : null;
  }
  const mix = /^color-mix\(in srgb,\s*(.+?)\s+(\d+)%,\s*transparent\)$/.exec(value.trim());
  if (mix) {
    const base = declaredColorOf(mix[1], literals);
    return base ? { ...base, a: base.a * (Number(mix[2]) / 100) } : null;
  }
  return null;
}

/**
 * Whether two parsed colors are the same, within a channel step and an alpha rounding.
 * @param {{r: number, g: number, b: number, a: number}} a - One color
 * @param {{r: number, g: number, b: number, a: number}} b - The other
 * @returns {boolean} True when equal
 */
function sameColor(a, b) {
  return ["r", "g", "b"].every(c => Math.abs(a[c] - b[c]) <= 1) && Math.abs(a.a - b.a) <= 0.01;
}

/**
 * The themes a declaration applies to, from its enclosing selectors.
 * @param {string[]} chain - The declaration's block chain
 * @returns {string[]} "light", "dark", or both
 */
function themesOf(chain) {
  const joined = chain.join(" ");
  if (joined.includes("theme-light")) {
    return ["light"];
  }
  if (joined.includes("theme-dark")) {
    return ["dark"];
  }
  return ["light", "dark"];
}

/** docs/design-system/foundations/color.md, rule C6. */
const RULES = {
  "contrast/scss-value": tree => {
    if (!tree.has(VARIABLES)) {
      return [];
    }
    const page = tree.text(COLOR_PAGE);
    const { references } = contrastTablesOf(tree);
    const literals = new Map();
    for (const row of tablesUnder(page, "Core palette")[0] ?? []) {
      literals.set(codeSpansOf(row["Core variable"])[0], row.Value.replaceAll("`", ""));
    }
    const palette = tablesUnder(page, "Palette primitives")[0] ?? [];
    for (const row of palette) {
      literals.set(codeSpansOf(row.Token)[0], row.Value.replaceAll("`", ""));
    }
    const declarations = parseScssTokens(tree.text(VARIABLES));
    const violations = [];
    for (const { prop, value, chain, line } of declarations) {
      const expected = [];
      if (references.has(prop)) {
        expected.push(
          ...themesOf(chain).map(theme => ({
            theme,
            text: references.get(prop)[theme === "light" ? "Light" : "Dark"]
          }))
        );
      } else if (palette.some(row => codeSpansOf(row.Token)[0] === prop)) {
        expected.push({ theme: "both", text: literals.get(prop) });
      }
      const actual = declaredColorOf(value, literals);
      for (const { theme, text } of expected) {
        const wanted = parseColor(text.replaceAll("`", ""));
        if (actual && wanted && !sameColor(actual, wanted)) {
          violations.push(
            `${VARIABLES}:${line}: ${prop} (${theme}) is ${value}; ${COLOR_PAGE} gives ${text}`
          );
        }
      }
    }
    return violations;
  },

  "contrast/pairing": tree => {
    const { references, pairings } = contrastTablesOf(tree);
    return pairings.flatMap(({ text, surface, theme, minimum }) => {
      const back = resolveToken(references, surface, theme);
      const front = resolveToken(references, text, theme);
      if (!back || !front) {
        return [
          `${text} on ${surface} (${theme}): a token has no reference value the check can resolve`
        ];
      }
      const ratio = contrastOf(front.a < 1 ? over(front, back) : front, back);
      return ratio >= minimum
        ? []
        : [`${text} on ${surface} (${theme}): ${ratio.toFixed(2)}, under ${minimum}`];
    });
  },

  "contrast/both-themes": tree => {
    const { pairings } = contrastTablesOf(tree);
    const themes = new Map();
    for (const { text, surface, theme } of pairings) {
      const key = `${text} on ${surface}`;
      themes.set(key, [...(themes.get(key) ?? []), theme]);
    }
    return [...themes]
      .filter(([, list]) => !list.includes("light") || !list.includes("dark"))
      .map(
        ([key, list]) =>
          `${key}: listed for ${list.join(", ")} only; every pairing is checked in both themes`
      );
  }
};

registerConventionSuite("Contrast", RULES, "contrast");

describe("Contrast ratios", () => {
  it("should compute the WCAG ratio of black on white as 21", () => {
    expect(contrastOf(parseColor("#000"), parseColor("#ffffff"))).toBeCloseTo(21, 5);
  });
});
