/**
 * @fileoverview L5R4 PC Sheet - Player Character Sheet Implementation for Foundry VTT v13+
 * 
 * This class extends BaseActorSheet to provide comprehensive PC-specific functionality including
 * complex trait management with family bonuses, experience tracking, advanced item sorting,
 * bio item integration, and sophisticated character sheet interactions. Built for the Legend
 * of the Five Rings 4th Edition system with full L5R4 mechanics support.
 *
 * **Core Responsibilities:**
 * - **Complex Trait Management**: Advanced trait adjustment with family bonuses and XP calculation
 * - **Item Organization**: Sophisticated sorting and filtering for skills, spells, advantages
 * - **Experience Tracking**: Automatic XP calculation and logging for character advancement
 * - **Bio Item Integration**: Seamless drag/drop support for clan, family, and school items
 * - **Sheet Locking**: Toggle edit mode to prevent accidental changes during play
 * - **Void Point Management**: Interactive visual dot interface for void point tracking
 * - **Advanced UI Controls**: Custom header controls and context-sensitive interfaces
 *
 * **ApplicationV2 Architecture:**
 * Modern Foundry v13+ implementation with enhanced capabilities:
 * - **Template System**: Uses HandlebarsApplicationMixin for efficient template rendering
 * - **Context Preparation**: Replaces legacy getData() with modern _prepareContext()
 * - **Event Handling**: Replaces activateListeners() with _onRender() lifecycle
 * - **Action Delegation**: Clean event handling using data-action attributes
 * - **Header Controls**: Custom header controls for sheet locking and edit mode
 * - **Lifecycle Management**: Proper setup/teardown with memory management
 *
 * **Advanced Features:**
 * - **Family Bonus Integration**: Live family item references with Active Effects system
 * - **Sorting Preferences**: Per-user, per-actor sorting preferences for all item lists
 * - **Inline Editing**: Direct field editing with proper data type coercion
 * - **Context Menus**: Comprehensive right-click menus for item management
 * - **Mastery Tracking**: Automatic skill mastery display based on current ranks
 * - **XP Manager Integration**: Seamless integration with XP tracking application
 * - **Drag & Drop**: Full support for bio items and equipment organization
 *
 * **Trait System Architecture:**
 * PC traits use a sophisticated multi-layer system:
 * - **Base Traits**: Core values stored in system.traits.* (editable)
 * - **Family Bonuses**: Applied via Active Effects from family items
 * - **Effective Traits**: Final calculated values in prepareDerivedData()
 * - **Display Logic**: Sheet shows effective values but edits base values
 * - **XP Calculation**: Costs calculated based on effective rank increases
 * - **Validation**: Range checking and family bonus integration
 *
 * **Item Management System:**
 * - **Bio Items**: Clan, family, school items with special handling
 * - **Skills**: Complex skill system with emphases, masteries, and school bonuses
 * - **Spells**: Spell slot management with school and ring restrictions
 * - **Advantages/Disadvantages**: Cost tracking and XP integration
 * - **Equipment**: Weapons, armor, and gear with encumbrance tracking
 * - **Sorting**: User-customizable sorting for all item categories
 *
 * **Experience Point Integration:**
 * - **Automatic Tracking**: XP costs calculated for all character changes
 * - **Manual Adjustments**: GM tools for XP modifications
 * - **History Logging**: Complete audit trail of XP expenditures
 * - **Validation**: Prevents invalid XP expenditures
 * - **Manager Integration**: Seamless XP Manager application integration
 *
 * **Performance Optimizations:**
 * - **Lazy Loading**: Item lists rendered only when visible
 * - **Efficient Sorting**: Cached sort preferences with minimal recalculation
 * - **DOM Optimization**: Targeted updates for trait and void point changes
 * - **Template Caching**: Reuse of template data where possible
 * - **Event Delegation**: Minimal event listeners with efficient routing
 *
 * **Usage Examples:**
 * ```javascript
 * // Open PC sheet
 * const pc = game.actors.getName("Samurai Character");
 * pc.sheet.render(true);
 * 
 * // Adjust trait with family bonus handling
 * await pcSheet._onTraitAdjust(event, target);
 * 
 * // Toggle sheet lock
 * await pcSheet._onToggleLock();
 * ```
 *
 * **Code Navigation Guide:**
 * 1. **Context Preparation** (`_prepareContext()`) - Template data with sorting and bonuses
 * 2. **Event Binding** (`_onRender()`) - Post-render setup and event delegation
 * 3. **Trait Management** (`_onTraitAdjust()`) - Complex trait adjustment with family bonuses
 * 4. **Bio Items** (`_onDrop()`) - Clan/family/school drag/drop handling
 * 5. **Void Management** (`_onVoidAdjust()`) - Void ring rank adjustment
 * 6. **Spell Slots** (`_onSpellSlotAdjust()`) - Spell slot management
 * 7. **Visual Updates** (`_paintVoidPointsDots()`) - Void points dot rendering
 * 8. **Sorting** (`_onSortClick()`) - Item list sorting preference management
 * 9. **Family Bonuses** (`familyBonusFor()`) - Family bonus calculation from Active Effects
 * 10. **XP Integration** (various methods) - Experience point tracking and validation
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 1.0.2
 * @extends {BaseActorSheet}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html|ActorSheetV2}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html|HandlebarsApplicationMixin}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.ux.TextEditor.html#getDragEventData|TextEditor.getDragEventData}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
 */

import { SYS_ID, TEMPLATE } from "../config.js";
import { T, getSortPref, on, setSortPref, sortWithPref, toInt, applyRankPointsDelta, resolveWeaponSkillTrait, readWoundPenalty } from "../utils.js";

import * as Dice from "../services/dice.js";
import { BaseActorSheet } from "./base-actor-sheet.js";
import XpManagerApplication from "../apps/xp-manager.js";
import WoundConfigApplication from "../apps/wound-config.js";

/** Foundry UX TextEditor (for enrichHTML) — https://foundryvtt.com/api/classes/foundry.applications.ux.TextEditor.html */
const { TextEditor } = foundry.applications.ux;

/** Stable trait keys used by templates and derived math */
const TRAIT_KEYS = /** @type {const} */ (["sta","wil","str","per","ref","awa","agi","int"]);

/** @typedef {"name"|"type"|"cost"} AdvSortKey */
/**
 * Build comparable fields for sorting Advantages/Disadvantages.
 * - Name/Type use locale-aware string compare
 * - Type uses the localized label so alpha matches the UI
 * - Cost is numeric
 * @param {any} item
 * @returns {{name:string,type:string,cost:number}}
 * @see https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#getFlag
 * @see https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#setFlag
 */
function _advComparable(item) {
  const name = String(item?.name ?? "").toLocaleLowerCase(game.i18n.lang || undefined);
  const typeKey = String(item?.system?.type ?? "");
  const type = game.i18n.localize(`l5r4.character.advantages.${typeKey}`).toLocaleLowerCase(game.i18n.lang || undefined);
  const cost = Number(item?.system?.cost ?? 0) || 0;
  return { name, type, cost };
}


/**
 * Return the Family AE bonus for a trait if (and only if) it comes from the
 * embedded Family Item’s **transferred** Active Effects. Otherwise 0.
 * @param {Actor} actor
 * @param {string} traitKey - "sta","wil","str","per","ref","awa","agi","int"
 * @returns {number}
 * @see https://foundryvtt.com/api/classes/documents.ActiveEffect.html
 */
const familyBonusFor = function(actor, traitKey) {
  try {
    const uuid = actor.getFlag(SYS_ID, "familyItemUuid");
    if (!uuid || !globalThis.fromUuidSync) return 0;
    const familyItem = /** @type {any} */ (fromUuidSync(uuid));
    if (!familyItem || familyItem.type !== "family") return 0;
    const key = `system.traits.${traitKey}`;
    let total = 0;
    for (const eff of familyItem.effects ?? []) {
      if (eff?.transfer !== true) continue; // only transferred effects count
      for (const ch of eff.changes ?? []) {
        if (ch?.key === key && ch?.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
          const v = Number(ch?.value ?? 0);
          if (Number.isFinite(v)) total += v;
        }
      }
    }
    return total;
  } catch (_e) { return 0; }
};

export default class L5R4PcSheet extends BaseActorSheet {
  /**
   * Track the DOM root we last bound listeners to.
   * Foundry v13 replaces the root on every render, so we must re-bind for each new root.
   * @private @type {HTMLElement|null}
   */
  _boundExtraRoot = null;

  static PARTS = {
    form: {
      root: true,
      classes: ["flexcol"],
      template: `systems/${SYS_ID}/templates/actor/pc.hbs`,
      scrollable: [".scrollable-content"],
      submitOnChange: true,
      submitOnClose: true
    }
  };


  /** @inheritdoc */
  _onAction(action, event, element) {
    switch (action) {
      case "clan-link": return this._onClanLink(event);
      case "family-open": return this._onFamilyOpen(event);
      case "inline-edit": return this._onInlineItemEdit(event, element);
      case "item-chat": return this._onItemHeaderToChat(event, element);
      case "item-create": return this._onItemCreate(event, element);
      case "item-delete": return this._onItemDelete(event, element);
      case "item-edit": return this._onItemEdit(event, element);
      case "item-expand": return this._onItemExpand(event, element);
      case "item-roll": return this._onItemRoll(event, element);
      case "item-sort-by": return this._onUnifiedSortClick(event, element);
      case "ring-rank-void": return this._onVoidAdjust(event, element, +1);
      case "roll-ring": return this._onRingRoll(event, element);
      case "roll-skill": return this._onSkillRoll(event, element);
      case "roll-trait": return this._onTraitRoll(event, element);
      case "roll-weapon": return this._onWeaponRoll(event, element);
      case "roll-weapon-attack": return this._onWeaponAttackRoll(event, element);
      case "rp-step": return this._onRankPointsStep(event, element, +0.1);
      case "school-link": return this._onSchoolLink(event);
      case "section-expand": return this._onSectionExpand(event, element);
      case "spell-slot": return this._onSpellSlotAdjust(event, element, +1);
      case "trait-rank": return this._onTraitAdjust(event, element, +1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, +1);
      case "wound-config": return this._onWoundConfig(event);
      case "xp-add": return this._onXpAdd(event);
      case "xp-log": return this._onXpLog(event);
      case "xp-modal": return this._onXpModal(event);
    }
  }

  /** @inheritdoc */
  _onActionContext(action, event, element) {
    switch (action) {
      case "ring-rank-void": return this._onVoidAdjust(event, element, -1);
      case "rp-step": return this._onRankPointsStep(event, element, -0.1);
      case "spell-slot": return this._onSpellSlotAdjust(event, element, -1);
      case "trait-rank": return this._onTraitAdjust(event, element, -1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, -1);
    }
  }

  /** @inheritdoc */
  _onActionChange(action, event, element) {
    if (action === "inline-edit") return this._onInlineItemEdit(event, element);
  }

  /**
   * @override
   * Handle clan/family/school drops as owned items so they render/edit/delete in Bio.
   * For all other items, delegate to the base class implementation.
   * Foundry v13 API: Actor.createEmbeddedDocuments → https://foundryvtt.com/api/classes/documents.BaseDocument.html#createEmbeddedDocuments
   * Drag data: TextEditor.getDragEventData → https://foundryvtt.com/api/classes/foundry.applications.ux.TextEditor.html#static-getDragEventData
   */
  async _onDrop(event) {
    const ev = /** @type {{originalEvent?: DragEvent}} */(event)?.originalEvent ?? event;
    if (!ev?.dataTransfer) return super._onDrop(event);

    const data = foundry.applications.ux.TextEditor.getDragEventData(ev);
    if (!data || data.type !== "Item") return super._onDrop(event);

    const itemDoc = await fromUuid(data.uuid ?? "");
    if (!itemDoc) return super._onDrop(event);

    const type = String(itemDoc.type);
    const BIO_TYPES = new Set(["clan", "family", "school"]);
    if (!BIO_TYPES.has(type)) {
      // For non-bio items, use the base class implementation
      return super._onDropItem(event, data);
    }

    // Enforce singleton: remove prior of same type
    try {
      const prior = (this.actor.items?.contents ?? this.actor.items).filter(i => i.type === type);
      if (prior.length) await this.actor.deleteEmbeddedDocuments("Item", prior.map(i => i.id));
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to delete prior bio item(s)", { type, err });
    }

    let newest = null;
    try {
      const [created] = await this.actor.createEmbeddedDocuments("Item", [itemDoc.toObject()]);
      newest = created ?? null;
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to embed bio item on drop", { type, err });
    }

    // Update labels/flags (no renaming on Family)
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
      try { await this.actor.update(updates); }
      catch (err) { console.warn(`${SYS_ID}`, "actor.update failed after bio drop", { type, updates, err }); }
    }
  }



  /**
   * @override
   * Render HTML for PC sheet, choosing between limited and full templates.
   * @param {object} context - Template context
   * @param {object} _options - Render options (unused)
   * @returns {Promise<{form: HTMLElement}>}
   */
  async _renderHTML(context, _options) {
    const isLimited = (!game.user.isGM && this.actor.limited);
    const path = isLimited ? TEMPLATE("actor/pc-limited.hbs") : TEMPLATE("actor/pc.hbs");
    const html = await foundry.applications.handlebars.renderTemplate(path, context);
    const host = document.createElement("div");
    host.innerHTML = html;
    const form = host.querySelector("form") || host.firstElementChild || host;
    return { form };
  }

  /* ---------------------------------- */
  /* Options / Tabs                      */
  /* ---------------------------------- */

  /** @override */
  static get DEFAULT_OPTIONS() {
    const options = super.DEFAULT_OPTIONS;
    return {
      ...options,
      styles: ["window", "forms", "prosemirror"],
      classes: [
        ...(options.classes ?? []).filter(c => c !== "pc" && c !== "npc" && c !== "l5r4"),
        "l5r4",
        "pc"
      ],
      position: { ...(super.DEFAULT_OPTIONS.position ?? {}), width: 870 },
      form: { ...(super.DEFAULT_OPTIONS.form ?? {}), submitOnChange: true, submitOnClose: true }
    };
  }


  /* ---------------------------------- */
  /* Data Prep                           */
  /* ---------------------------------- */

  /**
   * @override
   * Prepare the context passed to the Handlebars template.
   * Handles complex PC-specific data like sorted items, effective traits, and family bonuses.
   * @param {object} _options - Context preparation options (unused)
   * @returns {Promise<object>} Template context
   * @see https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html#_prepareContext
   */
  async _prepareContext(_options) {
    const base = await super._prepareContext(_options);
    const actorObj = this.document;
    const system = foundry.utils.deepClone(actorObj.system ?? {});
    // Normalize notes to a string for the editor.
    if (typeof system.notes !== "string") system.notes = String(system.notes ?? "");
    // Pre-enrich for read-only rendering.
    const enrichedNotes = await TextEditor.enrichHTML(system.notes ?? "", {
      async: true,
      secrets: this.isEditable,
      documents: true,
      links: true
    });
  
    /** Bucket items by type for the template (keep the order stable) */
    const all = actorObj.items.contents ?? actorObj.items;
    const byType = (t) => all.filter((i) => i.type === t);
  
    // Skills sorted by user preference (name, rank, trait, roll, emphasis)
    const skills = (() => {
      const cols = {
        name:     it => String(it?.name ?? ""),
        rank:     it => Number(it?.system?.rank ?? 0) || 0,
        trait:    it => {
          const raw = String(it?.system?.trait ?? "").toLowerCase();
          const key = raw && /^l5r4\.mechanics\.traits\./.test(raw) ? raw : (raw ? `l5r4.ui.mechanics.traits.${raw}` : "");
          const loc = key ? game.i18n?.localize?.(key) : "";
          return String((loc && loc !== key) ? loc : (it?.system?.trait ?? ""));
        },
        roll:     it => Number(it?.system?.rank ?? 0) || 0,
        emphasis: it => String(it?.system?.emphasis ?? "")
      };
      const pref = getSortPref(actorObj.id, "skills", Object.keys(cols), "name");
      const sorted = sortWithPref(byType("skill"), cols, pref, game.i18n?.lang);
      
      // Recalculate skill formulas with correct trait values (after Active Effects)
      for (const skill of sorted) {
        const traitKey = String(skill.system?.trait ?? "").toLowerCase();
        const traitEff =
          toInt(actorObj.system?._derived?.traitsEff?.[traitKey]) ||
          toInt(actorObj.system?.traits?.[traitKey]);
        const rank = toInt(skill.system?.rank);
        
        // Include Active Effects bonuses (matches dice.js SkillRoll logic)
        const bb = actorObj.system?.bonuses;
        const kSkill = String(skill.name).toLowerCase?.();
        const bSkill = (bb?.skill && bb.skill[kSkill]) || {};
        const bTrait = (bb?.trait && bb.trait[traitKey]) || {};
        const rollBonus = toInt(bSkill.roll) + toInt(bTrait.roll);
        const keepBonus = toInt(bSkill.keep) + toInt(bTrait.keep);
        
        skill.system.rollDice = Math.max(0, traitEff + rank + rollBonus);
        skill.system.rollKeep = Math.max(0, traitEff + keepBonus);
        skill.system.rollFormula = `${skill.system.rollDice}k${skill.system.rollKeep}`;
      }
      
      return sorted;
    })();
  
    // Spells sorted by user preference (name, ring, mastery, range, aoe, duration)
    const spells = (() => {
      const cols = {
        name:     it => String(it?.name ?? ""),
        ring:     it => String(it?.system?.ring ?? ""),
        mastery:  it => Number(it?.system?.mastery ?? 0) || 0,
        range:    it => String(it?.system?.range ?? ""),
        aoe:      it => String(it?.system?.aoe ?? ""),
        duration: it => String(it?.system?.duration ?? "")
      };
      const pref = getSortPref(actorObj.id, "spells", Object.keys(cols), "name");
      return sortWithPref(byType("spell"), cols, pref, game.i18n?.lang);
    })();
  
    // Advantages sorted by user preference (name, type, cost)
    const advantages = (() => {
      const cols = {
        name: it => String(it?.name ?? ""),
        type: it => String(game.i18n?.localize?.(`l5r4.character.advantages.${it?.system?.type ?? ""}`) ?? ""),
        cost: it => Number(it?.system?.cost ?? 0) || 0
      };
      const pref = getSortPref(actorObj.id, "advantages", Object.keys(cols), "name");
      return sortWithPref(byType("advantage"), cols, pref, game.i18n?.lang);
    })();
  
    // Disadvantages sorted by user preference (name, type, cost)
    const disadvantages = (() => {
      const cols = {
        name: it => String(it?.name ?? ""),
        type: it => String(game.i18n?.localize?.(`l5r4.character.advantages.${it?.system?.type ?? ""}`) ?? ""),
        cost: it => Number(it?.system?.cost ?? 0) || 0
      };
      const pref = getSortPref(actorObj.id, "disadvantages", Object.keys(cols), "name");
      return sortWithPref(byType("disadvantage"), cols, pref, game.i18n?.lang);
    })();
  
    // Items sorted by user preference (name)
    const items = (() => {
      const cols = {
        name: it => String(it?.name ?? "")
      };
      const pref = getSortPref(actorObj.id, "items", Object.keys(cols), "name");
      return sortWithPref(all.filter((i) => i.type === "item" || i.type === "commonItem"), cols, pref, game.i18n?.lang);
    })();
  
    // Katas sorted by user preference (name, ring, mastery)
    const katas = (() => {
      const cols = {
        name: it => String(it?.name ?? ""),
        ring: it => String(it?.system?.ring ?? ""),
        mastery: it => Number(it?.system?.mastery ?? 0) || 0
      };
      const pref = getSortPref(actorObj.id, "katas", Object.keys(cols), "name");
      return sortWithPref(byType("kata"), cols, pref, game.i18n?.lang);
    })();
  
    // Kihos sorted by user preference (name, ring, mastery, type)
    const kihos = (() => {
      const cols = {
        name: it => String(it?.name ?? ""),
        ring: it => String(it?.system?.ring ?? ""),
        mastery: it => Number(it?.system?.mastery ?? 0) || 0,
        type: it => String(it?.system?.type ?? "")
      };
      const pref = getSortPref(actorObj.id, "kihos", Object.keys(cols), "name");
      return sortWithPref(byType("kiho"), cols, pref, game.i18n?.lang);
    })();
  
    // Tattoos sorted by user preference (name)
    const tattoos = (() => {
      const cols = {
        name: it => String(it?.name ?? "")
      };
      const pref = getSortPref(actorObj.id, "tattoos", Object.keys(cols), "name");
      return sortWithPref(byType("tattoo"), cols, pref, game.i18n?.lang);
    })();
  
    // Techniques sorted by user preference (name)
    const techniques = (() => {
      const cols = {
        name: it => String(it?.name ?? "")
      };
      const pref = getSortPref(actorObj.id, "techniques", Object.keys(cols), "name");
      return sortWithPref(byType("technique"), cols, pref, game.i18n?.lang);
    })();
  
    // Armors sorted by user preference (name, bonus, reduction, equipped)
    const armors = (() => {
      const cols = {
        name: it => String(it?.name ?? ""),
        bonus: it => Number(it?.system?.bonus ?? 0) || 0,
        reduction: it => Number(it?.system?.reduction ?? 0) || 0,
        equipped: it => it?.system?.equipped ? 1 : 0
      };
      const pref = getSortPref(actorObj.id, "armors", Object.keys(cols), "name");
      return sortWithPref(byType("armor"), cols, pref, game.i18n?.lang);
    })();
  
    // Weapons sorted by user preference (name, damage, size)
    const weapons = (() => {
      const cols = {
        name: it => String(it?.name ?? ""),
        damage: it => (toInt(it?.system?.damageRoll) * 10) + toInt(it?.system?.damageKeep),
        size: it => String(it?.system?.size ?? "")
      };
      const pref = getSortPref(actorObj.id, "weapons", Object.keys(cols), "name");
      return sortWithPref(byType("weapon").map(weapon => {
        const weaponSkill = resolveWeaponSkillTrait(this.actor, weapon);
        weapon.attackFormula = `${weaponSkill.rollBonus}k${weaponSkill.keepBonus}`;
        if (actorObj.system._stanceEffects?.fullAttack) {
          const stanceRollBonus = weaponSkill.rollBonus + 2;
          const stanceKeepBonus = weaponSkill.keepBonus + 1;
          weapon.attackFormulaWithStance = `${stanceRollBonus}k${stanceKeepBonus}`;
        } else {
          weapon.attackFormulaWithStance = weapon.attackFormula;
        }
        return weapon;
      }), cols, pref, game.i18n?.lang);
    })();
  
    // Bows sorted by user preference (name, damage, size)
    const bows = (() => {
      const cols = {
        name: it => String(it?.name ?? ""),
        damage: it => (toInt(it?.system?.damageRoll) * 10) + toInt(it?.system?.damageKeep),
        size: it => String(it?.system?.size ?? "")
      };
      const pref = getSortPref(actorObj.id, "weapons", Object.keys(cols), "name");
      return sortWithPref(byType("bow").map(bow => {
        const weaponSkill = resolveWeaponSkillTrait(this.actor, bow);
        bow.attackFormula = `${weaponSkill.rollBonus}k${weaponSkill.keepBonus}`;
        if (actorObj.system._stanceEffects?.fullAttack) {
          const stanceRollBonus = weaponSkill.rollBonus + 2;
          const stanceKeepBonus = weaponSkill.keepBonus + 1;
          bow.attackFormulaWithStance = `${stanceRollBonus}k${stanceKeepBonus}`;
        } else {
          bow.attackFormulaWithStance = bow.attackFormula;
        }
        return bow;
      }), cols, pref, game.i18n?.lang);
    })();
  
    /** Build mastery list from skill ranks */
    const masteries = [];
    for (const s of skills) {
      const r = toInt(s.system?.rank);
      if (s.system?.mastery3 && r >= 3) masteries.push({ _id: s.id, name: `${s.name} 3`, mastery: s.system.mastery3 });
      if (s.system?.mastery5 && r >= 5) masteries.push({ _id: s.id, name: `${s.name} 5`, mastery: s.system.mastery5 });
      if (s.system?.mastery7 && r >= 7) masteries.push({ _id: s.id, name: `${s.name} 7`, mastery: s.system.mastery7 });
    }
  
    // Effective traits logic (unchanged)
    let fam = {};
    try {
      const uuid = this.actor.getFlag(SYS_ID, "familyItemUuid");
      if (uuid && globalThis.fromUuidSync) {
        const doc = /** @type {any} */ (fromUuidSync(uuid));
        const key = String(doc?.system?.trait ?? "").toLowerCase();
        const amt = Number(doc?.system?.bonus ?? 1);
        if (key && actorObj.system?.traits && (key in actorObj.system.traits) && Number.isFinite(amt) && amt !== 0) {
          fam = { [key]: amt };
        }
      }
    } catch (_e) {}
    if (!fam || Object.keys(fam).length === 0) fam = this.actor.flags?.[SYS_ID]?.familyBonus ?? {};
  
    let traitsEff = foundry.utils.duplicate(
      this.actor.system?._derived?.traitsEff ?? this.actor.system?.derived?.traitsEff ?? {}
    );
    if (!Object.keys(traitsEff).length) {
      traitsEff = foundry.utils.duplicate(
        this.actor.system?._derived?.traitsEff ?? this.actor.system?.derived?.traitsEff ?? {}
      );
      if (!Object.keys(traitsEff).length) {
        console.warn(`${SYS_ID}`, "traitsEff missing in actor.system._derived; check prepareDerivedData()");
      }
    }
  
    const bioClan   = byType("clan")[0]   ?? null;
    const bioFamily = byType("family")[0] ?? null;
    const bioSchool = byType("school")[0] ?? null;
  
    /**
     * Template context with consistently pre-computed sorted item collections.
     * All item types now use the same pre-computed pattern for maintainability.
     */
    return {
      ...base,
      actor: this.actor,
      system,
      bioClan,
      bioFamily,
      bioSchool,
      editable: this.isEditable,
      enriched: { notes: enrichedNotes },
      traitsEff,
      config: CONFIG[SYS_ID] || CONFIG.l5r4 || {},
      /**
       * One combined, sorted list for the Advantages/Disadvantages panel.
       * Primary honors direction; tie-breakers ascend.
       */
      get advDisList() {
        const list = [...advantages, ...disadvantages];
        const cols = {
          name:  (it) => String(it?.name ?? ""),
          type:  (it) => String(game.i18n?.localize?.(`l5r4.character.advantages.${it?.system?.type ?? ""}`) ?? ""),
          cost:  (it) => Number(it?.system?.cost ?? 0) || 0,
          item:  (it) => String(it.type ?? "")
        };
        const pref = getSortPref(actorObj.id, "advDis", Object.keys(cols), "name");
        return sortWithPref(list, cols, pref, game.i18n?.lang);
      },
      // Clean, consistent variable references - much more maintainable!
      armors,
      bows,
      advantages,
      disadvantages,
      items,
      katas,
      kihos,
      skills,
      spells,
      tattoos,
      techniques,
      weapons,
      masteries
    };
  }

  /**
   * @override
   * Bind UI events and setup post-render functionality.
   * Replaces the old activateListeners pattern from ApplicationV1.
   * @param {object} context - Template context
   * @param {object} options - Render options
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;


    // Inline header control: Toggle Edit Mode (inject into window header controls).
    // v13 exposes header *menu* via _getHeaderControls()/hook; there is no public API for inline icons.
    // We scope to this sheet and make it idempotent on every render.
    try {
      const appEl = root?.closest(".app.window-app");
      const controls = appEl?.querySelector(":scope > header.window-header .window-controls");
      if (controls) {
        // Remove any prior copies to prevent the "button parade" on re-renders.
        controls.querySelectorAll(".l5r4-toggle-edit").forEach(n => n.remove());

        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("window-control", "l5r4-toggle-edit");
        btn.dataset.action = "toggle-is-editable";
        btn.dataset.tooltip = "Toggle Edit Mode";
        btn.setAttribute("aria-label", "Toggle Edit Mode");
        btn.innerHTML = `<i class="fas fa-pen-to-square"></i>`;
        btn.addEventListener("click", ev => {
          ev.preventDefault();
          try {
            this.element?.classList.toggle("is-editable");
          } catch (err) {
            console.warn(`${SYS_ID}`, "PC Sheet: toggle-is-editable failed", { err });
          }
        });

        // Put it first, before the kebab.
        controls.insertBefore(btn, controls.firstElementChild);
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "PC Sheet: header control injection failed", { err });
    }

    // Always repaint Void dots after any render, even if the root element is reused.
    // Foundry v13 often re-renders by replacing innerHTML without swapping the root.
    // @see https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html#render
    this._paintVoidPointsDots(root);

    // Bind once per *current* DOM root; rebind only if the root element actually changed.
    if (this._boundExtraRoot === root) return;
    this._boundExtraRoot = root;
    if (!this.actor.isOwner) return;

    // All [data-action] handlers are now delegated via BaseActorSheet.
    // Keep only non-[data-action] bindings here:
    // Sorting is now handled via data-action delegation - no direct binding needed

    // After render, paint the dot faces to match current value
    this._paintVoidPointsDots(root);

    /**
     * Persist trait edits immediately (debounced) using the matched element,
     * not the event, since our "on(...)" helper is delegated.
     * @see https://foundryvtt.com/api/classes/foundry.utils.html#debounce
     */
    const saveTrait = foundry.utils.debounce((el) => this._onInlineActorEdit(null, el), 200);
    // Traits (Earth, Air, Fire, Water pairs)
    on(root, "input[name^='system.traits.']", "input",  (ev, el) => saveTrait(el));
    on(root, "input[name^='system.traits.']", "change", (ev, el) => this._onInlineActorEdit(ev, el));
    /** Void ring fields live under system.rings.void.*, not system.traits.* */
    on(root, "input[name='system.rings.void.rank']",  "input",  (ev, el) => saveTrait(el));
    on(root, "input[name='system.rings.void.rank']",  "change", (ev, el) => this._onInlineActorEdit(ev, el));
    on(root, "input[name='system.rings.void.value']", "input",  (ev, el) => saveTrait(el));
    on(root, "input[name='system.rings.void.value']", "change", (ev, el) => this._onInlineActorEdit(ev, el));

    // Clan/family/school helpers
    on(root, "[data-action='clan-link']", "click", (ev) => this._onClanLink(ev));
    on(root, "[data-action='school-link']", "click", (ev) => this._onSchoolLink(ev));
    on(root, "[data-action='family-open']","click", (ev) => this._onFamilyOpen(ev));

    // Image editing
    on(root, "[data-edit='img']", "click", (ev) => this._onEditImage(ev, ev.currentTarget));

    // Experience actions
    on(root, "[data-action='xp-add']", "click", (ev) => this._onXpAdd(ev));
    on(root, "[data-action='xp-log']", "click", (ev) => this._onXpLog(ev));

    // Setup shared context menu for item rows
    await this._setupItemContextMenu(root);
  }



  /**
   * @override
   * Define allowed sort keys for PC lists.
   * Specifies which columns are sortable for each list scope.
   * 
   * @param {string} scope - Sort scope identifier (e.g., "skills", "spells", "advantages")
   * @returns {string[]} Array of allowed sort keys for this scope
   */
  _getAllowedSortKeys(scope) {
    const keys = {
      armors:       ["name","bonus","reduction","equipped"],
      weapons:      ["name","damage","size"],
      items:        ["name"],
      skills:       ["name","rank","trait","roll","emphasis"],
      spells:       ["name","ring","mastery","range","aoe","duration"],
      techniques:   ["name"],
      technique:    ["name"],
      katas:        ["name","ring","mastery"],
      kihos:        ["name","ring","mastery","type"],
      tattoos:      ["name"],
      advantages:   ["name","type","cost"],
      disadvantages:["name","type","cost"],
      advDis:       ["name","type","cost","item"]
    };
    return keys[scope] ?? ["name"];
  }

  /**
   * Adjust a Trait rank by clicking its displayed value.
   * Shift+Left click: +1. Shift+Right click: -1.
   * Caps:
   *  - Max effective Trait = 9
   *  - Min effective Trait = 2, or 2 + Family bonus when that Trait is boosted by Family
   *
   * The sheet stores base ranks under system.traits.*, and applies Family in derived data.
   * We clamp the *effective* rank, then convert back to base before update.
   * Requires Shift+Click to prevent accidental changes.
   *
   * Foundry APIs:
   * - Document.update: https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
   *
   * @param {MouseEvent} event  The originating mouse event
   * @param {HTMLElement} element  The clicked `.trait-rank` element
   * @param {number} delta  +1 or -1
   */
  async _onTraitAdjust(event, element, delta) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    // Require Shift+Click to prevent accidental trait changes
    if (!event?.shiftKey) return;

    const key = String(element?.dataset?.trait || "").toLowerCase();
    if (!TRAIT_KEYS.includes(key)) return;

    /**
     * Current base (pre-AE) and Family bonus.
     * Foundry applies Active Effects before prepareDerivedData, so actor.system is post-AE.
     * Use the document source for the true base rank.
     * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#_source
     */
    const base = Number(this.actor._source?.system?.traits?.[key]
                 ?? this.actor.system?.traits?.[key] ?? 0) || 0;
    const fam  = Number((() => {
      // familyBonusFor is defined above in this file
      try { return familyBonusFor(this.actor, key) || 0; } catch { return 0; }
    })());

    // Work in *effective* space, then convert back to base
    const effNow = base + fam;
    // Effective caps
    const effMin = 0 + Math.max(0, fam); // if Family gives +1 to Strength, min displayed is 1
    const effMax = 9;                    // global cap

    const wantEff = effNow + (delta > 0 ? 1 : -1);
    const nextEff = Math.min(effMax, Math.max(effMin, wantEff));
    if (nextEff === effNow) return; // no change

    const nextBase = nextEff - fam;

    // Update the Actor’s base Trait
    try {
      await this.actor.update({ [`system.traits.${key}`]: nextBase }, { diff: true });
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.update failed in PcSheet", { err });
    }
  }

    /**
     * Adjust the Void Ring via click.
     * Shift+Left click adds 1. Shift+Right click subtracts 1.
     * Min 2. Max 9.
     * Requires Shift+Click to prevent accidental changes.
     *
     * Uses standard Foundry document updates.
     * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
     *
     * @param {MouseEvent} event - originating event
     * @param {HTMLElement} element - clicked .ring-rank-void element
     * @param {number} delta - +1 or -1
     */
    async _onVoidAdjust(event, element, delta) {
      event?.preventDefault?.();

      // Require Shift+Click to prevent accidental void rank changes
      if (!event?.shiftKey) return;

      // Use _source to get base value before Active Effects are applied
      const cur = Number(this.actor._source?.system?.rings?.void?.rank
                  ?? this.actor.system?.rings?.void?.rank ?? 0) || 0;
      const min = 0;
      const max = 9;

      const next = Math.min(max, Math.max(min, cur + (delta > 0 ? 1 : -1)));
      if (next === cur) return;

      try {
        await this.actor.update({ "system.rings.void.rank": next }, { diff: true });
      } catch (err) {
        console.warn(`${SYS_ID}`, "actor.update failed in PcSheet", { err });
      }
    }

  /**
   * Adjust a spell slot value by +1/-1 within [0..9].
   *
   * - Reads the target path from the clicked element's data-path (e.g. "system.spellSlots.water")
   * - Uses Actor.update to persist immediately.
   *
   * Foundry APIs:
   * - Document.update: https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
   * - foundry.utils.getProperty: https://foundryvtt.com/api/functions/utilities.html#getProperty
   *
   * @param {MouseEvent} event
   * @param {HTMLElement} element - The clicked button with data-path
   * @param {number} delta - +1 or -1
   * @returns {Promise<void>}
   */
  async _onSpellSlotAdjust(event, element, delta) {
    try {
      const path = element?.dataset?.path || "";
      // Defensive guard: only allow system.spellSlots.*
      if (!/^system\.spellSlots\.(water|air|fire|earth|void)$/.test(path)) return;

      // Read current value safely, default 0
      const current = Number(foundry.utils.getProperty(this.actor, path) ?? 0) || 0;

      // Clamp to 0..9
      const next = Math.min(9, Math.max(0, current + (delta || 0)));
      if (next === current) return;

      await this.actor.update({ [path]: next });

      // Optional immediate visual feedback (sheet will re-render anyway)
      element.textContent = String(next);
    } catch (err) {
      console.warn(`${SYS_ID}`, "Spell slot adjust failed", { err, element, delta });
    }
  }

  /**
   * Minimal inline actor edit for "system.*" fields.
   * Works with delegated handlers by accepting an explicit element.
   * @param {Event|null} ev
   * @param {HTMLElement} [element]
   */
  async _onInlineActorEdit(ev, element) {
    const el = /** @type {HTMLInputElement|null} */ (
      element instanceof HTMLElement ? element
      : (ev?.target instanceof HTMLElement ? ev.target
      : (ev?.currentTarget instanceof HTMLElement ? ev.currentTarget : null))
    );
    if (!el) return; // nothing to do
    const path = el.name || el.getAttribute("name");
    if (!path) return;
    let value = el.value;

    /** Respect Foundry's dtype casting.
     *  @see https://foundryvtt.com/api/classes/foundry.utils.FormDataExtended.html
     */
    const dtype = el.dataset.dtype || el.getAttribute("data-dtype");
    if (dtype === "Boolean") {
      value = !!el.checked;
    } else if (dtype === "Number" || el.type === "number") {
      const n = Number(value);
      if (!Number.isFinite(n)) return; // ignore incomplete input like "-" or ""
      value = n;
    }

    // Update only the changed path
    try {
      await this.actor.update({ [path]: value });
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.update failed in PcSheet", { err });
    }
  }

  /* ---------------------------------- */
  /* Drag & Drop                         */
  /* ---------------------------------- */

  /**
   * Handle drop of a Clan item: set actor.system.clan and remember the source item UUID.
   * @param {Item} itemDoc - The dropped clan item
   */
  async _handleClanDrop(itemDoc) {
    const clanName = String(itemDoc.name ?? "").trim();
    const data = { "system.clan": clanName };
    data[`flags.${SYS_ID}.clanItemUuid`] = itemDoc.uuid;
    try {
      await this.actor.update(data);
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.update failed in PcSheet", { err });
    }
  }

  /**
   * Handle drop of a School item: set actor.system.school and remember the source item UUID.
   * Uses standard Actor.update to persist data. (Actor API: https://foundryvtt.com/api/Actor.html#update)
   * @param {Item} itemDoc
   */
  async _handleSchoolDrop(itemDoc) {
    const schoolName = String(itemDoc.name ?? "").trim();
    const data = { "system.school": schoolName };
    data[`flags.${SYS_ID}.schoolItemUuid`] = itemDoc.uuid;
    try {
      await this.actor.update(data);
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.update failed in PcSheet _handleSchoolDrop", { err });
    }
  }

  /**
   * Handle drop of a Family item: set flags and embed the item.
   * Kept for backwards compatibility; primary flow embeds via _onDrop above.
   * @param {Item} itemDoc - The dropped family item
   */
  async _handleFamilyDrop(itemDoc) {
    try {
      const prior = (this.actor.items?.contents ?? this.actor.items).filter(i => i.type === "family");
      if (prior.length) await this.actor.deleteEmbeddedDocuments("Item", prior.map(i => i.id));
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to delete stale Family items on drop", { err });
    }

    try {
      await this.actor.update({
        [`flags.${SYS_ID}.familyItemUuid`]: itemDoc.uuid,
        [`flags.${SYS_ID}.familyName`]: String(itemDoc.name ?? "")
        // No name mutations here anymore.
      });
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.update failed in _handleFamilyDrop", { err });
    }
  }

  /**
   * Clear the family assignment and remove embedded Family items.
   * Removes family bonuses and active effects immediately.
   * @param {Event} event - The click event
   */
  async _onFamilyClear(event) {
    event?.preventDefault?.();
    const fam = this.actor.getFlag(SYS_ID, "familyName");
    const name = fam ? this._extractBaseName(this.actor.name || "", fam) : (this.actor.name || "");
    try {
      const prior = (this.actor.items?.contents ?? this.actor.items).filter(i => i.type === "family");
      if (prior.length) await this.actor.deleteEmbeddedDocuments("Item", prior.map(i => i.id));
      await this.actor.update({
        name,
        [`flags.${SYS_ID}.familyItemUuid`]: null,
        [`flags.${SYS_ID}.familyName`]: null,
        [`flags.${SYS_ID}.familyBaseName`]: null
      });
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.update failed in _onFamilyClear", { err });
    }
  }

  /* ---------------------------------- */
  /* Rolls                               */
  /* ---------------------------------- */

  /**
   * Handle item roll for simple item chat display.
   * @param {Event} event - The click event
   * @param {HTMLElement} element - The clicked element
   */
  _onItemRoll(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const rid = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const item = rid ? this.actor.items.get(rid) : null;
    if (!item) return;

    // Send item to chat
    return item.toMessage();
  }

  /**
   * Handle Ring rolls from the rings wheel.
   * @param {MouseEvent} event - The click event
   * @param {HTMLElement} el - The ring roll element with dataset attributes
   */
  _onRingRoll(event, el) {
    event.preventDefault();
    /** Localized ring name for chat flavor. */
    const ringName = el.dataset?.ringName || T(`l5r4.ui.mechanics.rings.${el.dataset?.systemRing || "void"}`);
    /** System ring key: "earth" | "air" | "water" | "fire" | "void". */
    const systemRing = String(el.dataset?.systemRing || "void").toLowerCase();
    /** Numeric ring rank from dataset, already formatted by the template. */
    const ringRank = toInt(el.dataset?.ringRank);

    // Pass the exact option names RingRoll expects.
    Dice.RingRoll({
      ringRank,
      ringName,
      systemRing,
      askForOptions: event.shiftKey,
      actor: this.actor,
      // Ensure wound penalties apply to ring rolls like skills/traits
      woundPenalty: readWoundPenalty(this.actor)
    });
  }

  /**
   * Handle weapon damage rolls using stored damage dice.
   * Shift-click to open roll options dialog.
   * @param {MouseEvent} event - The click event
   * @param {HTMLElement} element - The clicked element in the weapon row
   */
  _onWeaponRoll(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const item = id ? this.actor.items.get(id) : null;
    if (!item) return;

    const diceRoll = Number(item.system?.damageRoll ?? 0) || 0;
    const diceKeep = Number(item.system?.damageKeep ?? 0) || 0;

    return Dice.WeaponRoll({
      diceRoll,
      diceKeep,
      weaponName: item.name,
      description: item.system?.description,
      askForOptions: event.shiftKey
    });
  }

  /**
   * Handle weapon attack rolls using weapon skill/trait associations.
   * Uses the weapon's associated skill if the character has it, otherwise falls back to the weapon's trait.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The clicked element in the weapon row
   */
  _onWeaponAttackRoll(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const item = id ? this.actor.items.get(id) : null;
    if (!item) return;

    const weaponSkill = resolveWeaponSkillTrait(this.actor, item);
    const untrained = weaponSkill.skillRank === 0;
    const rollName = untrained 
      ? `${item.name} (${T("l5r4.ui.mechanics.rolls.unskilled")})`
      : `${item.name} ${T("l5r4.ui.mechanics.rolls.attackRoll")}`;

    return Dice.NpcRoll({
      rollName,
      diceRoll: weaponSkill.rollBonus,
      diceKeep: weaponSkill.keepBonus,
      rollType: "attack",
      actor: this.actor,
      untrained,
      woundPenalty: readWoundPenalty(this.actor),
      weaponId: id
    });
  }
  /* ---------------------------------- */
  /* Item CRUD                           */
  /* ---------------------------------- */

  /**
   * @override
   * Handle inline item editing with enhanced dtype support for PC sheet.
   * Supports checkboxes, numbers, booleans, and string values.
   * @param {Event} event - The input event
   * @param {HTMLElement} element - The input element
   */
  async _onInlineItemEdit(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLInputElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const field = el.dataset.field;
    if (!id || !field) return;

    // Handle checkbox values and extended dtype support
    let value = el.type === "checkbox" ? el.checked : el.value;
    const dtype = el.dataset.dtype ?? el.dataset.type;
    switch (dtype) {
      case "Integer": value = toInt(value, 0); break;
      case "Number":  value = Number.isFinite(+value) ? +value : 0; break;
      case "Boolean": value = el.type === "checkbox"
        ? !!value
        : ["true","1","on","yes"].includes(String(value).toLowerCase());
        break;
      default: value = String(value ?? "");
    }
    return this.actor.items.get(id)?.update({ [field]: value });
  }


  /* ---------------------------------- */
  /* Experience: manual adjustments and log */
  /* ---------------------------------- */

  /**
   * Prompt to add or remove XP manually with a reason note.
   * Stores entries in the actor's manual XP log under flags.
   * @param {Event} event - The click event
   * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#setFlag
   * @see https://foundryvtt.com/api/classes/client.Dialog.html#static-prompt
   */
  async _onXpAdd(event) {
    event?.preventDefault?.();
    const html = document.createElement("div");
    html.innerHTML = `
      <div class="form-group">
        <label>${game.i18n.localize("l5r4.character.experience.xpAmount")}</label>
        <input type="number" step="1" value="1" class="xp-amount" />
      </div>
      <div class="form-group">
        <label>${game.i18n.localize("l5r4.character.experience.note")}</label>
        <input type="text" class="xp-note" placeholder="${game.i18n.localize("l5r4.character.experience.reason")}" />
      </div>
    `;

    const value = await Dialog.prompt({
      title: game.i18n.localize("l5r4.character.experience.adjustExperience"),
      content: html,
      label: game.i18n.localize("l5r4.ui.common.apply"),
      callback: (dlg) => {
        const amount = Number.isFinite(+dlg.querySelector(".xp-amount")?.value) ? +dlg.querySelector(".xp-amount").value : 0;
        const note = String(dlg.querySelector(".xp-note")?.value ?? "").trim();
        return { amount, note };
      }
    });
    if (!value) return;

    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? foundry.utils.duplicate(ns.xpManual) : [];
    manual.push({
      id: foundry.utils.randomID(),
      delta: Number.isFinite(+value.amount) ? +value.amount : 0,
      note: value.note,
      ts: Date.now()
    });
    try {
      await this.actor.setFlag(SYS_ID, "xpManual", manual);
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.setFlag failed in PcSheet", { err });
    }
  }

  /**
   * Display a detailed XP breakdown dialog showing spent, earned, and available XP.
   * Includes manual XP adjustments from the log.
   * @param {Event} event - The click event
   * @see https://foundryvtt.com/api/classes/client.Dialog.html#static-prompt
   */
  async _onXpLog(event) {
    event?.preventDefault?.();
    const sys = this.actor.system ?? {};
    const xp = sys?._xp ?? {};
    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? ns.xpManual : [];  // pool changes
    const spent  = Array.isArray(ns.xpSpent)  ? ns.xpSpent  : [];  // purchases

    const rows = (arr) =>
      arr
        .slice()
        .sort((a, b) => (a.ts || 0) - (b.ts || 0))
        .map(e => {
          const when = new Date(e.ts || Date.now()).toLocaleString();
          const sign = (Number.isFinite(+e.delta) ? (e.delta >= 0 ? "+" : "") : "");
          return `<tr><td>${when}</td><td style="text-align:right">${sign}${e.delta ?? 0}</td><td>${foundry.utils.escapeHTML(e.note || "")}</td></tr>`;
        })
        .join("");

    const manualRows  = rows(manual);
    const spentRows   = rows(spent);
    const manualTotal = manual.reduce((s, e) => s + (Number.isFinite(+e.delta) ? +e.delta : 0), 0);
    const spentTotal  = spent.reduce((s, e) => s + (Number.isFinite(+e.delta) ? +e.delta : 0), 0);

    const content = `
      <h3>${game.i18n.localize("l5r4.character.experience.experienceSummary")}</h3>
      <p><b>${game.i18n.localize("l5r4.character.experience.usedTotal")}:</b> ${xp.spent ?? 0} / ${xp.total ?? 40} <i>(${(xp.available ?? (xp.total ?? 40) - (xp.spent ?? 0))} ${game.i18n.localize("l5r4.ui.common.left")})</i></p>
      <ul>
        <li>Base: ${xp?.breakdown?.base ?? 40}</li>
        <li>Disadvantages grant: ${xp?.breakdown?.disadvantagesGranted ?? 0} (cap 10)</li>
        <li>Manual adjustments: ${xp?.breakdown?.manual ?? 0}</li>
        <li>Traits: ${xp?.breakdown?.traits ?? 0}</li>
        <li>Void: ${xp?.breakdown?.void ?? 0}</li>
        <li>Skills: ${xp?.breakdown?.skills ?? 0}</li>
        <li>Advantages: ${xp?.breakdown?.advantages ?? 0}</li>
      </ul>

      <h4>${game.i18n.localize("l5r4.character.experience.poolChanges")}:</h4>
      <table class="table">
        <thead><tr>
          <th>${game.i18n.localize("l5r4.character.experience.when")}</th>
          <th style="text-align:right">${game.i18n.localize("l5r4.ui.common.xp")}</th>
          <th>${game.i18n.localize("l5r4.character.experience.note")}</th>
        </tr></thead>
        <tbody>${manualRows || `<tr><td colspan="3"><i>${game.i18n.localize("l5r4.ui.common.none")}</i></td></tr>`}</tbody>
        <tfoot><tr><td style="text-align:right" colspan="1"><b>${game.i18n.localize("l5r4.ui.common.total")}</b></td>
        <td style="text-align:right"><b>${manualTotal}</b></td><td></td></tr></tfoot>
      </table>

      <h4>${game.i18n.localize("l5r4.character.experience.purchases")}:</h4>
      <table class="table">
        <thead><tr>
          <th>${game.i18n.localize("l5r4.character.experience.when")}</th>
          <th style="text-align:right">${game.i18n.localize("l5r4.ui.common.xp")}</th>
          <th>${game.i18n.localize("l5r4.character.experience.note")}</th>
        </tr></thead>
        <tbody>${spentRows || `<tr><td colspan="3"><i>${game.i18n.localize("l5r4.ui.common.none")}</i></td></tr>`}</tbody>
        <tfoot><tr><td style="text-align:right" colspan="1"><b>${game.i18n.localize("l5r4.ui.common.total")}</b></td>
        <td style="text-align:right"><b>${spentTotal}</b></td><td></td></tr></tfoot>
      </table>
    `;

    await Dialog.prompt({
      title: game.i18n.localize("l5r4.character.experience.xpLog"),
      content,
      label: game.i18n.localize("l5r4.ui.common.close"),
      callback: () => true
    });
  }

  /**
   * Legacy _retroactivelyUpdateXP method removed to prevent XP log duplication.
   * XP Manager now handles all XP calculations and retroactive updates.
   * This method was creating duplicate entries when both PC sheet and XP Manager
   * attempted to rebuild XP tracking data simultaneously.
   * 
   * @deprecated Removed in favor of XP Manager's _retroactivelyUpdateXP method
   * @see module/apps/xp-manager.js XpManagerApplication._retroactivelyUpdateXP()
   */

  /**
   * Display the XP modal with comprehensive experience tracking.
   * Shows XP breakdown, manual adjustments, and purchase history in a dialog.
   * @param {Event} event - The click event
   */
  async _onXpModal(event) {
    event?.preventDefault?.();
    
    // Create and show the new XP Manager Application
    const xpManager = new XpManagerApplication(this.actor);
    xpManager.render(true);
  }

  /**
   * Open the Wound Configuration Application for this PC.
   * Provides real-time wound system configuration with Formula/Manual modes.
   * @param {Event} event - The click event
   */
  async _onWoundConfig(event) {
    event?.preventDefault?.();
    
    try {
      // Check for existing wound config window and focus it
      const existingApp = Object.values(ui.windows).find(app => 
        app instanceof WoundConfigApplication && app.actor.id === this.actor.id
      );

      if (existingApp) {
        existingApp.bringToTop();
      } else {
        // Create and show new Wound Configuration Application
        const woundConfig = new WoundConfigApplication(this.actor);
        await woundConfig.render(true);
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to open wound configuration", { err, actorId: this.actor.id });
      ui.notifications?.error(game.i18n.localize("l5r4.ui.notifications.woundConfigFailed"));
    }
  }

  /* ---------------------------------- */
  /* Clan / Family helpers               */
  /* ---------------------------------- */

  /**
   * Open the linked Clan item sheet by UUID.
   * @param {Event} event - The click event
   */
  async _onClanLink(event) {
    event.preventDefault();
    const uuid = event.currentTarget?.dataset?.uuid || this.actor.getFlag(SYS_ID, "clanItemUuid");
    if (!uuid) return;
    const doc = await fromUuid(uuid);
    doc?.sheet?.render(true);
  }

  /**
   * Clear the Clan selection and remove the stored UUID flag.
   * @param {Event} event - The click event
   */
  async _onClanClear(event) {
    event.preventDefault();
    try {
      await this.actor.update({
        "system.clan": "",
        [`flags.${SYS_ID}.clanItemUuid`]: null
      });
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.update failed in PcSheet", { err });
    }
  }

  /**
   * Open the linked School item sheet by UUID.
   * @param {Event} event - The click event
   * @see https://foundryvtt.com/api/global.html#fromUuid
   */
  async _onSchoolLink(event) {
    event.preventDefault();
    const uuid = event.currentTarget?.dataset?.uuid || this.actor.getFlag(SYS_ID, "schoolItemUuid");
    if (!uuid) return;
    const doc = await fromUuid(uuid);
    doc?.sheet?.render(true);
  }

  /**
   * Clear the School selection and remove the stored UUID flag.
   * @param {Event} event - The click event
   */
  async _onSchoolClear(event) {
    event.preventDefault();
    try {
      await this.actor.update({
        "system.school": "",
        [`flags.${SYS_ID}.schoolItemUuid`]: null
      });
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.update failed in PcSheet _onSchoolClear", { err });
    }
  }

  /**
   * Open the linked Family item sheet by UUID.
   * @param {Event} event - The click event
   */
  async _onFamilyOpen(event) {
    event.preventDefault();
    const uuid = event.currentTarget?.dataset?.uuid || this.actor.getFlag(SYS_ID, "familyItemUuid");
    if (!uuid) return;
    const doc = await fromUuid(uuid);
    doc?.sheet?.render(true);
  }

  /**
   * Clear the Family selection and remove name prefix.
   * Removes the family name from the actor's display name.
   * @param {Event} event - The click event
   */
  async _onFamilyClear(event) {
    event.preventDefault();
    // Remove prefix from name when clearing the family
    const fam = this.actor.getFlag(SYS_ID, "familyName");
    let name = this.actor.name || "";
    if (fam) name = this._extractBaseName(name, fam);
    try {
      await this.actor.update({
        name,
        [`flags.${SYS_ID}.familyItemUuid`]: null,
        [`flags.${SYS_ID}.familyName`]: null,
        [`flags.${SYS_ID}.familyBaseName`]: null
      });
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.update failed in PcSheet", { err });
    }
  }

  /**
   * Extract base name by removing family prefix from the current name.
   * Handles case-insensitive family name removal.
   * @param {string} current - The current actor name
   * @param {string} fam - The family name to remove
   * @returns {string} The base name without family prefix
   */
  _extractBaseName(current, fam) {
    const famPrefix = (String(fam) + " ").toLowerCase();
    const s = String(current ?? "");
    if (s.toLowerCase().startsWith(famPrefix)) return s.slice(famPrefix.length).trim();
    return s;
  }

  /* ---------------------------------- */
  /* Submit pipeline                     */
  /* ---------------------------------- */

  /**
   * @override
   * Convert trait inputs that display "effective" (base + family) back to base before submit.
   * Handles family bonus calculations to maintain proper trait values.
   * @param {Event} event - The submit event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @param {object} updateData - Additional update data
   * @returns {object} Processed submit data
   * @see https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html#_prepareSubmitData
   */
  _prepareSubmitData(event, form, formData, updateData = {}) {
    // Call parent to build the update object first
    const data = super._prepareSubmitData(event, form, formData, updateData);

    // If traits are part of the update, convert eff -> base by subtracting the family bonus
    const t = data?.system?.traits;
    if (t && typeof t === "object") {
      for (const [k, v] of Object.entries(t)) {
        if (v === undefined || v === null) continue;
        const eff = Number(v) || 0;
        const bonus = toInt(familyBonusFor(this.actor, k)); // resolves flags → uuid → embedded
        const base  = eff - bonus;
        // Clamp to >= 0 (L5R traits can’t be negative)
        t[k] = Math.max(0, base);
      }
    }
    return data;
  }

  /**
   * @override
   * Process submit data with family-specific side effects.
   * Handles family base name persistence and delegates to parent.
   * @param {Event} event - The submit event
   * @param {HTMLFormElement} form - The form element
   * @param {object} submitData - The processed submit data
   * @param {object} options - Submit options
   * @returns {Promise<void>}
   */
  async _processSubmitData(event, form, submitData, options) {
    // Persist base name if we prefixed during _prepareSubmitData
    if (submitData.__familyBaseName) {
      submitData[`flags.${SYS_ID}.familyBaseName`] = submitData.__familyBaseName;
      delete submitData.__familyBaseName;
    }

    console.debug("[L5R4] submit traits", submitData?.system?.traits);

    return super._processSubmitData(event, form, submitData, options);
  }

  /* ---------------------------------- */
  /* Family bonus from item              */
  /* ---------------------------------- */

  /**
   * Handle preference-based sorting for most item types.
   * Uses user flags to store sort preferences and triggers a render.
   * @param {string} scope - The item list scope (weapons, spells, etc.)
   * @param {string} key - The sort key (name, rank, etc.)
   * @param {HTMLElement} el - The clicked sort element
   * @returns {Promise<void>}
   */
  async _onPreferenceBasedSort(scope, key, el) {
    try {
      const allowed = {
        armors:       ["name","bonus","reduction","equipped"],
        weapons:      ["name","damage","size"],
        items:        ["name"],
        spells:       ["name","ring","mastery","range","aoe","duration"],
        techniques:   ["name"],
        technique:    ["name"],
        katas:        ["name","ring","mastery"],
        kihos:        ["name","ring","mastery","type"],
        tattoos:      ["name"],
        advantages:   ["name","type","cost"],
        disadvantages:["name","type","cost"],
        advDis:       ["name","type","cost","item"]
      }[scope] ?? ["name"];
      
      if (!allowed.includes(key)) {
        console.warn(`${SYS_ID}`, "Invalid sort key for scope", { scope, key, allowed });
        return;
      }
      
      const cur = getSortPref(this.actor.id, scope, allowed, allowed[0]);
      await setSortPref(this.actor.id, scope, key, { toggleFrom: cur });
      
      // Update visual indicator
      const header = el.closest('.item-list.-header');
      if (header) {
        header.querySelectorAll('.item-sort-by').forEach(a => {
          a.classList.toggle('is-active', a === el);
          if (a !== el) a.removeAttribute('data-dir');
        });
        
        const newPref = getSortPref(this.actor.id, scope, allowed, allowed[0]);
        el.setAttribute('data-dir', newPref.dir);
      }
      
      // Trigger re-render to apply new sort
      this.render();
      
    } catch (err) {
      console.warn(`${SYS_ID}`, "Preference-based sort failed", { err, scope, key });
    }
  }
  
  /**
   * Handle document-based sorting for skills to preserve sort bins.
   * Updates the item.sort property directly to maintain item ordering.
   * @param {MouseEvent} event - The original click event
   * @param {HTMLElement} el - The clicked sort element
   * @param {string} key - The sort key (name, rank, trait, etc.)
   * @returns {Promise<void>}
   */
  async _onSkillsDocumentSort(event, el, key) {
    try {
      // Toggle direction per-header: asc ⇄ desc
      const dir = (el.dataset.dir = el.dataset.dir === "asc" ? "desc" : "asc");
      const asc = dir === "asc" ? 1 : -1;

      // Current skills on the Actor
      const skills = this.actor.items.filter(i => i.type === "skill");
      if (!skills.length) return;

      // Preserve existing numeric "sort bins" so other item types stay in place
      const bins = skills.map(i => i.sort).sort((a, b) => a - b);

      // Value selector per column
      const val = (it) => {
        switch (key) {
          case "name":     return String(it.name ?? "");
          case "rank":     return Number(it.system?.rank ?? 0);
          case "trait":    return String(it.system?.trait ?? "");
          case "type":     return String(it.system?.type ?? "");
          case "school":   return it.system?.school ? 1 : 0; // true/false → 1/0
          case "emphasis": return String(it.system?.emphasis ?? "");
          default:         return String(it.name ?? "");
        }
      };

      // Comparator that handles both numbers and strings (with locale)
      const cmp = (a, b) => {
        const va = val(a), vb = val(b);
        if (typeof va === "number" && typeof vb === "number") return asc * (va - vb);
        return asc * String(va).localeCompare(String(vb), game.i18n.lang);
      };

      const sorted = skills.slice().sort(cmp);

      // Reassign the existing bins to the new order; fall back to spaced ints if needed
      const updates = sorted.map((it, i) => ({ _id: it.id, sort: bins[i] ?? ((i + 1) * 10) }));

      if (updates.length) {
        await this.actor.updateEmbeddedDocuments("Item", updates);
        
        // Update visual indicators
        const skillsHeader = this.element.querySelector('.item-list.-header[data-scope="skills"]');
        if (skillsHeader) {
          skillsHeader.querySelectorAll('.item-sort-by').forEach(a => {
            a.classList.toggle('is-active', a === el);
            if (a !== el) a.removeAttribute('data-dir');
          });
        }
      }
      
    } catch (err) {
      console.warn(`${SYS_ID}`, "Skills document sort failed", { err, key });
    }
  }

  /**
   * Adjust Honor/Glory/Status/Shadow rank.points by ±0.1 (or ±1.0 with Ctrl).
   * Shift+Left-click increments by +0.1, Shift+Right-click decrements by -0.1.
   * Holding Ctrl changes step to +/-1.0. Mouse wheel adjusts by 0.1.
   * Requires Shift+Click to prevent accidental changes.
   * @param {MouseEvent|WheelEvent} event
   * @param {HTMLElement} el - the clicked chip element with data-key
   * @param {number} baseDelta - default delta in decimal units (0.1 or -0.1)
   * @returns {Promise<void>}
   * @see https://foundryvtt.com/api/classes/foundry.documents.BaseActor.html#update
   */
  async _onRankPointsStep(event, el, baseDelta) {
    try {
      // Require Shift+Click to prevent accidental rank/points changes
      if (!event?.shiftKey) return;
      
      const key = String(el?.dataset?.key || "");
      if (!key) return;

      const sys = this.actor.system ?? {};
      const cur = {
        rank: Number(sys?.[key]?.rank ?? 0) || 0,
        points: Number(sys?.[key]?.points ?? 0) || 0
      };

      const step = event?.ctrlKey ? (baseDelta > 0 ? +1 : -1) : baseDelta;
      const next = applyRankPointsDelta(cur, step, 0, 10);

      const update = {};
      update[`system.${key}.rank`] = next.rank;
      update[`system.${key}.points`] = next.points;

      await this.actor.update(update);
    } catch (err) {
      console.warn(`${SYS_ID} PC Sheet: failed to update rank/points`, { err, event, el });
    }
  }

  /**
   * Toggle section collapse/expand by toggling is-collapsed class on section-title.
   * @param {MouseEvent} event - The originating click event
   * @param {HTMLElement} element - The clicked expand button
   * @returns {void}
   */
  _onSectionExpand(event, element) {
    event?.preventDefault?.();
    
    const sectionTitle = element.closest('.section-title');
    if (!sectionTitle) return;
    
    sectionTitle.classList.toggle('is-collapsed');
    
    // Toggle the chevron icon direction
    const icon = element.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-up");
    }
  }
}
