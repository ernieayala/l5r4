/**
 * Initiative System
 * 
 * Implements Legend of the Five Rings 4th Edition initiative mechanics for Foundry VTT.
 * Overrides the default Combatant.getInitiativeRoll to support the L5R4 Roll & Keep system.
 * 
 * Initiative Formula: Insight Rank/Reflexes keep Reflexes (noted as Insight Rank + Reflexes rolled, Reflexes kept)
 * - Dice explode on 10s (x10)
 * - Maximum 10 dice rolled and 10 dice kept (Foundry limitation)
 * - Excess dice convert to flat bonuses (+2 per excess die)
 * 
 * Requires Foundry VTT v13+
 * 
 * @module services/initiative
 * @see {@link https://foundryvtt.com/api/classes/foundry.documents.Combat.html|Foundry Combat API}
 */

import { SYS_ID } from "../config/constants.js";

/**
 * @typedef {Object} InitiativeData
 * @property {number} roll - Total dice to roll (Insight Rank + Reflexes + rollMod for PCs)
 * @property {number} keep - Dice to keep (Reflexes + keepMod for PCs)
 * @property {number} [effRoll] - Effective roll dice for NPCs (overrides roll if > 0)
 * @property {number} [effKeep] - Effective keep dice for NPCs (overrides keep if > 0)
 * @property {number} [totalMod] - Flat bonus modifier to initiative total
 * @property {number} [rollMod] - Modifier to rolled dice (PCs only)
 * @property {number} [keepMod] - Modifier to kept dice (PCs only)
 */

/**
 * Initializes the L5R4 initiative system by configuring Combat settings and patching Combatant.
 * 
 * Sets up:
 * - Default initiative formula as fallback (1d10)
 * - Combatant.getInitiativeRoll override to implement L5R4 Roll & Keep mechanics
 * 
 * Must be called during system initialization (typically in init or ready hook).
 * Safe to call multiple times - patches are idempotent.
 * 
 * @function initializeInitiativeSystem
 * @returns {void}
 */
export function initializeInitiativeSystem() {
  CONFIG.Combat.initiative = {
    formula: "1d10",
    decimals: 0
  };

  try {
    const { Combatant } = foundry.documents;
    // Preserve original method for error fallback
    const __origGetInit = Combatant.prototype.getInitiativeRoll;

    /**
     * Overridden Combatant.getInitiativeRoll - implements L5R4 initiative mechanics.
     * 
     * Calculates initiative using L5R4 Roll & Keep system:
     * - PCs: (Insight Rank + Reflexes + rollMod)k(Reflexes + keepMod) + totalMod
     * - NPCs: Use effRoll/effKeep if provided, otherwise fall back to Reflexes
     * 
     * Handles L5R4 10-dice cap (Foundry limitation):
     * - Dice beyond 10 rolled or kept convert to flat bonuses
     * - Conversion: 2 extra rolled dice = 1 kept die, excess kept dice = +2 bonus each
     * - Special case: When at 10k10 cap, all excess dice become +2 bonuses directly
     * 
     * Formula construction:
     * - Format: XdYkZx10+B where X=rolled, Z=kept, B=bonus, x10=exploding tens
     * - Exploding dice: Tens roll again and add to total (core L5R4 mechanic)
     * 
     * @override
     * @param {string} formula - Ignored, formula is calculated from actor data
     * @returns {Roll} Foundry Roll instance with L5R4 initiative formula
     * 
     * @see actor.system.initiative structure in L5R4Actor.prepareDerivedData
     */
    Combatant.prototype.getInitiativeRoll = function(formula) {
      try {
        const a = this.actor;
        if (!a) return new Roll(CONFIG.Combat.initiative.formula);

        // Defensive type coercion - ensures numeric values from actor data
        // Returns 0 for undefined, null, NaN, or non-numeric values
        const toInt = (v) => Number.isFinite(+v) ? Math.trunc(Number(v)) : 0;

        let roll  = toInt(a.system?.initiative?.roll);
        let keep  = toInt(a.system?.initiative?.keep);

        // NPCs use effRoll/effKeep if explicitly set, otherwise default to Reflexes
        // This allows GMs to set custom initiative pools for special NPCs
        if (a.type === "npc") {
          const effR = toInt(a.system?.initiative?.effRoll);
          const effK = toInt(a.system?.initiative?.effKeep);
          if (effR > 0) roll = effR;
          if (effK > 0) keep = effK;
        }

        let bonus = toInt(a.system?.initiative?.totalMod);

        // Apply L5R4 10-dice cap - Foundry Roll class cannot handle more than 10 dice effectively
        // Excess dice convert to flat bonuses to maintain game balance
        const extras_roll = Math.max(0, roll - 10);
        const extras_keep = Math.max(0, keep - 10);

        roll = Math.min(roll, 10);
        keep = Math.min(keep, 10);

        // Special case: Already at 10k10 cap with extra kept dice
        // Convert all excess to +2 bonuses (both rolled and kept extras)
        if (roll === 10 && keep === 10 && extras_keep > 0) {
          bonus += (extras_roll + extras_keep) * 2;
        } else {
          // Standard conversion: 2 rolled dice = 1 kept die
          const converted_keep = Math.floor(extras_roll / 2);
          const leftover = extras_roll % 2;
          keep += converted_keep;

          // If conversion pushed kept dice over 10, convert excess to +2 bonuses
          if (keep > 10) {
            bonus += (keep - 10) * 2;
            keep = 10;
          }

          // Edge case: At 10k10 after conversion with 1 leftover rolled die
          if (keep === 10 && roll === 10 && leftover > 0) {
            bonus += leftover * 2;
          }
        }

        const diceRoll = (Number.isFinite(roll) && roll > 0) ? roll : 1;
        const diceKeep = (Number.isFinite(keep) && keep > 0) ? keep : 1;
        const flat     = Number.isFinite(bonus) ? bonus : 0;

        const flatStr  = flat === 0 ? "" : (flat > 0 ? `+${flat}` : `${flat}`);
        // Construct L5R4 Roll & Keep formula: XdYkZx10+B
        const formulaStr = `${diceRoll}d10k${diceKeep}x10${flatStr}`;
        return new Roll(formulaStr);

      } catch (e) {
        // Fallback to original Foundry initiative on errors
        // Ensures combat tracker continues functioning even if actor data is malformed
        console.warn(`${SYS_ID} | Initiative roll error for combatant ${this.id}`, e);
        return __origGetInit.call(this, formula);
      }
    };

    console.log(`${SYS_ID} | Initiative system initialized`);

  } catch (e) {
    // Critical failure - system cannot override initiative
    // Log warning but allow Foundry to continue with default initiative system
    console.warn(`${SYS_ID} | Unable to patch Combatant.getInitiativeRoll`, e);
  }
}
