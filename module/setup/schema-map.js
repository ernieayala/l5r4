/**
 * L5R4 — Schema key mapping table.
 * Purpose: define old → new dot-path remaps for Actor/Item system data.
 * This file is imported by the migrations runner and applied idempotently.
 *
 * Example usage:
 *  - To rename system.traits.ref to system.reflexes for Actor type "pc":
 *    { docType: "Actor", type: "pc", from: "system.traits.ref", to: "system.reflexes" }
 *
 * Nothing here executes at import time other than exporting plain data.
 */

export const SCHEMA_MAP = [
  // Actor (all types)
  { docType: "Actor", type: "*",   from: "system.wounds.heal_rate",       to: "system.wounds.healRate" },
  { docType: "Actor", type: "*",   from: "system.wound_lvl",              to: "system.woundLevels" },
  // Actor: PC
  { docType: "Actor", type: "pc",  from: "system.armor_tn",               to: "system.armorTn" },
  { docType: "Actor", type: "pc",  from: "system.initiative.roll_mod",    to: "system.initiative.rollMod" },
  { docType: "Actor", type: "pc",  from: "system.initiative.keep_mod",    to: "system.initiative.keepMod" },
  { docType: "Actor", type: "pc",  from: "system.initiative.total_mod",   to: "system.initiative.totalMod" },
  { docType: "Actor", type: "pc",  from: "system.shadow_taint",           to: "system.shadowTaint" },
  // Actor: NPC
  { docType: "Actor", type: "npc", from: "system.armor.armor_tn",         to: "system.armor.armorTn" },
  // Item: Skill
  { docType: "Item", type: "skill", from: "system.mastery_3",             to: "system.mastery3" },
  { docType: "Item", type: "skill", from: "system.mastery_5",             to: "system.mastery5" },
  { docType: "Item", type: "skill", from: "system.mastery_7",             to: "system.mastery7" },
  { docType: "Item", type: "skill", from: "system.insight_bonus",         to: "system.insightBonus" },
  { docType: "Item", type: "skill", from: "system.roll_bonus",            to: "system.rollBonus" },
  { docType: "Item", type: "skill", from: "system.keep_bonus",            to: "system.keepBonus" },
  { docType: "Item", type: "skill", from: "system.total_bonus",           to: "system.totalBonus" }
];
