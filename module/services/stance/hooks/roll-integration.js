/**
 * @fileoverview L5R4 Stance Roll Integration - Dice Service Hook Registration
 * 
 * This module registers hooks into the L5R4 dice service to automatically apply
 * stance bonuses to attack rolls. Integrates with the l5r4.preRoll custom hook
 * to modify roll parameters before dice are rolled.
 * 
 * **Core Responsibilities:**
 * - **Hook Registration**: Register l5r4.preRoll hook handler
 * - **Bonus Application**: Apply stance bonuses to attack roll data
 * - **Description Enhancement**: Add stance information to roll descriptions
 * - **Roll Type Filtering**: Only apply bonuses to attack rolls
 * 
 * **Integration Point:**
 * The l5r4.preRoll hook is fired by the dice service before rolls are evaluated,
 * allowing stance bonuses to be added to the roll parameters seamlessly.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link ../rolls/attack-bonuses.js|Attack Bonus Calculation}
 * @see {@link ../../dice/index.js|Dice Service}
 */

import { getStanceAttackBonuses } from "../rolls/attack-bonuses.js";

/* -------------------------------------------- */
/* Roll Hook Registration                      */
/* -------------------------------------------- */

/**
 * Register stance-related hooks for roll modifications.
 * This should be called during system initialization.
 */
export function registerStanceRollHooks() {
  // Hook into the dice service to apply stance bonuses to attack rolls
  Hooks.on("l5r4.preRoll", (rollData) => {
    if (rollData.rollType === "attack" && rollData.actor) {
      const bonuses = getStanceAttackBonuses(rollData.actor);
      
      if (bonuses.roll > 0 || bonuses.keep > 0) {
        rollData.diceRoll = (rollData.diceRoll || 0) + bonuses.roll;
        rollData.diceKeep = (rollData.diceKeep || 0) + bonuses.keep;
        
        // Add stance bonus information to the roll description
        if (rollData.description) {
          rollData.description += ` (Full Attack Stance: +${bonuses.roll}k${bonuses.keep})`;
        } else {
          rollData.description = `Full Attack Stance: +${bonuses.roll}k${bonuses.keep}`;
        }
      }
    }
  });
}
