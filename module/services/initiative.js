/**
 * Initiative Void Point prompt
 *
 * A character may spend a Void Point to raise their Initiative Score by 10 (Core Rulebook p.78,
 * `game-rules/25_rings_and_traits.md`). A PC marks the intent on the sheet (`system.initiative.useVoid`); when
 * Initiative is rolled, the player confirms, and the +10 goes to that roll only.
 *
 * L5R4Combat calls `resolveVoidInitiative` before rolling (wired at init in the entry module). The Initiative pool
 * itself is rolled by L5R4Combatant.
 *
 * @module services/initiative
 */

/** Initiative bonus for a Void Point (p.78). */
const VOID_INITIATIVE_BONUS = 10;

/**
 * Prompts each PC combatant that marked a Void Point for Initiative, spends the Void Point on a yes, and clears the
 * mark either way.
 *
 * @param {foundry.documents.Combatant[]} combatants  The combatants about to roll
 * @returns {Promise<Map<string, number>>}  The +10 by combatant id, for each one that spent a Void Point
 */
export async function resolveVoidInitiative(combatants) {
  const bonuses = new Map();
  for (const combatant of combatants) {
    const actor = combatant.actor;
    if (actor?.type !== "pc" || !actor.system.initiative.useVoid) {
      continue;
    }

    if (actor.system.rings.void.value <= 0) {
      await actor.update({ "system.initiative.useVoid": false });
      ui.notifications?.warn(`${actor.name} has no Void Points available`);
      continue;
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Spend Void Point for Initiative - ${actor.name}` },
      content: `<p>Spend a Void Point to add +10 to ${actor.name}'s initiative roll?</p>`
    });
    if (!confirmed) {
      await actor.update({ "system.initiative.useVoid": false });
      continue;
    }

    // Availability was checked on the prepared pool; the write starts from the stored value, so an Active Effect
    // on Void Points is never written into storage (B6)
    await actor.update({
      "system.rings.void.value": actor._source.system.rings.void.value - 1,
      "system.initiative.useVoid": false
    });
    ui.notifications?.info(`${actor.name} spent Void Point for initiative (+10)`);
    bonuses.set(combatant.id, VOID_INITIATIVE_BONUS);
  }
  return bonuses;
}
