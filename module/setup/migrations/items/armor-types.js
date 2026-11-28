/**
 * @module setup/migrations/items/armor-types
 * @description Ensures armor items have the armorType field for penalty calculations.
 */

/**
 * Backfills an armor's armorType for armor created before the armor penalty system was implemented. Defaults to
 * "ashigaru" armor type (no penalties) to avoid surprising players with unexpected penalties. Players can manually
 * adjust to light/heavy/riding as needed.
 *
 * L5R4 Armor Types:
 * - Ashigaru: No penalties (peasant armor)
 * - Light: +5 TN to Athletics/Stealth skills
 * - Heavy: +5 TN to all Agility/Reflexes skills
 * - Riding: +5 TN to all Agility/Reflexes rolls (waived when mounted)
 *
 * @param {Item} item - An item; anything but armor is left alone
 * @returns {Promise<void>}
 */
export async function migrateArmorType(item) {
  if (item.type !== "armor") {
    return;
  }
  const armorType = item.system?.armorType;
  if (armorType === undefined || armorType === null || armorType === "") {
    await item.update({ "system.armorType": "ashigaru" }, { diff: true, render: false });
  }
}
