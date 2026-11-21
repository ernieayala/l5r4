/**
 * @module utils/gm-client
 * @description Which of the GM user's clients answers for it. Core sends a GM query to every client of the GM user
 * and takes the first answer, and the GM-only work behind `game.user.isActiveGM` runs on each of them (#82), so the
 * clients agree on one: the one that started first among those heard from lately, a tie going to the lower socket id.
 */

/**
 * A GM client as the others know it.
 * @typedef {object} GmClient
 * @property {string} id         Its socket id
 * @property {number} startedAt  When it started, in ms since the epoch
 * @property {number} [seen]     When it was last heard from, for another client
 */

/**
 * Whether this client is the one that answers for the GM user: no other client heard from within `ttl` started
 * earlier, or at the same time with a lower socket id.
 * @param {GmClient} self - This client
 * @param {GmClient[]} others - The other GM clients heard from
 * @param {object} timing
 * @param {number} timing.now - The time now, in ms since the epoch
 * @param {number} timing.ttl - How long a client counts as present after it was last heard from, in ms
 * @returns {boolean}
 */
export function isAnsweringClient(self, others, { now, ttl }) {
  return !others.some(
    other =>
      other.id !== self.id &&
      now - other.seen <= ttl &&
      (other.startedAt < self.startedAt ||
        (other.startedAt === self.startedAt && other.id < self.id))
  );
}
