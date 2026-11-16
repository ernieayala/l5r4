/**
 * @module tools/coverage/actions
 * @description The action check (roadmap/STAGE-16, CI). Every `data-action` a template names and every key of a
 * sheet's or app's `DEFAULT_OPTIONS.actions` is triggered by a Quench test: either the click-through of
 * `tests/quench/sheets-and-apps.js` runs it, as its coverage list `tests/quench/every-action.js` records (the batch
 * fails when one in that list is not run), or a test names it in a `data-action` selector or by `actions.<name>`.
 * The rest are listed, except those the manifest's `untested.actions` accepts with a reason.
 */

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { sourcesIn } from "./citations.mjs";

/**
 * The literal actions a template names: each `data-action` attribute, and each `action` hash argument of a partial
 * include, which the partial writes into its own `data-action="{{action}}"` (the roll button, button.md B4).
 * @param {string} text
 * @returns {string[]}
 */
export function templateActions(text) {
  return [
    ...text.matchAll(/data-action="([A-Za-z][\w-]*)"|\{\{#?>[^}]*?\saction="([A-Za-z][\w-]*)"/g)
  ].map(([, attribute, argument]) => attribute ?? argument);
}

/**
 * The keys of each `actions: { ... }` object in a module: its own keys, not those it spreads in or nests.
 * @param {string} text
 * @returns {string[]}
 */
export function optionActions(text) {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const keys = [];
  for (const match of code.matchAll(/\bactions:\s*\{/g)) {
    let depth = 1;
    let top = "";
    for (let i = match.index + match[0].length; i < code.length && depth > 0; i++) {
      const char = code[i];
      depth += char === "{" ? 1 : char === "}" ? -1 : 0;
      if (depth === 1 && char !== "}") {
        top += char;
      }
    }
    for (const [, quoted, bare] of top.matchAll(
      /(?:^|[,\n])\s*(?:async\s+)?(?:["']([\w-]+)["']|([A-Za-z_$][\w$]*))\s*(?=[:(])/g
    )) {
      keys.push(quoted ?? bare);
    }
  }
  return keys;
}

/**
 * Whether the Quench tests name an action: a `data-action` selector, or `actions.<name>`.
 * @param {string} tests
 * @param {string} action
 * @returns {boolean}
 */
export function testsName(tests, action) {
  const name = action.replace(/[-$]/g, "\\$&");
  return new RegExp(String.raw`data-action=\\?["']?${name}(?![\w-])|\bactions\.${name}\b`).test(tests);
}

/**
 * Join the actions with the tests.
 * @param {object} data
 * @param {{action: string, source: string}[]} data.actions
 * @param {string} data.tests - The Quench batches' text
 * @param {string[]} data.everyAction - The click-through's coverage list
 * @param {Record<string, string>} data.accepted - Untested actions accepted, with the reason
 * @returns {{count: number, untested: object[], accepted: string[], stale: string[]}}
 */
export function auditActions({ actions, tests, everyAction, accepted }) {
  const unique = [...new Map(actions.map(entry => [entry.action, entry])).values()];
  const names = new Set(unique.map(entry => entry.action));
  const run = new Set(everyAction);
  const tested = entry => run.has(entry.action) || testsName(tests, entry.action);
  const stale = [
    ...everyAction.filter(action => !names.has(action)).map(a => `every-action.js lists ${a}, no longer an action`),
    ...Object.keys(accepted)
      .filter(action => !names.has(action) || tested({ action }))
      .map(action => `untested.actions accepts ${action}, which is ${names.has(action) ? "tested" : "gone"}`)
  ];
  return {
    count: unique.length,
    untested: unique.filter(entry => !tested(entry) && !(entry.action in accepted)),
    accepted: Object.entries(accepted).map(([action, reason]) => `${action}: ${reason}`),
    stale
  };
}

/**
 * Read the templates, sheets, apps, and Quench batches, and run the audit.
 * @param {string} repo
 * @param {object} manifest
 * @returns {Promise<ReturnType<typeof auditActions>>}
 */
export async function actionsReport(repo, manifest) {
  const actions = [
    ...sourcesIn(repo, "templates", [], /\.hbs$/).flatMap(({ path, text }) =>
      templateActions(text).map(action => ({ action, source: path }))
    ),
    ...["module/sheets", "module/apps"].flatMap(dir =>
      sourcesIn(repo, dir).flatMap(({ path, text }) =>
        optionActions(text).map(action => ({ action, source: path }))
      )
    )
  ];
  const { EVERY_ACTION } = await import(
    pathToFileURL(join(repo, "tests/quench/every-action.js")).href
  );
  return auditActions({
    actions,
    tests: sourcesIn(repo, "tests/quench")
      .map(({ text }) => text)
      .join("\n"),
    everyAction: EVERY_ACTION,
    accepted: manifest.untested.actions
  });
}
