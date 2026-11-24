/**
 * @module setup/migrations/items/normalize
 * @description Ensures consistent data types and formats for weapon and bow items.
 */

/**
 * Lowercases a weapon's or bow's size. Early system versions may have stored size values with mixed case ("Medium"
 * vs "medium"); filtering and comparison read the lowercase value.
 *
 * @param {Item} item - An item; anything but a weapon or bow is left alone
 * @returns {Promise<void>}
 */
export async function migrateWeaponSize(item) {
  if (item.type !== "weapon" && item.type !== "bow") {
    return;
  }
  const size = item.system?.size;
  if (typeof size === "string" && size !== size.toLowerCase()) {
    await item.update({ "system.size": size.toLowerCase() }, { diff: true, render: false });
  }
}
