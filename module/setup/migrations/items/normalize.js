/**
 * Item Data Normalization
 * Ensures consistent data types and formats for weapon/bow items.
 *
 * @module setup/migrations/items/normalize
 */

import { SYS_ID } from "../../../config/constants.js";

/**
 * Normalizes weapon/bow item data for consistency.
 *
 * Ensures weapon size properties use lowercase values. Early system versions may have
 * stored size values with mixed case ("Medium" vs "medium"). This migration enforces
 * lowercase for consistent filtering and comparison.
 *
 * @param {Document[]} docs - Array of Item documents to normalize
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function normalizeItems(docs, label) {
  for (const doc of docs) {
    try {
      if (doc.documentName !== "Item") {
        continue;
      }
      const t = doc.type;
      if (t !== "weapon" && t !== "bow") {
        continue;
      }
      const sz = doc.system?.size;
      if (typeof sz === "string" && sz !== sz.toLowerCase()) {
        await doc.update({ "system.size": sz.toLowerCase() }, { diff: true, render: false });
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Normalization failed", {
        label,
        id: doc.id,
        type: doc.type,
        error: e
      });
    }
  }
}
