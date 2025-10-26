/**
 * Legacy Field Cleanup
 * Removes legacy field names after successful migration to new schema.
 *
 * @module setup/migrations/actors/cleanup
 */

import { SYS_ID } from "../../../config/constants.js";
import { getByPath, setByPath } from "../utils/helpers.js";

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
export async function cleanupLegacyFields(docs, label) {
  for (const doc of docs) {
    try {
      if (doc.documentName !== "Actor") {
        continue;
      }

      const updates = {};
      let needsUpdate = false;

      const cleanupRules = [
        { old: "system.wounds.heal_rate", new: "system.wounds.healRate" },
        { old: "system.wound_lvl", new: "system.woundLevels" },
        { old: "system.armor.armor_tn", new: "system.armor.armorTn" },
        { old: "system.shadow_taint", new: "system.shadowTaint" },
        { old: "system.armor_tn", new: "system.armorTn" },
        { old: "system.initiative.roll_mod", new: "system.initiative.rollMod" },
        { old: "system.initiative.keep_mod", new: "system.initiative.keepMod" },
        { old: "system.initiative.total_mod", new: "system.initiative.totalMod" }
      ];

      // PC-specific cleanup: Remove system.armor (NPC-only property)
      if (doc.type === "pc") {
        const pcArmorProp = getByPath(doc, "system.armor");
        if (pcArmorProp !== undefined) {
          setByPath(updates, "system.armor", null);
          needsUpdate = true;
        }
      }

      for (const rule of cleanupRules) {
        const oldVal = getByPath(doc, rule.old);
        const newVal = getByPath(doc, rule.new);

        if (oldVal !== undefined && newVal !== undefined) {
          setByPath(updates, rule.old, null);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
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
