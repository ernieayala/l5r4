/**
 * @module services/dice/resources/void-points
 * @description Void Point spending for rolls: the actor a roll belongs to when the caller names none, whether it has
 * a Void Point left, and spending one under a per-actor lock. A Void Point adds +1k1 to the roll. Callers decide
 * which rolls may take one (never damage) and how many a round allows. A failed spend returns a message for the
 * caller to show instead of throwing.
 * game-rules/25_rings_and_traits.md, p.78
 */

import { F, T } from "../../../utils/localization.js";
import { buildVoidUseUpdate, warnVoidLimit } from "../../effects/uses.js";

/**
 * In-memory locks for preventing concurrent Void Point spending on the same actor.
 * Maps actor ID to lock status (true = locked, undefined = unlocked).
 * @type {Map<string, boolean>}
 */
const actorLocks = new Map();

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
 * The actor resolves through getRollActor, so the parameter may be left out. Inside the actor's lock the pool is
 * checked for every point the roll needs, then all of them are taken in one `actor.update` with `diff: true`, so a
 * roll never takes one point and stops for want of the next. The one-per-round limit is the callers' to enforce, as
 * are the techniques and spells that lift it.
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
  // Step 1: Resolve actor using fallback chain (supports optional actor)
  const resolvedActor = getRollActor(actor);

  // Early validation: actor must exist before acquiring lock
  if (!resolvedActor) {
    return buildVoidRefusal(T("l5r4.ui.notifications.noActorForVoid"));
  }

  // Step 2: Execute spending with exclusive lock to prevent race conditions
  return updateUnderLock(resolvedActor.id, async () => {
    // Step 3: Validate Void Point availability (inside lock)
    const validation = validateVoidPoints(resolvedActor, count);

    // Step 4: Early return if validation failed (not enough Void Points)
    if (!validation.valid) {
      return buildVoidRefusal(validation.message);
    }

    warnVoidLimit(resolvedActor, count);

    // Step 5: Spend the Void Points in one write. Availability was checked on the prepared pool; the write starts
    // from the stored value, so an Active Effect on Void Points is never written into storage (B6).
    await resolvedActor.update(
      {
        "system.rings.void.value": resolvedActor._source.system.rings.void.value - count,
        ...buildVoidUseUpdate(resolvedActor, count)
      },
      { diff: true }
    );

    // Step 6: Return success with L5R4 +1k1 bonuses
    return {
      success: true,
      rollBonus: 1, // +1 rolled die (XkY: increase X)
      keepBonus: 1, // +1 kept die (XkY: increase Y)
      message: null
    };
  });
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

/**
 * Execute a function with an exclusive lock on the specified actor.
 * Prevents race conditions when multiple operations attempt to modify
 * the same actor's resources simultaneously.
 *
 * Uses a simple spin-lock pattern: waits until lock is available,
 * acquires lock, executes function, releases lock in finally block.
 *
 * @param {string} actorId - Actor ID to lock
 * @param {Function} fn - Async function to execute with lock held
 * @returns {Promise<*>} Result of the function execution
 */
async function updateUnderLock(actorId, fn) {
  // Spin-lock: wait until actor is unlocked
  while (actorLocks.get(actorId)) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // Acquire lock
  actorLocks.set(actorId, true);

  try {
    // Execute function with lock held
    return await fn();
  } finally {
    // Always release lock, even if function throws
    actorLocks.delete(actorId);
  }
}
