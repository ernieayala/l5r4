/**
 * @module services/gm-allow
 * @description What the rules leave to the GM to rule on is asked of the GM, so a rule check never dead-ends
 * (CLAUDE.md **AUTOMATE MATH, KEEP CHOICES**; #223). A GM who acts is asked to confirm. A player's attempt goes to the
 * active GM, who sees who asks and why and answers Allow or Cancel; the player waits for that answer and is told the
 * reason either way. The GM's side of a player's request (a GM query) asks the same way through askGmFor.
 * docs/design-system/foundations/states.md
 */

import { SYS_ID } from "../config/constants.js";
import { DIALOG_TEMPLATES } from "../config/templates.js";
import { F, T } from "../utils/localization.js";
import { askConfirm } from "./dialog.js";
import { registerGmQuery, requestGmQuery } from "./gm-client.js";

/** Name of the GM query that asks the GM to allow a player's action. */
const GM_ALLOW_QUERY = `${SYS_ID}.allow`;

/**
 * @typedef {object} AllowSpec
 * @property {string} title - The dialog's title
 * @property {string} reason - Why the rules forbid it, already localized
 * @property {string} ask - The GM's question, already localized
 */

/**
 * Ask the GM to allow what the rules forbid: a GM is asked here; a player's attempt is sent to the active GM, and the
 * player waits for the answer. With no GM connected the player is told so, and the action does not go ahead.
 * @param {AllowSpec} spec
 * @returns {Promise<boolean>} Whether the action goes ahead
 */
export async function askGmAllow(spec) {
  if (game.user.isGM) {
    return askAllow(spec);
  }
  ui.notifications?.info(F("l5r4.ui.requests.askingGm", { reason: spec.reason }));
  const allowed = await requestGmQuery(GM_ALLOW_QUERY, spec);
  if (allowed === false) {
    ui.notifications?.warn(F("l5r4.ui.requests.gmDeclined", { reason: spec.reason }));
  }
  return allowed === true;
}

/**
 * On the GM's client, ask the GM to allow a request a user sent that the rules or the GM's own checks would refuse,
 * naming the user. Used inside GM queries, whose requester the server names.
 * @param {User} user - The requesting user
 * @param {AllowSpec} spec
 * @returns {Promise<boolean>} Whether the GM allowed it
 */
export function askGmFor(user, spec) {
  return askAllow({
    ...spec,
    reason: F("l5r4.ui.requests.playerAsks", { name: user.name, reason: spec.reason })
  });
}

/** Register the GM side of askGmAllow. */
export function registerGmAllowQueries() {
  // The request's text comes from another client; it is only shown, escaped by the template
  registerGmQuery(GM_ALLOW_QUERY, ({ title, reason, ask }, { user }) =>
    askGmFor(user, { title: String(title), reason: String(reason), ask: String(ask) })
  );
}

/**
 * The GM's Allow or Cancel dialog.
 * @param {AllowSpec} spec
 * @returns {Promise<boolean>}
 */
async function askAllow({ title, reason, ask }) {
  const allowed = await askConfirm({
    window: { title },
    content: await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATES.confirm, {
      question: reason,
      consequence: ask
    }),
    yes: { label: T("l5r4.ui.common.allow") },
    no: { label: T("l5r4.ui.common.cancel") }
  });
  return allowed === true;
}
