/**
 * @fileoverview L5R4 Ten Dice Rule - Core Mechanic Implementation
 * 
 * Implements the L5R4 Ten Dice Rule which caps dice pools at 10k10 with
 * excess dice converted to kept dice and flat bonuses.
 * 
 * **Note:** Reads the "LtException" game setting to apply Lieutenant Exception bonus.
 * 
 * **Rule Logic (per Book of Earth - Rings and Traits):**
 * 1. Cap rolled dice at 10, convert excess to "extras"
 * 2. Every 2 extras become 1 kept die (ratio: 2 rolled → 1 kept)
 * 3. Cap kept dice at 10, convert excess to bonus (1 kept die → +2)
 * 4. Apply Lieutenant Exception (+2 bonus) if setting enabled AND kept < 10
 * 5. Convert remaining odd extras to bonus (1 extra rolled → +2) when at 10k10
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/|Foundry VTT API}
 */

import { SYS_ID } from "../../../config/constants.js";

/**
 * Apply the L5R4 Ten Dice Rule to convert excess dice to bonuses.
 * 
 * See fileoverview for complete algorithm details.
 * 
 * @param {number} diceRoll - Initial rolled dice count
 * @param {number} diceKeep - Initial kept dice count
 * @param {number} [bonus=0] - Base flat modifier
 * @returns {{diceRoll: number, diceKeep: number, bonus: number}} Normalized dice pool
 *   with diceRoll and diceKeep capped at 10, and excess converted to flat bonus
 * 
 * @sideeffect Reads game.settings.get(SYS_ID, "LtException") setting
 * @requires Foundry game.settings API must be available
 * 
 * @example
 * // 15k12 becomes 10k10+10
 * TenDiceRule(15, 12, 0); // { diceRoll: 10, diceKeep: 10, bonus: 10 }
 * 
 * @example
 * // 8k4+5 stays as is
 * TenDiceRule(8, 4, 5); // { diceRoll: 8, diceKeep: 4, bonus: 5 }
 * 
 * @example
 * // Lieutenant Exception adds +2 when kept dice < 10
 * // (Assuming LtException setting is enabled)
 * TenDiceRule(10, 8, 0); // { diceRoll: 10, diceKeep: 8, bonus: 2 }
 * 
 * @example
 * // Remaining extras at 10k10: 1 extra = +2 bonus
 * TenDiceRule(11, 10, 0); // { diceRoll: 10, diceKeep: 10, bonus: 2 }
 */
export function TenDiceRule(diceRoll, diceKeep, bonus = 0) {
  // Special case: If both rolled and kept already exceed 10
  // Book of Earth: "If both rolled and kept dice already equal ten, then
  // each additional die of both types converts to a bonus of +2"
  if (diceRoll > 10 && diceKeep > 10) {
    const excessRolled = diceRoll - 10;
    const excessKept = diceKeep - 10;
    bonus += (excessRolled * 2) + (excessKept * 2);
    diceRoll = 10;
    diceKeep = 10;
    
    // Apply Lieutenant Exception if enabled (kept now = 10, so no bonus)
    return { diceRoll, diceKeep, bonus };
  }

  // Step 1: Cap rolled dice at 10, convert excess to extras
  let extras = 0;
  if (diceRoll > 10) {
    extras = diceRoll - 10;
    diceRoll = 10;
  }

  // Step 2: Every 2 extra rolled dice become 1 kept die
  // Book of Earth: "one kept die per two additional rolled dice"
  while (extras >= 2) {
    diceKeep += 1;
    extras -= 2;
  }

  // Step 3: Cap kept dice at 10, convert excess to bonus
  // Book of Earth: "each additional die...converts to a bonus of +2"
  if (diceKeep > 10) {
    const excessKept = diceKeep - 10;
    bonus += excessKept * 2;
    diceKeep = 10;
  }

  // Step 4: Apply Lieutenant Exception if enabled and kept < 10
  const addLtBonus = !!game.settings.get(SYS_ID, "LtException");
  if (addLtBonus && diceKeep < 10) {
    bonus += 2;
  }

  // Step 5: Convert remaining odd extras to bonus when at 10k10
  // Book of Earth: remaining odd rolled die becomes +2 bonus
  if (diceKeep === 10 && extras > 0) {
    bonus += extras * 2;
  }

  return { diceRoll, diceKeep, bonus };
}
