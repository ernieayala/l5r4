import { posix } from "node:path";
import {
  codeSpansOf,
  getRepoTree,
  registerConventionSuite,
  tableAfter
} from "../../tools/conventions/shared.mjs";

const { basename, dirname } = posix;

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FOLDER = /^_?[a-z0-9]+(-[a-z0-9]+)*$/;

/** The code folders whose own folder names follow naming.md. */
const CODE_DIRS = Object.freeze(["module", "templates", "scss", "tools", "tests"]);

/** Folders whose names are data, not code: fixture worlds and the coverage tool's made-up repo. */
const DATA_DIRS = Object.freeze(["tests/fixtures"]);

/** The consumer folders a template may sit in (docs/code-system/naming.md, Template file). */
const TEMPLATE_FOLDERS = Object.freeze([
  "actor",
  "apps",
  "cards",
  "chat",
  "dialogs",
  "item",
  "links",
  "rules"
]);

/** The SCSS folders (docs/code-system/templates-and-styles.md, Folders). */
const SCSS_FOLDERS = Object.freeze(["base", "layout", "components", "features", "apps", "sheets"]);

/** The SCSS entry, the only top-level stylesheet. */
const SCSS_ENTRY = "scss/l5r4-enhanced.scss";

/**
 * The Item subtypes, which name fixed template files (docs/code-system/naming.md, Fixed names).
 * @returns {string[]} The subtype names
 */
function itemSubtypesOf() {
  const row = tableAfter(getRepoTree().text("docs/code-system/naming.md"), "Fixed names").find(
    entry => entry.Kind === "Document subtypes"
  );
  const names = row.Names;
  return codeSpansOf(names.slice(names.indexOf("Item"), names.indexOf("ChatMessage")));
}

/**
 * A file's name without its extensions.
 * @param {string} path - The file's path
 * @returns {string} The stem
 */
function stemOf(path) {
  return basename(path).replace(/\..*$/, "");
}

/**
 * Whether a folder is outside the code the naming rules cover.
 * @param {string} path - The folder or file path
 * @returns {boolean} True for fixture data
 */
function isData(path) {
  return DATA_DIRS.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Whether a template is a fixed subtype file, named by the stored subtype.
 * @param {string} path - The template's path
 * @returns {boolean} True for a fixed name
 */
function isSubtypeTemplate(path) {
  const folder = dirname(path);
  const fixedFolders = [
    "templates/item/_type-details",
    "templates/item/_type-modifiers",
    "templates/cards"
  ];
  return fixedFolders.includes(folder) && itemSubtypesOf().includes(stemOf(path));
}

/** Each rule of naming.md, modules.md, templates-and-styles.md, and testing.md a file or folder name can show. */
const RULES = {
  "names/module-file": tree =>
    tree
      .files("module", /\.js$/)
      .filter(path => !KEBAB.test(stemOf(path)))
      .map(path => `${path}: a module file is kebab-case.js`),

  "names/folder": tree =>
    CODE_DIRS.flatMap(top => tree.dirs(top))
      .filter(path => !isData(path) && !FOLDER.test(basename(path)))
      .map(path => `${path}/: a folder is lowercase kebab-case`),

  "names/redundant-prefix": tree =>
    [...tree.files("module", /\.js$/), ...tree.files("tools", /\.m?js$/)]
      .filter(path => {
        const folder = basename(dirname(path));
        return stemOf(path).startsWith(`${folder}-`);
      })
      .map(path => `${path}: a file name does not start with its folder's name`),

  "names/role-suffix": tree => [
    ...tree
      .files("module/sheets/handlers", /\.js$/)
      .filter(path => !path.endsWith("-handler.js"))
      .map(path => `${path}: an action router in sheets/handlers/ ends -handler.js`),
    ...tree
      .files("module/documents/actor/calculations", /\.js$/)
      .filter(path => !path.endsWith("-system.js"))
      .map(path => `${path}: a calculation file ends -system.js`),
    ...tree
      .files("module/services", /-(service|manager|handler)\.js$/)
      .map(path => `${path}: a service takes the plain feature name`)
  ],

  "names/mixin": tree =>
    tree
      .files("module", /\.js$/)
      .filter(path => path.includes("/mixins/") || path.endsWith("-mixin.js"))
      .filter(path => dirname(path) !== "module/mixins" || !path.endsWith("-mixin.js"))
      .map(path => `${path}: a mixin is module/mixins/<name>-mixin.js`),

  "names/tool-script": tree => [
    ...tree
      .files("tools", /\.m?js$/)
      .filter(path => !path.endsWith(".mjs") || !KEBAB.test(stemOf(path)))
      .map(path => `${path}: a tool is tools/<name>.mjs`),
    ...tree
      .files("scripts", /\.m?js$/)
      .filter(path => !path.endsWith(".js") || !KEBAB.test(stemOf(path)))
      .map(path => `${path}: a script is scripts/<name>.js`)
  ],

  "names/empty-folder": tree =>
    CODE_DIRS.flatMap(top => tree.dirs(top))
      .filter(
        folder =>
          !tree.paths.some(path => path.startsWith(`${folder}/`)) &&
          !tree.folders.some(other => other.startsWith(`${folder}/`))
      )
      .map(folder => `${folder}/: an empty folder does not exist`),

  "names/template-file": tree =>
    tree
      .files("templates", /\.hbs$/)
      .filter(path => !isSubtypeTemplate(path) && !FOLDER.test(stemOf(path)))
      .map(path => `${path}: a template is kebab-case.hbs`),

  "names/template-folder": tree =>
    tree
      .files("templates", /\.hbs$/)
      .filter(path => !TEMPLATE_FOLDERS.includes(path.split("/")[1]) || path.split("/").length < 3)
      .map(
        path => `${path}: a template sits in a consumer folder (${TEMPLATE_FOLDERS.join(", ")})`
      ),

  "names/partial-prefix": tree =>
    tree
      .files("templates", /\.hbs$/)
      .filter(path => path.includes("/_partials/") !== basename(path).startsWith("_"))
      .map(
        path => `${path}: a partial is _<name>.hbs inside a _partials/ folder, and only a partial`
      ),

  "names/dialog-template": tree =>
    tree
      .files("templates/dialogs", /\.hbs$/)
      .filter(path => dirname(path) === "templates/dialogs" && !path.endsWith("-dialog.hbs"))
      .map(path => `${path}: a dialog template ends -dialog.hbs`),

  "names/chat-template": tree =>
    tree
      .files("templates/chat", /-(card|chat)\.hbs$/)
      .map(path => `${path}: a chat template takes no -card or -chat suffix`),

  "names/section-partial": tree =>
    tree
      .files("templates", /-section\.hbs$/)
      .filter(path => /s-section\.hbs$/.test(path))
      .map(path => `${path}: a section partial's noun is singular`),

  "names/scss-file": tree =>
    tree
      .files("scss", /\.scss$/)
      .filter(path => path !== SCSS_ENTRY)
      .filter(path => {
        const parts = path.split("/");
        return (
          parts.length !== 3 ||
          !SCSS_FOLDERS.includes(parts[1]) ||
          !/^_[a-z0-9]+(-[a-z0-9]+)*\.scss$/.test(parts[2])
        );
      })
      .map(
        path => `${path}: a stylesheet is scss/<folder>/_<block>.scss (${SCSS_FOLDERS.join(", ")})`
      ),

  "names/quench-file": tree =>
    tree
      .files("tests/quench", /\.m?js$/)
      .filter(path => path.endsWith(".test.js") || !KEBAB.test(stemOf(path)))
      .map(path => `${path}: a Quench file is kebab-case.js with no .test suffix`),

  "names/vitest-file": tree =>
    tree
      .files("tests", /\.test\.js$/)
      .filter(path => !path.startsWith("tests/quench/") && !isData(path))
      .filter(path => !KEBAB.test(basename(path).replace(/\.test\.js$/, "")))
      .map(path => `${path}: a Vitest file is kebab-case.test.js`),

  "names/barrel": tree =>
    tree
      .files("module", /\.js$/)
      .filter(path => basename(path) === "index.js" || isReExportOnly(tree.text(path)))
      .map(path => `${path}: a folder holds no index or re-export file`),

  "names/constants-folder": tree =>
    tree
      .dirs("module")
      .filter(path => basename(path) === "constants")
      .map(path => `${path}/: constants live in module/config/`)
};

/**
 * Whether a module only re-exports other files.
 * @param {string} text - The module's source
 * @returns {boolean} True when every statement is an `export ... from`
 */
function isReExportOnly(text) {
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .trim();
  if (!code) {
    return false;
  }
  return code
    .split(/;\s*/)
    .filter(Boolean)
    .every(statement =>
      /^export\s+(\*|\{[\s\S]*\})(\s+as\s+\w+)?\s+from\s+["'][^"']+["']$/.test(statement)
    );
}

registerConventionSuite("Names on disk", RULES, "names");
