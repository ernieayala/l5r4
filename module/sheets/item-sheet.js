/**
 * L5R4 Item Sheet - Foundry VTT v13
 *
 * See Foundry VTT API:
 * - ItemSheetV2: https://foundryvtt.com/api/foundry.applications.sheets.ItemSheetV2.html
 * - HandlebarsApplicationMixin: https://foundryvtt.com/api/foundry.applications.api.html
 * - TextEditor: https://foundryvtt.com/api/TextEditor.html
 */

import CONFIG_L5R4, { SYS_ID } from "../config.js";
import { on } from "../utils.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 }                = foundry.applications.sheets;
const { TextEditor }                 = foundry.applications.ux;

/* ------------------------------------------ */
/* Layout                                     */
/* ------------------------------------------ */

const WIDTH_BY_TYPE = {
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
  item: 640
};

/** Resolve a width for an arbitrary item type. */
const widthFor = (t) => WIDTH_BY_TYPE[t] ?? 640;
/** Title case helper for fallback labels. */
const titleCase = (s) => String(s ?? "").toLowerCase().replace(/\b[a-z]/g, m => m.toUpperCase());
/** Localize an Item type key to a human label. */
const typeLabel = (t) => {
  const key = `TYPES.Item.${t}`;
  return game.i18n.has?.(key) ? game.i18n.localize(key) : titleCase(t);
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
      template: `systems/${SYS_ID}/templates/item/partials/_scaffold.hbs`
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
   * Give each window a unique element id and set an initial width per item type.
   * Do not override the id getter in v13. Configure here instead.
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
   * Prepare template context. Adds enriched HTML strings for read-only blocks so
   * templates can render a <prose-mirror> in edit mode and enriched HTML in view mode.
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

    return context;
  }

  /**
   * Wire Active Effect controls using Foundry’s built-in editor.
   * Docs:
   * - ActiveEffect:       https://foundryvtt.com/api/classes/documents.ActiveEffect.html
   * - ActiveEffectConfig: https://foundryvtt.com/api/classes/foundry.applications.sheets.ActiveEffectConfig.html
   * - DocumentSheetV2:    https://foundryvtt.com/api/classes/foundry.applications.api.DocumentSheetV2.html
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
      item:         t("TYPES.Item.item")
    };
  }
}
