/**
 * @module utils/change-origin
 * @description Which client sent a document change. One user can be signed in on several clients, and each receives
 * the change with the same user id, so work that follows a change (grants, an exclusive group's clean-up, the Full
 * Defense roll, animations) asks whether this client sent it, not whether its user made it. The client that sends a
 * change stamps it with its socket id (module/services/change-origin.js).
 */

import { CHANGE_ORIGIN_OPTION } from "../config/constants.js";

/**
 * Whether this client sent a document change: the change's options carry this client's socket id. A change made
 * with `noHook` carries no stamp, so no client counts it as its own.
 * @param {object} options - The change's options, as the create, update, or delete hook passes them
 * @param {string} clientId - This client's socket id, `game.socket.id`
 * @returns {boolean}
 */
export function isOwnChange(options, clientId) {
  return options[CHANGE_ORIGIN_OPTION] === clientId;
}
