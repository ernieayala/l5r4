/**
 * @module setup/migrations/schema/persist
 * @description Writes a document's migrated `system` back to the database in place of the stored one (#182). The data
 * models reshape legacy keys (`wound_lvl`, `shadow_taint`, `armor_tn`, a kata's `cost`) in `migrateData` on every
 * load (module/data/migrate-source.js), but the database kept them, so a later edit that wrote one leaf of the new
 * key could lose to them or drop the rest of it on the next load. Replacing the whole stored `system` with the
 * migrated one keeps every converted value and removes every legacy key: an update cannot name a key the schema does
 * not hold, which core prunes [src: common/data/fields.mjs:1142-1147]. Only `system` is replaced: the rest of the
 * update, such as a flag the actor's own `_preUpdate` adds, merges as usual, so flags are never lost.
 */

/**
 * Replace a document's stored `system` with its migrated source.
 * @param {Actor|Item} doc
 * @returns {Promise<void>}
 */
export async function migrateStoredSystem(doc) {
  const system = foundry.utils.deepClone(doc._source.system);
  await doc.update(
    { system: foundry.data.operators.ForcedReplacement.create(system) },
    { diff: false, render: false }
  );
}
