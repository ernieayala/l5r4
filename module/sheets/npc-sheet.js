/**
 * L5R4 NPC Sheet — ApplicationV2 conversion (Foundry VTT v13+)
 *
 * API refs: https://foundryvtt.com/api/
 * - ActorSheetV2: https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html
 * - TextEditor.getDragEventData: https://foundryvtt.com/api/classes/foundry.applications.ux.TextEditor.html#static-getDragEventData
 */

import * as Dice from "../services/dice.js";
import * as Chat from "../services/chat.js";
import { SYS_ID, TEMPLATE } from "../config.js";
import { on, toInt, T } from "../utils.js";
import { BaseActorSheet } from "./base-actor-sheet.js";

/** Compute the current wound penalty from the NPC actor, handling legacy shapes. */
function readWoundPenalty(actor) {
  // Newer shape
  if (actor.system?.wounds?.penalty != null) return toInt(actor.system.wounds.penalty, 0);
  // Fallback to woundLvlsUsed shape if present
  const levels = Object.values(actor.system?.woundLvlsUsed || {});
  const current = levels
    .filter((w) => w?.current)
    .reduce((a, b) => (toInt(a?.penalty, -999) > toInt(b?.penalty, -999) ? a : b), null);
  return toInt(current?.penalty, 0);
}

export default class L5R4NpcSheet extends BaseActorSheet {
  static PARTS = {
    form: {
      root: true,
      classes: ["flexcol"],
      template: `systems/${SYS_ID}/templates/actor/npc.hbs`,
      scrollable: [".tabs-content"]
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

  /** Choose limited or normal template and strip legacy <form>. */

  /** @inheritdoc */
  _onAction(action, event, element) {
    switch (action) {
      case "inline-edit": return this._onInlineItemEdit(event, element);
      case "item-create": return this._onItemCreate(event, element);
      case "item-delete": return this._onItemDelete(event, element);
      case "item-edit": return this._onItemEdit(event, element);
      case "item-expand": return this._onItemExpand(event, element);
      case "ring-rank-void": return this._onVoidAdjust(event, element, +1);
      case "roll-ring": return this._onRingRoll(event, element);
      case "roll-trait": return this._onTraitRoll(event, element);
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
   * Ring roll handler (NPC).
   * Reads dataset: data-ring-name, data-system-ring, data-ring-rank.
   * @param {Event} event
   * @param {Element} el
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
   * Trait roll handler (NPC).
   * Finds key from nearest .trait-rank[data-trait] or element dataset.
   * @param {Event} event
   * @param {Element} el
   */
  _onTraitRoll(event, el) {
    event?.preventDefault?.();
    const block = el?.closest?.(".trait");
    const traitKey = String(
      block?.querySelector?.(".trait-rank")?.dataset?.trait ||
      el?.dataset?.traitName ||
      "ref"
    ).toLowerCase();
    const traitRank = toInt(
      this.actor.system?._derived?.traitsEff?.[traitKey],
      toInt(this.actor.system?.traits?.[traitKey])
    );
    return Dice.NpcRoll({
      npc: true,
      rollName: el?.dataset?.traitName || traitKey,
      traitName: traitKey,
      traitRank
    });
  }

  /**
   * Adjust an NPC trait rank by ±1 (no XP/family math for NPCs).
   * Clamped to [1,10].
   * @param {Event} event
   * @param {Element} el
   * @param {number} delta
   */
  async _onTraitAdjust(event, el, delta) {
    event?.preventDefault?.();
    const key = String(el?.dataset?.trait || "").toLowerCase();
    if (!key) return;
    const cur = Number(this.actor.system?.traits?.[key] ?? 0) || 0;
    const next = Math.min(10, Math.max(1, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;
    try {
      await this.actor.update({ [`system.traits.${key}`]: next }, { diff: true });
    } catch (err) {
      console.warn("L5R4 NPC Sheet: failed to update trait", { err, key, cur, next });
    }
  }

  /**
   * Adjust NPC Void Ring (no XP logic).
   * @param {Event} event
   * @param {Element} element
   * @param {number} delta
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
   * Adjust NPC Void Points by ±1 within [0..9].
   * Uses Document.update to persist the value.
   * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
   *
   * @param {MouseEvent} event
   * @param {HTMLElement} element - .void-points-dots
   * @param {number} delta - +1 (left click) or -1 (right-click)
   */
  async _onVoidPointsAdjust(event, element, delta) {
    event?.preventDefault?.();
    const cur = Number(this.actor.system?.rings?.void?.value ?? 0) || 0;
    const next = Math.min(9, Math.max(0, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;
    try {
      await this.actor.update({ "system.rings.void.value": next }, { diff: true });
    } catch (err) {
      console.warn("L5R4 NPC Sheet: failed to update void points", { err });
    }
    // Repaint from authoritative actor state to avoid stale DOM edge-cases
    this._paintVoidPointsDots(this.element);
  }

  /**
   * Render the 9-dot Void Points control by toggling "-filled" on .void-dot up to current value.
   * Mirrors PC sheet behavior so NPCs show and update correctly.
   * Safe to call after every render.
   * @param {HTMLElement} root
   */
  _paintVoidPointsDots(root) {
    const node = root?.querySelector?.(".void-points-dots");
    if (!node) return;
    const cur = Number(this.actor.system?.rings?.void?.value ?? 0) || 0;
    node.querySelectorAll(".void-dot").forEach(d => {
      const idx = Number(d.getAttribute("data-idx") || "0") || 0;
      d.classList.toggle("-filled", idx <= cur);
    });
  }

  async _renderHTML(context, options) {
    const isLimited = (!game.user.isGM && this.actor.limited);
    const path = isLimited ? TEMPLATE("actor/limited-npc-sheet.hbs") : TEMPLATE("actor/npc.hbs");
    let html = await foundry.applications.handlebars.renderTemplate(path, context);
    html = html.replace(/^\s*<form[^>]*>/i, "").replace(/<\/form>\s*$/i, "");
    const root = document.createElement("div");
    root.innerHTML = html;
    return { form: (root.firstElementChild ?? root) };
  }

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

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    this._paintVoidPointsDots(root);
    if (!this.actor.isOwner) return;

    // Rolls
    on(root, ".simple-roll", "click", (ev) => this._onSimpleRoll(ev));
    on(root, ".skill-roll", "click", (ev) => this._onSkillRoll(ev));
    on(root, ".attack-roll, .attack1-roll, .attack2-roll", "click", (ev) => this._onAttackRoll(ev));
    on(root, ".damage-roll, .damage1-roll, .damage2-roll", "click", (ev) => this._onDamageRoll(ev));

    // Item CRUD
    on(root, ".item-create", "click", (ev) => this._onItemCreate(ev));
    on(root, ".item-edit", "click", (ev) => this._onItemEdit(ev));
    on(root, ".item-delete", "click", (ev) => this._onItemDelete(ev));
    on(root, ".inline-edit", "change", (ev) => this._onInlineItemEdit(ev));
  }

  /* Rolls ----------------------------------------------------------------- */

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

  _onAttackRoll(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const row = el.closest(".item");
    const id = row?.dataset.itemId;
    const description = String(el.dataset.description ?? "");
    const label = String(el.dataset.label ?? "");
    const traitKey = String(el.dataset.trait || "agi").toLowerCase();
    const diceRoll = toInt(el.dataset.roll);
    const diceKeep = toInt(el.dataset.keep);
    const rollName = `${this.actor.name}: ${label}`.trim();
    const actorTrait = traitKey === "void"
      ? toInt(this.actor.system?.rings?.void?.rank)
      : toInt(this.actor.system?.traits?.[traitKey]);

    return Dice.NpcRoll({
      woundPenalty: readWoundPenalty(this.actor),
      diceRoll: diceRoll + actorTrait,
      diceKeep: diceKeep + actorTrait,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "attack"
    });
  }

  _onDamageRoll(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const description = String(el.dataset.description ?? "");
    const label = String(el.dataset.label ?? "");
    const traitKey = String(el.dataset.trait || "str").toLowerCase();
    const diceRoll = toInt(el.dataset.roll);
    const diceKeep = toInt(el.dataset.keep);
    const rollName = `${this.actor.name}: ${label}`.trim();
    const actorTrait = toInt(this.actor.system?.traits?.[traitKey]);

    return Dice.NpcRoll({
      diceRoll: diceRoll + actorTrait,
      diceKeep: diceKeep + actorTrait,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "damage"
    });
  }

  _onSkillRoll(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".item");
    const item = row ? this.actor.items.get(row.dataset.itemId) : null;
    if (!item) return;
    const traitKey = String(item.system?.trait || "agi").toLowerCase();
    const actorTrait = traitKey === "void"
      ? toInt(this.actor.system?.rings?.void?.rank)
      : toInt(this.actor.system?.traits?.[traitKey]);

    Dice.SkillRoll({
      actor: this.actor,
      woundPenalty: readWoundPenalty(this.actor),
      actorTrait,
      skillRank: toInt(item.system?.rank),
      skillName: item.name,
      askForOptions: event.shiftKey,
      npc: true,
      skillTrait: traitKey
    });
  }

  /* Item CRUD & inline edits ---------------------------------------------- */

  async _onItemCreate(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    let itemData = {};

    if (type === "equipment" || type === "spell") {
      const opts = await Chat.GetItemOptions(type);
      if (opts?.cancelled) return;
      itemData = { name: opts.name, type: opts.type };
    } else {
      itemData = { name: game.i18n.localize("l5r4.ui.common.new"), type };
    }
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  _onItemEdit(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".item");
    this.actor.items.get(row?.dataset.itemId)?.sheet?.render(true);
  }

  _onItemDelete(event) {
    event.preventDefault();
    const row = event.currentTarget.closest(".item");
    const id = row?.dataset.itemId;
    if (id) return this.actor.deleteEmbeddedDocuments("Item", [id]);
  }

  _onInlineItemEdit(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const row = el.closest(".item");
    const id = row?.dataset.itemId;
    const field = el.dataset.field;
    if (!id || !field) return;

    // dtype coercion if provided
    let value = el.value;
    switch (el.dataset.dtype) {
      case "Integer": value = toInt(value, 0); break;
      case "Number":  value = Number.isFinite(+value) ? +value : 0; break;
      case "Boolean": {
        const s = String(value).toLowerCase();
        value = s === "true" || s === "1" || s === "on" || s === "yes";
        break;
      }
      default: value = String(value ?? "");
    }

    return this.actor.items.get(id)?.update({ [field]: value });
  }

  /**
   * Toggle inline expansion of an item row to reveal its details.
   * @param {MouseEvent} event
   * @param {HTMLElement} element
   */
  _onItemExpand(event, element) {
    event?.preventDefault?.();
    const row = /** @type {HTMLElement|null} */ (element.closest(".item"));
    if (!row) return;
    row.classList.toggle("is-expanded");
    const icon = /** @type {HTMLElement|null} */ (element.querySelector("i"));
    if (icon) {
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-up");
    }
  }

  /* Submit-time guard ------------------------------------------------------ */

  /** Keep the name non-empty on submit to match PC sheet robustness. */
  _prepareSubmitData(event, form, formData, updateData={}) {
    const submit = super._prepareSubmitData(event, form, formData, updateData);
    if (!String(submit.name ?? "").trim()) submit.name = this.actor.name || "Unnamed";
    return submit;
  }
}
