import { describe, expect, it } from "vitest";
import {
  codeSpansOf,
  getFixtureTrees,
  getRepoTree,
  lineOf,
  registerConventionSuite,
  tableAfter
} from "../../tools/conventions/shared.mjs";

/** A mustache expression, which may hold quotes and `>` of its own. */
const MUSTACHE = String.raw`\{\{[\s\S]*?\}\}`;

/** An HTML start tag: its name, its attributes (mustache included), and a self-closing slash. */
const TAG = new RegExp(
  String.raw`<([a-zA-Z][\w-]*)((?:[^>"'{]|"(?:[^"{]|${MUSTACHE})*"|'[^']*'|${MUSTACHE})*)>`,
  "g"
);

/** Native controls, which take focus and keyboard input on their own. */
const NATIVE_CONTROLS = Object.freeze(["button", "input", "select", "textarea"]);

/** Font Awesome style classes other than `fa-solid` (docs/design-system/foundations/iconography.md, rule 1). */
const OTHER_FA_STYLES = /^(fas|far|fab|fal|fad|fa-regular|fa-light|fa-duotone|fa-thin)$/;

/** Attributes whose value a user reads or hears. */
const TEXT_ATTRIBUTES = Object.freeze([
  "placeholder",
  "aria-label",
  "data-tooltip",
  "title",
  "alt",
  "label"
]);

/** Templates whose classes include the fixed classes of posted chat cards. */
const CARD_TEMPLATES = /^templates\/(chat|cards)\//;

/** Lines in a row that count as markup repeated in a second place (docs/code-system/templates-and-styles.md). */
const REPEAT_WINDOW = 8;

/**
 * The code spans of one row of naming.md's Fixed names table.
 * @param {string} kind - The row's Kind cell
 * @returns {string[]} The names it lists
 */
function fixedNamesOf(kind) {
  const row = tableAfter(getRepoTree().text("docs/code-system/naming.md"), "Fixed names").find(
    entry => entry.Kind === kind
  );
  return codeSpansOf(row.Names);
}

/**
 * The Font Awesome aliases the system does not write (iconography.md, rule 2).
 * @returns {string[]} The alias class names
 */
function faAliasesOf() {
  const page = getRepoTree().text("docs/design-system/foundations/iconography.md");
  return tableAfter(page, "2. Canonical names, not aliases").flatMap(row =>
    codeSpansOf(row["Alias (do not write)"])
  );
}

/**
 * A template with its Handlebars comments blanked, so offsets keep their lines.
 * @param {string} text - The template
 * @returns {string} The template with `{{!-- --}}` and `{{! }}` replaced by spaces
 */
function withoutComments(text) {
  return text.replace(/\{\{!--[\s\S]*?--\}\}|\{\{![\s\S]*?\}\}/g, comment =>
    comment.replace(/[^\n]/g, " ")
  );
}

/**
 * The start tags of a template.
 * @param {string} text - The template, comments blanked
 * @returns {{name: string, attrs: string, index: number}[]} Each tag's name, attribute text, and offset
 */
function tagsOf(text) {
  return [...text.matchAll(TAG)].map(match => ({
    name: match[1].toLowerCase(),
    attrs: match[2],
    index: match.index
  }));
}

/**
 * Whether a tag carries an attribute.
 * @param {string} attrs - The tag's attribute text
 * @param {string} name - The attribute
 * @returns {boolean} True when present
 */
function hasAttribute(attrs, name) {
  return new RegExp(String.raw`(^|[\s}])${name}(=|[\s{]|$)`).test(attrs);
}

/**
 * An attribute's raw value.
 * @param {string} attrs - The tag's attribute text
 * @param {string} name - The attribute
 * @returns {string|null} The value between the quotes, or null
 */
function attributeOf(attrs, name) {
  const match = new RegExp(String.raw`(?:^|[\s}])${name}="((?:[^"{]|${MUSTACHE})*)"`).exec(attrs);
  return match ? match[1] : null;
}

/**
 * The static class names of a tag: its class attribute with every mustache expression removed.
 * @param {string} attrs - The tag's attribute text
 * @returns {string[]} The class tokens
 */
function classesOf(attrs) {
  const value = attributeOf(attrs, "class");
  return value ? value.replace(new RegExp(MUSTACHE, "g"), " ").split(/\s+/).filter(Boolean) : [];
}

/**
 * Every template of a tree with its comment-free text.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{path: string, text: string}[]} The templates
 */
function templatesOf(tree) {
  return tree
    .files("templates", /\.hbs$/)
    .map(path => ({ path, text: withoutComments(tree.text(path)) }));
}

/**
 * Collect one violation per matching tag.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @param {(tag: object, path: string) => string|null} check - A message for a violating tag, or null
 * @returns {string[]} The violations
 */
function perTag(tree, check) {
  return templatesOf(tree).flatMap(({ path, text }) =>
    tagsOf(text).flatMap(tag => {
      const message = check(tag, path);
      return message ? [`${path}:${lineOf(text, tag.index)}: ${message}`] : [];
    })
  );
}

/**
 * Whether a class name is one the system may write: an `l5r4-` block or element, a variant or state modifier, a
 * Font Awesome class, a core class, or a fixed chat-card class inside a card template.
 * @param {string} name - The class
 * @param {string} path - The template
 * @returns {boolean} True when allowed
 */
function isAllowedClass(name, path) {
  if (
    name === "l5r4" ||
    name.startsWith("l5r4-") ||
    name.startsWith("-") ||
    name.startsWith("is-")
  ) {
    return true;
  }
  if (name.startsWith("fa-") || OTHER_FA_STYLES.test(name)) {
    return true;
  }
  if (fixedNamesOf("Core-owned names").includes(name)) {
    return true;
  }
  return CARD_TEMPLATES.test(path) && fixedNamesOf("Chat card classes").includes(name);
}

/**
 * The inner content of each `<button>` and `<a>` element, with its start tag.
 * @param {string} text - The template, comments blanked
 * @returns {{name: string, attrs: string, inner: string, index: number}[]} The controls
 */
function controlsOf(text) {
  const pattern = new RegExp(
    String.raw`<(button|a)\b((?:[^>"'{]|"(?:[^"{]|${MUSTACHE})*"|'[^']*'|${MUSTACHE})*)>([\s\S]*?)</\1>`,
    "g"
  );
  return [...text.matchAll(pattern)].map(match => ({
    name: match[1],
    attrs: match[2],
    inner: match[3],
    index: match.index
  }));
}

/**
 * Whether a control's content shows no text: only icons, images, and block helpers.
 * @param {string} inner - The content between the tags
 * @returns {boolean} True for an icon-only control
 */
function isIconOnly(inner) {
  const rest = inner
    .replace(/<i\b[^>]*>\s*<\/i>/g, "")
    .replace(/<img\b[^>]*>/g, "")
    .replace(/\{\{[#/^]?(?:if|unless|else|each|with)\b[^}]*\}\}|\{\{else\}\}|\{\{\/\w+\}\}/g, "")
    .trim();
  return /<i\b/.test(inner) && rest === "";
}

/**
 * The text a template shows outside tags and mustache expressions, one entry per run of words.
 * @param {string} text - The template, comments blanked
 * @returns {{words: string, index: number}[]} The literal text runs
 */
function literalTextOf(text) {
  const blanked = text
    .replace(TAG, tag => tag.replace(/[^\n]/g, " "))
    .replace(/<\/[a-zA-Z][\w-]*\s*>/g, tag => tag.replace(/[^\n]/g, " "))
    .replace(/\{\{\{[\s\S]*?\}\}\}|\{\{[\s\S]*?\}\}/g, mustache => mustache.replace(/[^\n]/g, " "))
    .replace(/&[#\w]+;/g, entity => " ".repeat(entity.length));
  return [...blanked.matchAll(/[A-Za-z][A-Za-z'’]+(?:[ \t]+[A-Za-z][A-Za-z'’]*)*/g)].map(match => ({
    words: match[0],
    index: match.index
  }));
}

/**
 * The localize calls a run of text joins: each `{{localize ...}}` counts once, its own subexpressions being its
 * placeholders' values, and each `(localize ...)` inside any other mustache counts once.
 * @param {string} run - A text node or an attribute value
 * @returns {number} The joined calls
 */
function localizeCallsIn(run) {
  return [...run.matchAll(new RegExp(MUSTACHE, "g"))].reduce(
    (count, [mustache]) =>
      count +
      (/^\{\{~?localize\b/.test(mustache) ? 1 : [...mustache.matchAll(/\(localize\b/g)].length),
    0
  );
}

/**
 * The runs of a template one label can occupy: each attribute value and each text node between tags. A run splits
 * at `{{else}}`, whose branches never render together; a partial include is markup, not text, so it drops out.
 * @param {string} text - The template, comments blanked
 * @returns {{run: string, index: number}[]} The runs with their offsets
 */
function labelRunsOf(text) {
  const attribute = new RegExp(String.raw`[\w:-]+="((?:[^"{]|${MUSTACHE})*)"`, "g");
  const values = tagsOf(text).flatMap(({ name, attrs, index }) =>
    [...attrs.matchAll(attribute)].map(match => ({
      run: match[1],
      index: index + 1 + name.length + match.index + match[0].indexOf('"') + 1
    }))
  );
  const nodes = [];
  const blanked = text
    .replace(TAG, tag => tag.replace(/[^\n]/g, "<"))
    .replace(/<\/[a-zA-Z][\w-]*\s*>/g, tag => tag.replace(/[^\n]/g, "<"))
    .replace(/\{\{>[\s\S]*?\}\}/g, include => include.replace(/[^\n]/g, " "));
  for (const match of blanked.matchAll(/[^<]+/g)) {
    nodes.push({ run: match[0], index: match.index });
  }
  return [...values, ...nodes].flatMap(({ run, index }) =>
    [...run.matchAll(/(?:(?!\{\{else\b)[\s\S])+/g)].map(part => ({
      run: part[0],
      index: index + part.index
    }))
  );
}

/**
 * Markup repeated in a second place: runs of identical lines across the templates.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {string[]} One violation per repeated run
 */
function repeatedMarkupOf(tree) {
  const files = templatesOf(tree).map(({ path, text }) => ({
    path,
    lines: text
      .split("\n")
      .map((line, i) => ({ text: line.trim(), number: i + 1 }))
      .filter(line => line.text)
  }));
  const seen = new Map();
  for (const { path, lines } of files) {
    for (let i = 0; i + REPEAT_WINDOW <= lines.length; i++) {
      const key = lines
        .slice(i, i + REPEAT_WINDOW)
        .map(line => line.text)
        .join("\n");
      seen.set(key, [...(seen.get(key) ?? []), { path, at: i, line: lines[i].number }]);
    }
  }
  const violations = [];
  for (const { path, lines } of files) {
    let last = -REPEAT_WINDOW;
    for (let i = 0; i + REPEAT_WINDOW <= lines.length; i++) {
      const key = lines
        .slice(i, i + REPEAT_WINDOW)
        .map(line => line.text)
        .join("\n");
      const others = seen
        .get(key)
        .filter(place => place.path !== path || Math.abs(place.at - i) >= REPEAT_WINDOW);
      if (others.length && i >= last + REPEAT_WINDOW) {
        violations.push(
          `${path}:${lines[i].number}: markup repeated at ${others[0].path}:${others[0].line}; make it a partial`
        );
        last = i;
      }
    }
  }
  return violations;
}

/** docs/code-system/templates-and-styles.md, Structure; docs/design-system/foundations/iconography.md and states.md. */
const RULES = {
  "templates/inline-style": tree =>
    perTag(tree, ({ attrs }) =>
      ["style", "width", "height"].some(name => hasAttribute(attrs, name))
        ? "no style=, width=, or height="
        : null
    ),

  "templates/event-attribute": tree =>
    perTag(tree, ({ attrs }) =>
      /(^|\s)on[a-z]+=/.test(attrs) ? "no on*= handler attribute" : null
    ),

  "templates/script": tree =>
    perTag(tree, ({ name }) => (name === "script" ? "no <script>" : null)),

  "templates/html-comment": tree =>
    tree
      .files("templates", /\.hbs$/)
      .flatMap(path =>
        [...tree.text(path).matchAll(/<!--/g)].map(
          match =>
            `${path}:${lineOf(tree.text(path), match.index)}: a comment is {{!-- --}}, not <!-- -->`
        )
      ),

  "templates/title-attribute": tree =>
    perTag(tree, ({ attrs }) =>
      hasAttribute(attrs, "title") ? "no title=; use data-tooltip (and aria-label)" : null
    ),

  "templates/class-prefix": tree =>
    perTag(tree, ({ attrs }, path) => {
      const bare = classesOf(attrs).filter(name => !isAllowedClass(name, path));
      return bare.length ? `class "${bare.join(" ")}" carries no l5r4- prefix` : null;
    }),

  "templates/modifier-without-block": tree =>
    perTag(tree, ({ attrs }, path) => {
      const classes = classesOf(attrs);
      const fixed = CARD_TEMPLATES.test(path) ? fixedNamesOf("Chat card classes") : [];
      const modifiers = classes.filter(name => /^(-|is-)/.test(name) && !fixed.includes(name));
      return modifiers.length && !classes.some(name => name.startsWith("l5r4-"))
        ? `modifier "${modifiers.join(" ")}" sits on an element with no l5r4- block class`
        : null;
    }),

  "templates/root-class": tree =>
    templatesOf(tree).flatMap(({ path, text }) => {
      const [root] = tagsOf(text);
      return root && !classesOf(root.attrs).some(name => name.startsWith("l5r4-"))
        ? [
            `${path}:${lineOf(text, root.index)}: the root <${root.name}> carries no l5r4- block class`
          ]
        : [];
    }),

  "templates/action-element": tree =>
    perTag(tree, ({ name, attrs }) => {
      if (!hasAttribute(attrs, "data-action")) {
        return null;
      }
      // Core's own sheets open the file picker from the image itself (templates/sheets/base-sheet.hbs:4)
      const coreImagePicker = name === "img" && attributeOf(attrs, "data-action") === "editImage";
      const native =
        NATIVE_CONTROLS.includes(name) ||
        (name === "a" && hasAttribute(attrs, "href")) ||
        coreImagePicker;
      return native ? null : `<${name}> with data-action is not a native control`;
    }),

  "templates/icon-button-name": tree =>
    templatesOf(tree).flatMap(({ path, text }) =>
      controlsOf(text)
        .filter(({ inner }) => isIconOnly(inner))
        .filter(
          ({ attrs }) => !hasAttribute(attrs, "data-tooltip") || !hasAttribute(attrs, "aria-label")
        )
        .map(
          ({ name, index }) =>
            `${path}:${lineOf(text, index)}: icon-only <${name}> needs data-tooltip and aria-label`
        )
    ),

  "templates/expand-aria": tree =>
    perTag(tree, ({ attrs }) =>
      /data-action="[^"]*expand[^"]*"/.test(attrs) && !hasAttribute(attrs, "aria-expanded")
        ? "an expand toggle carries aria-expanded"
        : null
    ),

  "templates/icon-inert": tree =>
    perTag(tree, ({ name, attrs }) =>
      name === "i" &&
      classesOf(attrs).some(cls => cls.startsWith("fa-")) &&
      !hasAttribute(attrs, "inert")
        ? "a Font Awesome <i> carries inert"
        : null
    ),

  "templates/img-alt": tree =>
    perTag(tree, ({ name, attrs }) =>
      name === "img" && !hasAttribute(attrs, "alt") ? "an <img> carries alt" : null
    ),

  "templates/fa-style": tree =>
    perTag(tree, ({ attrs }) => {
      const other = classesOf(attrs).filter(name => OTHER_FA_STYLES.test(name));
      return other.length ? `Font Awesome as fa-solid, not ${other.join(" ")}` : null;
    }),

  "templates/fa-alias": tree => {
    const aliases = faAliasesOf();
    return perTag(tree, ({ attrs }) => {
      const used = classesOf(attrs).filter(name => aliases.includes(name));
      return used.length ? `${used.join(" ")} is an alias; write the canonical name` : null;
    });
  },

  "templates/literal-text": tree =>
    templatesOf(tree).flatMap(({ path, text }) => [
      ...literalTextOf(text).map(
        ({ words, index }) => `${path}:${lineOf(text, index)}: "${words}" outside {{localize}}`
      ),
      ...tagsOf(text).flatMap(({ attrs, index }) =>
        TEXT_ATTRIBUTES.flatMap(name => {
          const value = attributeOf(attrs, name);
          const literal = value?.replace(new RegExp(MUSTACHE, "g"), "");
          return literal && /[A-Za-z]{2,}/.test(literal)
            ? [`${path}:${lineOf(text, index)}: ${name}="${value}" outside {{localize}}`]
            : [];
        })
      )
    ]),

  "templates/joined-localize": tree =>
    templatesOf(tree).flatMap(({ path, text }) =>
      labelRunsOf(text)
        .filter(({ run }) => localizeCallsIn(run) >= 2)
        .map(
          ({ run, index }) =>
            `${path}:${lineOf(text, index + Math.max(run.indexOf("{{"), 0))}: "${run.trim().replace(/\s+/g, " ")}" joins ${localizeCallsIn(run)} localize calls; one label is one key with placeholders`
        )
    ),

  "templates/partial-path": tree =>
    templatesOf(tree).flatMap(({ path, text }) =>
      [...text.matchAll(/\{\{>\s*([^\s}]+)/g)]
        .filter(
          ([, name]) =>
            !/^"systems\/l5r4-enhanced\/templates\/[^"]+\.hbs"$/.test(name) &&
            !name.startsWith("(concat")
        )
        .map(
          match =>
            `${path}:${lineOf(text, match.index)}: partial ${match[1]} is not a literal systems/l5r4-enhanced/templates/ path`
        )
    ),

  "templates/repeated-markup": repeatedMarkupOf
};

registerConventionSuite("Templates", RULES, "templates");

describe("Joined localize calls", () => {
  it("should fail a text node, an attribute value, and a conditional join, each on its own line", () => {
    const found = RULES["templates/joined-localize"](getFixtureTrees("templates").bad);
    expect(found.map(line => line.split(":").slice(0, 2).join(":"))).toEqual([
      "templates/apps/sample.hbs:11",
      "templates/apps/sample.hbs:10",
      "templates/apps/sample.hbs:12"
    ]);
  });
});
