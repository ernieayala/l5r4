import { describe, expect, it } from "vitest";
import {
  readTransfer,
  remapItemUuids,
  TRANSFER_FORMAT,
  transferPayload
} from "../../../module/utils/item-transfer.js";

const A = "aaaaaaaaaaaaaaaa";
const B = "bbbbbbbbbbbbbbbb";

describe("transferPayload and readTransfer (STAGE-11 decision 4)", () => {
  it("round-trips a folder of items", () => {
    const items = [{ _id: A, name: "Kenjutsu", type: "skill", system: { rules: [] } }];
    const text = JSON.stringify(
      transferPayload("Homebrew", items, { system: "4.0.0", core: "14" })
    );
    expect(readTransfer(text)).toEqual({ folder: "Homebrew", items });
  });

  it("refuses text that is not JSON, or not an export of items", () => {
    expect(readTransfer("{")).toEqual({ error: "invalidJson" });
    expect(readTransfer(JSON.stringify({ items: [] }))).toEqual({ error: "notExport" });
    expect(
      readTransfer(JSON.stringify({ format: TRANSFER_FORMAT, items: [{ name: "No type" }] }))
    ).toEqual({ error: "notExport" });
  });
});

describe("remapItemUuids", () => {
  it("points world item uuids at their imported copies", () => {
    const rules = [
      { key: "GrantItem", uuid: `Item.${A}` },
      { key: "ChoiceSet", options: [{ value: `Item.${A}` }, { value: `Item.${B}` }] }
    ];
    expect(remapItemUuids(rules, { [A]: `Item.${B}` })).toEqual([
      { key: "GrantItem", uuid: `Item.${B}` },
      { key: "ChoiceSet", options: [{ value: `Item.${B}` }, { value: `Item.${B}` }] }
    ]);
  });

  it("leaves uuids of other items, compendium entries, and embedded items alone", () => {
    const rules = [
      { uuid: `Item.${B}` },
      { uuid: `Compendium.world.items.Item.${A}` },
      { uuid: `Actor.cccccccccccccccc.Item.${A}` }
    ];
    expect(remapItemUuids(rules, { [A]: "Item.dddddddddddddddd" })).toEqual(rules);
  });
});
