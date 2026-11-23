import {
  frozenObjectKeys,
  optionActionSets,
  optionActions,
  templateActions
} from "../../tools/coverage/actions.mjs";
import {
  codeSpansOf,
  getRepoTree,
  registerConventionSuite,
  tableAfter
} from "../../tools/conventions/shared.mjs";

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Core's own actions, handled by core: `editImage` by DocumentSheetV2, `expandRoll` by core's dice roll toggle,
 * `close` by ApplicationV2 [src: client/applications/api/application.mjs:1957]. Exempt by name, as the fixed card
 * actions are.
 */
const CORE_ACTIONS = Object.freeze(["editImage", "expandRoll", "close"]);

/** The folders whose classes declare `DEFAULT_OPTIONS.actions`. */
const ACTION_DIRS = Object.freeze(["module/sheets", "module/apps"]);

/**
 * The `data-action` names of posted chat cards, fixed by Stage 17 decision 2 (docs/code-system/naming.md).
 * @returns {string[]} The fixed action names
 */
function fixedActionsOf() {
  const row = tableAfter(getRepoTree().text("docs/code-system/naming.md"), "Fixed names").find(
    entry => entry.Kind === "Chat card actions and attributes"
  );
  const names = row.Names;
  return [
    ...codeSpansOf(names.slice(0, names.indexOf("data-flow-action"))).filter(
      name => name !== "data-action"
    ),
    ...CORE_ACTIONS
  ];
}

/**
 * Every action a tree's templates name, with the file naming it.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{action: string, source: string}[]} The template actions
 */
function templateActionsOf(tree) {
  return tree
    .files("templates", /\.hbs$/)
    .flatMap(path => templateActions(tree.text(path)).map(action => ({ action, source: path })));
}

/**
 * Every `DEFAULT_OPTIONS.actions` key of a tree's sheets and apps, with its file.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{action: string, source: string}[]} The option keys
 */
function optionActionsOf(tree) {
  return ACTION_DIRS.flatMap(dir =>
    tree
      .files(dir, /\.js$/)
      .flatMap(path => optionActions(tree.text(path)).map(action => ({ action, source: path })))
  );
}

/**
 * The keys of the shared action sets a tree's sheets and apps put in their `actions`: each exported frozen object
 * spread into, or given as, an `actions` (docs/code-system/foundry-patterns.md, Actions).
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {string[]} The shared actions
 */
function sharedActionsOf(tree) {
  const files = ACTION_DIRS.flatMap(dir => tree.files(dir, /\.js$/));
  const sets = new Set(files.flatMap(path => optionActionSets(tree.text(path))));
  return files.flatMap(path => [...sets].flatMap(name => frozenObjectKeys(tree.text(path), name)));
}

/**
 * The keys of an actor sheet's `CLICK_ACTIONS` table: each quoted key opening a line between the table's start and
 * its closing `});` at class-member indentation.
 * @param {string} text - A module's text
 * @returns {string[]} The table's actions
 */
function clickActionsOf(text) {
  const start = text.search(/\bCLICK_ACTIONS\s*=\s*Object\.freeze\(\{/);
  if (start < 0) {
    return [];
  }
  const table = text.slice(start, text.indexOf("\n  });", start));
  return [...table.matchAll(/^\s*["']([\w-]+)["']\s*:/gm)].map(([, action]) => action);
}

/**
 * The actions a tree's code handles: option keys and the shared sets they take, the actor sheets' `CLICK_ACTIONS` keys and `case` labels (the
 * actor-sheet exception, docs/code-system/foundry-patterns.md), and the `[data-action='x']` selectors services bind
 * on chat cards.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {Set<string>} The handled action names
 */
function handledActionsOf(tree) {
  const handled = new Set([
    ...optionActionsOf(tree).map(({ action }) => action),
    ...sharedActionsOf(tree)
  ]);
  for (const path of tree.files("module", /\.js$/)) {
    const text = tree.text(path);
    if (path.startsWith("module/sheets/")) {
      for (const action of clickActionsOf(text)) {
        handled.add(action);
      }
      for (const [, action] of text.matchAll(/\bcase\s+["']([\w-]+)["']\s*:/g)) {
        handled.add(action);
      }
    }
    for (const [, action] of text.matchAll(/data-action=\\?["']([\w-]+)\\?["']\]/g)) {
      handled.add(action);
    }
  }
  return handled;
}

/** docs/code-system/naming.md, Templates and actions; docs/code-system/foundry-patterns.md, Actions. */
const RULES = {
  "actions/casing": tree => {
    const fixed = fixedActionsOf();
    return [...templateActionsOf(tree), ...optionActionsOf(tree)]
      .filter(({ action }) => !fixed.includes(action) && !KEBAB.test(action))
      .map(({ action, source }) => `${source}: action "${action}" is not kebab-case`);
  },

  "actions/handler": tree => {
    const handled = handledActionsOf(tree);
    const fixed = fixedActionsOf();
    const unhandled = templateActionsOf(tree).filter(
      ({ action }) => !handled.has(action) && !fixed.includes(action)
    );
    return [...new Map(unhandled.map(entry => [entry.action, entry])).values()].map(
      ({ action, source }) => `${source}: action "${action}" has no handler`
    );
  }
};

registerConventionSuite("Action names", RULES, "actions");
