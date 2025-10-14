/**
 * Spell Slot Management Service
 *
 * Manages L5R4 spell slot validation and consumption for shugenja spellcasting.
 * Per core rules, shugenja have spell slots equal to their Ring rank in each element,
 * plus bonus Void spell slots (equal to Void Ring) that can be used for any element.
 *
 * Spell slots are consumed when:
 * - A spell is successfully cast
 * - A spell casting roll fails (kami are angered by failure)
 *
 * Spell slots are NOT consumed when:
 * - A spell is interrupted after a successful casting roll
 *
 * Responsibilities:
 * - Validate spell slot availability before casting
 * - Consume elemental and Void spell slots
 * - Generate localized error messages for insufficient slots
 * - Construct dynamic property paths for Actor updates
 *
 * Foundry APIs: foundry.utils.getProperty (v13+), Actor.update
 * Game Rules: Spell slot mechanics per Spells.md
 *
 * @module services/dice/resources/spell-slot-manager
 */

import { T } from "../../../utils/localization.js";
import { resolveActor } from "./void-manager.js";

/**
 * Valid ring types for spell slots in L5R4.
 * Corresponds to the five elemental rings that govern spell casting.
 *
 * @type {string[]}
 * @constant
 */
const VALID_RINGS = ["water", "air", "fire", "earth", "void"];

/**
 * Validation result for spell slot availability.
 *
 * @typedef {Object} SpellSlotValidation
 * @property {boolean} valid - Whether a spell slot is available for use
 * @property {number} current - Current number of available slots (0 if invalid)
 * @property {string|null} message - Localized error message if invalid, null if valid
 * @property {string|null} path - Actor property path to the spell slot (e.g., "system.spellSlots.fire")
 */

/**
 * Result of attempting to spend a spell slot.
 *
 * @typedef {Object} SpellSlotSpendResult
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
      message: game.i18n.format("l5r4.ui.notifications.invalidRingForSpell", { ring: ringKey }),
      path: null
    };
  }

  const path = isVoidSlot ? "system.spellSlots.void" : `system.spellSlots.${normalizedRing}`;
  const current = Number(foundry.utils.getProperty(actor, path) ?? 0) || 0;

  if (current <= 0) {
    const ringLabel = isVoidSlot
      ? `${game.i18n.localize("l5r4.ui.mechanics.rings.void")} ${game.i18n.localize("l5r4.magic.spells.voidSlot")}`
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
 * Internal helper to spend a spell slot after validation.
 *
 * Validates slot availability, decrements the slot count via Actor update,
 * and constructs a localized label for chat display.
 *
 * Uses `Actor.update` with `{diff: true}` for optimized Foundry v13+ updates.
 * Only sends the changed property to the server, reducing network overhead.
 *
 * @param {L5R4Actor} actor - The actor spending the spell slot
 * @param {string} ringKey - Ring identifier for the slot type
 * @param {boolean} isVoidSlot - Whether spending a Void bonus slot (true) or elemental slot (false)
 * @returns {Promise<SpellSlotSpendResult>} Result with success status and chat label
 * @private
 */
async function _spendSlot(actor, ringKey, isVoidSlot) {
  const resolvedActor = resolveActor(actor);
  const validation = validateSpellSlot(resolvedActor, ringKey, isVoidSlot);

  if (!validation.valid) {
    return {
      success: false,
      label: "",
      message: validation.message
    };
  }

  await resolvedActor.update({ [validation.path]: validation.current - 1 }, { diff: true });

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
 *
 * @param {L5R4Actor} actor - The actor casting the spell
 * @returns {Promise<SpellSlotSpendResult>} Result with success status and chat label
 */
export async function spendVoidSlot(actor) {
  return _spendSlot(actor, "void", true);
}
