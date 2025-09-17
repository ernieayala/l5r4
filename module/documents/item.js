/**
 * @fileoverview L5R4 Item Document Implementation for Foundry VTT v13+
 * 
 * This class extends the base Foundry Item document to provide L5R4-specific
 * functionality including derived data computation, experience tracking, and
 * chat card rendering for all item types in the system.
 *
 * **Core Responsibilities:**
 * - **Default Icons**: Assign appropriate type-specific icons on item creation
 * - **Data Normalization**: Ensure rich-text fields are never null for template safety
 * - **Derived Data**: Calculate roll formulas, bow damage, and other computed values
 * - **Experience Tracking**: Automatic XP logging for skill creation and advancement
 * - **Chat Integration**: Render type-specific chat cards with proper templates
 * - **Cost Validation**: Enforce advantage/disadvantage cost constraints
 *
 * **Item Type Support:**
 * - **Skills**: Roll formula calculation, XP tracking, school skill benefits
 * - **Weapons/Bows**: Damage calculation with arrow modifiers and strength requirements
 * - **Armor**: Special properties and equipped state tracking
 * - **Spells**: Effect descriptions and raise effect documentation
 * - **Advantages/Disadvantages**: Cost validation and XP integration
 * - **Techniques/Kata/Kiho**: Effect descriptions and mechanical benefits
 * - **Family/Clan/School**: Background items with trait bonuses
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @see {@link https://foundryvtt.com/api/classes/documents.Item.html|Item Document}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#_preCreate|Document._preCreate}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#prepareData|Document.prepareData}
 * @see {@link https://foundryvtt.com/api/classes/documents.ChatMessage.html|ChatMessage}
 * @see {@link https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html|renderTemplate}
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
   * @type {Record<string, string>}
   */
  chatTemplate = {
    advantage:    TEMPLATE("cards/advantage-disadvantage.hbs"),
    armor:        TEMPLATE("cards/armor.hbs"),
    bow:          TEMPLATE("cards/weapon.hbs"),
    clan:         TEMPLATE("cards/item.hbs"),
    disadvantage: TEMPLATE("cards/advantage-disadvantage.hbs"),
    family:       TEMPLATE("cards/item.hbs"),
    item:         TEMPLATE("cards/item.hbs"),
    kata:         TEMPLATE("cards/kata.hbs"),
    kiho:         TEMPLATE("cards/kiho.hbs"),
    school:       TEMPLATE("cards/item.hbs"),
    skill:        TEMPLATE("cards/skill.hbs"),
    spell:        TEMPLATE("cards/spell.hbs"),
    tattoo:       TEMPLATE("cards/tattoo.hbs"),
    technique:    TEMPLATE("cards/technique.hbs"),
    weapon:       TEMPLATE("cards/weapon.hbs")
  };

  /**
   * Default icon paths by item type for automatic assignment.
   * Used when items are created without explicit icons or with the generic bag icon.
   * @type {Record<string, string>}
   * @static
   */
  static DEFAULT_ICONS = {
    advantage:    iconPath("yin-yang.png"),
    armor:        iconPath("hat.png"),
    bow:          iconPath("bow.png"),
    clan:         iconPath("bamboo.png"),
    disadvantage: iconPath("yin-yang.png"),
    family:       iconPath("tori.png"),
    item:         iconPath("coins.png"),
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
   * advantages (≥0) and disadvantages (≤0).
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

    // Enforce advantage cost constraints (must be non-negative)
    if (this.type === "advantage") {
      const raw     = data?.system?.cost ?? this.system?.cost;
      const clamped = Math.max(0, toInt(raw, 0));
      this.updateSource({ "system.cost": clamped });
    }

    // Enforce disadvantage cost constraints (must be non-positive)
    if (this.type === "disadvantage") {
      const raw     = data?.system?.cost ?? this.system?.cost;
      const clamped = Math.min(0, toInt(raw, 0));
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
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    // Only when embedded on an Actor and for Skill type
    if (!this.actor || this.type !== "skill") return;
    try {
      const sys = this.system ?? {};
      const r = toInt(sys.rank);
      const baseline = sys.school ? 1 : 0;
      const tri = (n) => (n * (n + 1)) / 2;
      const newCost = r > baseline ? tri(r) - tri(baseline) : 0;
      if (newCost > 0) {
        const ns = this.actor.flags?.[SYS_ID] ?? {};
        const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent.slice() : [];
        spent.push({
          id: foundry.utils.randomID(),
          delta: newCost,
          note: game.i18n.format("l5r4.character.experience.log.skillCreate", { name: this.name ?? "Skill", rank: r }),
          ts: Date.now()
        });
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

    // Validate disadvantage costs (must be non-positive)
    if (this.type === "disadvantage" && changes?.system?.cost !== undefined) {
      changes.system.cost = Math.min(0, toInt(changes.system.cost, 0));
    }

    await super._preUpdate(changes, options, userId);
    if (!this.actor || this.type !== "skill") return;
    try {
      const oldRank   = toInt(this.system?.rank);
      const newRank   = toInt(changes?.system?.rank ?? oldRank);
      if (!(Number.isFinite(newRank) && newRank > oldRank)) return; // Only track XP on rank increases

      const newSchool = (changes?.system?.school ?? this.system?.school) ? true : false;
      const baseline  = newSchool ? 1 : 0;
      const tri = (n) => (n * (n + 1)) / 2;
      const oldCost = oldRank > baseline ? tri(oldRank) - tri(baseline) : 0;
      const newCost = newRank > baseline ? tri(newRank) - tri(baseline) : 0;
      const delta = Math.max(0, newCost - oldCost);
      if (delta > 0) {
        const ns = this.actor.flags?.[SYS_ID] ?? {};
        const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent.slice() : [];
        spent.push({
          id: foundry.utils.randomID(),
          delta,
          note: game.i18n.format("l5r4.character.experience.log.skillChange", { name: this.name ?? "Skill", from: oldRank, to: newRank }),
          ts: Date.now()
        });
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
    if (this.type === "bow") {
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
    // Uses effective trait values from actor if available
    if (this.type === "skill") {
      try {
        const traitKey = String(sys.trait ?? "").toLowerCase();
        const traitEff =
          toInt(this.actor?.system?._derived?.traitsEff?.[traitKey]) ||
          toInt(this.actor?.system?.traits?.[traitKey]);
        const rank = toInt(sys.rank);
        sys.rollDice    = Math.max(0, traitEff + rank);
        sys.rollKeep    = Math.max(0, traitEff);
        sys.rollFormula = `${sys.rollDice}k${sys.rollKeep}`;
      } catch (err) {
        sys.rollDice = Math.max(0, toInt(sys.rank));
        sys.rollKeep = 0;
        sys.rollFormula = `${sys.rollDice}k${sys.rollKeep}`;
        console.warn("L5R4", "Failed to compute skill roll formula", { err, item: this });
      }
    }

    // Calculate bow damage formula based on strength and arrow type
    if (this.type === "bow") {
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
    const templatePath = this.chatTemplate[this.type];
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
