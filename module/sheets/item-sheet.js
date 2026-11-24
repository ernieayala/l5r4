/**
 * @module sheets/item-sheet
 * @description The item sheet for every L5R4 item type: a tabbed form (details, modifiers, description, effects,
 * rules) that saves each field as it changes. It enriches the description, special rules, demands, and effect
 * text with TextEditor.enrichHTML, adds the L5R4 config through prepareItemSheetOptions(), manages the item's Active
 * Effects through ItemEffectsHandler, and for a weapon a PC owns lists that PC's skills to associate with it.
 */

import { SYS_ID } from "../config/constants.js";
import { F } from "../utils/localization.js";
import { getSkillEmphases } from "../utils/emphases.js";
import { prepareItemSheetOptions } from "../documents/item/integration/sheet-data.js";
import { summaryOf } from "../documents/summary.js";
import EmphasisManagerApplication from "../apps/emphasis-manager.js";
import { ItemEffectsHandler } from "./handlers/item-effects-handler.js";
import { RULES_EDITOR_ACTIONS, parseRulesForm, buildRulesEditorContext } from "./rules-editor.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const { TextEditor } = foundry.applications.ux;

/* ------------------------------------------ */
/* Layout Configuration and Helpers           */
/* ------------------------------------------ */

/**
 * Default sheet widths (in pixels) per item type.
 *
 * All item types use 640px width for consistent UX across the system.
 * This ensures adequate space for all L5R4 item properties without overwhelming
 * smaller screens. Future adjustments can target specific types if needed.
 *
 * @type {{[type: string]: number}}
 * @constant
 */
const WIDTH_BY_TYPE = Object.freeze({
  advantage: 640,
  disadvantage: 640,
  skill: 640,
  weapon: 640,
  armor: 640,
  kata: 640,
  kiho: 640,
  spell: 640,
  technique: 640,
  tattoo: 640,
  commonItem: 640
});

/**
 * The system fields the sheet shows as enriched HTML.
 * @type {ReadonlyArray<string>}
 */
const HTML_FIELDS = Object.freeze(["description", "specialRules", "demands", "effect"]);

/* ------------------------------------------ */
/* Sheet                                      */
/* ------------------------------------------ */

/**
 * L5R4 Item Sheet
 *
 * Application v2 sheet implementation for all L5R4 item types. Handles rendering,
 * data preparation, HTML enrichment, and ActiveEffect integration.
 *
 * Uses Handlebars templates from `templates/item/` directory with type-specific
 * partials loaded via _scaffold.hbs root template.
 *
 * Key Features:
 * - Dynamic width based on item type (all currently 640px)
 * - Real-time form updates via submitOnChange
 * - HTML enrichment for description, specialRules, demands, effect fields
 * - Weapon skill integration when owned by PC actors
 * - ActiveEffect CRUD operations: the effect actions call ItemEffectsHandler
 *
 * @augments {ItemSheetV2}
 * @mixes HandlebarsApplicationMixin
 */
export default class L5R4ItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  /**
   * This sheet's own options, merged over ItemSheetV2's by ApplicationV2 (arrays concatenated, so the parent's
   * entries are not repeated here). submitOnChange saves each field as it changes.
   *
   * @type {ApplicationConfiguration}
   */
  static DEFAULT_OPTIONS = {
    id: "l5r4-item",
    classes: ["l5r4", "l5r4-item-sheet", "sheet", "item"],
    form: { submitOnChange: true },
    window: { contentClasses: ["standard-form"] },
    actions: {
      "change-tab": L5R4ItemSheet.#onChangeTab,
      "open-emphasis-manager": L5R4ItemSheet.#onOpenEmphasisManager,
      "create-effect": L5R4ItemSheet.#onCreateEffect,
      "edit-effect": L5R4ItemSheet.#onEditEffect,
      "toggle-effect": L5R4ItemSheet.#onToggleEffect,
      "delete-effect": L5R4ItemSheet.#onDeleteEffect,
      ...RULES_EDITOR_ACTIONS
    }
  };

  /**
   * Application template parts configuration.
   *
   * Defines multi-tab sheet structure with separate parts for each tab section.
   * Tabs organize item properties into logical categories:
   * - header: Item image, name, and type
   * - tabs: Tab navigation bar
   * - details: Type-specific properties (ring, cost, mastery, raises, demands, price)
   * - modifiers: Bonuses, rolls, damage (only weapon/armor/skill)
   * - description: Long-form text content and special rules (universal)
   * - effects: Active Effects management (universal)
   *
   * @type {{[part: string]: ApplicationPart}}
   */
  static PARTS = {
    ...(super.PARTS ?? {}),
    header: {
      template: `systems/${SYS_ID}/templates/item/_partials/_header.hbs`
    },
    tabs: {
      template: `systems/${SYS_ID}/templates/item/_partials/_tabs.hbs`
    },
    details: {
      template: `systems/${SYS_ID}/templates/item/_partials/_tab-details.hbs`,
      scrollable: [".tab-content"]
    },
    modifiers: {
      template: `systems/${SYS_ID}/templates/item/_partials/_tab-modifiers.hbs`,
      scrollable: [".tab-content"]
    },
    description: {
      template: `systems/${SYS_ID}/templates/item/_partials/_tab-description.hbs`,
      scrollable: [".tab-content"]
    },
    effects: {
      template: `systems/${SYS_ID}/templates/item/_partials/_tab-effects.hbs`,
      scrollable: [".tab-content"]
    },
    rules: {
      template: `systems/${SYS_ID}/templates/item/_partials/_tab-rules.hbs`,
      scrollable: [".tab-content"]
    }
  };

  /**
   * CSS selectors for scrollable regions within the sheet.
   *
   * Foundry Application v2 uses these to preserve scroll position during re-renders.
   *
   * @type {string[]}
   */
  static SCROLLABLE = [".sheet-content", ".editor"];

  /**
   * The Rules tab's view: a form per rule, or the JSON (module/sheets/rules-editor.js).
   * @type {"form"|"json"}
   */
  rulesMode = "form";

  /**
   * Current active tab ID.
   * Defaults to first available tab (details or description).
   *
   * @type {string}
   */
  #currentTab = "";

  /**
   * Convenience getter for the Item document.
   *
   * Application v2 uses `this.document` for consistency, but `this.item`
   * is more semantically clear for Item sheets.
   *
   * @type {Item}
   * @readonly
   */
  get item() {
    return this.document;
  }

  /**
   * Dynamic sheet title including item name and localized type.
   *
   * Format: "{Item Name} [{Type Label}]"
   * Example: "Katana [Weapon]", "Crab Hands [Advantage]".
   *
   * @type {string}
   * @readonly
   */
  get title() {
    return F("l5r4.ui.sheets.itemTitle", {
      item: this.item?.name || game.i18n.localize("DOCUMENT.Item"),
      type: getTypeLabel(this.item?.type)
    });
  }

  /**
   * Prepare context data for template rendering.
   *
   * Foundry Application v2 lifecycle method called before each render.
   * Performs data transformation, HTML enrichment, and configuration injection.
   *
   * Context Preparation Steps:
   * 1. Deep clone item.system to prevent mutation
   * 2. Ensure string types for HTML fields (description, specialRules, demands, effect)
   * 3. Enrich HTML with Foundry links, secrets, and @UUID references
   * 4. Inject L5R4 config data (rings, traits, sizes, etc.) via prepareItemSheetOptions()
   * 5. Add ActiveEffect collection for effects list rendering
   * 6. For weapons owned by PCs: build skill dropdown from parent actor's skills
   *
   * HTML Enrichment:
   * - Converts [[Roll]] and @UUID syntax to clickable links
   * - Respects permission level for secret visibility
   * - Enrichment is async, so all fields processed in parallel via Promise.all
   *
   * Weapon-Specific Logic:
   * - When weapon is owned by a PC actor, populates skill dropdown
   * - Includes "None" option + all skill names from parent actor
   * - Enables skill association for weapon attacks (e.g., "Kenjutsu", "Kyujutsu")
   *
   * @param {object} context - Base context from parent class
   * @param {ApplicationRenderOptions} options - Render options
   * @returns {Promise<object>} Enhanced context with L5R4 data
   * @override
   */
  async _prepareContext(context, options) {
    context = await super._prepareContext(context, options);

    const item = this.item;
    const system = buildSheetSystem(item);
    const enriched = await formatEnrichedFields(system, { secrets: this.isEditable });

    context.item = item;
    context.system = system;
    context.SYS_ID = SYS_ID;
    context.editable = this.isEditable;
    prepareItemSheetOptions(context);
    context.enriched = enriched;
    // What the item's rules do, and the book page it cites in place of the book's text (roadmap/STAGE-15)
    context.summary = summaryOf(item.system);

    context.effects = this.item.effects?.contents ?? [];
    Object.assign(
      context,
      buildRulesEditorContext(item._source.system.rules, this.rulesMode, this.isEditable)
    );

    Object.assign(context, buildSkillOptions(item));
    // A trained Emphasis with no available entry still gets its checkbox, so a save keeps it (#187)
    context.emphasisOptions = item.type === "skill" ? getSkillEmphases(item.system) : [];
    Object.assign(context, this.#prepareTabs(item.type));

    return context;
  }

  /**
   * Initialize application-specific options on first render.
   *
   * Foundry Application v2 lifecycle method called once during sheet initialization.
   * Configures unique ID, position, and width based on item type.
   *
   * ID Generation:
   * - Format: `l5r4-item-{uuid|id|randomID}`
   * - Uses UUID for uniqueness across worlds, falls back to ID or random
   *
   * Width Configuration:
   * - Reads from WIDTH_BY_TYPE constant (all currently 640px)
   * - Only sets if not explicitly provided in options.
   *
   * @param {ApplicationConfiguration} options - Initial options object
   * @returns {ApplicationConfiguration} Modified options with L5R4 customizations
   * @override
   */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);

    const doc = options.document ?? this.document;
    const uid = doc?.uuid ?? doc?.id ?? foundry.utils.randomID();

    options.id = `l5r4-item-${uid}`;
    options.uniqueId = `item-${uid}`;

    options.position ??= {};
    if (!options.position.width) {
      options.position.width = getSheetWidth(doc?.type ?? "item");
    }

    return options;
  }

  /**
   * Determine which tabs are available for a given item type.
   *
   * Tab structure varies by item type:
   * - Details: Always shown (unless item type has no detail fields like family/clan)
   * - Modifiers: Only for items with mechanical bonuses (weapon, armor, skill)
   * - Description: Always shown
   * - Active Effects: Always shown.
   *
   * @param {string} itemType - Item type (weapon, spell, advantage, etc.)
   * @returns {string[]} Array of available tab IDs
   */
  _getAvailableTabs(itemType) {
    // Items that have modifier/bonus fields
    const hasModifiers = ["weapon", "armor", "skill"].includes(itemType);

    // Items with no Details tab (only description); a School's Details hold its School Rank
    const noDetails = ["family", "clan"].includes(itemType);

    const tabs = [];

    if (!noDetails) {
      tabs.push("details");
    }

    if (hasModifiers) {
      tabs.push("modifiers");
    }

    tabs.push("description");
    tabs.push("effects");
    tabs.push("rules");

    return tabs;
  }

  /**
   * Turn the Rules tab's fields or JSON into `system.rules` (module/sheets/rules-editor.js). Text that does not parse
   * throws, which ApplicationV2 shows as an error notification and saves nothing.
   *
   * @param {SubmitEvent|null} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   * @returns {object}
   * @override
   */
  _processFormData(event, form, formData) {
    return parseRulesForm(
      super._processFormData(event, form, formData),
      this.item._source.system.rules
    );
  }

  /**
   * Post-render lifecycle hook for DOM manipulation.
   *
   * Foundry Application v2 lifecycle method called after HTML is inserted into DOM.
   *
   * @param {object} context - Rendered context data
   * @param {ApplicationRenderOptions} options - Render options
   * @returns {Promise<void>}
   * @override
   */
  async _onRender(context, options) {
    await super._onRender?.(context, options);
    const root = this.element;
    if (!root) {
      return;
    }

    // A tab writes nothing, so a viewer core disabled the form for still changes tabs (components/tabs.md)
    root.querySelectorAll("[data-action='change-tab']").forEach(tab => (tab.disabled = false));
  }

  /**
   * Handle tab change action.
   *
   * Updates the active tab and triggers a re-render to display the new tab content.
   * Foundry Application v2 action handler bound via DEFAULT_OPTIONS.actions.
   *
   * @this {L5R4ItemSheet}
   * @param {Event} event - Click event from tab navigation
   * @param {HTMLElement} element - Clicked tab element with data-tab attribute
   */
  static #onChangeTab(event, element) {
    const tabId = element.dataset.tab;
    if (!tabId) {
      return;
    }

    this.#currentTab = tabId;
    this.render();
  }

  /**
   * Handle manage emphases button click.
   *
   * Opens the EmphasisManager ApplicationV2 dialog for the skill item.
   * Only applicable to skill-type items.
   *
   * Foundry Application v2 action handler bound via DEFAULT_OPTIONS.actions.
   * EmphasisManager handles emphasis selection, custom emphasis addition,
   * and XP tracking for trained emphases.
   *
   * @this {L5R4ItemSheet}
   * @param {Event} _event - Click event from button
   * @param {HTMLElement} _element - Button element with data-action="open-emphasis-manager"
   */
  static async #onOpenEmphasisManager(_event, _element) {
    if (this.item.type !== "skill") {
      console.warn("Emphasis manager only available for skill items");
      return;
    }

    const manager = new EmphasisManagerApplication({ item: this.item });
    await manager.render(true);

    // Wait for dialog to close, then refresh this sheet
    manager.addEventListener("close", () => {
      this.render(false);
    });
  }

  /**
   * Create an Active Effect on the item and open its configuration (ItemEffectsHandler.create).
   *
   * @this {L5R4ItemSheet}
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The create-effect button
   * @returns {Promise<void>}
   */
  static #onCreateEffect(event, element) {
    return ItemEffectsHandler.create({ item: this.item }, event, element);
  }

  /**
   * Open the configuration of the effect in the clicked row (ItemEffectsHandler.openEffectSheet).
   *
   * @this {L5R4ItemSheet}
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The edit-effect button inside the row's [data-effect-id]
   */
  static #onEditEffect(event, element) {
    ItemEffectsHandler.openEffectSheet({ item: this.item }, event, element);
  }

  /**
   * Turn the effect in the clicked row on or off (ItemEffectsHandler.updateEffectDisabled).
   *
   * @this {L5R4ItemSheet}
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The toggle-effect button inside the row's [data-effect-id]
   * @returns {Promise<void>}
   */
  static #onToggleEffect(event, element) {
    return ItemEffectsHandler.updateEffectDisabled({ item: this.item }, event, element);
  }

  /**
   * Remove the effect in the clicked row (ItemEffectsHandler.deleteEffect).
   *
   * @this {L5R4ItemSheet}
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The delete-effect button inside the row's [data-effect-id]
   * @returns {Promise<void>}
   */
  static #onDeleteEffect(event, element) {
    return ItemEffectsHandler.deleteEffect({ item: this.item }, event, element);
  }

  /**
   * The tabs this item type shows, with the open one marked; the open tab falls back to the first when unset or not
   * among them.
   * @param {string} itemType
   * @returns {{tabs: object[], currentTab: string}}
   */
  #prepareTabs(itemType) {
    // Determines which tabs are available for this item type and which is currently active
    const availableTabs = this._getAvailableTabs(itemType);

    // Set default tab to first available if not set
    if (!this.#currentTab || !availableTabs.includes(this.#currentTab)) {
      this.#currentTab = availableTabs[0];
    }

    return {
      tabs: availableTabs.map(tabId => ({
        id: tabId,
        label: game.i18n.localize(`l5r4.ui.tabs.${tabId}`),
        active: tabId === this.#currentTab
      })),
      currentTab: this.#currentTab
    };
  }
}

/**
 * The item's system data for the sheet: a copy with each HTML field as a string, empty when unset.
 * @param {Item} item
 * @returns {object}
 */
function buildSheetSystem(item) {
  const system = foundry.utils.deepClone(item.system ?? {});
  for (const k of HTML_FIELDS) {
    if (system[k] == null) {
      system[k] = "";
    } else if (typeof system[k] !== "string") {
      system[k] = String(system[k]);
    }
  }
  return system;
}

/**
 * Each HTML field enriched with core's links, `@UUID` references, and secrets, all at once.
 * @param {object} system - The sheet's copy of the system data
 * @param {object} options
 * @param {boolean} options.secrets - Show secret blocks: the user can edit the item
 * @returns {Promise<Record<string, string>>} Enriched HTML by field
 */
async function formatEnrichedFields(system, { secrets }) {
  const values = await Promise.all(
    HTML_FIELDS.map(k =>
      TextEditor.enrichHTML(system[k] ?? "", {
        async: true,
        secrets,
        documents: true,
        links: true
      })
    )
  );
  return Object.fromEntries(HTML_FIELDS.map((k, i) => [k, values[i]]));
}

/**
 * A weapon a PC owns lists the PC's skills, after "None", to associate one with the weapon for its attack rolls
 * (Kenjutsu with a katana, Kyujutsu with a yumi); any other item lists none.
 * @param {Item} item
 * @returns {{skillOptions: Record<string, string>, hasCharacterSkills: boolean, isOwnedByCharacter: boolean}}
 */
function buildSkillOptions(item) {
  if (item.type !== "weapon" || item.parent?.type !== "pc") {
    return { hasCharacterSkills: false, isOwnedByCharacter: false, skillOptions: {} };
  }
  const skills = item.parent.items.filter(i => i.type === "skill");
  const skillOptions = {};
  skillOptions[""] = game.i18n.localize("l5r4.ui.common.none");

  for (const skill of skills) {
    skillOptions[skill.name] = skill.name;
  }

  return { skillOptions, hasCharacterSkills: skills.length > 0, isOwnedByCharacter: true };
}

/**
 * Get sheet width for a given item type.
 *
 * @param {string} type - Item type (advantage, weapon, spell, etc.)
 * @returns {number} Width in pixels (defaults to 640 if type not found)
 */
const getSheetWidth = type => WIDTH_BY_TYPE[type] ?? 640;

/**
 * Convert string to title case (first letter of each word capitalized).
 *
 * Used as fallback for localization when i18n key is missing.
 * Handles null/undefined by converting to empty string first.
 *
 * @param {string|null|undefined} str - String to convert
 * @returns {string} Title-cased string
 */
const formatTitleCase = str =>
  String(str ?? "")
    .toLowerCase()
    .replace(/\b[a-z]/g, m => m.toUpperCase());

/**
 * Get localized label for an item type.
 *
 * Attempts to resolve i18n key `TYPES.Item.{type}` from game.i18n.
 * Falls back to title-cased type name if translation not found.
 *
 * @param {string} type - Item type key
 * @returns {string} Localized type label or fallback
 */
const getTypeLabel = type => {
  const key = `TYPES.Item.${type}`;
  return game.i18n.has?.(key) ? game.i18n.localize(key) : formatTitleCase(type);
};
