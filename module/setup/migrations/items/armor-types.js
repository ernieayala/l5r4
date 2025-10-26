/**
 * Armor Type Field Migration
 * Ensures armor items have the armorType field for penalty calculations.
 *
 * @module setup/migrations/items/armor-types
 */

import { SYS_ID } from "../../../config/constants.js";

/**
 * Ensures armor items have the armorType field for penalty calculations.
 *
 * Backfills armorType field for armor items created before the armor penalty system
 * was implemented. Defaults to "ashigaru" armor type (no penalties) to avoid surprising
 * players with unexpected penalties. Players can manually adjust to light/heavy/riding as needed.
 *
 * L5R4 Armor Types:
 * - Ashigaru: No penalties (peasant armor)
 * - Light: +5 TN to Athletics/Stealth skills
 * - Heavy: +5 TN to all Agility/Reflexes skills
 * - Riding: +5 TN to all Agility/Reflexes rolls (waived when mounted)
 *
 * @param {Document[]} docs - Array of Item documents to scan for armor
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function migrateArmorTypes(docs, label) {
  const armorItems = docs.filter(doc => doc.type === "armor");
  if (armorItems.length === 0) {
    return;
  }

  console.warn(
    `${SYS_ID} | Migrating ${armorItems.length} armor items to add armorType field (${label})`
  );

  let migratedCount = 0;

  for (const item of armorItems) {
    try {
      const currentArmorType = item.system?.armorType;
      if (currentArmorType === undefined || currentArmorType === null || currentArmorType === "") {
        await item.update({ "system.armorType": "ashigaru" }, { diff: true, render: false });
        migratedCount++;
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate armor type", {
        id: item.id,
        name: item.name,
        err
      });
    }
  }

  if (migratedCount > 0) {
    console.warn(
      `${SYS_ID} | Successfully migrated ${migratedCount} armor items with armorType field (${label})`
    );
  }
}
