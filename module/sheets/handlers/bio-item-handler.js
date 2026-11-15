/**
 * Bio Item Handler
 *
 * Opens and clears the clan, family, and school items linked from L5R4 character sheets. Each character has one
 * clan, one family, and one school (Character Creation Steps 1-3); a dropped one replaces the old through
 * module/services/purchase.js (addItem), which also sets the links this handler reads.
 *
 * Responsibilities:
 * - Manage family name integration into character display name
 * - Provide bio item sheet access and clearing operations
 *
 * Foundry APIs:
 * - Actor.deleteEmbeddedDocuments
 * - Actor.update, Actor.getFlag
 * - fromUuid (requires Foundry v10+)
 * - sheet.render
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Handler for L5R4 biographical items (clan, family, school): opening the linked item and clearing it.
 */
export class BioItemHandler {
  /**
   * Opens the sheet for a linked bio item (clan/family/school).
   *
   * Retrieves the bio item UUID from actor flags, resolves the document,
   * and renders its sheet. Useful for inspecting/editing bio item details
   * without opening the Items Directory.
   *
   * @param {Actor} actor - The actor whose bio item should be opened
   * @param {string} bioType - The bio type: "clan", "family", or "school"
   * @returns {Promise<void>}
   */
  static async openLinked(actor, bioType) {
    try {
      let uuid = null;

      if (bioType === "clan") {
        uuid = actor.getFlag(SYS_ID, "clanItemUuid");
      } else if (bioType === "family") {
        uuid = actor.getFlag(SYS_ID, "familyItemUuid");
      } else if (bioType === "school") {
        uuid = actor.getFlag(SYS_ID, "schoolItemUuid");
      }

      if (!uuid) {
        console.warn(`${SYS_ID} BioItemHandler: No UUID stored for ${bioType}`);
        return;
      }

      const doc = await fromUuid(uuid);
      if (!doc) {
        console.warn(`${SYS_ID} BioItemHandler: Could not resolve UUID for ${bioType}`, { uuid });
        return;
      }

      doc.sheet?.render(true);
    } catch (err) {
      console.warn(`${SYS_ID} BioItemHandler: Failed to open ${bioType} sheet`, { err });
    }
  }

  /**
   * Clears a bio item from an actor, removing embedded items and resetting flags.
   *
   * For clan/school: clears system field (system.clan/school) and UUID flag.
   * For family: deletes embedded item, extracts base name from character name
   * (removing family prefix), and clears all family-related flags.
   *
   * Family name handling implements L5R4 naming convention where family name
   * prefixes the character's personal name (e.g., "Kakita Yoshi" → "Yoshi").
   *
   * @param {Actor} actor - The actor to clear the bio item from
   * @param {string} bioType - The bio type to clear: "clan", "family", or "school"
   * @returns {Promise<void>}
   */
  static async clear(actor, bioType) {
    try {
      const updates = {};

      if (bioType === "clan") {
        updates["system.clan"] = "";
        updates[`flags.${SYS_ID}.clanItemUuid`] = null;
      } else if (bioType === "family") {
        // Extract personal name by removing family prefix (e.g., "Kakita Yoshi" → "Yoshi")
        const fam = actor.getFlag(SYS_ID, "familyName");
        let name = actor.name || "";
        if (fam) {
          name = this.extractBaseName(name, fam);
        }

        // Delete embedded family item before clearing flags
        const prior = (actor.items?.contents ?? actor.items).filter(i => i.type === "family");
        if (prior.length) {
          await actor.deleteEmbeddedDocuments(
            "Item",
            prior.map(i => i.id)
          );
        }

        updates.name = name;
        updates[`flags.${SYS_ID}.familyItemUuid`] = null;
        updates[`flags.${SYS_ID}.familyName`] = null;
        updates[`flags.${SYS_ID}.familyBaseName`] = null;
      } else if (bioType === "school") {
        updates["system.school"] = "";
        updates[`flags.${SYS_ID}.schoolItemUuid`] = null;
      }

      if (Object.keys(updates).length) {
        await actor.update(updates);
      }
    } catch (err) {
      console.warn(`${SYS_ID} BioItemHandler: Failed to clear ${bioType}`, { err });
    }
  }

  /**
   * Extracts a character's personal name by removing the family name prefix.
   *
   * Implements L5R4 naming convention where family name precedes personal name
   * (e.g., "Kakita Yoshi" contains family "Kakita" and personal name "Yoshi").
   *
   * Algorithm:
   * 1. Normalize family name to lowercase with trailing space ("kakita ")
   * 2. Check if current name starts with family prefix (case-insensitive)
   * 3. If match: return substring after prefix, trimmed
   * 4. If no match: return original name unchanged
   *
   * @param {string} current - The current character name (may include family prefix)
   * @param {string} fam - The family name to remove
   * @returns {string} The personal name with family prefix removed, or original if no match
   */
  static extractBaseName(current, fam) {
    const famPrefix = (String(fam) + " ").toLowerCase();
    const s = String(current ?? "");

    if (s.toLowerCase().startsWith(famPrefix)) {
      return s.slice(famPrefix.length).trim();
    }

    return s;
  }
}
