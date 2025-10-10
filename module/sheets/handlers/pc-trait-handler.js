/**
 * @fileoverview PC Trait Handler - PC Trait Management with Family Bonuses
 * 
 * Handles PC-specific trait adjustments that integrate with the family bonus system.
 * Unlike NPCs which have simple trait adjustments, PCs must account for family bonuses
 * when displaying and adjusting trait values.
 * 
 * **Responsibilities:**
 * - Trait rank adjustment with family bonus calculations
 * - Effective trait value computation (base + family bonus)
 * - Submit data conversion (effective → base for storage)
 * - Min/max validation considering family bonuses
 * - Integration with FamilyBonusService
 * 
 * **PC Trait System:**
 * PCs have a two-layer trait system:
 * 1. **Base Traits**: Stored in system.traits.* (the actual character progression)
 * 2. **Family Bonuses**: Applied via Active Effects from family items (+1 to one trait)
 * 3. **Effective Traits**: Base + Family (what's displayed to the user)
 * 
 * The sheet displays effective values but stores base values. This handler manages
 * the conversion between the two representations.
 * 
 * **Example:**
 * - Character has Stamina 3 (base)
 * - Hida family grants +1 Stamina
 * - Sheet displays: Stamina 4 (effective)
 * - Storage: system.traits.sta = 3 (base)
 * - When user clicks to increase: 4 → 5 (effective) = 3 → 4 (base)
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#_source|Document._source}
 */

import { SYS_ID } from "../../config/constants.js";
import { FamilyBonusService } from "../../services/family-bonus-service.js";

/**
 * PC Trait Handler Class
 * Manages trait adjustments with family bonus integration for PC sheets.
 */
export class PcTraitHandler {
  /**
   * Stable trait keys used throughout the system.
   * @type {ReadonlyArray<string>}
   */
  static TRAIT_KEYS = Object.freeze(["sta", "wil", "str", "per", "ref", "awa", "agi", "int"]);

  /**
   * Adjust a PC trait rank by clicking its displayed value.
   * Shift+Left click: +1. Shift+Right click: -1.
   * 
   * **Complexity:**
   * This method is more complex than NPC trait adjustment because:
   * 1. User sees effective value (base + family bonus)
   * 2. Storage holds base value
   * 3. Family bonus affects minimum value (can't go below bonus)
   * 4. Must convert back to base before updating
   * 
   * **Caps:**
   * - Max effective Trait = 9 (L5R4 standard)
   * - Min effective Trait = 0 + Family bonus (e.g., if family gives +1, min is 1)
   * - Base Trait can be 0 even with family bonus
   * 
   * **Active Effects:**
   * Uses _source to read pre-Active Effects base value, ensuring we're always
   * working with the true stored value rather than the computed effective value.
   * 
   * **Requires Shift+Click** to prevent accidental trait changes.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {HTMLElement} context.element - The sheet root element
   * @param {MouseEvent} event - The originating mouse event
   * @param {HTMLElement} element - The clicked .trait-rank element with data-trait
   * @param {number} delta - +1 or -1
   * @returns {Promise<void>}
   * 
   * @example
   * // Template markup:
   * <div class="trait-rank" data-action="trait-rank" data-trait="sta">4</div>
   * 
   * // In pc-sheet.js _onAction():
   * case "trait-rank": 
   *   return PcTraitHandler.adjust(this._getHandlerContext(), event, element, +1);
   * 
   * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
   * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#_source|Document._source}
   * @see {@link ../../services/family-bonus-service.js|FamilyBonusService}
   */
  static async adjust(context, event, element, delta) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    // Require Shift+Click to prevent accidental trait changes
    if (!event?.shiftKey) return;

    const key = String(element?.dataset?.trait || "").toLowerCase();
    if (!this.TRAIT_KEYS.includes(key)) {
      console.warn(`${SYS_ID} PcTraitHandler: Invalid trait key`, { key });
      return;
    }

    /**
     * Current base (pre-AE) and Family bonus.
     * Foundry applies Active Effects before prepareDerivedData, so actor.system is post-AE.
     * Use the document source for the true base rank.
     */
    const base = Number(context.actor._source?.system?.traits?.[key]
                 ?? context.actor.system?.traits?.[key] ?? 0) || 0;
    const fam  = FamilyBonusService.getBonus(context.actor, key);

    // Work in *effective* space, then convert back to base
    const effNow = base + fam;
    
    // Effective caps
    // Min: If family gives +1 to Strength, min displayed is 1 (base can be 0)
    // Max: Global cap of 9 for all traits
    const effMin = 0 + Math.max(0, fam);
    const effMax = 9;

    const wantEff = effNow + (delta > 0 ? 1 : -1);
    const nextEff = Math.min(effMax, Math.max(effMin, wantEff));
    
    if (nextEff === effNow) return; // no change

    // Convert back to base for storage
    const nextBase = nextEff - fam;

    // Update the Actor's base Trait
    try {
      await context.actor.update({ [`system.traits.${key}`]: nextBase }, { diff: true });
    } catch (err) {
      console.warn(`${SYS_ID} PcTraitHandler: failed to update trait`, { err, key, base, nextBase });
    }
  }

  /**
   * Compute effective trait values for all traits.
   * Returns a map of trait keys to effective (base + family bonus) values.
   * 
   * This is used during context preparation to show users their effective trait values
   * while maintaining base values in storage.
   * 
   * @param {Actor} actor - The actor document
   * @returns {Object<string, number>} Map of trait keys to effective values
   * 
   * @example
   * const traitsEff = PcTraitHandler.computeEffective(actor);
   * // Returns: { sta: 4, wil: 3, str: 3, per: 2, ref: 3, awa: 2, agi: 3, int: 2 }
   * 
   * // Use in template context:
   * return {
   *   traitsEff,
   *   // ... other context
   * };
   */
  static computeEffective(actor) {
    const traitsEff = {};
    const bonuses = FamilyBonusService.getBonusMap(actor);
    
    for (const key of this.TRAIT_KEYS) {
      const base = Number(actor.system?.traits?.[key] ?? 0) || 0;
      const bonus = bonuses[key] || 0;
      traitsEff[key] = base + bonus;
    }
    
    return traitsEff;
  }

  /**
   * Convert submit data from effective values back to base values.
   * When the user edits traits in the sheet, they're editing effective values.
   * Before submitting to the actor, we must convert back to base values by
   * subtracting the family bonus.
   * 
   * This method modifies the submit data object in-place, converting the
   * system.traits.* values from effective to base.
   * 
   * **Important:** This only affects trait values. Other fields pass through unchanged.
   * 
   * @param {Actor} actor - The actor document (needed for family bonus lookup)
   * @param {object} submitData - The submit data object to modify
   * @returns {object} The modified submit data (same object reference)
   * 
   * @example
   * // In pc-sheet.js _prepareSubmitData():
   * _prepareSubmitData(event, form, formData, updateData = {}) {
   *   const data = super._prepareSubmitData(event, form, formData, updateData);
   *   return PcTraitHandler.convertSubmitData(this.actor, data);
   * }
   * 
   * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html#_prepareSubmitData|_prepareSubmitData}
   */
  static convertSubmitData(actor, submitData) {
    // If traits are part of the update, convert eff -> base by subtracting the family bonus
    const t = submitData?.system?.traits;
    if (!t || typeof t !== "object") return submitData;
    
    for (const [k, v] of Object.entries(t)) {
      if (v === undefined || v === null) continue;
      
      const eff = Number(v) || 0;
      const bonus = FamilyBonusService.getBonus(actor, k);
      const base = eff - bonus;
      
      // Clamp to >= 0 (L5R traits can't be negative)
      t[k] = Math.max(0, base);
    }
    
    return submitData;
  }

  /**
   * Get the effective value for a specific trait.
   * Convenience method for getting a single trait's effective value.
   * 
   * @param {Actor} actor - The actor document
   * @param {string} traitKey - Trait key: "sta", "wil", "str", "per", "ref", "awa", "agi", "int"
   * @returns {number} The effective trait value (base + family bonus)
   * 
   * @example
   * const staminaEff = PcTraitHandler.getEffectiveValue(actor, "sta");
   * // Returns 4 if base is 3 and family grants +1 Stamina
   */
  static getEffectiveValue(actor, traitKey) {
    const base = Number(actor.system?.traits?.[traitKey] ?? 0) || 0;
    const bonus = FamilyBonusService.getBonus(actor, traitKey);
    return base + bonus;
  }

  /**
   * Get the base value for a specific trait.
   * Reads from _source to get pre-Active Effects value.
   * 
   * @param {Actor} actor - The actor document
   * @param {string} traitKey - Trait key: "sta", "wil", "str", "per", "ref", "awa", "agi", "int"
   * @returns {number} The base trait value (from storage, pre-family bonus)
   * 
   * @example
   * const staminaBase = PcTraitHandler.getBaseValue(actor, "sta");
   * // Returns 3 even if family grants +1 Stamina
   */
  static getBaseValue(actor, traitKey) {
    return Number(actor._source?.system?.traits?.[traitKey]
            ?? actor.system?.traits?.[traitKey] ?? 0) || 0;
  }
}
