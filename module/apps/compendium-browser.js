/**
 * @module apps/compendium-browser
 * @description The compendium browser (roadmap/STAGE-15): one window over every system pack and world compendium
 * the user can see, in tabs by kind of entry, with filters. A row shows the entry's name, key numbers, and the book
 * page it cites. A row drags onto a sheet; Add puts the item on the user's character or the controlled token's actor
 * through the same path a drop takes (module/services/purchase.js, createPurchasedItem); the GM imports a creature with Import.
 */
import { BROWSER_FILTERS, BROWSER_TABS } from "../config/browser.js";
import { SYS_ID } from "../config/constants.js";
import { APP_TEMPLATES } from "../config/templates.js";
import {
  getBrowserIndexFields,
  getEntryNumbers,
  getFilteredEntries,
  getFilterOptions
} from "../utils/browser-filter.js";
import { formatPhrase, T } from "../utils/localization.js";
import { buildSourceCitation } from "../utils/rule-summary.js";
import { createPurchasedItem } from "../services/purchase.js";
import { getRollActor } from "../services/dice/resources/void-points.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** The browser, once opened. */
let browser = null;

/**
 * The compendium browser window, one per client.
 */
export default class CompendiumBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${SYS_ID}-compendium-browser`,
    classes: ["l5r4", "l5r4-compendium-browser"],
    window: {
      title: "l5r4.apps.compendiumBrowser.title",
      icon: "fa-solid fa-book-atlas",
      resizable: true
    },
    position: { width: 760, height: 660 },
    actions: {
      "select-tab": CompendiumBrowser.#onSelectTab,
      "clear-filters": CompendiumBrowser.#onClearFilters,
      "add-entry": CompendiumBrowser.#onAddEntry,
      "import-entry": CompendiumBrowser.#onImportEntry,
      "open-entry": CompendiumBrowser.#onOpenEntry
    }
  };

  // A filter change re-renders the results alone, so the search box or select being used keeps its focus and state
  static PARTS = {
    controls: { template: `systems/${SYS_ID}/templates/apps/compendium-browser.hbs` },
    results: {
      template: `systems/${SYS_ID}/templates/apps/compendium-browser-results.hbs`,
      scrollable: [".l5r4-compendium-browser-results"]
    }
  };

  /** The open tab's id. */
  tab = BROWSER_TABS[0].id;

  /** The name search. */
  search = "";

  /** Each filter's choice, by filter id, for the open tab. */
  choices = {};

  /**
   * Index rows by document name, read once while the window is open.
   * @type {Record<string, object[]>}
   */
  #entries = {};

  /**
   * The open tab.
   * @returns {object} The tab's entry in BROWSER_TABS
   */
  get currentTab() {
    return BROWSER_TABS.find(tab => tab.id === this.tab);
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const tab = this.currentTab;
    const entries = (await this.#getEntries(tab.documentName)).filter(entry =>
      tab.types.includes(entry.type)
    );
    const shown = getFilteredEntries(entries, tab, { search: this.search, choices: this.choices });
    return Object.assign(context, {
      tabs: BROWSER_TABS.map(t => ({
        id: t.id,
        label: T(`l5r4.apps.compendiumBrowser.tabs.${t.id}`),
        active: t.id === tab.id
      })),
      search: this.search,
      filters: tab.filters.map(id => {
        const filter = BROWSER_FILTERS[id];
        return {
          id,
          kind: filter.kind,
          label: T(filter.label),
          value: this.choices[id] ?? "",
          options:
            filter.kind === "select"
              ? getFilterOptions(entries, id).map(value => ({
                  value,
                  label: getOptionLabel(filter, value)
                }))
              : null
        };
      }),
      rows: shown.map(entry => {
        const numbers = getEntryNumbers(entry);
        const citation = buildSourceCitation(entry.system.source);
        return {
          ...entry,
          typeLabel: T(`TYPES.${tab.documentName}.${entry.type}`),
          numbers: numbers ? formatPhrase(numbers) : "",
          citation: citation ? formatPhrase(citation) : ""
        };
      }),
      count: shown.length,
      canAdd: tab.documentName === "Item",
      canImport: tab.documentName === "Actor" && game.user.isGM,
      documentName: tab.documentName
    });
  }

  /**
   * Wire the parts that rendered. A part that renders again replaces its elements, and its old listeners leave
   * with them.
   * @override
   */
  _onRender(context, options) {
    super._onRender(context, options);
    if (options.parts.includes("controls")) {
      this.element.querySelector("[data-browser-search]").addEventListener("input", event => {
        this.search = event.target.value;
        this.render({ parts: ["results"] });
      });
      for (const input of this.element.querySelectorAll("[data-browser-filter]")) {
        input.addEventListener("change", event => {
          this.choices[event.target.dataset.browserFilter] = event.target.value;
          this.render({ parts: ["results"] });
        });
      }
    }
    if (options.parts.includes("results")) {
      for (const row of this.element.querySelectorAll("li[data-uuid]")) {
        row.addEventListener("dragstart", event => {
          event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({ type: row.dataset.documentName, uuid: row.dataset.uuid })
          );
          // Core cancels a drag that reaches the document from an element without draggable="true", such as the
          // row's icon or name [src: client/game.mjs:2239-2245]; its own DragDrop stops the event the same way
          // [src: client/applications/ux/drag-drop.mjs:136]
          event.stopPropagation();
        });
      }
    }
  }

  /**
   * Forget the indexes read, so the next opening reads entries added to a compendium since.
   * @override
   */
  _onClose(options) {
    super._onClose(options);
    this.#entries = {};
  }

  /**
   * Open the browser, or bring it to the front.
   * @returns {Promise<CompendiumBrowser>} The rendered browser
   */
  static open() {
    browser ??= new CompendiumBrowser();
    return browser.render({ force: true });
  }

  /** Add the fields the browser reads to every Item and Actor pack index, once during init. */
  static registerIndexFields() {
    for (const documentName of ["Item", "Actor"]) {
      const config = CONFIG[documentName];
      // Core starts each list empty [src: client/config.mjs:151, :479], and a pack index reads it
      // [src: client/documents/collections/compendium-collection.mjs:263]
      config.compendiumIndexFields = [
        ...new Set([...config.compendiumIndexFields, ...getBrowserIndexFields(documentName)])
      ];
    }
  }

  /**
   * Add the browser's button to the Compendium sidebar's header. The header part re-renders on its own, so the
   * button is added again whenever it is missing.
   * @param {foundry.applications.sidebar.tabs.CompendiumDirectory} _app
   * @param {HTMLElement} element
   * @returns {Promise<void>}
   */
  static async onRenderCompendiumDirectory(_app, element) {
    // Core's header shows its own buttons only to a GM, so its class is the one anchor every user has
    // eslint-disable-next-line no-restricted-syntax -- core markup, templates/sidebar/tabs/compendiums.hbs:4
    const actions = element.querySelector(".header-actions");
    if (!actions || actions.querySelector("[data-l5r4-browser]")) {
      return;
    }
    const button = foundry.utils.parseHTML(
      await foundry.applications.handlebars.renderTemplate(APP_TEMPLATES.browserOpen)
    );
    // A second render of the header may have added the button while the template rendered
    if (actions.querySelector("[data-l5r4-browser]")) {
      return;
    }
    button.addEventListener("click", () => CompendiumBrowser.open());
    actions.append(button);
  }

  /**
   * Show another tab, with no filter chosen.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} _event
   * @param {HTMLElement} element
   */
  static async #onSelectTab(_event, element) {
    this.tab = element.dataset.tab;
    this.choices = {};
    await this.render();
  }

  /**
   * Clear the search and every filter.
   * @this {CompendiumBrowser}
   */
  static async #onClearFilters() {
    this.search = "";
    this.choices = {};
    await this.render();
  }

  /**
   * Add an item to the user's character or the controlled token's actor.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} _event
   * @param {HTMLElement} element
   */
  static async #onAddEntry(_event, element) {
    const actor = getRollActor();
    if (!actor) {
      ui.notifications?.warn(T("l5r4.apps.compendiumBrowser.noActor"));
      return;
    }
    const item = await fromUuid(element.closest("[data-uuid]").dataset.uuid);
    if (item) {
      await createPurchasedItem(actor, item.toObject());
    }
  }

  /**
   * Import a creature into the world. GMs only.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} _event
   * @param {HTMLElement} element
   */
  static async #onImportEntry(_event, element) {
    if (!game.user.isGM) {
      return;
    }
    const row = element.closest("[data-uuid]");
    const pack = game.packs.get(row.dataset.pack);
    await game.actors.importFromCompendium(pack, row.dataset.id);
  }

  /**
   * Open an entry's sheet.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} _event
   * @param {HTMLElement} element
   */
  static async #onOpenEntry(_event, element) {
    const doc = await fromUuid(element.closest("[data-uuid]").dataset.uuid);
    doc?.sheet?.render({ force: true });
  }

  /**
   * Read the index of every pack of this document type the user can see.
   * @param {"Item"|"Actor"} documentName
   * @returns {Promise<object[]>}
   */
  async #getEntries(documentName) {
    if (!this.#entries[documentName]) {
      const fields = getBrowserIndexFields(documentName);
      const rows = [];
      for (const pack of game.packs.filter(p => p.documentName === documentName && p.visible)) {
        const index = await pack.getIndex({ fields });
        for (const entry of index) {
          rows.push({
            uuid: entry.uuid,
            id: entry._id,
            pack: pack.collection,
            packTitle: pack.title,
            name: entry.name,
            type: entry.type,
            img: entry.img,
            folderName: pack.folders.get(entry.folder)?.name ?? "",
            system: entry.system ?? {}
          });
        }
      }
      this.#entries[documentName] = rows;
    }
    return this.#entries[documentName];
  }
}

/**
 * The label of a select filter's value.
 * @param {import("../config/browser.js").BrowserFilter} filter
 * @param {string} value
 * @returns {string}
 */
function getOptionLabel(filter, value) {
  if (filter.labels?.[value]) {
    return T(filter.labels[value]);
  }
  if (filter.labelPrefix) {
    return T(`${filter.labelPrefix}${value}`);
  }
  return value;
}
