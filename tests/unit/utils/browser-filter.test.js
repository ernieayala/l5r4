import { describe, expect, it } from "vitest";
import { BROWSER_FILTERS, BROWSER_TABS } from "../../../module/config/browser.js";
import { SKILL_TRAITS } from "../../../module/config/localization.js";
import {
  getBrowserIndexFields,
  getEntryNumbers,
  getFilteredEntries,
  getFilterOptions,
  getValueAt
} from "../../../module/utils/browser-filter.js";

const tab = id => BROWSER_TABS.find(t => t.id === id);
const names = list => list.map(entry => entry.name);

const SPELLS = [
  {
    name: "Jade Strike",
    type: "spell",
    folderName: "Earth",
    system: { ring: "earth", mastery: 1, keywords: "Jade", maho: false, source: { page: 170 } }
  },
  {
    name: "Fires of Purity",
    type: "spell",
    folderName: "Fire",
    system: { ring: "fire", mastery: 2, keywords: "Thunder", maho: false, source: { page: 175 } }
  },
  {
    name: "Fury of Osano-wo",
    type: "spell",
    folderName: "Fire",
    system: {
      ring: "fire",
      mastery: 2,
      keywords: "Thunder, Battle",
      maho: false,
      source: { page: 176 }
    }
  },
  {
    name: "Ashigaru's Blood",
    type: "spell",
    folderName: "Maho",
    system: { ring: "fire", mastery: 1, keywords: "", maho: true, source: { page: 270 } }
  },
  {
    name: "Katana",
    type: "weapon",
    folderName: "Swords",
    system: { size: "medium", damageRoll: 3, damageKeep: 2, source: { page: 204 } }
  }
];

describe("getFilteredEntries", () => {
  it("should keep the tab's types, sorted by name", () => {
    expect(names(getFilteredEntries(SPELLS, tab("spells")))).toEqual([
      "Ashigaru's Blood",
      "Fires of Purity",
      "Fury of Osano-wo",
      "Jade Strike"
    ]);
  });

  it("should filter by each filter alone", () => {
    const spells = tab("spells");
    expect(names(getFilteredEntries(SPELLS, spells, { choices: { ring: "earth" } }))).toEqual([
      "Jade Strike"
    ]);
    expect(names(getFilteredEntries(SPELLS, spells, { choices: { mastery: "2" } }))).toEqual([
      "Fires of Purity",
      "Fury of Osano-wo"
    ]);
    expect(names(getFilteredEntries(SPELLS, spells, { choices: { keyword: "battle" } }))).toEqual([
      "Fury of Osano-wo"
    ]);
    expect(names(getFilteredEntries(SPELLS, spells, { choices: { maho: "true" } }))).toEqual([
      "Ashigaru's Blood"
    ]);
    expect(names(getFilteredEntries(SPELLS, spells, { choices: { page: "170" } }))).toEqual([
      "Jade Strike"
    ]);
    expect(names(getFilteredEntries(SPELLS, spells, { search: "FURY" }))).toEqual([
      "Fury of Osano-wo"
    ]);
  });

  it("should filter by several at once: Fire, Mastery Level 2, not maho", () => {
    const shown = getFilteredEntries(SPELLS, tab("spells"), {
      choices: { ring: "fire", mastery: "2", maho: "false" },
      search: "of"
    });
    expect(names(shown)).toEqual(["Fires of Purity", "Fury of Osano-wo"]);
  });

  it("should treat a blank choice as no filter", () => {
    expect(
      getFilteredEntries(SPELLS, tab("spells"), { choices: { ring: "", maho: "" } })
    ).toHaveLength(4);
  });
});

describe("getFilterOptions", () => {
  it("should offer the distinct values present, numbers in numeric order", () => {
    const spells = SPELLS.filter(entry => entry.type === "spell");
    expect(getFilterOptions(spells, "ring")).toEqual(["earth", "fire"]);
    expect(getFilterOptions(spells, "mastery")).toEqual(["1", "2"]);
    expect(getFilterOptions(spells, "folder")).toEqual(["Earth", "Fire", "Maho"]);
    expect(getFilterOptions([{ system: { cost: 10 } }, { system: { cost: 2 } }], "cost")).toEqual([
      "2",
      "10"
    ]);
  });

  it("should leave out the page an entry with no page holds", () => {
    const entries = [{ system: { source: { page: 0 } } }, { system: { source: { page: 104 } } }];
    expect(getFilterOptions(entries, "page")).toEqual(["104"]);
  });
});

describe("BROWSER_FILTERS", () => {
  it("should label every Trait a Skill can use, Void included", () => {
    for (const key of Object.keys(SKILL_TRAITS)) {
      expect(BROWSER_FILTERS.trait.labels[key], key).toBe(SKILL_TRAITS[key]);
    }
  });
});

describe("getBrowserIndexFields", () => {
  it("should list each filter's system field and a row's numbers once, and none of core's", () => {
    const fields = getBrowserIndexFields("Item");
    expect(fields).toContain("system.ring");
    expect(fields).toContain("system.source.page");
    expect(fields).toContain("system.damageRoll");
    expect(fields).not.toContain("type");
    expect(new Set(fields).size).toBe(fields.length);
    expect(getBrowserIndexFields("Actor")).toEqual(["system.source.page", "system.source.book"]);
  });

  it("should know every filter a tab names", () => {
    for (const t of BROWSER_TABS) {
      for (const id of t.filters) {
        expect(BROWSER_FILTERS[id], `${t.id}: ${id}`).toBeDefined();
      }
    }
  });
});

describe("The getEntryNumbers and getValueAt helpers", () => {
  it("should give a weapon's DR and armor's numbers, and nothing for a bow or a spell", () => {
    expect(getEntryNumbers(SPELLS[4])).toEqual({
      key: "l5r4.apps.compendiumBrowser.numbers.weapon",
      data: { pool: "3k2" }
    });
    expect(getEntryNumbers({ type: "armor", system: { bonus: 5, reduction: 3 } }).data).toEqual({
      bonus: 5,
      reduction: 3
    });
    expect(getEntryNumbers({ type: "weapon", system: { isBow: true } })).toBeNull();
    expect(getEntryNumbers(SPELLS[1])).toEqual({
      key: "l5r4.apps.compendiumBrowser.numbers.spell",
      data: { ring: { key: "l5r4.ui.mechanics.rings.fire", data: {} }, mastery: 2 }
    });
    expect(
      getEntryNumbers({ type: "spell", system: { ring: "all", mastery: 1 } }).data.ring.key
    ).toBe("l5r4.ui.common.all");
    expect(getEntryNumbers({ type: "commonItem", system: {} })).toBeNull();
  });

  it("should read a dotted path and give undefined past a missing step", () => {
    expect(getValueAt(SPELLS[0], "system.source.page")).toBe(170);
    expect(getValueAt(SPELLS[0], "system.nothing.here")).toBeUndefined();
  });
});
