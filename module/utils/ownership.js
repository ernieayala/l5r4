/**
 * @module utils/ownership
 * @description Who plays a document. A roll whose choices are a player's (a Void Point, Raises) goes to that player's
 * own client while they are connected; a GM's client rolls it only for a document no connected player owns (#151,
 * #165).
 */

/**
 * Whether a connected player, not a GM, owns a document.
 * @param {foundry.abstract.Document} document - An actor, usually
 * @param {Iterable<User>} users - Every user in the world (`game.users`)
 * @returns {boolean}
 */
export function hasActivePlayer(document, users) {
  return [...users].some(
    user => user.active && !user.isGM && document.testUserPermission(user, "OWNER")
  );
}
