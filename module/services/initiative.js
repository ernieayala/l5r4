/**
 * @module services/initiative
 * @description The Initiative Void Point prompt. A character may spend a Void Point to raise their Initiative Score
 * by 10. A PC marks the intent on the sheet (`system.initiative.useVoid`); when Initiative is rolled, the player
 * confirms, and the +10 goes to that roll only.
 *
 * L5R4Combat calls `spendInitiativeVoidPoints` before rolling (wired at init in the entry module). The Initiative pool
 * itself is rolled by L5R4Combatant.
 * game-rules/25_rings_and_traits.md, p.78
 */

import { DIALOG_TEMPLATES } from "../config/templates.js";
import { F, R, T } from "../utils/localization.js";
import { buildVoidUseUpdate, warnVoidLimit } from "./effects/uses.js";

/**
 * Initiative bonus for a Void Point.
 * game-rules/25_rings_and_traits.md, p.78
 */
const VOID_INITIATIVE_BONUS = 10;

/**
 * Prompts each PC combatant that marked a Void Point for Initiative, spends the Void Point on a yes, and clears the
 * mark either way.
 *
 * @param {foundry.documents.Combatant[]} combatants - The combatants about to roll
 * @returns {Promise<Map<string, number>>} The +10 by combatant id, for each one that spent a Void Point
 */
export async function spendInitiativeVoidPoints(combatants) {
  const bonuses = new Map();
  for (const combatant of combatants) {
    const actor = combatant.actor;
    if (actor?.type !== "pc" || !actor.system.initiative.useVoid) {
      continue;
    }
    if (await spendInitiativeVoidPoint(actor)) {
      bonuses.set(combatant.id, VOID_INITIATIVE_BONUS);
    }
  }
  return bonuses;
}

/**
 * Spend the Void Point a PC marked for Initiative, once the player confirms; the mark is cleared either way, and a
 * PC with no Void Point left is told so.
 * game-rules/25_rings_and_traits.md, p.78
 * @param {Actor} actor - A PC that marked a Void Point for Initiative
 * @returns {Promise<boolean>} Whether the Void Point was spent
 */
async function spendInitiativeVoidPoint(actor) {
  if (actor.system.rings.void.value <= 0) {
    await actor.update({ "system.initiative.useVoid": false });
    ui.notifications?.warn(F("l5r4.ui.combat.initiativeVoidNone", { name: actor.name }));
    return false;
  }

  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: F("l5r4.ui.combat.initiativeVoidTitle", { name: actor.name }) },
    content: await R(DIALOG_TEMPLATES.confirm, {
      question: F("l5r4.ui.combat.initiativeVoidQuestion", { name: actor.name })
    }),
    yes: { label: T("l5r4.ui.common.spendVoidPoint") },
    no: { label: T("l5r4.ui.common.cancel") }
  });
  if (!confirmed) {
    await actor.update({ "system.initiative.useVoid": false });
    return false;
  }

  // Availability was checked on the prepared pool; the write starts from the stored value, so an Active Effect
  // on Void Points is never written into storage (B6)
  warnVoidLimit(actor);
  await actor.update({
    "system.rings.void.value": actor._source.system.rings.void.value - 1,
    "system.initiative.useVoid": false,
    ...buildVoidUseUpdate(actor)
  });
  ui.notifications?.info(F("l5r4.ui.combat.initiativeVoidSpent", { name: actor.name }));
  return true;
}
