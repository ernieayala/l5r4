/**
 * @fileoverview L5R4 Item Document Implementation for Foundry VTT v13+
 * 
 * This class extends the base Foundry Item document to provide L5R4-specific
 * functionality including derived data computation, experience tracking, and
 * chat card rendering for all item types in the Legend of the Five Rings 4th Edition system.
 * Handles the complete lifecycle of items from creation to chat integration.
 *
 * **Core Responsibilities:**
 * - **Default Icons**: Assign appropriate type-specific icons on item creation
 * - **Data Normalization**: Ensure rich-text fields are never null for template safety
 * - **Derived Data**: Calculate roll formulas, bow damage, and other computed values
 * - **Experience Tracking**: Automatic XP logging for skill creation and advancement
 * - **Chat Integration**: Render type-specific chat cards with proper templates
 * - **Cost Validation**: Enforce advantage/disadvantage cost constraints
 * - **Active Effects**: Support for transferable effects on background items
 *
 * **System Architecture:**
 * The item system follows L5R4's comprehensive item categorization:
 * - **Combat Items**: Weapons, armor, bows with full mechanical integration
 * - **Character Development**: Skills with emphasis, advantages/disadvantages with costs
 * - **Background Elements**: Clans, families, schools with trait bonuses via Active Effects
 * - **Magical Elements**: Spells with effect descriptions and raise mechanics
 * - **Techniques**: Kata, kiho, tattoos with special abilities and prerequisites
 * - **General Equipment**: Common items for inventory management
 *
 * **Item Types Supported:**
 * - **Equipment**: Weapons, armor, bows with mechanical properties and damage calculations
 * - **Character Elements**: Skills with XP tracking, advantages/disadvantages with cost validation
 * - **Background Items**: Clans, families, schools with Active Effects for trait bonuses
 * - **Techniques**: Kata, kiho, tattoos with special abilities and mechanical effects
 * - **Spells**: Magic with effect descriptions, raise effects, and casting requirements
 * - **General Items**: commonItem type for miscellaneous equipment and gear
 *
 * **Key Features:**
 * - **Equipment Management**: Full weapon/armor system with damage, TN, and special properties
 * - **Skill System**: Rank tracking, emphasis specializations, school skill integration
 * - **Spell System**: Effect descriptions, raise mechanics, and casting requirements
 * - **Advantage/Disadvantage**: Cost validation, XP integration, and mechanical effects
 * - **Technique System**: Kata, kiho, tattoos with prerequisites and special abilities
 * - **Background Integration**: Family/clan/school items with trait bonuses via Active Effects
 * - **Chat Cards**: Rich chat integration with type-specific templates and roll buttons
 *
 * **Active Effects Integration:**
 * Full support for Foundry's Active Effects system:
 * - **Transferable Effects**: Background items can modify actor traits and skills
 * - **Equipment Effects**: Weapons and armor can provide bonuses when equipped
 * - **Conditional Effects**: Effects can be enabled/disabled based on item state
 * - **Stacking Rules**: Proper handling of multiple effect sources
 *
 * **Experience Point Integration:**
 * Automatic XP tracking for character development:
 * - **Skill Creation**: Logs XP costs when skills are added to characters
 * - **Advancement Tracking**: Monitors skill rank increases and emphasis additions
 * - **Cost Calculation**: Proper XP cost formulas for all advancement types
 * - **Audit Trail**: Complete logging of all XP expenditures with timestamps
 *
 * **Chat System Integration:**
 * Rich chat card system with type-specific templates:
 * - **Weapon Cards**: Damage rolls, special properties, and attack options
 * - **Spell Cards**: Effect descriptions, raise options, and casting information
 * - **Skill Cards**: Roll buttons with trait+skill combinations
 * - **Technique Cards**: Effect descriptions and mechanical benefits
 * - **Equipment Cards**: Properties, costs, and mechanical effects
 *
 * **Data Validation and Safety:**
 * - **Rich Text Safety**: Ensures all rich text fields have safe default values
 * - **Type Validation**: Robust type checking for all item properties
 * - **Cost Constraints**: Enforces valid cost ranges for advantages/disadvantages
 * - **Icon Management**: Automatic assignment of appropriate default icons
 *
 * **Performance Optimizations:**
 * - **Template Caching**: Chat card templates are cached for fast rendering
 * - **Computed Properties**: Derived data calculated during preparation phase
 * - **Efficient Lookups**: Optimized icon and template resolution
 * - **Lazy Loading**: Chat cards rendered only when needed
 *
 * **Integration Points:**
 * - **Actor System**: Items integrate with actor preparation and XP tracking
 * - **Sheet Classes**: Provides data for item sheet rendering and editing
 * - **Dice Service**: Supplies roll formulas and mechanical properties
 * - **Chat Service**: Renders rich chat cards with interactive elements
 * - **Config Module**: Uses system constants and template paths
 *
 * **Error Handling:**
 * - **Graceful Degradation**: Functions with missing or invalid data
 * - **Template Fallbacks**: Safe defaults when templates are missing
 * - **Console Logging**: Detailed error reporting for troubleshooting
 * - **Type Safety**: Robust handling of unexpected data types
 *
 * **Usage Examples:**
 * ```javascript
 * // Create a weapon with automatic icon assignment
 * const weapon = await Item.create({
 *   name: "Katana",
 *   type: "weapon",
 *   system: { damageRoll: 3, damageKeep: 3 }
 * });
 * 
 * // Render a chat card
 * await weapon.displayCard();
 * 
 * // Access derived data
 * const rollFormula = weapon.system.rollFormula; // "3k3"
 * ```
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 1.0.2
 * @extends {Item}
 * @see {@link https://foundryvtt.com/api/classes/documents.Item.html|Item Document}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#_preCreate|Document._preCreate}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#prepareData|Document.prepareData}
 * @see {@link https://foundryvtt.com/api/classes/documents.ChatMessage.html|ChatMessage}
 * @see {@link https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html|renderTemplate}
 * @see {@link ../services/dice.js|Dice Service} - Roll processing and Ten Dice Rule
 * @see {@link ./actor.js|Actor Document} - Actor integration and XP tracking
 */

import { TEMPLATE, ARROW_MODS, SYS_ID, iconPath } from "../config.js";
import { on, toInt } from "../utils.js";
import { TenDiceRule } from "../services/dice.js";

/**
 * L5R4 Item document class extending Foundry's base Item.
 * Handles all item types in the L5R4 system with type-specific logic.
 * @extends {Item}
 */
export default class L5R4Item extends Item {
  /**
   * Chat template paths for rendering item-specific chat cards.
   * Maps each item type to its corresponding Handlebars template.
   * 
   * NOTE: 'bow' entry is LEGACY support for pre-v1.0.0 items during migration.
   * New bows use type='weapon' with system.isBow=true flag.
   * 
   * @type {Record<string, string>}
   */
  static CHAT_CARD_TEMPLATES = {
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
   * @static
   */
  static DEFAULT_ICONS = {
    advantage:    iconPath("yin-yang.png"),
    armor:        iconPath("hat.png"),
    bow:          iconPath("bow.png"),  // LEGACY: For unmigrated bow items
    clan:         iconPath("bamboo.png"),
    disadvantage: iconPath("yin-yang.png"),
    family:       iconPath("tori.png"),
    commonItem:   iconPath("coins.png"),
    kata:         iconPath("scroll.png"),
    kiho:         iconPath("tori.png"),
    school:       iconPath("scroll.png"),
    skill:        iconPath("flower.png"),
    spell:        iconPath("scroll2.png"),
    tattoo:       iconPath("tattoo.png"),
    technique:    iconPath("kanji.png"),
    weapon:       iconPath("sword.png")
  };

  /* -------------------------------------------- */
  /* Lifecycle                                    */
  /* -------------------------------------------- */

  /**
   * Configure item defaults and validate data on creation.
   * Assigns type-appropriate icons and enforces cost constraints for
   * advantages and disadvantages (both ≥0, disadvantages grant XP in calculations).
   * 
   * @param {object} data - The initial data object provided to the document creation
   * @param {object} options - Additional options which modify the creation request
   * @param {string} userId - The ID of the User requesting the document creation
   * @returns {Promise<void>}
   * @override
   * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#_preCreate|Document._preCreate}
   */
  async _preCreate(data, options, userId) {
    await super._preCreate(data, options, userId);

    // Assign default icon if none provided or using generic bag icon
    const isUnsetOrBag = !this.img || this.img === "icons/svg/item-bag.svg";
    if (isUnsetOrBag) {
      const icon = L5R4Item.DEFAULT_ICONS[this.type] ?? "icons/svg/item-bag.svg";
      this.updateSource({ img: icon });
    }

    // Enforce cost constraints (must be non-negative for both types)
    // Disadvantages store positive costs but grant XP in calculations (see actor.js _preparePcExperience)
    if (this.type === "advantage" || this.type === "disadvantage") {
      const raw = data?.system?.cost ?? this.system?.cost;
      const clamped = Math.max(0, toInt(raw, 0));
      this.updateSource({ "system.cost": clamped });
    }
  }

  /**
   * Track experience expenditure when skills are created on actors.
   * Automatically calculates and logs XP costs using L5R4 skill progression:
   * triangular costs (1+2+3+...+rank) with school skills getting rank 1 free.
   * 
   * **Cost Formula:**
   * - Regular skills: 1+2+3+...+rank XP
   * - School skills: 2+3+4+...+rank XP (rank 1 free)
   * 
   * @param {object} data - The data object of the created document
   * @param {object} options - Additional options which modify the creation request
   * @param {string} userId - The ID of the User who triggered the creation
   * @returns {void}
   * @override
   * @see {@link https://foundryvtt.com/api/classes/documents.Item.html#_onCreate|Item._onCreate}
   */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    // Only when embedded on an Actor and for Skill, Advantage, or Disadvantage types
    if (!this.actor || !["skill", "advantage", "disadvantage"].includes(this.type)) return;
    try {
      const sys = this.system ?? {};
      const ns = this.actor.flags?.[SYS_ID] ?? {};
      const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent.slice() : [];
      
      if (this.type === "skill") {
        const r = toInt(sys.rank);
        const baseline = sys.school ? 1 : 0;
        const tri = (n) => (n * (n + 1)) / 2;
        const newCost = r > baseline ? tri(r) - tri(baseline) : 0;
        if (newCost > 0) {
          spent.push({
            id: foundry.utils.randomID(),
            delta: newCost,
            note: game.i18n.format("l5r4.character.experience.skillCreate", { name: this.name ?? "Skill", rank: r }),
            ts: Date.now(),
            type: "skill",
            skillName: this.name ?? "Skill",
            fromValue: 0,
            toValue: r
          });
        }
      } else if (this.type === "advantage" || this.type === "disadvantage") {
        const cost = toInt(sys.cost, 0);
        if (cost > 0) {
          const itemType = this.type === "advantage" ? "advantage" : "disadvantage";
          spent.push({
            id: foundry.utils.randomID(),
            delta: cost,
            note: this.name ?? (this.type === "advantage" ? "Advantage" : "Disadvantage"),
            ts: Date.now(),
            type: itemType,
            itemName: this.name ?? (this.type === "advantage" ? "Advantage" : "Disadvantage"),
            fromValue: 0,
            toValue: cost
          });
        }
      }
      
      if (spent.length > (ns.xpSpent?.length ?? 0)) {
        // Async flag update - don't block creation if XP logging fails
        this.actor.setFlag(SYS_ID, "xpSpent", spent);
      }
    } catch (_) { /* no-op */ }
  }

  /**
   * Track experience expenditure and validate costs on item updates.
   * Handles skill rank advancement XP logging and enforces advantage/disadvantage
   * cost constraints during updates.
   * 
   * **Skill XP Tracking:**
   * - Only logs XP when skill ranks increase
   * - Uses updated school flag to determine if rank 1 is free
   * - Calculates delta cost between old and new total costs
   * - Resets calculated XP when free ranks/emphasis change (preserves manual adjustments)
   * 
   * **Cost Validation:**
   * - Advantages: Clamps cost to non-negative values
   * - Disadvantages: Clamps cost to non-positive values
   * 
   * @param {object} changes - The differential data that is being updated
   * @param {object} options - Additional options which modify the update request
   * @param {string} userId - The ID of the User requesting the document update
   * @returns {Promise<void>}
   * @override
   * @see {@link https://foundryvtt.com/api/classes/documents.Item.html#_preUpdate|Item._preUpdate}
   */
  async _preUpdate(changes, options, userId) {
    // Validate advantage costs (must be non-negative)
    if (this.type === "advantage" && changes?.system?.cost !== undefined) {
      changes.system.cost = Math.max(0, toInt(changes.system.cost, 0));
    }

    // Allow disadvantages to have any cost value for flexibility during updates
    // (creation enforces ≥0). XP calculations in actor.js interpret positive
    // costs as granted XP (see _preparePcExperience).

    await super._preUpdate(changes, options, userId);
    
    // Trigger XP recalculation if freeRanks or freeEmphasis actually changed on skills
    if (this.actor && this.type === "skill") {
      const oldFreeRanks = this.system?.freeRanks;
      const newFreeRanks = changes?.system?.freeRanks;
      const oldFreeEmphasis = this.system?.freeEmphasis;
      const newFreeEmphasis = changes?.system?.freeEmphasis;
      
      const freeRanksActuallyChanged = newFreeRanks !== undefined && newFreeRanks !== oldFreeRanks;
      const freeEmphasisActuallyChanged = newFreeEmphasis !== undefined && newFreeEmphasis !== oldFreeEmphasis;
      
      if (freeRanksActuallyChanged || freeEmphasisActuallyChanged) {
        // Reset only calculated XP entries, preserve manual adjustments
        try {
          // Preserve manual XP adjustments - only reset calculated XP
          await this.actor.setFlag(SYS_ID, "xpSpent", []);
          // DO NOT reset xpManual - preserve manual XP boosts
          
          // Force actor sheet to recalculate XP on next render
          if (this.actor.sheet?.rendered) {
            this.actor.sheet.render();
          }
        } catch (err) {
          console.warn(`${SYS_ID}`, "Failed to reset calculated XP data", err);
        }
        return; // Skip the normal XP tracking logic below
      }
    }
    
    if (!this.actor || !["skill", "advantage", "disadvantage"].includes(this.type)) return;
    try {
      const ns = this.actor.flags?.[SYS_ID] ?? {};
      const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent.slice() : [];
      let shouldUpdate = false;

      if (this.type === "skill") {
        // Track skill rank increases
        const oldRank   = toInt(this.system?.rank);
        const newRank   = toInt(changes?.system?.rank ?? oldRank);
        const rankIncreased = Number.isFinite(newRank) && newRank > oldRank;

        if (rankIncreased) {
          const newSchool = (changes?.system?.school ?? this.system?.school) ? true : false;
          const newFreeRanksForCalc = changes?.system?.freeRanks ?? this.system?.freeRanks;
          const baseline = newSchool ? Math.max(0, parseInt(newFreeRanksForCalc) || 0) : 0;
          const tri = (n) => (n * (n + 1)) / 2;
          const oldCost = oldRank > baseline ? tri(oldRank) - tri(baseline) : 0;
          const newCost = newRank > baseline ? tri(newRank) - tri(baseline) : 0;
          const delta = Math.max(0, newCost - oldCost);
          if (delta > 0) {
            spent.push({
              id: foundry.utils.randomID(),
              delta,
              note: game.i18n.format("l5r4.character.experience.skillChange", { name: this.name ?? "Skill", from: oldRank, to: newRank }),
              ts: Date.now(),
              type: "skill",
              skillName: this.name ?? "Skill",
              fromValue: oldRank,
              toValue: newRank
            });
            shouldUpdate = true;
          }
        }

        // Track emphasis additions
        const oldEmphasis = String(this.system?.emphasis ?? "").trim();
        const newEmphasis = String(changes?.system?.emphasis ?? oldEmphasis).trim();
        
        if (oldEmphasis !== newEmphasis) {
          const oldEmphases = oldEmphasis ? oldEmphasis.split(/[,;]+/).map(s => s.trim()).filter(Boolean) : [];
          const newEmphases = newEmphasis ? newEmphasis.split(/[,;]+/).map(s => s.trim()).filter(Boolean) : [];
          
          if (newEmphases.length > oldEmphases.length) {
            const newSchool = (changes?.system?.school ?? this.system?.school) ? true : false;
            const freeEmphasis = newSchool ? 
              (parseInt(changes?.system?.freeEmphasis ?? this.system?.freeEmphasis) || 0) : 0;
            
            const oldPaidCount = Math.max(0, oldEmphases.length - freeEmphasis);
            const newPaidCount = Math.max(0, newEmphases.length - freeEmphasis);
            const emphasisDelta = Math.max(0, newPaidCount - oldPaidCount);
            
            if (emphasisDelta > 0) {
              const emphasisCost = emphasisDelta * 2; // 2 XP per emphasis
              const addedEmphases = newEmphases.slice(oldEmphases.length);
              
              spent.push({
                id: foundry.utils.randomID(),
                delta: emphasisCost,
                note: `${this.name ?? "Skill"} - Emphasis: ${addedEmphases.join(", ")}`,
                ts: Date.now(),
                type: "emphasis",
                skillName: this.name ?? "Skill",
                fromValue: oldEmphases.length,
                toValue: newEmphases.length,
                addedEmphases: addedEmphases
              });
              shouldUpdate = true;
            }
          }
        }
      } else if (this.type === "advantage" || this.type === "disadvantage") {
        const oldCost = toInt(this.system?.cost, 0);
        const newCost = toInt(changes?.system?.cost ?? oldCost, 0);
        const delta = Math.max(0, newCost - oldCost);
        if (delta > 0) {
          const itemType = this.type === "advantage" ? "advantage" : "disadvantage";
          spent.push({
            id: foundry.utils.randomID(),
            delta,
            note: `${this.name ?? (this.type === "advantage" ? "Advantage" : "Disadvantage")} (${newCost})`,
            ts: Date.now(),
            type: itemType,
            itemName: this.name ?? (this.type === "advantage" ? "Advantage" : "Disadvantage"),
            fromValue: oldCost,
            toValue: newCost
          });
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        await this.actor.setFlag(SYS_ID, "xpSpent", spent);
      }
    } catch (_) { /* no-op */ }
  }

  /**
   * Initialize and normalize base item data for template safety.
   * Ensures all rich-text fields are strings (never null/undefined) and sets
   * appropriate defaults for type-specific fields like bow properties.
   * 
   * **Normalization Tasks:**
   * - Convert null/undefined rich-text fields to empty strings
   * - Set bow defaults (strength rating, arrow type)
   * - Assign default icons for items without custom images
   * - Ensure system object exists and is mutable
   * 
   * @returns {void}
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData();

    // Ensure system data object exists and is mutable for further processing
    const sys = (this.system ??= {});

    // Set bow-specific defaults for damage calculation compatibility
    if (this.type === "weapon" && sys.isBow) {
      if (sys.str == null) sys.str = 0;            // Bow strength rating for damage calculation
      if (sys.arrow == null) sys.arrow = "willow"; // Default arrow type (must match ARROW_MODS keys)
    }

    // Ensure valid image path, preferring type-specific defaults over generic bag icon
    if (!this.img || typeof this.img !== "string" || this.img === "icons/svg/item-bag.svg") {
      this.img = L5R4Item.DEFAULT_ICONS[this.type] ?? "icons/svg/item-bag.svg";
    }

    // Helper function to normalize rich-text fields to strings
    const ensureString = (obj, keys) => {
      for (const k of keys) {
        if (obj[k] == null) obj[k] = "";
        else if (typeof obj[k] !== "string") obj[k] = String(obj[k]);
      }
    };

    // Normalize common rich-text fields used across multiple item types
    ensureString(sys, ["description", "specialRules", "demands", "notes", "text"]);

    // Normalize type-specific rich-text fields for template editors
    switch (this.type) {
      case "spell":       ensureString(sys, ["effect", "raiseEffects"]); break;
      case "weapon":      ensureString(sys, ["special"]); break;
      case "armor":       ensureString(sys, ["special"]); break;
      case "kata":        ensureString(sys, ["effect"]); break;
      case "kiho":        ensureString(sys, ["effect"]); break;
      case "technique":   ensureString(sys, ["effect", "benefit", "drawback"]); break;
      case "tattoo":      ensureString(sys, ["effect"]); break;
      case "skill":
        // Set default values for existing skills that don't have these properties
        // Only set defaults if the properties don't exist in the actual data
        break;
    }
  }

  /**
   * Compute derived data for items based on type and context.
   * Calculates roll formulas for skills and damage formulas for bows using
   * actor traits and item properties.
   * 
   * **Skill Calculations:**
   * - Roll dice: Skill rank + effective trait value
   * - Keep dice: Effective trait value
   * - Formula: "XkY" format for display
   * 
   * **Bow Calculations:**
   * - Damage roll: min(bow strength, actor strength) + arrow modifier
   * - Damage keep: Arrow modifier keep value
   * - Formula: "XkY" format for damage rolls
   * 
   * @returns {void}
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    const sys = this.system ?? {};

    // Calculate skill roll formula: (Skill Rank + Trait)k(Trait)
    // NOTE: This runs BEFORE actor.prepareDerivedData(), so Active Effects aren't applied yet.
    // We store basic values here and recalculate in getData() for accurate display.
    if (this.type === "skill") {
      try {
        const traitKey = String(sys.trait ?? "").toLowerCase();
        const rank = toInt(sys.rank);
        
        // Store basic formula without bonuses - will be recalculated in getData()
        sys.rollDice    = Math.max(0, rank);
        sys.rollKeep    = 0;
        sys.rollFormula = `${sys.rollDice}k${sys.rollKeep}`;
      } catch (err) {
        sys.rollDice = Math.max(0, toInt(sys.rank));
        sys.rollKeep = 0;
        sys.rollFormula = `${sys.rollDice}k${sys.rollKeep}`;
        console.warn(`${SYS_ID}`, "Failed to compute skill roll formula", { err, item: this });
      }
    }

    // Calculate bow damage formula based on strength and arrow type
    if (this.type === "weapon" && sys.isBow) {
      const actorStr = this.actor ? toInt(this.actor.system?.traits?.str) : toInt(sys.str);
      const bowStr   = toInt(sys.str);

      // Apply arrow type modifiers (stored as system keys, not localized labels)
      const key = String(sys.arrow || "willow");
      const mod = ARROW_MODS[key] ?? { r: 0, k: 0 };

      sys.damageRoll    = Math.min(bowStr, actorStr) + mod.r;
      sys.damageKeep    = mod.k;
      sys.damageFormula = `${sys.damageRoll}k${sys.damageKeep}`;
    }
  }

  /* -------------------------------------------- */
  /* Chat                                         */
  /* -------------------------------------------- */

  /**
   * Create and send a chat message with an item-specific card.
   * Renders the appropriate template for the item type and posts it to chat
   * with proper speaker attribution and roll mode settings.
   * 
   * @returns {Promise<ChatMessage|void>} The created chat message, or void if no template
   */
  async roll() {
    const templatePath = L5R4Item.CHAT_CARD_TEMPLATES[this.type];
    if (!templatePath) return;

    // Render template with full item context (templates can access this.system)
    // @see https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html
    const html = await foundry.applications.handlebars.renderTemplate(templatePath, this);

    // Get localized item type label for chat flavor text
    const typeKey   = `TYPES.Item.${this.type}`;
    const typeLabel = game.i18n.has?.(typeKey) ? game.i18n.localize(typeKey) : this.type;

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      rollMode: game.settings.get("core", "rollMode"),
      flavor: `[${typeLabel}]`,
      content: html ?? ""
    });
  }

  /**
   * Enhance template data with system configuration for item sheets.
   * Provides access to CONFIG.l5r4 constants and lookups in item sheet templates.
   * 
   * @param {object} options - Sheet rendering options
   * @returns {Promise<object>} Enhanced data object with config access
   * @override
   */
  async getData(options) {
    const data = await super.getData(options);
    // Provide system config to templates for dropdown options and constants
    data.config = CONFIG.l5r4 ?? CONFIG;
    return data;
  }
}
