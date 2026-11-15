import { describe, expect, it } from "vitest";
import {
  readTransfer,
  remapItemUuids,
  TRANSFER_FORMAT,
  transferPayload
} from "../../../module/utils/item-transfer.js";

const A = "aaaaaaaaaaaaaaaa";
const B = "bbbbbbbbbbbbbbbb";

// roadmap/STAGE-11 decision 4
describe("The transferPayload and readTransfer helpers", () => {
  it("should round-trip a folder of items", () => {
    const items = [{ _id: A, name: "Kenjutsu", type: "skill", system: { rules: [] } }];
    const text = JSON.stringify(
      transferPayload("Homebrew", items, { system: "4.0.0", core: "14" })
    );
    expect(readTransfer(text)).toEqual({ folder: "Homebrew", items });
  });

  it("should refuse text that is not JSON, or not an export of items", () => {
    expect(readTransfer("{")).toEqual({ error: "invalidJson" });
    expect(readTransfer(JSON.stringify({ items: [] }))).toEqual({ error: "notExport" });
    expect(
      readTransfer(JSON.stringify({ format: TRANSFER_FORMAT, items: [{ name: "No type" }] }))
    ).toEqual({ error: "notExport" });
  });
});

describe("remapItemUuids", () => {
  it("should point world item uuids at their imported copies", () => {
    const rules = [
      { key: "GrantItem", uuid: `Item.${A}` },
      { key: "ChoiceSet", options: [{ value: `Item.${A}` }, { value: `Item.${B}` }] }
    ];
    expect(remapItemUuids(rules, { [A]: `Item.${B}` })).toEqual([
      { key: "GrantItem", uuid: `Item.${B}` },
      { key: "ChoiceSet", options: [{ value: `Item.${B}` }, { value: `Item.${B}` }] }
    ]);
  });

  it("should leave uuids of other items, compendium entries, and embedded items alone", () => {
    const rules = [
      { uuid: `Item.${B}` },
      { uuid: `Compendium.world.items.Item.${A}` },
      { uuid: `Actor.cccccccccccccccc.Item.${A}` }
    ];
    expect(remapItemUuids(rules, { [A]: "Item.dddddddddddddddd" })).toEqual(rules);
  });
});
