/**
 * @module setup/migrations/items/skill-defaults
 * @description Ensures skill items have the default values advancement tracking needs.
 */
/**
 * Ensures skill items have required default values for advancement tracking.
 *
 * Backfills freeRanks and freeEmphasis fields which may be missing in skills created
 * before these properties were added. These fields track ranks/emphasis granted by
 * advantages, disadvantages, or school bonuses that don't cost XP.
 *
 * @param {Item} item - An item; anything but a skill is left alone
 * @returns {Promise<void>}
 */
export async function migrateSkillDefaults(item) {
  if (item.type !== "skill") {
    return;
  }
  const updates = buildSkillDefaults(item);
  if (Object.keys(updates).length > 0) {
    await item.update(updates, { diff: true, render: false });
  }
}

/**
 * The defaults a skill lacks: `freeRanks` and `freeEmphasis` at 0.
 * @param {Item} item - A skill item
 * @returns {object} Update entries; empty when both fields hold a value
 */
function buildSkillDefaults(item) {
  const updates = {};

  const currentFreeRanks = item.system?.freeRanks;
  if (currentFreeRanks === undefined || currentFreeRanks === null) {
    updates["system.freeRanks"] = 0;
  }

  const currentFreeEmphasis = item.system?.freeEmphasis;
  if (currentFreeEmphasis === undefined || currentFreeEmphasis === null) {
    updates["system.freeEmphasis"] = 0;
  }

  return updates;
}
