/**
 * @module setup/migrations/actors/status-effect-rules
 * @description Gives status effects created before the rule engine the rules, group, and level their status now
 * carries.
 */
import { buildStatusEffectUpdate } from "../../../utils/status-data.js";

/**
 * Bring one stored status effect up to date (module/utils/status-data.js). The code that gave 3.2.1's stances and
 * conditions their mechanics is gone, so their effects carry them as rules. It runs once per effect (#181), so rules
 * a GM empties afterwards stay empty.
 * @param {ActiveEffect} effect
 * @returns {Promise<void>}
 */
export async function migrateStatusEffectRules(effect) {
  const update = buildStatusEffectUpdate(effect._source);
  if (update) {
    await effect.update(update, { render: false });
  }
}
