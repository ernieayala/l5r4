/**
 * Base Actor Sheet for L5R4 - Foundry VTT v13+
 * 
 * Provides shared functionality for all L5R4 actor sheets including:
 * - Event delegation and data-action handling
 * - Void points management with visual dots
 * - Common item CRUD operations (create, edit, delete, expand)
 * - Shared roll methods (skill, attack, damage, trait rolls)
 * - Context menu setup for item management
 * - Base trait adjustment logic
 * 
 * Extended by PC and NPC sheets for specific actor type behaviors.
 * 
 * @see https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html
 * @see https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html
 */
import { on, toInt, readWoundPenalty, normalizeTraitKey, getEffectiveTrait, extractRollParams, resolveWeaponSkillTrait } from "../utils.js";
import * as Chat from "../services/chat.js";
import * as Dice from "../services/dice.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base actor sheet class extending ActorSheetV2 with HandlebarsApplicationMixin.
 * Provides shared functionality for PC and NPC sheets without requiring
 * subclasses to implement both _renderHTML and _replaceHTML.
 */
export class BaseActorSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: [
      ...(super.DEFAULT_OPTIONS.classes ?? []).filter(c => c !== "pc" && c !== "npc"),
      "l5r4"
    ],
    form: {
      ...(super.DEFAULT_OPTIONS.form ?? {}),
      submitOnChange: true,
      submitOnClose: true
    }
  };

  /**
   * @override
   * Bind delegated events on the sheet root using data-action attributes.
   * Sets up click, contextmenu, and change event delegation.
   * Subclasses can override _onAction/_onActionContext/_onActionChange.
   * @param {object} context - Template context (unused)
   * @param {object} options - Render options (unused)
   * @returns {Promise<void>}
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    // Avoid rebinding if the same root is re-used by Foundry.
    if (this._boundRoot === root) return;
    this._boundRoot = root;
    if (!this.actor?.isOwner) return;

    // Click actions
    on(root, "[data-action]", "click", (ev, el) => {
      const action = el.getAttribute("data-action");
      if (typeof this._onAction === "function") this._onAction(action, ev, el);
    });

    // Right-click/context actions
    on(root, "[data-action]", "contextmenu", (ev, el) => {
      ev.preventDefault();
      const action = el.getAttribute("data-action");
      if (typeof this._onActionContext === "function") this._onActionContext(action, ev, el);
      else if (typeof this._onAction === "function") this._onAction(action, ev, el);
    });

    // Change actions (inline inputs/selects)
    on(root, "[data-action]", "change", (ev, el) => {
      const action = el.getAttribute("data-action");
      if (typeof this._onActionChange === "function") this._onActionChange(action, ev, el);
      else if (typeof this._onAction === "function") this._onAction(action, ev, el);
    });
  }

  /**
   * Optional generic data-action handlers for subclasses to override.
   * Called by the event delegation system when data-action elements are interacted with.
   * @param {string|null} _action - The data-action attribute value
   * @param {Event} _ev - The triggering event
   * @param {Element} _el - The element with the data-action attribute
   */
  // eslint-disable-next-line no-unused-vars
  _onAction(_action, _ev, _el) {}
  // eslint-disable-next-line no-unused-vars
  _onActionContext(_action, _ev, _el) {}
  // eslint-disable-next-line no-unused-vars
  _onActionChange(_action, _ev, _el) {}

  /* ---------------------------------- */
  /* Shared Void Points Management       */
  /* ---------------------------------- */

  /**
   * Adjust Void Points by ±1 within the range [0..9].
   * Uses Document.update to persist the value and repaints the dots.
   * @param {MouseEvent} event - The triggering mouse event
   * @param {HTMLElement} element - The void points dots container element
   * @param {number} delta - +1 (left click) or -1 (right-click)
   * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
   */
  async _onVoidPointsAdjust(event, element, delta) {
    event?.preventDefault?.();
    const cur = Number(this.actor.system?.rings?.void?.value ?? 0) || 0;
    const next = Math.min(9, Math.max(0, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;
    try {
      await this.actor.update({ "system.rings.void.value": next }, { diff: true });
    } catch (err) {
      console.warn("L5R4 Base Sheet: failed to update void points", { err });
    }
    // Repaint from authoritative actor state to avoid stale DOM edge-cases
    this._paintVoidPointsDots(this.element);
  }

  /**
   * Render the 9-dot Void Points control by toggling "-filled" class on dots.
   * Updates visual state to match current void points value. Safe to call after every render.
   * @param {HTMLElement} root - The sheet root element containing .void-points-dots
   */
  _paintVoidPointsDots(root) {
    const node = root?.querySelector?.(".void-points-dots");
    if (!node) return;
    const cur = Number(this.actor.system?.rings?.void?.value ?? 0) || 0;
    node.querySelectorAll(".void-dot").forEach(d => {
      const idx = Number(d.getAttribute("data-idx") || "0") || 0;
      d.classList.toggle("-filled", idx <= cur);
    });
    node.setAttribute("data-value", String(cur));
  }

  /* ---------------------------------- */
  /* Shared Item CRUD Operations         */
  /* ---------------------------------- */

  /**
   * Create a new embedded Item from a "+" button on the sheet.
   * For equipment, spell, and advantage types, prompts for subtype selection.
   * @param {Event} event - The originating click event
   * @param {HTMLElement} element - The clicked element with data-type attribute
   * @returns {Promise<Document[]>} Array of created item documents
   */
  async _onItemCreate(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const type = el?.dataset?.type;
    let itemData = {};

    if (type === "equipment" || type === "spell") {
      const opts = await Chat.getItemOptions(type);
      if (opts?.cancelled) return;
      itemData = { name: opts.name, type: opts.type };
    } else if (type === "advantage") {
      const result = await Chat.getItemOptions("advantage");
      if (!result || result.cancelled) return;
      const { name, type: chosenType } = result;
      itemData = { name, type: chosenType };
    } else {
      itemData = { 
        name: game.i18n.localize("l5r4.ui.common.new") || "New", 
        type 
      };
    }
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Open an item's sheet for editing by finding the item ID from the row.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} element - The clicked element within an item row
   */
  _onItemEdit(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    this.actor.items.get(id)?.sheet?.render(true);
  }

  /**
   * Delete an embedded item by finding the item ID from the row.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} element - The clicked element within an item row
   * @returns {Promise<void>}
   */
  async _onItemDelete(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    if (id) {
      try {
        await this.actor.deleteEmbeddedDocuments("Item", [id]);
      } catch (err) {
        console.warn("L5R4 Base Sheet: deleteEmbeddedDocuments failed", { err });
      }
    }
  }

  /**
   * Toggle inline expansion of an item row to reveal/hide its details.
   * Updates the chevron icon and applies the "is-expanded" class.
   * @param {MouseEvent} event - The triggering mouse event
   * @param {HTMLElement} element - The expand/collapse button element
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

  /**
   * Handle inline editing of item fields with proper dtype coercion.
   * Supports Integer, Number, Boolean, and String data types.
   * @param {Event} event - The input change event
   * @param {HTMLElement} element - The input element with data-field and data-dtype
   * @returns {Promise<Document|undefined>} Updated item document or undefined
   */
  async _onInlineItemEdit(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const field = el.dataset.field;
    if (!id || !field) return;

    // dtype coercion if provided
    let value = /** @type {HTMLInputElement|HTMLSelectElement} */ (el).value;
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
   * Post an item's card to chat when its title is clicked.
   * Calls the item's roll() method to display in chat.
   * @param {MouseEvent} ev - The click event
   * @param {HTMLElement} el - The clicked element within an item row
   * @returns {Promise<void>}
   */
  async _onItemHeaderToChat(ev, el) {
    ev.preventDefault();
    const row = el?.closest?.(".item");
    const id = row?.dataset?.documentId || row?.dataset?.itemId || row?.dataset?.id;
    if (!id) return;
    const item = this.actor?.items?.get(id);
    if (!item) return;
    try { 
      await item.roll(); 
    } catch (err) { 
      console.warn("L5R4 Base Sheet: item.roll() failed", { err, id }); 
    }
  }

  /* ---------------------------------- */
  /* Shared Context Menu Setup          */
  /* ---------------------------------- */

  /**
   * Setup right-click context menu for item rows with edit and delete options.
   * Should be called during _onRender after DOM is ready.
   * Replaces any existing context menu to avoid duplicates.
   * @param {HTMLElement} root - The sheet root element
   * @returns {Promise<void>}
   */
  async _setupItemContextMenu(root) {
    try {
      // Avoid duplicate menus on re-render
      if (this._itemContextMenu?.element) {
        try { 
          await this._itemContextMenu.close({ animate: false }); 
        } catch (_) {}
        this._itemContextMenu = null;
      }
      
      const Menu = foundry.applications.ux.ContextMenu;
      this._itemContextMenu = new Menu(root, ".item", [
        {
          name: game.i18n.localize("l5r4.ui.common.edit"),
          icon: '<i class="fas fa-edit"></i>',
          callback: (target) => {
            const el = target instanceof HTMLElement ? target : target?.[0];
            const id = el?.dataset?.itemId || el?.dataset?.documentId || el?.dataset?.id;
            this.actor.items.get(id)?.sheet?.render(true);
          }
        },
        {
          name: game.i18n.localize("l5r4.ui.common.delete"),
          icon: '<i class="fas fa-trash"></i>',
          callback: async (target) => {
            const el = target instanceof HTMLElement ? target : target?.[0];
            const id = el?.dataset?.itemId || el?.dataset?.documentId || el?.dataset?.id;
            if (!id) return;
            try { 
              await this.actor.deleteEmbeddedDocuments("Item", [id]); 
            } catch (err) { 
              console.warn("L5R4 Base Sheet: deleteEmbeddedDocuments failed", { err }); 
            }
          }
        }
      ], { jQuery: false });
    } catch (e) {
      console.warn("L5R4 Base Sheet: context menu init failed", e);
    }
  }

  /* ---------------------------------- */
  /* Shared Roll Methods                 */
  /* ---------------------------------- */

  /**
   * Shared skill roll handler for both PC and NPC sheets.
   * Automatically detects actor type and applies appropriate roll logic.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The clicked element within a skill item row
   */
  _onSkillRoll(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const item = row ? this.actor.items.get(row.dataset.itemId) : null;
    if (!item) return;

    const traitKey = normalizeTraitKey(item.system?.trait);
    if (!traitKey) {
      console.warn("[L5R4] Skill is missing system.trait; cannot roll:", item?.name);
      return;
    }
    const actorTrait = getEffectiveTrait(this.actor, traitKey);

    // Determine if this is an NPC sheet
    const isNpc = this.constructor.name.includes("Npc") || this.actor.type === "npc";

    Dice.SkillRoll({
      actor: this.actor,
      woundPenalty: readWoundPenalty(this.actor),
      actorTrait,
      skillRank: toInt(item.system?.rank),
      skillName: item.name,
      askForOptions: event.shiftKey,
      npc: isNpc,
      skillTrait: traitKey
    });
  }

  /**
   * Shared attack roll handler using extractRollParams utility.
   * Extracts roll parameters from dataset and applies trait bonuses and stance bonuses.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with roll dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  _onAttackRoll(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const params = extractRollParams(el, this.actor);
    
    // Apply stance bonuses to attack rolls
    const stanceBonuses = this._getStanceAttackBonuses();
    let rollName = `${this.actor.name}: ${params.label}`.trim();
    let description = params.description;
    
    // Add stance bonus information to description
    if (stanceBonuses.roll > 0 || stanceBonuses.keep > 0) {
      const bonusText = `+${stanceBonuses.roll}k${stanceBonuses.keep}`;
      description = description ? `${description} (Full Attack: ${bonusText})` : `Full Attack: ${bonusText}`;
    }

    return Dice.NpcRoll({
      woundPenalty: readWoundPenalty(this.actor),
      diceRoll: params.diceRoll + params.traitBonus + stanceBonuses.roll,
      diceKeep: params.diceKeep + params.traitBonus + stanceBonuses.keep,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "attack"
    });
  }

  /**
   * Get stance bonuses for attack rolls from active effects.
   * @returns {{roll: number, keep: number}} Attack roll bonuses from stances
   */
  _getStanceAttackBonuses() {
    let rollBonus = 0;
    let keepBonus = 0;

    // Check for Full Attack Stance
    for (const effect of this.actor.effects) {
      if (effect.disabled) continue;
      
      const isFullAttack = effect.statuses?.has?.("fullAttackStance") || 
                          effect.getFlag?.("core", "statusId") === "fullAttackStance";
      
      if (isFullAttack) {
        rollBonus += 2;
        keepBonus += 1;
        break; // Only one Full Attack stance can be active
      }
    }

    return { roll: rollBonus, keep: keepBonus };
  }

  /**
   * Handle weapon attack rolls using weapon skill/trait associations.
   * Uses the weapon's associated skill if the character has it, otherwise falls back to the weapon's trait.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with weapon dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  _onWeaponAttackRoll(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const weapon = id ? this.actor.items.get(id) : null;
    
    if (!weapon || (weapon.type !== "weapon" && weapon.type !== "bow")) {
      ui.notifications?.warn("No valid weapon found for attack roll");
      return;
    }

    // Resolve weapon skill/trait association
    const weaponSkill = resolveWeaponSkillTrait(this.actor, weapon);
    
    // Apply stance bonuses to attack rolls
    const stanceBonuses = this._getStanceAttackBonuses();
    
    const rollName = `${this.actor.name}: ${weapon.name} Attack`;
    const description = `${weaponSkill.description}${stanceBonuses.roll > 0 || stanceBonuses.keep > 0 ? ` (Full Attack: +${stanceBonuses.roll}k${stanceBonuses.keep})` : ''}`;

    return Dice.NpcRoll({
      woundPenalty: readWoundPenalty(this.actor),
      diceRoll: weaponSkill.rollBonus + stanceBonuses.roll,
      diceKeep: weaponSkill.keepBonus + stanceBonuses.keep,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "attack"
    });
  }

  /**
   * Shared damage roll handler using extractRollParams utility.
   * Extracts roll parameters from dataset and applies trait bonuses.
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with roll dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  _onDamageRoll(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const params = extractRollParams(el, this.actor);
    const rollName = `${this.actor.name}: ${params.label}`.trim();

    return Dice.NpcRoll({
      diceRoll: params.diceRoll + params.traitBonus,
      diceKeep: params.diceKeep + params.traitBonus,
      rollName,
      description: params.description,
      toggleOptions: event.shiftKey,
      rollType: "damage"
    });
  }

  /**
   * Shared trait roll handler for both PC and NPC sheets.
   * Automatically detects actor type and uses appropriate roll method.
   * @param {Event} event - The triggering event (shift-click for PC options)
   * @param {HTMLElement} element - The trait element with dataset attributes
   * @returns {Promise<any>} Roll result from appropriate Dice method
   */
  _onTraitRoll(event, element) {
    event.preventDefault();
    const block = element.closest(".trait");
    const traitKey = normalizeTraitKey(
      block?.querySelector(".trait-rank")?.dataset.trait
      || element.dataset.traitName
      || "ref"
    );

    const traitValue = getEffectiveTrait(this.actor, traitKey);

    // Determine if this is an NPC sheet
    const isNpc = this.constructor.name.includes("Npc") || this.actor.type === "npc";

    if (isNpc) {
      return Dice.NpcRoll({
        npc: true,
        rollName: element?.dataset?.traitName || traitKey,
        traitName: traitKey,
        traitRank: traitValue
      });
    } else {
      return Dice.TraitRoll({
        traitRank: traitValue,
        traitName: traitKey,
        askForOptions: event.shiftKey,
        actor: this.actor
      });
    }
  }

  /**
   * Base trait adjustment method with simple NPC-style logic.
   * Adjusts trait values by ±1 within [1,10] range.
   * PC sheet overrides this for complex family bonus logic.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} element - The element with data-trait attribute
   * @param {number} delta - +1 or -1 adjustment value
   * @returns {Promise<void>}
   */
  async _onTraitAdjust(event, element, delta) {
    event?.preventDefault?.();
    const key = String(element?.dataset?.trait || "").toLowerCase();
    if (!key) return;
    
    const cur = Number(this.actor.system?.traits?.[key] ?? 0) || 0;
    const next = Math.min(10, Math.max(1, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;
    
    try {
      await this.actor.update({ [`system.traits.${key}`]: next }, { diff: true });
    } catch (err) {
      console.warn("L5R4 Base Sheet: failed to update trait", { err, key, cur, next });
    }
  }
}
