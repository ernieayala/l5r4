/**
 * @module services/dice/resources/void-points
 * @description Void Point spending: the actor a roll belongs to when the caller names none, whether it has a Void
 * Point left, and spending them. A Void Point adds +1k1 to a roll. Callers decide which rolls may take one (never
 * damage) and how many a round allows. A failed spend returns a message for the caller to show instead of throwing.
 *
 * Every spend runs on the answering GM client, in the actor's write queue (module/services/write-queue.js), so two
 * spends from different clients never both take the same point: a player's spend is a GM query, and only with no GM
 * connected does a player spend on their own client (Ernie's ruling, #170).
 * game-rules/25_rings_and_traits.md, p.78
 */

import { SYS_ID } from "../../../config/constants.js";
import { F, T } from "../../../utils/localization.js";
import { buildVoidUseUpdate, isVoidOverLimit, warnVoidLimit } from "../../effects/uses.js";
import { askGmQuery, registerGmQuery } from "../../gm-client.js";
import { queueActorWrite } from "../../write-queue.js";

/** Name of the GM query that spends a player's Void Points. */
export const SPEND_VOID_QUERY = `${SYS_ID}.spendVoid`;

/**
 * What a spend did, as the GM side answers it.
 * @typedef {object} VoidSpend
 * @property {boolean} spent - Whether the points were taken
 * @property {number} current - Void Points left
 * @property {boolean} overLimit - Whether the spend passed the Round's limit, for the warning
 */

/**
 * Validation result from Void Point availability check.
 *
 * Returned by validateVoidPoints() to communicate validation status
 * and current Void Point pool to callers.
 *
 * @typedef {object} ValidationResult
 * @property {boolean} valid - Whether actor has available Void Points to spend
 * @property {number} current - Current Void Point pool (0 if invalid)
 * @property {string|null} message - Localized error message for user (null if valid)
 */

/**
 * Result from Void Point expenditure attempt.
 *
 * Returned by spendVoidPoint() to communicate success status and roll bonuses.
 * If successful, rollBonus and keepBonus implement the L5R4 +1k1 mechanic.
 * If failed, bonuses are 0 and message contains user-facing error text.
 *
 * @typedef {object} VoidSpendResult
 * @property {boolean} success - Whether Void Point was successfully spent
 * @property {number} rollBonus - Rolled dice bonus (+1 for +1k1 mechanic, 0 if failed)
 * @property {number} keepBonus - Kept dice bonus (+1 for +1k1 mechanic, 0 if failed)
 * @property {string|null} message - Localized error message for user (null if success)
 */

/**
 * Resolve the actor a roll belongs to: the one the caller passes, else the first controlled token's, else the
 * user's assigned character, else the chat speaker's.
 *
 * A GM's explicit actor wins; a player's selected token comes next, then the character assigned to the player, then
 * the actor a chat-driven roll speaks as. The canvas, the selection, and the assigned character can each be absent
 * (no canvas, no selection, a GM), so each step reads through optional chaining.
 *
 * @param {L5R4Actor} [providedActor] - Explicitly provided actor (optional)
 * @returns {L5R4Actor|null} Resolved actor, or null if no actor found
 */
export function getRollActor(providedActor) {
  // Priority 1: Explicit actor from caller (GM override, direct item roll)
  if (providedActor) {
    return providedActor;
  }

  // Priority 2: Controlled token on canvas (player selected token)
  if (canvas?.tokens?.controlled?.[0]?.actor) {
    return canvas.tokens.controlled[0].actor;
  }

  // Priority 3: Assigned character (player's default character)
  if (game.user?.character) {
    return game.user.character;
  }

  // Priority 4: Chat speaker fallback (message-driven rolls)
  const speaker = ChatMessage.getSpeaker();
  return speaker?.actor ? game.actors?.get(speaker.actor) : null;
}

/**
 * Validate actor has available Void Points to spend.
 *
 * Checks two conditions:
 * 1. **Actor Exists**: Non-null actor provided (getRollActor may return null)
 * 2. **Void Available**: Current Void Point pool > 0 (actor.system.rings.void.value)
 *
 * Returns validation result with:
 * - `valid: false` + error message if actor missing or Void Points depleted
 * - `valid: true` + current pool if Void Point available
 *
 * **L5R4 Mechanics:**
 * Void Ring determines maximum Void Points (refreshes daily after rest).
 * This function only checks current availability, not whether spending is
 * rules-legal for the specific roll type (callers enforce that).
 *
 * **Data Model:**
 * Reads from `actor.system.rings.void.value` (current pool).
 * Uses defensive fallback to 0 if data structure is missing.
 * Coerces to number to handle string values from form inputs.
 *
 * Each Void Point use takes its own point, so a roll that spends two needs both.
 * game-rules/25_rings_and_traits.md, p.78
 *
 * @param {L5R4Actor|null} actor - Actor to check for Void Point availability
 * @param {number} [count=1] - Void Points the roll needs
 * @returns {ValidationResult} Validation result with status, current pool, and error message
 */
export function validateVoidPoints(actor, count = 1) {
  // getRollActor may return null
  if (!actor) {
    return { valid: false, current: 0, message: T("l5r4.ui.notifications.noActorForVoid") };
  }
  // Defensive: handle missing data structure, coerce to number, fallback to 0
  const current = Math.max(0, Number(actor.system?.rings?.void?.value ?? 0) || 0);
  if (current >= count) {
    return { valid: true, current, message: null };
  }
  return { valid: false, current, message: formatVoidShortage(actor, current, count) };
}

/**
 * Spend Void Points, one per use, and return the +1k1 one gives: one more die rolled and one more kept, so a 3k2 roll
 * becomes 4k3.
 *
 * The actor resolves through getRollActor, so the parameter may be left out. The spend runs on the answering GM client
 * in the actor's write queue (spendQueuedVoidPoints): the pool is checked for every point the roll needs, then all of
 * them are taken in one write, so a roll never takes one point and stops for want of the next. The one-per-round
 * limit warns here, on the spender's client; the techniques and spells that lift it are counted in it.
 *
 * A failed spend takes nothing and returns `success: false`, zero bonuses, and a localized message, which callers show
 * through `ui.notifications.warn`, instead of throwing.
 * game-rules/25_rings_and_traits.md, p.78
 *
 * @param {L5R4Actor} [actor] - Actor to spend Void Point from (optional; uses resolution chain)
 * @param {number} [count=1] - Void Points to spend together
 * @returns {Promise<VoidSpendResult>} Result with success status, bonuses, and optional error
 */
export async function spendVoidPoint(actor, count = 1) {
  const resolvedActor = getRollActor(actor);
  if (!resolvedActor) {
    return buildVoidRefusal(T("l5r4.ui.notifications.noActorForVoid"));
  }
  const answer = await requestVoidSpend(resolvedActor, count);
  if ("refusal" in answer) {
    return buildVoidRefusal(answer.refusal);
  }
  const spend = answer.value;
  if (!spend.spent) {
    return buildVoidRefusal(formatVoidShortage(resolvedActor, spend.current, count));
  }
  if (spend.overLimit) {
    warnVoidLimit(resolvedActor);
  }
  return {
    success: true,
    rollBonus: 1, // +1 rolled die (XkY: increase X)
    keepBonus: 1, // +1 kept die (XkY: increase Y)
    message: null
  };
}

/**
 * Spend Void Points inside a write already queued on the actor (queueActorWrite): check the pool for all of them, then
 * take them in one `actor.update` with `diff: true`, together with any other change the caller's write makes from the
 * same stored values (a damage result's Wounds). Availability is checked on the prepared pool; the write starts from
 * the stored value, so an Active Effect on Void Points is never written into storage (B6).
 * game-rules/25_rings_and_traits.md, p.78
 * @param {Actor} actor
 * @param {number} count - Void Points to spend together
 * @param {function(object): object} [buildChange] - Gets the actor's stored `system` and returns more of the update
 * @returns {Promise<VoidSpend>}
 */
export async function spendQueuedVoidPoints(actor, count, buildChange = () => ({})) {
  const { valid, current } = validateVoidPoints(actor, count);
  if (!valid) {
    return { spent: false, current, overLimit: false };
  }
  const overLimit = isVoidOverLimit(actor, count);
  const stored = actor._source.system;
  await actor.update(
    {
      "system.rings.void.value": stored.rings.void.value - count,
      ...buildVoidUseUpdate(actor, count),
      ...buildChange(stored)
    },
    { diff: true }
  );
  return { spent: true, current: current - count, overLimit };
}

/** Register the GM side of a player's Void Point spend. */
export function registerVoidQueries() {
  registerGmQuery(SPEND_VOID_QUERY, (request, { user }) => applyVoidSpendRequest(request, user));
}

/**
 * Spend Void Points where every spend for the actor is queued: on this client when it is the GM's, or when no GM is
 * connected and the player spends their own character's (Ernie's ruling, #170); otherwise on the active GM's.
 * @param {Actor} actor
 * @param {number} count
 * @returns {Promise<{value: VoidSpend}|{refusal: string}>} The spend, or the localized reason the GM side refused
 */
async function requestVoidSpend(actor, count) {
  const spendHere = () => queueActorWrite(actor, () => spendQueuedVoidPoints(actor, count));
  if (!game.user.isGM && !game.users.activeGM) {
    return { value: await spendHere() };
  }
  return askGmQuery(SPEND_VOID_QUERY, { actorUuid: actor.uuid, count }, spendHere);
}

/**
 * A player's Void Point spend, on the GM: the request came from another client, so the actor must exist, the count be
 * a whole number of at least one, and the player own the actor.
 * @param {{actorUuid: string, count: number}} request
 * @param {User} user - The requesting user
 * @returns {Promise<VoidSpend>}
 */
async function applyVoidSpendRequest({ actorUuid, count }, user) {
  const actor = await fromUuid(String(actorUuid));
  if (actor?.documentName !== "Actor" || !Number.isInteger(count) || count < 1) {
    throw new Error("l5r4.ui.requests.notVoidSpend");
  }
  if (!actor.testUserPermission(user, "OWNER")) {
    throw new Error("l5r4.ui.requests.notYourVoid");
  }
  return queueActorWrite(actor, () => spendQueuedVoidPoints(actor, count));
}

/**
 * Why a roll cannot take its Void Points: none left, or fewer than it needs.
 * @param {L5R4Actor} actor - The roller
 * @param {number} current - Void Points left
 * @param {number} needed - Void Points the roll needs
 * @returns {string}
 */
function formatVoidShortage(actor, current, needed) {
  if (current === 0) {
    return T("l5r4.ui.mechanics.rings.voidPointsEmpty");
  }
  return F("l5r4.ui.mechanics.rings.voidPointsShort", { needed, name: actor.name, current });
}

/**
 * A Void Point spend that failed: no bonuses, and the reason.
 * @param {string} message - The localized reason
 * @returns {VoidSpendResult}
 */
function buildVoidRefusal(message) {
  return {
    success: false,
    rollBonus: 0,
    keepBonus: 0,
    message
  };
}
