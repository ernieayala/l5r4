import { posix } from "node:path";
import {
  codeSpansOf,
  escapeRegExp,
  lineOf,
  parseScss,
  registerConventionSuite,
  tableAfter
} from "../../tools/conventions/shared.mjs";

const { basename } = posix;

/** The gallery's own files: its fixture data, one file per section, and its templates (Stage 17 Deliverable 2). */
const GALLERY_CONFIG = "module/config/design-gallery";
const GALLERY_TEMPLATES = "templates/apps/design-gallery";

/** A path a design-system page names: under `templates/` or `scss/`, with an optional `:line` suffix. */
const DOC_PATH = /^((?:templates|scss)\/[\w./-]*)(?::[\d, -]+)?$/;

/** Font Awesome classes that set a style, size, or animation, not an icon. */
const FA_UTILITY =
  /^fa-(solid|regular|light|thin|duotone|brands|fw|spin|pulse|beat|fade|bounce|shake|flip|lg|sm|xs|2xs|xl|2xl|\dx|stack(-\dx)?|inverse|border|li|ul|pull-\w+|rotate-\w+|flip-\w+)$/;

/**
 * The registered partials of a tree: every `_partials/` template outside the gallery's own.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {string[]} The partial paths
 */
function partialsOf(tree) {
  return tree
    .files("templates", /\/_partials\/_[^/]+\.hbs$/)
    .filter(path => !path.startsWith(`${GALLERY_TEMPLATES}/`));
}

/**
 * The component names of a tree's `scss/components/` files.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{path: string, name: string}[]} Each file and its component name
 */
function componentFilesOf(tree) {
  return tree.files("scss/components", /\.scss$/).map(path => ({
    path,
    name: basename(path)
      .replace(/^_/, "")
      .replace(/\.scss$/, "")
  }));
}

/**
 * The text of every component page of a tree.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {string} The pages joined
 */
function componentPagesOf(tree) {
  return tree
    .files("docs/design-system/components", /\.md$/)
    .map(path => tree.text(path))
    .join("\n");
}

/**
 * The text of the gallery's fixture data and templates.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {string} The gallery's files joined
 */
function galleryOf(tree) {
  return [...tree.files(GALLERY_CONFIG, /\.js$/), ...tree.files(GALLERY_TEMPLATES)]
    .map(path => tree.text(path))
    .join("\n");
}

/**
 * The tokens a page may name before they are declared: color.md's reserved role tokens.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {Set<string>} The reserved tokens
 */
function reservedTokensOf(tree) {
  const page = "docs/design-system/foundations/color.md";
  if (!tree.has(page)) {
    return new Set();
  }
  return new Set(
    tableAfter(tree.text(page), "Role tokens")
      .filter(row => row["Read by"] === "Reserved")
      .flatMap(row => codeSpansOf(row.Token))
  );
}

/**
 * The `--l5r4-*` tokens a tree's stylesheets declare.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {Set<string>} The declared tokens
 */
function declaredTokensOf(tree) {
  return new Set(
    tree
      .files("scss", /\.scss$/)
      .flatMap(path => parseScss(tree.text(path)).statements)
      .filter(({ prop }) => prop?.startsWith("--l5r4-"))
      .map(({ prop }) => prop)
  );
}

/**
 * Every code span of the design-system pages, with its page and line, and the text right after it.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{path: string, code: string, line: number, after: string}[]} The spans
 */
function docSpansOf(tree) {
  return tree.files("docs/design-system", /\.md$/).flatMap(path => {
    const text = tree.text(path);
    return [...text.matchAll(/`([^`\n]+)`/g)].map(match => ({
      path,
      code: match[1],
      line: lineOf(text, match.index),
      after: text.slice(match.index + match[0].length, match.index + match[0].length + 9)
    }));
  });
}

/**
 * The icon names (Font Awesome classes that draw a glyph) the templates and modules of a tree write.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{path: string, icon: string, line: number}[]} Each use
 */
function iconUsesOf(tree) {
  return [...tree.files("templates", /\.hbs$/), ...tree.files("module", /\.js$/)].flatMap(path => {
    const text = tree.text(path);
    return [...text.matchAll(/(?<![\w-])fa-[a-z0-9]+(?:-[a-z0-9]+)*/g)]
      .filter(([icon]) => !FA_UTILITY.test(icon))
      .map(match => ({ path, icon: match[0], line: lineOf(text, match.index) }));
  });
}

/** docs/design-system/components/README.md, Target paths and One name; foundations/iconography.md rule 3. */
const RULES = {
  "design-system/component-page": tree =>
    componentFilesOf(tree)
      .filter(({ name }) => !tree.has(`docs/design-system/components/${name}.md`))
      .map(({ path, name }) => `${path}: has no docs/design-system/components/${name}.md`),

  "design-system/partial-page": tree => {
    const pages = componentPagesOf(tree);
    return partialsOf(tree)
      .filter(path => !pages.includes(path))
      .map(path => `${path}: no docs/design-system/components/ page names it`);
  },

  "design-system/gallery-entry": tree => {
    const gallery = galleryOf(tree);
    return [
      ...partialsOf(tree)
        .filter(path => !gallery.includes(path.replace(/^templates\//, "/")))
        .map(path => `${path}: has no gallery entry`),
      ...componentFilesOf(tree)
        .filter(({ name }) => !new RegExp(`["'\`]${escapeRegExp(name)}["'\`]`).test(gallery))
        .map(({ path, name }) => `${path}: component ${name} has no gallery entry`)
    ];
  },

  "design-system/doc-path": tree =>
    docSpansOf(tree).flatMap(({ path, code, line, after }) => {
      const match = DOC_PATH.exec(code);
      if (!match || /[<*]/.test(code)) {
        return [];
      }
      const target = match[1];
      const exists = target.endsWith("/")
        ? tree.folders.includes(target.slice(0, -1))
        : tree.has(target);
      if (after.startsWith(" (target)")) {
        return exists ? [`${path}:${line}: ${target} exists; drop its (target) mark`] : [];
      }
      return exists
        ? []
        : [`${path}:${line}: ${target} does not exist; mark it (target) or fix the path`];
    }),

  "design-system/doc-token": tree => {
    const declared = declaredTokensOf(tree);
    const reserved = reservedTokensOf(tree);
    return docSpansOf(tree)
      .filter(({ code }) => /^--l5r4-[\w-]+$/.test(code) && !/[<*{]/.test(code))
      .filter(({ code }) => !declared.has(code) && !reserved.has(code))
      .map(({ path, line, code }) => `${path}:${line}: ${code} is not declared in scss/`);
  },

  "design-system/icon-meaning": tree => {
    const page = "docs/design-system/foundations/iconography.md";
    const allowed = new Set(
      tableAfter(tree.text(page), "3. One icon per meaning, one meaning per icon").flatMap(row =>
        codeSpansOf(row.Icon).flatMap(code => code.split(/\s+/))
      )
    );
    return iconUsesOf(tree)
      .filter(({ icon }) => !allowed.has(icon))
      .map(({ path, icon, line }) => `${path}:${line}: ${icon} has no row in ${page} rule 3`);
  }
};

registerConventionSuite("Design system completeness", RULES, "design-system");
