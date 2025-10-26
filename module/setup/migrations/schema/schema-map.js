/**
 * Schema Migration Map
 *
 * Defines property path migrations for converting legacy snake_case field names
 * to camelCase throughout the L5R4 system. Used by the migration system to
 * automatically update Actor and Item documents during system upgrades.
 *
 * Each entry specifies:
 * - docType: "Actor" or "Item"
 * - type: Specific document type or "*" for all types
 * - from: Legacy property path (snake_case)
 * - to: New property path (camelCase)
 *
 * Applied via buildSchemaUpdate() in migrations.js during Foundry's system
 * initialization lifecycle when schema version changes are detected.
 *
 * @see module/setup/migrations.js#buildSchemaUpdate
 * @see https://foundryvtt.com/article/versioning/
 */

/**
 * @typedef {Object} SchemaMigrationRule
 * @property {"Actor"|"Item"} docType - Foundry document type to migrate
 * @property {string} type - Document subtype or "*" for all subtypes
 * @property {string} from - Source property path (legacy snake_case format)
 * @property {string} to - Target property path (new camelCase format)
 */

/**
 * Migration rules for converting legacy snake_case properties to camelCase.
 *
 * Rules are grouped by document type and organized by property category:
 * - Universal Actor properties (wounds, armor TN)
 * - PC-specific properties (initiative modifiers, shadow taint)
 * - NPC-specific properties (armor TN)
 * - Skill properties (mastery ranks, bonuses)
 * - Armor properties (equipped status, special rules)
 *
 * Processed in order by buildSchemaUpdate() - earlier rules take precedence
 * if multiple rules target the same property path.
 *
 * @type {SchemaMigrationRule[]}
 * @constant
 */
export const SCHEMA_MAP = [
  // Universal Actor properties (apply to all actor types)
  { docType: "Actor", type: "*", from: "system.wounds.heal_rate", to: "system.wounds.healRate" },
  { docType: "Actor", type: "*", from: "system.wound_lvl", to: "system.woundLevels" },
  { docType: "Actor", type: "*", from: "system.armor.armor_tn", to: "system.armor.armorTn" },

  // PC-specific properties
  { docType: "Actor", type: "pc", from: "system.armor_tn", to: "system.armorTn" },
  {
    docType: "Actor",
    type: "pc",
    from: "system.initiative.roll_mod",
    to: "system.initiative.rollMod"
  },
  {
    docType: "Actor",
    type: "pc",
    from: "system.initiative.keep_mod",
    to: "system.initiative.keepMod"
  },
  {
    docType: "Actor",
    type: "pc",
    from: "system.initiative.total_mod",
    to: "system.initiative.totalMod"
  },
  { docType: "Actor", type: "pc", from: "system.shadow_taint", to: "system.shadowTaint" },

  // NPC-specific properties
  { docType: "Actor", type: "npc", from: "system.armor.armor_tn", to: "system.armor.armorTn" },

  // Skill properties
  { docType: "Item", type: "skill", from: "system.mastery_3", to: "system.mastery3" },
  { docType: "Item", type: "skill", from: "system.mastery_5", to: "system.mastery5" },
  { docType: "Item", type: "skill", from: "system.mastery_7", to: "system.mastery7" },
  { docType: "Item", type: "skill", from: "system.insight_bonus", to: "system.insightBonus" },
  { docType: "Item", type: "skill", from: "system.roll_bonus", to: "system.rollBonus" },
  { docType: "Item", type: "skill", from: "system.keep_bonus", to: "system.keepBonus" },
  { docType: "Item", type: "skill", from: "system.total_bonus", to: "system.totalBonus" },

  // Armor properties
  { docType: "Item", type: "armor", from: "system.equiped", to: "system.equipped" },
  { docType: "Item", type: "armor", from: "system.specialRues", to: "system.specialRules" }
];
