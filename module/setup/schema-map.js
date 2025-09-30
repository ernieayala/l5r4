/**
 * @fileoverview L5R4 Schema Migration Map - Field Remapping Rules for Data Structure Updates
 * 
 * This module defines the comprehensive mapping rules used by the migration system to update
 * document data structures when field names or locations change between system versions.
 * Each rule specifies how to safely move data from old field paths to new field paths
 * while preserving data integrity and maintaining backward compatibility.
 *
 * **Core Responsibilities:**
 * - **Rule Definition**: Declarative field transformation specifications
 * - **Type Safety**: Document type and subtype-specific migration rules
 * - **Path Mapping**: Dot-notation field path transformations
 * - **Version Control**: Systematic tracking of schema changes across versions
 * - **Data Preservation**: Ensuring no data loss during migrations
 *
 * **Migration Rule Structure:**
 * Each rule is an object with the following properties:
 * - **docType**: Document type ("Actor" or "Item") - specifies which documents to migrate
 * - **type**: Document subtype ("pc", "npc", "skill", etc.) or "*" for all types
 * - **from**: Source field path using dot-notation (e.g., "system.old_field")
 * - **to**: Target field path using dot-notation (e.g., "system.newField")
 * - **version**: Optional version when this migration was introduced
 * - **condition**: Optional function to determine if migration should apply
 *
 * **Migration Categories:**
 * - **Naming Convention Updates**: snake_case → camelCase conversions for consistency
 * - **Field Relocations**: Moving fields to new parent objects for better organization
 * - **Structure Reorganization**: Flattening or nesting data structures for efficiency
 * - **Legacy Cleanup**: Removing deprecated field names and obsolete properties
 * - **Type Conversions**: Converting data types while preserving semantic meaning
 * - **Validation Updates**: Adding validation constraints to existing fields
 *
 * **Safety Features:**
 * - **Idempotent Operations**: Safe to run multiple times without side effects
 * - **Type-Specific Rules**: Apply only to matching document types for precision
 * - **Universal Rules**: Use "*" type to apply to all subtypes when appropriate
 * - **Non-Destructive**: Only migrates when source exists and target doesn't exist
 * - **Rollback Support**: Maintains original field until migration is confirmed successful
 * - **Error Isolation**: Individual rule failures don't affect other migrations
 *
 * **Rule Processing Order:**
 * 1. **Type-Specific Rules**: Process exact type matches first
 * 2. **Universal Rules**: Process "*" type rules second
 * 3. **Dependency Resolution**: Handle field dependencies in correct order
 * 4. **Validation**: Verify migration success before cleanup
 * 5. **Cleanup**: Remove source fields only after successful migration
 *
 * **Usage Examples:**
 * ```javascript
 * // Rename a field for all Actor types
 * { docType: "Actor", type: "*", from: "system.old_name", to: "system.newName" }
 * 
 * // Rename a field for specific Item type
 * { docType: "Item", type: "weapon", from: "system.damage_roll", to: "system.damageRoll" }
 * 
 * // Conditional migration based on field existence
 * { 
 *   docType: "Actor", 
 *   type: "pc", 
 *   from: "system.legacy_field", 
 *   to: "system.modernField",
 *   condition: (doc) => doc.system.version < "2.0"
 * }
 * ```
 *
 * **Integration with Migration System:**
 * - **Rule Loading**: Migration system imports and processes these rules
 * - **Batch Processing**: Rules applied efficiently to document collections
 * - **Progress Tracking**: Migration progress reported using rule count
 * - **Error Handling**: Failed rules logged but don't stop migration process
 * - **Validation**: Rules validated before application to prevent errors
 *
 * **Performance Considerations:**
 * - **Rule Ordering**: Most common migrations placed first for efficiency
 * - **Type Specificity**: Specific type rules processed before universal rules
 * - **Batch Operations**: Multiple rules applied in single document update
 * - **Memory Management**: Large rule sets processed in chunks
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 1.0.2
 * @see {@link ./migrations.js} Migration system that processes these rules
 * @see {@link https://foundryvtt.com/api/classes/foundry.utils.html#getProperty|foundry.utils.getProperty}
 * @see {@link https://foundryvtt.com/api/classes/foundry.utils.html#setProperty|foundry.utils.setProperty}
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
  { docType: "Actor", type: "*",   from: "system.armor.armor_tn",         to: "system.armor.armorTn" },
  
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
  { docType: "Item", type: "skill", from: "system.total_bonus",           to: "system.totalBonus" },
  
  // Item migrations: Armor field typo fixes and naming updates
  { docType: "Item", type: "armor", from: "system.equiped",               to: "system.equipped" },
  { docType: "Item", type: "armor", from: "system.specialRues",           to: "system.specialRules" }
];
