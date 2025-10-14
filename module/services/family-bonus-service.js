/**
 * Family Bonus Service
 * 
 * Manages the application of family trait bonuses to L5R4 characters.
 * In L5R4, each family grants a +1 bonus to one specific Trait (e.g., Hida: +1 Strength, 
 * Yasuki: +1 Awareness), allowing that Trait to start at 3 instead of the default 2.
 * 
 * This service uses Foundry VTT's Active Effects system to apply these bonuses, reading
 * from the family Item's effects that target trait properties (e.g., "system.traits.str").
 * 
 * Responsibilities:
 * - Retrieve family Item from actor flags
 * - Calculate trait bonuses from family Active Effects
 * - Provide individual trait bonuses or complete bonus maps
 * - Validate trait keys and family items
 * 
 * Related Foundry APIs: Actor flags, fromUuidSync, Active Effects (v13+)
 * Related Game Rules: Character Creation Step 2 (Family Selection)
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Service for managing family trait bonuses applied to L5R4 actors.
 * 
 * Families in L5R4 grant a +1 bonus to a single Trait during character creation.
 * This service calculates these bonuses by reading Active Effects from the actor's
 * assigned family Item, filtering for effects that modify trait properties.
 */
export class FamilyBonusService {
  
  /**
   * Valid L5R4 trait keys.
   * Maps to the eight Traits organized into four Rings (Earth, Air, Fire, Water):
   * - Earth: sta (Stamina), wil (Willpower)
   * - Air: ref (Reflexes), awa (Awareness)
   * - Fire: agi (Agility), int (Intelligence)
   * - Water: str (Strength), per (Perception)
   * @type {string[]}
   */
  static VALID_TRAIT_KEYS = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"];

/**
   * Creates a zero-initialized map for all trait bonuses.
   * Used as the default/fallback when no family item exists.
   * @returns {Object.<string, number>} Map of trait keys to zero values
   * @private
   */
  static _createZeroMap() {
    const map = {};
    for (const key of this.VALID_TRAIT_KEYS) {
      map[key] = 0;
    }
    return map;
  }

/**
   * Gets the family bonus for a specific trait.
   * 
   * Calculates the total family bonus applied to a single trait by summing all
   * Active Effect changes from the actor's family Item that target the trait property.
   * Only considers effects with transfer=true and ADD mode, and only positive values.
   * 
   * @param {L5R4Actor} actor - The actor to check for family bonuses
   * @param {string} traitKey - The trait key (e.g., "str", "agi", "int")
   * @returns {number} Total family bonus for the trait (0 if none or error)
   */
  static getBonus(actor, traitKey) {
    try {
      if (!actor || !traitKey) return 0;

      if (!this.VALID_TRAIT_KEYS.includes(traitKey)) {
        console.warn(`${SYS_ID} FamilyBonusService: Invalid trait key`, { 
          actorId: actor?.id, 
          traitKey,
          validKeys: this.VALID_TRAIT_KEYS
        });
        return 0;
      }

      const familyItem = this.getFamilyItem(actor);
      if (!familyItem) return 0;

      const effectKey = `system.traits.${traitKey}`;
      let total = 0;

      for (const effect of familyItem.effects ?? []) {
        // Only process effects that transfer to the actor (not temporary/suppressed effects)
        if (effect?.transfer !== true) continue;

        for (const change of effect.changes ?? []) {
          if (change?.key === effectKey && change?.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
            const value = Number(change?.value ?? 0);
            // Only accept positive bonuses - negative values would be penalties, not family bonuses
            if (Number.isFinite(value) && value > 0) {
              total += value;
            }
          }
        }
      }

      return total;
    } catch (err) {
      console.warn(`${SYS_ID} FamilyBonusService: Failed to get bonus for trait`, { 
        actorId: actor?.id, 
        traitKey, 
        err 
      });
      return 0;
    }
  }

/**
   * Gets a complete map of all trait bonuses from the actor's family.
   * 
   * Returns an object with all eight trait keys mapped to their family bonuses.
   * Uses Active Effects from the family Item, filtering for effects that modify
   * trait properties (system.traits.*) with transfer=true and ADD mode.
   * 
   * This is more efficient than calling getBonus() multiple times when you need
   * bonuses for multiple traits.
   * 
   * @param {L5R4Actor} actor - The actor to retrieve family bonuses for
   * @returns {Object.<string, number>} Map of trait keys to their bonus values (0 if none)
   */
  static getBonusMap(actor) {
    try {
      const familyItem = this.getFamilyItem(actor);
      if (!familyItem) {
        return this._createZeroMap();
      }

      const bonusMap = this._createZeroMap();

      for (const effect of familyItem.effects ?? []) {
        // Only process effects that transfer to the actor (not temporary/suppressed effects)
        if (effect?.transfer !== true) continue;

        for (const change of effect.changes ?? []) {
          if (change?.mode !== CONST.ACTIVE_EFFECT_MODES.ADD) continue;

          // Extract trait key from effect property path (e.g., "system.traits.str" -> "str")
          const match = change?.key?.match(/^system\.traits\.(\w+)$/);
          if (match && this.VALID_TRAIT_KEYS.includes(match[1])) {
            const traitKey = match[1];
            const value = Number(change?.value ?? 0);
            // Only accept positive bonuses - negative values would be penalties, not family bonuses
            if (Number.isFinite(value) && value > 0) {
              bonusMap[traitKey] += value;
            }
          }
        }
      }

      return bonusMap;
    } catch (err) {
      console.warn(`${SYS_ID} FamilyBonusService: Failed to get bonus map`, { 
        actorId: actor?.id, 
        err 
      });
      return this._createZeroMap();
    }
  }

/**
   * Retrieves the family Item associated with an actor.
   * 
   * Reads the family Item UUID from actor flags (flags.l5r4.familyItemUuid) and
   * resolves it using Foundry's fromUuidSync. Validates that the item exists and
   * has type "family".
   * 
   * Requires Foundry v13+ (uses fromUuidSync).
   * 
   * @param {L5R4Actor} actor - The actor to retrieve the family item for
   * @returns {Item|null} The family Item, or null if not found/invalid
   */
  static getFamilyItem(actor) {
    try {
      if (!actor) return null;

      const uuid = actor.getFlag?.(SYS_ID, "familyItemUuid");
      if (!uuid) return null;

      if (typeof globalThis.fromUuidSync !== "function") {
        console.warn(`${SYS_ID} FamilyBonusService: fromUuidSync not available`);
        return null;
      }

      const item = fromUuidSync(uuid);

      if (!item || item.type !== "family") {
        return null;
      }

      return item;
    } catch (err) {
      console.warn(`${SYS_ID} FamilyBonusService: Failed to get family item`, { 
        actorId: actor?.id, 
        err 
      });
      return null;
    }
  }

/**
   * Checks whether an actor has a valid family assigned.
   * 
   * @param {L5R4Actor} actor - The actor to check
   * @returns {boolean} True if actor has a valid family Item
   */
  static hasValidFamily(actor) {
    return this.getFamilyItem(actor) !== null;
  }

/**
   * Gets the display name of the actor's family.
   * 
   * Reads from actor flags (flags.l5r4.familyName) for display purposes.
   * This is stored separately from the family Item for performance.
   * 
   * @param {L5R4Actor} actor - The actor to retrieve the family name for
   * @returns {string|null} The family name, or null if not set or error
   */
  static getFamilyName(actor) {
    try {
      return actor.getFlag?.(SYS_ID, "familyName") ?? null;
    } catch (err) {
      return null;
    }
  }
}
