/**
 * L5R4 Schema Migration Map - Field Remapping Rules for Data Structure Updates.
 * 
 * This module defines the mapping rules used by the migration system to update
 * document data structures when field names or locations change between system versions.
 * Each rule specifies how to move data from old field paths to new field paths.
 *
 * ## Migration Rule Structure:
 * Each rule is an object with the following properties:
 * - **docType**: Document type ("Actor" or "Item")
 * - **type**: Document subtype ("pc", "npc", "skill", etc.) or "*" for all types
 * - **from**: Source field path using dot-notation (e.g., "system.old_field")
 * - **to**: Target field path using dot-notation (e.g., "system.newField")
 *
 * ## Migration Categories:
 * - **Naming Convention Updates**: snake_case → camelCase conversions
 * - **Field Relocations**: Moving fields to new parent objects
 * - **Structure Reorganization**: Flattening or nesting data structures
 * - **Legacy Cleanup**: Removing deprecated field names
 *
 * ## Safety Features:
 * - **Idempotent Operations**: Safe to run multiple times
 * - **Type-Specific Rules**: Apply only to matching document types
 * - **Universal Rules**: Use "*" type to apply to all subtypes
 * - **Non-Destructive**: Only migrates when source exists and target doesn't
 *
 * ## Usage Examples:
 * ```javascript
 * // Rename a field for all Actor types
 * { docType: "Actor", type: "*", from: "system.old_name", to: "system.newName" }
 * 
 * // Rename a field for specific Item type
 * { docType: "Item", type: "weapon", from: "system.damage_roll", to: "system.damageRoll" }
 * ```
 *
 * @see {@link ./migrations.js} Migration system that processes these rules
 */

/**
 * Schema migration rules applied during system updates.
 * Rules are processed in order and applied to matching documents based on docType and type.
 * 
 * @type {Array<{docType: string, type: string, from: string, to: string}>}
 */
export const SCHEMA_MAP = [
  // Actor migrations: Universal rules applied to all actor types
  { docType: "Actor", type: "*",   from: "system.wounds.heal_rate",       to: "system.wounds.healRate" },
  { docType: "Actor", type: "*",   from: "system.wound_lvl",              to: "system.woundLevels" },
  // Actor migrations: Player Character specific field updates
  { docType: "Actor", type: "pc",  from: "system.armor_tn",               to: "system.armorTn" },
  { docType: "Actor", type: "pc",  from: "system.initiative.roll_mod",    to: "system.initiative.rollMod" },
  { docType: "Actor", type: "pc",  from: "system.initiative.keep_mod",    to: "system.initiative.keepMod" },
  { docType: "Actor", type: "pc",  from: "system.initiative.total_mod",   to: "system.initiative.totalMod" },
  { docType: "Actor", type: "pc",  from: "system.shadow_taint",           to: "system.shadowTaint" },
  // Actor migrations: Non-Player Character specific field updates
  { docType: "Actor", type: "npc", from: "system.armor.armor_tn",         to: "system.armor.armorTn" },
  // Item migrations: Skill-specific field naming convention updates
  { docType: "Item", type: "skill", from: "system.mastery_3",             to: "system.mastery3" },
  { docType: "Item", type: "skill", from: "system.mastery_5",             to: "system.mastery5" },
  { docType: "Item", type: "skill", from: "system.mastery_7",             to: "system.mastery7" },
  { docType: "Item", type: "skill", from: "system.insight_bonus",         to: "system.insightBonus" },
  { docType: "Item", type: "skill", from: "system.roll_bonus",            to: "system.rollBonus" },
  { docType: "Item", type: "skill", from: "system.keep_bonus",            to: "system.keepBonus" },
  { docType: "Item", type: "skill", from: "system.total_bonus",           to: "system.totalBonus" }
];
