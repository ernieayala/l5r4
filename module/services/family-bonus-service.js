/**
 * @fileoverview Family Bonus Service - L5R4 Family Trait Bonus Management
 * 
 * Centralized service for calculating family trait bonuses from embedded family items.
 * Handles Active Effects integration, UUID resolution, and bonus aggregation for the
 * L5R4 family system where families grant +1 bonuses to specific traits.
 * 
 * **Responsibilities:**
 * - Calculate family bonus for individual traits from Active Effects
 * - Retrieve complete bonus map for all traits
 * - Resolve family item from stored UUID
 * - Validate family item existence and type
 * - Safe error handling for missing/invalid family data
 * 
 * **Family Bonus System:**
 * In L5R4, when a character has a family, that family grants a +1 bonus to one
 * specific trait (e.g., Crab family might grant +1 Stamina). This is implemented
 * via Active Effects on the family item that are transferred to the actor.
 * 
 * The PC sheet displays "effective" trait values (base + family bonus) but stores
 * only the base value. This service provides the bridge between the two by reading
 * the Active Effects from the embedded family item.
 * 
 * **Active Effects Integration:**
 * - Family items have Active Effects with `transfer: true`
 * - Effects modify `system.traits.{traitKey}` with ADD mode
 * - Only transferred effects are counted
 * - Multiple effects on same trait are summed
 * - Effects are validated and sanitized
 * 
 * **Usage Examples:**
 * ```javascript
 * // Get bonus for a single trait
 * const staBonus = FamilyBonusService.getBonus(actor, "sta");
 * 
 * // Get all trait bonuses at once
 * const bonusMap = FamilyBonusService.getBonusMap(actor);
 * // bonusMap = { sta: 1, wil: 0, str: 0, ... }
 * 
 * // Get the family item document
 * const familyItem = FamilyBonusService.getFamilyItem(actor);
 * 
 * // Check if family is valid
 * const hasFamily = FamilyBonusService.hasValidFamily(actor);
 * ```
 * 
 * **Error Handling:**
 * All methods fail gracefully:
 * - Missing family UUID → returns 0 / empty map
 * - Invalid UUID → returns 0 / empty map
 * - Wrong item type → returns 0 / empty map
 * - Missing Active Effects → returns 0 / empty map
 * - Malformed effect data → skips that effect
 * - Never throws errors, always returns safe defaults
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/documents.ActiveEffect.html|ActiveEffect}
 * @see {@link https://foundryvtt.com/api/global.html#fromUuidSync|fromUuidSync}
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Family Bonus Service
 * Stateless service for calculating family trait bonuses from Active Effects.
 */
export class FamilyBonusService {
  /**
   * Valid L5R4 trait keys.
   * Per Character Creation rules, families grant bonuses to these eight traits only.
   * @private
   */
  static VALID_TRAIT_KEYS = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"];
  /**
   * Get the family bonus for a specific trait from the actor's embedded family item.
   * Returns the sum of all transferred Active Effects that modify the specified trait.
   * 
   * **How It Works:**
   * 1. Retrieves family item UUID from actor flags
   * 2. Resolves UUID to get family item document
   * 3. Iterates through family item's Active Effects
   * 4. Filters for transferred effects that modify the trait
   * 5. Sums all matching effect values
   * 
   * **Effect Filtering:**
   * - Only effects with `transfer: true` are counted
   * - Only effects targeting `system.traits.{traitKey}` are counted
   * - Only effects with ADD mode (CONST.ACTIVE_EFFECT_MODES.ADD) are counted
   * - Effect values must be finite numbers
   * 
   * @integration-test Scenario: Family item with transfer:true effects modifies actor traits
   * @integration-test Reason: Unit tests mock fromUuidSync and Active Effects structure
   * @integration-test Validates: fromUuidSync resolves embedded item UUIDs correctly
   * @integration-test Validates: Active Effects with transfer:true actually apply to actor
   * @integration-test Validates: Effect changes target correct system data paths
   * 
   * @param {Actor} actor - The actor document to check
   * @param {string} traitKey - Trait key: "sta", "wil", "str", "per", "ref", "awa", "agi", "int"
   * @returns {number} The family bonus for this trait (usually 0 or 1, but could be higher)
   * 
   * @example
   * // Get Stamina family bonus
   * const staBonus = FamilyBonusService.getBonus(actor, "sta");
   * // If Hida family (Crab), returns 1, otherwise returns 0
   * 
   * @see {@link https://foundryvtt.com/api/classes/documents.ActiveEffect.html|ActiveEffect}
   * @see {@link #getFamilyItem} - Gets the family item document
   */
  static getBonus(actor, traitKey) {
    try {
      // Validate inputs
      if (!actor || !traitKey) return 0;
      
      // Validate trait key against known L5R4 traits
      if (!this.VALID_TRAIT_KEYS.includes(traitKey)) {
        console.warn(`${SYS_ID} FamilyBonusService: Invalid trait key`, { 
          actorId: actor?.id, 
          traitKey,
          validKeys: this.VALID_TRAIT_KEYS
        });
        return 0;
      }
      
      // Get the family item document
      const familyItem = this.getFamilyItem(actor);
      if (!familyItem) return 0;
      
      // Build the Active Effect key for this trait
      const effectKey = `system.traits.${traitKey}`;
      let total = 0;
      
      // Iterate through all effects on the family item
      for (const effect of familyItem.effects ?? []) {
        // Only count transferred effects (these apply to the actor)
        if (effect?.transfer !== true) continue;
        
        // Check each change in the effect
        for (const change of effect.changes ?? []) {
          // Must target the correct trait and use ADD mode
          if (change?.key === effectKey && change?.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
            const value = Number(change?.value ?? 0);
            // Per Character_Creation_and_Advancement.md: families grant +1 bonuses only (positive)
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
   * Get a complete map of family bonuses for all traits.
   * Returns an object with all trait keys mapped to their family bonus values.
   * This is more efficient than calling getBonus() multiple times.
   * 
   * @integration-test Scenario: Family item effects populate complete trait bonus map
   * @integration-test Reason: Unit tests mock Active Effects and fromUuidSync
   * @integration-test Validates: All 8 traits receive correct bonuses from real effects
   * 
   * @param {Actor} actor - The actor document to check
   * @returns {Object<string, number>} Map of trait keys to bonus values
   * 
   * @example
   * const bonuses = FamilyBonusService.getBonusMap(actor);
   * // Returns: { sta: 1, wil: 0, str: 0, per: 0, ref: 0, awa: 0, agi: 0, int: 0 }
   * 
   * // Use in context preparation
   * const traitsEff = {};
   * for (const [key, base] of Object.entries(actor.system.traits)) {
   *   traitsEff[key] = base + (bonuses[key] || 0);
   * }
   */
  static getBonusMap(actor) {
    const TRAIT_KEYS = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"];
    const bonusMap = {};
    
    try {
      const familyItem = this.getFamilyItem(actor);
      if (!familyItem) {
        // Return map of zeros
        for (const key of TRAIT_KEYS) {
          bonusMap[key] = 0;
        }
        return bonusMap;
      }
      
      // Initialize all traits to 0
      for (const key of TRAIT_KEYS) {
        bonusMap[key] = 0;
      }
      
      // Iterate through effects once and populate the map
      for (const effect of familyItem.effects ?? []) {
        if (effect?.transfer !== true) continue;
        
        for (const change of effect.changes ?? []) {
          if (change?.mode !== CONST.ACTIVE_EFFECT_MODES.ADD) continue;
          
          // Extract trait key from "system.traits.sta" → "sta"
          const match = change?.key?.match(/^system\.traits\.(\w+)$/);
          if (match && TRAIT_KEYS.includes(match[1])) {
            const traitKey = match[1];
            const value = Number(change?.value ?? 0);
            // Per Character_Creation_and_Advancement.md: families grant +1 bonuses only (positive)
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
      // Return map of zeros on error
      for (const key of TRAIT_KEYS) {
        bonusMap[key] = 0;
      }
      return bonusMap;
    }
  }

  /**
   * Get the family item document from the actor's stored UUID.
   * Returns null if no family item is assigned or if the UUID is invalid.
   * 
   * @integration-test Scenario: Resolve family item from embedded and compendium UUIDs
   * @integration-test Reason: Unit tests mock fromUuidSync return values
   * @integration-test Validates: fromUuidSync handles Actor.id.Item.id format correctly
   * @integration-test Validates: fromUuidSync handles Compendium.pack.Item.id format correctly
   * @integration-test Validates: Resolved item has correct type validation
   * 
   * @param {Actor} actor - The actor document
   * @returns {Item|null} The family item document, or null if not found/invalid
   * 
   * @example
   * const familyItem = FamilyBonusService.getFamilyItem(actor);
   * if (familyItem) {
   *   console.log(`Family: ${familyItem.name}`);
   *   console.log(`Trait: ${familyItem.system.trait}`);
   *   console.log(`Bonus: +${familyItem.system.bonus}`);
   * }
   * 
   * @see {@link https://foundryvtt.com/api/global.html#fromUuidSync|fromUuidSync}
   */
  static getFamilyItem(actor) {
    try {
      if (!actor) return null;
      
      const uuid = actor.getFlag?.(SYS_ID, "familyItemUuid");
      if (!uuid) return null;
      
      // Check if fromUuidSync is available (should always be in v13+)
      if (typeof globalThis.fromUuidSync !== "function") {
        console.warn(`${SYS_ID} FamilyBonusService: fromUuidSync not available`);
        return null;
      }
      
      const item = fromUuidSync(uuid);
      
      // Validate that it's actually a family item
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
   * Check if the actor has a valid family item assigned.
   * This is a convenience method for UI conditionals.
   * 
   * @param {Actor} actor - The actor document
   * @returns {boolean} True if actor has a valid family item, false otherwise
   * 
   * @example
   * if (FamilyBonusService.hasValidFamily(actor)) {
   *   // Show family bonus indicators in UI
   * }
   */
  static hasValidFamily(actor) {
    return this.getFamilyItem(actor) !== null;
  }

  /**
   * Get the family name from the actor's stored flag.
   * This is faster than resolving the full item document when you only need the name.
   * 
   * @param {Actor} actor - The actor document
   * @returns {string|null} The family name, or null if not set
   * 
   * @example
   * const familyName = FamilyBonusService.getFamilyName(actor);
   * // Returns "Hida" or null
   */
  static getFamilyName(actor) {
    try {
      return actor.getFlag?.(SYS_ID, "familyName") ?? null;
    } catch (err) {
      return null;
    }
  }
}
