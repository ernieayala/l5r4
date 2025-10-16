/**
 * L5R4 Item Sheet (Application v2)
 *
 * Foundry VTT v13 item sheet implementation for Legend of the Five Rings 4th Edition items.
 * Handles rendering and user interaction for all item types: weapons, armor, skills, spells,
 * techniques, advantages, disadvantages, and equipment.
 *
 * Responsibilities:
 * - Render item editing forms using type-specific templates
 * - Prepare context data for Handlebars template rendering
 * - Enrich HTML content (description, special rules, effects) with Foundry links and secrets
 * - Configure dynamic sheet dimensions based on item type
 * - Integrate ActiveEffect management via ItemEffectsHandler
 * - For weapons owned by characters: populate skill dropdown from parent actor
 *
 * Architecture:
 * - Extends ItemSheetV2 (Foundry v13 Application v2 pattern)
 * - Uses HandlebarsApplicationMixin for template rendering
 * - Delegates ActiveEffect operations to ItemEffectsHandler
 * - Calls enhanceItemSheetData() to inject L5R4 config (rings, traits, etc.)
 * - Implements submitOnChange for real-time form updates
 *
 * Foundry Integration:
 * - Application v2 lifecycle: _initializeApplicationOptions, _prepareContext, _onRender
 * - Uses TextEditor.enrichHTML for description/rules enrichment
 * - Follows Application v2 event delegation pattern (delegated in handlers)
 * - PARTS defines root form template with type-specific partials
 *
 * @module sheets/item-sheet
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.sheets.ItemSheetV2.html|ItemSheetV2}
 * @see {@link https://foundryvtt.com/article/v13-application/|Application v2 Migration Guide}
 */

import { SYS_ID } from "../config/constants.js";
import { enhanceItemSheetData } from "../documents/item/integration/sheet-data.js";
import { ItemEffectsHandler } from "./handlers/item-effects-handler.js";

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
 * @type {Object<string, number>}
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
 * Get sheet width for a given item type.
 *
 * @param {string} type - Item type (advantage, weapon, spell, etc.)
 * @returns {number} Width in pixels (defaults to 640 if type not found)
 */
const widthFor = type => WIDTH_BY_TYPE[type] ?? 640;

/**
 * Convert string to title case (first letter of each word capitalized).
 *
 * Used as fallback for localization when i18n key is missing.
 * Handles null/undefined by converting to empty string first.
 *
 * @param {string|null|undefined} str - String to convert
 * @returns {string} Title-cased string
 */
const titleCase = str =>
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
const typeLabel = type => {
  const key = `TYPES.Item.${type}`;
  return game.i18n.has?.(key) ? game.i18n.localize(key) : titleCase(type);
};

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
 * - ActiveEffect CRUD operations via ItemEffectsHandler
 *
 * @extends {ItemSheetV2}
 * @mixes HandlebarsApplicationMixin
 */
export default class L5R4ItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  /**
   * Default application configuration.
   *
   * Configures Application v2 options including CSS styles, form behavior,
   * and window properties. submitOnChange enables real-time updates without
   * manual save button.
   *
   * @type {ApplicationConfiguration}
   * @static
   */
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    styles: ["window", "forms", "prosemirror"],
    id: "l5r4-item",
    classes: ["l5r4", "sheet", "item"],
    form: { ...super.DEFAULT_OPTIONS.form, submitOnChange: true },
    window: { ...super.DEFAULT_OPTIONS.window }
  };

  /**
   * Application template parts configuration.
   *
   * Defines the root form template with flexcol layout class.
   * Type-specific item templates are loaded as partials via _scaffold.hbs.
   *
   * @type {Object<string, ApplicationPart>}
   * @static
   */
  static PARTS = {
    ...(super.PARTS ?? {}),
    form: {
      root: true,
      classes: ["flexcol"],
      template: `systems/${SYS_ID}/templates/item/_partials/_scaffold.hbs`
    }
  };

  /**
   * CSS selectors for scrollable regions within the sheet.
   *
   * Foundry Application v2 uses these to preserve scroll position during re-renders.
   *
   * @type {string[]}
   * @static
   */
  static SCROLLABLE = [".sheet-content", ".editor"];

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
   * Example: "Katana [Weapon]", "Crab Hands [Advantage]"
   *
   * @type {string}
   * @readonly
   */
  get title() {
    const name = this.item?.name || game.i18n.localize("DOCUMENT.Item");
    return `${name} [${typeLabel(this.item?.type)}]`;
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
   * - Only sets if not explicitly provided in options
   *
   * @param {ApplicationConfiguration} options - Initial options object
   * @returns {ApplicationConfiguration} Modified options with L5R4 customizations
   * @override
   * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html#_initializeApplicationOptions|ApplicationV2._initializeApplicationOptions}
   */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);

    const doc = options.document ?? this.document;
    const uid = doc?.uuid ?? doc?.id ?? foundry.utils.randomID();

    options.id = `l5r4-item-${uid}`;
    options.uniqueId = `item-${uid}`;

    options.position ??= {};
    if (!options.position.width) {
      options.position.width = widthFor(doc?.type ?? "item");
    }

    return options;
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
   * 4. Inject L5R4 config data (rings, traits, sizes, etc.) via enhanceItemSheetData()
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
   * @param {Object} context - Base context from parent class
   * @param {ApplicationRenderOptions} options - Render options
   * @returns {Promise<Object>} Enhanced context with L5R4 data
   * @override
   * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html#_prepareContext|ApplicationV2._prepareContext}
   */
  async _prepareContext(context, options) {
    context = await super._prepareContext(context, options);

    const item = this.item;
    const system = foundry.utils.deepClone(item.system ?? {});

    const ensureStr = k => {
      if (system[k] == null) {
        system[k] = "";
      } else if (typeof system[k] !== "string") {
        system[k] = String(system[k]);
      }
    };

    for (const k of ["description", "specialRules", "demands", "effect"]) {
      ensureStr(k);
    }

    const enrich = html =>
      TextEditor.enrichHTML(html ?? "", {
        async: true,
        secrets: this.isEditable,
        documents: true,
        links: true
      });

    const keys = ["description", "specialRules", "demands", "effect"];
    const values = await Promise.all(keys.map(k => enrich(system[k])));
    const enriched = Object.fromEntries(keys.map((k, i) => [k, values[i]]));

    context.item = item;
    context.system = system;
    context.SYS_ID = SYS_ID;
    context.editable = this.isEditable;
    enhanceItemSheetData(context);
    context.enriched = enriched;

    context.effects = this.item.effects?.contents ?? [];

    // Weapon skill integration: When weapon is owned by a PC, populate skill dropdown
    // from parent actor's skill items. This enables players to associate specific skills
    // with weapons for roll automation (e.g., Kenjutsu with katana, Kyujutsu with yumi).
    if (item.type === "weapon" && item.parent?.type === "pc") {
      const actor = item.parent;
      const skills = actor.items.filter(i => i.type === "skill");
      context.skillOptions = {};
      context.skillOptions[""] = game.i18n.localize("l5r4.ui.common.none");

      for (const skill of skills) {
        context.skillOptions[skill.name] = skill.name;
      }

      context.hasCharacterSkills = skills.length > 0;
      context.isOwnedByCharacter = true;
    } else {
      context.hasCharacterSkills = false;
      context.isOwnedByCharacter = false;
      context.skillOptions = {};
    }

    return context;
  }

  /**
   * Post-render lifecycle hook for DOM manipulation and event binding.
   *
   * Foundry Application v2 lifecycle method called after HTML is inserted into DOM.
   * Delegates ActiveEffect UI operations to ItemEffectsHandler for event delegation.
   *
   * ItemEffectsHandler binds delegated click handlers for:
   * - .effect-create: Create new effect and open config
   * - .effect-edit: Open effect configuration sheet
   * - .effect-toggle: Enable/disable effect
   * - .effect-delete: Remove effect from item
   *
   * @param {Object} context - Rendered context data
   * @param {ApplicationRenderOptions} options - Render options
   * @returns {Promise<void>}
   * @override
   * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html#_onRender|ApplicationV2._onRender}
   */
  async _onRender(context, options) {
    await super._onRender?.(context, options);
    const root = this.element;
    if (!root) {
      return;
    }

    ItemEffectsHandler.bind({ item: this.item, element: root });
  }
}
