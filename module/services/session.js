/**
 * @module services/session
 * @description Game sessions for once-per-session abilities (roadmap/STAGE-11 decision 3): the GM's "New session"
 * token control starts a new one, which gives every character its optional Honor Roll back (p.92).
 */

import { SYS_ID } from "../config/constants.js";
import { T } from "../utils/localization.js";

/**
 * Start a new game session after the GM confirms, and say so in chat.
 * @returns {Promise<void>}
 */
export async function startNewSession() {
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: T("l5r4.ui.session.new") },
    content: `<p>${T("l5r4.ui.session.confirm")}</p>`
  });
  if (!confirmed) {
    return;
  }
  await game.settings.set(SYS_ID, "session", game.settings.get(SYS_ID, "session") + 1);
  await ChatMessage.create({ content: `<p>${T("l5r4.ui.session.started")}</p>` });
}

/**
 * Add the GM's "New session" button to the token controls.
 * @param {Record<string, object>} controls
 */
function onGetSceneControlButtons(controls) {
  if (!controls.tokens) {
    return;
  }
  controls.tokens.tools[`${SYS_ID}-new-session`] = {
    name: `${SYS_ID}-new-session`,
    order: Object.keys(controls.tokens.tools).length,
    title: "l5r4.ui.session.new",
    icon: "fa-solid fa-calendar-plus",
    visible: game.user.isGM,
    button: true,
    onChange: () => startNewSession()
  };
}

/** Register the session control, once during system init. */
export function initializeSessions() {
  Hooks.on("getSceneControlButtons", onGetSceneControlButtons);
}
