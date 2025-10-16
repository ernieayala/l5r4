/**
 * Void Point Manager Service
 *
 * Manages Void Point expenditure and actor resolution for L5R4 dice rolls.
 * Handles validation, spending, and bonus calculation for Void Points per
 * Legend of the Five Rings 4th Edition core mechanics.
 *
 * Key Responsibilities:
 * - **Actor Resolution**: Fallback chain to find active actor (provided → controlled → assigned → speaker)
 * - **Void Validation**: Check actor has available Void Points
 * - **Void Expenditure**: Spend Void Point, decrement pool, return roll bonuses
 * - **Error Handling**: Provide user-facing error messages for invalid operations
 *
 * L5R4 Game Mechanics:
 * - Void Points equal character's Void Ring value (refreshes daily after rest)
 * - Spending a Void Point grants +1k1 bonus to a roll (roll +1 die, keep +1 die)
 * - Normal limit: 1 Void Point per round (enforced by callers)
 * - Cannot normally enhance damage rolls (exception: katana special rule)
 * - Can also increase Armor TN, reduce damage, swap initiative, etc. (not handled here)
 *
 * Foundry VTT Integration:
 * - Uses ChatMessage.getSpeaker() for speaker-based actor resolution
 * - Leverages canvas.tokens.controlled for selected token access
 * - Uses game.user.character for assigned character fallback
 * - Updates actor.system.rings.void.value via Document.update() with diff optimization
 * - Optional chaining handles missing Foundry globals (GM view without canvas)
 *
 * Usage Pattern:
 * ```javascript
 * // Roll services call spendVoidPoint when user requests Void expenditure
 * const result = await spendVoidPoint(actor);
 * if (!result.success) {
 *   ui.notifications.warn(result.message);
 *   return;
 * }
 * // Apply result.rollBonus and result.keepBonus to dice formula
 * ```
 *
 * @module services/dice/resources/void-manager
 * @see {@link https://foundryvtt.com/api/v13/classes/client.ChatMessage.html#getSpeaker|ChatMessage.getSpeaker}
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.Document.html#update|Document.update}
 */

import { T } from "../../../utils/localization.js";

/**
 * Validation result from Void Point availability check.
 *
 * Returned by validateVoidPoints() to communicate validation status
 * and current Void Point pool to callers.
 *
 * @typedef {Object} ValidationResult
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
 * @typedef {Object} VoidSpendResult
 * @property {boolean} success - Whether Void Point was successfully spent
 * @property {number} rollBonus - Rolled dice bonus (+1 for +1k1 mechanic, 0 if failed)
 * @property {number} keepBonus - Kept dice bonus (+1 for +1k1 mechanic, 0 if failed)
 * @property {string|null} message - Localized error message for user (null if success)
 */

/**
 * Resolve the active actor using Foundry's prioritized fallback chain.
 *
 * Implements a 4-step fallback to find the actor for the current action:
 * 1. **Provided Actor**: Explicit actor passed by caller (highest priority)
 * 2. **Controlled Token**: First selected token on canvas (player selection)
 * 3. **Assigned Character**: User's assigned character (player default)
 * 4. **Chat Speaker**: Actor derived from chat message speaker (fallback)
 *
 * This priority order ensures:
 * - GM actions use explicitly provided actors (flexibility)
 * - Player actions use their selected/controlled tokens (common case)
 * - Uncontrolled players fall back to assigned character (convenience)
 * - Chat-initiated actions use message speaker (consistency)
 *
 * **Foundry VTT Integration:**
 * - `canvas.tokens.controlled[0]` may be undefined (no canvas or no selection)
 * - `game.user.character` may be null (unassigned users, GMs)
 * - `ChatMessage.getSpeaker()` returns object with .actor property (actor ID)
 * - Optional chaining prevents errors when Foundry globals are undefined
 *
 * @param {L5R4Actor} [providedActor] - Explicitly provided actor (optional)
 * @returns {L5R4Actor|null} Resolved actor, or null if no actor found
 */
export function resolveActor(providedActor) {
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
 * 1. **Actor Exists**: Non-null actor provided (resolveActor may return null)
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
 * @param {L5R4Actor|null} actor - Actor to check for Void Point availability
 * @returns {ValidationResult} Validation result with status, current pool, and error message
 */
export function validateVoidPoints(actor) {
  // Validation 1: Actor must exist (resolveActor may return null)
  if (!actor) {
    return {
      valid: false,
      current: 0,
      message: T("l5r4.ui.notifications.noActorForVoid")
    };
  }

  // Validation 2: Void Point pool must be > 0
  // Defensive: handle missing data structure, coerce to number, fallback to 0
  const curVoid = Number(actor.system?.rings?.void?.value ?? 0) || 0;
  if (curVoid <= 0) {
    return {
      valid: false,
      current: 0,
      message: `${T("l5r4.ui.mechanics.rings.voidPoints")}: 0`
    };
  }

  return {
    valid: true,
    current: curVoid,
    message: null
  };
}

/**
 * Spend a Void Point and return roll bonuses per L5R4 mechanics.
 *
 * **Process:**
 * 1. Resolve actor (may use fallback chain if actor not explicitly provided)
 * 2. Validate actor has available Void Points
 * 3. If invalid: Return failure with error message
 * 4. If valid: Decrement Void pool by 1, return +1k1 bonuses
 *
 * **L5R4 Mechanics:**
 * Spending a Void Point grants a +1k1 bonus to the roll:
 * - **+1 Roll Die**: Roll one additional die (more chances for high results/explosions)
 * - **+1 Keep Die**: Keep one additional die (guaranteed increase to result)
 *
 * Example: (3k2) roll becomes (4k3) roll with Void expenditure.
 *
 * Normal rules limit: 1 Void Point per round (not enforced here; callers handle).
 * Some techniques/spells allow multiple Void per round (caller responsibility).
 *
 * **Side Effect:**
 * Updates actor document via `actor.update()` to decrement void.value by 1.
 * Uses `diff: true` option for minimal update performance (Foundry v13 best practice).
 *
 * **Foundry Integration:**
 * - Async operation (await actor.update) - callers must await this function
 * - Uses resolveActor() internally (supports optional actor parameter)
 * - Updates actor.system.rings.void.value via Document update API
 *
 * **Error Handling:**
 * Returns failure result (success: false, bonuses: 0) with localized error message
 * instead of throwing. Callers display message via ui.notifications.warn().
 *
 * @param {L5R4Actor} [actor] - Actor to spend Void Point from (optional; uses resolution chain)
 * @returns {Promise<VoidSpendResult>} Result with success status, bonuses, and optional error
 * @async
 */
export async function spendVoidPoint(actor) {
  // Step 1: Resolve actor using fallback chain (supports optional actor)
  const resolvedActor = resolveActor(actor);

  // Step 2: Validate Void Point availability
  const validation = validateVoidPoints(resolvedActor);

  // Step 3: Early return if validation failed (no Void available)
  if (!validation.valid) {
    return {
      success: false,
      rollBonus: 0,
      keepBonus: 0,
      message: validation.message
    };
  }

  // Step 4: Spend Void Point - decrement pool by 1
  // Uses diff: true for optimized update (Foundry v13)
  await resolvedActor.update({ "system.rings.void.value": validation.current - 1 }, { diff: true });

  // Step 5: Return success with L5R4 +1k1 bonuses
  return {
    success: true,
    rollBonus: 1, // +1 rolled die (XkY: increase X)
    keepBonus: 1, // +1 kept die (XkY: increase Y)
    message: null
  };
}
