/**
 * @fileoverview L5R4 Initiative System - Custom Initiative for Foundry VTT v13+
 * 
 * This module provides L5R4-specific initiative mechanics by overriding Foundry's
 * default Combatant.getInitiativeRoll() method. Implements actor-specific initiative
 * formulas with automatic Ten Dice Rule integration for proper L5R4 combat flow.
 * 
 * **Core Responsibilities:**
 * - **Formula Generation**: Build initiative formulas from actor data (XkY+mod format)
 * - **Ten Dice Rule Integration**: Automatic dice pool conversion for initiative rolls
 * - **PC/NPC Support**: Handle both player character and NPC initiative calculations
 * - **Fallback Handling**: Graceful degradation if actor data is unavailable
 * 
 * **L5R4 Initiative Mechanics:**
 * Initiative in L5R4 is calculated as:
 * - **Roll Dice**: Actor's Initiative Roll value (from Insight Rank + Reflexes)
 * - **Keep Dice**: Actor's Initiative Keep value (typically Reflexes)
 * - **Modifiers**: Total initiative modifiers from effects and bonuses
 * - **Ten Dice Rule**: Automatically applied to manage dice pools > 10
 * 
 * **Ten Dice Rule for Initiative:**
 * When initiative dice pools exceed 10:
 * - Roll dice > 10: Converted to kept dice (3 roll → 2 keep conversion)
 * - Keep dice > 10: Converted to flat bonuses (+2 per excess keep)
 * - Special case 10k10: Excess roll dice become +2 each for maximum efficiency
 * 
 * **Actor Type Handling:**
 * - **PC**: Uses system.initiative.roll and system.initiative.keep
 * - **NPC**: Uses system.initiative.effRoll and system.initiative.effKeep if available
 * - **Fallback**: 1d10 if no actor data exists
 * 
 * **Integration Points:**
 * - Combat Tracker: Automatic initiative rolls when combat starts
 * - Actor Sheets: Initiative values displayed and editable
 * - Active Effects: Initiative bonuses from effects automatically applied
 * - Settings: Respects system settings for initiative calculations
 * 
 * **Error Handling:**
 * - Graceful fallback to original Foundry behavior on errors
 * - Safe number coercion prevents NaN results
 * - Console warnings for troubleshooting without breaking combat
 * 
 * **Usage Example:**
 * ```javascript
 * // Initialize during system setup
 * Hooks.once("init", () => {
 *   initializeInitiativeSystem();
 * });
 * 
 * // System automatically uses overridden method for all initiative rolls
 * // No manual calls needed - Foundry Combat Tracker handles everything
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/classes/documents.Combatant.html#getInitiativeRoll|Combatant.getInitiativeRoll}
 * @see {@link https://foundryvtt.com/api/classes/foundry.dice.Roll.html|Roll}
 * @see {@link ./dice.js|Dice Service} - TenDiceRule implementation
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Initialize the L5R4 initiative system by overriding Foundry's Combatant class.
 * This function patches Combatant.prototype.getInitiativeRoll to use L5R4 mechanics.
 * Should be called once during system initialization.
 * 
 * **Implementation Strategy:**
 * - Preserves original Foundry method as fallback
 * - Wraps override in try/catch for error safety
 * - Uses Foundry v13 Roll API (d10kh for "keep highest")
 * - Applies Ten Dice Rule inline for performance
 * 
 * **Foundry v13 Compatibility:**
 * CONFIG.Combat.initiative must be a simple object with formula string.
 * The actual formula is computed dynamically in the overridden method.
 * 
 * @integration-test Scenario: Combat Tracker calls getInitiativeRoll during combat start
 * @integration-test Reason: Unit tests mock Foundry's Combatant and Roll classes
 * @integration-test Validates: Formula syntax (XdYkhZ!10) accepted by Foundry Roll API
 * @integration-test Validates: Method hook executes at correct Combat lifecycle stage
 * @integration-test Validates: Real actor data structure matches assumptions
 * 
 * @returns {void}
 * 
 * @example
 * // Called from l5r4.js during init hook
 * Hooks.once("init", () => {
 *   initializeInitiativeSystem();
 * });
 */
export function initializeInitiativeSystem() {
  // Configure basic initiative settings (required by Foundry v13)
  CONFIG.Combat.initiative = { 
    formula: "1d10",  // Fallback formula if override fails
    decimals: 0 
  };

  // Override Combatant.getInitiativeRoll to compute L5R4 initiative
  try {
    const { Combatant } = foundry.documents;
    const __origGetInit = Combatant.prototype.getInitiativeRoll;

    /**
     * Generate L5R4 initiative roll formula for this combatant.
     * Computes XkY+Z formula from actor data with Ten Dice Rule applied.
     * 
     * @this {Combatant}
     * @param {string} formula - Ignored (we compute our own formula)
     * @returns {Roll} Configured Roll instance for initiative
     * 
     * @integration-test Validates: Foundry Roll accepts "k" (keep highest) syntax
     * @integration-test Validates: Foundry Roll accepts "x10" (exploding tens) modifier
     * @integration-test Validates: NPC effective values exist in real actor preparation
     * 
     * @example
     * // PC with Reflexes 4, Insight Rank 3
     * // Roll: 7, Keep: 4, Bonus: +2
     * // Formula: "7d10k4x10+2"
     */
    Combatant.prototype.getInitiativeRoll = function(formula) {
      try {
        const a = this.actor;
        if (!a) return new Roll(CONFIG.Combat.initiative.formula);

        // Safe integer conversion helper
        const toInt = (v) => Number.isFinite(+v) ? Math.trunc(Number(v)) : 0;

        // Get initiative values from actor
        let roll  = toInt(a.system?.initiative?.roll);
        let keep  = toInt(a.system?.initiative?.keep);

        // NPC override: Use effective values if available
        if (a.type === "npc") {
          const effR = toInt(a.system?.initiative?.effRoll);
          const effK = toInt(a.system?.initiative?.effKeep);
          if (effR > 0) roll = effR;
          if (effK > 0) keep = effK;
        }

        let bonus = toInt(a.system?.initiative?.totalMod);

        // Apply Ten Dice Rule inline (Rings_and_Traits.md lines 74-84)
        // Track excess dice from both roll and keep
        const extras_roll = Math.max(0, roll - 10);
        const extras_keep = Math.max(0, keep - 10);
        
        // Cap roll and keep at 10
        roll = Math.min(roll, 10);
        keep = Math.min(keep, 10);

        // Special case: If BOTH originally >= 10, all extras become +2 each
        // "If both rolled and kept dice already equal ten, then each additional 
        // die of both types converts to a bonus of +2"
        if (roll === 10 && keep === 10 && extras_keep > 0) {
          bonus += (extras_roll + extras_keep) * 2;
        } else {
          // Standard conversion: 2 extra roll → 1 keep
          // "Additional rolled dice become kept dice at a ratio of one kept die 
          // per two additional rolled dice"
          const converted_keep = Math.floor(extras_roll / 2);
          const leftover = extras_roll % 2;
          keep += converted_keep;
          
          // If keep exceeds 10 after conversion, convert excess to +2 bonus each
          if (keep > 10) {
            bonus += (keep - 10) * 2;
            keep = 10;
          }
          
          // If we end up at exactly 10k10 with leftover roll die, it becomes +2
          if (keep === 10 && roll === 10 && leftover > 0) {
            bonus += leftover * 2;
          }
        }

        // Ensure valid dice values (minimum 1)
        const diceRoll = (Number.isFinite(roll) && roll > 0) ? roll : 1;
        const diceKeep = (Number.isFinite(keep) && keep > 0) ? keep : 1;
        const flat     = Number.isFinite(bonus) ? bonus : 0;

        // Format flat bonus for formula string
        const flatStr  = flat === 0 ? "" : (flat > 0 ? `+${flat}` : `${flat}`);

        // Build Foundry v13 formula: XdYkZx10+mod
        // - d10: Ten-sided dice
        // - k: Keep highest (standard L5R4 syntax)
        // - x10: Exploding tens (Foundry v13 standard)
        const formulaStr = `${diceRoll}d10k${diceKeep}x10${flatStr}`;
        return new Roll(formulaStr);

      } catch (e) {
        // Fallback to original Foundry behavior on any error
        console.warn(`${SYS_ID} | Initiative roll error for combatant ${this.id}`, e);
        return __origGetInit.call(this, formula);
      }
    };

    console.log(`${SYS_ID} | Initiative system initialized`);

  } catch (e) {
    console.warn(`${SYS_ID} | Unable to patch Combatant.getInitiativeRoll`, e);
  }
}
