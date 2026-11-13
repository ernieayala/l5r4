/**
 * Status Effect Rules Migration
 * Gives status effects created before the rule engine the rules their status now carries.
 *
 * @module setup/migrations/actors/status-effect-rules
 */

import { SYS_ID } from "../../../config/constants.js";
import { statusRules } from "../../../utils/rule-engine.js";

/**
 * An actor's Defense Stance or Mounted effect made by 3.2.1 has no rules, and the code that gave those statuses
 * their mechanics is gone; this copies the rules from module/config/status-effects.js onto each such effect.
 * An effect that already has rules is left alone, so running again changes nothing.
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
      const updates = [];
      for (const effect of actor.effects) {
        if (effect._source.system.rules.length > 0) {
          continue;
        }
        const rules = [...effect.statuses].flatMap(statusRules);
        if (rules.length > 0) {
          updates.push({ _id: effect.id, "system.rules": rules });
        }
      }
      if (updates.length > 0) {
        await actor.updateEmbeddedDocuments("ActiveEffect", updates, { render: false });
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to add status effect rules", { label, id: actor.id, err });
    }
  }
}
