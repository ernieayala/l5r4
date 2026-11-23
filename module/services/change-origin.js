/**
 * @module services/change-origin
 * @description Stamps each Actor, Item, Active Effect, and chat message change with the socket id of the client that
 * sends it, so `isOwnChange` (module/utils/change-origin.js) can tell that client from the user's other clients. Core
 * runs the `preCreate`, `preUpdate`, and `preDelete` hooks only on the client that sends a change, and every client
 * receives the options they leave.
 */

import { CHANGE_ORIGIN_OPTION } from "../config/constants.js";

/**
 * Stamp a creation with this client's socket id.
 * @param {foundry.abstract.Document} _document
 * @param {object} _data
 * @param {object} options - The creation's options, sent with it to every client
 * @returns {void}
 */
export function onPreCreateChangeOrigin(_document, _data, options) {
  options[CHANGE_ORIGIN_OPTION] = game.socket.id;
}

/**
 * Stamp an update with this client's socket id.
 * @param {foundry.abstract.Document} _document
 * @param {object} _changes
 * @param {object} options - The update's options, sent with it to every client
 * @returns {void}
 */
export function onPreUpdateChangeOrigin(_document, _changes, options) {
  options[CHANGE_ORIGIN_OPTION] = game.socket.id;
}

/**
 * Stamp a deletion with this client's socket id.
 * @param {foundry.abstract.Document} _document
 * @param {object} options - The deletion's options, sent with it to every client
 * @returns {void}
 */
export function onPreDeleteChangeOrigin(_document, options) {
  options[CHANGE_ORIGIN_OPTION] = game.socket.id;
}
