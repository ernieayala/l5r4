/**
 * L5R4 Item Document
 * 
 * Core document class for Legend of the Five Rings 4th Edition items in Foundry VTT.
 * Extends Foundry's base Item class to implement L5R4-specific lifecycle hooks,
 * data preparation, and integration with the system's XP tracking and chat rendering.
 * 
 * Architecture:
 * This class follows the Separation of Concerns principle by delegating most logic
 * to specialized modules:
 * - **Lifecycle**: item-creation.js, item-updates.js (handle preCreate, onCreate, preUpdate hooks)
 * - **Preparation**: base-data.js, derived-data.js (implement prepareBaseData, prepareDerivedData)
 * - **Integration**: chat-cards.js, sheet-data.js (render chat cards, enhance sheet context)
 * 
 * The document class serves as a thin orchestration layer, calling imported functions
 * to perform actual work. This keeps the document class focused on Foundry lifecycle
 * coordination while business logic lives in testable, focused modules.
 * 
 * L5R4 Item Types:
 * - **skill**: Character abilities tied to traits (Bugei, High, Low, Merchant)
 * - **weapon**: Melee and ranged weapons with damage rolls and skill associations
 * - **armor**: Protective equipment providing Armor TN bonus and damage reduction
 * - **spell**: Shugenja magic with ring, mastery level, range, and duration
 * - **advantage/disadvantage**: Character creation traits with XP costs/benefits
 * - **technique**: School techniques unlocking at specific insight ranks
 * - **kata**: Martial techniques requiring ring mastery levels
 * - **kiho**: Monk mystical abilities tied to elemental rings
 * - **tattoo**: Ise Zumi mystical tattoos with supernatural effects
 * - **clan/family**: Character lineage and social structure
 * - **school**: Training dojo teaching techniques
 * - **commonItem**: Generic equipment and possessions
 * 
 * Key Integrations:
 * - **XP Tracking**: onCreate and preUpdate hooks log skill ranks, emphases, and advantage costs
 * - **Default Icons**: preCreate hook assigns type-specific icons from DEFAULT_ICONS
 * - **Chat Cards**: roll() method renders items as formatted chat messages using Handlebars templates
 * - **Sheet Data**: getData() enhances context with localized configuration for templates
 * 
 * Foundry VTT Integration:
 * - Requires Foundry v13+ for Item Document and DataModel lifecycle
 * - Implements Document lifecycle hooks: _preCreate, _onCreate, _preUpdate
 * - Implements DataModel preparation: prepareBaseData, prepareDerivedData
 * - Uses Application v2 pattern: getData() for sheet context preparation
 * - Registered in CONFIG.Item.documentClass during system initialization
 * 
 * Data Preparation Flow:
 * 1. **_preCreate**: Assign default icons, validate advantage/disadvantage costs
 * 2. **prepareBaseData**: Initialize bow properties, normalize icons, ensure rich text strings
 * 3. **prepareDerivedData**: Compute skill formulas, calculate bow damage
 * 4. **getData**: Inject configuration data for sheet templates
 * 
 * Consumers:
 * - System initialization: Registered as CONFIG.Item.documentClass
 * - Item sheets: ItemSheetV2 classes render and edit items
 * - Actor documents: Items embedded in actors for character sheets
 * - Chat integration: roll() called from item sheets and quick-roll buttons
 * - XP Manager: Reads XP journal flags written by lifecycle hooks
 * 
 * @module documents/item
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/v13/classes/client.Item.html|Foundry Item API}
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.DataModel.html|DataModel API}
 */

import { CHAT_CARD_TEMPLATES, DEFAULT_ICONS } from "./item/constants/item-types.js";
import { handleItemPreCreate, handleItemOnCreate } from "./item/lifecycle/item-creation.js";
import { handleItemPreUpdate } from "./item/lifecycle/item-updates.js";
import { prepareItemBaseData } from "./item/preparation/base-data.js";
import { prepareItemDerivedData } from "./item/preparation/derived-data.js";
import { renderItemChatCard } from "./item/integration/chat-cards.js";
import { enhanceItemSheetData } from "./item/integration/sheet-data.js";

/**
 * L5R4 Item Document class.
 * 
 * Extends Foundry's base Item class to provide L5R4-specific lifecycle handling,
 * data preparation, and system integration. Delegates most logic to imported modules
 * following the Separation of Concerns architecture pattern.
 * 
 * Static Properties:
 * - `CHAT_CARD_TEMPLATES`: Maps item types to Handlebars template paths for chat rendering
 * - `DEFAULT_ICONS`: Maps item types to default icon paths for automatic assignment
 * 
 * Lifecycle Hooks (Foundry v13 Document API):
 * - `_preCreate`: Pre-creation validation and default value assignment
 * - `_onCreate`: Post-creation XP tracking and journal logging
 * - `_preUpdate`: Pre-update validation and XP expenditure tracking
 * 
 * Data Preparation (Foundry v13 DataModel API):
 * - `prepareBaseData`: Initialize default values and normalize data
 * - `prepareDerivedData`: Compute roll formulas and derived statistics
 * 
 * Integration Methods:
 * - `roll`: Render item as chat card in chat log
 * - `getData`: Enhance sheet context with configuration data for templates
 * 
 * @extends {Item}
 */
export default class L5R4Item extends Item {
  /**
   * Chat card template paths mapped by item type.
   * 
   * Static reference to CHAT_CARD_TEMPLATES constant from item-types.js.
   * Used by renderItemChatCard() to look up the appropriate Handlebars template
   * when rendering items to chat. Each L5R4 item type has a corresponding template
   * that formats its properties for display in chat messages.
   * 
   * @type {Object.<string, string>}
   * @static
   * @readonly
   */
  static CHAT_CARD_TEMPLATES = CHAT_CARD_TEMPLATES;

  /**
   * Default icon paths mapped by item type.
   * 
   * Static reference to DEFAULT_ICONS constant from item-types.js.
   * Used during item creation and base data preparation to assign type-specific
   * default icons when items are created without custom images. Ensures consistent
   * visual representation across the system.
   * 
   * @type {Object.<string, string>}
   * @static
   * @readonly
   */
  static DEFAULT_ICONS = DEFAULT_ICONS;

  /* -------------------------------------------- */
  /* Lifecycle                                    */
  /* -------------------------------------------- */

  /**
   * Pre-creation lifecycle hook for L5R4 items.
   * 
   * Foundry Document lifecycle hook called before item validation and database insertion.
   * Delegates to handleItemPreCreate() for:
   * - Assigning default icons based on item type
   * - Validating advantage/disadvantage costs (clamp to ≥0)
   * - Special handling for bow weapons (isBow flag → bow icon)
   * 
   * This hook executes before Foundry's data validation, allowing us to normalize
   * data and set defaults that will be validated against the schema. Changes are
   * applied via updateSource() which mutates the document during creation.
   * 
   * L5R4 Rules Context:
   * - Advantages cost XP as listed (always positive)
   * - Disadvantages grant XP during creation (max 10 total)
   * - Cost validation prevents XP exploits from negative values
   * 
   * Foundry Integration:
   * - Hook: _preCreate (Foundry v13 Document lifecycle)
   * - Timing: Before validation, before database persistence
   * - Mutation: Uses updateSource() to modify document data
   * - Async: Required by Foundry's hook contract
   * 
   * @param {object} data - Raw creation data passed to Item.create()
   * @param {object} options - Creation options (parent, pack, etc.)
   * @param {string} userId - ID of user creating the item
   * @returns {Promise<void>} Resolves when pre-creation processing completes
   * 
   * @async
   * @override
   */
  async _preCreate(data, options, userId) {
    await super._preCreate(data, options, userId);
    handleItemPreCreate(this, data);
  }

  /**
   * Post-creation lifecycle hook for L5R4 items.
   * 
   * Foundry Document lifecycle hook called after item is persisted to database.
   * Delegates to handleItemOnCreate() for XP tracking:
   * - Skills: Log XP cost for initial rank purchase
   * - Advantages: Log XP expenditure (positive cost)
   * - Disadvantages: Log XP gain (negative cost)
   * 
   * XP tracking only applies to items owned by actors (orphan items ignored).
   * Journal entries are written to actor flags for display in XP Manager application.
   * 
   * L5R4 Rules Context:
   * - Skills cost XP equal to rank (1 XP for rank 1, cumulative for higher ranks)
   * - Advantages deduct XP from available pool
   * - Disadvantages grant XP up to 10 point maximum during character creation
   * 
   * Foundry Integration:
   * - Hook: _onCreate (Foundry v13 Document lifecycle)
   * - Timing: After database persistence, safe to read item.id
   * - Mutation: Calls actor.setFlag() to persist XP journal
   * - Async: Required for await on actor flag updates
   * 
   * @param {object} data - Creation data passed to Item.create()
   * @param {object} options - Creation options (parent, pack, etc.)
   * @param {string} userId - ID of user who created the item
   * @returns {Promise<void>} Resolves when XP tracking completes
   * 
   * @async
   * @override
   */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    await handleItemOnCreate(this, data);
  }

  /**
   * Pre-update lifecycle hook for L5R4 items.
   * 
   * Foundry Document lifecycle hook called before item updates are applied.
   * Delegates to handleItemPreUpdate() for:
   * - Validating advantage/disadvantage cost changes (clamp to ≥0)
   * - Detecting free rank changes that invalidate XP history
   * - Tracking XP expenditures for skill ranks, emphases, and advantage costs
   * 
   * Critical Free Rank Logic:
   * When freeRanks or freeEmphasis changes, all XP history becomes invalid because
   * free ranks affect retroactive XP calculations. The system resets all XP tracking
   * and relies on current item state to recalculate spent XP.
   * 
   * L5R4 Rules Context:
   * - Skill ranks cost XP equal to next rank (rank 3 = 3 XP)
   * - Emphases cost 2 XP each
   * - School skills grant free rank 1 (some grant free emphasis)
   * - Advantages/disadvantages have point costs that can change
   * 
   * Foundry Integration:
   * - Hook: _preUpdate (Foundry v13 Document lifecycle)
   * - Timing: Before update applies, receives delta changes only
   * - Mutation: Calls actor.setFlag() to persist XP journal
   * - Async: Required for await on actor flag updates
   * 
   * @param {object} changes - Delta object containing only changed fields (Foundry format)
   * @param {object} options - Update options (diff, render, etc.)
   * @param {string} userId - ID of user making the update
   * @returns {Promise<void>} Resolves when validation and XP tracking complete
   * 
   * @async
   * @override
   */
  async _preUpdate(changes, options, userId) {
    await super._preUpdate(changes, options, userId);
    await handleItemPreUpdate(this, changes);
  }

  /**
   * Base data preparation hook for L5R4 items.
   * 
   * Foundry DataModel lifecycle hook called during data preparation phase.
   * First preparation phase after item creation, before prepareDerivedData.
   * Delegates to prepareItemBaseData() for:
   * - Initializing bow weapon properties (strength, arrow type)
   * - Normalizing item icons (assign type-specific defaults)
   * - Ensuring rich text fields are strings for template rendering
   * 
   * Bow Mechanics:
   * Initializes bow strength (0-4) and arrow type (default "willow") per core
   * Weapons rules. Bow damage = min(bow Str, actor Str) + arrow modifiers.
   * 
   * Foundry Integration:
   * - Hook: prepareBaseData (Foundry v13 DataModel lifecycle)
   * - Timing: After _preCreate, before prepareDerivedData
   * - Frequency: Every time item data is accessed (cached by Foundry)
   * - Mutation: Modifies item.system and item.img directly
   * 
   * @returns {void} Mutates the item in-place
   * 
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData();
    prepareItemBaseData(this);
  }

  /**
   * Derived data preparation hook for L5R4 items.
   * 
   * Foundry DataModel lifecycle hook called during data preparation phase.
   * Second preparation phase after prepareBaseData, computes roll formulas
   * and derived statistics. Delegates to prepareItemDerivedData() for:
   * - Computing skill roll formulas: (Skill Rank)k0
   * - Calculating bow damage formulas: min(bow Str, actor Str) + arrow DR
   * 
   * L5R4 Rules Context:
   * - Skill rolls become (Skill + Trait)k(Trait) when paired with traits at roll time
   * - Bow damage follows Equipment rules: bow Strength added to arrow damage,
   *   limited by actor's Strength (weaker archers can't fully draw strong bows)
   * - Arrow types modify damage: Willow Leaf 2k2, Armor Piercing 1k1, Flesh Cutter 2k3
   * 
   * Foundry Integration:
   * - Hook: prepareDerivedData (Foundry v13 DataModel lifecycle)
   * - Timing: After prepareBaseData, before sheets render
   * - Frequency: Every time item data is accessed (cached by Foundry)
   * - Mutation: Modifies item.system properties (rollFormula, damageFormula, etc.)
   * 
   * @returns {void} Mutates the item in-place
   * 
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    prepareItemDerivedData(this);
  }

  /* -------------------------------------------- */
  /* Chat                                         */
  /* -------------------------------------------- */

  /**
   * Render this item as a chat card in the Foundry VTT chat log.
   * 
   * Creates a ChatMessage displaying the item's details using a type-specific
   * Handlebars template from CHAT_CARD_TEMPLATES. The message includes speaker
   * context (from item's owning actor if available), respects the current roll
   * mode setting, and displays a localized item type label as flavor text.
   * 
   * Delegates to renderItemChatCard() which handles:
   * - Template lookup based on item.type
   * - Handlebars rendering with item data context
   * - ChatMessage creation with speaker and roll mode
   * - Localized type label generation
   * 
   * This method is typically called from:
   * - Item sheet "Post to Chat" button clicks
   * - Quick-roll buttons in actor sheets
   * - Macro commands and API calls
   * 
   * Foundry Integration:
   * - Uses ChatMessage.create() to post to chat log
   * - Uses ChatMessage.getSpeaker() for actor context
   * - Respects game.settings roll mode (public, private, blind, self)
   * 
   * @returns {Promise<ChatMessage|undefined>} Created ChatMessage document,
   *   or undefined if no template exists for item type
   * 
   * @async
   */
  async roll() {
    return renderItemChatCard(this);
  }

  /**
   * Prepare sheet context data for rendering item sheets.
   * 
   * Called by Foundry's sheet rendering pipeline (both Application v2 and legacy patterns).
   * Enhances the base context object with L5R4-specific configuration data needed by
   * Handlebars templates for rendering item sheets and embedded item lists.
   * 
   * Delegates to enhanceItemSheetData() which injects a `config` property containing:
   * - Arrow type options (weapon sheets)
   * - Weapon size options (weapon sheets)
   * - Ring selectors (spell/kiho sheets)
   * - Trait dropdowns (skill sheets)
   * - Skill type categories (skill sheets)
   * - Action type selectors (technique/kata sheets)
   * - Advantage/disadvantage type filters
   * - NPC wound level configuration
   * 
   * This method is called by:
   * - ItemSheetV2._prepareContext() for Application v2 sheets
   * - Legacy Item.getData() for backwards compatibility
   * - ActorSheetV2._prepareContext() for embedded item rendering
   * 
   * Foundry Integration:
   * - Follows Application v2 context preparation pattern (Foundry v13+)
   * - Mutates context object in-place per Foundry's data preparation convention
   * - All config values reference frozen localization constants
   * 
   * @param {object} [options] - Sheet rendering options passed by Foundry
   * @returns {Promise<object>} Enhanced context object with injected config property
   * 
   * @async
   */
  async getData(options) {
    const data = await super.getData(options);
    return enhanceItemSheetData(data);
  }
}
