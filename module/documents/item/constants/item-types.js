/**
 * Item Type Constants - Chat Card Templates and Default Icons
 *
 * Defines centralized mappings between L5R4 item types and their visual representations
 * for chat cards and default icons. Ensures consistent rendering across the system.
 *
 * Architecture:
 * - CHAT_CARD_TEMPLATES: Maps each item type to its Handlebars chat card template
 * - DEFAULT_ICONS: Maps each item type to its default icon path
 * - Both constants exported as static properties on L5R4Item class
 *
 * Item Types (L5R4 Game Elements):
 * - advantage/disadvantage: Character creation traits that modify abilities
 * - armor: Protective equipment with TN bonus and damage reduction
 * - bow: LEGACY type for backward compatibility (pre-v1.0.0 migration)
 * - clan/family: Character lineage and social structure
 * - commonItem: Generic equipment and possessions
 * - kata: Martial techniques requiring ring mastery levels
 * - kiho: Monk mystical abilities tied to elemental rings
 * - school: Training dojo that teaches techniques
 * - skill: Abilities tied to traits (Bugei, High, Low, Merchant)
 * - spell: Shugenja magic with ring, mastery, range, and duration
 * - tattoo: Ise Zumi mystical tattoos with supernatural effects
 * - technique: School techniques that advance with insight rank
 * - weapon: Melee/ranged weapons with damage dice and associated skills
 *
 * Consumers:
 * - item.js: Exports as L5R4Item.CHAT_CARD_TEMPLATES and L5R4Item.DEFAULT_ICONS
 * - chat-cards.js: Looks up template path for renderItemChatCard()
 * - item-creation.js: Assigns default icon during item creation (preCreate hook)
 * - base-data.js: Normalizes icon in prepareItemBaseData()
 *
 * Foundry VTT Integration:
 * - Templates rendered via foundry.utils.renderTemplate() in chat messages
 * - Icons assigned during Item DataModel lifecycle (preCreate, prepareBaseData)
 * - Requires Foundry v13+ for Handlebars template rendering
 *
 * Legacy Support:
 * - 'bow' type maintained for backward compatibility with pre-v1.0.0 worlds
 * - New bows use type='weapon' with system.isBow=true flag
 * - Both constants include 'bow' entry for migration period
 *
 * @module documents/item/constants/item-types
 * @requires Foundry VTT v13+
 */

// Template path builder from config - constructs validated Handlebars template paths
import { TEMPLATE } from "../../../config/templates.js";
// Icon path builder from config - constructs validated asset icon paths
import { iconPath } from "../../../config/icons.js";

/**
 * Chat card template paths mapped by item type.
 *
 * Maps each L5R4 item type to its corresponding Handlebars template for rendering
 * chat cards when items are posted to chat. Templates display item properties,
 * mechanics, and game rules in a formatted card.
 *
 * Template Rendering:
 * - Consumed by renderItemChatCard() in chat-cards.js
 * - Rendered via foundry.utils.renderTemplate() wrapper (R function)
 * - Displayed in ChatMessage with item data context
 *
 * Template Structure:
 * - All templates located in templates/cards/ directory
 * - Built using Handlebars (.hbs) syntax with system helpers
 * - Receive full item data object as template context
 *
 * Legacy Note:
 * - 'bow' type points to weapon.hbs template (same as weapon type)
 * - Maintained for backward compatibility during migration from pre-v1.0.0
 * - Modern bows use type='weapon' with isBow flag
 *
 * @constant {Object.<string, string>}
 * @property {string} advantage - Template for advantage chat cards
 * @property {string} armor - Template for armor equipment chat cards
 * @property {string} bow - LEGACY: Template for bow weapon chat cards (use weapon type for new items)
 * @property {string} clan - Template for clan affiliation chat cards
 * @property {string} disadvantage - Template for disadvantage chat cards
 * @property {string} family - Template for family lineage chat cards
 * @property {string} commonItem - Template for generic item chat cards
 * @property {string} kata - Template for kata martial technique chat cards
 * @property {string} kiho - Template for kiho mystical ability chat cards
 * @property {string} school - Template for school/dojo chat cards
 * @property {string} skill - Template for skill chat cards with trait and mastery info
 * @property {string} spell - Template for spell chat cards with ring, mastery, range
 * @property {string} tattoo - Template for Ise Zumi tattoo chat cards
 * @property {string} technique - Template for school technique chat cards
 * @property {string} weapon - Template for weapon chat cards with damage and skills
 * @readonly
 */
export const CHAT_CARD_TEMPLATES = {
  advantage: TEMPLATE("cards/advantage-disadvantage.hbs"),
  armor: TEMPLATE("cards/armor.hbs"),
  bow: TEMPLATE("cards/weapon.hbs"),
  clan: TEMPLATE("cards/commonItem.hbs"),
  disadvantage: TEMPLATE("cards/advantage-disadvantage.hbs"),
  family: TEMPLATE("cards/commonItem.hbs"),
  commonItem: TEMPLATE("cards/commonItem.hbs"),
  kata: TEMPLATE("cards/kata.hbs"),
  kiho: TEMPLATE("cards/kiho.hbs"),
  school: TEMPLATE("cards/commonItem.hbs"),
  skill: TEMPLATE("cards/skill.hbs"),
  spell: TEMPLATE("cards/spell.hbs"),
  tattoo: TEMPLATE("cards/tattoo.hbs"),
  technique: TEMPLATE("cards/technique.hbs"),
  weapon: TEMPLATE("cards/weapon.hbs")
};

/**
 * Default icon paths mapped by item type.
 *
 * Maps each L5R4 item type to its default icon image path. Icons are automatically
 * assigned when new items are created without a custom image, ensuring consistent
 * visual representation across the system.
 *
 * Icon Assignment:
 * - Applied during item creation in handleItemPreCreate() (item-creation.js)
 * - Normalized in prepareItemBaseData() if img is default Foundry icon
 * - Fallback to "icons/svg/item-bag.svg" if type not found
 *
 * Icon Resolution:
 * - All icons stored in assets/icons/ directory as .webp files
 * - Paths built using iconPath() helper from config/icons.js
 * - Icons optimized for Foundry's UI rendering
 *
 * Bow Weapon Handling:
 * - Items with type='weapon' and system.isBow=true use 'bow' icon
 * - Legacy items with type='bow' also use 'bow' icon
 * - Ensures visual consistency during migration period
 *
 * Legacy Note:
 * - 'bow' entry maintained for backward compatibility with pre-v1.0.0 worlds
 * - Modern bows use type='weapon' but iconType resolves to 'bow' via isBow flag
 *
 * @constant {Object.<string, string>}
 * @property {string} advantage - Default icon for advantages (advantage.webp)
 * @property {string} armor - Default icon for armor (armor.webp)
 * @property {string} bow - LEGACY: Default icon for bows (bow.webp) - also used for weapon.isBow=true
 * @property {string} clan - Default icon for clans (clan.webp)
 * @property {string} disadvantage - Default icon for disadvantages (disadvantage.webp)
 * @property {string} family - Default icon for families (family.webp)
 * @property {string} commonItem - Default icon for generic items (item.webp)
 * @property {string} kata - Default icon for kata techniques (kata.webp)
 * @property {string} kiho - Default icon for kiho abilities (kiho.webp)
 * @property {string} school - Default icon for schools (school.webp)
 * @property {string} skill - Default icon for skills (skill.webp)
 * @property {string} spell - Default icon for spells (spell.webp)
 * @property {string} tattoo - Default icon for tattoos (tattoo.webp)
 * @property {string} technique - Default icon for techniques (technique.webp)
 * @property {string} weapon - Default icon for weapons (weapon.webp)
 * @readonly
 */
export const DEFAULT_ICONS = {
  advantage: iconPath("advantage.webp"),
  armor: iconPath("armor.webp"),
  bow: iconPath("bow.webp"),
  clan: iconPath("clan.webp"),
  disadvantage: iconPath("disadvantage.webp"),
  family: iconPath("family.webp"),
  commonItem: iconPath("item.webp"),
  kata: iconPath("kata.webp"),
  kiho: iconPath("kiho.webp"),
  school: iconPath("school.webp"),
  skill: iconPath("skill.webp"),
  spell: iconPath("spell.webp"),
  tattoo: iconPath("tattoo.webp"),
  technique: iconPath("technique.webp"),
  weapon: iconPath("weapon.webp")
};
