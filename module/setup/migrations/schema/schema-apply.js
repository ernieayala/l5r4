/**
 * Schema Field Remapping Migrations
 * Handles transformation of legacy field names to current schema (e.g., snake_case → camelCase).
 *
 * @module setup/migrations/schema/schema-apply
 */

import { SYS_ID } from "../../../config/constants.js";
import { getByPath, setByPath, deleteByPath } from "../utils/helpers.js";
import { SCHEMA_MAP } from "./schema-map.js";

/**
 * Builds an update object for document schema field remapping.
 *
 * Scans the document against SCHEMA_MAP rules to identify legacy field names that need
 * transformation. Only creates updates if legacy fields exist AND target fields are empty.
 * Preserves existing data at target locations (non-destructive).
 *
 * Idempotency: Called from runMigrations() which filters out already-migrated documents,
 * so this function only processes documents that haven't been migrated yet. This prevents
 * overwriting manually-corrected field names when forceMigration is triggered.
 *
 * Schema Map Example:
 * - { docType: "Actor", type: "npc", from: "system.armor.armor_tn", to: "system.armor.armorTn" }
 *
 * @param {Document} doc - Actor or Item document to evaluate
 * @returns {Object|null} Update object with transformed fields, or null if no changes needed
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

    setByPath(patch, rule.to, fromVal);
    deleteByPath(patch, rule.from);
    touched = true;
  }

  if (!touched) {
    return null;
  }

  return { system: patch.system };
}

/**
 * Applies schema field remapping to a collection of documents.
 *
 * Iterates through documents and applies SCHEMA_MAP transformations (e.g., snake_case →
 * camelCase field names). Each document is evaluated independently and updated only if
 * changes are needed. Errors are logged but don't halt the batch process.
 *
 * @param {Document[]} docs - Array of Actor or Item documents to process
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function applySchemaMapToDocs(docs, label) {
  for (const doc of docs) {
    try {
      const update = buildSchemaUpdate(doc);
      if (update) {
        await doc.update(update);
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Schema remap failed", {
        label,
        id: doc.id,
        type: doc.type,
        error: e
      });
    }
  }
}
