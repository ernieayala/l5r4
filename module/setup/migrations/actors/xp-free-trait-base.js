/**
 * Free Trait Rank Flag Migration
 * Clears free stored Trait ranks that were marked for an Active Effect creation bonus.
 *
 * @module setup/migrations/actors/xp-free-trait-base
 */

import { SYS_ID } from "../../../config/constants.js";
import { getCreationFreeBonusSources } from "../../../utils/xp-calculations.js";

/**
 * Clears `flags.l5r4-enhanced.xpFreeTraitBase.<trait>` where the Trait's creation bonus is an Active Effect.
 *
 * The flag marks a stored rank as the free Family/School rank. That holds for the legacy `trait`/`bonus` fields,
 * which the player stores as a rank, but an Active Effect bonus adds on top of the stored rank: with the flag set,
 * XP skips the first bought rank and prices the later ones without the bonus. Clearing it prices every stored rank
 * at 4 × the Trait's new rank with the bonus (Core Rulebook p.103). Setting the value to 0 reads the same as an
 * absent key in the XP code, and running again changes nothing.
 *
 * @param {Document[]} docs - Actor documents to scan
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function migrateEffectFreeTraitBase(docs, label) {
  for (const doc of docs) {
    try {
      if (doc.documentName !== "Actor" || doc.type !== "pc") {
        continue;
      }

      const freeTraitBase = doc.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};
      const updates = {};
      for (const [trait, value] of Object.entries(freeTraitBase)) {
        if (Number(value) > 0 && getCreationFreeBonusSources(doc, trait).effects > 0) {
          updates[`flags.${SYS_ID}.xpFreeTraitBase.${trait}`] = 0;
        }
      }

      if (Object.keys(updates).length > 0) {
        // The XP history's version hash does not cover this flag; 0 makes the XP Manager rebuild the history
        updates[`flags.${SYS_ID}.xpRetroactiveVersion`] = 0;
        await doc.update(updates, { diff: true, render: false });
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Free Trait rank migration failed", {
        label,
        id: doc.id,
        error: e
      });
    }
  }
}
