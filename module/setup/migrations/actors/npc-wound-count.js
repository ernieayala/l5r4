/**
 * @module setup/migrations/actors/npc-wound-count
 * @description Keeps the Wound Ranks an NPC shows when its count of Wound Ranks came to include Out.
 */

/**
 * At schema 1 a count of 1 gave Healthy and Out and a count of 2 gave Healthy, Nicked, and Out; the count now
 * includes Out (Ernie's ruling, #155), so a stored 1 becomes 2 and a stored 2 becomes 3, and the NPC shows the same
 * ranks. It runs once per NPC, when the NPC first reaches schema 2 (#181).
 * @param {Actor} actor - An actor; a PC is left alone
 * @returns {Promise<void>}
 */
export async function migrateNpcWoundCount(actor) {
  if (actor.type !== "npc") {
    return;
  }
  const count = actor._source.system.nrWoundLvls;
  if (count === 1 || count === 2) {
    await actor.update({ "system.nrWoundLvls": count + 1 }, { render: false });
  }
}
