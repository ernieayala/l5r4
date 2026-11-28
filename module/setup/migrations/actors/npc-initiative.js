/**
 * @module setup/migrations/actors/npc-initiative
 * @description Lets NPCs stored with the old default pool roll the Initiative formula.
 */

/** The Initiative pool 3.2.1 stored on every new NPC, which then overrode the formula (#30). */
const OLD_DEFAULT = Object.freeze({ roll: 2, keep: 2 });

/**
 * An NPC whose stored Initiative pool is exactly the old default 2k2 gets 0k0, which rolls Insight Rank 1 +
 * Reflexes, keep Reflexes (Ernie's ruling). It runs once per NPC, when the NPC first reaches schema 1 (#181), so a
 * 2k2 a GM enters afterwards stays.
 * game-rules/31_combat_round.md, p.81
 * @param {Actor} actor - An actor; a PC is left alone
 * @returns {Promise<void>}
 */
export async function migrateNpcInitiative(actor) {
  if (actor.type !== "npc") {
    return;
  }
  const { roll, keep } = actor._source.system.initiative;
  if (roll === OLD_DEFAULT.roll && keep === OLD_DEFAULT.keep) {
    await actor.update(
      { "system.initiative.roll": 0, "system.initiative.keep": 0 },
      { render: false }
    );
  }
}
