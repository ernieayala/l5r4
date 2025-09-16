/**
 * L5R4 Item document for Foundry VTT v13
 *
 * Responsibilities
 * - Provide default images per type at create time.
 * - Normalize rich-text fields so {{editor}} never sees null.
 * - Compute lightweight derived data in prepareDerivedData() (e.g., bow damage from arrow type).
 * - Render compact chat cards via partials.
 *
 * See Foundry VTT API:
 * - Item: https://foundryvtt.com/api/Item.html
 * - Document lifecycle (_preCreate): https://foundryvtt.com/api/Document.html#_preCreate
 * - Data preparation: https://foundryvtt.com/api/Document.html#prepareData
 * - ChatMessage: https://foundryvtt.com/api/ChatMessage.html
 * - renderTemplate: https://foundryvtt.com/api/ui.html#renderTemplate
 */

import { TEMPLATE, ARROW_MODS, SYS_ID, iconPath } from "../config.js";
import { on, toInt } from "../utils.js";
import { TenDiceRule } from "../services/dice.js";

/**
 * @extends Item
 */
export default class L5R4Item extends Item {
  /** Handlebars partials used for chat cards by item type. */
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

  /** Default icons by type (fallback if the user did not set one). */
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
   * @override Assign a default icon on item creation if none is provided,
   * and enforce cost bounds for Advantages/Disadvantages.
   * @see https://foundryvtt.com/api/Document.html#_preCreate
   */
  async _preCreate(data, options, userId) {
    await super._preCreate(data, options, userId);

    // existing icon logic...
    const isUnsetOrBag = !this.img || this.img === "icons/svg/item-bag.svg";
    if (isUnsetOrBag) {
      const icon = L5R4Item.DEFAULT_ICONS[this.type] ?? "icons/svg/item-bag.svg";
      this.updateSource({ img: icon });
    }

    /** Enforce: Advantage cost >= 0. */
    if (this.type === "advantage") {
      const raw     = data?.system?.cost ?? this.system?.cost;
      const clamped = Math.max(0, toInt(raw, 0));
      this.updateSource({ "system.cost": clamped });
    }

    /** Enforce: Disadvantage cost <= 0. */
    if (this.type === "disadvantage") {
      const raw     = data?.system?.cost ?? this.system?.cost;
      const clamped = Math.min(0, toInt(raw, 0));
      this.updateSource({ "system.cost": clamped });
    }
  }

  /**
   * Log XP when a new Skill item is created on an Actor.
   * - Uses L5R 4e Skill costs (next rank costs its value: 1, then +2, +3, ...).
   * - If marked as a School Skill, rank 1 is free and does not count toward XP.
   * @see https://foundryvtt.com/api/classes/documents.Item.html#_onCreate
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
        // Fire and forget. Do not block create if this fails.
        this.actor.setFlag(SYS_ID, "xpSpent", spent);
      }
    } catch (_) { /* no-op */ }
  }

  /**
   * Log XP when a Skill rank increases on update.
   * - Only logs when rank actually goes up.
   * - Applies the School Skill free first rank based on the *new* school flag.
   * @see https://foundryvtt.com/api/classes/documents.Item.html#_preUpdate
   */
  async _preUpdate(changes, options, userId) {
    // Advantage: force non-negative
    if (this.type === "advantage" && changes?.system?.cost !== undefined) {
      changes.system.cost = Math.max(0, toInt(changes.system.cost, 0));
    }

    // Disadvantage: force non-positive
    if (this.type === "disadvantage" && changes?.system?.cost !== undefined) {
      changes.system.cost = Math.min(0, toInt(changes.system.cost, 0));
    }

    await super._preUpdate(changes, options, userId);
    if (!this.actor || this.type !== "skill") return;
    try {
      const oldRank   = toInt(this.system?.rank);
      const newRank   = toInt(changes?.system?.rank ?? oldRank);
      if (!(Number.isFinite(newRank) && newRank > oldRank)) return; // only on increase

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
   * @override Initialize base data for items and normalize defaults.
   * Normalize base data so templates and helpers never see null for rich-text fields.
   */
  prepareBaseData() {
    super.prepareBaseData();

    // Ensure a system object exists and is mutable.
    const sys = (this.system ??= {});

    // Bow defaults so derived math works even on legacy items missing fields.
    if (this.type === "bow") {
      if (sys.str == null) sys.str = 0;            // bow strength rating if you use it
      if (sys.arrow == null) sys.arrow = "willow"; // valid keys in ARROW_MODS
    }

    // Safe img and prefer per-type default over the global bag
    if (!this.img || typeof this.img !== "string" || this.img === "icons/svg/item-bag.svg") {
      this.img = L5R4Item.DEFAULT_ICONS[this.type] ?? "icons/svg/item-bag.svg";
    }

    // helper inside prepareBaseData
    const ensureString = (obj, keys) => {
      for (const k of keys) {
        if (obj[k] == null) obj[k] = "";
        else if (typeof obj[k] !== "string") obj[k] = String(obj[k]);
      }
    };

    // global common fields used by your templates
    ensureString(sys, ["description", "specialRules", "demands", "notes", "text"]);

    // per-type frequent editor fields
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
   * @override Compute derived data; e.g., bow damage based on STR and arrow mods.
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    const sys = this.system ?? {};

    /**
     * Skill roll display (e.g., "7k3").
     * Rule: (Skill + Trait)k(Trait).
     * Uses effective trait if the item is owned by an Actor.
     * Foundry: runs during data prep so sheets can render without recomputing.
     * @see https://foundryvtt.com/api/Document.html#prepareData
     */
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

    // Derived values for bows (ranged weapons with arrow types)
    if (this.type === "bow") {
      const actorStr = this.actor ? toInt(this.actor.system?.traits?.str) : toInt(sys.str);
      const bowStr   = toInt(sys.str);

      // Arrow modifiers keyed by stored value (not localized label)
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
   * Render and send a chat card for this item.
   * Uses per-type partials declared above.
   * @returns {Promise<ChatMessage|void>}
   */
  async roll() {
    const templatePath = this.chatTemplate[this.type];
    if (!templatePath) return;

    // Hand the live document to the template; it can read this.system safely.
    /** @see https://foundryvtt.com/api/functions/foundry.applications.handlebars.renderTemplate.html */
    const html = await foundry.applications.handlebars.renderTemplate(templatePath, this);

    // Capitalized type label if available; else show the raw id.
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
   * @override Include CONFIG.l5r4 to template context for lookups.
   */
  async getData(options) {
    const data = await super.getData(options);
    // For item sheets that expect @root.config
    data.config = CONFIG.l5r4 ?? CONFIG;
    return data;
  }
}
