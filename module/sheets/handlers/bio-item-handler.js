/**
 * @fileoverview Bio Item Handler - Clan, Family, and School Item Management
 * 
 * Handles bio item operations for the PC sheet including drag/drop, linking, and
 * clearing of clan, family, and school items. These are special singleton items
 * that define the character's background and provide mechanical benefits.
 * 
 * **Responsibilities:**
 * - Bio item drop handling with singleton enforcement
 * - UUID flag management for item references
 * - Actor name mutations (family prefix handling)
 * - Bio item linking (open sheet by UUID)
 * - Bio item clearing (remove and cleanup)
 * 
 * **L5R4 Bio Items:**
 * - **Clan**: Character's clan (e.g., Crab, Crane, Lion)
 * - **Family**: Character's family within clan (provides +1 trait via Active Effects)
 * - **School**: Character's starting school (defines techniques and progression)
 * 
 * Each type is singleton - only one of each can exist on a character. Dropping a
 * new bio item replaces the old one.
 * 
 * **Family Name Prefix:**
 * When a family is assigned, the family name is prefixed to the character name:
 * - "Samurai" + Hida family → "Hida Samurai"
 * - When cleared, prefix is removed: "Hida Samurai" → "Samurai"
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#createEmbeddedDocuments|createEmbeddedDocuments}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#deleteEmbeddedDocuments|deleteEmbeddedDocuments}
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Bio Item Handler Class
 * Manages clan, family, and school item operations for PC sheets.
 */
export class BioItemHandler {
  /**
   * Handle drop of a bio item (clan, family, or school) on the PC sheet.
   * Enforces singleton constraint and delegates to type-specific handlers.
   * 
   * This method should be called from the PC sheet's _onDrop() method when
   * a clan, family, or school item is detected.
   * 
   * **Drop Flow:**
   * 1. Validate item type is clan, family, or school
   * 2. Remove any existing items of the same type (singleton)
   * 3. Create embedded item on the actor
   * 4. Update actor flags with item UUID
   * 5. For family: add name prefix and apply Active Effects
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {Item} itemDoc - The dropped item document
   * @returns {Promise<Item|null>} The created item, or null if failed
   * 
   * @example
   * // In pc-sheet.js _onDrop():
   * if (BIO_TYPES.has(itemDoc.type)) {
   *   return BioItemHandler.handleDrop(this._getHandlerContext(), itemDoc);
   * }
   */
  static async handleDrop(context, itemDoc) {
    const type = String(itemDoc.type);
    const BIO_TYPES = new Set(["clan", "family", "school"]);
    
    if (!BIO_TYPES.has(type)) {
      console.warn(`${SYS_ID} BioItemHandler: Invalid bio item type`, { type });
      return null;
    }

    // Enforce singleton: remove prior of same type
    try {
      const prior = (context.actor.items?.contents ?? context.actor.items).filter(i => i.type === type);
      if (prior.length) {
        await context.actor.deleteEmbeddedDocuments("Item", prior.map(i => i.id));
      }
    } catch (err) {
      console.warn(`${SYS_ID} BioItemHandler: Failed to delete prior bio item(s)`, { type, err });
    }

    // Create the new embedded item
    let newest = null;
    try {
      const [created] = await context.actor.createEmbeddedDocuments("Item", [itemDoc.toObject()]);
      newest = created ?? null;
    } catch (err) {
      console.warn(`${SYS_ID} BioItemHandler: Failed to embed bio item on drop`, { type, err });
      return null;
    }

    // Update labels/flags based on type
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
   * Handle drop of a Clan item specifically.
   * Sets actor.system.clan and stores the item UUID.
   * 
   * @param {Actor} actor - The actor document
   * @param {Item} itemDoc - The dropped clan item
   * @returns {Promise<void>}
   * 
   * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Actor.update}
   */
  static async handleClanDrop(actor, itemDoc) {
    const clanName = String(itemDoc.name ?? "").trim();
    const data = { "system.clan": clanName };
    data[`flags.${SYS_ID}.clanItemUuid`] = itemDoc.uuid;
    
    try {
      await actor.update(data);
    } catch (err) {
      console.warn(`${SYS_ID} BioItemHandler: Failed to update clan`, { err });
    }
  }

  /**
   * Handle drop of a School item specifically.
   * Sets actor.system.school and stores the item UUID.
   * 
   * @param {Actor} actor - The actor document
   * @param {Item} itemDoc - The dropped school item
   * @returns {Promise<void>}
   * 
   * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Actor.update}
   */
  static async handleSchoolDrop(actor, itemDoc) {
    const schoolName = String(itemDoc.name ?? "").trim();
    const data = { "system.school": schoolName };
    data[`flags.${SYS_ID}.schoolItemUuid`] = itemDoc.uuid;
    
    try {
      await actor.update(data);
    } catch (err) {
      console.warn(`${SYS_ID} BioItemHandler: Failed to update school`, { err });
    }
  }

  /**
   * Handle drop of a Family item specifically.
   * Sets flags and embeds the item (for Active Effects application).
   * Does NOT mutate the actor name - that's handled by handleDrop().
   * 
   * @param {Actor} actor - The actor document
   * @param {Item} itemDoc - The dropped family item
   * @returns {Promise<void>}
   */
  static async handleFamilyDrop(actor, itemDoc) {
    try {
      // Remove any existing family items
      const prior = (actor.items?.contents ?? actor.items).filter(i => i.type === "family");
      if (prior.length) {
        await actor.deleteEmbeddedDocuments("Item", prior.map(i => i.id));
      }
    } catch (err) {
      console.warn(`${SYS_ID} BioItemHandler: Failed to delete stale Family items on drop`, { err });
    }

    try {
      await actor.update({
        [`flags.${SYS_ID}.familyItemUuid`]: itemDoc.uuid,
        [`flags.${SYS_ID}.familyName`]: String(itemDoc.name ?? "")
      });
    } catch (err) {
      console.warn(`${SYS_ID} BioItemHandler: Failed to update family flags`, { err });
    }
  }

  /**
   * Open the linked bio item sheet by UUID.
   * 
   * @param {Actor} actor - The actor document
   * @param {string} bioType - "clan", "family", or "school"
   * @returns {Promise<void>}
   * 
   * @example
   * // In template:
   * <button data-action="clan-link" data-uuid="{{bioClan.uuid}}">View Clan</button>
   * 
   * // In pc-sheet.js _onAction():
   * case "clan-link": 
   *   return BioItemHandler.openLinked(this.actor, "clan");
   * 
   * @see {@link https://foundryvtt.com/api/global.html#fromUuid|fromUuid}
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
   * Clear the bio item assignment and remove embedded items.
   * 
   * **Clan Clearing:**
   * - Clears system.clan field
   * - Removes clanItemUuid flag
   * 
   * **Family Clearing:**
   * - Removes embedded family item (stops Active Effects)
   * - Removes family name prefix from actor name
   * - Clears familyItemUuid, familyName, and familyBaseName flags
   * 
   * **School Clearing:**
   * - Clears system.school field
   * - Removes schoolItemUuid flag
   * 
   * @param {Actor} actor - The actor document
   * @param {string} bioType - "clan", "family", or "school"
   * @returns {Promise<void>}
   * 
   * @example
   * // In pc-sheet.js _onAction():
   * case "clan-clear": 
   *   return BioItemHandler.clear(this.actor, "clan");
   */
  static async clear(actor, bioType) {
    try {
      const updates = {};
      
      if (bioType === "clan") {
        updates["system.clan"] = "";
        updates[`flags.${SYS_ID}.clanItemUuid`] = null;
      } else if (bioType === "family") {
        // Remove family name prefix from actor name
        const fam = actor.getFlag(SYS_ID, "familyName");
        let name = actor.name || "";
        if (fam) {
          name = this.extractBaseName(name, fam);
        }
        
        // Remove embedded family items
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
   * Extract base name by removing family prefix from the current name.
   * Handles case-insensitive family name removal with space handling.
   * 
   * **Examples:**
   * - extractBaseName("Hida Samurai", "Hida") → "Samurai"
   * - extractBaseName("Doji Courtier", "Doji") → "Courtier"
   * - extractBaseName("Ronin", "Hida") → "Ronin" (no change)
   * 
   * @param {string} current - The current actor name (may have family prefix)
   * @param {string} fam - The family name to remove
   * @returns {string} The base name without family prefix
   * 
   * @example
   * const baseName = BioItemHandler.extractBaseName("Hida Kuon", "Hida");
   * // Returns: "Kuon"
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
