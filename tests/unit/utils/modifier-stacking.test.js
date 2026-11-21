import { describe, expect, it } from "vitest";
import { getStackedModifiers } from "../../../module/utils/modifier-stacking.js";

describe("getStackedModifiers", () => {
  it("should return zeros for no modifiers", () => {
    expect(getStackedModifiers([])).toEqual({ roll: 0, keep: 0, total: 0 });
  });

  it("should add every untyped modifier", () => {
    expect(getStackedModifiers([{ roll: 1 }, { roll: 1, keep: 1 }, { total: 3 }])).toEqual({
      roll: 2,
      keep: 1,
      total: 3
    });
  });

  it("should treat an explicit untyped type as untyped", () => {
    expect(
      getStackedModifiers([
        { total: 2, type: "untyped" },
        { total: 2, type: "untyped" }
      ])
    ).toEqual({
      roll: 0,
      keep: 0,
      total: 4
    });
  });

  it("should keep only the largest bonus of a type", () => {
    expect(
      getStackedModifiers([
        { total: 2, type: "armor" },
        { total: 3, type: "armor" }
      ])
    ).toEqual({
      roll: 0,
      keep: 0,
      total: 3
    });
  });

  it("should keep the largest bonus and the largest penalty of a type", () => {
    expect(
      getStackedModifiers([
        { total: 2, type: "spell" },
        { total: 5, type: "spell" },
        { total: -1, type: "spell" },
        { total: -3, type: "spell" }
      ]).total
    ).toBe(2);
  });

  it("should stack each component of a type on its own", () => {
    expect(
      getStackedModifiers([
        { roll: 2, type: "kata" },
        { keep: 1, type: "kata" }
      ])
    ).toEqual({
      roll: 2,
      keep: 1,
      total: 0
    });
  });

  it("should add different types and untyped together", () => {
    expect(
      getStackedModifiers([
        { roll: 1, type: "kata" },
        { roll: 2, type: "kiho" },
        { roll: 1 },
        { roll: 1, type: "kata" }
      ]).roll
    ).toBe(4);
  });
});
