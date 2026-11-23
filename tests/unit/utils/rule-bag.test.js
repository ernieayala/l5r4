import { describe, expect, it } from "vitest";
import { getBagEntries } from "../../../module/utils/rule-bag.js";

describe("getBagEntries", () => {
  const bag = {
    rollModifiers: {
      attack: [
        { roll: 1, predicate: ["target", { not: "target:status:mounted" }] },
        { roll: 2, predicate: [] }
      ],
      damage: [{ roll: 5, predicate: [] }]
    }
  };

  it("should return the selectors' entries whose predicates hold", () => {
    expect(
      getBagEntries(bag, "rollModifiers", {
        selectors: ["attack"],
        options: new Set(["target"])
      }).map(e => e.roll)
    ).toEqual([1, 2]);
    expect(
      getBagEntries(bag, "rollModifiers", {
        selectors: ["attack"],
        options: new Set(["target", "target:status:mounted"])
      }).map(e => e.roll)
    ).toEqual([2]);
    expect(
      getBagEntries(bag, "rollModifiers", { selectors: ["attack"], options: new Set() }).map(
        e => e.roll
      )
    ).toEqual([2]);
  });

  it("should return nothing for a missing kind, selector, or bag", () => {
    expect(getBagEntries(bag, "notes", { selectors: ["attack"], options: new Set() })).toEqual([]);
    expect(
      getBagEntries(bag, "rollModifiers", { selectors: ["spell"], options: new Set() })
    ).toEqual([]);
    expect(
      getBagEntries(undefined, "rollModifiers", { selectors: ["attack"], options: new Set() })
    ).toEqual([]);
  });
});
