/**
 * Bow to Weapon Type Migration
 * Converts legacy "bow" item type to unified "weapon" type with isBow flag.
 *
 * @module setup/migrations/items/bow-to-weapon
 */

import { SYS_ID } from "../../../config/constants.js";

/**
 * Migrates legacy "bow" item type to unified "weapon" type with isBow flag.
 *
 * Transforms deprecated standalone bow items into weapon items marked with isBow: true,
 * preserving bow-specific properties (str requirement, range, arrow type) while unifying
 * the item type structure. This migration enables shared weapon systems while maintaining
 * bow-specific mechanics like ranged attacks and arrow compatibility.
 *
 * Migration Details:
 * - Sets damageKeep: 0 (bows calculate damage differently than melee weapons)
 * - Preserves bow mechanics: str (tension rating), range, arrow type
 * - Carries forward explodesOn (typically 10 for standard dice)
 * - Maintains skill/trait associations for attack rolls
 *
 * Uses diff: false because changing document type requires full replacement, not incremental
 * patching. Foundry VTT doesn't support partial updates when document type changes.
 *
 * @param {Document[]} docs - Array of Item documents to scan for bow types
 * @param {string} label - Migration context label for console logging (e.g., "world-items")
 * @returns {Promise<void>}
 */
export async function migrateBowsToWeapons(docs, label) {
  const bowItems = docs.filter(doc => doc.type === "bow");
  if (bowItems.length === 0) {
    return;
  }

  console.warn(`${SYS_ID} | Migrating ${bowItems.length} bow items to weapons (${label})`);

  for (const item of bowItems) {
    try {
      const currentSystem = foundry.utils.deepClone(item.system || {});
      const weaponSystem = {
        ...currentSystem,
        isBow: true,
        damageKeep: 0, // Bows don't use damageKeep, set to 0

        str: currentSystem.str || 1,
        range: currentSystem.range || 100,
        arrow: currentSystem.arrow || "willow",

        explodesOn: currentSystem.explodesOn || 10,
        associatedSkill: currentSystem.associatedSkill || "",
        fallbackTrait: currentSystem.fallbackTrait || "ref"
      };

      const updateData = {
        type: "weapon",
        system: weaponSystem
      };

      await item.update(updateData, { diff: false, recursive: false, render: false });
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate bow item", {
        id: item.id,
        name: item.name,
        err
      });
    }
  }
}
