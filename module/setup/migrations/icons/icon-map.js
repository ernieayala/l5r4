/**
 * Legacy Icon Filename Mapping
 * Maps old PNG icon filenames to new WebP format for migration.
 *
 * @module setup/migrations/icons/icon-map
 */

/**
 * Legacy icon filename mapping for .png → .webp migration.
 *
 * Maps old PNG icon filenames to new WebP format with updated naming conventions.
 * Used during system asset migration to update document icons without breaking existing
 * actor/item references. Frozen to prevent runtime modification.
 *
 * @type {Object<string, string>}
 * @constant
 */
export const ICON_MIGRATION_MAP = Object.freeze({
  "attackstance.png": "attack-stance.webp",
  "fullattackstance.png": "full-attack-stance.webp",
  "defensestance.png": "defence-stance.webp",
  "fulldefensestance.png": "full-defense-stance.webp",
  "centerstance.png": "centered-stance.webp",

  "grapple.png": "grappled.webp",
  "mounted.png": "mounted.webp",

  "bamboo.png": "clan.webp",
  "bow.png": "bow.webp",
  "coins.png": "item.webp",
  "flower.png": "skill.webp",
  "hat.png": "armor.webp",
  "kanji.png": "technique.webp",
  "scroll.png": "kata.webp",
  "scroll2.png": "spell.webp",
  "sword.png": "weapon.webp",
  "tattoo.png": "tattoo.webp",
  "tori.png": "family.webp",
  "yin-yang.png": "advantage.webp",

  "helm.png": "pc.webp",
  "ninja.png": "npc.webp"
});
