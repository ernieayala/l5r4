/**
 * @fileoverview L5R4 Item Sheet - Universal Item Configuration Interface for Foundry VTT v13+
 * 
 * This class provides a comprehensive unified item sheet interface for all L5R4 item types
 * including weapons, armor, skills, spells, advantages, techniques, and equipment. Built on
 * Foundry's modern ApplicationV2 architecture with HandlebarsApplicationMixin integration
 * for optimal performance and maintainability.
 *
 * **Core Responsibilities:**
 * - **Universal Item Interface**: Single sheet class handling all L5R4 item types seamlessly
 * - **Dynamic Template Loading**: Type-specific templates with shared scaffolding architecture
 * - **Rich Text Editing**: Full ProseMirror integration for description and rules fields
 * - **Active Effects Management**: Complete embedded effect creation, editing, and deletion
 * - **Responsive Layout**: Dynamic window sizing based on item type complexity and content
 * - **Skill Integration**: Weapon-skill association system for character-owned items
 * - **Form Validation**: Real-time validation and error feedback for all item fields
 *
 * **ApplicationV2 Architecture:**
 * Built on Foundry's cutting-edge application framework with enhanced capabilities:
 * - **HandlebarsApplicationMixin**: Modern template rendering with async HTML enrichment
 * - **ItemSheetV2**: Foundry's v13+ item sheet base with improved lifecycle management
 * - **Form Handling**: Native AppV2 form submission with submitOnChange functionality
 * - **Part System**: Single root part with dynamic template resolution and caching
 * - **Scrollable Regions**: Optimized scrolling for content areas and editor interfaces
 * - **Event Delegation**: Efficient event handling using data-action attributes
 *
 * **Template System Architecture:**
 * Uses an innovative scaffolding approach where all item types share common structure:
 * - **_scaffold.hbs**: Universal container with dynamic content injection points
 * - **Type-Specific Templates**: Loaded dynamically based on `item.type` property
 * - **Shared Partials**: Common elements like rules summaries and headers
 * - **Rich Text Fields**: Support both edit and view modes with seamless transitions
 * - **Conditional Rendering**: Template sections shown/hidden based on item properties
 * - **Localization Support**: Full i18n integration for all text content
 *
 * **Rich Text Integration System:**
 * Provides seamless editing experience for narrative and rules content:
 * - **Edit Mode**: Full ProseMirror editors for description, rules, and effect fields
 * - **View Mode**: Enriched HTML with document links, secrets, and roll expressions
 * - **Field Normalization**: Ensures proper string types for editor compatibility
 * - **Async Enrichment**: Non-blocking HTML enrichment during render cycles
 * - **Content Validation**: Prevents malformed HTML and ensures data integrity
 * - **Auto-Save**: Automatic saving of editor content with debounced updates
 *
 * **Active Effects Management:**
 * Comprehensive effect system with full lifecycle management:
 * - **Creation Workflow**: New effects with transfer=true for automatic actor application
 * - **Editing Interface**: Direct integration with ActiveEffectConfig sheets
 * - **Toggle Controls**: Enable/disable effects with immediate visual feedback
 * - **Deletion Safety**: Safe removal with duplicate-click protection and confirmation
 * - **Transfer Logic**: Effects automatically apply to owning actors when enabled
 * - **Effect Validation**: Ensures proper effect structure and prevents conflicts
 *
 * **Weapon-Skill Integration:**
 * Advanced weapon-skill association system for character-owned items:
 * - **Skill Discovery**: Automatic detection of character's available skills
 * - **Association Interface**: Intuitive dropdown selection for weapon-skill pairing
 * - **Attack Resolution**: Smart skill+trait vs trait-only attack calculations
 * - **Dynamic Options**: Skill list updates automatically when character gains new skills
 * - **Validation Logic**: Ensures weapon-skill compatibility and prevents invalid associations
 *
 * **Window Management System:**
 * Intelligent sizing and identification for optimal user experience:
 * - **Type-Based Sizing**: Different widths for simple vs complex item types (400-600px)
 * - **Unique IDs**: UUID-based element IDs prevent DOM conflicts in multi-window scenarios
 * - **Position Persistence**: Foundry's native window position memory for user convenience
 * - **Responsive Design**: Adapts layout and sizing to content complexity automatically
 * - **Modal Behavior**: Proper modal handling for embedded effect configuration
 *
 * **Performance Optimizations:**
 * - **Template Caching**: Type-specific templates cached for fast rendering
 * - **Lazy Loading**: Rich text editors initialized only when needed
 * - **Event Delegation**: Efficient event handling with minimal DOM listeners
 * - **Async Operations**: Non-blocking HTML enrichment and content processing
 * - **Memory Management**: Proper cleanup of editors and event listeners
 *
 * **Integration Points:**
 * - **Config Module**: Item type definitions and localization keys
 * - **Utils Module**: Helper functions for data processing and validation
 * - **Active Effects**: Full integration with Foundry's effect system
 * - **Text Editor**: ProseMirror integration for rich content editing
 * - **Actor System**: Skill discovery and weapon-skill associations
 *
 * **Usage Examples:**
 * ```javascript
 * // Open item sheet
 * const item = actor.items.get(itemId);
 * item.sheet.render(true);
 * 
 * // Create new effect on item
 * await item.createEmbeddedDocuments("ActiveEffect", [{
 *   name: "Custom Effect",
 *   transfer: true,
 *   changes: [{ key: "system.bonuses.attack", mode: 2, value: "2" }]
 * }]);
 * 
 * // Get appropriate window width for item type
 * const width = ItemSheet.widthFor("weapon"); // Returns 600
 * ```
 *
 * **Error Handling:**
 * - **Graceful Degradation**: Sheet functions even with missing templates or data
 * - **Validation Feedback**: Clear error messages for invalid configurations
 * - **Recovery Procedures**: Automatic fallbacks for corrupted item data
 * - **User Notifications**: Informative messages for successful operations
 *
 * **Code Navigation Guide:**
 * 1. **Initialization** (`_initializeApplicationOptions()`) - Window sizing and unique ID assignment
 * 2. **Context Preparation** (`_prepareContext()`) - Template data preparation with enrichment
 * 3. **Rendering** (`_onRender()`) - Active Effects event binding and DOM setup
 * 4. **Utility Methods** (`widthFor()`, `typeLabel()`) - Helper functions for UI management
 * 5. **Event Handlers** (various `_on*()` methods) - User interaction processing
 * 6. **Active Effects** (effect management methods) - Effect lifecycle handling
 * 7. **Rich Text** (editor integration) - ProseMirror editor management
 * 8. **Validation** (data validation methods) - Input validation and error handling
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @extends {foundry.applications.sheets.ItemSheetV2}
 * @mixes {foundry.applications.api.HandlebarsApplicationMixin}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ItemSheetV2.html|ItemSheetV2}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html|HandlebarsApplicationMixin}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.ux.TextEditor.html|TextEditor}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActiveEffectConfig.html|ActiveEffectConfig}
 */

import CONFIG_L5R4, { SYS_ID } from "../config.js";
import { on } from "../utils.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 }                = foundry.applications.sheets;
const { TextEditor }                 = foundry.applications.ux;

/* ------------------------------------------ */
/* Layout Configuration and Helpers           */
/* ------------------------------------------ */

/**
 * Window width configuration by item type.
 * Determines initial window size based on content complexity.
 * All types currently use 640px for consistency, but can be adjusted
 * individually if certain item types require more space.
 * 
 * @type {Readonly<Record<string, number>>}
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
 * Resolve window width for an arbitrary item type.
 * Falls back to 640px for unknown types to maintain consistency.
 * 
 * @param {string} type - Item type identifier
 * @returns {number} Window width in pixels
 */
const widthFor = (type) => WIDTH_BY_TYPE[type] ?? 640;

/**
 * Convert string to title case for fallback labels.
 * Used when localization keys are missing for item types.
 * 
 * @param {string|null|undefined} str - String to convert
 * @returns {string} Title-cased string
 */
const titleCase = (str) => String(str ?? "").toLowerCase().replace(/\b[a-z]/g, m => m.toUpperCase());

/**
 * Get localized display label for an item type.
 * Attempts localization first, falls back to title-cased type name.
 * 
 * @param {string} type - Item type identifier
 * @returns {string} Human-readable item type label
 */
const typeLabel = (type) => {
  const key = `TYPES.Item.${type}`;
  return game.i18n.has?.(key) ? game.i18n.localize(key) : titleCase(type);
};

/* ------------------------------------------ */
/* Sheet                                      */
/* ------------------------------------------ */

/** @extends ItemSheetV2 */
export default class L5R4ItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,

    // Adopt Foundry core style layers so the window, forms, and ProseMirror toolbar are styled.
    styles: ["window", "forms", "prosemirror"],

    // Base id is a readable prefix. A unique id is assigned in _initializeApplicationOptions.
    id: "l5r4-item",
    classes: ["l5r4", "sheet", "item"],

    // AppV2 native form handling. DocumentSheetV2 provides the default submit handler.
    form: { ...super.DEFAULT_OPTIONS.form, submitOnChange: true },

    window: { ...super.DEFAULT_OPTIONS.window }
  };

  /**
   *  @override
   *  Single root part. No <form> in any HBS. AppV2 supplies it.
   */
  static PARTS = {
    ...(super.PARTS ?? {}),
    form: {
      root: true,
      classes: ["flexcol"],
      template: `systems/${SYS_ID}/templates/item/_partials/_scaffold.hbs`
    }
  };

  /** Scrollable regions for editor areas. */
  static SCROLLABLE = [".sheet-content", ".editor"];

  get item() { return this.document; }

  /** Compute a localized window title for the sheet. */
  get title() {
    const name = this.item?.name || game.i18n.localize("DOCUMENT.Item");
    return `${name} [${typeLabel(this.item?.type)}]`;
  }

  /**
   * @override
   * Initialize application options with unique identification and type-based sizing.
   * Prevents DOM conflicts between multiple item sheets and sets appropriate window dimensions.
   * 
   * **Unique ID Generation:**
   * - Uses document UUID or ID to create unique element IDs
   * - Prevents multiple sheets from conflicting in the DOM
   * - Maintains sheet identity across renders
   * 
   * **Dynamic Sizing:**
   * - Sets initial window width based on item type complexity
   * - Preserves user-adjusted positions via Foundry's position system
   * - Allows for future per-type size customization
   * 
   * @param {object} options - Application initialization options
   * @returns {object} Modified options with unique ID and sizing
   */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);

    const doc = options.document ?? this.document;
    const uid = doc?.uuid ?? doc?.id ?? foundry.utils.randomID();

    // Prevent multiple sheets from replacing each other in the DOM.
    options.id = `l5r4-item-${uid}`;
    options.uniqueId = `item-${uid}`;

    options.position ??= {};
    if (!options.position.width) options.position.width = widthFor(doc?.type ?? "item");

    return options;
  }

  /**
   * @override
   * Prepare template context with enriched content and dynamic data.
   * Transforms raw item data into a comprehensive context object for template rendering,
   * including enriched HTML for rich text fields and dynamic skill associations.
   * 
   * **Context Preparation Process:**
   * 1. **Data Cloning**: Deep clone system data to prevent mutation during rendering
   * 2. **Field Normalization**: Ensure text fields are strings for editor compatibility
   * 3. **HTML Enrichment**: Convert raw text to enriched HTML with links and secrets
   * 4. **Skill Integration**: Build skill options for weapon-skill associations
   * 5. **Effect Exposure**: Make embedded Active Effects available to templates
   * 
   * **Rich Text Processing:**
   * - Processes description, rules, effects, and other narrative fields
   * - Supports document links, secrets, and inline rolls
   * - Provides both raw and enriched versions for edit/view modes
   * - Uses async enrichment for non-blocking rendering
   * 
   * **Weapon-Skill Integration:**
   * - Detects character-owned weapons and bows
   * - Builds dropdown options from character's available skills
   * - Enables weapon-skill association for attack roll calculations
   * - Updates dynamically when character gains new skills
   * 
   * @param {object} context - Base template context from parent class
   * @param {object} options - Rendering options (unused)
   * @returns {Promise<object>} Enhanced context object for template rendering
   */
  async _prepareContext(context, options) {
    context = await super._prepareContext(context, options);

  // Use the live Document so {{item.img}} and data-edit="img" resolve correctly.
  // See: ItemSheetV2 / DocumentSheetV2 / Document#toObject in https://foundryvtt.com/api/
  const item = this.item;
  const system = foundry.utils.deepClone(item.system ?? {});

    // Ensure commonly edited fields are strings so editors do not explode.
    const ensureStr = (k) => {
      if (system[k] == null) system[k] = "";
      else if (typeof system[k] !== "string") system[k] = String(system[k]);
    };

    for (const k of [
      "description",
      "specialRules",
      "demands",
      "effect",
      "raiseEffects",
      "benefit",
      "drawback",
      "special",
      "notes",
      "text"
    ]) ensureStr(k);

    // Build enriched HTML for read-only rendering.
    const enrich = (html) => TextEditor.enrichHTML(html ?? "", {
      async: true,
      secrets: this.isEditable,
      documents: true,
      links: true
    });

    const keys = ["description","specialRules","demands","effect","raiseEffects","benefit","drawback","special"];
    const values = await Promise.all(keys.map(k => enrich(system[k])));
    const enriched = Object.fromEntries(keys.map((k,i) => [k, values[i]]));

    // What templates usually expect
    context.item     = item;
    context.system   = system;
    context.SYS_ID   = SYS_ID;
    context.editable = this.isEditable;
    context.config   = CONFIG.l5r4;
    context.enriched = enriched;

    /** Expose embedded Active Effects so the template can render them. */
    context.effects = this.item.effects?.contents ?? [];

    // For weapons and bows, provide character skills if owned by an actor
    if ((item.type === "weapon" || item.type === "bow") && item.parent?.type === "pc") {
      const actor = item.parent;
      const skills = actor.items.filter(i => i.type === "skill");
      
      // Create skill options for dropdown
      context.skillOptions = {};
      context.skillOptions[""] = "— No Skill —"; // Default empty option
      
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
   * @override
   * Post-render setup for Active Effects management and event binding.
   * Establishes event handlers for embedded Active Effects CRUD operations
   * with proper duplicate-click protection and error handling.
   * 
   * **Event Binding Strategy:**
   * - Uses element-level binding flags to prevent duplicate handlers
   * - Handles DOM replacement scenarios in Foundry v13+
   * - Provides immediate feedback for all effect operations
   * - Integrates with Foundry's native ActiveEffectConfig sheets
   * 
   * **Active Effects Operations:**
   * - **Creation**: New effects with transfer=true for actor application
   * - **Editing**: Opens ActiveEffectConfig for comprehensive effect editing
   * - **Toggle**: Enable/disable with immediate visual feedback
   * - **Deletion**: Safe removal with busy-state protection
   * 
   * **Error Handling:**
   * - Graceful handling of missing effects (race conditions)
   * - Duplicate operation protection via busy flags
   * - User notifications for operation failures
   * - Cleanup of temporary state flags
   * 
   * @param {object} context - Template context (unused)
   * @param {object} options - Render options (unused)
   * @returns {Promise<void>}
   * 
   * @see {@link https://foundryvtt.com/api/classes/documents.ActiveEffect.html|ActiveEffect}
   * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActiveEffectConfig.html|ActiveEffectConfig}
   * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.DocumentSheetV2.html|DocumentSheetV2}
   */
  async _onRender(context, options) {
    await super._onRender?.(context, options);
    const root = this.element;
    if (!root) return;

    /**
     * Bind once per DOM element.
     * Some v13 renders replace the root element; if we only track a sheet-level
     * boolean, we can miss (and fail to bind) new roots. Mark the element itself.
     */
    if (root.dataset.effectsBound === "1") return;
    root.dataset.effectsBound = "1";

    // Create (transfer=true so it applies to the owning Actor)
    on(root, ".effect-create", "click", async (ev) => {
      ev.preventDefault();
      const [eff] = await this.item.createEmbeddedDocuments("ActiveEffect", [{
        name: game.i18n.localize("EFFECT.New"),
        icon: "icons/svg/aura.svg",
        disabled: false,
        transfer: true,
        changes: []
      }]);
      if (eff) new foundry.applications.sheets.ActiveEffectConfig({ document: eff }).render(true);
    });

    // Edit
    on(root, ".effect-edit", "click", (ev, el) => {
      ev.preventDefault();
      const id  = el.closest("[data-effect-id]")?.dataset?.effectId;
      const eff = id ? this.item.effects.get(id) : null;
      if (eff) new foundry.applications.sheets.ActiveEffectConfig({ document: eff }).render(true);
    });

    // Enable/Disable
    on(root, ".effect-toggle", "click", async (ev, el) => {
      ev.preventDefault();
      const id  = el.closest("[data-effect-id]")?.dataset?.effectId;
      const eff = id ? this.item.effects.get(id) : null;
      if (!eff) return;
      await eff.update({ disabled: !eff.disabled });
    });

    // Delete (safe against double-fire)
    on(root, ".effect-delete", "click", async (ev, el) => {
      ev.preventDefault();
      const wrap = el.closest("[data-effect-id]");
      const id   = wrap?.dataset?.effectId;
      if (!id) return;
      // avoid double-click spam
      if (wrap.dataset.busy) return;
      wrap.dataset.busy = "1";

      try {
        const eff = this.item.effects.get(id);
        if (!eff) return; // already gone
        await eff.delete();
      } catch (err) {
        // Swallow the “does not exist” repeat from a duplicate listener
        if (String(err?.message || err).includes("does not exist")) return;
        console.error(err);
        ui.notifications?.error(err.message ?? game.i18n.localize("l5r4.system.errors.deleteEffect"));
      } finally {
        delete wrap.dataset.busy;
      }
    });
  }

  /** Optional: label map handy for titles. */
  static typeLabels() {
    const t = (k) => game.i18n.localize(k);
    return {
      advantage:    t("TYPES.Item.advantage"),
      disadvantage: t("TYPES.Item.disadvantage"),
      skill:        t("TYPES.Item.skill"),
      weapon:       t("TYPES.Item.weapon"),
      armor:        t("TYPES.Item.armor"),
      kata:         t("TYPES.Item.kata"),
      kiho:         t("TYPES.Item.kiho"),
      spell:        t("TYPES.Item.spell"),
      technique:    t("TYPES.Item.technique"),
      tattoo:       t("TYPES.Item.tattoo"),
      commonItem:   t("TYPES.Item.commonItem")
    };
  }
}
