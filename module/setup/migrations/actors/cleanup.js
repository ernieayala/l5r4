/**
 * @module setup/migrations/actors/cleanup
 * @description Removes legacy field names from actors after the migration to the new schema.
 */
import { SYS_ID } from "../../../config/constants.js";
import { getByPath, updateByPath } from "../utils/helpers.js";

/**
 * Each legacy field path with the current field that replaces it.
 * @type {ReadonlyArray<{old: string, new: string}>}
 */
const LEGACY_FIELDS = Object.freeze([
  { old: "system.wounds.heal_rate", new: "system.wounds.healRate" },
  { old: "system.wound_lvl", new: "system.woundLevels" },
  { old: "system.armor.armor_tn", new: "system.armor.armorTn" },
  { old: "system.shadow_taint", new: "system.shadowTaint" },
  { old: "system.armor_tn", new: "system.armorTn" },
  { old: "system.initiative.roll_mod", new: "system.initiative.rollMod" },
  { old: "system.initiative.keep_mod", new: "system.initiative.keepMod" },
  { old: "system.initiative.total_mod", new: "system.initiative.totalMod" }
]);

/**
 * Removes legacy field names after successful migration to new schema.
 *
 * Deletes old snake_case field names when corresponding camelCase fields exist and are
 * populated. This cleanup prevents data duplication and ensures documents only contain
 * current-schema fields. Only removes fields when BOTH old and new versions exist,
 * preserving data safety.
 *
 * @param {Document[]} docs - Array of Actor documents to clean up
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function deleteLegacyFields(docs, label) {
  for (const doc of docs) {
    try {
      if (doc.documentName !== "Actor") {
        continue;
      }

      const updates = buildLegacyFieldDeletions(doc);
      if (updates) {
        await doc.update(updates, { diff: true, render: false });
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Legacy cleanup failed", {
        label,
        id: doc.id,
        type: doc.type,
        error: e
      });
    }
  }
}

/**
 * The update that nulls an actor's legacy fields: a PC's `system.armor` (an NPC-only property), and each legacy
 * field whose current field is also present.
 * @param {Actor} doc
 * @returns {object|null} The update, or null when the actor has no legacy field to remove
 */
function buildLegacyFieldDeletions(doc) {
  const updates = {};
  let needsUpdate = false;

  // PC-specific cleanup: Remove system.armor (NPC-only property)
  if (doc.type === "pc") {
    const pcArmorProp = getByPath(doc, "system.armor");
    if (pcArmorProp !== undefined) {
      updateByPath(updates, "system.armor", null);
      needsUpdate = true;
    }
  }

  for (const rule of LEGACY_FIELDS) {
    const oldVal = getByPath(doc, rule.old);
    const newVal = getByPath(doc, rule.new);

    if (oldVal !== undefined && newVal !== undefined) {
      updateByPath(updates, rule.old, null);
      needsUpdate = true;
    }
  }

  return needsUpdate ? updates : null;
}
