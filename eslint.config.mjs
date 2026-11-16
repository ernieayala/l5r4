import { readFileSync } from "node:fs";
import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import { codeSpansOf, tableAfter } from "./tools/conventions/markdown.mjs";
import l5r4 from "./tools/eslint/plugin.mjs";

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

// The system's own code: the layers in module/ and the entry module.
const SYSTEM = ["module/**/*.js", "dist/l5r4-enhanced.js"];

// The Font Awesome aliases the system does not write, read from the page that lists them
// (docs/design-system/foundations/iconography.md, rule 2), so the list has one home.
const FA_ALIASES = tableAfter(
  readFileSync(new URL("./docs/design-system/foundations/iconography.md", import.meta.url), "utf8"),
  "2. Canonical names, not aliases"
).flatMap(row => codeSpansOf(row["Alias (do not write)"]));

// The global APIs CLAUDE.md Foundry Integration lists in its "Not" column.
const DEPRECATED_GLOBALS = [
  { name: "Dialog", message: "Use foundry.applications.api.DialogV2." },
  { name: "renderTemplate", message: "Use foundry.applications.handlebars.renderTemplate." },
  { name: "loadTemplates", message: "Use foundry.applications.handlebars.loadTemplates." },
  { name: "mergeObject", message: "Use foundry.utils.mergeObject." },
  { name: "duplicate", message: "Use foundry.utils.deepClone." },
  { name: "Actors", message: "Use foundry.applications.apps.DocumentSheetConfig." },
  { name: "Items", message: "Use foundry.applications.apps.DocumentSheetConfig." }
];

// Foundry globals the Utils layer never reads (CLAUDE.md Layers: pure functions, no Foundry globals).
const FOUNDRY_GLOBAL_RESTRICTIONS = [...FOUNDRY_GLOBALS, "document", "window"]
  .filter(name => !name.startsWith("_"))
  .map(name => ({
    name,
    message: "Utils are pure functions: no Foundry globals or DOM (CLAUDE.md Layers)."
  }));

// UI, DOM, and rolling, which data models and documents never touch (CLAUDE.md Layers).
const UI_GLOBAL_RESTRICTIONS = ["ui", "document", "window", "Roll"].map(name => ({
  name,
  message: "Data models and documents do no UI, DOM access, or rolling (CLAUDE.md Layers)."
}));

// docs/code-system/templates-and-styles.md, No markup in JavaScript.
const PRESENTATION_SYNTAX = [
  {
    selector: String.raw`Literal[value=/<\/?[a-zA-Z][\w-]*(\s|>|\/)/]`,
    message: "No HTML in a string: render a template from templates/."
  },
  {
    selector: String.raw`TemplateElement[value.raw=/<\/?[a-zA-Z][\w-]*(\s|>|\/)/]`,
    message: "No HTML in a template literal: render a template from templates/."
  },
  {
    selector:
      "AssignmentExpression > MemberExpression.left[property.name=/^(innerHTML|outerHTML)$/]",
    message: "No innerHTML or outerHTML writes: parse rendered HTML with foundry.utils.parseHTML."
  },
  {
    selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
    message: "No insertAdjacentHTML: parse rendered HTML with foundry.utils.parseHTML."
  },
  {
    selector: "AssignmentExpression > MemberExpression.left[object.property.name='style']",
    message: "No .style writes: toggle a state class or a data-* attribute."
  },
  {
    selector:
      "CallExpression[callee.object.property.name='style'][callee.property.name=/^(setProperty|removeProperty)$/]",
    message: "No .style writes: toggle a state class or a data-* attribute."
  },
  {
    selector: String.raw`CallExpression[callee.property.name=/^(querySelector|querySelectorAll|closest|matches)$/] > Literal.arguments[value=/(^|[\s>+~,(])[.#]-?[_a-zA-Z]/]`,
    message: "Select by [data-*], [name], or element, never by class or id."
  },
  {
    selector: String.raw`CallExpression[callee.property.name=/^(querySelector|querySelectorAll|closest|matches)$/] > TemplateLiteral.arguments > TemplateElement[value.raw=/(^|[\s>+~,(])[.#]-?[_a-zA-Z]/]`,
    message: "Select by [data-*], [name], or element, never by class or id."
  },
  {
    selector: String.raw`Identifier[name=/^(\$|jQuery)$/]`,
    message: "No jQuery."
  }
];

// The same rules' checks that apply only to the system's code: copy and icons in JavaScript.
const SYSTEM_PRESENTATION_SYNTAX = [
  ...PRESENTATION_SYNTAX,
  {
    selector:
      "CallExpression[callee.object.property.name='notifications'] > :matches(Literal, TemplateLiteral).arguments",
    message: "A notification shows an i18n key through T() or F(), never a literal string."
  },
  {
    selector:
      ":matches(CallExpression[callee.object.name='DialogV2'], CallExpression[callee.object.property.name='DialogV2']) Property[key.name='content'] > :matches(Literal, TemplateLiteral)",
    message: "DialogV2 content is a template from templates/dialogs/."
  },
  {
    selector: String.raw`Literal[value=/\bfa[srlb]\b|\bfa-(regular|light|duotone)\b/]`,
    message: "Font Awesome as fa-solid (docs/design-system/foundations/iconography.md, rule 1)."
  },
  ...(FA_ALIASES.length
    ? [
        {
          selector: `Literal[value=/\\b(${FA_ALIASES.join("|")})\\b/]`,
          message: "A Font Awesome alias: write the canonical name (iconography.md, rule 2)."
        }
      ]
    : []),
  {
    selector: "ImportExpression",
    message:
      "Imports are static: no await import() inside a function (docs/code-system/modules.md)."
  },
  {
    selector: "MemberExpression[object.property.name='i18n'][property.name='format']",
    message: "game.i18n.format is merged into game.i18n.localize(key, data) in v14."
  },
  {
    selector: "Literal[value='renderChatMessage']",
    message: "Use the renderChatMessageHTML hook."
  },
  {
    selector: "Property[key.name='rollMode']",
    message: "The rollMode option is deprecated in v14: pass messageMode."
  }
];

// Hooks register in one place: module/hooks/register-all.js (docs/code-system/foundry-patterns.md, Chat cards).
const HOOKS_SYNTAX = {
  selector: "CallExpression[callee.object.name='Hooks'][callee.property.name=/^(on|once)$/]",
  message: "Services export handlers; module/hooks/ wires them with Hooks.on."
};

// Imports a layer never makes (CLAUDE.md Layers: imports flow downward).
const layerImports = (pattern, from) => [
  "error",
  { patterns: [{ regex: pattern, message: `${from} never import this layer (CLAUDE.md Layers).` }] }
];

// docs/code-system/documentation.md, JSDoc template.
const JSDOC_RULES = {
  "jsdoc/require-jsdoc": [
    "error",
    {
      publicOnly: true,
      require: {
        ArrowFunctionExpression: true,
        ClassDeclaration: true,
        FunctionDeclaration: true,
        FunctionExpression: true
      },
      contexts: ["ExportNamedDeclaration > VariableDeclaration"]
    }
  ],
  "jsdoc/require-description": "error",
  // The summary is a sentence ending with a period, then any citation lines (documentation.md, JSDoc template).
  // require-description-complete-sentence would fail every citation line, which starts in lower case.
  "jsdoc/match-description": [
    "error",
    {
      matchDescription: String.raw`^[A-Z\x60\d_\[#\(][\s\S]*?[.?!\x60\)](\s*\ngame-rules/\d+_[a-z0-9_]+\.md, p\.\d+(-\d+)?(, \d+(-\d+)?)*)*\s*$`,
      message: "The summary is a sentence ending with a period; citation lines follow it"
    }
  ],
  "jsdoc/require-param": "error",
  "jsdoc/check-param-names": "error",
  "jsdoc/require-hyphen-before-param-description": "error",
  "jsdoc/require-returns": "error",
  "jsdoc/require-returns-check": "error",
  "jsdoc/check-types": "error",
  "jsdoc/check-tag-names": "error"
};

export default [
  {
    ignores: [
      "node_modules/",
      "dist/*.css",
      "coverage/",
      "tests/coverage/",
      "tests/fixtures/conventions/"
    ]
  },
  js.configs.recommended,
  prettier,
  {
    plugins: { jsdoc, l5r4 },
    settings: {
      jsdoc: {
        // Tags the template drops (documentation.md, Tags not used)
        tagNamePreference: Object.fromEntries(
          [
            "private",
            "protected",
            "async",
            "function",
            "static",
            "requires",
            "example",
            "fileoverview",
            "file"
          ].map(tag => [tag, false])
        )
      }
    }
  },
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
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      curly: ["error", "all"],
      "brace-style": ["error", "1tbs", { allowSingleLine: true }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-throw-literal": "error",
      "no-unreachable": "error",
      "no-duplicate-imports": "error"
    }
  },
  {
    // docs/code-system/: names, module shape, documentation, deprecated APIs, and presentation in the system's code
    files: SYSTEM,
    rules: {
      ...JSDOC_RULES,
      "l5r4/naming": "error",
      "l5r4/import-order": "error",
      "l5r4/module-shape": "error",
      "l5r4/doc-format": ["error", { header: true }],
      // docs/design-system/content/localization.md, One key per meaning: copy, titles included, is one key with
      // placeholders
      "l5r4/joined-title": "error",
      "l5r4/joined-copy": "error",
      camelcase: ["error", { properties: "never", ignoreImports: true, ignoreGlobals: true }],
      "new-cap": [
        "error",
        { capIsNewExceptions: ["T", "F", "R", "TEMPLATE"], capIsNewExceptionPattern: "Mixin$" }
      ],
      "max-params": ["error", 3],
      // docs/code-system/functions.md, Function length: near the 90th percentile of the system's functions
      "max-lines-per-function": ["error", { max: 30, skipBlankLines: true, skipComments: true }],
      "no-else-return": "error",
      "no-restricted-globals": ["error", ...DEPRECATED_GLOBALS],
      "no-restricted-properties": [
        "error",
        { property: "CHAT_MESSAGE_TYPES", message: "Use CONST.CHAT_MESSAGE_STYLES." },
        {
          property: "ACTIVE_EFFECT_MODES",
          message: "v14 change types are strings: effect.system.changes[].type."
        },
        {
          property: "rollMode",
          message: "The rollMode option and setting are deprecated in v14: messageMode."
        },
        { property: "appv1", message: "Use ApplicationV2 (foundry.applications.api)." }
      ],
      "no-restricted-syntax": ["error", ...SYSTEM_PRESENTATION_SYNTAX]
    }
  },
  {
    files: ["module/**/*.js"],
    ignores: ["module/hooks/**"],
    rules: { "no-restricted-syntax": ["error", ...SYSTEM_PRESENTATION_SYNTAX, HOOKS_SYNTAX] }
  },
  {
    files: ["module/**/*.js"],
    rules: { "l5r4/member-order": "error" }
  },
  {
    // docs/code-system/foundry-patterns.md, Preparation order: re-prepare with reset(), tests included
    files: [...SYSTEM, "tests/**/*.js"],
    rules: { "l5r4/no-bare-prepare": "error" }
  },
  // Layer boundaries, beside npm run deps:circular (CLAUDE.md Layers)
  {
    files: ["module/config/**/*.js"],
    rules: {
      "no-restricted-imports": layerImports(
        "(^|/)(utils|data|documents|services|mixins|apps|sheets|setup|hooks)/",
        "Config files"
      )
    }
  },
  {
    files: ["module/utils/**/*.js"],
    // docs/code-system/modules.md: the localization API reads game.i18n by design
    ignores: ["module/utils/localization.js"],
    rules: {
      "no-restricted-globals": ["error", ...DEPRECATED_GLOBALS, ...FOUNDRY_GLOBAL_RESTRICTIONS]
    }
  },
  {
    files: ["module/utils/**/*.js"],
    rules: {
      "no-restricted-imports": layerImports(
        "(^|/)(data|documents|services|mixins|apps|sheets|setup|hooks)/",
        "Utils"
      )
    }
  },
  {
    files: ["module/data/**/*.js"],
    rules: {
      "no-restricted-imports": layerImports(
        "(^|/)(documents|services|mixins|apps|sheets|setup|hooks)/",
        "Data models"
      ),
      "no-restricted-globals": ["error", ...DEPRECATED_GLOBALS, ...UI_GLOBAL_RESTRICTIONS]
    }
  },
  {
    files: ["module/documents/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)(services|mixins|apps|sheets|setup|hooks)/",
              message: "Documents never import this layer (CLAUDE.md Layers)."
            },
            {
              regex: "(^|/)data/(?!rules/)",
              message: "Documents import only the rule models from module/data/ (CLAUDE.md Layers)."
            }
          ]
        }
      ],
      "no-restricted-globals": ["error", ...DEPRECATED_GLOBALS, ...UI_GLOBAL_RESTRICTIONS]
    }
  },
  {
    files: ["module/services/**/*.js"],
    rules: {
      "no-restricted-imports": layerImports(
        "(^|/)(data|documents|mixins|apps|sheets|setup|hooks)/",
        "Services"
      )
    }
  },
  {
    files: ["module/sheets/**/*.js"],
    // Sheets open the system's windows, so they may import apps (CLAUDE.md Layers)
    rules: { "no-restricted-imports": layerImports("(^|/)(setup|hooks|data)/", "Sheets") }
  },
  {
    files: ["module/apps/**/*.js"],
    rules: { "no-restricted-imports": layerImports("(^|/)(sheets|setup|hooks|data)/", "Apps") }
  },
  {
    // docs/code-system/documentation.md also holds for the repo's tools
    files: ["tools/**/*.mjs"],
    rules: { ...JSDOC_RULES, "l5r4/doc-format": ["error", { header: true }] }
  },
  {
    // Tests cite pages on a comment line above the test (docs/code-system/testing.md, Citations)
    files: ["tests/**/*.js"],
    rules: { "l5r4/doc-format": "error" }
  },
  {
    // A Quench test that selects by class breaks when a class is renamed (templates-and-styles.md)
    files: ["tests/quench/**/*.js"],
    rules: { "no-restricted-syntax": ["error", ...PRESENTATION_SYNTAX] }
  },
  {
    // Vitest, the fixture world builder, and the pack tools run in Node.
    files: [
      "*.config.js",
      "*.config.mjs",
      "tests/unit/**/*.js",
      "tests/*.test.js",
      "tests/conventions/**/*.js",
      "tests/fixtures/world-3.2.1/*.mjs",
      "tools/**/*.mjs"
    ],
    languageOptions: { globals: globals.node }
  },
  {
    // The pack tools are command-line programs that report what they did.
    files: ["tools/**/*.mjs"],
    rules: { "no-console": "off" }
  },
  {
    // Release and maintenance scripts are CommonJS run by Node.
    files: ["scripts/**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node }
  }
];
