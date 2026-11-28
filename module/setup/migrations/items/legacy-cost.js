/**
 * @module setup/migrations/items/legacy-cost
 * @description Tells the GM where a 3.2.1 kata's or kiho's XP changed: 3.2.1 charged the `cost` a player typed, and
 * 4.0 charges the Mastery Level (#43), or nothing for a School kiho, which a 3.2.1 kiho at cost 0 became (Ernie's
 * ruling, #182). L5R4Item.migrateData moved the cost into the `legacyCost` flag before the schema dropped it
 * (module/data/migrate-source.js); this step reads it, notes the change, and removes it.
 * game-rules/48_character_creation_expanded.md, p.103
 */

import { SYS_ID } from "../../../config/constants.js";

/**
 * Note one owned kata's or kiho's XP change for the GM, and remove its `legacyCost` flag.
 * @param {Item} item
 * @param {import("../../migrations.js").MigrationRun} run - Its notes are extended
 * @returns {Promise<void>}
 */
export async function migrateLegacyCost(item, run) {
  const before = item.getFlag(SYS_ID, "legacyCost");
  if (before === undefined) {
    return;
  }
  const note = buildLegacyCostNote(item, before);
  if (note) {
    run.notes.push(note);
  }
  await item.unsetFlag(SYS_ID, "legacyCost");
}

/**
 * The GM's note for one item: a kiho now a School kiho, or the XP a kata or kiho costs now against what 3.2.1
 * charged; none for an item no character owns, or one whose price is the same.
 * @param {Item} item
 * @param {number} before - The XP 3.2.1 charged
 * @returns {string|null}
 */
function buildLegacyCostNote(item, before) {
  const actor = item.actor;
  const entry = actor?.system._xp?.entries.find(e => e.type === item.type && e.name === item.name);
  if (!entry) {
    return null;
  }
  const names = { name: actor.name, item: item.name };
  if (item.type === "kiho" && before === 0 && item.system.schoolKiho) {
    return game.i18n.localize("l5r4.system.migration.kihoSchool", names);
  }
  if (entry.delta === before) {
    return null;
  }
  return game.i18n.localize("l5r4.system.migration.xpChanged", {
    ...names,
    before,
    after: entry.delta
  });
}
