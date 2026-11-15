/**
 * @module apps/compendium-browser
 * @description The compendium browser (roadmap/STAGE-15): one window over every system pack and world compendium
 * the user can see, in tabs by kind of entry, with filters. A row shows the entry's name, key numbers, and the book
 * page it cites. A row drags onto a sheet; Add puts the item on the user's character or the controlled token's actor
 * through the same path a drop takes (module/services/purchase.js, addItem); the GM imports a creature with Import.
 */

import { BROWSER_FILTERS, BROWSER_TABS } from "../config/browser.js";
import { SYS_ID } from "../config/constants.js";
import {
  browserIndexFields,
  entryNumbers,
  filterEntries,
  filterOptions
} from "../utils/browser-filter.js";
import { phraseText, T } from "../utils/localization.js";
import { sourceCitation } from "../utils/rule-summary.js";
import { addItem } from "../services/purchase.js";
import { resolveActor } from "../services/dice/resources/void-manager.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** The browser, once opened. */
let browser = null;

/**
 * The label of a select filter's value.
 * @param {import("../config/browser.js").BrowserFilter} filter
 * @param {string} value
 * @returns {string}
 */
function optionLabel(filter, value) {
  if (filter.labels?.[value]) {
    return T(filter.labels[value]);
  }
  if (filter.labelPrefix) {
    return T(`${filter.labelPrefix}${value}`);
  }
  return value;
}

export default class CompendiumBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${SYS_ID}-compendium-browser`,
    classes: ["l5r4", "l5r4-compendium-browser"],
    window: { title: "l5r4.ui.browser.title", icon: "fa-solid fa-book-open", resizable: true },
    position: { width: 760, height: 660 },
    actions: {
      selectTab: CompendiumBrowser.#onSelectTab,
      clearFilters: CompendiumBrowser.#onClearFilters,
      addEntry: CompendiumBrowser.#onAddEntry,
      importEntry: CompendiumBrowser.#onImportEntry,
      openEntry: CompendiumBrowser.#onOpenEntry
    }
  };

  // A filter change re-renders the results alone, so the search box or select being used keeps its focus and state
  static PARTS = {
    controls: { template: `systems/${SYS_ID}/templates/apps/compendium-browser.hbs` },
    results: {
      template: `systems/${SYS_ID}/templates/apps/compendium-browser-results.hbs`,
      scrollable: [".l5r4-browser-results"]
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

  /** The open tab. */
  get currentTab() {
    return BROWSER_TABS.find(tab => tab.id === this.tab);
  }

  /**
   * Read the index of every pack of this document type the user can see.
   * @param {"Item"|"Actor"} documentName
   * @returns {Promise<object[]>}
   */
  async #load(documentName) {
    if (!this.#entries[documentName]) {
      const fields = browserIndexFields(documentName);
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

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const tab = this.currentTab;
    const entries = (await this.#load(tab.documentName)).filter(entry =>
      tab.types.includes(entry.type)
    );
    const shown = filterEntries(entries, tab, { search: this.search, choices: this.choices });
    return Object.assign(context, {
      tabs: BROWSER_TABS.map(t => ({
        id: t.id,
        label: T(`l5r4.ui.browser.tabs.${t.id}`),
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
              ? filterOptions(entries, id).map(value => ({
                  value,
                  label: optionLabel(filter, value)
                }))
              : null
        };
      }),
      rows: shown.map(entry => {
        const numbers = entryNumbers(entry);
        const citation = sourceCitation(entry.system.source);
        return {
          ...entry,
          typeLabel: T(`TYPES.${tab.documentName}.${entry.type}`),
          numbers: numbers ? phraseText(numbers) : "",
          citation: citation ? phraseText(citation) : ""
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
      for (const row of this.element.querySelectorAll(".l5r4-browser-row[data-uuid]")) {
        row.addEventListener("dragstart", event => {
          event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({ type: row.dataset.documentName, uuid: row.dataset.uuid })
          );
          // Core cancels a drag that reaches the document from an element without draggable="true", such as the
          // row's icon or name (client/game.mjs:2239-2245); its own DragDrop stops the event the same way
          // (client/applications/ux/drag-drop.mjs:136)
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
   * Show another tab, with no filter chosen.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} _event
   * @param {HTMLElement} target
   */
  static async #onSelectTab(_event, target) {
    this.tab = target.dataset.tab;
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
   * @param {HTMLElement} target
   */
  static async #onAddEntry(_event, target) {
    const actor = resolveActor();
    if (!actor) {
      ui.notifications?.warn(T("l5r4.ui.browser.noActor"));
      return;
    }
    const item = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    if (item) {
      await addItem(actor, item.toObject());
    }
  }

  /**
   * Import a creature into the world. GMs only.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} _event
   * @param {HTMLElement} target
   */
  static async #onImportEntry(_event, target) {
    if (!game.user.isGM) {
      return;
    }
    const row = target.closest("[data-uuid]");
    const pack = game.packs.get(row.dataset.pack);
    await game.actors.importFromCompendium(pack, row.dataset.id);
  }

  /**
   * Open an entry's sheet.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} _event
   * @param {HTMLElement} target
   */
  static async #onOpenEntry(_event, target) {
    const doc = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    doc?.sheet?.render({ force: true });
  }

  /** Open the browser, or bring it to the front. */
  static open() {
    browser ??= new CompendiumBrowser();
    return browser.render({ force: true });
  }
}

/**
 * Add the browser's button to the Compendium sidebar's header. The header part re-renders on its own, so the button
 * is added again whenever it is missing.
 * @param {foundry.applications.sidebar.tabs.CompendiumDirectory} _app
 * @param {HTMLElement} element
 */
function onRenderCompendiumDirectory(_app, element) {
  const actions = element.querySelector(".header-actions");
  if (!actions || actions.querySelector("[data-l5r4-browser]")) {
    return;
  }
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.l5r4Browser = "";
  button.innerHTML = `<i class="fa-solid fa-book-open" inert></i><span>${T("l5r4.ui.browser.open")}</span>`;
  button.addEventListener("click", () => CompendiumBrowser.open());
  actions.append(button);
}

/** Register the browser's button and its index fields, once during init. */
export function initializeCompendiumBrowser() {
  for (const documentName of ["Item", "Actor"]) {
    const config = CONFIG[documentName];
    // Core starts each list empty (client/config.mjs), and a pack index reads it (compendium-collection.mjs:263)
    config.compendiumIndexFields = [
      ...new Set([...config.compendiumIndexFields, ...browserIndexFields(documentName)])
    ];
  }
  Hooks.on("renderCompendiumDirectory", onRenderCompendiumDirectory);
}
