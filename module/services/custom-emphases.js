/**
 * @module services/custom-emphases
 * @description The world's custom Emphases, a world setting that only a GM may write by default. A GM's change is
 * written here; a player's add, rename, or delete goes to the GM's client, which checks it against the list and
 * writes it, so every user who manages a Skill's Emphases can change the list (Ernie's ruling, #188).
 */

import { SYS_ID } from "../config/constants.js";
import { getChangedEmphases } from "../utils/emphases.js";
import { registerGmQuery, requestGmQuery } from "./gm-client.js";

/** The world setting that holds the custom Emphases (module/setup/settings/world.js). */
const SETTING = "customEmphases";

/** Name of the GM query that changes the custom Emphases (registered in registerCustomEmphasisQueries). */
export const CUSTOM_EMPHASES_QUERY = `${SYS_ID}.changeCustomEmphases`;

/**
 * The world's custom Emphases. The setting is read as stored, so anything but a list counts as none.
 * @returns {string[]}
 */
export function getCustomEmphases() {
  const setting = game.settings.get(SYS_ID, SETTING);
  return Array.isArray(setting) ? setting : [];
}

/**
 * Change the world's custom Emphases, on the GM's client for a player. When it does not run, the user is told why: no
 * GM connected, or the change no longer fits the list.
 * @param {{kind: "add"|"rename"|"delete", name: string, newName?: string}} change
 * @returns {Promise<boolean>} Whether the list changed
 */
export async function updateCustomEmphases(change) {
  return (await requestGmQuery(CUSTOM_EMPHASES_QUERY, change, updateEmphasisSetting)) === true;
}

/**
 * Register the GM side of a player's change to the custom Emphases.
 */
export function registerCustomEmphasisQueries() {
  registerGmQuery(CUSTOM_EMPHASES_QUERY, change => updateEmphasisSetting(change));
}

/**
 * Write one change to the custom Emphases. The change may come from another client, so it is checked against the
 * list as it stands now.
 * @param {object} change
 * @returns {Promise<true>}
 */
async function updateEmphasisSetting(change) {
  const list = getChangedEmphases(getCustomEmphases(), change ?? {});
  if (!list) {
    throw new Error("l5r4.ui.requests.emphasisChanged");
  }
  await game.settings.set(SYS_ID, SETTING, list);
  return true;
}
