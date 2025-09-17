/**
 * L5R4 NPC Sheet — ApplicationV2 conversion (Foundry VTT v13+)
 * Extends BaseActorSheet for shared functionality with PC sheet.
 * Handles NPC-specific features like simple void adjustment and limited templates.
 *
 * API refs: https://foundryvtt.com/api/
 * - ActorSheetV2: https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html
 * - BaseActorSheet: ./base-actor-sheet.js (provides shared roll methods and CRUD operations)
 */

import * as Dice from "../services/dice.js";
import * as Chat from "../services/chat.js";
import { SYS_ID, TEMPLATE } from "../config.js";
import { on, toInt, T, readWoundPenalty } from "../utils.js";
import { BaseActorSheet } from "./base-actor-sheet.js";


export default class L5R4NpcSheet extends BaseActorSheet {
  static PARTS = {
    form: {
      root: true,
      classes: ["flexcol"],
      template: `systems/${SYS_ID}/templates/actor/npc.hbs`,
      scrollable: [".scrollable-content"]
    }
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: [
      ...(super.DEFAULT_OPTIONS.classes ?? []).filter(c => c !== "pc" && c !== "npc" && c !== "l5r4"),
      "l5r4",
      "npc"
    ],
    position: { ...(super.DEFAULT_OPTIONS.position ?? {}), width: 840 },
    form: { ...(super.DEFAULT_OPTIONS.form ?? {}), submitOnChange: true }
  };

  /** @inheritdoc */
  _onAction(action, event, element) {
    switch (action) {
      case "inline-edit": return this._onInlineItemEdit(event, element);
      case "item-create": return this._onItemCreate(event, element);
      case "item-delete": return this._onItemDelete(event, element);
      case "item-edit": return this._onItemEdit(event, element);
      case "item-expand": return this._onItemExpand(event, element);
      case "item-chat": return this._onItemHeaderToChat(event, element);
      case "ring-rank-void": return this._onVoidAdjust(event, element, +1);
      case "roll-ring": return this._onRingRoll(event, element);
      case "roll-skill": return this._onSkillRoll(event, element);
      case "roll-trait": return this._onTraitRoll(event, element);
      case "roll-attack": return this._onAttackRoll(event, element);
      case "roll-damage": return this._onDamageRoll(event, element);
      case "roll-weapon-attack": return this._onWeaponAttackRoll(event, element);
      case "trait-rank": return this._onTraitAdjust(event, element, +1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, +1);
    }
  }

  /** @inheritdoc (right-click = decrement) */
  _onActionContext(action, event, element) {
    switch (action) {
      case "trait-rank": return this._onTraitAdjust(event, element, -1);
      case "ring-rank-void": return this._onVoidAdjust(event, element, -1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, -1);
      default: return this._onAction(action, event, element);
    }
  }

  /** @inheritdoc (change events for inline-edit passthrough) */
  _onActionChange(action, event, element) {
    if (action === "inline-edit") return this._onInlineItemEdit(event, element);
  }

  /**
   * Ring roll handler for NPCs.
   * Reads dataset: data-ring-name, data-system-ring, data-ring-rank.
   * @param {Event} event
   * @param {HTMLElement} el
   * @see https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html
   */
  _onRingRoll(event, el) {
    event?.preventDefault?.();
    const ringName = el?.dataset?.ringName || T(`l5r4.mechanics.rings.${el?.dataset?.systemRing || "void"}`);
    const systemRing = String(el?.dataset?.systemRing || "void").toLowerCase();
    const ringRank = toInt(el?.dataset?.ringRank);
    return Dice.NpcRoll({
      npc: true,
      rollName: ringName,
      ringName: systemRing,
      ringRank
    });
  }

  /**
   * Adjust NPC Void Ring rank by ±1 (no XP logic, unlike PC sheet).
   * Clamped to [1,9] range.
   * @param {Event} event
   * @param {HTMLElement} element
   * @param {number} delta - +1 or -1
   */
  async _onVoidAdjust(event, element, delta) {
    event?.preventDefault?.();
    const cur = Number(this.actor.system?.rings?.void?.rank ?? 0) || 0;
    const min = 1;
    const max = 9;
    const next = Math.min(max, Math.max(min, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;
    try {
      await this.actor.update({ "system.rings.void.rank": next }, { diff: true });
    } catch (err) {
      console.warn("L5R4 NPC Sheet: failed to update void rank", { err });
    }
  }

  /**
   * @override
   * Render HTML for NPC sheet, choosing between limited and full templates.
   * Strips legacy <form> tags for ApplicationV2 compatibility.
   * @param {object} context - Template context
   * @param {object} options - Render options
   * @returns {Promise<{form: HTMLElement}>}
   */
  async _renderHTML(context, options) {
    const isLimited = (!game.user.isGM && this.actor.limited);
    const path = isLimited ? TEMPLATE("actor/limited-npc-sheet.hbs") : TEMPLATE("actor/npc.hbs");
    let html = await foundry.applications.handlebars.renderTemplate(path, context);
    html = html.replace(/^\s*<form[^>]*>/i, "").replace(/<\/form>\s*$/i, "");
    const root = document.createElement("div");
    root.innerHTML = html;
    return { form: (root.firstElementChild ?? root) };
  }

  /**
   * @override
   * Prepare template context for NPC sheet.
   * Categorizes items by type and adds NPC-specific settings.
   * @param {object} options - Context preparation options
   * @returns {Promise<object>} Template context
   */
  async _prepareContext(options) {
    const base = await super._prepareContext(options);
    const actorObj = this.actor.toObject(false);

    // Categorize items - mirrors the PC sheet so templates can rely on the same buckets
    const all = this.actor.items.contents;
    const byType = (t) => all.filter((i) => i.type === t);

    return {
      ...base,
      actor: this.actor,
      system: actorObj.system,
      config: CONFIG.l5r4,

      // Add the setting to the context
      showNpcVoidPoints: game.settings.get(SYS_ID, "allowNpcVoidPoints"),

      // Effective traits for template parity with PC sheet
      traitsEff: foundry.utils.duplicate(this.actor.system?._derived?.traitsEff ?? {}),

      // Buckets commonly used by your stock templates
      skills: byType("skill"),
      weapons: byType("weapon"),
      bows: byType("bow"),
      armors: byType("armor"),
      spells: byType("spell"),
      items: all.filter((i) => i.type === "item" || i.type === "commonItem")
    };
  }

  /**
   * @override
   * Post-render setup for NPC sheet.
   * Paints void dots and sets up event listeners for NPC-specific functionality.
   * @param {object} context - Template context
   * @param {object} options - Render options
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    this._paintVoidPointsDots(root);
    if (!this.actor.isOwner) return;

    // Simple rolls (not handled by base class action delegation)
    on(root, ".simple-roll", "click", (ev) => this._onSimpleRoll(ev));

    // Setup shared context menu for item rows
    await this._setupItemContextMenu(root);
  }

  /* Rolls ----------------------------------------------------------------- */

  /**
   * Handle simple dice rolls from dataset attributes.
   * Used for basic NPC rolls that don't require complex trait resolution.
   * @param {Event} event - Click event
   */
  async _onSimpleRoll(event) {
    event.preventDefault();
    const ds = event.currentTarget?.dataset || {};
    const diceRoll = toInt(ds.roll);
    const diceKeep = toInt(ds.keep);
    const rollTypeLabel = ds.rolllabel || "";
    const trait = ds.trait || "";
    const rollType = ds.rolltype || "simple";
    const rollName = `${this.actor.name}: ${rollTypeLabel} ${trait}`.trim();

    return Dice.NpcRoll({
      woundPenalty: readWoundPenalty(this.actor),
      diceRoll,
      diceKeep,
      rollName,
      toggleOptions: event.shiftKey,
      rollType
    });
  }

  /* Submit-time guard ------------------------------------------------------ */

  /**
   * @override
   * Ensure NPC name is never empty on form submission.
   * Provides robustness similar to PC sheet.
   * @param {Event} event - Submit event
   * @param {HTMLFormElement} form - Form element
   * @param {FormData} formData - Form data
   * @param {object} updateData - Additional update data
   * @returns {object} Processed submit data
   */
  _prepareSubmitData(event, form, formData, updateData={}) {
    const submit = super._prepareSubmitData(event, form, formData, updateData);
    if (!String(submit.name ?? "").trim()) submit.name = this.actor.name || "Unnamed";
    return submit;
  }
}
