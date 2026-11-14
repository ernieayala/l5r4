/**
 * NPC Initiative Migration
 * Lets NPCs stored with the old default pool roll the Initiative formula.
 *
 * @module setup/migrations/actors/npc-initiative
 */

import { SYS_ID } from "../../../config/constants.js";

/** The Initiative pool 3.2.1 stored on every new NPC, which then overrode the formula (#30). */
const OLD_DEFAULT = Object.freeze({ roll: 2, keep: 2 });

/**
 * An NPC whose stored Initiative pool is exactly the old default 2k2 gets 0k0, which rolls Insight Rank 1 +
 * Reflexes, keep Reflexes (p.81; Ernie's ruling, 2026-11-14). A 2k2 a GM entered on purpose cannot be told apart and
 * is reset too. Runs once, with the version's other world migrations.
 *
 * @param {Document[]} docs - Actor documents to scan; PCs are skipped
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function migrateNpcInitiative(docs, label) {
  let migrated = 0;
  for (const actor of docs) {
    if (actor.documentName !== "Actor" || actor.type !== "npc") {
      continue;
    }
    const { roll, keep } = actor._source.system.initiative;
    if (roll !== OLD_DEFAULT.roll || keep !== OLD_DEFAULT.keep) {
      continue;
    }
    try {
      await actor.update(
        { "system.initiative.roll": 0, "system.initiative.keep": 0 },
        { render: false }
      );
      migrated++;
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate NPC Initiative", { label, id: actor.id, err });
    }
  }
  if (migrated > 0) {
    console.warn(`${SYS_ID} | ${migrated} NPCs now roll the Initiative formula (${label})`);
  }
}
