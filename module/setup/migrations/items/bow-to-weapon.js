/**
 * @module setup/migrations/items/bow-to-weapon
 * @description Converts the legacy "bow" item type to the unified "weapon" type with the isBow flag.
 */
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
 * - Carries forward explodesOn (10 for standard dice)
 * - Maintains skill/trait associations for attack rolls
 *
 * Uses diff: false because changing document type requires full replacement, not incremental
 * patching. Foundry VTT doesn't support partial updates when document type changes.
 *
 * @param {Item} item - An item; anything but a bow is left alone
 * @returns {Promise<void>}
 */
export async function migrateBowToWeapon(item) {
  if (item.type !== "bow") {
    return;
  }
  await item.update(
    { type: "weapon", system: buildBowWeaponSystem(item) },
    { diff: false, recursive: false, render: false }
  );
}

/**
 * A bow's system data as a weapon's: marked `isBow`, `damageKeep` 0, and the bow fields kept or defaulted.
 * @param {Item} item - A "bow" item
 * @returns {object} The weapon system data
 */
function buildBowWeaponSystem(item) {
  const currentSystem = foundry.utils.deepClone(item.system || {});
  return {
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
}
