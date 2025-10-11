/**
 * @fileoverview Item Type Constants and Configuration
 * 
 * Centralized configuration for all L5R4 item types including chat card templates
 * and default icon assignments. Provides static mappings used throughout the item system.
 * 
 * **Responsibilities:**
 * - Define chat card template paths for each item type
 * - Define default icon paths for item creation
 * - Centralize item type configuration for maintainability
 * 
 * **Architecture:**
 * Pure static configuration with no runtime dependencies. Consumed by lifecycle
 * and integration modules for consistent item type handling.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 */

import { TEMPLATE } from "../../../config/templates.js";
import { iconPath } from "../../../config/icons.js";

/**
 * Chat template paths for rendering item-specific chat cards.
 * Maps each item type to its corresponding Handlebars template.
 * 
 * NOTE: 'bow' entry is LEGACY support for pre-v1.0.0 items during migration.
 * New bows use type='weapon' with system.isBow=true flag.
 * 
 * @type {Record<string, string>}
 */
export const CHAT_CARD_TEMPLATES = {
  advantage:    TEMPLATE("cards/advantage-disadvantage.hbs"),
  armor:        TEMPLATE("cards/armor.hbs"),
  bow:          TEMPLATE("cards/weapon.hbs"),  // LEGACY: For unmigrated bow items
  clan:         TEMPLATE("cards/commonItem.hbs"),
  disadvantage: TEMPLATE("cards/advantage-disadvantage.hbs"),
  family:       TEMPLATE("cards/commonItem.hbs"),
  commonItem:   TEMPLATE("cards/commonItem.hbs"),
  kata:         TEMPLATE("cards/kata.hbs"),
  kiho:         TEMPLATE("cards/kiho.hbs"),
  school:       TEMPLATE("cards/commonItem.hbs"),
  skill:        TEMPLATE("cards/skill.hbs"),
  spell:        TEMPLATE("cards/spell.hbs"),
  tattoo:       TEMPLATE("cards/tattoo.hbs"),
  technique:    TEMPLATE("cards/technique.hbs"),
  weapon:       TEMPLATE("cards/weapon.hbs")
};

/**
 * Default icon paths by item type for automatic assignment.
 * Used when items are created without explicit icons or with the generic bag icon.
 * 
 * NOTE: 'bow' entry is LEGACY support for pre-v1.0.0 items during migration.
 * New bows use type='weapon' with system.isBow=true flag.
 * 
 * @type {Record<string, string>}
 */
export const DEFAULT_ICONS = {
  advantage:    iconPath("advantage.webp"),
  armor:        iconPath("armor.webp"),
  bow:          iconPath("bow.webp"),  // LEGACY: For unmigrated bow items
  clan:         iconPath("clan.webp"),
  disadvantage: iconPath("disadvantage.webp"),
  family:       iconPath("family.webp"),
  commonItem:   iconPath("item.webp"),
  kata:         iconPath("kata.webp"),
  kiho:         iconPath("kiho.webp"),
  school:       iconPath("school.webp"),
  skill:        iconPath("skill.webp"),
  spell:        iconPath("spell.webp"),
  tattoo:       iconPath("tattoo.webp"),
  technique:    iconPath("technique.webp"),
  weapon:       iconPath("weapon.webp")
};
