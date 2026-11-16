/**
 * @module services/dice/resources/spell-slots
 * @description Spell slot checks and spending for a shugenja's casting. A shugenja holds one slot per rank of each
 * elemental Ring, plus Void slots that cast in any element. A slot is spent when the Spell Casting Roll is made,
 * whether it succeeds or fails; a spell interrupted after a successful roll keeps its slot. Spending runs under a
 * per-actor lock and writes the slot path on the actor.
 * game-rules/66_magic_and_spell_casting.md, p.163
 */

import { T } from "../../../utils/localization.js";
import { resolveActor } from "./void-points.js";

/**
 * In-memory locks for preventing concurrent spell slot spending on the same actor.
 * Maps actor ID to lock status (true = locked, undefined = unlocked).
 * @type {Map<string, boolean>}
 */
const actorLocks = new Map();

/**
 * Valid ring types for spell slots in L5R4.
 * Corresponds to the five elemental rings that govern spell casting.
 *
 * @type {string[]}
 * @constant
 */
const VALID_RINGS = Object.freeze(["water", "air", "fire", "earth", "void"]);

/**
 * Validation result for spell slot availability.
 *
 * @typedef {object} SpellSlotValidation
 * @property {boolean} valid - Whether a spell slot is available for use
 * @property {number} current - Current number of available slots (0 if invalid)
 * @property {string|null} message - Localized error message if invalid, null if valid
 * @property {string|null} path - Actor property path to the spell slot (e.g., "system.spellSlots.fire")
 */

/**
 * Result of attempting to spend a spell slot.
 *
 * @typedef {object} SpellSlotSpendResult
 * @property {boolean} success - Whether the slot was successfully spent
 * @property {string} label - Display label for chat message (e.g., " [Fire Slot]")
 * @property {string|null} message - Localized error message if failed, null if successful
 */

/**
 * Validates whether an actor has an available spell slot for the specified ring.
 *
 * Performs three validation checks: (1) Actor exists, (2) Ring key is valid
 * (water, air, fire, earth, void), (3) Actor has at least one remaining slot.
 *
 * For elemental slots, checks `system.spellSlots.{ring}` (based on Ring rank).
 * For Void slots, checks `system.spellSlots.void` (bonus slots from Void Ring).
 *
 * Returns structured validation result with availability status, current slot count,
 * localized error message (if any), and property path for updates. Used by ring-roll.js
 * before casting spells to ensure slot availability and provide user feedback.
 *
 * @param {L5R4Actor} actor - The actor to validate spell slots for
 * @param {string} ringKey - Ring identifier ("water", "air", "fire", "earth", "void")
 * @param {boolean} [isVoidSlot=false] - Whether checking Void bonus slots (true) or elemental slots (false)
 * @returns {SpellSlotValidation} Validation result with availability and error details
 */
export function validateSpellSlot(actor, ringKey, isVoidSlot = false) {
  if (!actor) {
    return {
      valid: false,
      current: 0,
      message: T("l5r4.ui.notifications.noActorForVoid"),
      path: null
    };
  }

  const normalizedRing = String(ringKey).toLowerCase();
  if (!VALID_RINGS.includes(normalizedRing)) {
    return {
      valid: false,
      current: 0,
      message: game.i18n.localize("l5r4.ui.notifications.invalidRingForSpell", { ring: ringKey }),
      path: null
    };
  }

  const path = isVoidSlot ? "system.spellSlots.void" : `system.spellSlots.${normalizedRing}`;
  const current = Number(foundry.utils.getProperty(actor, path) ?? 0) || 0;

  if (current <= 0) {
    const ringLabel = isVoidSlot
      ? `${game.i18n.localize("l5r4.ui.mechanics.rings.void")} ${game.i18n.localize(
          "l5r4.magic.spells.voidSlot"
        )}`
      : game.i18n.localize(`l5r4.ui.mechanics.rings.${normalizedRing}`) || normalizedRing;

    return {
      valid: false,
      current: 0,
      message: `${ringLabel}: 0`,
      path
    };
  }

  return {
    valid: true,
    current,
    message: null,
    path
  };
}

/**
 * Spends an elemental spell slot for the specified ring.
 *
 * Called when a shugenja casts a spell using their Ring-based spell slots.
 * Per L5R4 rules, shugenja have slots equal to their Ring rank in each element.
 *
 * Example: A shugenja with Fire 3 has 3 Fire spell slots per day.
 *
 * The slot is decremented from `system.spellSlots.{ring}` on the actor.
 * Returns a chat label (e.g., " [Fire Slot]") for display in roll messages.
 * game-rules/66_magic_and_spell_casting.md, p.163
 *
 * @param {L5R4Actor} actor - The actor casting the spell
 * @param {string} ringKey - Ring identifier ("water", "air", "fire", "earth")
 * @returns {Promise<SpellSlotSpendResult>} Result with success status and chat label
 */
export async function spendElementalSlot(actor, ringKey) {
  return _spendSlot(actor, ringKey, false);
}

/**
 * Spends a Void bonus spell slot.
 *
 * Called when a shugenja casts a spell using one of their Void Ring bonus slots.
 * Per L5R4 rules, shugenja have bonus spell slots equal to their Void Ring rank,
 * which can be used to cast additional spells of any element.
 *
 * Example: A shugenja with Void 2 has 2 bonus slots usable for any element.
 *
 * The slot is decremented from `system.spellSlots.void` on the actor.
 * Returns a chat label (e.g., " [Void Void Slot]") for display in roll messages.
 * game-rules/66_magic_and_spell_casting.md, p.163
 *
 * @param {L5R4Actor} actor - The actor casting the spell
 * @returns {Promise<SpellSlotSpendResult>} Result with success status and chat label
 */
export async function spendVoidSlot(actor) {
  return _spendSlot(actor, "void", true);
}

/**
 * Execute a function with an exclusive lock on the specified actor.
 * Prevents race conditions when multiple operations attempt to modify
 * the same actor's spell slots simultaneously.
 *
 * Uses a simple spin-lock pattern: waits until lock is available,
 * acquires lock, executes function, releases lock in finally block.
 *
 * @param {string} actorId - Actor ID to lock
 * @param {Function} fn - Async function to execute with lock held
 * @returns {Promise<*>} Result of the function execution
 */
async function withLock(actorId, fn) {
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

/**
 * Internal helper to spend a spell slot after validation.
 *
 * Validates slot availability, decrements the slot count via Actor update,
 * and constructs a localized label for chat display.
 *
 * The update passes `{diff: true}`, so only the changed slot path is sent to the server.
 *
 * @param {L5R4Actor} actor - The actor spending the spell slot
 * @param {string} ringKey - Ring identifier for the slot type
 * @param {boolean} isVoidSlot - Whether spending a Void bonus slot (true) or elemental slot (false)
 * @returns {Promise<SpellSlotSpendResult>} Result with success status and chat label
 */
async function _spendSlot(actor, ringKey, isVoidSlot) {
  const resolvedActor = resolveActor(actor);

  // Early validation: actor must exist before acquiring lock
  if (!resolvedActor) {
    return {
      success: false,
      label: "",
      message: T("l5r4.ui.notifications.noActorForVoid")
    };
  }

  // Execute spending with exclusive lock to prevent race conditions
  return withLock(resolvedActor.id, async () => {
    const validation = validateSpellSlot(resolvedActor, ringKey, isVoidSlot);

    if (!validation.valid) {
      return {
        success: false,
        label: "",
        message: validation.message
      };
    }

    // Availability was checked on the prepared count; the write starts from the stored one, so an Active Effect
    // on spell slots is never written into storage (B6).
    const stored = foundry.utils.getProperty(resolvedActor._source, validation.path);
    await resolvedActor.update({ [validation.path]: stored - 1 }, { diff: true });

    const ringDisplay =
      game.i18n.localize(`l5r4.ui.mechanics.rings.${String(ringKey).toLowerCase()}`) || ringKey;
    const label = isVoidSlot
      ? ` [${ringDisplay} ${game.i18n.localize("l5r4.magic.spells.voidSlot") || "Slot"}]`
      : ` [${ringDisplay} Slot]`;

    return {
      success: true,
      label,
      message: null
    };
  });
}
