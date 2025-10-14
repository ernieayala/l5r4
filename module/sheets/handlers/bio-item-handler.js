/**
 * Bio Item Handler
 * 
 * Manages clan, family, and school items for L5R4 character sheets.
 * Enforces singleton pattern per L5R4 Character Creation rules (Steps 1-3):
 * each character has exactly one clan, one family, and one school.
 * 
 * Responsibilities:
 * - Handle drag-drop of bio items onto character sheets
 * - Enforce singleton constraint (auto-replace existing bio items of same type)
 * - Sync actor flags and system fields with embedded bio item data
 * - Manage family name integration into character display name
 * - Provide bio item sheet access and clearing operations
 * 
 * Foundry APIs:
 * - Actor.createEmbeddedDocuments / deleteEmbeddedDocuments
 * - Actor.update, Actor.getFlag
 * - fromUuid (requires Foundry v10+)
 * - Document.toObject, sheet.render
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Valid bio item types per L5R4 Character Creation (Steps 1-3).
 * Each character has exactly one of each type.
 * @type {Set<string>}
 */
const BIO_TYPES = new Set(["clan", "family", "school"]);

/**
 * Handler for L5R4 biographical items (clan, family, school).
 * 
 * Implements singleton pattern enforcement and actor data synchronization
 * for character creation bio items per core L5R4 rules.
 */
export class BioItemHandler {
  
  /**
   * Handles drag-drop of a bio item (clan/family/school) onto an actor sheet.
   * 
   * Enforces singleton constraint: automatically removes any existing bio item
   * of the same type before creating the new one. Updates actor flags and
   * system fields to reference the newly embedded item.
   * 
   * For families: embeds the item and stores UUID/name in flags only.
   * For clan/school: embeds item, stores UUID in flags, AND copies name to system fields.
   * 
   * @param {Object} context - Sheet context containing the actor
   * @param {Item} itemDoc - The bio item document being dropped
   * @returns {Promise<Item|null>} The newly created embedded item, or null on failure
   */
  static async handleDrop(context, itemDoc) {
    const type = String(itemDoc.type);
    
    if (!BIO_TYPES.has(type)) {
      console.warn(`${SYS_ID} BioItemHandler: Invalid bio item type`, { type });
      return null;
    }

    try {
      // Defensive access: items can be Collection or array depending on context
      const prior = (context.actor.items?.contents ?? context.actor.items).filter(i => i.type === type);
      if (prior.length) {
        await context.actor.deleteEmbeddedDocuments("Item", prior.map(i => i.id));
      }
    } catch (err) {
      console.warn(`${SYS_ID} BioItemHandler: Failed to delete prior bio item(s)`, { type, err });
    }

    let newest = null;
    try {
      const [created] = await context.actor.createEmbeddedDocuments("Item", [itemDoc.toObject()]);
      newest = created ?? null;
    } catch (err) {
      console.warn(`${SYS_ID} BioItemHandler: Failed to embed bio item on drop`, { type, err });
      return null;
    }

    // Build actor updates based on bio type
    // Clan/School: sync name to system field + store UUID in flags
    // Family: store UUID and name in flags only (name handled by extractBaseName during clear)
    const updates = {};
    if (type === "clan") {
      updates["system.clan"] = newest?.name ?? "";
      updates[`flags.${SYS_ID}.clanItemUuid`] = newest?.uuid ?? null;
    } else if (type === "school") {
      updates["system.school"] = newest?.name ?? "";
      updates[`flags.${SYS_ID}.schoolItemUuid`] = newest?.uuid ?? null;
    } else if (type === "family") {
      updates[`flags.${SYS_ID}.familyItemUuid`] = newest?.uuid ?? null;
      updates[`flags.${SYS_ID}.familyName`] = newest?.name ?? null;
    }

    if (Object.keys(updates).length) {
      try {
        await context.actor.update(updates);
      } catch (err) {
        console.warn(`${SYS_ID} BioItemHandler: actor.update failed after bio drop`, { type, updates, err });
      }
    }

    return newest;
  }

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
          await actor.deleteEmbeddedDocuments("Item", prior.map(i => i.id));
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
