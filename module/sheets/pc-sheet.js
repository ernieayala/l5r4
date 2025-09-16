/**
 * L5R4 PC Sheet — ApplicationV2 conversion (Foundry VTT v13+)
 * - Migrated from Application V1 (FormApplication/ActorSheet) to ActorSheetV2
 * - Uses HandlebarsApplicationMixin for template rendering
 * - Replaces getData -> _prepareContext, activateListeners -> _onRender
 * - Keeps drag/drop (clan/family) with TextEditor.getDragEventData
 * - Enforces Family prefix and bonus at submit-time via _prepareSubmitData/_processSubmitData
 *
 * API refs: https://foundryvtt.com/api/
 * - ActorSheetV2: https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html
 * - DocumentSheetV2: https://foundryvtt.com/api/classes/foundry.applications.api.DocumentSheetV2.html
 * - TextEditor.getDragEventData: https://foundryvtt.com/api/classes/foundry.applications.ux.TextEditor.html#static-getDragEventData
 */

import { SYS_ID, TEMPLATE } from "../config.js";
import { T, getSortPref, on, setSortPref, sortWithPref, toInt, applyRankPointsDelta } from "../utils.js";

import * as Dice from "../services/dice.js";
import * as Chat from "../services/chat.js";
import { BaseActorSheet } from "./base-actor-sheet.js";

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
 * Normalize a Family trait label/key into a system trait key ("ref", "awa", ...).
 * Accepts:
 *  - short keys ("ref")
 *  - English labels ("Reflexes")
 *  - i18n keys ("l5r4.traits.ref")
 *  - localized labels in other languages (via game.i18n.localize)
 */
const normalizeTraitKey = (raw) => {
  const known = ["sta","wil","str","per","ref","awa","agi","int"];
  if (raw == null) return "";
  let k = String(raw).trim();

  // If given an i18n key like "l5r4.traits.ref"
  const m = /^l5r4\.mechanics\.traits\.(\w+)$/i.exec(k);
  if (m && known.includes(m[1].toLowerCase())) return m[1].toLowerCase();

  // Plain short key?
  if (known.includes(k.toLowerCase())) return k.toLowerCase();

  // English labels -> keys
  const english = {
    stamina: "sta",
    willpower: "wil",
    strength: "str",
    perception: "per",
    reflexes: "ref",
    awareness: "awa",
    agility: "agi",
    intelligence: "int"
  };
  if (english[k.toLowerCase()]) return english[k.toLowerCase()];

  // Localized labels (any language): compare against localized names
  try {
    for (const key of known) {
      const label = game.i18n?.localize?.(`l5r4.mechanics.traits.${key}`) ?? "";
      if (label && label.toLowerCase() === k.toLowerCase()) return key;
    }
  } catch (_) { /* ignore if i18n not ready here */ }

  return "";
};

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
      scrollable: [".tabs-content"],
      submitOnChange: true,
      submitOnClose: true
    }
  };

  /**
   * Provide a minimal header menu: Configure + our toggle.
   * @returns {import("types/foundry/common/applications/api").ApplicationHeaderControlsEntry[]}
   */
  _getHeaderControls() {
    const isLocked = this.actor.getFlag(SYS_ID, "sheetLocked") ?? false;

    // This definitive array *replaces* the default Foundry controls.
    return [
      {
        action: "toggle-sheet-lock",
        icon: isLocked ? "fas fa-lock" : "fas fa-unlock-alt",
        label: game.i18n.localize(isLocked ? "l5r4.ui.sheets.unlock" : "l5r4.ui.sheets.lock"),
        toggle: true,
        active: isLocked
      },
      {
        action: "configureSheet",
        icon: "fas fa-cog",
        label: game.i18n.localize("SHEET.ConfigureSheet")
      }
    ];
  }

  /** @inheritdoc */
  _onAction(action, event, element) {
    switch (action) {
      case "clan-link": return this._onClanLink(event);
      case "family-open": return this._onFamilyOpen(event);
      case "inline-edit": return this._onInlineItemEdit(event, element);
      case "item-chat": return this._onAdvHeaderToChat(event, element);
      case "item-create": return this._onItemCreate(event, element);
      case "item-delete": return this._onItemDelete(event, element);
      case "item-edit": return this._onItemEdit(event, element);
      case "item-expand": return this._onItemExpand(event, element);
      case "item-roll": return this._onItemRoll(event, element);
      case "item-sort-by": return this._onSkillHeaderSort(event, element);
      case "ring-rank-void": return this._onVoidAdjust(event, element, +1);
      case "roll-ring": return this._onRingRoll(event, element);
      case "roll-skill": return this._onSkillRoll(event, element);
      case "roll-trait": return this._onTraitRoll(event, element);
      case "roll-weapon": return this._onWeaponRoll(event, element);
      case "rp-step": return this._onRankPointsStep(event, element, +0.1);
      case "school-link": return this._onSchoolLink(event);
      case "spell-slot": return this._onSpellSlotAdjust(event, element, +1);
      case "trait-rank": return this._onTraitAdjust(event, element, +1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, +1);
      case "xp-add": return this._onXpAdd(event);
      case "xp-log": return this._onXpLog(event);
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
    if (!BIO_TYPES.has(type)) return super._onDrop(event);

    // Enforce singleton: remove prior of same type
    try {
      const prior = (this.actor.items?.contents ?? this.actor.items).filter(i => i.type === type);
      if (prior.length) await this.actor.deleteEmbeddedDocuments("Item", prior.map(i => i.id));
    } catch (err) {
      console.warn("L5R4", "Failed to delete prior bio item(s)", { type, err });
    }

    let newest = null;
    try {
      const [created] = await this.actor.createEmbeddedDocuments("Item", [itemDoc.toObject()]);
      newest = created ?? null;
    } catch (err) {
      console.warn("L5R4", "Failed to embed bio item on drop", { type, err });
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
      catch (err) { console.warn("L5R4", "actor.update failed after bio drop", { type, updates, err }); }
    }
  }


  /**
   * Render and return the actual <form> as the "form" part so DocumentSheetV2
   * can auto-handle submitOnChange and submitOnClose.
   * @see https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html#_renderHTML
   * @returns {Promise<Record<string, HTMLElement>>}
   */
  /** @override get classes to dynamically add is-locked */

  /**
   * Toggle the sheet's locked state.
   * @returns {Promise<void>}
   */
  async _onToggleSheetLock() {
    const currentLockState = this.actor.getFlag(SYS_ID, "sheetLocked") ?? false;
    const newLockState = !currentLockState;
    await this.actor.setFlag(SYS_ID, "sheetLocked", newLockState);

    // Manually toggle the class on the sheet element for instant feedback.
    this.element.classList.toggle("is-locked", newLockState);

    // Manually update the button's appearance.
    const button = this.element.closest(".app.window-app")?.querySelector('[data-action="toggle-sheet-lock"]');
    if (button) {
      const icon = button.querySelector("i");
      if (icon) {
        icon.className = newLockState ? "fas fa-lock" : "fas fa-unlock-alt";
      }
      // The label is a text node, not an element. We need to find and update it.
      const textNode = Array.from(button.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) {
        textNode.nodeValue = ` ${game.i18n.localize(newLockState ? "l5r4.ui.sheets.unlock" : "l5r4.ui.sheets.lock")}`;
      }
    }

    // A full render is still good practice to ensure all state is consistent,
    // but the manual updates provide the immediate visual change.
    this.render();
  }

  async _renderHTML(context, _options) {
    context = { ...context, usetabs: false };
    const path = TEMPLATE("actor/pc.hbs");
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

  /** Configure tab groups */
  static TABS = {
    primary: {
      initial: "skill-tab",
      tabs: [
        { id: "skill-tab", label: "l5r4.ui.sheets.skills" },
        { id: "equipment-tab", label: "l5r4.ui.sheets.equipment" },
        // Your template shows a combined label Tech/Spells; any one key is fine here.
        { id: "spells-techniques-tab", label: "l5r4.ui.sheets.spells" },
        { id: "advantages-tab", label: "l5r4.ui.sheets.advantages" },
        { id: "notes-tab", label: "l5r4.ui.sheets.notes" }
      ]
    }
  };

  /* ---------------------------------- */
  /* Data Prep                           */
  /* ---------------------------------- */

  /**
   * @override
   * Prepare the context passed to the Handlebars template.
   * Foundry v13 context hook: https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html#_prepareContext
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

    // Skills sorted by user preference (name, rank, trait, type, emphasis)
    const skills = (() => {
      const cols = {
        name:     it => String(it?.name ?? ""),
        rank:     it => Number(it?.system?.rank ?? 0) || 0,
        trait:    it => {
          const raw = String(it?.system?.trait ?? "").toLowerCase();
          const key = raw && /^l5r4\.mechanics\.traits\./.test(raw) ? raw : (raw ? `l5r4.mechanics.traits.${raw}` : "");
          const loc = key ? game.i18n?.localize?.(key) : "";
          return String((loc && loc !== key) ? loc : (it?.system?.trait ?? ""));
        },
        type:     it => String(it?.system?.type ?? ""),
        emphasis: it => String(it?.system?.emphasis ?? "")
      };
      const pref = getSortPref(actorObj.id, "skills", Object.keys(cols), "name");
      return sortWithPref(byType("skill"), cols, pref, game.i18n?.lang);
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

    /** Build mastery list from skill ranks */
    const masteries = [];
    for (const s of skills) {
      const r = toInt(s.system?.rank);
      if (s.system?.mastery3 && r >= 3) masteries.push({ _id: s.id, name: `${s.name} 3`, mastery: s.system.mastery3 });
      if (s.system?.mastery5 && r >= 5) masteries.push({ _id: s.id, name: `${s.name} 5`, mastery: s.system.mastery5 });
      if (s.system?.mastery7 && r >= 7) masteries.push({ _id: s.id, name: `${s.name} 7`, mastery: s.system.mastery7 });
    }

    /**
     * Effective traits for display: base + Family.
     * Prefer the live Family item via uuid; fall back to stored flag.
     * Mirrors Actor logic so UI and rolls stay consistent.
     * @see https://foundryvtt.com/api/functions/global.html#fromUuidSync
     */
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

    // Prefer document-owned _derived; fallback to legacy derived
    let traitsEff = foundry.utils.duplicate(
      this.actor.system?._derived?.traitsEff ?? this.actor.system?.derived?.traitsEff ?? {}
    );
    if (!Object.keys(traitsEff).length) {
      // Reassign the same variable (no shadowing)
      traitsEff = foundry.utils.duplicate(
        this.actor.system?._derived?.traitsEff ?? this.actor.system?.derived?.traitsEff ?? {}
      );
      if (!Object.keys(traitsEff).length) {
        console.warn("L5R4", "traitsEff missing in actor.system._derived; check prepareDerivedData()");
      }
    }

    const bioClan   = byType("clan")[0]   ?? null;
    const bioFamily = byType("family")[0] ?? null;
    const bioSchool = byType("school")[0] ?? null;

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
      usetabs: false,
      /**
       * One combined, sorted list for the Advantages/Disadvantages panel.
       * Primary honors direction; tie-breakers ascend.
       */
      get advDisList() {
        const list = [...byType("advantage"), ...byType("disadvantage")];
        const cols = {
          name:  (it) => String(it?.name ?? ""),
          type:  (it) => String(game.i18n?.localize?.(`l5r4.character.advantages.${it?.system?.type ?? ""}`) ?? ""),
          cost:  (it) => Number(it?.system?.cost ?? 0) || 0,
          item:  (it) => String(it.type ?? "")
        };
        const pref = getSortPref(actorObj.id, "advDis", Object.keys(cols), "name");
        return sortWithPref(list, cols, pref, game.i18n?.lang);
      },
      // Item buckets used elsewhere
      armors: sortWithPref(byType("armor"), { name:(it)=>String(it?.name??""), bonus:(it)=>Number(it?.system?.bonus??0)||0, reduction:(it)=>Number(it?.system?.reduction??0)||0, equipped:(it)=>it?.system?.equipped?1:0 }, getSortPref(actorObj.id, "armors", ["name","bonus","reduction","equipped"], "name"), game.i18n?.lang),
      bows:   sortWithPref(byType("bow"), {   name:(it)=>String(it?.name??""), damage:(it)=> (toInt(it?.system?.damageRoll)*10)+toInt(it?.system?.damageKeep), size:(it)=>String(it?.system?.size??"") }, getSortPref(actorObj.id, "weapons", ["name","damage","size"], "name"), game.i18n?.lang),
      disadvantages: byType("disadvantage"),
      items: sortWithPref(all.filter((i) => i.type === "item" || i.type === "commonItem"), { name:(it)=>String(it?.name??"") }, getSortPref(actorObj.id, "items", ["name"], "name"), game.i18n?.lang),
      katas: byType("kata"),
      kihos: byType("kiho"),
      skills,
      spells,
      tattoos: byType("tattoo"),
      techniques: byType("technique"),
      weapons: sortWithPref(byType("weapon"), { name:(it)=>String(it?.name??""), damage:(it)=> (toInt(it?.system?.damageRoll)*10)+toInt(it?.system?.damageKeep), size:(it)=>String(it?.system?.size??"") }, getSortPref(actorObj.id, "weapons", ["name","damage","size"], "name"), game.i18n?.lang),
      masteries
    };
  }

  /** Bind UI events (replaces activateListeners) */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;

    // Find all buttons with the lock action and bind directly
    setTimeout(() => {
      const lockButtons = document.querySelectorAll('[data-action="toggle-sheet-lock"]');
      lockButtons.forEach((btn) => {
        if (!btn.dataset.l5r4Listener) {
          btn.dataset.l5r4Listener = "true";
          btn.addEventListener("click", (ev) => {
            ev.preventDefault();
            this._onToggleSheetLock();
          });
        }
      });
    }, 200);

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
            console.warn("L5R4", "PC Sheet: toggle-is-editable failed", { err });
          }
        });

        // Put it first, before the kebab.
        controls.insertBefore(btn, controls.firstElementChild);
      }
    } catch (err) {
      console.warn("L5R4", "PC Sheet: header control injection failed", { err });
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
    on(root, ".item-list.-header .item-sort-by", "click", (ev, el) => this._onSortClick(ev, (el)));

    on(root, "[data-action='rp-step']", "wheel", (ev, el) => {
      ev.preventDefault();
      const dir = (ev.deltaY || 0) > 0 ? -0.1 : +0.1;
      this._onRankPointsStep(ev, el, dir);
    });

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

    // Experience actions
    on(root, "[data-action='xp-add']", "click", (ev) => this._onXpAdd(ev));
    on(root, "[data-action='xp-log']", "click", (ev) => this._onXpLog(ev));

    /**
     * Right-click context menu for item rows (Foundry v13 API).
     * @see https://foundryvtt.com/api/classes/foundry.applications.ux.ContextMenu.html
     */
    try {
      // Avoid duplicate menus on re-render. Only close if a menu element exists.
      if (this._itemContextMenu?.element) {
        try {
          await this._itemContextMenu.close({ animate: false });
        } catch (err) {
          console.warn("L5R4", "ContextMenu.close failed (stale element)", { err });
        }
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
              console.warn("L5R4", "actor.deleteEmbeddedDocuments failed in PcSheet", { err });
            }
          }
        }
      ], { jQuery: false });
    } catch (e) {
      console.warn("L5R4PcSheet: context menu init failed", e);
    }
  }



  /**
   * Generic sorter for any header with data-scope and <a class="item-sort-by" data-sortby="...">
   * Stores per-user, per-actor preferences.
   * @param {MouseEvent} event
   * @param {HTMLElement} [el]
   * @see https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#getFlag
   * @see https://foundryvtt.com/api/classes/foundry.documents.BaseUser.html#setFlag
   */
  async _onSortClick(event, el) {
    event.preventDefault();
    el = /** @type {HTMLElement} */ (el || event.currentTarget);
    const header = /** @type {HTMLElement|null} */ (el.closest('.item-list.-header'));
    const scope = String(header?.dataset?.scope || "advDis");
    const key = String(el?.dataset?.sortby || "name");
    const allowed = {
      advDis:     ["name","type","cost","item"],
      armors:     ["name","bonus","reduction","equipped"],
      weapons:    ["name","damage","size"],
      items:      ["name"],
      skills:     ["name","rank","trait","emphasis"],
      spells:     ["name","ring","mastery","range","aoe","duration"],
      techniques: ["name"],
      katas:      ["name","ring","mastery"],
      kihos:      ["name","ring","mastery","type"],
      tattoos:    ["name"]
    }[scope] ?? ["name"];
    const cur = getSortPref(this.actor.id, scope, allowed, allowed[0]);
    await setSortPref(this.actor.id, scope, key, { toggleFrom: cur });
    this.render();
  }

  /**
   * Adjust a Trait rank by clicking its displayed value.
   * Left click: +1. Right click: -1.
   * Caps:
   *  - Max effective Trait = 9
   *  - Min effective Trait = 2, or 2 + Family bonus when that Trait is boosted by Family
   *
   * The sheet stores base ranks under system.traits.*, and applies Family in derived data.
   * We clamp the *effective* rank, then convert back to base before update.
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
    const effMin = 2 + Math.max(0, fam); // if Family gives +1 to Strength, min displayed is 3
    const effMax = 9;                    // global cap

    const wantEff = effNow + (delta > 0 ? 1 : -1);
    const nextEff = Math.min(effMax, Math.max(effMin, wantEff));
    if (nextEff === effNow) return; // no change

    const nextBase = nextEff - fam;

    // Update the Actor’s base Trait
    try {
      await this.actor.update({ [`system.traits.${key}`]: nextBase }, { diff: true });
    } catch (err) {
      console.warn("L5R4", "actor.update failed in PcSheet", { err });
    }
  }

    /**
     * Adjust the Void Ring via click.
     * Left click adds 1. Right click subtracts 1.
     * Min 2. Max 9.
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

      const cur = Number(this.actor.system?.rings?.void?.rank ?? 0) || 0;
      const min = 2;
      const max = 9;

      const next = Math.min(max, Math.max(min, cur + (delta > 0 ? 1 : -1)));
      if (next === cur) return;

      try {
        await this.actor.update({ "system.rings.void.rank": next }, { diff: true });
      } catch (err) {
        console.warn("L5R4", "actor.update failed in PcSheet", { err });
      }
    }

  /**
   * Render the 9-dot Void Points control by swapping ○/● up to current value.
   * Safe to call after every render.
   * @param {HTMLElement} root
   */
  _paintVoidPointsDots(root) {
    const node = root.querySelector(".void-points-dots");
    if (!node) return;
    const cur = Number(this.actor.system?.rings?.void?.value ?? 0) || 0;
    node.querySelectorAll(".void-dot").forEach((d) => {
      const idx = Number(d.getAttribute("data-idx") || "0") || 0;
      d.classList.toggle("-filled", idx <= cur);
    });
    node.setAttribute("data-value", String(cur));
  }


  /**
   * Adjust Void Points via clicks on the 9-dot control.
   * Right click = +1, Left click = -1, clamped to 0..9.
   * Uses Document.update to persist the value.
   * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
   *
   * @param {MouseEvent} event
   * @param {HTMLElement} element - .void-points-dots
   * @param {number} delta - +1 or -1 (we pass +1 for contextmenu, -1 for click)
   */
  async _onVoidPointsAdjust(event, element, delta) {
    event?.preventDefault?.();

    const cur = Number(this.actor.system?.rings?.void?.value ?? 0) || 0;
    const next = Math.min(9, Math.max(0, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;

    try {
      await this.actor.update({ "system.rings.void.value": next }, { diff: true });
    } catch (err) {
      console.warn("L5R4", "actor.update failed in PcSheet", { err });
    }

    // Repaint from authoritative actor state to avoid stale DOM edge-cases
    this._paintVoidPointsDots(this.element);
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
      console.warn("L5R4", "Spell slot adjust failed", { err, element, delta });
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
      console.warn("L5R4", "actor.update failed in PcSheet", { err });
    }
  }

  /* ---------------------------------- */
  /* Drag & Drop                         */
  /* ---------------------------------- */

  async _handleClanDrop(itemDoc) {
    const clanName = String(itemDoc.name ?? "").trim();
    const data = { "system.clan": clanName };
    data[`flags.${SYS_ID}.clanItemUuid`] = itemDoc.uuid;
    try {
      await this.actor.update(data);
    } catch (err) {
      console.warn("L5R4", "actor.update failed in PcSheet", { err });
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
      console.warn("L5R4", "actor.update failed in PcSheet _handleSchoolDrop", { err });
    }
  }

  /**
   * Handle Family drop without renaming the Actor.
   * Kept for backwards compatibility; primary flow embeds via _onDrop above.
   */
  async _handleFamilyDrop(itemDoc) {
    try {
      const prior = (this.actor.items?.contents ?? this.actor.items).filter(i => i.type === "family");
      if (prior.length) await this.actor.deleteEmbeddedDocuments("Item", prior.map(i => i.id));
    } catch (err) {
      console.warn("L5R4", "Failed to delete stale Family items on drop", { err });
    }

    try {
      await this.actor.update({
        [`flags.${SYS_ID}.familyItemUuid`]: itemDoc.uuid,
        [`flags.${SYS_ID}.familyName`]: String(itemDoc.name ?? "")
        // No name mutations here anymore.
      });
    } catch (err) {
      console.warn("L5R4", "actor.update failed in _handleFamilyDrop", { err });
    }
  }

  /**
   * If you have a "clear family" UI action, also remove embedded Family items
   * so their transferred AEs are removed immediately.
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
      console.warn("L5R4", "actor.update failed in _onFamilyClear", { err });
    }
  }

  /* ---------------------------------- */
  /* Rolls                               */
  /* ---------------------------------- */

  _onItemRoll(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const rid = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const item = rid ? this.actor.items.get(rid) : null;
    if (!item) return;

    return Chat.SimpleItemChat(this.actor, item);
  }

  /**
   * Handle Ring rolls from the rings wheel.
   * @param {MouseEvent} event
   * @param {HTMLElement} el - The <a.ring-roll> element found by the delegated listener.
   */
  _onRingRoll(event, el) {
    event.preventDefault();
    /** Localized ring name for chat flavor. */
    const ringName = el.dataset?.ringName || T(`l5r4.mechanics.rings.${el.dataset?.systemRing || "void"}`);
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
      actor: this.actor
    });
  }

  /**
   * Trait roll handler for delegated clicks.
   * Reads the short key from `.trait-rank[data-trait]`, with safe fallbacks.
   * @param {Event} event
   * @param {HTMLElement} el - The clicked `.trait-roll` element (from delegation).
   * @see https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html
   */
  _onTraitRoll(event, el) {
    event.preventDefault();
    const block = el.closest(".trait");
    const traitKey = normalizeTraitKey(
      block?.querySelector(".trait-rank")?.dataset.trait
      || el.dataset.traitName
      || "ref"
    );

    const val = toInt(
      this.actor.system?._derived?.traitsEff?.[traitKey],
      toInt(this.actor.system?.traits?.[traitKey])
    );

    return Dice.TraitRoll({
      traitRank: val,
      traitName: traitKey,
      askForOptions: event.shiftKey,
      actor: this.actor
    });
  }

  /**
   * Weapon roll handler — rolls the weapon's stored damage (system.damageRoll/system.damageKeep).
   * Shift-click to open options if the setting allows it.
   * @param {MouseEvent} event
   * @param {HTMLElement} element - The clicked element in the weapon row.
   * @see https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html
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

  _onSkillRoll(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const item = row ? this.actor.items.get(row.dataset.itemId) : null;
    if (!item) return;

    const traitKey = normalizeTraitKey(item.system?.trait);
    if (!traitKey) {
      console.warn("[L5R4] Skill is missing system.trait; cannot roll:", item?.name);
      return;
    }
    // Prefer Actor-derived effective trait; fallback resolves from actor if missing.
    const traitVal =
      toInt(this.actor.system?._derived?.traitsEff?.[traitKey]) ??
      toInt(this.actor.system?.traits?.[traitKey]);

    Dice.SkillRoll({
      actor: this.actor,
      actorTrait: traitVal,
      skillName: item.name,
      skillTrait: traitKey,
      skillRank: toInt(item.system?.rank),
      askForOptions: event.shiftKey
    });
  }

  /* ---------------------------------- */
  /* Item CRUD                           */
  /* ---------------------------------- */

  /**
   * Create a new embedded Item from a "+" button on the sheet.
   * For the Advantages section, prompt for Advantage vs. Disadvantage first.
   *
   * Foundry API:
   * - Actor#createEmbeddedDocuments: https://foundryvtt.com/api/classes/foundry.abstract.Document.html#createEmbeddedDocuments
   * - DialogV2#prompt: https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html#prompt
   *
   * @param {Event} event   The originating click event.
   * @param {HTMLElement} element  The clicked anchor element with data-type.
   */
  async _onItemCreate(event, element) {
    event.preventDefault();
    const type = element.dataset.type;

    // Advantage or Disadvantage dialog
    if (type === "advantage") {
      const result = await Chat.getItemOptions("advantage");
      if (!result || result.cancelled) return;
      const { name, type: chosenType } = result; // "advantage" | "disadvantage"
      return this.actor.createEmbeddedDocuments("Item", [{ name, type: chosenType }]);
    }

    /**
     * Equipment dialog - lets the user choose a valid subtype.
     * Uses templates/chat/create-equipment-dialog.hbs via Chat.getItemOptions("equipment")
     */
    if (type === "equipment") {
      const result = await Chat.getItemOptions("equipment");
      if (!result || result.cancelled) return;
      const { name, type: chosenType } = result; // "armor" | "bow" | "item" | "weapon"
      return this.actor.createEmbeddedDocuments("Item", [{ name, type: chosenType }]);
    }

    // Optional: also route "spell" through its chooser (technique/spell/kata/kiho/tattoo)
    if (type === "spell") {
      const result = await Chat.getItemOptions("spell");
      if (!result || result.cancelled) return;
      const { name, type: chosenType } = result; // "technique" | "spell" | "kata" | "kiho" | "tattoo"
      return this.actor.createEmbeddedDocuments("Item", [{ name, type: chosenType }]);
    }

    // Default: create the exact typed item
    return this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize(`l5r4.ui.common.new`) + ` ${type}` || `New ${type}`,
      type
    }]);
  }


  _onItemEdit(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const rid = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const item = rid ? this.actor.items.get(rid) : null;
    item?.sheet?.render(true);
  }

  async _onItemDelete(event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id  = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    if (!id) return;
    try {
      await this.actor.deleteEmbeddedDocuments("Item", [id]);
    } catch (err) {
      console.warn("L5R4", "actor.deleteEmbeddedDocuments failed in PcSheet", { err });
    }
  }

  /**
   * Inline edit for common item fields shown on the PC sheet (rank, TN mods, etc).
   * @param {Event} event
   * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
   */
  _onInlineItemEdit(event, element) {
    event.preventDefault();
    const el = /** @type {HTMLInputElement} */ (element);
    const row = el.closest(".item");
    const id  = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    if (!id) return;

    const field = el.dataset.field;
    if (!field) return;

    // dtype coercion; support data-dtype and data-type; checkboxes use .checked
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

  /**
   * Toggle inline expansion of an item row to reveal its details.
   * Finds the closest .item row and toggles the "is-expanded" class.
   * @param {MouseEvent} event
   * @param {HTMLElement} element - The clicked control within the item row.
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

  /* ---------------------------------- */
  /* Experience: manual adjustments and log */
  /* ---------------------------------- */

  /**
   * Prompt to add or remove XP manually.
   * Stores entries under flags[SYS_ID].xpManual.
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
      console.warn("L5R4", "actor.setFlag failed in PcSheet", { err });
    }
  }

  /**
   * Show a simple breakdown of current XP.
   * Uses computed system._xp and the manual log from flags.
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
      <p><b>${game.i18n.localize("l5r4.character.experience.usedTotal")}:</b> ${xp.spent ?? 0} / ${xp.total ?? 40} <i>(${(xp.available ?? (xp.total ?? 40) - (xp.spent ?? 0))} ${game.i18n.localize("l5r4.ui.common.left") ?? "left"})</i></p>
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
      label: game.i18n.localize("Close"),
      callback: () => true
    });
  }

  /* ---------------------------------- */
  /* Clan / Family helpers               */
  /* ---------------------------------- */

  async _onClanLink(event) {
    event.preventDefault();
    const uuid = event.currentTarget?.dataset?.uuid || this.actor.getFlag(SYS_ID, "clanItemUuid");
    if (!uuid) return;
    const doc = await fromUuid(uuid);
    doc?.sheet?.render(true);
  }

  async _onClanClear(event) {
    event.preventDefault();
    try {
      await this.actor.update({
        "system.clan": "",
        [`flags.${SYS_ID}.clanItemUuid`]: null
      });
    } catch (err) {
      console.warn("L5R4", "actor.update failed in PcSheet", { err });
    }
  }

  /**
   * Open the linked School item sheet by UUID.
   * @param {MouseEvent} event
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
   * Clear the School selection on the Actor and remove the stored UUID flag.
   * @param {MouseEvent} event
   */
  async _onSchoolClear(event) {
    event.preventDefault();
    try {
      await this.actor.update({
        "system.school": "",
        [`flags.${SYS_ID}.schoolItemUuid`]: null
      });
    } catch (err) {
      console.warn("L5R4", "actor.update failed in PcSheet _onSchoolClear", { err });
    }
  }

  async _onFamilyOpen(event) {
    event.preventDefault();
    const uuid = event.currentTarget?.dataset?.uuid || this.actor.getFlag(SYS_ID, "familyItemUuid");
    if (!uuid) return;
    const doc = await fromUuid(uuid);
    doc?.sheet?.render(true);
  }

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
      console.warn("L5R4", "actor.update failed in PcSheet", { err });
    }
  }

  /**
   * Extract "BaseName" from "Family BaseName" (case-insensitive).
   * @param {string} current
   * @param {string} fam
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
   * Convert trait inputs that display "effective" (base + family) back to base before submit.
   * We use Actor flags directly (sync) so this stays lightweight.
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

  /** Side-effects for submit (set family flags) then delegate to super. */
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
   * Sort skills by the clicked header and persist using each Item's integer `sort`.
   * Keeps the existing "sort bins" so non-skill items don't get interleaved.
   *
   * @param {MouseEvent} event
   * @param {HTMLElement} el  <a class="item-sort-by" data-sortby="name|rank|trait|type|school|emphasis">
   *
   * Uses standard Foundry document updates:
   * - ApplicationV2/ActorSheetV2 listener attach point: _onRender. :contentReference[oaicite:0]{index=0}
   * - Update embedded Items on an Actor (inherited from Document): updateEmbeddedDocuments. :contentReference[oaicite:1]{index=1}
   */
  async _onSkillHeaderSort(event, el) {
    event.preventDefault();

    const key = el.dataset.sortby ?? "name";
    // Toggle direction per-header: asc ⇄ desc
    const dir = (el.dataset.dir = el.dataset.dir === "asc" ? "desc" : "asc");
    const asc = dir === "asc" ? 1 : -1;

    // Current skills on the Actor
    const skills = this.actor.items.filter(i => i.type === "skill");

    // Preserve existing numeric "sort bins" so other item types stay in place.
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

    // Reassign the existing bins to the new order; fall back to spaced ints if needed.
    const updates = sorted.map((it, i) => ({ _id: it.id, sort: bins[i] ?? ((i + 1) * 10) }));

    if (updates.length) {
      try {
        await this.actor.updateEmbeddedDocuments("Item", updates);
      } catch (err) {
        console.warn("L5R4", "actor.updateEmbeddedDocuments failed in PcSheet", { err });
      }
      // Optional: tiny visual cue for the active header
      for (const a of this.element.querySelectorAll(".skills-sort .item-sort-by")) {
        a.classList.toggle("is-active", a === el);
        if (a !== el) a.removeAttribute("data-dir");
      }
    }
  }

  /**
   * Post an Advantage/Disadvantage as a chat card when its header (name) is clicked.
   * Uses Item#roll(), which renders the appropriate partial and calls ChatMessage.create().
   * @see https://foundryvtt.com/api/ChatMessage.html#create
   * @param {MouseEvent} ev
   * @param {HTMLElement} el - The clicked <a.item-chat>.
   */
  async _onAdvHeaderToChat(ev, el) {
    ev.preventDefault();

    // Walk up to the .item container that carries data-document-id
    const row = el.closest(".item");
    const id  = row?.dataset?.documentId || row?.dataset?.itemId;
    if (!id) return;

    const item = this.actor?.items?.get(id);
    if (!item) return;

    // Leverage the system's existing chat-card flow.
    await item.roll();
  }

  /**
   * Adjust a Rank/Points pair via a single chip control.
   * Left-click increments by +0.1, right-click decrements by -0.1.
   * Holding Shift changes step to +/-1.0. Mouse wheel adjusts by 0.1.
   * @param {MouseEvent|WheelEvent} event
   * @param {HTMLElement} el - the clicked chip element with data-key
   * @param {number} baseDelta - default delta in decimal units (0.1 or -0.1)
   * @returns {Promise<void>}
   * @see https://foundryvtt.com/api/classes/foundry.documents.BaseActor.html#update
   */
  async _onRankPointsStep(event, el, baseDelta) {
    try {
      const key = String(el?.dataset?.key || "");
      if (!key) return;

      const sys = this.actor.system ?? {};
      const cur = {
        rank: Number(sys?.[key]?.rank ?? 0) || 0,
        points: Number(sys?.[key]?.points ?? 0) || 0
      };

      const step = event?.shiftKey ? (baseDelta > 0 ? +1 : -1) : baseDelta;
      const next = applyRankPointsDelta(cur, step, 0, 10);

      const update = {};
      update[`system.${key}.rank`] = next.rank;
      update[`system.${key}.points`] = next.points;

      await this.actor.update(update);
    } catch (err) {
      console.warn("L5R4 PC Sheet: failed to update rank/points", { err, event, el });
    }
  }
}
