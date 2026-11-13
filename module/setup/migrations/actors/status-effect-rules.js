/**
 * Status Effect Rules Migration
 * Gives status effects created before the rule engine the rules, group, and level their status now carries.
 *
 * @module setup/migrations/actors/status-effect-rules
 */

import { SYS_ID } from "../../../config/constants.js";
import { statusEffectUpdate } from "../../../utils/status-data.js";

/**
 * Bring each actor's stored status effects up to date (module/utils/status-data.js). The code that gave 3.2.1's
 * stances and conditions their mechanics is gone, so their effects carry them as rules.
 *
 * @param {Document[]} docs - Actor documents to scan
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function migrateStatusEffectRules(docs, label) {
  for (const actor of docs) {
    if (actor.documentName !== "Actor") {
      continue;
    }
    try {
      const updates = actor.effects
        .map(effect => statusEffectUpdate(effect._source))
        .filter(Boolean);
      if (updates.length > 0) {
        await actor.updateEmbeddedDocuments("ActiveEffect", updates, { render: false });
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to add status effect rules", { label, id: actor.id, err });
    }
  }
}
