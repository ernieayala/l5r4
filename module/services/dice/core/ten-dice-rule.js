/**
 * L5R4 Ten Dice Rule for rolls
 *
 * Applies the Ten Dice Rule (Core Rulebook p.77) to a roll's pool with the world's Little Truths setting. The rule
 * itself is the pure `applyTenDiceRule` in `module/utils/ten-dice.js`; this wrapper reads the setting it needs.
 *
 * Related Files:
 * - roll-parser.js: Invokes this rule during dice notation parsing
 * - formula-builder.js: Uses output to construct Foundry Roll formulas
 */

import { SYS_ID } from "../../../config/constants.js";
import { applyTenDiceRule } from "../../../utils/ten-dice.js";

/**
 * Applies the Ten Dice Rule to a roll's pool, with the Little Truths exception when the `LtException` world
 * setting is on.
 *
 * @param {number} diceRoll - Number of dice to roll (before Ten Dice Rule applied)
 * @param {number} diceKeep - Number of dice to keep (before Ten Dice Rule applied)
 * @param {number} [bonus=0] - Starting flat bonus to add to conversion bonuses
 * @returns {import("../../../utils/ten-dice.js").TenDiceResult} Capped values with conversion bonuses applied
 */
export function TenDiceRule(diceRoll, diceKeep, bonus = 0) {
  return applyTenDiceRule(diceRoll, diceKeep, bonus, {
    littleTruths: game.settings.get(SYS_ID, "LtException")
  });
}
