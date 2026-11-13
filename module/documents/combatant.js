/**
 * @module documents/combatant
 * @description The system's Combatant: Initiative rolls the Roll & Keep pool instead of core's formula.
 */

import { SYS_ID } from "../config/constants.js";
import { toInt } from "../utils/type-coercion.js";
import { initiativeFormula } from "../utils/initiative.js";

export default class L5R4Combatant extends foundry.documents.Combatant {
  /**
   * The Initiative formula: the actor's prepared pool (Insight Rank + Reflexes, keep Reflexes, p.81) plus its flat
   * modifier, under the Ten Dice Rule (p.77). Core calls this with no argument when no explicit formula is given
   * (client/documents/combatant.mjs:138-142); L5R4Combat passes the Void Point +10 for one roll.
   *
   * @override
   * @param {number} [bonus=0]  Flat bonus for this roll only
   * @returns {string}
   */
  _getInitiativeFormula(bonus = 0) {
    const actor = this.actor;
    if (!actor) {
      return super._getInitiativeFormula();
    }
    const initiative = actor.system.initiative;
    let { roll, keep } = initiative;
    // An NPC rolls its own Initiative pool when one is set (npc-preparation.js)
    if (actor.type === "npc") {
      if (initiative.effRoll > 0) {
        roll = initiative.effRoll;
      }
      if (initiative.effKeep > 0) {
        keep = initiative.effKeep;
      }
    }
    return initiativeFormula(
      { roll, keep, bonus: toInt(initiative.totalMod) + bonus },
      { littleTruths: game.settings.get(SYS_ID, "LtException") }
    );
  }
}
