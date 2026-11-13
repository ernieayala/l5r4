import { describe, expect, it } from "vitest";
import { stackModifiers } from "../../../module/utils/modifier-stacking.js";

describe("stackModifiers", () => {
  it("returns zeros for no modifiers", () => {
    expect(stackModifiers([])).toEqual({ roll: 0, keep: 0, total: 0 });
  });

  it("adds every untyped modifier", () => {
    expect(stackModifiers([{ roll: 1 }, { roll: 1, keep: 1 }, { total: 3 }])).toEqual({
      roll: 2,
      keep: 1,
      total: 3
    });
  });

  it("treats an explicit untyped type as untyped", () => {
    expect(
      stackModifiers([
        { total: 2, type: "untyped" },
        { total: 2, type: "untyped" }
      ])
    ).toEqual({
      roll: 0,
      keep: 0,
      total: 4
    });
  });

  it("keeps only the largest bonus of a type", () => {
    expect(
      stackModifiers([
        { total: 2, type: "armor" },
        { total: 3, type: "armor" }
      ])
    ).toEqual({
      roll: 0,
      keep: 0,
      total: 3
    });
  });

  it("keeps the largest bonus and the largest penalty of a type", () => {
    expect(
      stackModifiers([
        { total: 2, type: "spell" },
        { total: 5, type: "spell" },
        { total: -1, type: "spell" },
        { total: -3, type: "spell" }
      ]).total
    ).toBe(2);
  });

  it("stacks each component of a type on its own", () => {
    expect(
      stackModifiers([
        { roll: 2, type: "kata" },
        { keep: 1, type: "kata" }
      ])
    ).toEqual({
      roll: 2,
      keep: 1,
      total: 0
    });
  });

  it("adds different types and untyped together", () => {
    expect(
      stackModifiers([
        { roll: 1, type: "kata" },
        { roll: 2, type: "kiho" },
        { roll: 1 },
        { roll: 1, type: "kata" }
      ]).roll
    ).toBe(4);
  });
});
