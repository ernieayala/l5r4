/**
 * @module setup/migrations/schema/apply
 * @description Renames legacy field names to the current schema (snake_case to camelCase).
 */
import { getByPath, updateByPath, deleteByPath } from "../utils/helpers.js";
import { SCHEMA_MAP } from "./map.js";

/**
 * Builds an update object for document schema field remapping.
 *
 * Scans the document against SCHEMA_MAP rules to identify legacy field names that need
 * transformation. Only creates updates if legacy fields exist AND target fields are empty.
 * Preserves existing data at target locations (non-destructive).
 *
 * A SCHEMA_MAP entry such as `{ docType: "Actor", type: "npc", from: "system.armor.armor_tn", to:
 * "system.armor.armorTn" }` moves the value at `from` to `to`.
 *
 * @param {Document} doc - Actor or Item document to evaluate
 * @returns {object|null} Update object with transformed fields, or null if no changes needed
 */
export function buildSchemaUpdate(doc) {
  const { documentName: docType } = doc; // "Actor" | "Item"
  const type = doc.type;

  const rules = SCHEMA_MAP.filter(
    r => r.docType === docType && (r.type === type || r.type === "*")
  );
  if (!rules.length) {
    return null;
  }

  const patch = { system: foundry.utils.deepClone(doc.system ?? {}) };
  let touched = false;

  for (const rule of rules) {
    const fromVal = getByPath(patch, rule.from);
    const toVal = getByPath(patch, rule.to);

    const hasValidTarget = toVal !== undefined && toVal !== "";
    if (fromVal === undefined || hasValidTarget) {
      continue;
    }

    updateByPath(patch, rule.to, fromVal);
    deleteByPath(patch, rule.from);
    touched = true;
  }

  if (!touched) {
    return null;
  }

  return { system: patch.system };
}

/**
 * Apply the SCHEMA_MAP renames (snake_case to camelCase field names) to one document, when it has any.
 * @param {Document} doc - An Actor or Item
 * @returns {Promise<void>}
 */
export async function applySchemaMap(doc) {
  const update = buildSchemaUpdate(doc);
  if (update) {
    await doc.update(update);
  }
}
